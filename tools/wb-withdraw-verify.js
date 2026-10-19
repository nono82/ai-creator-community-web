#!/usr/bin/env node
/**
 * 申请提现 · 合规四道闸 自检脚本
 * ---------------------------------------------------------------------------
 * 零依赖、离线。用最小 DOM 桩加载 js/mock_data.js + js/app.js，断言：
 *   ① 必须已实名（未实名不允许提现，且引导去实名认证）；
 *   ② 必须同名提现（持卡人 = 实名姓名）；
 *   ③ 单笔上限 ¥10,000；
 *   ④ 只能提现到借记卡（信用卡不可用）；
 *   ⑤ 下拉渲染 / 金额提示 / 提交拦截 / 成功扣款与流水；
 *   ⑥ 静态契约（DOM 节点、入口收敛、方法唯一、样式类齐备）。
 *
 * 用法： node temp/wb-withdraw-verify.js
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
  // className 与 classList 在真实 DOM 中是同一份数据的两种视图，桩必须同步
  get className() { return Array.from(this.classList.set).join(' '); }
  set className(v) { this.classList.set = new Set(String(v == null ? '' : v).split(/\s+/).filter(Boolean)); }
  getAttribute(n) { return this._attrs[n] === undefined ? null : this._attrs[n]; }
  setAttribute(n, v) { this._attrs[n] = v; }
  appendChild(c) { return c; }
  addEventListener() {}
  querySelectorAll() { return []; }
  getContext() { return null; }
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
  body: new El('body')
};

// 提现弹窗内的关键节点必须预先注册（其余按需惰性创建）
[
  'modal-withdraw', 'withdraw-verify-strip', 'withdraw-verify-text', 'withdraw-verify-state',
  'withdraw-rule-row', 'withdraw-account-select', 'withdraw-account-note',
  'withdraw-amount-input', 'withdraw-amount-hint', 'withdraw-submit-btn',
  'asset-display-balance', 'asset-display-withdrawable'
].forEach(id => el(id));

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

// ------------------------- 不合规存量样本注入器 -------------------------
// 生产台账固定 2 张本人同名借记卡（与常用功能「银行卡管理」列表 2 条记录一致）；
// 「信用卡 / 异名卡」两类不合规样本由本脚本临时注入，用于覆盖【闸二 同名】与【闸四 借记卡】
// 的拦截路径 —— 既不污染生产台账，也不影响其余视图。
const LEGACY = {
  credit: {
    id: 'BC3', bank: '中国银行', cardNo: '6227601234596608', tail: '6608',
    cardType: 'credit', cardTypeLabel: '信用卡', holder: '黄*彬',
    branch: '南京城中支行', boundAt: '2024-02-20', isDefault: false
  },
  otherName: {
    id: 'BC4', bank: '招商银行', cardNo: '6225888765403302', tail: '3302',
    cardType: 'debit', cardTypeLabel: '储蓄卡（借记卡）', holder: '李*华',
    branch: '南京新街口支行', boundAt: '2024-02-25', isDefault: false
  }
};
function pushLegacy(...keys) {
  keys.forEach(k => MockData.assets.bankCards.push(Object.assign({}, LEGACY[k])));
}

// Toast 捕获
const toasts = [];
App.showToast = function (msg) { toasts.push(String(msg)); };
let securityOpenedWith = null;
const origOpenSecuritySettings = App.openSecuritySettings.bind(App);
App.openSecuritySettings = function (focusItem) { securityOpenedWith = focusItem; return origOpenSecuritySettings(focusItem); };
App.renderTransactionsTable = function () {};

const num = (s) => parseFloat(String(s == null ? '0' : s).replace(/[,\s¥]/g, '')) || 0;
function lastToast() { return toasts.length ? toasts[toasts.length - 1] : ''; }

// ------------------------- A. 数据层 -------------------------
console.log('== A. 数据层：提现规则与收款卡台账 ==');
const rules = MockData.assets.withdrawRules;
ok(!!rules, 'A01 withdrawRules 存在');
eq(rules.maxPerTx, 10000, 'A02 单笔上限 = ¥10,000');
eq(rules.requireIdVerified, true, 'A03 必须实名开关为 true');
eq(rules.sameNameOnly, true, 'A04 必须同名开关为 true');
eq(rules.debitOnly, true, 'A05 仅限借记卡开关为 true');

// 生产台账基线：固定 2 张本人同名借记卡（对应常用功能「银行卡管理」列表的 2 条记录）
const prodCards = MockData.assets.bankCards || [];
eq(prodCards.length, 2, 'A06 【台账基线】生产台账固定 2 张（与「银行卡管理」列表 2 条一致）');
ok(prodCards.every(c => c.cardType === 'debit' && c.holder === MockData.currentUser.realName),
  'A07 生产台账 2 张均为本人同名借记卡（可用于提现）');

// 注入 2 张不合规样本，覆盖闸二 / 闸四的拦截路径
pushLegacy('credit', 'otherName');
const cards = MockData.assets.bankCards;
eq(cards.length, 4, 'A08 注入 2 张不合规样本后台账 = 4 张（供拦截断言）');
ok(cards.filter(c => c.cardType === 'debit' && c.holder === MockData.currentUser.realName).length >= 2,
  'A09 至少 2 张「同名借记卡」可用于提现');
ok(cards.some(c => c.cardType === 'credit'), 'A10 注入台账含信用卡（用于演示「仅限借记卡」拦截）');
ok(cards.some(c => c.cardType === 'debit' && c.holder !== MockData.currentUser.realName),
  'A11 注入台账含异名借记卡（用于演示「必须同名」拦截）');
ok(!!(MockData.assets && MockData.assets.escrowProjects), 'A12 既有托管台账未被破坏');

// ------------------------- B. 规则口径 -------------------------
console.log('== B. getWithdrawRules() 口径 ==');
const r0 = App.getWithdrawRules();
eq(r0.maxPerTx, 10000, 'B01 返回单笔上限 ¥10,000');
eq(r0.requireIdVerified, true, 'B02 requireIdVerified = true');
eq(r0.sameNameOnly, true, 'B03 sameNameOnly = true');
eq(r0.debitOnly, true, 'B04 debitOnly = true');
has(r0.arrivalNote, '实时到账', 'B05 到账口径包含实时到账说明');

const rulesBackup = MockData.assets.withdrawRules;
delete MockData.assets.withdrawRules;
const rDefault = App.getWithdrawRules();
eq(rDefault.maxPerTx, 10000, 'B06 缺配置时单笔上限回落默认 ¥10,000（安全兜底）');
eq(rDefault.debitOnly, true, 'B07 缺配置时「仅限借记卡」默认开启（安全兜底）');
MockData.assets.withdrawRules = rulesBackup;

// ------------------------- C. 实名前置 -------------------------
console.log('== C. isIdVerified() ==');
eq(App.isIdVerified(), true, 'C01 演示账号初始为已实名');

// ------------------------- D. 四道闸校验 -------------------------
console.log('== D. validateWithdrawAccount() 四道闸 ==');
const vNone = App.validateWithdrawAccount('NOT-EXIST');
eq(vNone.ok, false, 'D01 不存在的卡 → 拒绝');
eq(vNone.card, null, 'D02 拒绝时 card 为 null');

const vOk = App.validateWithdrawAccount('BC1');
eq(vOk.ok, true, 'D03 同名借记卡 BC1 → 通过');
eq(vOk.card.id, 'BC1', 'D04 通过时回带卡对象');
eq(vOk.reason, '', 'D05 通过时无原因文案');

const vCredit = App.validateWithdrawAccount('BC3');
eq(vCredit.ok, false, 'D06 【闸四】信用卡 → 拒绝');
has(vCredit.reason, '借记卡', 'D07 信用卡拒绝原因点明「仅支持提现至银行借记卡」');
has(vCredit.reason, '6608', 'D08 信用卡拒绝原因带卡尾号定位');

const vOther = App.validateWithdrawAccount('BC4');
eq(vOther.ok, false, 'D09 【闸二】异名借记卡 → 拒绝');
has(vOther.reason, '不一致', 'D10 异名拒绝原因点明持卡人与实名不一致');
has(vOther.reason, '李*华', 'D11 异名拒绝原因带持卡人姓名');
has(vOther.reason, MockData.currentUser.realName, 'D12 异名拒绝原因带实名人姓名');

// 未实名时，连同名借记卡也不可用
MockData.currentUser.idVerified = false;
const vUnverified = App.validateWithdrawAccount('BC1');
eq(vUnverified.ok, false, 'D13 【闸一】未实名时同名借记卡也不可用');
has(vUnverified.reason, '实名', 'D14 未实名拒绝原因点明实名认证');
MockData.currentUser.idVerified = true;
eq(App.validateWithdrawAccount('BC1').ok, true, 'D15 恢复实名后同名借记卡重新可用');

// ------------------------- E. 下拉渲染 -------------------------
console.log('== E. renderWithdrawAccounts() 下拉渲染 ==');
const sel = el('withdraw-account-select');
const usableId = App.renderWithdrawAccounts();
const optCount = (sel.innerHTML.match(/<option /g) || []).length;
eq(optCount, cards.length, 'E01 option 数量 = 台账卡数量（不可用卡也展示，让规则可见）');
eq(usableId, 'BC1', 'E02 首张可用卡回落为 BC1');
eq(sel.value, 'BC1', 'E03 默认选中落在首张可用卡');

const optBC1 = (sel.innerHTML.match(/<option value="BC1"[^>]*>[^<]*<\/option>/) || [''])[0];
const optBC3 = (sel.innerHTML.match(/<option value="BC3"[^>]*>[^<]*<\/option>/) || [''])[0];
const optBC4 = (sel.innerHTML.match(/<option value="BC4"[^>]*>[^<]*<\/option>/) || [''])[0];
notHas(optBC1, 'disabled', 'E04 可用卡 BC1 不带 disabled');
notHas(optBC1, '不可用', 'E05 可用卡 BC1 不标不可用原因');
has(optBC3, 'disabled', 'E06 信用卡 BC3 置灰不可选');
has(optBC3, '不可用', 'E07 信用卡 BC3 标注不可用原因');
has(optBC4, 'disabled', 'E08 异名卡 BC4 置灰不可选');
has(optBC4, '不可用', 'E09 异名卡 BC4 标注不可用原因');
notHas(sel.innerHTML, '微信零钱', 'E10 下拉中不再出现「微信零钱」等非银行卡渠道');

// 已选卡可用时不被重置
sel.value = 'BC2';
App.renderWithdrawAccounts();
eq(sel.value, 'BC2', 'E11 已选可用卡在重渲染后保持不变');

// 未实名状态下渲染
MockData.currentUser.idVerified = false;
const usableUnverified = App.renderWithdrawAccounts();
eq(usableUnverified, null, 'E12 未实名时无任何可用卡（回落为 null）');
eq(sel.value, '', 'E13 未实名时下拉无选中项');
MockData.currentUser.idVerified = true;
App.renderWithdrawAccounts();

// ------------------------- F. 金额提示 -------------------------
console.log('== F. onWithdrawAmountInput() 金额实时校验 ==');
const input = el('withdraw-amount-input');
const hint = el('withdraw-amount-hint');
// 提现资金来源已改为「创作收益」：可提现读数 = monthlyEarnings，账户余额只可充值不可提现
const wd0 = App.getWithdrawSource().amount;
const wdLabel = App.getWithdrawSource().label;
ok(wdLabel === '创作收益', 'F00 【资金来源】可提现钱包为「创作收益」');

input.value = '1000';
App.onWithdrawAmountInput();
ok(hint.classList.contains('is-ok'), 'F01 ¥1,000 属于合法区间 → is-ok');
has(hint.innerText, '剩余', 'F02 提示展示提现后剩余金额');
has(hint.innerText, App.formatMoney(wd0 - 1000), 'F03 剩余金额数值正确');
has(hint.innerText, wdLabel, 'F03b 提示点明资金来源为「创作收益」');

input.value = '10001';
App.onWithdrawAmountInput();
ok(hint.classList.contains('is-error'), 'F04 【闸三】¥10,001 超单笔上限 → is-error');
has(hint.innerText, '单笔提现上限', 'F05 超限提示点明单笔上限');
has(hint.innerText, '10,000', 'F06 超限提示给出上限数值');
has(hint.innerText, '拆分', 'F07 超限提示引导拆分多笔');

// 【资金来源不足】演示：单笔上限 ¥10,000 高于创作收益时才会走「超资金来源」分支，
// 故此处临时把创作收益压到 ¥6,000（低于上限），验证该分支后再还原。
const srcKey = App.getWithdrawSource().key;
const srcBackup = MockData.assets.cards[srcKey];
MockData.assets.cards[srcKey] = '6,000.00';
input.value = '6000';
App.onWithdrawAmountInput();
ok(hint.classList.contains('is-ok'), 'F08 金额等于可提现资金来源 → is-ok');
input.value = '7000';
App.onWithdrawAmountInput();
ok(hint.classList.contains('is-error'), 'F09 超出可提现「创作收益」→ is-error');
has(hint.innerText, '超出可提现', 'F10 提示点明超出可提现资金来源');
has(hint.innerText, '不可提现', 'F11 提示重申账户余额不可提现');
MockData.assets.cards[srcKey] = srcBackup;

input.value = '';
App.onWithdrawAmountInput();
ok(!hint.classList.contains('is-error'), 'F12 空输入不报错');
has(hint.innerText, '单笔上限', 'F13 空输入展示规则基线提示');
has(hint.innerText, App.formatMoney(wd0), 'F14 基线提示带当前可提现「创作收益」金额');

input.value = '0';
App.onWithdrawAmountInput();
ok(!hint.classList.contains('is-error'), 'F15 金额 0 不报错');

// ------------------------- G. 提交拦截与放行 -------------------------
console.log('== G. submitWithdraw() 拦截与放行 ==');
const cards0 = { totalWithdrawn: MockData.assets.cards.totalWithdrawn };
const txCount0 = MockData.assets.transactions.length;
const wdBefore = MockData.assets.cards.withdrawable;
const balBefore = MockData.assets.cards.balance;
const frozenBefore = num(balBefore) - num(wdBefore);
eq(frozenBefore, 1500, 'G00 前置：冻结金额 ¥1,500（恒等式基线）');

function resetInput(v) { input.value = String(v); }

// G1 未实名拦截
MockData.currentUser.idVerified = false;
securityOpenedWith = null;
toasts.length = 0;
sel.value = 'BC1';
resetInput(1000);
App.submitWithdraw();
has(lastToast(), '实名认证', 'G01 【闸一】未实名提现被拦截');
has(lastToast(), '不能提现', 'G02 未实名拦截文案明确不允许提现');
eq(securityOpenedWith, '实名认证', 'G03 未实名拦截后引导跳转实名认证');
eq(MockData.assets.cards.withdrawable, wdBefore, 'G04 未实名拦截：可提现余额未变动');
eq(MockData.assets.transactions.length, txCount0, 'G05 未实名拦截：未写入任何流水');
MockData.currentUser.idVerified = true;

// G2 信用卡拦截
toasts.length = 0;
sel.value = 'BC3';
resetInput(1000);
App.submitWithdraw();
has(lastToast(), '借记卡', 'G06 【闸四】提现至信用卡被拦截');
eq(num(MockData.assets.cards.withdrawable), num(wdBefore), 'G07 信用卡拦截：可提现余额未变动');
eq(MockData.assets.transactions.length, txCount0, 'G08 信用卡拦截：未写入流水');

// G3 异名卡拦截
toasts.length = 0;
sel.value = 'BC4';
resetInput(1000);
App.submitWithdraw();
has(lastToast(), '不一致', 'G09 【闸二】提现至异名卡被拦截');
has(lastToast(), '同名', 'G10 异名拦截文案点明必须同名提现');
eq(num(MockData.assets.cards.withdrawable), num(wdBefore), 'G11 异名拦截：可提现余额未变动');
eq(MockData.assets.transactions.length, txCount0, 'G12 异名拦截：未写入流水');

// G4 单笔超限拦截
toasts.length = 0;
sel.value = 'BC1';
resetInput(10001);
App.submitWithdraw();
has(lastToast(), '单笔提现上限', 'G13 【闸三】单笔超 ¥10,000 被拦截');
eq(num(MockData.assets.cards.withdrawable), num(wdBefore), 'G14 超限拦截：可提现余额未变动');
eq(MockData.assets.transactions.length, txCount0, 'G15 超限拦截：未写入流水');

// G5 资金来源不足拦截（同 F 组：临时压低创作收益以触达「未超单笔上限但超资金来源」分支）
toasts.length = 0;
MockData.assets.cards[srcKey] = '6,000.00';
resetInput(7000);
App.submitWithdraw();
has(lastToast(), '超出可提现', 'G16 【闸四】超出可提现「创作收益」被拦截');
has(lastToast(), '不可提现', 'G16b 拦截文案重申账户余额不可提现');
MockData.assets.cards[srcKey] = srcBackup;
eq(MockData.assets.transactions.length, txCount0, 'G17 资金来源不足拦截：未写入流水');

// G6 全部通过 → 只从「创作收益」扣款，账户余额一分不动
toasts.length = 0;
sel.value = 'BC2';
resetInput(1000);
App.submitWithdraw();
eq(num(MockData.assets.cards[srcKey]), num(srcBackup) - 1000, 'G18 四闸全过：「创作收益」扣减 ¥1,000');
eq(num(MockData.assets.cards.balance), num(balBefore), 'G19 【红线】提现不动账户余额 ¥6,820.50');
eq(num(MockData.assets.cards.withdrawable), num(wdBefore), 'G19b 【红线】提现不动可提现余额 ¥5,320.50');
eq(num(MockData.assets.cards.totalWithdrawn), num(cards0.totalWithdrawn) + 1000, 'G19c 累计已提现同步 +¥1,000');
eq(MockData.assets.transactions.length, txCount0 + 1, 'G20 四闸全过：新增 1 条提现流水');

const tx = MockData.assets.transactions[0];
eq(tx.type, '提现', 'G21 流水类型为「提现」');
eq(tx.category, '提现', 'G22 流水分类为「提现」');
eq(tx.status, '处理中', 'G23 流水状态为「处理中」');
eq(tx.rawAmount, -1000, 'G24 流水金额为 -¥1,000');
has(tx.name, '建设银行', 'G25 流水标题带收款行');
has(tx.name, '尾号 5678', 'G26 流水标题带卡尾号定位');
has(tx.name, '借记卡', 'G27 流水标题明确为借记卡');
notHas(tx.name, '微信', 'G28 流水标题不含微信等非银行卡渠道');
has(lastToast(), '建设银行', 'G29 成功 Toast 带收款行');
has(lastToast(), '尾号 5678', 'G30 成功 Toast 带卡尾号');
has(lastToast(), '实名一致', 'G31 成功 Toast 重申同名校验结论');

// G7 恒等式复检
const frozenAfter = num(MockData.assets.cards.balance) - num(MockData.assets.cards.withdrawable);
eq(frozenAfter, 1500, 'G32 【红线】提现后「总额 − 可提现 = 冻结 ¥1,500」恒等成立');
eq(num(MockData.assets.cards.balance) === num(MockData.assets.cards.withdrawable) + 1500, true,
  'G33 【红线】提现不触碰冻结金额');
const availItem = (MockData.assets.breakdown.items || []).find(i => i.label === '可提现余额');
eq(num(availItem.amount), num(MockData.assets.cards.withdrawable), 'G34 资产构成明细「可提现余额」同步更新');
eq(num(el('asset-display-withdrawable').innerText), num(MockData.assets.cards.withdrawable),
  'G35 余额卡片读数同步刷新');
const earnItemG = (MockData.assets.breakdown.items || []).find(i => i.label === '创作收益');
eq(num(earnItemG.amount), num(MockData.assets.cards[srcKey]), 'G36 资产构成明细「创作收益」同步更新');
eq(num(el('asset-display-earnings').innerText), num(MockData.assets.cards[srcKey]),
  'G37 创作收益卡读数同步刷新');

// ------------------------- H. 静态契约 -------------------------
console.log('== H. 静态契约 ==');
const modalStart = HTML.indexOf('<!-- 5. 申请提现弹窗');
const modalEnd = HTML.indexOf('<!-- 6. 人民币账户充值弹窗');
const modalBlock = HTML.slice(modalStart, modalEnd);
ok(modalStart !== -1 && modalEnd !== -1, 'H01 提现弹窗区块可定位');
['withdraw-verify-strip', 'withdraw-verify-text', 'withdraw-verify-state', 'withdraw-rule-row',
  'withdraw-account-select', 'withdraw-account-note', 'withdraw-amount-input',
  'withdraw-amount-hint', 'withdraw-submit-btn'].forEach(id => {
  has(modalBlock, `id="${id}"`, `H02 弹窗含 #${id}`);
});
ok(modalBlock.length > 400, 'H02b 弹窗区块切分有效（非空区间）', modalBlock.length);
has(modalBlock, '本人同名银行借记卡', 'H03 弹窗副标题声明仅支持本人同名借记卡');
has(modalBlock, 'onclick="App.submitWithdraw()"', 'H04 提交按钮绑定 submitWithdraw');
has(modalBlock, 'max="10000"', 'H05 金额输入 max = 10000');
notHas(modalBlock, '微信零钱', 'H06 弹窗移除「微信零钱钱包」选项');
notHas(modalBlock, '<option>招商银行', 'H07 收款账户改为动态渲染（不再硬编码 option）');
const divOpen = (modalBlock.match(/<div\b/g) || []).length;
const divClose = (modalBlock.match(/<\/div>/g) || []).length;
eq(divOpen, divClose, 'H08 提现弹窗 div 标签配对');

// 提现入口：已从「账户余额」卡迁到「创作收益」卡（账户余额只保留【去充值 >】）
const cardBlock = HTML.slice(HTML.indexOf('id="assets-overview-cards"'), HTML.indexOf('资产明细'));
const balCardEnd = cardBlock.indexOf('asset-display-earnings');
const balCardBlock = cardBlock.slice(cardBlock.indexOf('asset-display-balance'), balCardEnd === -1 ? cardBlock.length : balCardEnd);
notHas(balCardBlock, 'openWithdrawModal', 'H09 【入口迁移】账户余额卡不再出现【去提现 >】');
has(balCardBlock, 'App.openAccountRechargeModal()', 'H09b 账户余额卡保留唯一动作【去充值 >】');
has(balCardBlock, '不可提现', 'H09c 账户余额卡脚注声明「不可提现」');
has(HTML, 'onclick="App.openWithdrawModal(\'income\')"', 'H09d 创作收益卡【去提现 >】指向 openWithdrawModal(income)');
eq((HTML.match(/App\.openModal\('modal-withdraw'\)/g) || []).length, 0,
  'H10 【入口收敛】index.html 不再直接裸开提现弹窗');
has(APP_SRC, "if (name === '提现管理') {\n      this.openWithdrawModal('income');", 'H11 常用功能「提现管理」指向 openWithdrawModal(income)');
has(APP_SRC, 'getWithdrawSource: function', 'H11b App.getWithdrawSource 已实现');

['getWithdrawSource', 'getWithdrawRules', 'getWithdrawAccounts', 'isIdVerified', 'validateWithdrawAccount',
  'renderWithdrawAccounts', 'refreshWithdrawPanel', 'openWithdrawModal',
  'onWithdrawAccountChange', 'onWithdrawAmountInput', 'submitWithdraw'].forEach(fn => {
  const n = (APP_SRC.match(new RegExp('\\n  ' + fn + ': function', 'g')) || []).length;
  eq(n, 1, `H12 App.${fn} 定义唯一（无重复覆盖）`);
});

['withdraw-verify-strip', 'withdraw-verify-icon', 'withdraw-verify-text', 'withdraw-verify-state',
  'withdraw-rule-row', 'withdraw-rule-chip', 'withdraw-account-note', 'withdraw-amount-hint'].forEach(c => {
  has(CSS, '.' + c, `H13 样式类 .${c} 已定义`);
});
has(CSS, '.withdraw-verify-strip.is-unverified', 'H14 未实名状态样式已定义');
has(CSS, '.withdraw-account-note.is-error', 'H15 账户错误态样式已定义');
has(CSS, '.withdraw-amount-hint.is-error', 'H16 金额错误态样式已定义');
has(CSS, '.withdraw-amount-hint.is-ok', 'H17 金额通过态样式已定义');
has(CSS, '.hero-btn-primary.is-disabled', 'H18 提交按钮置灰态样式已定义');

// ------------------------- I. 回归 -------------------------
console.log('== I. 回归：既有能力未被破坏 ==');
eq(num(MockData.assets.cards.balance) - num(MockData.assets.cards.withdrawable), 1500,
  'I01 账户余额恒等式仍成立');
ok((MockData.assets.escrowProjects || []).length === 6, 'I02 托管台账 6 条未变');
const activeEscrow = (MockData.assets.escrowProjects || []).filter(p => p.statusKey === 'active')
  .reduce((s, p) => s + p.amount, 0);
eq(activeEscrow, 1500, 'I03 进行中托管冻结合计仍为 ¥1,500');
eq(typeof App.payFromAccountBalance, 'function', 'I04 统一余额支付引擎仍在');
eq(typeof App.openProPayQrModal, 'function', 'I05 Pro 扫码订阅入口未受影响');
eq(typeof App.openEscrowProgressModal, 'function', 'I06 托管进度弹窗入口未受影响');

// ------------------------- 汇总 -------------------------
console.log('');
if (fails.length) {
  console.log(`✗ 失败 ${fails.length} 项 / 通过 ${pass} 项`);
  fails.forEach(f => console.log('  ✗ ' + f));
  process.exit(1);
} else {
  console.log(`✓ 全部通过：${pass} 项断言`);
  process.exit(0);
}
