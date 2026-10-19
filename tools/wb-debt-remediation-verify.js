#!/usr/bin/env node
/**
 * 技术债修复回归自检（Q-028 / Q-029 / Q-030 + 生成沉淀）
 * ---------------------------------------------------------------------------
 * 零依赖、离线。用最小 DOM 桩加载 js/mock_data.js + js/app.js，覆盖 2026-09-24
 * 那轮技术债修复的**回归防线**（CHG-007）：
 *
 *   A. 重复定义（Q-028）—— 全局对象不得再有同名键重复；关键方法须唯一定义
 *   B. 治理面板（Q-029）—— 生效实现使用的选择器必须真实存在于 index.html
 *   C. 证书弹窗（Q-028 #4）—— 必须渲染三个板块（证书 / 成就勋章 / 数字藏品）
 *   D. 商单龙虎榜（Q-028 #2）—— 必须真实填充并打开弹窗（不是只弹 Toast）
 *   E. 结算金额（Q-030）—— **核心**：定制订单必须按订单自身金额结算
 *        ⚠️ 断言样本刻意选用「金额 ≠ 3000」的订单：旧实现落硬编码兜底 3000，
 *           而演示数据 MO-P6 恰为 ¥3,000 ⇒ 用 MO-P6 测是**测不出**缺陷的。
 *   F. 生成沉淀 —— 产物必须落到真实载体，且 AI 积分真实扣减、恒等式保持
 *
 * 用法： node tools/wb-debt-remediation-verify.js
 * 退出码 0 = 全过，1 = 有失败
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const APP_SRC = fs.readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf8');
const MOCK_SRC = fs.readFileSync(path.join(ROOT, 'js', 'mock_data.js'), 'utf8');

// ------------------------- 最小 DOM 桩 -------------------------
class ClassList {
  constructor() { this.set = new Set(); }
  add(...c) { c.forEach(x => this.set.add(x)); }
  remove(...c) { c.forEach(x => this.set.delete(x)); }
  toggle(c, force) {
    const on = (force === undefined) ? !this.set.has(c) : !!force;
    if (on) this.set.add(c); else this.set.delete(c);
    return on;
  }
  contains(c) { return this.set.has(c); }
}

class El {
  constructor(id, attrs) {
    this.id = id;
    this._attrs = attrs || {};
    this.innerText = '';
    this.textContent = '';
    this.innerHTML = '';
    this.value = '';
    this.hidden = false;
    this.disabled = false;
    this.style = {};
    this.classList = new ClassList();
  }
  getAttribute(n) { return this._attrs[n] === undefined ? null : this._attrs[n]; }
  setAttribute(n, v) { this._attrs[n] = v; }
  appendChild(c) { return c; }
  addEventListener() {}
  querySelectorAll() { return []; }
  querySelector() { return null; }
}

const registry = new Map();
function el(id, attrs) {
  if (!registry.has(id)) registry.set(id, new El(id, attrs));
  return registry.get(id);
}

const documentStub = {
  body: el('__body'),
  getElementById: (id) => el(id),
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: (tag) => new El('__' + tag),
  addEventListener() {}
};

// DOM 桩**全局共享**（元素跨组保留，便于回读 innerHTML）；
// 但每次 load() 都新建独立 vm 上下文 —— 否则 `const MockData` 会重复声明报错。
function load() {
  const sb = {
    console: { log() {}, error() {}, warn() {}, info() {} },
    document: documentStub,
    setTimeout: () => 0,
    clearTimeout: () => {},
    setInterval: () => 0,
    clearInterval: () => {},
    Date, Math, JSON, parseInt, parseFloat, String, Number, Array, Object, RegExp, isNaN
  };
  sb.window = sb;
  vm.createContext(sb);
  vm.runInContext(MOCK_SRC, sb, { filename: 'mock_data.js' });
  // app.js 顶层是 `const App = {...}`，不会挂到 vm 上下文对象 ⇒ 同脚本内追加导出
  vm.runInContext(APP_SRC + '\n;globalThis.__App = App;', sb, { filename: 'app.js' });
  return {
    App: vm.runInContext('__App', sb),
    MockData: vm.runInContext('MockData', sb),
    sandbox: sb
  };
}

let pass = 0;
const fails = [];
function ok(cond, msg) {
  if (cond) pass++;
  else fails.push(msg);
}
const near = (a, b) => Math.abs(Number(a) - Number(b)) < 0.005;

// ------------------------- 每次断言组都重新加载（隔离副作用） -------------------------
function fresh() { return load(); }

// ============================ A. 重复定义（Q-028） ============================
{
  const scanned = [
    { file: 'js/app.js', src: APP_SRC },
    { file: 'js/mock_data.js', src: MOCK_SRC }
  ];
  for (const t of scanned) {
    const seen = new Map();
    t.src.split(/\r?\n/).forEach((l, i) => {
      let m = l.match(/^  ([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/);
      if (!m) m = l.match(/^  ([A-Za-z_$][\w$]*)\s*:/);
      if (!m) return;
      if (!seen.has(m[1])) seen.set(m[1], []);
      seen.get(m[1]).push(i + 1);
    });
    const dups = [...seen.entries()].filter(([, v]) => v.length > 1);
    ok(dups.length === 0, 'A1 ' + t.file + ' 不应有同名键重复，实际 ' + dups.length + ' 处：' + dups.map(d => d[0]).join(', '));
  }

  const REQUIRED = ['toggleGalleryWorkLike', 'openTasksLeaderboardModal', 'simulateGenerate',
    'openMyCertsModal', 'openSystemAdminModal', 'switchSystemAdminTab',
    'settleTaskReward', 'releaseEscrow', 'creditCreatorIncome', 'acceptMyTaskDelivery'];
  for (const n of REQUIRED) {
    const c = (APP_SRC.match(new RegExp('^  ' + n + '\\s*:', 'gm')) || []).length;
    ok(c === 1, 'A2 方法 ' + n + ' 应恰好定义 1 次，实际 ' + c + ' 次');
  }

  ok(!/assets\.works\s*[^)]{0,40}unshift/.test(APP_SRC), 'A3 不应再向不存在的 assets.works 写入');
  ok(!/system-admin-tab-btn|data-tab-content/.test(APP_SRC), 'A4 不应再引用 HTML 中不存在的治理 Tab 选择器');
  ok(/sysadmin-tabs/.test(APP_SRC) && /data-systab/.test(APP_SRC), 'A5 应使用 HTML 中真实存在的治理 Tab 选择器');
  ok(/sysadmin-tabs/.test(HTML) && /data-systab/.test(HTML), 'A6 index.html 应保留 sysadmin-tabs / data-systab 结构');

  // Q-030 修复点：结算金额不得使用兜底常量。
  // 只查结算方法本身 —— 不全文扫描，避免误伤演示数据里合法的 ¥3,000 金额（如某条流水 rawAmount: 3000）。
  const accept = APP_SRC.match(/^  acceptMyTaskDelivery: function[\s\S]*?\n  \},/m);
  ok(!!accept, 'A7 acceptMyTaskDelivery 应存在');
  if (accept) {
    ok(!/\|\|\s*3000|:\s*3000\b/.test(accept[0]), 'A8 acceptMyTaskDelivery 不应含金额兜底常量 3000');
    ok(/order\.rewardMoney/.test(accept[0]), 'A9 acceptMyTaskDelivery 应能回退到订单自身金额 order.rewardMoney');
    ok(/releaseEscrow\(/.test(accept[0]), 'A10 定制订单（无 tasks.list 条目）应走 releaseEscrow 分支');
    ok(/结算已中止|缺少赏金金额/.test(accept[0]), 'A11 金额无法解析时应显式失败而非静默兜底');
  }
}

// ============================ B+C+D. 渲染与真实打开 ============================
{
  const { App, MockData } = fresh();

  // C. 证书弹窗三板块
  App.openMyCertsModal();
  const certHtml = el('my-certs-body').innerHTML;
  ok(/官方结业证书与学分凭证/.test(certHtml), 'C1 证书弹窗缺少「官方结业证书与学分凭证」板块');
  ok(/成就勋章/.test(certHtml), 'C2 证书弹窗缺少「成就勋章」板块');
  ok(/数字藏品凭证/.test(certHtml), 'C3 证书弹窗缺少「数字藏品凭证」板块');
  const ach = (MockData.academy && MockData.academy.achievements) || [];
  const nfts = ((MockData.assets && MockData.assets.nfts) || []).slice(0, 3);
  ok(ach.length > 0 && certHtml.indexOf(ach[0].title) >= 0, 'C4 证书弹窗未渲染成就勋章数据（' + ach[0].title + '）');
  ok(nfts.length > 0 && certHtml.indexOf(nfts[0].name) >= 0, 'C5 证书弹窗未渲染数字藏品数据（' + nfts[0].name + '）');
  ok(/openPreviewLightbox/.test(certHtml), 'C6 数字藏品卡片应可点开预览灯箱');
  ok(!/is-achieve|edge-certs-nfts|class="[^"]*\bis-nft\b/.test(certHtml), 'C7 不应使用 style.css 中未定义的类名');

  // D. 商单龙虎榜
  const body = el('edge-list-body');
  body.innerHTML = '';
  const title = el('edge-list-title');
  title.textContent = '';
  App.openTasksLeaderboardModal();
  const ranks = (MockData.tasks && MockData.tasks.ranksWeek) || [];
  ok(ranks.length > 0, 'D1 ranksWeek 数据应存在');
  ok(body.innerHTML.length > 0, 'D2 龙虎榜未填充内容（疑似只弹 Toast 的假实现）');
  ok(body.innerHTML.indexOf(String(ranks[0].name)) >= 0, 'D3 龙虎榜未渲染排行数据（' + ranks[0].name + '）');
  ok(title.textContent === '任务排行榜', 'D4 龙虎榜标题未写入，实际 ' + JSON.stringify(title.textContent));
}

// ============================ E. 结算金额（Q-030 核心） ============================
function runSettle(orderId) {
  const { App, MockData } = fresh();
  const before = parseFloat(String(MockData.assets.cards.monthlyEarnings || '0').replace(/,/g, '')) || 0;
  const order = (MockData.tasks.myOrders || []).find(o => o.id === orderId);
  App.acceptMyTaskDelivery(orderId);
  const after = parseFloat(String(MockData.assets.cards.monthlyEarnings || '0').replace(/,/g, '')) || 0;
  const settled = (MockData.assets.escrowProjects || []).filter(p => p.statusKey === 'settled');
  return { delta: after - before, order, settled, MockData, App };
}

{
  // ⚠️ 刻意使用「金额 ≠ 3000」的样本：旧实现的兜底常量正是 3000，
  //    而唯一处于「待验收」状态的演示订单 MO-P6 金额恰为 ¥3,000 ⇒ 用它测是测不出的。
  const samples = [
    { id: 'MO-P5', gap: 4200, from: 'GW00' },
    { id: 'MO-T9', gap: 3600, from: 'GW09' }
  ];
  for (const s of samples) {
    const r = runSettle(s.id);
    ok(!!r.order, 'E1 样例订单 ' + s.id + ' 应存在');
    if (!r.order) continue;
    const real = parseFloat(String(r.order.rewardMoney || '0').replace(/[^0-9.]/g, '')) || 0;
    ok(near(real, s.gap), 'E2 ' + s.id + ' 的真实金额应为 ' + s.gap + '（实测 ' + real + '）');
    ok(near(r.delta, real), 'E3【核心】' + s.id + ' 结算额应等于订单真实金额 ' + real + '，实际入账 ' + r.delta + '（若为 3000 则为兜底常量缺陷）');
    ok(!near(r.delta, 3000) || real === 3000, 'E4 ' + s.id + ' 结算额不应落到兜底常量 3000');
    ok(r.order.status === '已完成', 'E5 ' + s.id + ' 结算后订单状态应为已完成');
    ok(r.settled.length > 0, 'E6 ' + s.id + ' 结算后应存在 statusKey=settled 的托管项目');
  }

  // 三条恒等式
  const { App, MockData } = fresh();
  const parse = (v) => parseFloat(String(v == null ? '0' : v).replace(/,/g, '')) || 0;
  App.acceptMyTaskDelivery('MO-P5');

  const items = (MockData.assets.breakdown && MockData.assets.breakdown.items) || [];
  const frozen = items.find(i => i.label === '冻结金额');
  const activeSum = (MockData.assets.escrowProjects || [])
    .filter(p => p.statusKey === 'active')
    .reduce((s, p) => s + (Number(p.amount) || 0), 0);
  ok(!!frozen, 'E7 资产拆分应含「冻结金额」项');
  if (frozen) ok(near(frozen.value, activeSum), 'E8 恒等式②：进行中托管项目合计(' + activeSum + ') 应等于冻结金额(' + (frozen.value) + ')');

  const bal = App.getComputeBalances();
  ok(near(bal.total, bal.self + bal.integrated), 'E9 恒等式③：AI 积分合计应等于自有 + 集成');
  ok(near(parse(MockData.assets.cards.tokensAC), bal.total), 'E10 cards.tokensAC 应与两池合计一致');

  // creditCreatorIncome 必须是转发别名（不得含独立入账实现 ⇒ 不得成为第二事实源）
  const m = APP_SRC.match(/^  creditCreatorIncome: function[\s\S]*?\n  \},/m);
  ok(!!m, 'E11 creditCreatorIncome 应存在（契约名，见 我的资产设计.md）');
  if (m) {
    ok(/return this\.settleTaskReward\(/.test(m[0]), 'E12 creditCreatorIncome 必须是 settleTaskReward 的转发别名');
    ok(!/monthlyEarnings\s*=/.test(m[0]), 'E13 creditCreatorIncome 不应重复实现入账逻辑（第二事实源）');
  }
}

// ============================ F. 生成沉淀与算力扣减 ============================
{
  const { App, MockData, sandbox } = fresh();
  const worksBefore = ((MockData.discover && MockData.discover.works) || []).length;
  const balBefore = App.getComputeBalances();
  const ledBefore = ((MockData.assets && MockData.assets.aiPointLedger) || []).length;

  el('modal-studio-title').innerText = 'AI 视频生成';
  el('studio-prompt-input').value = '测试提示词';
  // simulateGenerate 内部用 setTimeout；桩中 setTimeout 为 no-op ⇒ 直接内联执行回调
  const realST = sandbox.setTimeout;
  sandbox.setTimeout = (fn) => { fn(); return 0; };
  try { App.simulateGenerate(); } finally { sandbox.setTimeout = realST; }

  const worksAfter = ((MockData.discover && MockData.discover.works) || []).length;
  ok(worksAfter === worksBefore + 1, 'F1 生成后作品应回落 discover.works（' + worksBefore + ' → ' + worksAfter + '）');
  ok(!!App.lastStudioDraft && !!App.lastStudioDraft.title, 'F2 应写入 lastStudioDraft');

  const me = (MockData.currentUser && MockData.currentUser.name) || '';
  const mine = ((MockData.discover && MockData.discover.works) || [])
    .filter(w => String(w.author || '').indexOf('小宇') >= 0);
  ok(mine.length > 0, 'F3 新作品 author 应含「小宇」以便「我的作品」抽屉能读到');
  ok(!!me, 'F4 currentUser.name 应存在');

  const balAfter = App.getComputeBalances();
  ok(near(balAfter.self, balBefore.self - 20), 'F5 生成应消耗 20 点自有算力（' + balBefore.self + ' → ' + balAfter.self + '）');
  ok(near(balAfter.integrated, balBefore.integrated), 'F6 不应误扣集成算力');
  ok(near(balAfter.total, balAfter.self + balAfter.integrated), 'F7 扣减后恒等式③仍应成立');
  ok(near(parseFloat(String(MockData.assets.cards.tokensAC).replace(/,/g, '')), balAfter.total),
    'F8 扣减后 cards.tokensAC 应与两池合计一致');

  const led = (MockData.assets && MockData.assets.aiPointLedger) || [];
  ok(led.length === ledBefore + 1, 'F9 应新增一条算力台账记录');
  ok(String(led[0].kind) === 'consume' && Number(led[0].amount) === -20, 'F10 新台账记录应为 consume / -20');

  const ledgerSum = led.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  ok(near(ledgerSum, balAfter.total), 'F11 台账累计(' + ledgerSum + ') 应与算力合计(' + balAfter.total + ') 一致');
}

// ------------------------- 输出 -------------------------
const line = '-'.repeat(66);
console.log('\n' + line);
console.log(' 技术债修复回归自检（Q-028 / Q-029 / Q-030 / 生成沉淀）');
console.log(line);
if (fails.length === 0) {
  console.log(' ✓ 全部通过：' + pass + ' 项断言');
} else {
  console.log(' ✗ ' + fails.length + ' 项失败（通过 ' + pass + ' 项）：');
  fails.forEach((f, i) => console.log('   ' + (i + 1) + '. ' + f));
}
console.log(line + '\n');
process.exit(fails.length === 0 ? 0 : 1);
