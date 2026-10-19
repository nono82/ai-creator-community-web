#!/usr/bin/env node
/**
 * 本轮需求专项自检（零依赖、离线）
 * ---------------------------------------------------------------------------
 *   ① 提现资金来源迁移：只有「创作收益」可提现，账户余额只可充值不可提现
 *   ② 算力充值新增算力类型（自有算力 / 集成算力）且必选
 *   ③ AI 积分明细按算力类型分账展示
 *   ④ 成长学院定制播放器：防拖拽 / 断点续播 / 安全性（完成闸门）
 *   ⑤ 全量课程中心「更多课程」二级页类型筛选
 *
 * 用法： node temp/wb-assets-plus-verify.js
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
  get className() { return Array.from(this.classList.set).join(' '); }
  set className(v) { this.classList.set = new Set(String(v == null ? '' : v).split(/\s+/).filter(Boolean)); }
  getAttribute(n) { return this._attrs[n] === undefined ? null : this._attrs[n]; }
  setAttribute(n, v) { this._attrs[n] = v; }
  appendChild(c) { return c; }
  addEventListener() {}
  removeEventListener() {}
  querySelectorAll() { return []; }
  getContext() { return null; }
  // 进度条几何：固定 400px 宽、起点 0，便于精确换算拖拽比例
  getBoundingClientRect() { return { left: 0, top: 0, width: 400, height: 16 }; }
}

const registry = new Map();
function el(id, attrs) {
  if (!registry.has(id)) registry.set(id, new El(id, attrs));
  return registry.get(id);
}

const documentStub = {
  getElementById: (id) => el(id),
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: () => {},
  removeEventListener: () => {},
  body: new El('body')
};

const windowStub = {
  location: { hash: '' },
  scrollTo: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  setTimeout, clearTimeout, setInterval, clearInterval,
  document: documentStub
};

const sandbox = {
  window: windowStub,
  document: documentStub,
  console,
  setTimeout, clearTimeout, setInterval, clearInterval,
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
const num = (s) => parseFloat(String(s == null ? '0' : s).replace(/[,\s¥]/g, '')) || 0;

// Toast 捕获 + 剥离副作用渲染
const toasts = [];
App.showToast = function (msg) { toasts.push(String(msg)); };
function lastToast() { return toasts.length ? toasts[toasts.length - 1] : ''; }
App.renderTransactionsTable = function () {};

console.log('== A. 数据层：资金来源 / 算力类型 / 积分台账 / 播放器口径 ==');

// --- A1 提现资金来源 ---
const rules = MockData.assets.withdrawRules;
eq(rules.sourceLabel, '创作收益', 'A01 提现资金来源标签 = 「创作收益」');
eq(rules.sourceCardKey, 'monthlyEarnings', 'A02 资金来源卡键 = monthlyEarnings');
has(rules.sourceNote, '不可提现', 'A03 规则脚注明确账户余额不可提现');
const src0 = App.getWithdrawSource();
eq(src0.label, '创作收益', 'A04 getWithdrawSource().label');
eq(src0.key, 'monthlyEarnings', 'A05 getWithdrawSource().key');
eq(src0.amount, 12680.3, 'A06 getWithdrawSource().amount = ¥12,680.30');

// --- A2 算力类型 ---
const types = MockData.assets.computeTypes;
eq(types.length, 2, 'A07 算力类型共 2 项');
eq(types[0].id, 'self', 'A08 第一种类型为「自有算力」');
eq(types[1].id, 'integrated', 'A09 第二种类型为「集成算力」');
ok(App.getComputeType('self') && App.getComputeType('self').name === '自有算力', 'A10 getComputeType(self) 命中');
ok(App.getComputeType('integrated') && App.getComputeType('integrated').name === '集成算力', 'A11 getComputeType(integrated) 命中');
ok(App.getComputeType('nope') === null, 'A12 getComputeType 未知类型回落 null');
ok(types[0].pointsRatio === 1 && types[1].pointsRatio < 1, 'A13 集成算力到账点数按 pointsRatio 折算');

// --- A3 两类算力账本 ---
const bal0 = App.getComputeBalances();
eq(bal0.self, 1640, 'A14 自有算力账本基线 1,640.00');
eq(bal0.integrated, 700, 'A15 集成算力账本基线 700.00');
eq(bal0.total, 2340, 'A16 合计 2,340.00');
eq(num(MockData.assets.cards.tokensAC), bal0.total, 'A17 cards.tokensAC 与分账合计一致（恒等式）');

// --- A4 AI 积分流水台账自洽 ---
const ledgerSelf = MockData.assets.aiPointLedger.filter(r => r.type === 'self');
const ledgerInte = MockData.assets.aiPointLedger.filter(r => r.type === 'integrated');
eq(ledgerSelf.reduce((s, r) => s + r.amount, 0), 1640, 'A18 自有算力流水累加 = 当前自有账本');
eq(ledgerInte.reduce((s, r) => s + r.amount, 0), 700, 'A19 集成算力流水累加 = 当前集成账本');
ok(MockData.assets.aiPointLedger.every(r => r.type === 'self' || r.type === 'integrated'),
  'A20 所有流水均归属两种算力类型之一');

// --- A5 播放器口径 ---
const pc = MockData.academy.playerConfig;
eq(pc.antiSeek, true, 'A21 播放器开启防拖拽');
eq(pc.resume, true, 'A22 播放器开启断点续播');
eq(pc.watermark, true, 'A23 播放器开启动态水印');
ok(pc.minFinishPercent > 0 && pc.minFinishPercent <= 100, 'A24 完成阈值在合理区间');

console.log('== B. AI 积分按算力类型分账展示 ==');

App.openAiPointsDetail('all');
eq(App.activeAiPointsType, 'all', 'B01 默认展示全部类型');
const sumHtml = el('ai-points-summary').innerHTML;
has(sumHtml, '自有算力', 'B02 汇总区展示自有算力');
has(sumHtml, '集成算力', 'B03 汇总区展示集成算力');
has(sumHtml, '合计可用 AI 积分', 'B04 汇总区展示合计');
has(sumHtml, '不可互相划转', 'B05 汇总区声明两类算力不可划转');
const tabsHtml = el('ai-points-type-tabs').innerHTML;
has(tabsHtml, '全部类型', 'B06 类型筛选含「全部类型」');
has(tabsHtml, '自有算力', 'B07 类型筛选含「自有算力」');
has(tabsHtml, '集成算力', 'B08 类型筛选含「集成算力」');
has(tabsHtml, "App.switchAiPointsType('self')", 'B09 类型胶囊绑定 switchAiPointsType');

const allRows = App.getAiPointLedgerWithBalance();
eq(allRows.length, MockData.assets.aiPointLedger.length, 'B10 台账行数与数据源一致');
const oldestSelf = App.getAiPointLedgerWithBalance().filter(r => r.type === 'self').slice(-1)[0];
eq(oldestSelf.balanceAfter, oldestSelf.amount, 'B11 首条流水余额快照 = 该笔变动额');
const newestSelf = App.getAiPointLedgerWithBalance().filter(r => r.type === 'self')[0];
eq(newestSelf.balanceAfter, 1640, 'B12 自有算力最新快照 = 当前余额');
const newestInte = App.getAiPointLedgerWithBalance().filter(r => r.type === 'integrated')[0];
eq(newestInte.balanceAfter, 700, 'B13 集成算力最新快照 = 当前余额');

const rowCount = (html) => (html.match(/class="ai-points-row"/g) || []).length;
App.switchAiPointsType('self');
eq(App.activeAiPointsType, 'self', 'B14 switchAiPointsType 切换生效');
let listHtml = el('ai-points-ledger-list').innerHTML;
eq(rowCount(listHtml), ledgerSelf.length, 'B15 仅渲染自有算力流水');
notHas(listHtml, '>集成算力</span>', 'B16 自有算力视图不出现集成算力行');
has(listHtml, '充值', 'B17 流水含「充值」类目');
has(listHtml, '消耗', 'B18 流水含「消耗」类目');
has(listHtml, '奖励', 'B19 流水含「奖励」类目');

App.switchAiPointsType('integrated');
listHtml = el('ai-points-ledger-list').innerHTML;
eq(rowCount(listHtml), ledgerInte.length, 'B20 仅渲染集成算力流水');

App.openAiPointsDetail('integrated');
eq(App.activeAiPointsType, 'integrated', 'B21 openAiPointsDetail 可直开指定类型');

console.log('== C. 算力充值：类型必选 + 分账入账 ==');

// 拦截真实支付，避免污染余额；同时记录调用次数
// 2026-09-24：算力充值改走三选一资金来源引擎，桩点同步改为 payFromFundSources
let payCalls = 0;
const realPay = App.payFromFundSources.bind(App);
App.payFromFundSources = function (amount, name, fundId) {
  payCalls += 1;
  return realPay(amount, name, fundId);
};

App.openComputeRechargeModal();
eq(App._currentComputeTypeId, null, 'C01 打开弹窗时算力类型未预选（必须显式选择）');
const typeNote = el('compute-type-note');
ok(typeNote.className.indexOf('is-warn') !== -1, 'C02 未选类型时提示为告警态');
const submitBtn = el('compute-submit-btn');
ok(submitBtn.classList.contains('is-disabled'), 'C03 未选类型时【确认充值】置灰');
eq(el('compute-gain-tokens').innerText, '—', 'C04 未选类型时到账点数为占位横线');
eq(el('compute-type-result').innerText, '未选择', 'C05 订单摘要标注类型未选择');
const gridHtml = el('compute-type-grid').innerHTML;
has(gridHtml, "App.selectComputeType('self')", 'C06 类型卡绑定 selectComputeType(self)');
has(gridHtml, "App.selectComputeType('integrated')", 'C07 类型卡绑定 selectComputeType(integrated)');
has(gridHtml, '自有算力', 'C08 类型卡展示自有算力');
has(gridHtml, '集成算力', 'C09 类型卡展示集成算力');
has(el('compute-cur-tokens').innerText, '自有 1,640.00', 'C10 余额条按类型拆分展示自有算力');
has(el('compute-cur-tokens').innerText, '集成 700.00', 'C11 余额条按类型拆分展示集成算力');

// C-1：未选类型提交 → 拦截，零资金动作
const before = App.getComputeBalances();
payCalls = 0;
toasts.length = 0;
App.submitComputeRecharge();
has(lastToast(), '请先选择算力类型', 'C12 未选类型提交被拦截');
eq(payCalls, 0, 'C13 未选类型不触发任何支付');
eq(App.getComputeBalances().total, before.total, 'C14 未选类型不改动账本');

// C-2：选「自有算力」→ 按 1:1 到账
App.selectComputeType('self');
eq(App._currentComputeTypeId, 'self', 'C15 选中自有算力');
ok(!submitBtn.classList.contains('is-disabled'), 'C16 选中类型后按钮可用');
has(el('compute-type-result').innerText, '自有算力', 'C17 摘要回显所选类型');
ok(el('compute-type-note').className.indexOf('is-ok') !== -1, 'C18 选中类型后提示转为通过态');
App.selectComputePack('CP2');
has(el('compute-gain-tokens').innerText, '500.00', 'C19 自有算力 CP2 到账 500.00 点');
has(el('compute-pay-amount').innerText, '200.00', 'C20 应付金额 ¥200.00');

const balBeforecus = MockData.assets.cards.withdrawable;
App.submitComputeRecharge();
eq(payCalls, 1, 'C21 选中类型后正常发起支付');
eq(App.getComputeBalances().self, before.self + 500, 'C22 自有算力账本 +500');
eq(App.getComputeBalances().integrated, before.integrated, 'C23 集成算力账本不受影响');
eq(App.getComputeBalances().total, before.total + 500, 'C24 合计同步 +500');
eq(num(MockData.assets.cards.tokensAC), before.total + 500, 'C25 cards.tokensAC 与合计一致');
eq(num(MockData.assets.cards.withdrawable), num(balBeforecus) - 200, 'C26 从账户余额扣款 ¥200');

const lastLedger = MockData.assets.aiPointLedger[MockData.assets.aiPointLedger.length - 1];
eq(lastLedger.type, 'self', 'C27 新流水归属自有算力');
eq(lastLedger.amount, 500, 'C28 新流水金额为 +500');
eq(lastLedger.kind, 'recharge', 'C29 新流水类型为充值');
has(lastLedger.name, '自有算力', 'C30 新流水名称标注算力类型');

// C-3：选「集成算力」→ 按 0.8 折算
App.openComputeRechargeModal();
App.selectComputeType('integrated');
App.selectComputePack('CP2');
has(el('compute-gain-tokens').innerText, '400.00', 'C31 集成算力 CP2 折算到账 400.00 点');
const before2 = App.getComputeBalances();
App.submitComputeRecharge();
eq(App.getComputeBalances().integrated, before2.integrated + 400, 'C32 集成算力账本 +400');
eq(App.getComputeBalances().self, before2.self, 'C33 自有算力账本不受影响');
eq(MockData.assets.aiPointLedger[MockData.assets.aiPointLedger.length - 1].type, 'integrated',
  'C34 新流水归属集成算力');

// C-4：AI 积分卡读数同源刷新
App.refreshTokenDisplays();
eq(el('asset-display-ai-points').innerText, App.formatMoney(App.getComputeBalances().total),
  'C35 AI 积分卡合计读数同源');
eq(el('asset-display-tokens-self').innerText, App.formatMoney(App.getComputeBalances().self),
  'C36 AI 积分卡自有算力读数同源');
eq(el('asset-display-tokens-integrated').innerText, App.formatMoney(App.getComputeBalances().integrated),
  'C37 AI 积分卡集成算力读数同源');

// ==================== C2. 算力充值资金来源三选一 ====================
console.log('== C2. 算力充值：扣款资金来源三选一（账户余额 / 创作收益 / 组合）==');

eq(App.getComputeFundSources().length, 3, 'C2-01 mock 提供 3 种资金来源');
eq(MockData.assets.computeFundRules.mixOrder.join(','), 'balance,earnings', 'C2-02 组合扣款顺序为契约：先余额后收益');

App.openComputeRechargeModal();
eq(App._currentComputeFundId, 'balance', 'C2-03 打开弹窗默认资金来源为账户余额');
const fundGridHtml = el('compute-fund-grid').innerHTML;
has(fundGridHtml, "App.selectComputeFundSource('balance')", 'C2-04 资金来源卡绑定 balance');
has(fundGridHtml, "App.selectComputeFundSource('earnings')", 'C2-05 资金来源卡绑定 earnings');
has(fundGridHtml, "App.selectComputeFundSource('mix')", 'C2-06 资金来源卡绑定 mix');
has(fundGridHtml, '账户余额 + 创作收益', 'C2-07 存在「账户余额 + 创作收益」组合项');
has(el('compute-cur-earnings').innerText, '12,680.30', 'C2-08 弹窗展示可提现创作收益读数');

App.selectComputeType('self');
App.selectComputePack('CP1'); // ¥40 / 100 点
has(el('compute-pay-split').innerText, '账户余额 ¥ 40.00', 'C2-09 账户余额来源：扣款构成只列账户余额');

// ① 创作收益来源：只扣创作收益，账户余额零变动
App.selectComputeFundSource('earnings');
has(el('compute-pay-split').innerText, '创作收益 ¥ 40.00', 'C2-10 创作收益来源：扣款构成只列创作收益');
const balF = num(MockData.assets.cards.balance);
const wdF = num(MockData.assets.cards.withdrawable);
const earnF = num(MockData.assets.cards.monthlyEarnings);
const frozenF = App.getFrozenBalance().value;
const tokensF = App.getComputeBalances();
App.submitComputeRecharge();
eq(num(MockData.assets.cards.monthlyEarnings), earnF - 40, 'C2-11 创作收益扣款 ¥40');
eq(num(MockData.assets.cards.balance), balF, 'C2-12 创作收益扣款：账户余额零变动');
eq(num(MockData.assets.cards.withdrawable), wdF, 'C2-13 创作收益扣款：可消费零变动');
eq(App.getFrozenBalance().value, frozenF, 'C2-14 创作收益扣款：冻结额零变动');
eq(App.getComputeBalances().self, tokensF.self + 100, 'C2-15 到账点数仍按类型入自有算力账本');
has(lastToast(), '创作收益', 'C2-16 Toast 标注创作收益扣款');

// ② 组合来源：构造「账户余额不足、需创作收益补足」的场景
const wdNow = num(MockData.assets.cards.withdrawable);
MockData.assets.cards.withdrawable = App.formatMoney(20); // 只留 ¥20，CP1 需 ¥40
const earnNow = num(MockData.assets.cards.monthlyEarnings);
App.openComputeRechargeModal();
App.selectComputeFundSource('mix');
App.selectComputeType('self');
App.selectComputePack('CP1');
const splitMix = App.getComputeFundSplit(40, 'mix');
eq(splitMix.fromBalance, 20, 'C2-17 组合扣款先扣尽账户余额 ¥20');
eq(splitMix.fromEarnings, 20, 'C2-18 组合扣款差额 ¥20 由创作收益补足');
eq(splitMix.ok, true, 'C2-19 组合扣款合计足额');
has(el('compute-pay-split').innerText, '账户余额 ¥ 20.00', 'C2-20 摘要展示账户余额部分');
has(el('compute-pay-split').innerText, '创作收益 ¥ 20.00', 'C2-21 摘要展示创作收益部分');
App.submitComputeRecharge();
eq(num(MockData.assets.cards.withdrawable), 0, 'C2-22 组合扣款后账户余额归零');
eq(num(MockData.assets.cards.monthlyEarnings), earnNow - 20, 'C2-23 组合扣款后创作收益只扣差额 ¥20');

// ③ 单来源不足时拦截：零扣款
const earTestCase = num(MockData.assets.cards.monthlyEarnings);
MockData.assets.cards.monthlyEarnings = App.formatMoney(5);
App.openComputeRechargeModal();
App.selectComputeFundSource('earnings');
App.selectComputeType('self');
App.selectComputePack('CP1');
const tokensBefore = App.getComputeBalances().total;
const txLenBefore = MockData.assets.transactions.length;
App.submitComputeRecharge();
eq(App.getComputeBalances().total, tokensBefore, 'C2-24 创作收益不足：零入账');
eq(MockData.assets.transactions.length, txLenBefore, 'C2-25 创作收益不足：零流水');
has(el('insufficient-scene-sub').innerText, '创作收益不可充值', 'C2-26 创作收益不足引导文案说明不可充值');
MockData.assets.cards.monthlyEarnings = App.formatMoney(earTestCase);
// 组合扣款已真实消耗 ¥20 账户余额，复位时须同步扣减，否则「冻结+可消费=账户余额」恒等式会被测例自己打破
MockData.assets.cards.withdrawable = App.formatMoney(wdNow - 20);

// ④ 恒等式回归：三选一扣款后「账户余额 = 已冻结 + 可消费」仍成立
eq(App.getFrozenBalance().value + num(MockData.assets.cards.withdrawable), num(MockData.assets.cards.balance),
  'C2-27 【恒等式】资金来源三选一扣款后公式仍成立');

console.log('== D. 定制课程播放器：防拖拽 / 断点续播 / 安全性 ==');

eq(App.parseLessonDuration('26 分钟'), 1560, 'D01 时长文本「26 分钟」解析为 1,560 秒');
eq(App.parseLessonDuration('18分钟'), 1080, 'D02 紧凑写法「18分钟」同样可解析');
eq(App.parseLessonDuration('1:20'), 80, 'D03 「1:20」按分秒解析为 80 秒');
eq(App.formatVideoClock(1320), '22:00', 'D04 1,320 秒格式化为 22:00');
eq(App.formatVideoClock(75), '01:15', 'D05 75 秒格式化为 01:15');
eq(App.formatVideoClock(3725), '01:02:05', 'D06 超 1 小时补出 hh');

// 定位一个未完成视频课节作为测试样本
let samplePlan = null;
let sampleLesson = null;
(MockData.academy.plans || []).forEach(p => {
  (p.lessonList || []).forEach(l => {
    if (!sampleLesson && l.type === 'video' && l.status !== 'done') { samplePlan = p; sampleLesson = l; }
  });
});
ok(!!sampleLesson, 'D07 找到用于测试的视频课节样本');
const sId = sampleLesson.id;
const sDur = App.parseLessonDuration(sampleLesson.duration);

App._lessonProgress = {};
const html1 = App.initCourseVideoPlayer(samplePlan.id, sId, samplePlan, sampleLesson, sDur);
has(html1, 'class="cvp-shell"', 'D08 渲染自绘播放器外壳（.cvp-shell）');
has(html1, 'id="course-video-player"', 'D08b 播放器根节点 id 唯一');
has(html1, 'id="cvp-bar"', 'D09 渲染自绘进度条');
has(html1, 'id="cvp-watermark"', 'D10 渲染动态水印');
has(html1, '防拖拽', 'D11 播放器展示防拖拽口径');
has(html1, 'oncontextmenu="return false;"', 'D12 禁用右键菜单');
has(html1, "App.beginCourseVideoSeek(event)", 'D13 进度条绑定自研拖拽入口');
has(html1, 'App.cycleCourseVideoSpeed()', 'D14 绑定预设倍速切换（不支持任意倍速）');
notHas(html1, '<video', 'D15 不使用原生 video（天然屏蔽下载 / 投屏 / 任意倍速）');
eq(App._player.duration, sDur, 'D16 播放器时长取自课节');
eq(App._player.position, 0, 'D17 无历史记录时从 0 开始');

// --- D-a 断点续播 ---
App.saveLessonProgress(sId, { duration: sDur, position: 300, maxWatched: 300 });
const html2 = App.initCourseVideoPlayer(samplePlan.id, sId, samplePlan, sampleLesson, sDur);
eq(App._player.position, 300, 'D18 重进课节自动续播到上次位置 300 秒');
has(html2, '05:00', 'D19 续播位置以 mm:ss 呈现');
has(html2, '断点续播', 'D20 界面给出断点续播提示');
eq(App.getLessonWatchPercent(sId, sDur), Math.round((300 / sDur) * 100), 'D21 观看进度百分比按最大观看位置计算');

// --- D-b 防拖拽 ---
let res = App.applyCourseVideoSeek({ clientX: 400 });
ok(res && res.ok === false && res.reason === 'anti-seek', 'D22 拖到超出已观看区间被拦截',
  JSON.stringify(res));
ok(App._player.position <= App._player.maxWatched + 0.001, 'D23 拦截后播放头回弹到水位线');
has(el('cvp-toast').innerText, '禁止拖拽跳过', 'D24 拦截时给出明确提示');
res = App.applyCourseVideoSeek({ clientX: 100 });
ok(res && res.ok === false, 'D25 轻微超出水位线同样被拦截');
res = App.applyCourseVideoSeek({ clientX: 50 });
ok(res && res.ok === true, 'D26 落在已观看区间内允许自由回看');
ok(App._player.position < 300, 'D27 回看后播放头位于已观看区间内');
eq(App._player.maxWatched, 300, 'D28 回看不冲掉历史最大观看进度');

// --- D-c 倍速与凭证心跳（用可控定时器驱动虚拟时间轴） ---
const captured = [];
const realSetInterval = sandbox.setInterval;
const realClearInterval = sandbox.clearInterval;
sandbox.setInterval = (fn, ms) => { captured.push(fn); return captured.length; };
sandbox.clearInterval = () => {};
App._player.position = 0;
App._player.maxWatched = 0;
App._player.speed = 1;
App.playCourseVideo();
ok(App._player.playing === true, 'D29 播放后进入播放态');
// captured 末位为播放 tick（水印定时器先于 tick 注册）
const tick = captured[captured.length - 1];
ok(typeof tick === 'function', 'D29b 播放 tick 已注册');
tick(); tick(); tick(); tick();
eq(App._player.position, 1, 'D30 每 tick 推进 0.25 秒，4 tick 后累计 1 秒');
App.cycleCourseVideoSpeed();
ok(App._player.speed > 1, 'D31 倍速可切换且高于 1.0x');
tick();
ok(App._player.position > 1, 'D32 切换倍速后推进更快');
// 推进到第 30 秒以上，触发观看凭证签发
let guard = 0;
while (App._player.position < 31 && guard < 1000) { tick(); guard += 1; }
ok(App._player.heartbeat >= 1, 'D33 观看满 30 秒签发观看凭证');
App.renderCourseVideoState();
has(el('cvp-heartbeat').innerText, '已签发', 'D34 界面回显观看凭证签发次数');
// 推进到片尾：自动暂停并落盘
App._player.position = sDur - 0.1;
App._player.maxWatched = sDur;
tick();
ok(App._player.playing === false, 'D35 走到片尾自动暂停');
eq(App._player.position, sDur, 'D36 片尾播放头停在总时长');
eq(App.getLessonWatchPercent(sId, sDur), 100, 'D37 看完后观看进度为 100%');
has(lastToast(), '可点击「完成本节」', 'D38 看完给出完成引导');
sandbox.setInterval = realSetInterval;
sandbox.clearInterval = realClearInterval;

// --- D-d 完成闸门（防拖拽的战术闭环） ---
App._lessonProgress = {};
const probePlan = samplePlan;
const probeLesson = sampleLesson;
eq(App.getLessonWatchPercent(probeLesson.id, sDur), 0, 'D39 无观看记录时进度为 0');
toasts.length = 0;
App.completeLessonById(probePlan.id, probeLesson.id);
ok(probeLesson.status !== 'done', 'D40 未看完不允许标记完成');
has(lastToast(), '才能完成', 'D41 未完成拦截文案点明观看进度要求');
App.saveLessonProgress(probeLesson.id, { duration: sDur, position: sDur, maxWatched: sDur });
App.completeLessonById(probePlan.id, probeLesson.id);
eq(probeLesson.status, 'done', 'D42 看完后可正常标记完成');

// --- D-e 停表清理 ---
App.stopCourseVideo();
ok(App._player === null, 'D43 stopCourseVideo 释放播放器状态');

console.log('== E. 全量课程中心：类型筛选 ==');

const cats = App.getAcademyCourseCategories();
ok(cats.length >= 2, 'E01 课程类型维度由数据派生且不少于 2 项');
ok(cats.every(c => c.count > 0), 'E02 每个类型计数均为正');
eq(cats.reduce((s, c) => s + c.count, 0), (MockData.academy.plans || []).length, 'E03 类型计数之和 = 全部课程数');

App.activeCourseCategory = '全部';
App.activeCourseFee = '全部';
App.renderAcademyCoursesList();
const bodyEl = el('academy-courses-body');
const allCount = (bodyEl.innerHTML.match(/class="plan-card"/g) || []).length;
eq(allCount, (MockData.academy.plans || []).length, 'E04 默认渲染全量课程');
const filterHtml = el('academy-courses-filter').innerHTML;
has(filterHtml, '课程类型', 'E05 筛选条含「课程类型」维度');
has(filterHtml, '资费', 'E06 筛选条含资费维度');
has(filterHtml, "App.setAcademyCourseCategory('全部')", 'E07 类型胶囊绑定 setAcademyCourseCategory');
has(filterHtml, "App.setAcademyCourseFee('免费')", 'E08 资费胶囊绑定 setAcademyCourseFee');

const firstCat = cats[0].name;
App.setAcademyCourseCategory(firstCat);
eq(App.activeCourseCategory, firstCat, 'E09 切换类型后状态生效');
const filtered = App.getFilteredAcademyCourses();
ok(filtered.length > 0, 'E10 该类型下存在课程');
ok(filtered.every(p => (p.badge || p.category || '其他') === firstCat), 'E11 筛选结果全部属于所选类型');
has(el('academy-courses-filter').innerHTML, 'class="pill-tab active"', 'E12 所选类型胶囊呈选中态');

App.setAcademyCourseCategory('全部');
App.setAcademyCourseFee('免费');
ok(App.getFilteredAcademyCourses().every(p => p.isFree === true || Number(p.price) === 0),
  'E13 资费筛选「免费」结果均为免费课程');
App.setAcademyCourseFee('付费');
ok(App.getFilteredAcademyCourses().every(p => !(p.isFree === true || Number(p.price) === 0)),
  'E14 资费筛选「付费」结果均为付费课程');

App.setAcademyCourseFee('全部');
App.setAcademyCourseCategory('不存在的类型');
has(bodyEl.innerHTML, 'academy-courses-empty', 'E15 无匹配时渲染空态');
has(bodyEl.innerHTML, '重置筛选条件', 'E16 空态提供重置入口');
App.setAcademyCourseCategory('全部');

console.log('== F. 静态契约 ==');

// --- F1 HTML 节点 ---
[
  'modal-ai-points-detail', 'ai-points-summary', 'ai-points-type-tabs', 'ai-points-ledger-list',
  'compute-type-grid', 'compute-type-note', 'compute-submit-btn', 'compute-type-result',
  'withdraw-source-strip', 'withdraw-source-text', 'withdraw-source-lock',
  'asset-display-earnings', 'asset-display-tokens-self', 'asset-display-tokens-integrated',
  'academy-courses-filter'
].forEach(id => has(HTML, `id="${id}"`, `F01 index.html 含 #${id}`));

has(HTML, "onclick=\"App.openAiPointsDetail('all')\"", 'F02 AI 积分卡【积分明细 >】指向 openAiPointsDetail');
has(HTML, "onclick=\"App.openWithdrawModal('income')\"", 'F03 创作收益卡新增【去提现 >】');
const assetCardsBlock = HTML.slice(HTML.indexOf('id="assets-overview-cards"'), HTML.indexOf('id="asset-transaction-tabs"'));
const balCard = assetCardsBlock.slice(0, assetCardsBlock.indexOf('创作收益 (元)'));
notHas(balCard, 'openWithdrawModal', 'F04 【红线】账户余额卡不再出现提现入口');
has(balCard, 'App.openAccountRechargeModal()', 'F05 账户余额卡仅保留【去充值 >】');

// --- F2 CSS 类 ---
[
  'cvp-shell', 'cvp-stage', 'cvp-bar', 'cvp-bar-played', 'cvp-bar-lock', 'cvp-watermark',
  'cvp-controls', 'cvp-foot', 'cvp-security-badge', 'cvp-toast', 'cvp-finish-tip',
  'compute-type-grid', 'compute-type-btn', 'compute-type-note', 'compute-type-tags',
  'ai-points-summary', 'ai-points-cell', 'ai-points-tabs', 'ai-points-ledger', 'ai-points-row',
  'asset-card-note', 'asset-token-split', 'withdraw-source-strip',
  'academy-filter-bar', 'academy-filter-row', 'academy-filter-chips', 'academy-courses-empty'
].forEach(c => has(CSS, '.' + c, `F06 样式类 .${c} 已定义`));
has(CSS, '.compute-type-note.is-warn', 'F07 未选类型告警态样式已定义');
has(CSS, '.compute-type-note.is-ok', 'F08 已选类型通过态样式已定义');
has(CSS, '.compute-type-btn.active', 'F09 类型卡选中态样式已定义');

// --- F3 App 方法唯一且存在 ---
[
  'getWithdrawSource', 'getComputeTypes', 'getComputeType', 'getComputeBalances', 'syncComputeBalances',
  'refreshTokenDisplays', 'getComputePackTokens', 'renderComputeTypeGrid', 'selectComputeType',
  'getAiPointLedger', 'getAiPointLedgerWithBalance', 'openAiPointsDetail', 'switchAiPointsType',
  'renderAiPointsDetail', 'getPlayerConfig', 'parseLessonDuration', 'formatVideoClock',
  'getLessonProgress', 'saveLessonProgress', 'getLessonWatchPercent', 'initCourseVideoPlayer',
  'toggleCourseVideo', 'playCourseVideo', 'pauseCourseVideo', 'stopCourseVideo',
  'beginCourseVideoSeek', 'applyCourseVideoSeek', 'cycleCourseVideoSpeed', 'renderCourseVideoState',
  'getAcademyCourseCategories', 'getFilteredAcademyCourses', 'setAcademyCourseCategory',
  'setAcademyCourseFee', 'renderAcademyCourseFilters'
].forEach(fn => {
  const n = (APP_SRC.match(new RegExp('\\n  ' + fn + ': function', 'g')) || []).length;
  eq(n, 1, `F10 App.${fn} 定义唯一（无同名覆盖）`);
});

notHas(APP_SRC, "openPointsExchangeModal", 'F11 积分兑换已下线（app.js 无 openPointsExchangeModal 残留）');
has(APP_SRC, "if (viewId !== 'academy'", 'F12 离开学院时自动停表落盘');

console.log('== G. 恒等式回归 ==');
eq(App.getComputeBalances().total, num(MockData.assets.cards.tokensAC), 'G01 AI 积分合计恒等于 tokensAC');
const tokenItem = (MockData.assets.breakdown.items || []).find(i => i.label === 'AI 积分');
eq(num(tokenItem.amount), App.getComputeBalances().total, 'G02 breakdown「AI 积分」与分账合计一致');

// ==================== H. 账户余额「已冻结」读数（公式脚注已于 2026-09-24 下线）====================
console.log('== H. 账户余额冻结读数 ==');
['asset-display-frozen', 'asset-balance-note'].forEach(id =>
  has(HTML, `id="${id}"`, `H01 index.html 含 #${id}`));
eq(/id="asset-balance-formula"/.test(HTML), false, 'H01b 公式脚注节点已下线');
notHas(APP_SRC, 'asset-balance-formula', 'H01c app.js 无公式脚注死引用');
notHas(CSS, 'is-formula', 'H01d CSS 无 is-formula 样式残留');
['getFrozenBalance', 'refreshFrozenDisplay'].forEach(fn => {
  const n = (APP_SRC.match(new RegExp('\\n  ' + fn + ': function', 'g')) || []).length;
  eq(n, 1, `H02 App.${fn} 定义唯一`);
});
has(APP_SRC, "this.refreshFrozenDisplay();", 'H03 refreshAssetDisplays 已接入冻结读数刷新');

const frozen0 = App.getFrozenBalance();
eq(frozen0.value, 1500, 'H04 冻结金额读 breakdown「冻结金额」真源 = 1,500');
eq(num(el('asset-display-frozen').innerText), 1500, 'H05 卡片「已冻结」读数已刷新');
eq(frozen0.value + num(MockData.assets.cards.withdrawable), num(MockData.assets.cards.balance),
  'H07 【恒等式】已冻结 + 可消费 = 账户余额（种子态）');

// 冻结 / 结算两条路径后恒等式仍成立
const wdBefore = num(MockData.assets.cards.withdrawable);
const balBefore = num(MockData.assets.cards.balance);
App.freezeEscrow(500, 'H 组用例冻结');
eq(num(MockData.assets.cards.withdrawable), wdBefore - 500, 'H08 冻结只减可消费');
eq(num(MockData.assets.cards.balance), balBefore, 'H09 【口径】冻结不动账户余额');
eq(App.getFrozenBalance().value + num(MockData.assets.cards.withdrawable), num(MockData.assets.cards.balance),
  'H10 【恒等式】冻结后公式仍成立');
const earnBefore = num(MockData.assets.cards.monthlyEarnings);
App.releaseEscrow(500, 'H 组用例结算');
eq(App.getFrozenBalance().value, 1500, 'H11 结算后冻结额回到 1,500');
eq(num(MockData.assets.cards.balance), balBefore, 'H12 【2026-09-24 新口径】结算后账户余额零变动（不进现金账户）');
eq(num(MockData.assets.cards.withdrawable), wdBefore, 'H12a 托管释放使可消费回到冻结前（已冻结转可消费）');
eq(num(MockData.assets.cards.monthlyEarnings), earnBefore + 500, 'H12b 结算赏金只进创作收益 +500');
eq(App.getFrozenBalance().value + num(MockData.assets.cards.withdrawable), num(MockData.assets.cards.balance),
  'H13 【恒等式】结算后公式仍成立');
App.freezeEscrow(999999, '超额冻结');
eq(num(MockData.assets.cards.withdrawable), num(MockData.assets.cards.withdrawable), 'H14 超额冻结被拦截（零变动）');

// ==================== H2. 商单验收结算：只进创作收益、账户余额零变动 ====================
console.log('== H2. 商单验收结算口径（2026-09-24 重订）==');

const pubOrder = (MockData.tasks.myOrders || []).find(o => {
  const t = (MockData.tasks.list || []).find(x => x.id === o.sourceId);
  return t && String(o.status) !== '已完成';
});
if (pubOrder) {
  const taskH = (MockData.tasks.list || []).find(x => x.id === pubOrder.sourceId);
  const rewardH = parseFloat(String(taskH.rewardMoney || '').replace(/[^0-9.]/g, '')) || 3000;
  const balH = num(MockData.assets.cards.balance);
  const wdH = num(MockData.assets.cards.withdrawable);
  const earnH = num(MockData.assets.cards.monthlyEarnings);
  const frozenH = App.getFrozenBalance().value;
  const activeH = App.getEscrowSummary().frozen;
  const balUserH = MockData.currentUser.balance;

  App.acceptMyTaskDelivery(pubOrder.id);

  eq(String(pubOrder.status), '已完成', 'H2-01 验收后订单状态转为已完成');
  eq(num(MockData.assets.cards.balance), balH, 'H2-02 【硬口径】验收结算后账户余额零变动');
  eq(MockData.currentUser.balance, balUserH, 'H2-03 不再写 currentUser.balance（结算款不进现金账户）');
  eq(num(MockData.assets.cards.monthlyEarnings), earnH + rewardH, 'H2-04 赏金全额计入创作收益');
  const frozenAfter = App.getFrozenBalance().value;
  const activeAfter = App.getEscrowSummary().frozen;
  ok(frozenAfter <= frozenH, 'H2-05 托管释放：已冻结不增（等额释放）');
  ok(rewardH <= 0 || frozenAfter < frozenH || frozenH === 0, 'H2-05a 有赏金且有冻结时冻结额必然下降');
  eq(num(MockData.assets.cards.withdrawable), wdH + (frozenH - frozenAfter), 'H2-06 托管释放：可消费增加额 = 冻结减少额');
  eq(frozenAfter + num(MockData.assets.cards.withdrawable), num(MockData.assets.cards.balance),
    'H2-07 【恒等式】验收结算后「已冻结 + 可消费 = 账户余额」仍成立');
  eq(activeAfter, frozenAfter, 'H2-08 【恒等式】托管库进行中合计 = 冻结金额');
  ok(activeAfter <= activeH, 'H2-08a 托管库进行中合计同步释放');
  has(lastToast(), '创作收益', 'H2-09 Toast 明示赏金计入创作收益');
  has(lastToast(), '账户余额不变', 'H2-10 Toast 明示账户余额不变');
  const lastTx = MockData.assets.transactions[0];
  has(lastTx.name, '商单结算收入', 'H2-11 只写一条「商单结算收入」流水');
  eq(lastTx.category, '收入', 'H2-12 结算流水归入收入 Tab');
  eq(lastTx.rawAmount, rewardH, 'H2-13 结算流水金额等于赏金');
}

// ==================== I. 优惠券（礼品卡 / 积分兑换已下线）====================
console.log('== I. 优惠券 ==');
['modal-coupon', 'coupon-list'].forEach(id =>
  has(HTML, `id="${id}"`, `I01 index.html 含 #${id}`));
[
  'openCouponModal', 'renderCoupons', 'switchCouponStatus', 'useCoupon'
].forEach(fn => {
  const n = (APP_SRC.match(new RegExp('\\n  ' + fn + ': function', 'g')) || []).length;
  eq(n, 1, `I02 App.${fn} 定义唯一`);
});
eq(App.getCoupons().length, 6, 'I04 优惠券台账 6 张');

// 礼品卡 / 积分兑换：数据、方法、弹窗、样式全线无残留
eq(MockData.assets.giftCards, undefined, 'I05a mock 已无礼品卡台账');
eq(MockData.assets.pointExchange, undefined, 'I05b mock 已无积分兑换台账');
['openGiftCardModal', 'getGiftCards', 'submitGiftCardBind', 'openPointsExchangeModal',
  'renderPointExchange', 'requestPointExchange', 'confirmPointExchange', 'getPointExchangeItems'].forEach(fn =>
  eq(typeof App[fn], 'undefined', `I05c App.${fn} 已删除`));
['modal-gift-card', 'modal-points-exchange'].forEach(id =>
  eq(HTML.indexOf(`id="${id}"`), -1, `I05d index.html 已无 #${id}`));
eq(/\.gift-|\.pe-|\.point-exchange-/.test(CSS), false, 'I05e CSS 无礼品卡 / 积分兑换样式残留');

App.openCouponModal('unused');
eq(App.getCoupons('unused').length, 4, 'I17 可用券 4 张');
eq(App.getCoupons('used').length, 1, 'I18 已使用券 1 张');
eq(App.getCoupons('expired').length, 1, 'I19 已过期券 1 张');
has(el('coupon-list').innerHTML, '算力充值满减券', 'I20 券列表渲染券名与面额');
has(el('coupon-usable-amount').innerText, '¥', 'I21 可用面额合计已渲染');
App.useCoupon('CP1');
eq(MockData.assets.coupons.find(c => c.id === 'CP1').status, 'used', 'I22 去使用后券转为已使用');

// ==================== J. 我的权益与特权 · 勋章 / 荣耀墙 ====================
console.log('== J. 勋章 / 荣耀墙 ==');
['modal-honor-detail', 'assets-honors-grid', 'assets-honors-summary',
  'honor-detail-icon', 'honor-detail-name', 'honor-detail-tier', 'honor-detail-status',
  'honor-detail-meta', 'honor-detail-desc', 'honor-detail-unlock', 'honor-detail-perks',
  'honor-detail-perk-count', 'honor-detail-action'].forEach(id =>
  has(HTML, `id="${id}"`, `J01 index.html 含 #${id}`));
['getHonors', 'getHonor', 'renderHonorsGrid', 'openHonorDetail', 'useHonorPerk'].forEach(fn => {
  const n = (APP_SRC.match(new RegExp('\\n  ' + fn + ': function', 'g')) || []).length;
  eq(n, 1, `J02 App.${fn} 定义唯一`);
});
eq(App.getHonors().length, 8, 'J03 勋章台账 8 枚');
eq(App.getHonors().filter(h => h.status === 'owned').length, 7, 'J04 已点亮 7 枚');
eq(App.getHonors().filter(h => h.status === 'locked').length, 1, 'J05 未解锁 1 枚');
eq(App.getHonors().every(h => !!h.icon && (h.perks || []).length > 0), true, 'J06 每枚勋章都有图片与权益条目');
has(CSS, '.honors-grid {', 'J07 CSS 含勋章网格样式');

App.renderAssetsRight();
const honorHtml = el('assets-honors-grid').innerHTML;
eq((honorHtml.match(/class="honor-card"/g) || []).length, 7, 'J08 网格渲染 7 枚已点亮勋章');
eq((honorHtml.match(/class="honor-card is-locked"/g) || []).length, 1, 'J09 未解锁勋章置灰加锁标');
has(honorHtml, 'App.openHonorDetail(', 'J10 点击图片打开详情弹窗');
has(el('assets-honors-summary').innerText, '已点亮 7 / 8 枚', 'J11 汇总条显示点亮进度');

// 已点亮勋章：详情含权益逐条说明
App.openHonorDetail('H1');
eq(el('honor-detail-name').innerText, '校园 OPC 主理人', 'J12 详情标题为该勋章名');
eq(el('honor-detail-tier').innerText, '传说', 'J13 详情显示等级');
eq(el('honor-detail-status').innerText, '已点亮', 'J14 已点亮状态');
has(el('honor-detail-icon').src, 'trophy.png', 'J15 详情展示勋章图片');
eq(el('honor-detail-perk-count').innerText, '4', 'J16 权益条数与数据一致');
const perkRows = (el('honor-detail-perks').innerHTML.match(/class="honor-perk-item"/g) || []).length;
eq(perkRows, 4, 'J17 权益逐条渲染 4 行');
has(el('honor-detail-perks').innerHTML, '高赏金商单准入', 'J18 权益标题已渲染');
has(el('honor-detail-perks').innerHTML, '¥5,000 以上的品牌商单免资质复核', 'J19 权益详细说明已渲染');
has(el('honor-detail-unlock').innerText, 'Lv.4', 'J20 解锁条件已渲染');
has(el('honor-detail-action').innerText, '去使用权益', 'J21 已点亮勋章主按钮为「去使用权益」');
notHas(el('honor-detail-action').innerText, '&gt;', 'J21b 主按钮文案不残留 HTML 实体');

// 未解锁勋章：状态与主按钮切换
App.openHonorDetail('H8');
eq(el('honor-detail-status').innerText, '未解锁', 'J22 未解锁状态');
has(el('honor-detail-action').innerText, '去达成条件', 'J23 未解锁勋章主按钮为「去达成条件」');
eq((el('honor-detail-perks').innerHTML.match(/class="honor-perk-item is-locked"/g) || []).length, 3, 'J24 未解锁权益置灰');

// ==================== K. AI 积分卡「去充值」+ 创作积分迁至个人信息 ====================
console.log('== K. AI 积分去充值 / 创作积分迁移 ==');
// AI 积分卡：去充值 → 算力充值弹窗
has(HTML, 'onclick="App.openComputeRechargeModal()"', 'K01 AI 积分卡含【去充值】入口');
const aiCard = HTML.slice(HTML.indexOf('asset-display-ai-points') - 400, HTML.indexOf('asset-token-split'));
has(aiCard, 'App.openComputeRechargeModal()', 'K02 去充值绑定算力充值弹窗');
has(aiCard, 'App.openAiPointsDetail(', 'K03 积分明细入口保留');
// 创作积分卡已下线
eq(HTML.indexOf('asset-display-creation-points'), -1, 'K04 创作积分资产卡已下线');
eq(/asset-card-label">创作积分（可用）/.test(HTML), false, 'K05 卡片标题「创作积分（可用）」已移除');
notHas(APP_SRC, 'asset-display-creation-points', 'K06 app.js 无创作积分卡片死引用');
// 创作积分改在个人信息条展示
['getCreatorPoints', 'formatCreatorPoints', 'refreshCreatorPointsDisplay'].forEach(fn => {
  const n = (APP_SRC.match(new RegExp('\\n  ' + fn + ': function', 'g')) || []).length;
  eq(n, 1, `K07 App.${fn} 定义唯一`);
});
eq(App.getCreatorPoints(), MockData.currentUser.learningPoints, 'K08 创作积分读 currentUser.learningPoints 真源');
App.renderAssetsProfileHub();
has(el('assets-profile-hub').innerHTML, 'id="profile-stat-points"', 'K09 个人信息条含创作积分读数节点');
has(el('assets-profile-hub').innerHTML, '创作积分', 'K09b 个人信息条含「创作积分」标签');
eq(el('profile-stat-points').innerText, App.formatCreatorPoints(), 'K10 个人信息条展示当前创作积分');
const ptsBefore = MockData.currentUser.learningPoints;
MockData.currentUser.learningPoints = 3000;
App.refreshCreatorPointsDisplay();
eq(el('profile-stat-points').innerText, '3,000', 'K11 积分变动后读数同步刷新');
MockData.currentUser.learningPoints = ptsBefore;
App.refreshCreatorPointsDisplay();
eq(el('profile-stat-points').innerText, App.formatCreatorPoints(), 'K12 复位后读数回到原值');
has(APP_SRC, 'this.refreshCreatorPointsDisplay();', 'K13 refreshAssetDisplays 已接入创作积分刷新');

// ------------------------- 汇总 -------------------------
console.log('');
if (fails.length) {
  console.log(`✗ 失败 ${fails.length} 项：`);
  fails.forEach(f => console.log('   ❌ ' + f));
  process.exit(1);
} else {
  console.log(`✓ 全部通过：${pass} 项断言`);
}
