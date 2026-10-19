'use strict';
/**
 * SPEC-017 Phase 1 · 行为冒烟（T-017-26）
 * ---------------------------------------------------------------------------
 * 依 ENV-07：「**断言全绿 ≠ 渲染正确**」。本脚本是 `tools/wb-content-asset-verify.js`
 * （73 条契约断言）的**补充**，而不是替代 —— 它做两件套件做不到的事：
 *
 *   ① **不吞异常**：套件的 `safe()` 会把异常吞掉，因此「接线后渲染是否崩」观察不到。
 *      本脚本把 `setTimeout` 回调内的异常**记录**下来（而非静默丢弃）。
 *   ② **新旧双沙箱对比**：用改动前的备份（`scratch/app.js.bak-<ts>`）跑**同一组既有业务动作**，
 *      比对**既有账本**（发现页 / 社区 / 算力流水 / 余额卡 / 资金恒等式）的增量。
 *      若新旧完全一致 ⇒ 证明本次改动**零回归**（而非"只跑了绿灯"）。
 *
 * ⚠️ 本文件位于 `scratch/`（CON-030 过程产物区），**不得被正式代码引用**。
 * 用法： node scratch/_spec017-phase1-smoke.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const BAK = '20260925-072307'; // T-017-01 的备份时间戳

function src(dir, appFile, mockFile) {
  return {
    app: fs.readFileSync(path.join(dir, appFile), 'utf8'),
    mock: fs.readFileSync(path.join(dir, mockFile), 'utf8')
  };
}
const NEW_SRC = src(path.join(ROOT, 'js'), 'app.js', 'mock_data.js');
const OLD_SRC = src(path.join(ROOT, 'scratch'), 'app.js.bak-' + BAK, 'mock_data.js.bak-' + BAK);

// ------------------------- DOM 桩（比立红套件更完整：补 location，令 navigateTo 可用） -------------------------
class ClassList {
  constructor() { this.set = new Set(); }
  add(...c) { c.forEach((x) => this.set.add(x)); }
  remove(...c) { c.forEach((x) => this.set.delete(x)); }
  toggle(c, force) { const on = (force === undefined) ? !this.set.has(c) : !!force; if (on) this.set.add(c); else this.set.delete(c); return on; }
  contains(c) { return this.set.has(c); }
}
class El {
  constructor(id, attrs) {
    this.id = id; this._attrs = attrs || {};
    this.innerText = ''; this.textContent = ''; this.innerHTML = '';
    this.value = ''; this.hidden = false; this.disabled = false;
    this.max = ''; this.placeholder = ''; this.style = {}; this.scrollTop = 0;
    this.classList = new ClassList();
  }
  getAttribute(n) { return this._attrs[n] === undefined ? null : this._attrs[n]; }
  setAttribute(n, v) { this._attrs[n] = v; }
  appendChild(c) { return c; }
  addEventListener() {}
  querySelectorAll() { return []; }
  querySelector() { return null; }
  scrollIntoView() {}
}

function makeEnv(S) {
  const errors = [];
  const toasts = [];
  const registry = new Map();
  const el = (id) => { if (!registry.has(id)) registry.set(id, new El(id)); return registry.get(id); };
  const location = { hash: '', href: '', search: '', pathname: '/' };
  const sb = {
    console: { log() {}, error() {}, warn() {}, info() {} },
    location: location,
    document: {
      body: el('__body'),
      location: location,
      getElementById: (id) => el(id),
      querySelector: () => null,
      querySelectorAll: () => [],
      createElement: (t) => new El('__' + t),
      addEventListener() {}
    },
    // ⚠️ 与套件的关键差异：回调异常**记录**而非静默丢弃（ENV-07）
    setTimeout: (fn) => { try { if (typeof fn === 'function') fn(); } catch (e) { errors.push('async 回调异常: ' + (e && e.message)); } return 0; },
    clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
    Date, Math, JSON, parseInt, parseFloat, String, Number, Array, Object, RegExp, isNaN, isFinite
  };
  sb.window = sb;
  vm.createContext(sb);
  vm.runInContext(S.mock, sb, { filename: 'mock_data.js' });
  vm.runInContext(S.app + '\n;globalThis.__App = App;', sb, { filename: 'app.js' });
  const App = vm.runInContext('__App', sb);
  const MockData = vm.runInContext('MockData', sb);
  if (typeof App.showToast === 'function') App.showToast = (m) => toasts.push(String(m == null ? '' : m));
  return {
    App, MockData, toasts, errors,
    /** 同步调用；异常**记录**并继续（模拟浏览器"回调异常不中断页面"） */
    call(name, ...args) {
      try {
        if (typeof App[name] !== 'function') { errors.push('缺少方法: ' + name); return undefined; }
        return App[name](...args);
      } catch (e) { errors.push(name + ' 抛异常: ' + (e && e.message)); return undefined; }
    }
  };
}

// ------------------------- 快照（用于新旧对比） -------------------------
/** 资金口径字段（**不含**算力计数 —— 算力会随「生成」这一既有动作被消耗，属既有行为） */
const FUND_KEYS = ['balance', 'withdrawable', 'monthlyEarnings', 'forecastEarnings', 'totalIncome', 'totalWithdrawn'];
function fundOf(md) {
  const cards = (md.assets && md.assets.cards) || {};
  const o = {};
  FUND_KEYS.forEach((k) => { o[k] = cards[k]; });
  return JSON.stringify(o);
}
function snap(md) {
  return {
    discoverWorks: (md.discover && md.discover.works || []).length,
    communityPosts: (md.community && md.community.posts || []).length,
    worksCount: (md.currentUser && md.currentUser.worksCount) || 0,
    aiLedger: (md.assets && md.assets.aiPointLedger || []).length,
    aiBalances: JSON.stringify((md.assets && md.assets.aiBalances) || null),
    cards: JSON.stringify((md.assets && md.assets.cards) || null),   // 含算力计数：新旧应一致
    fund: fundOf(md),                                                 // 资金口径（与算力无关）
    tx: JSON.stringify((md.assets && md.assets.transactions) || null),
    escrow: JSON.stringify((md.assets && md.assets.escrowProjects) || null),
    overview: JSON.stringify(md.overview || null)
  };
}
function diff(a, b) {
  const out = [];
  Object.keys(a).forEach((k) => { if (a[k] !== b[k]) out.push(k); });
  return out;
}
function objs(md) { const s = md.assets && md.assets.objects; return Array.isArray(s) ? s : []; }
function refsOf(env, k) { return env.call('getAssetRefs', k) || []; }

// ------------------------- 断言 -------------------------
let pass = 0;
const fails = [];
function ok(cond, msg) { if (cond) pass++; else fails.push(msg); }
const L = '-'.repeat(74);
console.log('\n' + L);
console.log(' SPEC-017 Phase 1 · 行为冒烟（T-017-26）—— 不吞异常 + 新旧对比回归验证');
console.log(L);

// ============================================================================
// P1 · 新增能力（走真实业务动作，非直接调 API）
// ============================================================================
console.log('\n【P1】新增能力（走真实业务动作）');
{
  const e = makeEnv(NEW_SRC);
  const md = e.MockData;
  const bal0 = snap(md);

  // ① 生成 ⇒ 落盘即登记（同时证明 E4/E6 不是"平凡通过"：对象数必须真的 > 0）
  e.call('simulateGenerate');
  const n1 = objs(md).length;
  ok(n1 === 1, 'P1-1 生成后应恰好登记 1 个内容对象（实际 ' + n1 + '）—— 若为 0 则 E4/E6 是平凡通过');
  ok(refsOf(e, objs(md)[0] && objs(md)[0].objectKey).length === 1,
    'P1-2 生成应建立 1 条 workcloud 引用（作品云盘归属）');
  const w0 = (md.discover && md.discover.works || [])[0] || {};
  ok(!!w0.objectKey, 'P1-3 生成的作品卡片应带 objectKey（引用而非副本）');
  const legacy = ['title', 'author', 'school', 'authorLine', 'tag', 'category', 'duration', 'views',
    'likes', 'likesDisplay', 'cover', 'capabilityTag', 'matrixSync', 'level', 'completedTasks', 'customPrice', 'tool', 'prompt'];
  const missing = legacy.filter((f) => w0[f] === undefined);
  ok(missing.length === 0, 'P1-4 生成卡片的既有 18 字段**必须齐全**（缺失：' + (missing.join(',') || '无') + '）');
  ok(w0.cover === 'assets/covers/work_1.png', 'P1-5 既有 cover 字段语义**不得**被改动（仍为图片路径）');

  // ② 同内容反复生成 ⇒ 幂等，不膨胀
  e.call('simulateGenerate');
  ok(objs(md).length === 1, 'P1-6 同一内容反复生成**不得**新增物理对象（幂等，SC-017-02）');

  // ③ 三路流转：分享社区 / 上架展厅 / 交付商单
  const k = objs(md)[0].objectKey;
  e.call('publishFromStudio');
  ok(objs(md).length === 1, 'P1-7 分享至社区**不得**新增物理对象（SC-017-03）');
  ok(refsOf(e, k).some((r) => r.refType === 'post'), 'P1-8 分享后应存在 post 引用');

  e.call('publishStudioToShowcase');
  ok(objs(md).length === 1, 'P1-9 上架展厅**不得**新增物理对象（SC-017-08）');
  ok(refsOf(e, k).some((r) => r.refType === 'showcase'), 'P1-10 上架后应存在 showcase 引用');

  e.call('submitStudioToTask');
  ok(objs(md).length === 1, 'P1-11 交付商单**不得**新增物理对象');
  ok(refsOf(e, k).some((r) => r.refType === 'delivery'), 'P1-12 交付后应存在 delivery 引用（修复假实现的证据）');
  ok(e.toasts.some((t) => /挂载为商单交付物/.test(t)), 'P1-13 交付既有 Toast 文案**保持不变**（回归保护）');

  const totalRefs = refsOf(e, k).length;
  ok(totalRefs === 4, 'P1-14 三路流转 + 云盘归属后引用数应为 4（实际 ' + totalRefs + '）');

  // ④ 解除引用 ⇒ 不误删
  refsOf(e, k).slice().forEach((r) => e.call('detachAssetRef', k, r.refType, r.refId));
  const after = e.call('getAssetObject', k);
  ok(!!after && after.state === 'pendingGC', 'P1-15 引用归零 ⇒ 进入 pendingGC（不得直接物理删除，FR-017-43）');

  // ⑤ 两阶段回收：窗口未配置 ⇒ 不回收；未到期 ⇒ 不回收；到期 ⇒ 回收 + 留痕
  e.call('sweepRecyclableAssets');
  const s1 = e.call('getAssetObject', k);
  ok(!!s1 && s1.state === 'pendingGC', 'P1-16 观察窗口未配置（null）⇒ **不得**回收（禁止退化为立即回收，FR-017-45）');
  md.assets.gcWindowHours = 24;
  e.call('sweepRecyclableAssets');
  const s2 = e.call('getAssetObject', k);
  ok(!!s2 && s2.state === 'pendingGC', 'P1-17 窗口已配置但未到期 ⇒ 不得回收');
  e.call('getAssetObject', k).pendingSince = Date.now() - 25 * 3600000; // 人为推过期
  const r3 = e.call('sweepRecyclableAssets');
  ok(!!r3 && r3.recycled === 1, 'P1-18 窗口已到期 ⇒ 应回收（实际 recycled=' + (r3 && r3.recycled) + '）');
  ok(!!e.call('getAssetObject', k) && e.call('getAssetObject', k).state === 'recycled', 'P1-19 回收后 state 应为 recycled');
  ok(Array.isArray(md.assets.recycleLog) && md.assets.recycleLog.length === 1,
    'P1-20 回收须**留痕**（recycleLog 1 条，FR-017-21 / NFR-206）');

  // ⑥ 资金**口径**全程未动（CON-021~023）
  //    ⚠️ 判据必须排除算力计数（tokensSelf 等）—— 它是「生成」这一既有动作的成本，与内容资产无关；
  //       算力计数的一致性由 P3 的 cards 全量对比兜底。
  ok(fundOf(md) === bal0.fund, 'P1-21 内容资产全程**不得**改动资金口径（余额 / 可提现 / 收益等 6 项）');
}

// ============================================================================
// P2 · 跨用户隔离（Q-042：用户级去重）
// ============================================================================
console.log('【P2】Q-042 用户级去重');
{
  const e = makeEnv(NEW_SRC);
  const md = e.MockData;
  const c = '跨用户隔离验证内容';
  const a = e.call('registerAssetObject', { content: c, bytes: 100 });
  md.currentUser.name = '另一位同学';
  const b = e.call('registerAssetObject', { content: c, bytes: 100 });
  ok(!!a && !!b && a.objectKey !== b.objectKey,
    'P2-1 同内容、不同用户 ⇒ objectKey **必须不同**（用户级去重，跨用户不共享对象）');
  ok(objs(md).length === 2, 'P2-2 用户级去重下同内容跨用户各存一份（实际 ' + objs(md).length + '）');
}

// ============================================================================
// P3 · 新旧对比回归验证（既有一切行为必须逐项一致）
// ============================================================================
console.log('【P3】新旧双沙箱对比（既有账本增量必须完全一致）');
{
  function run(S) {
    const e = makeEnv(S);
    const md = e.MockData;
    const before = snap(md);
    e.call('simulateGenerate');
    const afterGen = snap(md);
    e.call('publishFromStudio');
    const afterPub = snap(md);
    e.call('publishStudioToShowcase');
    const afterShow = snap(md);
    e.call('submitStudioToTask');
    return { e, before, afterGen, afterPub, afterShow, errors: e.errors.slice() };
  }
  const n = run(NEW_SRC);
  const o = run(OLD_SRC);

  // 比对**既有账本**（排除本 Feature 新增的 assets.objects / assetRefs / recycleLog）
  const legacyKeys = ['discoverWorks', 'communityPosts', 'worksCount', 'aiLedger', 'aiBalances', 'cards', 'fund', 'tx', 'escrow', 'overview'];
  const pick = (s) => { const r = {}; legacyKeys.forEach((k) => { r[k] = s[k]; }); return r; };

  [['生成后', n.afterGen, o.afterGen], ['分享后', n.afterPub, o.afterPub], ['上架后', n.afterShow, o.afterShow]].forEach(([label, a, b]) => {
    const d = diff(pick(a), pick(b));
    ok(d.length === 0, 'P3 · 既有账本在「' + label + '」应与改动前一致（差异项：' + (d.join(', ') || '无') + '）');
  });

  // 既有动作对既有账本的**增量**必须一致
  const dN = { gen: n.afterGen.discoverWorks - n.before.discoverWorks, pub: n.afterPub.communityPosts - n.afterGen.communityPosts, show: n.afterShow.discoverWorks - n.afterPub.discoverWorks };
  const dO = { gen: o.afterGen.discoverWorks - o.before.discoverWorks, pub: o.afterPub.communityPosts - o.afterGen.communityPosts, show: o.afterShow.discoverWorks - o.afterPub.discoverWorks };
  ok(JSON.stringify(dN) === JSON.stringify(dO),
    'P3 · 三个动作对既有账本的增量应一致（新 ' + JSON.stringify(dN) + ' vs 旧 ' + JSON.stringify(dO) + '）');

  // 异常对比：新版本**不得**比旧版本多出异常
  const extra = n.errors.filter((x) => o.errors.indexOf(x) < 0);
  ok(extra.length === 0, 'P3 · 新版本**不得**引入旧版本没有的异常（新增：' + (extra.join(' | ') || '无') + '）');
  console.log('    异常对照：旧 ' + o.errors.length + ' 条 / 新 ' + n.errors.length + ' 条' + (o.errors.length === 0 ? '（桩已足以跑通全流程）' : ''));
  if (o.errors.length) console.log('      旧版既有异常：' + o.errors.slice(0, 2).join(' | '));
}

// ============================================================================
console.log('\n' + L);
if (fails.length === 0) {
  console.log(' ✓ 冒烟通过：' + pass + ' 项（含 P3 新旧回归对比）');
  console.log('   ⇒ 既有 18 字段与渲染路径未破坏；三路流转均为「引用」而非「副本」。');
} else {
  console.log(' ✗ 冒烟失败 ' + fails.length + ' 项：');
  fails.forEach((f, i) => console.log('   ' + (i + 1) + '. ' + f));
}
console.log(L + '\n');
process.exit(fails.length === 0 ? 0 : 1);
