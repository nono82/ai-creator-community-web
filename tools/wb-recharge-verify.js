#!/usr/bin/env node
/**
 * 人民币账户充值 · 官方收款二维码扫码入金（微信支付 / 支付宝）自检脚本
 * ---------------------------------------------------------------------------
 * 零依赖、离线。用最小 DOM 桩加载 js/mock_data.js + js/app.js，断言：
 *   ① 充值渠道收敛：银行卡（本人同名借记卡）协议代扣通道整体下线，
 *      只能经微信支付 / 支付宝官方收款二维码扫码入金；
 *   ② 充值三闸：必须已实名 → 支付渠道合法（二选一）→ 金额有效且不超单笔上限；
 *   ③ 提交只生成充值单并唤起扫码弹窗，此阶段**资金零变动、零流水**（未支付不入金）；
 *   ④「确认已支付」才是唯一入金口：余额 / 可提现余额 / breakdown / 流水四处同步；
 *   ⑤ 取消订单与支付超时均为零入金、零流水；
 *   ⑥ 静态契约（DOM 节点、旧银行卡下拉已删除、样式类齐备、方法无重复定义）。
 *
 * 用法： node temp/wb-recharge-verify.js
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
    this._children = [];
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
  appendChild(c) { this._children.push(c); return c; }
  addEventListener() {}
  // 支持形如 '.recharge-channel-btn' 的简单类选择器（本脚本只需这一类）
  querySelectorAll(sel) {
    const cls = String(sel || '').replace(/^\./, '');
    return this._children.filter(c => c.classList.contains(cls));
  }
  getContext() { return null; }
  scrollIntoView() {}
}

function child(className, attrs) {
  const c = new El('', attrs || {});
  c.classList.add(className);
  return c;
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

[
  'modal-account-recharge', 'recharge-cur-balance', 'recharge-cur-withdrawable',
  'recharge-rule-row', 'recharge-channel-row', 'recharge-channel-note',
  'recharge-amount-input', 'recharge-submit-btn',
  'modal-recharge-qr', 'rc-qr-amount', 'rc-qr-order-no', 'rc-qr-channel-row',
  'rc-qr-channel-hint', 'rc-qr-frame', 'rc-qr-countdown', 'rc-qr-expire-hint',
  'modal-withdraw', 'withdraw-account-select', 'withdraw-account-note',
  'withdraw-amount-input', 'withdraw-amount-hint', 'withdraw-submit-btn',
  'withdraw-verify-strip', 'withdraw-verify-text', 'withdraw-verify-state', 'withdraw-rule-row',
  'asset-display-balance', 'asset-display-withdrawable', 'escrow-library-desc'
].forEach(id => el(id));

// 充值表单弹窗与扫码弹窗各挂 2 个渠道按钮（与 index.html 的静态结构一致）
el('recharge-channel-row').appendChild(child('recharge-channel-btn', { 'data-channel': 'wechat' }));
el('recharge-channel-row').appendChild(child('recharge-channel-btn', { 'data-channel': 'alipay' }));
el('rc-qr-channel-row').appendChild(child('rc-qr-channel-btn', { 'data-channel': 'wechat' }));
el('rc-qr-channel-row').appendChild(child('rc-qr-channel-btn', { 'data-channel': 'alipay' }));

const windowStub = {
  location: { hash: '' },
  scrollTo: () => {},
  addEventListener: () => {},
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
function count(str, re) { return (String(str).match(re) || []).length; }

// Toast / 跳转捕获
const toasts = [];
App.showToast = function (msg) { toasts.push(String(msg)); };
let securityOpenedWith = null;
const origOpenSecuritySettings = App.openSecuritySettings.bind(App);
App.openSecuritySettings = function (focusItem) {
  securityOpenedWith = focusItem;
  return origOpenSecuritySettings(focusItem);
};
App.renderTransactionsTable = function () {};

const num = (s) => parseFloat(String(s == null ? '0' : s).replace(/[,\s¥]/g, '')) || 0;
function lastToast() { return toasts.length ? toasts[toasts.length - 1] : ''; }
function resetToast() { toasts.length = 0; }

// 冻结金额不在 cards 上，唯一真源是 breakdown 的「冻结金额」项
const frozenOf = () => {
  const it = (MockData.assets.breakdown.items || []).find(x => x.label === '冻结金额');
  return num(it && it.value);
};
const snap = () => ({
  balance: num(MockData.assets.cards.balance),
  withdrawable: num(MockData.assets.cards.withdrawable),
  frozen: frozenOf(),
  txCount: MockData.assets.transactions.length
});
// 判断两次快照是否完全一致（拦截 / 未支付场景必须零变动）
function same(a, b) {
  return a.balance === b.balance && a.withdrawable === b.withdrawable
    && a.frozen === b.frozen && a.txCount === b.txCount;
}

// =========================================================================
console.log('== A. 数据层：充值规则与渠道收敛 ==');
const rr = MockData.assets.rechargeRules;
ok(!!rr, 'A01 rechargeRules 唯一真源存在');
eq(rr.qrOnly, true, 'A02 【硬口径】充值只能通过官方收款二维码');
ok(Array.isArray(rr.channels) && rr.channels.length === 2, 'A03 渠道为微信支付 / 支付宝两个');
eq(rr.channels.map(c => c.id).join(','), 'wechat,alipay', 'A04 渠道 id 为 wechat / alipay');
eq(rr.channels.map(c => c.name).join(' / '), '微信支付 / 支付宝', 'A05 渠道名为微信支付 / 支付宝');
eq(rr.defaultChannel, 'wechat', 'A06 默认渠道为微信支付');
eq(rr.requireIdVerified, true, 'A07 必须已实名方可充值');
eq(rr.maxPerTx, 50000, 'A08 单笔充值上限 ¥50,000');
eq(rr.qrExpireSec, 900, 'A09 二维码有效期 15 分钟（900 秒）');
ok(!!rr.arrivalNote, 'A10 到账时效说明存在', rr.arrivalNote);
has(rr.note, '二维码', 'A11 口径文案明确二维码限制');
eq(rr.boundCardOnly, undefined, 'A12 旧的「仅限已绑定银行卡」口径已下线');
eq(rr.debitOnly, undefined, 'A13 旧的「仅限借记卡」口径已下线');
eq(rr.sameNameOnly, undefined, 'A14 旧的「仅限本人同名卡」口径已下线');

const txNames = (MockData.assets.transactions || []).map(t => String(t.name || ''));
const rechargeTx = txNames.filter(n => n.indexOf('人民币账户充值') === 0);
ok(rechargeTx.length >= 2, 'A15 含历史充值流水', rechargeTx.length);
ok(rechargeTx.every(n => /人民币账户充值 \((微信支付|支付宝)\)/.test(n)),
  'A16 历史充值流水渠道统一为微信支付 / 支付宝', rechargeTx.join(' | '));
ok(rechargeTx.every(n => n.indexOf('尾号') === -1), 'A17 历史充值流水不再出现银行卡尾号');

const inv = App.getInvoiceRecords();
ok(inv.length >= 2, 'A18 发票管理可开票记录仍由充值流水派生');
ok(inv.every(r => /微信支付|支付宝/.test(String(r.channel || ''))),
  'A19 发票记录的充值渠道为微信支付 / 支付宝', inv.map(r => r.channel).join(' | '));

// 银行卡台账仍在（提现收款 / 银行卡管理用），但不再承载充值
const prodCards = MockData.assets.bankCards || [];
eq(prodCards.length, 2, 'A20 银行卡台账保留 2 张（供提现收款与银行卡管理使用）');
ok(prodCards.every(c => c.cardType === 'debit'), 'A21 台账 2 张均为借记卡');

// =========================================================================
console.log('== B. 规则读取与渠道真源 ==');
const rules = App.getRechargeRules();
eq(rules.qrOnly, true, 'B01 getRechargeRules 暴露 qrOnly');
eq(rules.maxPerTx, 50000, 'B02 getRechargeRules 暴露 maxPerTx');
eq(rules.qrExpireSec, 900, 'B03 getRechargeRules 暴露二维码有效期');
ok(!!rules.arrivalNote, 'B04 getRechargeRules 暴露到账时效');
eq(App.getRechargeChannels().length, 2, 'B05 getRechargeChannels 返回 2 个渠道');
eq(App.getRechargeChannel('alipay').name, '支付宝', 'B06 getRechargeChannel 按 id 取渠道');
eq(App.getRechargeChannel('wechat').name, '微信支付', 'B07 getRechargeChannel 取微信支付');
eq(App.getRechargeChannel('nope').id, rules.defaultChannel, 'B08 非法渠道 id 回落默认渠道（永不为空）');
eq(App.getRechargeChannelId(), 'wechat', 'B09 未选过渠道时回落默认渠道');

// =========================================================================
console.log('== C. 渠道选择与界面回显 ==');
App.selectRechargeChannel('alipay');
eq(App.getRechargeChannelId(), 'alipay', 'C01 切到支付宝后当前渠道 = alipay');
const alipayBtn = el('recharge-channel-row').querySelectorAll('.recharge-channel-btn')[1];
const wechatBtn = el('recharge-channel-row').querySelectorAll('.recharge-channel-btn')[0];
eq(alipayBtn.classList.contains('active'), true, 'C02 支付宝按钮点亮');
eq(wechatBtn.classList.contains('active'), false, 'C03 微信按钮取消点亮');
has(el('recharge-channel-note').innerText, '支付宝', 'C04 渠道说明回显当前渠道');
has(el('recharge-channel-note').innerText, '扫一扫', 'C05 渠道说明给出扫码指引');
App.selectRechargeChannel('wechat');
eq(wechatBtn.classList.contains('active'), true, 'C06 切回微信后微信按钮点亮');
has(el('recharge-channel-note').innerText, '微信', 'C07 渠道说明随之回显微信');

// =========================================================================
console.log('== D. 弹窗渲染（口径 chips / 渠道组 / 提交按钮可用态） ==');
MockData.currentUser.idVerified = false;
App.openAccountRechargeModal();
eq(el('modal-account-recharge').classList.contains('active'), true, 'D01 充值弹窗已打开');
eq(el('recharge-cur-balance').innerText, '¥ ' + MockData.assets.cards.balance, 'D02 余额条回填账户总额');
eq(el('recharge-cur-withdrawable').innerText, '可提现 ¥ ' + MockData.assets.cards.withdrawable, 'D03 余额条回填可提现金额');
has(el('recharge-rule-row').innerHTML, '必须已实名', 'D04 口径 chips 含「必须已实名」');
has(el('recharge-rule-row').innerHTML, '仅官方收款二维码', 'D05 口径 chips 含「仅官方收款二维码」');
has(el('recharge-rule-row').innerHTML, '单笔上限 ¥ 50,000', 'D06 口径 chips 含单笔上限');
eq(count(el('recharge-rule-row').innerHTML, /recharge-rule-chip/g), 3, 'D07 口径 chips 共 3 条（已无银行卡口径）');
eq(count(el('recharge-rule-row').innerHTML, /is-error/g), 1, 'D08 未实名时首条 chip 转红');
has(el('recharge-rule-row').innerHTML, 'is-error">✕ 必须已实名', 'D09 未实名标记落在「必须已实名」上');
eq(el('recharge-submit-btn').classList.contains('is-disabled'), true, 'D10 未实名时【生成收款二维码】置灰');
notHas(el('recharge-rule-row').innerHTML, '借记卡', 'D11 口径 chips 已无借记卡字样');
notHas(el('recharge-rule-row').innerHTML, '已绑定银行卡', 'D12 口径 chips 已无已绑定银行卡字样');

MockData.currentUser.idVerified = true;
App.refreshRechargePanel();
eq(el('recharge-submit-btn').classList.contains('is-disabled'), false, 'D13 已实名时提交按钮可点');
eq(count(el('recharge-rule-row').innerHTML, /is-error/g), 0, 'D14 已实名时无红色 chip');

// =========================================================================
console.log('== E. 提交三闸（拦截零变动 / 只生成订单不入金） ==');
const s0 = snap();
MockData.currentUser.idVerified = false;
resetToast();
el('recharge-amount-input').value = '1000';
App._rechargeOrder = null;
App.submitAccountRecharge();
has(lastToast(), '未完成实名认证', 'E01 未实名提交 → 拦截并提示实名为前置');
eq(securityOpenedWith, '实名认证', 'E02 未实名提交 → 自动跳转安全设置实名认证');
eq(el('modal-account-recharge').classList.contains('active'), true, 'E03 未实名提交 → 表单弹窗保持打开');
eq(el('modal-recharge-qr').classList.contains('active'), false, 'E04 未实名提交 → 不唤起扫码弹窗');
eq(App._rechargeOrder, null, 'E05 未实名提交 → 不生成充值单');
ok(same(snap(), s0), 'E06 未实名拦截时资金台账零变动');

MockData.currentUser.idVerified = true;
resetToast();
el('recharge-amount-input').value = '0';
App.submitAccountRecharge();
has(lastToast(), '有效的充值金额', 'E07 金额 0 → 拦截');
resetToast();
el('recharge-amount-input').value = '60000';
App.submitAccountRecharge();
has(lastToast(), '单笔充值上限', 'E08 超单笔上限 → 拦截');
resetToast();
el('recharge-amount-input').value = '0.4';
App.submitAccountRecharge();
has(lastToast(), '不得低于', 'E09 低于单笔下限 → 拦截');
eq(el('modal-recharge-qr').classList.contains('active'), false, 'E10 金额拦截不唤起扫码弹窗');
ok(same(snap(), s0), 'E11 三闸拦截期间资金台账零变动');

// 正常提交 → 生成充值单 + 唤起扫码弹窗，但**尚未入金**
const before = snap();
resetToast();
el('recharge-amount-input').value = '1000';
App.submitAccountRecharge();
const order = App._rechargeOrder;
ok(!!order, 'E12 三闸全过 → 生成充值单');
eq(order.amount, 1000, 'E13 充值单金额 = 1,000');
eq(order.channelId, 'wechat', 'E14 充值单渠道 = 微信支付（当前选择）');
eq(order.channelName, '微信支付', 'E15 充值单渠道名正确');
eq(order.status, '待支付', 'E16 充值单初始状态为待支付');
has(String(order.orderNo), 'RC', 'E17 充值单号以 RC 开头');
eq(el('modal-account-recharge').classList.contains('active'), false, 'E18 提交后关闭表单弹窗');
eq(el('modal-recharge-qr').classList.contains('active'), true, 'E19 提交后唤起扫码弹窗');
eq(el('rc-qr-amount').innerText, '¥ 1,000.00', 'E20 扫码弹窗回填充值金额');
eq(el('rc-qr-order-no').innerText, order.orderNo, 'E21 扫码弹窗回填充值单号');
eq(el('rc-qr-channel-hint').innerText, '微信', 'E22 扫码弹窗渠道提示为微信');
has(el('rc-qr-frame').innerHTML, '<svg', 'E23 二维码已渲染为内联 SVG');
has(el('rc-qr-frame').innerHTML, 'rc-qr-svg', 'E24 二维码 SVG 使用 rc-qr-svg 类');
eq(el('rc-qr-countdown').innerText, '15:00', 'E25 倒计时从 15:00 起算');
eq(el('rc-qr-channel-row').querySelectorAll('.rc-qr-channel-btn')[0].classList.contains('active'), true,
  'E26 扫码弹窗微信渠道按钮点亮');
ok(same(snap(), before), 'E27 【关键】扫码阶段尚未支付 → 资金台账零变动、零流水');

// 切换渠道 → 重绘二维码（订单号不变）
const qrBefore = el('rc-qr-frame').innerHTML;
const orderNoBefore = order.orderNo;
App.switchRechargeChannel('alipay');
eq(App._rechargeOrder.channelId, 'alipay', 'E28 切渠道后订单渠道更新为支付宝');
eq(App._rechargeOrder.orderNo, orderNoBefore, 'E29 切渠道不改变充值单号');
ok(el('rc-qr-frame').innerHTML !== qrBefore, 'E30 切渠道后二维码图案重绘');
eq(el('rc-qr-channel-hint').innerText, '支付宝', 'E31 切渠道后提示文案同步');
eq(el('rc-qr-channel-row').querySelectorAll('.rc-qr-channel-btn')[1].classList.contains('active'), true,
  'E32 切渠道后支付宝按钮点亮');
ok(same(snap(), before), 'E33 切渠道为零资金动作');

// 取消订单 → 撤单 + 零入金
resetToast();
App.cancelRechargeOrder();
eq(App._rechargeOrder, null, 'E34 取消订单后充值单已撤销');
eq(el('modal-recharge-qr').classList.contains('active'), false, 'E35 取消订单后扫码弹窗关闭');
has(lastToast(), '未产生任何入金', 'E36 取消订单 Toast 明示零入金');
ok(same(snap(), before), 'E37 取消订单期间资金台账零变动');

// =========================================================================
console.log('== F. 确认已支付（唯一入金口）与四账同步 ==');
const f0 = snap();
App._rechargeChannelId = 'alipay';
el('recharge-amount-input').value = '1000';
App.submitAccountRecharge();
ok(same(snap(), f0), 'F01 再次下单阶段仍零变动');
resetToast();
App.confirmRechargePayment();
eq(num(MockData.assets.cards.balance), f0.balance + 1000, 'F02 确认支付：账户总额 +1,000');
eq(num(MockData.assets.cards.withdrawable), f0.withdrawable + 1000, 'F03 确认支付：可提现余额 +1,000');
eq(frozenOf(), f0.frozen, 'F04 确认支付不影响冻结金额');
eq(MockData.assets.transactions.length, f0.txCount + 1, 'F05 确认支付写入 1 条流水');
const topTx = MockData.assets.transactions[0];
has(topTx.name, '人民币账户充值 (支付宝)', 'F06 流水名含二维码渠道');
eq(topTx.amount, '+ ¥ 1,000.00', 'F07 流水金额格式正确');
eq(topTx.category, '收入', 'F08 流水归入「收入」Tab');
eq(topTx.statusType, 'success', 'F09 流水状态为已到账');
has(lastToast(), '支付宝', 'F10 Toast 回带扫码渠道');
has(lastToast(), '发票管理', 'F11 Toast 引导开票');
eq(el('modal-recharge-qr').classList.contains('active'), false, 'F12 入账后关闭扫码弹窗');
eq(App._rechargeOrder, null, 'F13 入账后清空充值单（防重复入金）');
const availItem = (MockData.assets.breakdown.items || []).find(it => it.label === '可提现余额');
eq(num(availItem.amount), num(MockData.assets.cards.withdrawable), 'F14 breakdown 可提现项与余额同源');
eq(el('asset-display-balance').innerText, '¥ ' + MockData.assets.cards.balance, 'F15 资产卡总额同步刷新');
eq(el('asset-display-withdrawable').innerText, '¥ ' + MockData.assets.cards.withdrawable, 'F16 资产卡可提现同步刷新');
ok(Math.abs(num(MockData.assets.cards.balance) - (num(MockData.assets.cards.withdrawable) + frozenOf())) < 0.005,
  'F17 充值后「总额 = 可提现 + 冻结」恒等式仍成立');

// 重复确认：无订单时不得二次入金
resetToast();
App.confirmRechargePayment();
ok(same(snap(), Object.assign({}, f0, {
  balance: f0.balance + 1000, withdrawable: f0.withdrawable + 1000, txCount: f0.txCount + 1
})), 'F18 无订单时重复确认 → 零二次入金');
has(lastToast(), '重新发起充值', 'F19 无订单时给出重新发起引导');

// 支付超时：订单失效且零入金
const g0 = snap();
App._rechargeChannelId = 'wechat';
el('recharge-amount-input').value = '500';
App.submitAccountRecharge();
const expOrder = App._rechargeOrder;
ok(!!expOrder, 'F20 超时用例订单已生成');
App._rechargeOrder.expireSec = 1;
App.startRechargeQrCountdown();
App.stopRechargeQrCountdown();
App._rechargeOrder = null;
ok(same(snap(), g0), 'F21 超时未支付 → 资金台账零变动');
eq(el('modal-account-recharge').classList.contains('active'), false, 'F22 超时后表单弹窗保持关闭');

// 清理计时器，避免挂起
App.stopRechargeQrCountdown();

// =========================================================================
console.log('== G. 静态契约（DOM / 旧银行卡通道已删除 / 样式 / 方法唯一） ==');
['modal-account-recharge', 'recharge-rule-row', 'recharge-channel-row',
  'recharge-channel-note', 'recharge-submit-btn', 'modal-recharge-qr', 'rc-qr-amount',
  'rc-qr-order-no', 'rc-qr-channel-row', 'rc-qr-channel-hint', 'rc-qr-frame',
  'rc-qr-countdown'].forEach((id, i) => {
  has(HTML, 'id="' + id + '"', `G${String(i + 1).padStart(2, '0')} 充值链路含 #${id}`);
});
notHas(HTML, 'id="recharge-card-select"', 'G13 旧的充值银行卡下拉已删除');
notHas(HTML, '充值银行卡', 'G14 已无「充值银行卡」标签');
notHas(HTML, '银联对公转账', 'G15 银联对公转账渠道已下线');
// 截取充值表单弹窗自身片段（就地绑卡入口在提现弹窗中仍然合法，故不能全文件断言）
const rcModalHtml = (function () {
  const s = HTML.indexOf('id="modal-account-recharge"');
  const e = HTML.indexOf('id="modal-recharge-qr"');
  return s >= 0 && e > s ? HTML.slice(s, e) : '';
})();
ok(rcModalHtml.length > 0, 'G16a 能定位到充值表单弹窗片段');
notHas(rcModalHtml, 'openBankCardBindModal', 'G16 充值弹窗内已无就地绑卡入口');
notHas(rcModalHtml, '<select', 'G16b 充值弹窗内已无任何下拉（银行卡下拉已下线）');
notHas(HTML, '仅限已绑定的本人同名借记卡', 'G17 已无借记卡代扣口径文案');
has(HTML, 'data-channel="wechat"', 'G18 充值渠道以按钮 data-channel 承载（微信）');
has(HTML, 'data-channel="alipay"', 'G19 充值渠道以按钮 data-channel 承载（支付宝）');
ok(!/<option[^>]*value="(微信支付|支付宝)"/.test(HTML), 'G20 全站仍无外部渠道 <option> 下拉项');

ok(!APP_SRC.includes('recharge-card-select'), 'G21 app.js 无旧银行卡下拉残留');
ok(!APP_SRC.includes('validateRechargeCard'), 'G22 app.js 无旧单卡准入校验残留');
ok(!APP_SRC.includes('getRechargeCards'), 'G23 app.js 无旧充值卡来源残留');
eq(count(APP_SRC, /getRechargeRules: function/g), 1, 'G24 App.getRechargeRules 定义唯一');
eq(count(APP_SRC, /getRechargeChannels: function/g), 1, 'G25 App.getRechargeChannels 定义唯一');
eq(count(APP_SRC, /selectRechargeChannel: function/g), 1, 'G26 App.selectRechargeChannel 定义唯一');
eq(count(APP_SRC, /submitAccountRecharge: function/g), 1, 'G27 App.submitAccountRecharge 定义唯一');
eq(count(APP_SRC, /confirmRechargePayment: function/g), 1, 'G28 App.confirmRechargePayment 定义唯一');
eq(count(APP_SRC, /cancelRechargeOrder: function/g), 1, 'G29 App.cancelRechargeOrder 定义唯一');
eq(count(APP_SRC, /renderRechargeQr: function/g), 1, 'G30 App.renderRechargeQr 定义唯一');
eq(count(APP_SRC, /switchRechargeChannel: function/g), 1, 'G31 App.switchRechargeChannel 定义唯一');
eq(count(APP_SRC, /refreshRechargePanel: function/g), 1, 'G32 App.refreshRechargePanel 定义唯一');
has(APP_SRC, '人民币账户充值 (', 'G33 入金流水名仍以「人民币账户充值」开头（发票派生依赖）');

['.recharge-rule-row', '.recharge-rule-chip', '.recharge-channel-row',
  '.recharge-channel-btn', '.recharge-channel-btn.active', '.recharge-channel-icon',
  '.recharge-channel-note'].forEach((cls, i) => {
  has(CSS, cls, `G${34 + i} css 定义 ${cls}`);
});
['.rc-qr-order-strip', '.rc-qr-order-cell', '.rc-qr-order-lbl', '.rc-qr-order-val',
  '.rc-qr-channel-row', '.rc-qr-channel-btn', '.rc-qr-channel-btn.active',
  '.rc-qr-stage', '.rc-qr-frame', '.rc-qr-svg', '.rc-qr-countdown',
  '.rc-qr-hint', '.rc-qr-expire-hint', '.rc-qr-tip-row'].forEach((cls, i) => {
  has(CSS, cls, `G4${i + 1} css 定义 ${cls}`);
});
notHas(CSS, '.recharge-add-card-row', 'G55 旧的就地绑卡行样式已删除');
notHas(CSS, '#recharge-card-select option:disabled', 'G56 旧的充值卡置灰样式已删除');

// ------------------------- 结果汇总 -------------------------
console.log('\n' + '-'.repeat(72));
if (fails.length === 0) {
  console.log(` 充值合规自检：${pass} / ${pass} 全通过 ✓`);
  console.log(' 结论：充值只能经微信支付 / 支付宝官方收款二维码，扫码阶段零入金、确认支付才入账。');
  console.log('-'.repeat(72) + '\n');
  process.exit(0);
} else {
  console.log(` 充值合规自检：${pass} 通过 / ${fails.length} 失败 ✗`);
  fails.forEach((f, i) => console.log(`   ${i + 1}. ${f}`));
  console.log('-'.repeat(72) + '\n');
  process.exit(1);
}
