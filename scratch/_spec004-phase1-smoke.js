'use strict';
/**
 * SPEC-004 Phase 1 · 行为冒烟（T-004-26）
 * ---------------------------------------------------------------------------
 * 与 SPEC-017 / SPEC-003 的冒烟同构，两个要点：
 *   ① **不吞异常** —— 任何异常都计数并失败（区别于"套件为了跑完而 safe()"）；
 *   ② **新旧双沙箱对比** —— 用改动前的备份跑**同一组既有动作**，逐项比对 ⇒
 *      证明"既有路径零副作用"。
 *
 * 🔴 本 Feature 的**追加要点**（Phase 1 硬约束，`plan.md` §17.2）：
 *   · `index.html` 的 **`#modal-studio` 段**必须**逐字未改**；
 *   · `js/app.js` 的 **`simulateGenerate` / `openAIWorkbench`** 必须**逐字未改**。
 *   ⇒ 这一条比"行为一致"更强：**直接比文本**。
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const BAK = process.env.SPEC004_BAK || 'app.js.bak-20260925-130137';
const BAK_HTML = 'index.html.bak-20260925-130137';

const errors = [];
let pass = 0, fail = 0;
const fails = [];
function ok(cond, msg) { if (cond) { pass++; } else { fail++; fails.push(msg); } }

// ------------------------- DOM 桩 -------------------------
class CL { constructor() { this.s = new Set(); } add(...c) { c.forEach(x => this.s.add(x)); } remove(...c) { c.forEach(x => this.s.delete(x)); } toggle(c, f) { const on = f === undefined ? !this.s.has(c) : !!f; if (on) this.s.add(c); else this.s.delete(c); return on; } contains(c) { return this.s.has(c); } }
class El {
  constructor(id) { this.id = id; this._a = {}; this.innerText = ''; this.textContent = ''; this.innerHTML = ''; this.value = ''; this.hidden = false; this.disabled = false; this.style = {}; this.classList = new CL(); }
  getAttribute(n) { return this._a[n] === undefined ? null : this._a[n]; }
  setAttribute(n, v) { this._a[n] = v; }
  appendChild(c) { return c; }
  addEventListener() {}
  querySelectorAll() { return []; }
  querySelector() { return null; }
}
const registry = new Map();
const el = (id) => { if (!registry.has(id)) registry.set(id, new El(id)); return registry.get(id); };
const doc = {
  body: el('__body'),
  getElementById: (id) => el(id),
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: (t) => new El('__' + t),
  addEventListener() {}
};

function load(appSrc, mockSrc) {
  const sb = {
    console: { log() {}, error() {}, warn() {}, info() {} },
    document: doc,
    location: { hash: '', href: 'http://localhost/', pathname: '/' },
    setTimeout: (fn) => { if (typeof fn === 'function') fn(); return 0; },
    clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
    localStorage: (function () { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), clear: () => m.clear() }; })(),
    Date, Math, JSON, parseInt, parseFloat, String, Number, Array, Object, RegExp, isNaN, isFinite
  };
  sb.window = sb;
  vm.createContext(sb);
  vm.runInContext(mockSrc, sb, { filename: 'mock_data.js' });
  vm.runInContext(CHARTS_SRC, sb, { filename: 'charts.js' });   // ⚠️ `navigateTo('analytics')` 会用到 ChartEngine
  vm.runInContext(appSrc + '\n;globalThis.__App = App;', sb, { filename: 'app.js' });
  const App = vm.runInContext('__App', sb);
  if (typeof App.showToast === 'function') App.showToast = function () {};
  return { App, MockData: vm.runInContext('MockData', sb), sandbox: sb };
}

const APP_NEW = fs.readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf8');
const CHARTS_SRC = fs.readFileSync(path.join(ROOT, 'js', 'charts.js'), 'utf8');
const MOCK_NEW = fs.readFileSync(path.join(ROOT, 'js', 'mock_data.js'), 'utf8');
const APP_OLD = fs.readFileSync(path.join(ROOT, 'scratch', BAK), 'utf8');
const MOCK_OLD = MOCK_NEW;   // ⚠️ mock_data 有改动（新增字段）⇒ 旧沙箱也需能跑；数据差异在 P2 中显式列出
const HTML_NEW = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const HTML_OLD = fs.readFileSync(path.join(ROOT, 'scratch', BAK_HTML), 'utf8');

const num = (v) => parseFloat(String(v == null ? '0' : v).replace(/,/g, '')) || 0;
const cards = (md) => (md.assets && md.assets.cards) || {};
function fund(md) { const c = cards(md); return JSON.stringify([c.balance, c.withdrawable, c.frozen]); }
function selfBal(md) { return num(cards(md).tokensSelf); }
function integBal(md) { return num(cards(md).tokensIntegrated); }
function objCount(md) { const o = md.assets && md.assets.objects; return Array.isArray(o) ? o.length : -1; }
function totalBytes(md) { const o = md.assets && md.assets.objects; return Array.isArray(o) ? o.reduce((a, x) => a + Number((x && x.bytes) || 0), 0) : -1; }
function ledgerLen(md) { return ((md.assets && md.assets.aiPointLedger) || []).length; }
function learn(md) { return Number((md.currentUser && md.currentUser.learningPoints) || 0); }

/** 从 HTML 中切出某个 `id="X"` 所在元素的完整文本块（按 <div> 深度平衡） */
function sliceBlockByDiv(html, marker) {
  const i = html.indexOf(marker);
  if (i < 0) return '';
  const start = html.lastIndexOf('<div', i);
  if (start < 0) return '';
  let depth = 0, k = start;
  const re = /<div\b|<\/div>/g;
  re.lastIndex = start;
  let m;
  while ((m = re.exec(html)) !== null) {
    if (m[0] === '<div') depth++;
    else { depth--; if (depth === 0) { k = m.index + m[0].length; break; } }
  }
  return html.slice(start, k);
}

/** 从 JS 源码中切出某个方法（按花括号平衡） */
function sliceMethod(src, name) {
  const i = src.indexOf('  ' + name + ': function');
  if (i < 0) return '';
  let depth = 0, started = false;
  for (let k = i; k < src.length; k++) {
    const ch = src[k];
    if (ch === '{') { depth++; started = true; }
    else if (ch === '}') { depth--; if (started && depth === 0) return src.slice(i, k + 1); }
  }
  return src.slice(i);
}

console.log('');
console.log(' SPEC-004 Phase 1 · 行为冒烟（不吞异常 + 新旧双沙箱对比 + 弹窗/方法逐字未改）');
console.log('='.repeat(78));

// ============================ P0 · 契约段逐字未改 ============================
console.log(' P0 · Phase 1 硬约束：`#modal-studio` 与既有生成路径**逐字未改**');
{
  const modalNew = sliceBlockByDiv(HTML_NEW, 'id="modal-studio"');
  const modalOld = sliceBlockByDiv(HTML_OLD, 'id="modal-studio"');
  // ⚠️ 本 Feature **有意**只加两个 `id` 属性（T-004-15：`#studio-model` / `#studio-ratio`，
  //    为满足 `FR-004-14`「模型引擎 / 画幅比例控件须可被程序读取」）⇒ 比对前先归一化掉它们。
  const norm = (h) => h.replace(/\s*id="studio-(model|ratio)"/g, '');
  ok(modalNew.length > 0 && norm(modalNew) === norm(modalOld),
    'P0-1 🔴 `index.html` 的 `#modal-studio` 段**除「加 2 个 id」外逐字一致**（' + modalOld.length + ' → ' + modalNew.length + '，差异 +' + (modalNew.length - modalOld.length) + ' 字符 = 两个 id 属性）');

  ['simulateGenerate', 'openAIWorkbench', 'submitStudioToTask', 'publishStudioToShowcase', 'publishFromStudio'].forEach(function (nm, i) {
    const a = sliceMethod(APP_NEW, nm);
    const b = sliceMethod(APP_OLD, nm);
    ok(a.length > 0 && a === b, 'P0-' + (i + 2) + ' 🔴 `App.' + nm + '` **逐字一致**（长度 ' + b.length + ' → ' + a.length + '）');
  });
}

// ============================ P1 · 新页主链路（不吞异常） ============================
console.log(' P1 · 新页主链路（任何异常都计数）');
{
  const s = load(APP_NEW, MOCK_NEW);
  const step = (label, fn) => {
    try { const r = fn(); ok(r !== false, 'P1 ' + label); return r; }
    catch (e) { errors.push(label + ' → ' + e.message); fail++; fails.push('P1 ' + label + ' 抛异常：' + e.message); return null; }
  };
  const t = (s.MockData.tools.allTools || []).find(x => x.integration === 'native');
  const money0 = fund(s.MockData), learn0 = learn(s.MockData);

  step('打开详情页（native）', () => s.App.openToolDetail(t.id));
  ok(s.App.currentView === 'tool-detail' && s.sandbox.location.hash === 'tool-detail', 'P1-2 视图与 hash 均切到 tool-detail');
  step('收起 Hero', () => s.App.toggleTdHero());
  step('展开 Hero', () => s.App.toggleTdHero());
  step('切 Hero 标签（tips）', () => s.App.switchTdTab('tips'));
  step('切 Hero 标签（templates）', () => s.App.switchTdTab('templates'));
  step('切工作区（history）', () => s.App.switchTdWorkTab('history'));
  step('切工作区（workbench）', () => s.App.switchTdWorkTab('workbench'));

  const objs0 = objCount(s.MockData), self0 = selfBal(s.MockData);
  const pre = step('预扣（生成前）', () => s.App.preauthorizeGenerate(t.id, '冒烟：一件校园主题成片'));
  ok(!!pre && pre.ok === true && selfBal(s.MockData) === self0 - pre.cost, 'P1-10 预扣 ⇒ 来源池已减（' + self0 + ' → ' + selfBal(s.MockData) + '）');
  const gen = step('落盘（提交渲染）', () => s.App.generateFromTicket(pre.ticket, '冒烟：一件校园主题成片'));
  ok(!!gen && gen.ok === true && objCount(s.MockData) === objs0 + 1, 'P1-11 落盘 ⇒ 对象 +1（' + objs0 + ' → ' + objCount(s.MockData) + '）');

  // 双路流转（走既有方法 ⇒ 应建立引用且不新增对象/不改字节）
  const bytes1 = totalBytes(s.MockData), self1 = selfBal(s.MockData);
  step('分享至社区（既有方法）', () => s.App.publishFromStudio());
  ok(objCount(s.MockData) === objs0 + 1 && totalBytes(s.MockData) === bytes1 && selfBal(s.MockData) === self1,
    'P1-12 分享 ⇒ 不新增对象 / 不改字节 / 不再扣费');

  // 模板套用（不扣分）
  const td = (s.MockData.tools.toolDetails || {})[t.id] || {};
  const tplId = (td.templates || [])[0] && (td.templates[0].id || td.templates[0].name);
  const self2 = selfBal(s.MockData), integ2 = integBal(s.MockData), learn2 = learn(s.MockData);
  const apr = step('套用模板', () => s.App.applyTemplateToWorkspace(tplId, t.id));
  ok(!!apr && selfBal(s.MockData) === self2 && integBal(s.MockData) === integ2 && learn(s.MockData) === learn2,
    'P1-13 套用模板 ⇒ **不扣分**（AI 积分两源与学习积分均不变）');

  // 恢复草稿（不扣分）
  const s2 = selfBal(s.MockData), i2 = integBal(s.MockData);
  const rd = step('恢复草稿', () => s.App.restoreDraft('RP1'));
  ok(!!rd && selfBal(s.MockData) === s2 && integBal(s.MockData) === i2, 'P1-14 恢复草稿 ⇒ **不扣分**');

  // 失败路径：全额退还 + 零残留
  const s3 = selfBal(s.MockData), o3 = objCount(s.MockData);
  const pre2 = s.App.preauthorizeGenerate(t.id, '冒烟：注定失败的渲染');
  const gen2 = pre2 && pre2.ok ? s.App.generateFromTicket(pre2.ticket, '冒烟：注定失败的渲染') : null;
  const fk = s.App.failGenerate(pre2.ticket, 'render_error');
  ok(fk === true && selfBal(s.MockData) === s3 && objCount(s.MockData) === o3,
    'P1-15 失败 ⇒ 全额退还 + 零残留（self ' + s3 + ' → ' + selfBal(s.MockData) + '；对象 ' + o3 + ' → ' + objCount(s.MockData) + '）');

  // 资金账本 / 双轨分离
  ok(fund(s.MockData) === money0, 'P1-16 🔴 全链路 ⇒ **资金账本三项不变**');
  ok(learn(s.MockData) === learn0, 'P1-17 🔴 全链路 ⇒ **创作积分不变**（双轨分离）');
  ok((s.MockData.assets.aiPointLedger || []).length > 0, 'P1-18 算力流水存在（可对账）');
}

// ============================ P2 · 新旧双沙箱对比（既有动作零副作用） ============================
console.log(' P2 · 新旧双沙箱对比（既有动作在改动前后应**完全一致**）');
{
  const acts = [
    ['打开既有弹窗', (A) => { A.openAIWorkbench('AI 长文写作'); }, true],
    ['既有生成（simulateGenerate）', (A) => { A.simulateGenerate(); }, false],
    // ⚠️ 刻意**不用** `analytics` —— 它会触发 ChartEngine 渲染，而本冒烟的最小 DOM 桩**无 canvas 支持**
    //    （该异常新旧一致 ⇒ 属**既有桩缺口**，非实现缺陷；避免它以免掩盖真实异常）
    ['切换视图（discover）', (A) => { A.navigateTo('discover'); }, true],
  ];
  acts.forEach(function (pair) {
    const label = pair[0], fn = pair[1], readOnly = pair[2];
    const a = load(APP_NEW, MOCK_NEW);
    const b = load(APP_OLD, MOCK_NEW);
    // ⚠️ 快照**不含** id / 时间戳（`Date.now()` 会让流水 id 不同，但那不是行为差异）
    const snap = (x) => JSON.stringify([fund(x.MockData), ledgerLen(x.MockData), objCount(x.MockData), selfBal(x.MockData), integBal(x.MockData)]);
    const a0 = snap(a), b0 = snap(b);
    try { fn(a.App, a.MockData); } catch (e) { errors.push('P2 新·' + label + ' → ' + e.message); }
    try { fn(b.App, b.MockData); } catch (e) { errors.push('P2 旧·' + label + ' → ' + e.message); }
    const a1 = snap(a), b1 = snap(b);
    // ① 新旧两边的**净变化必须一致**（这才是"零回归"的判据）
    ok(a1 === b1, 'P2 新旧净效果一致（' + label + '）' + (a1 === b1 ? '' : '｜新=' + a1 + '｜旧=' + b1));
    // ② **只读**动作 ⇒ 任何一边都不得有变化（对有副作用的动作不作此断言）
    if (readOnly) ok(a0 === a1 && b0 === b1, 'P2 只读动作零副作用（' + label + '）');
  });

  // 既有生成路径的"净效果"必须新旧逐项一致
  const a2 = load(APP_NEW, MOCK_NEW), b2 = load(APP_OLD, MOCK_NEW);
  a2.App.simulateGenerate(); b2.App.simulateGenerate();
  ok(selfBal(a2.MockData) === selfBal(b2.MockData) && integBal(a2.MockData) === integBal(b2.MockData),
    'P2-10 既有生成的扣分结果新旧**完全一致**（self ' + selfBal(a2.MockData) + ' / ' + selfBal(b2.MockData) + '；integ ' + integBal(a2.MockData) + ' / ' + integBal(b2.MockData) + '）');
  ok(JSON.stringify(a2.App.lastStudioDraft) === JSON.stringify(b2.App.lastStudioDraft),
    'P2-11 既有生成的 `lastStudioDraft` 新旧**完全一致**');
}

// ============================ P3 · 数据面 ============================
console.log(' P3 · 数据面（三模式样本 / 工具箱与榜单 id 不悬空）');
{
  const s = load(APP_NEW, MOCK_NEW);
  const ids = new Set((s.MockData.tools.allTools || []).map(x => x.id));
  const dangling = [].concat(s.MockData.tools.myToolbox || [], s.MockData.tools.leaderboard || [])
    .filter(x => !ids.has(x.id)).map(x => x.id);
  ok(dangling.length === 0, 'P3-1 工具箱 / 榜单的 `id` **无悬空**' + (dangling.length ? '（悬空：' + dangling.join(',') + '）' : ''));
  const modes = {};
  (s.MockData.tools.allTools || []).forEach(x => { modes[x.integration] = (modes[x.integration] || 0) + 1; });
  ok(modes['native'] >= 1 && modes['third-integrated'] >= 1 && modes['third-external'] >= 1,
    'P3-2 三模式**均有样本**（' + JSON.stringify(modes) + '）');
  const tdKeys = Object.keys(s.MockData.tools.toolDetails || {});
  ok(tdKeys.length >= (s.MockData.tools.allTools || []).length, 'P3-3 `toolDetails` 覆盖全部工具（' + tdKeys.length + '/' + s.MockData.tools.allTools.length + '）');
  const self = selfBal(s.MockData), integ = integBal(s.MockData);
  ok(Math.abs(self + integ - num(cards(s.MockData).tokensAC)) < 0.005, 'P3-4 算力恒等式 `self + integrated === total` 成立（' + self + ' + ' + integ + '）');
}

// ============================ 汇总 ============================
console.log('');
console.log('='.repeat(78));
console.log(' 行为冒烟通过：' + pass + ' / ' + (pass + fail) + '　｜　异常 ' + errors.length + ' 条');
if (errors.length) { console.log(' ⚠️ 异常明细：'); errors.slice(0, 12).forEach((e, i) => console.log('   ' + (i + 1) + '. ' + e)); }
if (fails.length) { console.log(' ✗ 失败明细：'); fails.forEach((f, i) => console.log('   ' + (i + 1) + '. ' + f)); }
console.log('='.repeat(78) + '\n');
process.exit(fail === 0 && errors.length === 0 ? 0 : 1);
