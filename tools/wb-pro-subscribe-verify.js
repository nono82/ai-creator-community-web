#!/usr/bin/env node
/**
 * Pro 会员订阅（独立结算通道）自检脚本
 * ---------------------------------------------------------------------------
 * 零依赖、离线。用最小 DOM 桩加载 js/mock_data.js + js/app.js，
 * 断言「方案选择 → 订阅下单 → 扫码支付 → 打标 Pro + 写入到期时间」全链路，
 * 以及「与账户余额完全解耦」这一架构红线。
 *
 * 用法： node temp/wb-pro-subscribe-verify.js
 * 退出码 0 = 全过，1 = 有失败
 */
'use strict';

const fs = require('fs');
const path = require('path');

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
    this.placeholder = '';
    this.disabled = false;
    this.hidden = false;
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

// pro-qr-channel-row 内的两个渠道按钮
const channelBtns = [
  new El('pro-qr-ch-wechat', { 'data-channel': '微信支付' }),
  new El('pro-qr-ch-alipay', { 'data-channel': '支付宝' })
];

const documentStub = {
  getElementById: (id) => el(id),
  querySelector: (sel) => (sel.includes('pro-qr-channel-btn') ? channelBtns[0] : null),
  querySelectorAll: (sel) => (sel.includes('pro-qr-channel-btn') ? channelBtns : []),
  addEventListener: () => {},
  body: new El('body')
};

// 预置常见 id，避免桩差异
['modal-pro', 'modal-pro-pay-qr', 'pro-subscribe-strip', 'pro-widget-card', 'assets-profile-hub',
 'pro-plan-year', 'pro-plan-month', 'pro-qr-frame', 'pro-qr-countdown', 'pro-qr-amount',
 'pro-qr-plan-name', 'pro-qr-order-no', 'pro-qr-expire-hint', 'pro-qr-channel-hint']
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

// ------------------------- 装载代码 -------------------------
const sandbox = {
  window: windowStub,
  document: documentStub,
  console,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  Date,
  Math,
  JSON,
  Object,
  Array,
  String,
  Number,
  Boolean,
  RegExp,
  Error,
  isNaN,
  parseInt,
  parseFloat,
  encodeURIComponent
};
sandbox.globalThis = sandbox;
const vm = require('vm');
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
function addDays(base, n) {
  const d = new Date(base.getTime());
  d.setDate(d.getDate() + n);
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const mem = MockData.systemAdmin.membership;
ok(!!MockData && !!App && !!mem, 'A0 装载 mock_data.js / app.js 成功');
const balBefore = MockData.assets.cards.balance;
const wdBefore = MockData.assets.cards.withdrawable;
const txBefore = MockData.assets.transactions.length;

// ===================== A. 初始态（未开通 Pro） =====================
eq(mem.currentTier, 'free', 'A1 演示账号初始为未开通 Pro');
eq(App.isProMember(), false, 'A2 isProMember() 初始为 false');
eq(App.proDaysLeft(), 0, 'A3 未开通时剩余天数为 0');
eq(App.getProPlan('year').amount, 699, 'A4 年费方案金额 ¥699');
eq(App.getProPlan('year').days, 365, 'A5 年费方案 365 天');
eq(App.getProPlan('month').amount, 98, 'A6 月度方案金额 ¥98');
eq(App.getProPlan('month').days, 30, 'A7 月度方案 30 天');
eq(App.getProPlan('nonexist').key, 'year', 'A8 非法方案键回落年费');
eq(Array.isArray(mem.orders) && mem.orders.length, 0, 'A9 订阅订单簿初始为空');
eq(App.formatDate(new Date('2026-09-22T10:00:00')), '2026-09-22', 'A10 formatDate 输出 YYYY-MM-DD');

// ===================== B. 方案选择 =====================
App.openModal('modal-pro');
eq(App._proPlan, 'year', 'B1 打开弹窗默认选中年度会员');
ok(el('pro-plan-year').classList.contains('active'), 'B2 年费卡 active');
App.selectProPlan('month');
eq(App._proPlan, 'month', 'B3 选择月度订阅生效');
ok(el('pro-plan-month').classList.contains('active'), 'B4 月度卡 active');
ok(!el('pro-plan-year').classList.contains('active'), 'B5 年费卡取消 active');
App.renderProMembershipStrip();
has(el('pro-subscribe-strip').innerHTML, '未开通', 'B6 未开通态状态条含「未开通」');
has(el('pro-subscribe-strip').innerHTML, '独立结算通道', 'B7 未开通态明确独立结算');
notHas(el('pro-subscribe-strip').innerHTML, '有效期至', 'B8 未开通态不显示有效期');

// ===================== C. 发起订阅（不动账户余额） =====================
App.handleUpgradePro();
ok(App._proOrder, 'C1 已生成订阅订单');
has(App._proOrder.orderNo, 'PRO', 'C2 订阅单号以 PRO 开头');
eq(App._proOrder.planKey, 'month', 'C3 订单方案 = 月度订阅');
eq(App._proOrder.amount, 98, 'C4 订单金额 = 98');
eq(App._proOrder.status, '待支付', 'C5 订单初始状态为待支付');
eq(App._proOrder.expireDate, addDays(new Date(), 30), 'C6 月度订阅到期日 = 今天 +30 天');
ok(!el('modal-pro').classList.contains('active'), 'C7 方案弹窗已关闭');
ok(el('modal-pro-pay-qr').classList.contains('active'), 'C8 付款二维码弹窗已打开');
eq(el('pro-qr-plan-name').innerText, '月度订阅', 'C9 二维码弹窗回显方案名');
eq(el('pro-qr-amount').innerText, '¥ 98.00', 'C10 二维码弹窗回显金额');
eq(el('pro-qr-order-no').innerText, App._proOrder.orderNo, 'C11 二维码弹窗回显单号');
has(el('pro-qr-expire-hint').innerText, App._proOrder.expireDate, 'C12 支付前预告到期日');
eq(el('pro-qr-channel-hint').innerText, '微信', 'C13 默认渠道为微信');
eq(el('pro-qr-countdown').innerText, '15:00', 'C14 支付倒计时初始 15:00');
const qr1 = el('pro-qr-frame').innerHTML;
has(qr1, '<svg', 'C15 二维码已渲染 SVG');
has(qr1, '#07C160', 'C16 微信渠道中央徽标为微信绿');
ok((qr1.match(/<rect/g) || []).length > 60, 'C17 二维码码点数量充足', (qr1.match(/<rect/g) || []).length);
eq(MockData.assets.cards.balance, balBefore, 'C18 【红线】下单不动账户总额');
eq(MockData.assets.cards.withdrawable, wdBefore, 'C19 【红线】下单不动可提现余额');
eq(MockData.assets.transactions.length, txBefore, 'C20 【红线】下单不产生资产流水');

// ===================== D. 支付渠道切换 =====================
App.switchProPayChannel('支付宝');
eq(App._proOrder.channel, '支付宝', 'D1 渠道切换为支付宝');
ok(channelBtns[1].classList.contains('active'), 'D2 支付宝按钮 active');
ok(!channelBtns[0].classList.contains('active'), 'D3 微信按钮取消 active');
eq(el('pro-qr-channel-hint').innerText, '支付宝', 'D4 扫码提示同步为支付宝');
has(el('pro-qr-frame').innerHTML, '#1677FF', 'D5 支付宝渠道中央徽标为支付宝蓝');
ok(el('pro-qr-frame').innerHTML !== qr1, 'D6 切换渠道后二维码图案重绘');

// ===================== E. 取消订单 =====================
App.cancelProOrder();
eq(App._proOrder, null, 'E1 取消后订单作废');
ok(!el('modal-pro-pay-qr').classList.contains('active'), 'E2 二维码弹窗已关闭');
eq(App.isProMember(), false, 'E3 取消后仍未开通 Pro');
eq(MockData.assets.cards.balance, balBefore, 'E4 取消订单不动账户余额');
eq(mem.orders.length, 0, 'E5 取消订单不登记订阅订单');

// ===================== F. 支付成功 → 打标 Pro + 写到期时间 =====================
App.selectProPlan('year');
App.handleUpgradePro();
const yOrder = App._proOrder;
App.confirmProPayment();
eq(App._proOrder, null, 'F1 支付成功后订单对象已释放');
ok(!el('modal-pro-pay-qr').classList.contains('active'), 'F2 二维码弹窗已关闭');
eq(mem.currentTier, 'pro', 'F3 会员信息已打标 Pro');
eq(mem.tierName, 'Pro 商业创作者会员', 'F4 会员等级名称为 Pro 商业创作者会员');
eq(mem.plan, 'year', 'F5 订阅方案已写入');
eq(mem.planLabel, 'Pro 年费会员', 'F6 订阅方案标签已写入');
eq(mem.expireDate, addDays(new Date(), 365), 'F7 到期时间 = 今天 +365 天');
eq(mem.isAutoRenew, false, 'F8 年费会员不自动续费');
eq(mem.lastOrderNo, yOrder.orderNo, 'F9 记录最近订阅单号');
eq(mem.orders.length, 1, 'F10 订阅订单已登记 1 笔');
eq(mem.orders[0].status, '已支付', 'F11 订单状态为已支付');
eq(mem.orders[0].channel, '微信支付', 'F12 订单渠道为微信支付');
has(mem.orders[0].settleChannel, '独立结算', 'F13 订单标注独立结算通道');
eq(App.isProMember(), true, 'F14 isProMember() 变为 true');
ok(App.proDaysLeft() >= 365 && App.proDaysLeft() <= 366, 'F15 剩余有效期约 365 天', App.proDaysLeft());

// 三处会员信息展示位
const hubHtml = el('assets-profile-hub').innerHTML;
has(hubHtml, 'badge-pro', 'F16 资产页资料条已显示 PRO 徽章');
has(hubHtml, '有效期至', 'F17 资产页资料条显示「有效期至」');
has(hubHtml, mem.expireDate, 'F18 资产页资料条显示 Pro 到期时间');
has(el('pro-widget-card').innerHTML, 'PRO 会员', 'F19 侧边栏入口卡变为 Pro 会员态');
has(el('pro-widget-card').innerHTML, mem.expireDate, 'F20 侧边栏入口卡显示有效期至');
App.renderProMembershipStrip();
has(el('pro-subscribe-strip').innerHTML, 'PRO 生效中', 'F21 方案弹窗状态条显示 PRO 生效中');
has(el('pro-subscribe-strip').innerHTML, mem.expireDate, 'F22 方案弹窗状态条显示到期时间');

// 账户红线复检
eq(MockData.assets.cards.balance, balBefore, 'F23 【红线】开通 Pro 后账户总额不变');
eq(MockData.assets.cards.withdrawable, wdBefore, 'F24 【红线】开通 Pro 后可提现余额不变');
eq(MockData.assets.transactions.length, txBefore, 'F25 【红线】开通 Pro 不写资产流水');
const num = (s) => parseFloat(String(s).replace(/[^\d.-]/g, '')) || 0;
const frozenItem = (MockData.assets.breakdown.items || []).find(it => it.label.indexOf('冻结') !== -1);
eq(frozenItem ? frozenItem.value : -1, 1500, 'F26 【红线】Pro 订阅未触碰商单托管冻结额');
eq(num(MockData.assets.cards.balance) - num(MockData.assets.cards.withdrawable), 1500, 'F27 【红线】总额 - 可提现 = 冻结额 ¥1,500 恒等成立');

// ===================== G. 月度续费顺延 =====================
const firstExpire = mem.expireDate;
App.selectProPlan('month');
App.handleUpgradePro();
eq(App._proOrder.expireDate, addDays(new Date(firstExpire.replace(/-/g, '/')), 30), 'G1 续费在原到期日基础上顺延 30 天');
App.confirmProPayment();
eq(mem.expireDate, addDays(new Date(firstExpire.replace(/-/g, '/')), 30), 'G2 续费后到期时间已顺延');
eq(mem.isAutoRenew, true, 'G3 月度订阅自动续费开启');
eq(mem.orders.length, 2, 'G4 订阅订单累计 2 笔');
eq(mem.orders[0].planLabel, '月度订阅', 'G5 最新订单在最前');
eq(MockData.assets.cards.balance, balBefore, 'G6 【红线】续费同样不动账户余额');

// ===================== H. 边界与静态契约 =====================
App._proOrder = null;
App.confirmProPayment();
ok(true, 'H1 无订单时确认支付不抛异常');
App.stopProQrCountdown();
ok(true, 'H2 倒计时可安全停止');

eq((APP_SRC.match(/handleUpgradePro\s*:/g) || []).length, 1, 'H3 handleUpgradePro 仅定义一次（死代码已清理）');
eq((APP_SRC.match(/refreshProPaySource\s*:/g) || []).length, 0, 'H4 旧的余额支付状态刷新方法已移除');
notHas(APP_SRC.slice(APP_SRC.indexOf('handleUpgradePro: function'), APP_SRC.indexOf('openWorkPlayer')), 'payFromAccountBalance', 'H5 Pro 订阅链路不调用余额支付引擎');
has(HTML, 'id="modal-pro-pay-qr"', 'H6 付款二维码弹窗已落地 DOM');
has(HTML, 'id="pro-subscribe-strip"', 'H7 方案弹窗会员状态条已落地 DOM');
has(HTML, 'id="pro-widget-card"', 'H8 侧边栏 Pro 卡已接入动态渲染');
has(HTML, 'id="pro-qr-frame"', 'H9 二维码容器已落地 DOM');
notHas(HTML, '账户余额（平台唯一支付来源）', 'H10 Pro 弹窗已移除「账户余额支付」表述');
notHas(HTML, 'id="pro-pay-balance"', 'H11 账户余额读数节点已移除');
has(CSS, '.pro-qr-frame', 'H12 二维码样式已落地');
has(CSS, '.badge-pro', 'H13 PRO 徽章样式已落地');
has(CSS, '.pro-subscribe-strip', 'H14 会员状态条样式已落地');
has(CSS, '.assets-profile-membership', 'H15 会员信息行样式已落地');
notHas(CSS, '.pro-pay-source', 'H16 旧余额支付样式已清理');

// 支付通道收敛口径（2026-09-24 三次收敛）：人民币账户充值由「已绑定本人同名借记卡协议代扣」
// 改为「微信支付 / 支付宝官方收款二维码扫码入金」，银行卡代扣通道整体下线；
// 全站仍不存在以 <option> 陈列的外部支付通道，扫码通道一律以 data-channel 按钮承载
const channelHits = [];
HTML.split('\n').forEach((line, i) => {
  if (/<option[^>]*value="(微信支付|支付宝|银联对公转账)"/.test(line)) channelHits.push(i + 1);
});
eq(channelHits.length, 0, 'H17 全站已无 <option> 形式的外部支付通道下拉');
notHas(HTML, 'id="recharge-card-select"', 'H17b 充值弹窗的「充值银行卡」下拉已下线');
has(HTML, 'id="modal-recharge-qr"', 'H17b2 充值改为官方收款二维码弹窗');
has(HTML, 'data-channel="wechat"', 'H17b3 充值渠道以按钮 data-channel 承载（微信支付）');
has(HTML, 'data-channel="alipay"', 'H17b4 充值渠道以按钮 data-channel 承载（支付宝）');
notHas(HTML, '银联对公转账', 'H17c 银联对公转账渠道已整体下线');
const proQrStart = HTML.indexOf('id="modal-pro-pay-qr"');
const proQrEnd = HTML.indexOf('<!-- 5. 申请提现弹窗');
const proQrBlock = HTML.slice(proQrStart, proQrEnd);
has(proQrBlock, 'data-channel="微信支付"', 'H18 Pro 订阅弹窗含独立微信扫码通道');
has(proQrBlock, 'data-channel="支付宝"', 'H19 Pro 订阅弹窗含独立支付宝扫码通道');
notHas(proQrBlock, '<option', 'H20 Pro 订阅弹窗不出现下拉渠道（与充值弹窗区分）');

// ------------------------- 汇总 -------------------------
const total = pass + fails.length;
if (fails.length) {
  console.log(`\n✗ Pro 会员订阅自检未通过：${fails.length}/${total}\n`);
  fails.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
  console.log('');
  process.exit(1);
}
console.log(`\n✓ Pro 会员订阅自检全部通过：${total}/${total} 项断言\n`);
process.exit(0);
