#!/usr/bin/env node
/**
 * 商单资金托管库 · 托管进度明细 自检脚本
 * ---------------------------------------------------------------------------
 * 零依赖、离线。用最小 DOM 桩加载 js/mock_data.js + js/app.js，断言：
 *   ① 列表按「冻结时间倒序」排列；
 *   ② 每个项目都标注冻结金额；
 *   ③ 进行中项目冻结合计 === 资产卡「冻结金额」=== 托管中流水合计（三方恒等）；
 *   ④ 发布冻结 / 验收解冻与托管台账的闭环联动；
 *   ⑤ 静态契约（弹窗节点、卡片入口、方法唯一性、样式类）。
 *
 * 用法： node temp/wb-escrow-progress-verify.js
 * 退出码 0 = 全过，1 = 有失败
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const CSS = fs.readFileSync(path.join(ROOT, 'css', 'style.css'), 'utf8');
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
    this.disabled = false;
    this.style = {};
    this.classList = new ClassList();
  }
  getAttribute(n) { return this._attrs[n] === undefined ? null : this._attrs[n]; }
  setAttribute(n, v) { this._attrs[n] = v; }
  appendChild(c) { return c; }
  addEventListener() {}
  querySelectorAll() { return []; }
}

const registry = new Map();
function el(id, attrs) {
  if (!registry.has(id)) registry.set(id, new El(id, attrs));
  return registry.get(id);
}

// 托管进度弹窗内的三档筛选胶囊
const filterTabs = [
  new El('escrow-tab-all', { 'data-filter': 'all' }),
  new El('escrow-tab-active', { 'data-filter': 'active' }),
  new El('escrow-tab-settled', { 'data-filter': 'settled' })
];

const documentStub = {
  getElementById: (id) => el(id),
  querySelector: () => null,
  querySelectorAll: (sel) => (sel.indexOf('pill-tab') !== -1 ? filterTabs : []),
  addEventListener: () => {},
  body: new El('body')
};

['modal-escrow-progress', 'escrow-project-list', 'escrow-filter-tabs', 'escrow-list-label',
 'escrow-total-frozen', 'escrow-active-count', 'escrow-settled-total', 'escrow-library-desc',
 'asset-display-balance', 'asset-display-withdrawable']
  .forEach(id => el(id));

const windowStub = {
  location: { hash: '' },
  scrollTo: () => {},
  addEventListener: () => {},
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  document: documentStub
};

const sandbox = {
  window: windowStub,
  document: documentStub,
  console,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  Date, Math, JSON, Object, Array, String, Number, Boolean, RegExp, Error,
  isNaN, parseInt, parseFloat, encodeURIComponent
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(MOCK_SRC + '\nglobalThis.__MockData = MockData;', sandbox, { filename: 'mock_data.js' });
vm.runInContext(APP_SRC + '\nglobalThis.__App = App;', sandbox, { filename: 'app.js' });

const MockData = sandbox.__MockData;
const App = sandbox.__App;

// ------------------------- 断言工具 -------------------------
let pass = 0;
const fails = [];
function ok(cond, label, extra) {
  if (cond) { pass += 1; } else { fails.push(label + (extra ? '  → ' + extra : '')); }
}
function eq(actual, expected, label) {
  ok(actual === expected, label, `实际 ${JSON.stringify(actual)}，期望 ${JSON.stringify(expected)}`);
}
function has(str, sub, label) {
  ok(String(str).indexOf(sub) !== -1, label, `未找到「${sub}」`);
}
function notHas(str, sub, label) {
  ok(String(str).indexOf(sub) === -1, label, `不应出现「${sub}」`);
}
function countOccurrences(str, sub) {
  return String(str).split(sub).length - 1;
}

const A = MockData.assets;
const num = (s) => parseFloat(String(s).replace(/[^\d.-]/g, '')) || 0;
const freezeValue = (A.breakdown.items.find(i => i.label === '冻结金额') || {}).value;

ok(!!MockData && !!App, 'E00 装载 mock_data.js / app.js 成功');

// ============================ 数据层 ============================
ok(Array.isArray(A.escrowProjects), 'E01 assets.escrowProjects 为数组');
eq(A.escrowProjects.length, 6, 'E02 托管台账共 6 个项目（4 进行中 + 2 历史）');

const activeList = A.escrowProjects.filter(p => p.statusKey === 'active');
const settledList = A.escrowProjects.filter(p => p.statusKey === 'settled');
eq(activeList.length, 4, 'E03 进行中项目 4 个');
eq(settledList.length, 2, 'E04 历史项目（已结算 / 已退还）2 个');

const activeSum = activeList.reduce((s, p) => s + p.amount, 0);
eq(activeSum, 1500, 'E05 【红线】进行中项目冻结合计 = ¥1,500.00');
eq(freezeValue, 1500, 'E06 【红线】资产卡「冻结金额」= ¥1,500.00');
eq(activeSum, freezeValue, 'E07 【红线】冻结台账合计 与 资产卡冻结金额 三方恒等');

const escrowTxList = A.transactions.filter(t => t.status === '托管中');
eq(escrowTxList.length, 4, 'E08 资产明细中「托管中」支流水 4 笔');
eq(escrowTxList.reduce((s, t) => s + Math.abs(t.rawAmount), 0), 1500, 'E09 托管中流水合计 = ¥1,500.00');

let txLinked = true;
activeList.forEach(p => {
  const tx = A.transactions.find(t => t.id === p.txId);
  if (!tx || tx.status !== '托管中' || Math.abs(tx.rawAmount) !== p.amount) txLinked = false;
});
ok(txLinked, 'E10 每个进行中项目均通过 txId 关联到等额「托管中」流水');

ok(activeList.every(p => p.frozenAt && p.frozenAtTs > 0), 'E11 每个项目均带冻结时间与排序用时间戳');
ok(A.escrowProjects.every(p => p.title && p.counterpart && p.role && p.settleRule), 'E12 每个项目均带名称 / 交易对手 / 角色 / 结算规则');

// ============================ 排序与汇总 ============================
const sorted = App.getEscrowProjects();
eq(sorted.length, 6, 'E13 getEscrowProjects() 返回 6 个项目');
let desc = true;
for (let i = 1; i < sorted.length; i++) {
  if (sorted[i - 1].frozenAtTs < sorted[i].frozenAtTs) desc = false;
}
ok(desc, 'E14 【核心】列表严格按冻结时间倒序排列');
eq(sorted[0].id, 'ESC1', 'E15 最新冻结的项目排在最上方（ESC1 · 2024-05-16）');
eq(sorted[sorted.length - 1].id, 'ESC6', 'E16 最早的项目排在末尾（ESC6 · 2024-04-02）');

const summary = App.getEscrowSummary();
eq(summary.frozen, 1500, 'E17 汇总：托管中金额 ¥1,500.00');
eq(summary.activeCount, 4, 'E18 汇总：进行中项目 4 个');
eq(summary.settled, 4200, 'E19 汇总：累计已结算 ¥4,200.00（不含已退还）');
eq(summary.total, 6, 'E20 汇总：项目总数 6 个');

// ============================ 渲染 ============================
App._escrowFilter = 'all';
App.renderEscrowProgress();
const listEl = documentStub.getElementById('escrow-project-list');
const allHtml = listEl.innerHTML;
eq(countOccurrences(allHtml, 'class="escrow-project-item'), 6, 'E21 全部筛选渲染 6 行项目');
const firstIdx = allHtml.indexOf(sorted[0].title);
ok(firstIdx !== -1, 'E22 渲染结果含最新项目标题');
ok(allHtml.indexOf('class="escrow-project-item') < firstIdx, 'E23 最新项目位于列表首位（首行即最新冻结）');

const amountTexts = ['¥ 600.00', '¥ 420.00', '¥ 300.00', '¥ 180.00', '¥ 4,200.00', '¥ 1,500.00'];
let allAmountShown = true;
amountTexts.forEach(t => { if (allHtml.indexOf(t) === -1) allAmountShown = false; });
ok(allAmountShown, 'E24 【核心】每个项目都渲染出自己的冻结金额');
ok(allHtml.indexOf('冻结于 2024-05-16 15:20') !== -1, 'E25 进行中项目显示「冻结于 <时间>」');
ok(allHtml.indexOf('原冻结金额') !== -1, 'E26 已结算 / 已退还项目标注为「原冻结金额」');
ok(allHtml.indexOf('escrow-project-bar') !== -1, 'E27 渲染履约进度条');

eq(el('escrow-total-frozen').innerText, '¥ 1,500.00', 'E28 汇总条「托管中金额」= ¥ 1,500.00');
eq(el('escrow-active-count').innerText, '4 个', 'E29 汇总条「进行中项目」= 4 个');
eq(el('escrow-settled-total').innerText, '¥ 4,200.00', 'E30 汇总条「累计已结算」= ¥ 4,200.00');
has(el('escrow-list-label').innerText, '按冻结时间倒序', 'E31 列表标题标注排序规则');
has(el('escrow-list-label').innerText, '共 6 个项目', 'E32 列表标题回写项目条数');

// ============================ 筛选 ============================
App.filterEscrowProjects('active');
eq(countOccurrences(listEl.innerHTML, 'class="escrow-project-item'), 4, 'E33 「进行中」筛选渲染 4 行');
notHas(listEl.innerHTML, '原冻结金额', 'E34 「进行中」筛选不含已结算项目');
ok(filterTabs[1].classList.contains('active'), 'E35 「进行中」胶囊高亮');
ok(!filterTabs[0].classList.contains('active'), 'E36 切换后「全部」胶囊取消高亮');

App.filterEscrowProjects('settled');
eq(countOccurrences(listEl.innerHTML, 'class="escrow-project-item'), 2, 'E37 「已结算 / 已退还」筛选渲染 2 行');
has(listEl.innerHTML, '已退还', 'E38 已退还项目出现在终态筛选中');

App.filterEscrowProjects('bogus');
eq(App._escrowFilter, 'all', 'E39 非法筛选值回落为 all');
eq(countOccurrences(listEl.innerHTML, 'class="escrow-project-item'), 6, 'E40 回落 all 后恢复 6 行');

// ============================ 卡片文案同源 ============================
App.renderEscrowLibraryCard();
eq(el('escrow-library-desc').innerText, '已安全托管未结算商单款项 ¥ 1,500.00，完工立即到账', 'E41 托管库卡片文案与冻结合计同源');

// ============================ 发布 / 结算闭环联动 ============================
const txCountBefore = A.transactions.length;
const freezeOk = App.freezeEscrow(200, '发布商单全额托管 · 托管台账联动测试');
eq(freezeOk, true, 'E42 freezeEscrow(¥200) 冻结成功');
eq(A.escrowProjects.length, 7, 'E43 托管库自动新增 1 条进行中项目');
eq(A.transactions.length, txCountBefore + 1, 'E44 同时新增 1 笔托管中支流水');
eq(App.getEscrowSummary().frozen, 1700, 'E45 冻结合计同步增至 ¥1,700.00');
const newest = App.getEscrowProjects()[0];
eq(newest.amount, 200, 'E46 新项目冻结金额 = ¥200.00');
eq(newest.frozenAt, '刚刚', 'E47 新项目冻结时间记为「刚刚」');
eq(newest.statusKey, 'active', 'E48 新项目状态为进行中');
ok(App.getEscrowProjects()[0].frozenAtTs >= sorted[0].frozenAtTs, 'E49 新项目排在列表最上方（冻结时间最新）');
App.renderEscrowLibraryCard();
has(el('escrow-library-desc').innerText, '¥ 1,700.00', 'E50 卡片文案随冻结变化同步刷新');

App.releaseEscrow(200, '验收结算 · 托管台账联动测试');
eq(App.getEscrowSummary().frozen, 1500, 'E51 解冻后冻结合计回落至 ¥1,500.00');
eq(A.escrowProjects.filter(p => p.statusKey === 'active').length, 4, 'E52 对应项目转为已结算');
const released = A.escrowProjects.find(p => p.id === newest.id);
eq(released.status, '已结算', 'E53 解冻项目状态置为已结算');
eq(released.progress, 100, 'E54 解冻项目进度置为 100%');

// ============================ 恒等式复检（红线） ============================
eq(num(A.cards.balance) - num(A.cards.withdrawable), 1500, 'E55 【红线】总额 − 可提现 = 冻结金额 ¥1,500 恒等成立');
eq((A.breakdown.items.find(i => i.label === '冻结金额') || {}).value,
   App.getEscrowSummary().frozen, 'E56 【红线】解冻后 台账冻结合计 仍恒等于 资产卡冻结金额');

// ============================ 静态契约 ============================
ok(HTML.indexOf('id="modal-escrow-progress"') !== -1, 'E57 index.html 存在 #modal-escrow-progress');
ok(HTML.indexOf('id="escrow-project-list"') !== -1, 'E58 index.html 存在 #escrow-project-list');
ok(HTML.indexOf('id="escrow-filter-tabs"') !== -1, 'E59 index.html 存在 #escrow-filter-tabs');
ok(HTML.indexOf('id="escrow-library-desc"') !== -1, 'E60 index.html 存在 #escrow-library-desc');
ok(HTML.indexOf('id="escrow-total-frozen"') !== -1, 'E61 index.html 存在 #escrow-total-frozen');
has(HTML, 'onclick="App.openEscrowProgressModal()"', 'E62 托管库卡片绑定 App.openEscrowProgressModal()');
notHas(HTML, '<div class="opc-infra-desc">已安全托管未结算商单款项 ¥ 1,850.00', 'E63 卡片旧数字 ¥1,850.00 已清除');
notHas(HTML, '¥ 1,850.00', 'E64 index.html 中不再残留 ¥1,850.00');

// 弹窗片段内不得出现外部支付通道
const escrowBlock = HTML.slice(HTML.indexOf('id="modal-escrow-progress"'),
  HTML.indexOf('id="modal-escrow-progress"') + 3200);
notHas(escrowBlock, '<option', 'E65 托管进度弹窗内不出现任何外部支付通道下拉');
notHas(escrowBlock, 'payFromAccountBalance', 'E66 托管进度弹窗不涉及余额支付引擎');

// 方法唯一性（不得重复定义）
['getEscrowProjects', 'getEscrowSummary', 'renderEscrowLibraryCard', 'openEscrowProgressModal',
 'filterEscrowProjects', 'renderEscrowProgress'].forEach((n) => {
  const hits = [...APP_SRC.matchAll(new RegExp('\\n  ' + n + ': function', 'g'))].length;
  eq(hits, 1, `E67 方法唯一：App.${n}()`);
});

// 样式类
['.escrow-summary-strip', '.escrow-project-list', '.escrow-project-item', '.escrow-status-pill',
 '.escrow-project-bar', '.escrow-amount-value', '.escrow-project-rule', '.escrow-empty']
  .forEach((cls) => {
    ok(CSS.indexOf(cls + ' ') !== -1 || CSS.indexOf(cls + ':') !== -1 || CSS.indexOf(cls + ',') !== -1,
      `E68 样式类存在：${cls}`);
  });

// 结构配对
eq(countOccurrences(HTML, '<div'), countOccurrences(HTML, '</div>'), 'E69 index.html 全局 div 配对');

// ------------------------- 输出 -------------------------
const line = '-'.repeat(66);
console.log('\n' + line);
console.log(' 商单资金托管库 · 托管进度明细 自检');
console.log(line);
if (fails.length === 0) {
  console.log(` ✓ 全部通过：${pass}/${pass} 项断言`);
} else {
  console.log(` ✗ ${fails.length} 项失败（通过 ${pass} 项）：`);
  fails.forEach((f, i) => console.log(`   ${i + 1}. ${f}`));
}
console.log(line + '\n');
process.exit(fails.length === 0 ? 0 : 1);
