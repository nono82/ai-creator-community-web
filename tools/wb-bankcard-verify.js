#!/usr/bin/env node
/**
 * 资产安全中心 · 银行卡绑定与换绑 自检脚本
 * ---------------------------------------------------------------------------
 * 零依赖、离线。用最小 DOM 桩加载 js/mock_data.js + js/app.js，断言：
 *   ① 只支持借记卡绑定（信用卡 / 国际卡组织号段一律拦截）；
 *   ② 必须完成实名认证后方可绑定（未实名引导去实名认证）；
 *   ③ 附加口径：必须本人同名卡 / 不得重复绑定 / 张数上限 / 短信验证码；
 *   ④ 换绑（替换不合规存量卡）/ 设为默认结算卡 / 解绑（默认卡不可解绑）；
 *   ⑤ 与提现闭环（新卡立即可用于提现收款）且不动账户余额与流水；
 *   ⑥ 静态契约（DOM 节点、方法唯一、样式类齐备）。
 *
 * 用法： node temp/wb-bankcard-verify.js
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
  scrollIntoView() {}
}

const registry = new Map();
function el(id, attrs) {
  if (!registry.has(id)) registry.set(id, new El(id, attrs));
  return registry.get(id);
}

// 真实 DOM 中弹窗底座的 class="modal-backdrop" 来自 index.html 的静态节点；
// 桩里需显式补上，App.openModal() 的「下钻置顶」逻辑才能通过
// querySelectorAll('.modal-backdrop.active') 感知到兄弟弹窗。
['modal-bank-card-manage', 'modal-bank-card-bind', 'modal-custom-confirm', 'modal-confirm',
  'modal-withdraw', 'modal-account-recharge'].forEach(id => el(id).classList.add('modal-backdrop'));

const documentStub = {
  getElementById: (id) => el(id),
  querySelector: () => null,
  querySelectorAll: (sel) => {
    if (sel === '.modal-backdrop.active') {
      const out = [];
      registry.forEach(node => {
        if (node.classList.contains('modal-backdrop') && node.classList.contains('active')) out.push(node);
      });
      return out;
    }
    return [];
  },
  addEventListener: () => {},
  body: new El('body')
};

[
  'modal-bank-card-bind', 'bank-bind-title', 'bank-bind-sub',
  'bank-bind-verify-strip', 'bank-bind-verify-text', 'bank-bind-verify-state',
  'bank-bind-rule-row', 'bank-bind-rebind-strip',
  'bank-bind-holder', 'bank-bind-cardno', 'bank-bind-branch', 'bank-bind-code',
  'bank-bind-detect', 'bank-bind-demo', 'bank-bind-hint',
  'bank-bind-code-btn', 'bank-bind-submit-btn',
  'modal-bank-card-manage', 'bank-manage-rule-row', 'bank-manage-list', 'bank-manage-tip', 'bank-manage-add',
  'security-settings-body',
  'modal-withdraw', 'withdraw-account-select', 'withdraw-account-note',
  'withdraw-amount-input', 'withdraw-amount-hint', 'withdraw-submit-btn',
  'withdraw-verify-strip', 'withdraw-verify-text', 'withdraw-verify-state', 'withdraw-rule-row',
  'asset-display-balance', 'asset-display-withdrawable'
].forEach(id => el(id));

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

const REAL = MockData.currentUser.realName;
const DEMO = {};
(MockData.assets.bankCardDemos || []).forEach(d => { DEMO[d.key] = d.cardNo; });

// ------------------------- 不合规存量样本注入器 -------------------------
// 演示台账本身只放 2 张合规借记卡（与上限 2 张一致，列表只展示 2 条记录）；
// 信用卡 / 异名卡这两个「不合规存量样本」由本脚本临时注入台账，
// 用于验证状态推导、待整改标签、换绑与「不合规卡不可设为默认」等分支。
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
const LEDGER_SEED = MockData.assets.bankCards.slice();
function pushLegacy(...keys) {
  keys.forEach(k => MockData.assets.bankCards.push(Object.assign({}, LEGACY[k])));
}
function restoreLedger() {
  MockData.assets.bankCards.splice(0, MockData.assets.bankCards.length);
  LEDGER_SEED.forEach(c => MockData.assets.bankCards.push(c));
}

// =========================================================================
console.log('== A. 数据层：绑卡规则 / BIN 号段 / 卡台账 ==');
const bindRules = MockData.assets.bankBindRules;
ok(!!bindRules, 'A01 bankBindRules 存在');
eq(bindRules.requireIdVerified, true, 'A02 【要求2】必须实名后方可绑定的开关为 true');
eq(bindRules.debitOnly, true, 'A03 【要求1】仅支持借记卡绑定的开关为 true');
eq(bindRules.unionPayOnly, true, 'A04 仅支持境内银联卡开关为 true');
eq(bindRules.sameNameOnly, true, 'A05 必须本人同名卡开关为 true');
eq(bindRules.codeRequired, true, 'A06 短信验证码校验开关为 true');
eq(bindRules.maxCards, 2, 'A07 【上限口径】绑卡张数上限收紧为 2 张');

const bins = MockData.assets.bankBinTable || [];
ok(bins.length >= 10, 'A08 BIN 号段表 ≥ 10 条', bins.length);
ok(bins.some(b => b.cardType === 'debit'), 'A09 BIN 表含借记卡号段');
ok(bins.some(b => b.cardType === 'credit'), 'A10 BIN 表含信用卡号段（用于演示拦截）');

const cards0 = MockData.assets.bankCards || [];
eq(cards0.length, 2, 'A11 演示台账固定 2 张（与「列表只显示两条记录」一致）');
ok(cards0.every(c => c.cardType === 'debit'), 'A12 台账只放借记卡（信用卡样本不进台账）');
ok(cards0.every(c => c.holder === REAL), 'A13 台账只放本人同名卡（异名卡样本不进台账）');
ok(cards0.some(c => c.isDefault), 'A13b 台账保留 1 张默认结算卡');
ok(cards0.every(c => App.luhnCheck(c.cardNo)), 'A14 台账每张卡号均通过 Luhn 校验');
ok(cards0.every(c => String(c.cardNo).slice(-4) === c.tail), 'A15 台账卡号末 4 位与 tail 一致');
ok(cards0.every(c => !!c.boundAt), 'A16 台账含绑定日期 boundAt');
eq((MockData.assets.bankCardDemos || []).length, 3, 'A17 演示卡号 3 张');

// =========================================================================
console.log('== B. 卡号工具：掩码 / Luhn / BIN 识别 ==');
eq(App.maskBankCardNo('6225881234521234'), '6225 **** **** 1234', 'B01 掩码格式 6225 **** **** 1234');
eq(App.maskBankCardNo('1234'), '1234', 'B02 短号原样返回（兜底）');
eq(App.luhnCheck('6225881234521234'), true, 'B03 Luhn 对合法卡号返回 true');
eq(App.luhnCheck('6225881234521235'), false, 'B04 Luhn 对末位改动的卡号返回 false');
eq(App.luhnCheck(''), false, 'B05 Luhn 对空串返回 false');

const dZm = App.detectBankCard(DEMO.debit);
eq(dZm.ok, true, 'B06 招行借记卡号段 → 识别成功');
eq(dZm.bank, '招商银行', 'B07 招行 BIN 622588 → 招商银行');
eq(dZm.cardType, 'debit', 'B08 622588 → 借记卡');
eq(dZm.tail, String(DEMO.debit).slice(-4), 'B09 识别结果带卡尾号');

const dGs = App.detectBankCard(DEMO.debit2);
eq(dGs.bank, '中国工商银行', 'B10 工行 BIN 622202 → 中国工商银行');
eq(dGs.cardType, 'debit', 'B11 622202 → 借记卡');

const dBoc = App.detectBankCard('6227601234596608');
eq(dBoc.cardType, 'credit', 'B12 622760（中行银联信用卡）→ 判为信用卡');
eq(dBoc.ok, true, 'B13 号段识别成功（卡种为信用卡，交由闸门拦截）');

const dIntl = App.detectBankCard('4532015112830366');
eq(dIntl.ok, false, 'B14 Visa 号段（未收录 BIN）→ 识别不通过');
has(dIntl.reason, '国际卡组织', 'B15 国际卡号段拒绝原因点明国际卡组织');
has(dIntl.reason, '银联借记卡', 'B16 国际卡号段拒绝原因点明仅支持境内银联借记卡');

const dShort = App.detectBankCard('62258812');
eq(dShort.ok, false, 'B17 位数不足 → 拒绝');
has(dShort.reason, '16-19', 'B18 位数不足拒绝原因给出位数要求');

const dLuhn = App.detectBankCard('6225881234521235');
eq(dLuhn.ok, false, 'B19 Luhn 不过 → 拒绝');
has(dLuhn.reason, 'Luhn', 'B20 Luhn 拒绝原因点明校验失败');

const dUnknown = App.detectBankCard('6234567890113452');
eq(dUnknown.ok, false, 'B21 未收录的 62 号段 → 拒绝（不静默放过）');
has(dUnknown.reason, '未能识别', 'B22 未识别号段给出明确原因');

const rulesBackup = MockData.assets.bankBindRules;
delete MockData.assets.bankBindRules;
const rDefault = App.getBankBindRules();
eq(rDefault.requireIdVerified, true, 'B23 缺配置时「必须实名」默认开启（安全兜底）');
eq(rDefault.debitOnly, true, 'B24 缺配置时「仅限借记卡」默认开启（安全兜底）');
eq(rDefault.maxCards, 2, 'B25 缺配置时张数上限回落 2（与当前口径一致）');
MockData.assets.bankBindRules = rulesBackup;

// =========================================================================
console.log('== C. 卡片可用状态推导 getBankCardStatus() ==');
const byId = (id) => MockData.assets.bankCards.find(c => c.id === id);
eq(App.getBankCardStatus(byId('BC1')).ok, true, 'C01 BC1 同名借记卡 → 可用');
eq(App.getBankCardStatus(byId('BC2')).ok, true, 'C02 BC2 同名借记卡 → 可用');
pushLegacy('credit', 'otherName');
const stBc3 = App.getBankCardStatus(byId('BC3'));
eq(stBc3.ok, false, 'C03 【注入样本】信用卡 → 不可用');
eq(stBc3.shortLabel, '非借记卡', 'C04 信用卡状态标签为「非借记卡」');
has(stBc3.reason, '仅支持绑定与使用银行借记卡', 'C05 信用卡原因点明仅支持借记卡');
const stBc4 = App.getBankCardStatus(byId('BC4'));
eq(stBc4.ok, false, 'C06 【注入样本】异名卡 → 不可用');
eq(stBc4.shortLabel, '非本人卡', 'C07 异名卡状态标签为「非本人卡」');
has(stBc4.reason, '李*华', 'C08 异名卡原因带持卡人姓名');
has(stBc4.reason, REAL, 'C09 异名卡原因带实名姓名');
restoreLedger();
eq(MockData.assets.bankCards.length, 2, 'C09b 样本注入验证后台账已还原为 2 张');

MockData.currentUser.idVerified = false;
const stUnverified = App.getBankCardStatus(byId('BC1'));
eq(stUnverified.ok, false, 'C10 【要求2】未实名时连合规卡也标记待实名');
has(stUnverified.reason, '实名', 'C11 未实名状态原因点明实名认证');
MockData.currentUser.idVerified = true;
eq(App.getBankCardStatus(byId('BC1')).ok, true, 'C12 恢复实名后合规卡重新可用');

// =========================================================================
console.log('== D. 绑定校验闸门 validateBankCardBind() ==');
// 本组单独校验「张数上限之外」的闸门，先临时放开上限（上限口径单列于 D 组·上限）
const capBackupD = MockData.assets.bankBindRules.maxCards;
MockData.assets.bankBindRules.maxCards = 99;
MockData.currentUser.idVerified = false;
const vUnverified = App.validateBankCardBind(DEMO.debit, REAL, {});
eq(vUnverified.ok, false, 'D01 【要求2】未实名 → 拒绝');
eq(vUnverified.gate, 'id-verified', 'D02 未实名拦截闸门 = id-verified');
has(vUnverified.reason, '实名', 'D02b 未实名拦截原因点明实名认证');
MockData.currentUser.idVerified = true;

const vOk = App.validateBankCardBind(DEMO.debit, REAL, {});
eq(vOk.ok, true, 'D03 合法借记卡 + 本人同名 → 通过');
eq(vOk.bank, '招商银行', 'D04 通过结果带回发卡行');
eq(vOk.cardType, 'debit', 'D05 通过结果卡种为借记卡');

const vName = App.validateBankCardBind(DEMO.debit, '李*华', {});
eq(vName.ok, false, 'D06 持卡人非本人 → 拒绝');
eq(vName.gate, 'same-name', 'D07 同名闸门 = same-name');
eq(App.validateBankCardBind(DEMO.debit, '', {}).gate, 'same-name', 'D08 持卡人留空 → 同名闸门拦截并提示填写');

const vCredit = App.validateBankCardBind(DEMO.credit, REAL, {});
eq(vCredit.ok, false, 'D09 【要求1】信用卡号 → 拒绝');
has(vCredit.reason, '仅支持绑定银行借记卡', 'D10 信用卡拒绝原因点明仅支持借记卡');

const vCredit2 = App.validateBankCardBind('6227601234596608', REAL, {});
eq(vCredit2.ok, false, 'D11 【要求1】银联信用卡（62 开头）同样被拒');
eq(vCredit2.gate, 'debit-only', 'D12 银联信用卡走「仅限借记卡」闸门');

const vDup = App.validateBankCardBind(byId('BC1').cardNo, REAL, {});
eq(vDup.ok, false, 'D13 已绑卡号重复绑定 → 拒绝');
eq(vDup.gate, 'duplicate', 'D14 重复绑定闸门 = duplicate');
has(vDup.reason, '已绑定', 'D15 重复绑定原因点明已绑定');

// D 组·上限：张数上限口径（按在册卡位计）——演示台账 2 张已正好触及上限 2 张
MockData.assets.bankBindRules.maxCards = 2;
const vMax = App.validateBankCardBind(DEMO.debit, REAL, {});
eq(vMax.ok, false, 'D16 【上限口径】在册卡位已达上限 → 拒绝新增绑定');
eq(vMax.gate, 'max-cards', 'D17 张数上限闸门 = max-cards');
has(vMax.reason, '最多绑定 2 张', 'D18 张数上限原因给出上限文案');
has(vMax.reason, '当前在册 2 张', 'D18b 上限拦截原因带出当前在册张数');

// 「解绑 → 再绑定」收敛闭环：腾出卡位后即可再次新增绑定
MockData.assets.bankCards.splice(1, 1);   // 暂时解绑 BC2，台账剩 1 张
eq(App.validateBankCardBind(DEMO.debit, REAL, {}).ok, true, 'D18c 解绑腾出卡位后 → 可再次绑定');
eq(App.renderBankCardBlocks(), undefined, 'D18d 解绑后渲染不报错');
restoreLedger();
eq(MockData.assets.bankCards.length, 2, 'D18e 断言后台账已还原为 2 张');
MockData.assets.bankBindRules.maxCards = capBackupD;

eq(App.validateBankCardBind(byId('BC1').cardNo, REAL, { excludeId: 'BC1' }).ok, true,
  'D19 换绑模式排除原卡 → 同卡号可通过（允许占用自身卡位）');
eq(App.validateBankCardBind(byId('BC2').cardNo, REAL, { excludeId: 'BC1' }).gate, 'duplicate',
  'D20 换绑模式占用其他卡号 → 仍判重复');

// =========================================================================
console.log('== E. 入口迁移：卡能力由安全设置迁至常用功能「银行卡管理」 ==');
App.renderBankCardBlocks();

// ① 主面板三个旧节点已随「入口收敛」移除：HTML 与 JS 双向确认无残留
eq(/id="bank-card-list"/.test(HTML), false, 'E01 index.html 不再含主面板银行卡列表容器');
eq(/id="bank-card-count"/.test(HTML), false, 'E02 index.html 不再含主面板已绑定卡数');
eq(/id="bank-card-bind-entry"/.test(HTML), false, 'E03 index.html 不再含主面板绑卡入口');
eq(/getElementById\(\s*['"]bank-(?:card-list|card-count|card-bind-entry)['"]\s*\)/.test(APP_SRC), false,
  'E04 app.js 不再渲染主面板银行卡节点（无死引用）');
const panelStart = HTML.indexOf('<!-- 资产安全中心 -->');
const panelEnd = HTML.indexOf('<!-- 我的权益与特权');
ok(panelStart !== -1 && panelEnd !== -1 && panelEnd > panelStart, 'E05 资产安全中心主面板区块可定位');
const panelBlock = HTML.slice(panelStart, panelEnd);
has(panelBlock, '前往安全设置', 'E06 主面板保留【前往安全设置 >】入口');
notHas(panelBlock, 'bank-card', 'E07 主面板不再出现任何银行卡节点 / 类名（卡能力已迁至常用功能）');

// ② 旧「安全设置银行卡管理分区」节点已整体移除（HTML 与 JS 双向确认无残留）
eq(/id="security-bank-card-(?:list|add|tip)"/.test(HTML), false, 'E08 index.html 不再含安全设置银行卡三节点');
eq(/['"]security-bank-card-(?:list|add|tip)['"]/.test(APP_SRC), false, 'E09 app.js 无安全设置银行卡节点死引用');

// ③ 常用功能宫格：5 项（合作账单 / 更多功能 / 礼品卡 / 积分兑换 均已下线）
eq(APP_SRC.indexOf("name === '银行卡管理'") >= 0, true, 'E10 handleCommonFuncClick 含「银行卡管理」路由');
has(APP_SRC, 'this.openBankCardManageModal()', 'E11 路由指向 openBankCardManageModal');
has(MOCK_SRC, 'name: "银行卡管理"', 'E12 常用功能宫格含「银行卡管理」条目');
const ctBlock = MOCK_SRC.slice(MOCK_SRC.indexOf('commonTools:'), MOCK_SRC.indexOf('helpFaq:'));
eq(count(ctBlock, /\{ name: "/g), 5, 'E13c 常用功能共 5 项（合作账单/更多功能/礼品卡/积分兑换已下线）');
notHas(ctBlock, '合作账单', 'E13e 「合作账单」已从常用功能下线');
notHas(ctBlock, '更多功能', 'E13f 「更多功能」已从常用功能下线');
notHas(ctBlock, '礼品卡', 'E13i 「礼品卡」已从常用功能下线');
notHas(ctBlock, '积分兑换', 'E13j 「积分兑换」已从常用功能下线');
notHas(MOCK_SRC, 'giftCards:', 'E13k mock 已无礼品卡台账');
notHas(MOCK_SRC, 'pointExchange:', 'E13l mock 已无积分兑换台账');
eq(/id="modal-gift-card"/.test(HTML), false, 'E13m index.html 已无礼品卡弹窗');
eq(/id="modal-points-exchange"/.test(HTML), false, 'E13n index.html 已无积分兑换弹窗');
notHas(APP_SRC, "'合作账单'", 'E13g handleCommonFuncClick 已无「合作账单」分支');
notHas(APP_SRC, "'更多功能'", 'E13h handleCommonFuncClick 已无「更多功能」分支');
notHas(APP_SRC, "'礼品卡'", 'E13o handleCommonFuncClick 已无「礼品卡」分支');
notHas(APP_SRC, "'积分兑换'", 'E13p handleCommonFuncClick 已无「积分兑换」分支');
has(CSS, 'grid-template-columns: repeat(3, 1fr)', 'E13d 宫格样式改为 3 列（3 × 3）');

App.openBankCardManageModal();
const manageHtml = el('bank-manage-list').innerHTML;
eq(count(manageHtml, /class="bank-card-row/g), 2, 'E14 【两条记录】银行卡管理列表只渲染 2 行');
has(manageHtml, '6225 **** **** 1234', 'E15 展示掩码卡号');
has(manageHtml, '默认结算卡', 'E16 标注默认结算卡');
has(manageHtml, '>换绑<', 'E18 可用卡给出「换绑」按钮');
has(manageHtml, '尾号 5678', 'E19 展示卡尾号');
notHas(manageHtml, 'is-mini', 'E22 已无主面板紧凑态渲染');
has(manageHtml, 'bank-card-meta', 'E23 展示持卡人 / 支行 / 绑定日期');
has(manageHtml, '设为默认', 'E24 给出「设为默认」操作');
has(manageHtml, '解绑', 'E25 给出「解绑」操作');
has(manageHtml, '默认卡不可解绑', 'E26 默认结算卡明确不可解绑');

// ③b 注入不合规存量样本：待整改标签与「去换绑 / 解绑」主操作仍然齐备
pushLegacy('credit', 'otherName');
App.renderBankCardBlocks();
const legacyHtml = el('bank-manage-list').innerHTML;
eq(count(legacyHtml, /class="bank-card-row/g), 4, 'E17b 注入 2 张样本后渲染 4 行');
has(legacyHtml, '去换绑', 'E17 不合规卡给出「去换绑」主按钮');
has(legacyHtml, '非借记卡', 'E20 标记信用卡状态标签');
has(legacyHtml, '非本人卡', 'E21 标记异名卡状态标签');
has(legacyHtml, '>解绑</button>', 'E27 待整改存量卡也可直接解绑（用于腾出卡位）');
has(el('bank-manage-tip').innerText, '超出上限', 'E27b 存量超限时给出「已超出上限」提示');
restoreLedger();
App.renderBankCardBlocks();

has(el('bank-manage-rule-row').innerHTML, '最多 2 张', 'E28 口径 chips 声明上限为 2 张');
has(el('bank-manage-rule-row').innerHTML, '仅限借记卡', 'E29 口径 chips 声明仅限借记卡');
const mnTip = el('bank-manage-tip');
has(mnTip.innerText, '仅支持绑定本人同名境内银联借记卡', 'E30 弹窗给出绑定口径说明');
has(mnTip.innerText, '已绑定 2 / 2 张', 'E31 弹窗给出已绑定张数统计（2 / 2）');
has(mnTip.innerText, '2 张可用', 'E32 弹窗给出可用张数统计');
has(mnTip.innerText, '已达上限', 'E33 台账正好触达上限时给出「已达上限」提示');
has(HTML, 'id="bank-manage-add"', 'E34 绑定入口为静态节点（已实名时可点）');
eq(el('bank-manage-add').classList.contains('is-disabled'), false, 'E35 已实名时绑定入口不置灰');

// ④ 安全设置弹窗已不再承载银行卡分区
App.openSecuritySettings();
const secBody = el('security-settings-body').innerHTML;
has(secBody, '个人信息', 'E36 安全设置仍承载个人信息');
has(secBody, '安全防护', 'E37 安全设置仍承载安全防护');
notHas(secBody, '银行卡', 'E38 【迁移】安全设置弹窗已无银行卡分区');
notHas(secBody, 'security-bank-card', 'E39 安全设置弹窗无银行卡节点残留');

// =========================================================================
console.log('== F. 绑卡弹窗：模式切换 / 实时识别 ==');
App.openBankCardBindModal('bind');
eq(el('bank-bind-title').innerText, '绑定银行卡', 'F01 bind 模式标题为「绑定银行卡」');
eq(el('bank-bind-holder').value, REAL, 'F02 持卡人预填实名姓名');
eq(el('bank-bind-cardno').value, '', 'F03 卡号输入框已清空');
eq(el('bank-bind-submit-btn').innerText, '确认绑定', 'F04 提交按钮文案为「确认绑定」');
eq(el('bank-bind-rebind-strip').classList.contains('is-on'), false, 'F05 bind 模式不显示待换绑原卡条');

pushLegacy('credit');
App.openBankCardBindModal('rebind', 'BC3');
eq(el('bank-bind-title').innerText, '换绑银行卡', 'F06 rebind 模式标题为「换绑银行卡」');
has(el('bank-bind-sub').innerText, '尾号 6608', 'F07 rebind 副标题回显原卡尾号');
has(el('bank-bind-rebind-strip').innerHTML, '尾号 6608', 'F08 回显待换绑原卡');
eq(el('bank-bind-rebind-strip').classList.contains('is-on'), true, 'F09 rebind 模式显示待换绑原卡条');
eq(el('bank-bind-submit-btn').innerText, '确认换绑', 'F10 提交按钮文案为「确认换绑」');
restoreLedger();
App.openBankCardBindModal('bind');

eq(el('bank-bind-verify-state').innerText, '已实名', 'F11 实名状态条显示「已实名」');
has(el('bank-bind-verify-text').innerText, REAL, 'F12 实名状态条带实名姓名');
has(el('bank-bind-rule-row').innerHTML, '仅限借记卡', 'F13 规则 chips 声明仅限借记卡');
has(el('bank-bind-rule-row').innerHTML, '仅限本人卡', 'F14 规则 chips 声明仅限本人卡');
has(el('bank-bind-rule-row').innerHTML, '必须已实名', 'F15 规则 chips 声明必须已实名');

const detect = el('bank-bind-detect');
el('bank-bind-cardno').value = '';
App.onBankCardNoInput();
has(detect.innerText, '自动识别发卡行与卡种', 'F16 空输入给出识别说明基线');
eq(detect.classList.contains('is-error'), false, 'F17 空输入不误判为错误');
eq(detect.classList.contains('is-ok'), false, 'F18 空输入不误判为通过');

App.fillBankCardDemo('debit');
has(detect.innerText, '招商银行', 'F19 合法借记卡实时识别出发卡行');
has(detect.innerText, '借记卡', 'F20 合法借记卡实时识别为借记卡');
eq(detect.classList.contains('is-ok'), true, 'F21 合法借记卡识别态为 is-ok');
has(el('bank-bind-cardno').value, ' ', 'F22 输入框按 4 位分组格式化');

App.fillBankCardDemo('credit');
eq(detect.classList.contains('is-error'), true, 'F23 【要求1】信用卡号识别态为 is-error');
has(detect.innerText, '仅支持绑定银行借记卡', 'F24 信用卡识别提示点明仅支持借记卡');

App.fillBankCardDemo('debit2');
has(detect.innerText, '中国工商银行', 'F25 工行借记卡实时识别出发卡行');

el('bank-bind-cardno').value = '6225881234521235';
App.onBankCardNoInput();
eq(detect.classList.contains('is-error'), true, 'F26 Luhn 失败的卡号识别态为 is-error');
has(detect.innerText, 'Luhn', 'F27 Luhn 失败提示点明校验失败');

// =========================================================================
console.log('== G. 提交绑卡：闸门拦截与落库 ==');
const balanceBefore = num(MockData.assets.cards.balance);
const withdrawableBefore = num(MockData.assets.cards.withdrawable);
const txCountBefore = MockData.assets.transactions.length;

// G 组一：未实名
MockData.currentUser.idVerified = false;
App.openBankCardBindModal('bind');
el('bank-bind-cardno').value = DEMO.debit;
securityOpenedWith = null;
resetToast();
App.submitBankCardBind();
has(lastToast(), '实名', 'G01 【要求2】未实名提交绑定被拦截');
has(lastToast(), '不能绑定银行卡', 'G02 未实名拦截文案明确不允许绑定');
eq(securityOpenedWith, '实名认证', 'G03 未实名拦截后引导前往实名认证');
eq(el('bank-bind-verify-state').innerText, '未实名', 'G04 未实名时状态条转「未实名」');
eq(el('bank-bind-verify-strip').classList.contains('is-unverified'), true, 'G05 未实名时状态条带 is-unverified');
eq(el('bank-bind-submit-btn').classList.contains('is-disabled'), true, 'G06 未实名时提交按钮置灰');
has(el('bank-bind-rule-row').innerHTML, 'is-error', 'G07 未实名时首条规则 chip 标红');
eq(MockData.assets.bankCards.length, 2, 'G08 未实名拦截后台账零变动');
MockData.currentUser.idVerified = true;

// G 组二：验证码
// 验证码闸门位于张数上限闸门之后，本组先临时放开上限（上限口径单列于 G 组四）
const capBackupG = MockData.assets.bankBindRules.maxCards;
MockData.assets.bankBindRules.maxCards = 99;
App.openBankCardBindModal('bind');
el('bank-bind-cardno').value = DEMO.debit;
resetToast();
App.submitBankCardBind();
has(lastToast(), '获取验证码', 'G09 未获取验证码 → 拦截并提示先获取');

App.sendBankBindCode();
const realCode = App._bankBind.code;
ok(/^\d{6}$/.test(realCode), 'G10 验证码为 6 位数字');
eq(el('bank-bind-code-btn').innerText, '已发送', 'G11 获取验证码后按钮转为已发送');
resetToast();
el('bank-bind-code').value = '000000';
App.submitBankCardBind();
has(lastToast(), '不正确', 'G12 验证码错误 → 拦截');
resetToast();
el('bank-bind-code').value = '12345';
App.submitBankCardBind();
has(lastToast(), '6 位', 'G13 验证码位数不足 → 拦截');
eq(MockData.assets.bankCards.length, 2, 'G14 验证码未通过时台账零变动');

// G 组三：卡种与同名闸门
el('bank-bind-code').value = realCode;
el('bank-bind-cardno').value = DEMO.credit;
resetToast();
App.submitBankCardBind();
has(lastToast(), '仅支持绑定银行借记卡', 'G15 【要求1】信用卡提交被拦截');
eq(MockData.assets.bankCards.length, 2, 'G16 信用卡拦截后台账零变动');

el('bank-bind-cardno').value = DEMO.debit;
el('bank-bind-holder').value = '李*华';
resetToast();
App.submitBankCardBind();
has(lastToast(), '仅支持绑定本人银行卡', 'G17 异名持卡人提交被拦截');
eq(MockData.assets.bankCards.length, 2, 'G18 异名拦截后台账零变动');

// G 组四：闸六 张数上限（生产台账已满 2 张 = 上限 2 张，新增绑定应被拦截）
MockData.assets.bankBindRules.maxCards = 2;
el('bank-bind-holder').value = REAL;
el('bank-bind-cardno').value = DEMO.debit;
resetToast();
App.submitBankCardBind();
has(lastToast(), '最多绑定 2 张', 'G19 【上限口径】在册卡位超限 → 新增绑定被拦截');
eq(MockData.assets.bankCards.length, 2, 'G19b 超限拦截后台账零变动');

// G 组四·补：腾出卡位后成功绑定（已达上限「解绑 → 再绑定」收敛闭环）
const freedCards = MockData.assets.bankCards.splice(0, MockData.assets.bankCards.length);
MockData.assets.bankCards.push(freedCards[0]);   // 仅保留 BC1 占位，其余暂时移出
resetToast();
el('bank-bind-holder').value = REAL;
el('bank-bind-cardno').value = DEMO.debit;
el('bank-bind-branch').value = '南京新街口支行';
App.submitBankCardBind();
eq(MockData.assets.bankCards.length, 2, 'G20 解绑至上限以内 → 绑定成功，台账 1 → 2');
const newCard = MockData.assets.bankCards[1];
eq(newCard.bank, '招商银行', 'G21 新卡发卡行正确写入');
eq(newCard.cardType, 'debit', 'G22 新卡卡种为借记卡');
eq(newCard.tail, String(DEMO.debit).slice(-4), 'G23 新卡尾号正确写入');
eq(newCard.holder, REAL, 'G24 新卡持卡人写入实名姓名');
eq(newCard.isDefault, false, 'G25 新卡默认不是结算卡');
ok(!!newCard.boundAt, 'G26 新卡写入绑定日期');
has(lastToast(), '绑定成功', 'G27 绑定成功 Toast 已弹出');
has(lastToast(), '尾号 ' + newCard.tail, 'G28 成功 Toast 带新卡尾号');
eq(el('modal-bank-card-bind').classList.contains('active'), false, 'G29 绑定成功后关闭绑卡弹窗');

// G 组五：闭环与账务隔离
const acctNew = App.validateWithdrawAccount(newCard.id);
eq(acctNew.ok, true, 'G30 🔗 新绑卡立即可用于提现收款（与提现闭环）');
// 2026-09-24 起充值改为微信 / 支付宝官方收款二维码，银行卡不再承担充值付款
ok(!App.validateRechargeCard, 'G31 🔗 充值侧已无validateRechargeCard（充值不再走银行卡）');
eq(App.getRechargeRules().qrOnly, true, 'G31b 🔗 充值渠道收敛为官方收款二维码（与绑卡台账解耦）');
App.renderWithdrawAccounts();
const sel = el('withdraw-account-select');
eq(count(sel.innerHTML, /<option /g), MockData.assets.bankCards.length, 'G32 提现下拉同步收敛（绑定即生效）');
eq(num(MockData.assets.cards.balance), balanceBefore, 'G33 【红线】绑卡不改动账户总额');
eq(num(MockData.assets.cards.withdrawable), withdrawableBefore, 'G34 【红线】绑卡不改动可提现余额');
eq(num(MockData.assets.cards.balance) - num(MockData.assets.cards.withdrawable), 1500, 'G35 【红线】绑卡后冻结额恒等式仍成立');
eq(MockData.assets.transactions.length, txCountBefore, 'G36 【红线】绑卡不写入资产流水');

// G 组六：还原生产台账（2 张合规卡）并注入不合规存量样本，供后续换绑 / 解绑组使用
MockData.assets.bankBindRules.maxCards = capBackupG;
MockData.assets.bankCards.splice(0, MockData.assets.bankCards.length);
freedCards.forEach(c => MockData.assets.bankCards.push(c));
pushLegacy('credit', 'otherName');
eq(MockData.assets.bankCards.length, 4, 'G37 断言后台账 = 2 张生产卡 + 2 张注入样本');
eq(MockData.assets.bankCards.some(c => c.id === 'BC3'), true, 'G38 信用卡待整改样本已在册（供换绑组使用）');

// =========================================================================
console.log('== H. 换绑：替换不合规存量卡 ==');
App.openBankCardBindModal('rebind', 'BC3');
App.sendBankBindCode();
el('bank-bind-code').value = App._bankBind.code;
el('bank-bind-cardno').value = DEMO.debit2;
el('bank-bind-branch').value = '南京城中支行';
resetToast();
App.submitBankCardBind();
eq(MockData.assets.bankCards.length, 4, 'H01 换绑不新增卡位（台账仍 4 张）');
const bc3 = MockData.assets.bankCards.find(c => c.id === 'BC3');
eq(bc3.bank, '中国工商银行', 'H02 换绑后发卡行被替换');
eq(bc3.cardType, 'debit', 'H03 换绑后卡种由信用卡转为借记卡');
eq(bc3.tail, String(DEMO.debit2).slice(-4), 'H04 换绑后卡尾号被替换');
eq(bc3.cardNo, DEMO.debit2, 'H05 换绑后卡号被替换');
eq(App.getBankCardStatus(bc3).ok, true, 'H06 换绑后该卡转为「可用」');
eq(App.validateWithdrawAccount('BC3').ok, true, 'H07 🔗 换绑成功后该卡可用于提现');
has(lastToast(), '换绑成功', 'H08 换绑成功 Toast 已弹出');
has(lastToast(), '尾号 6608', 'H09 换绑 Toast 声明原卡已解绑（带旧卡尾号）');
has(el('bank-bind-sub').innerText, '尾号 6608', 'H10 换绑副标题仍保留原卡信息（进入前）');

// 换绑默认结算卡：默认标记应保留
const newNoForBc1 = '6225883456734321';
App.openBankCardBindModal('rebind', 'BC1');
App.sendBankBindCode();
el('bank-bind-code').value = App._bankBind.code;
el('bank-bind-cardno').value = newNoForBc1;
resetToast();
App.submitBankCardBind();
const bc1 = MockData.assets.bankCards.find(c => c.id === 'BC1');
eq(bc1.isDefault, true, 'H11 换绑默认结算卡后默认标记保留');
eq(bc1.tail, '4321', 'H12 换绑默认卡后卡尾号同步更新');

// 换绑占用他卡卡号 → 拦截
App.openBankCardBindModal('rebind', 'BC1');
App.sendBankBindCode();
el('bank-bind-code').value = App._bankBind.code;
el('bank-bind-cardno').value = DEMO.debit2;
resetToast();
App.submitBankCardBind();
has(lastToast(), '已绑定', 'H13 换绑占用其他卡卡号 → 拦截');
eq(MockData.assets.bankCards.find(c => c.id === 'BC1').tail, '4321', 'H14 拦截后原卡未被改动');

// =========================================================================
console.log('== I. 设为默认 / 解绑 ==');
const bc2 = MockData.assets.bankCards.find(c => c.id === 'BC2');
resetToast();
App.setPayoutBankCard('BC2');
eq(bc2.isDefault, true, 'I01 设为默认结算卡生效');
eq(MockData.assets.bankCards.find(c => c.id === 'BC1').isDefault, false, 'I02 原默认卡被取消默认');
has(lastToast(), '设为默认结算卡', 'I03 设为默认给出 Toast 反馈');

resetToast();
App.setPayoutBankCard('BC4');
eq(MockData.assets.bankCards.find(c => c.id === 'BC4').isDefault, false, 'I04 不合规卡不可设为默认');
has(lastToast(), '仅支持绑定本人银行卡', 'I05 不合规卡设为默认被拒并给出原因');

resetToast();
App.armUnbindBankCard('BC2');
has(lastToast(), '默认结算卡不可解绑', 'I06 默认结算卡解绑被拒');
eq(App._unbindConfirmId, '', 'I07 被拒后不进入二次确认态');

App.setPayoutBankCard('BC1');
App.renderBankCardBlocks();
App.armUnbindBankCard('BC2');
eq(App._unbindConfirmId, 'BC2', 'I08 非默认卡解绑进入二次确认态');
has(el('bank-manage-list').innerHTML, '确认解绑', 'I09 二次确认展示「确认解绑」');
App.cancelUnbindBankCard();
eq(App._unbindConfirmId, '', 'I10 取消二次确认生效');
notHas(el('bank-manage-list').innerHTML, '确认解绑', 'I11 取消后不再展示二次确认');

const countBefore = MockData.assets.bankCards.length;
resetToast();
App.confirmUnbindBankCard('BC2');
eq(MockData.assets.bankCards.length, countBefore - 1, 'I12 确认解绑后台账 -1');
eq(MockData.assets.bankCards.some(c => c.id === 'BC2'), false, 'I13 被解绑卡已从台账移除');
has(lastToast(), '已解绑', 'I14 解绑成功 Toast 已弹出');
App.renderWithdrawAccounts();
eq(count(el('withdraw-account-select').innerHTML, /<option /g), MockData.assets.bankCards.length,
  'I15 解绑后提现下拉同步收敛');

// =========================================================================
console.log('== J. 静态契约 ==');
const modalStart = HTML.indexOf('<!-- 7. 银行卡绑定与换绑弹窗');
const modalEnd = HTML.indexOf('<!-- 创作者主页抽屉 -->');
ok(modalStart !== -1 && modalEnd !== -1, 'J01 绑卡弹窗区块可定位');
const modalBlock = HTML.slice(modalStart, modalEnd);
['modal-bank-card-bind', 'bank-bind-title', 'bank-bind-sub', 'bank-bind-verify-strip',
  'bank-bind-verify-text', 'bank-bind-verify-state', 'bank-bind-rule-row', 'bank-bind-rebind-strip',
  'bank-bind-holder', 'bank-bind-cardno', 'bank-bind-detect', 'bank-bind-demo', 'bank-bind-branch',
  'bank-bind-code', 'bank-bind-code-btn', 'bank-bind-hint', 'bank-bind-submit-btn'].forEach(id => {
  has(modalBlock, `id="${id}"`, `J02 绑卡弹窗含 #${id}`);
});
eq(count(modalBlock, /<div\b/g), count(modalBlock, /<\/div>/g), 'J03 绑卡弹窗 div 标签配对');
has(modalBlock, 'onclick="App.submitBankCardBind()"', 'J04 提交按钮绑定 submitBankCardBind');
has(modalBlock, 'onclick="App.sendBankBindCode()"', 'J05 获取验证码按钮绑定 sendBankBindCode');
has(modalBlock, '仅支持绑定本人同名境内银联借记卡（储蓄卡）', 'J06 副标题声明仅支持本人同名借记卡');

ok(!/id="bank-card-list"/.test(HTML), 'J07 【入口收敛】主面板不再含银行卡列表容器');
ok(!/id="bank-card-count"/.test(HTML), 'J08 【入口收敛】主面板不再含已绑定卡数');
ok(!/id="bank-card-bind-entry"/.test(HTML), 'J09 【入口收敛】主面板不再含绑定入口');
ok(!/id="security-bank-card-list"/.test(HTML), 'J09b 【迁移】安全设置弹窗不再含银行卡节点');

// 银行卡管理弹窗（静态契约：入口＝常用功能「银行卡管理」）
const mgStart = HTML.indexOf('<!-- 7.1 银行卡管理弹窗');
const mgEnd = HTML.indexOf('<!-- 创作者主页抽屉 -->');
ok(mgStart !== -1 && mgEnd !== -1 && mgEnd > mgStart, 'J09c 银行卡管理弹窗区块可定位');
const mgBlock = HTML.slice(mgStart, mgEnd);
['modal-bank-card-manage', 'bank-manage-rule-row', 'bank-manage-list',
  'bank-manage-tip', 'bank-manage-add'].forEach(id => {
  has(mgBlock, `id="${id}"`, `J09d 银行卡管理弹窗含 #${id}`);
});
eq(count(mgBlock, /<div\b/g), count(mgBlock, /<\/div>/g), 'J09e 银行卡管理弹窗 div 标签配对');
has(mgBlock, 'onclick="App.openBankCardBindModal(\'bind\')"', 'J09f 弹窗内绑定入口指向 openBankCardBindModal');
has(APP_SRC, "name === '银行卡管理'", 'J10 常用功能「银行卡管理」路由已接线');
const wdStart = HTML.indexOf('<!-- 5. 申请提现弹窗');
const wdEnd = HTML.indexOf('<!-- 6. 人民币账户充值弹窗');
has(HTML.slice(wdStart, wdEnd), 'App.openBankCardBindModal(\'bind\')', 'J11 提现弹窗内提供快捷绑卡入口');
eq(count(HTML, /App\.openModal\('modal-withdraw'\)/g), 0, 'J12 【入口收敛】index.html 无裸开提现弹窗');

const newFns = ['getBankBindRules', 'getBankCards', 'maskBankCardNo', 'luhnCheck', 'detectBankCard',
  'getBankCardStatus', 'validateBankCardBind', 'bankCardRowHtml', 'renderBankCardBlocks', 'openBankCardManageModal',
  'openBankCardBindModal', 'refreshBankBindPanel', 'onBankCardNoInput', 'fillBankCardDemo',
  'sendBankBindCode', 'submitBankCardBind', 'setPayoutBankCard', 'armUnbindBankCard',
  'cancelUnbindBankCard', 'confirmUnbindBankCard', 'refreshBankCardViews'];
let dupFns = [];
newFns.forEach(fn => {
  const n = count(APP_SRC, new RegExp('\\n  ' + fn + ': function', 'g'));
  if (n !== 1) dupFns.push(`${fn}×${n}`);
});
eq(dupFns.length, 0, 'J13 新增方法定义均唯一（无重复覆盖）', dupFns.join(', '));

['bank-card-block-tip', 'bank-card-list', 'bank-card-row', 'bank-card-logo', 'bank-card-no',
  'bank-card-tags', 'bank-card-tag', 'bank-card-invalid-reason', 'bank-card-meta',
  'bank-card-actions', 'bank-card-act', 'bank-card-act-hint', 'bank-card-empty',
  'bank-card-list-full', 'bank-card-block-add-row', 'bank-card-add-btn',
  'withdraw-add-card-row', 'withdraw-add-card-link',
  'bank-bind-rebind-strip', 'bank-bind-rebind-label', 'bank-bind-rebind-card',
  'bank-bind-detect', 'bank-bind-demo', 'bank-bind-demo-chip',
  'bank-bind-code-row', 'bank-bind-code-btn', 'bank-bind-hint'].forEach(c => {
  has(CSS, '.' + c, `J14 样式类 .${c} 已定义`);
});
has(CSS, '.bank-card-tag.is-default', 'J15 默认结算卡标签样式已定义');
has(CSS, '.bank-card-tag.is-invalid', 'J16 不合规卡标签样式已定义');
has(CSS, '.bank-bind-detect.is-ok', 'J17 卡号识别通过态样式已定义');
has(CSS, '.bank-bind-detect.is-error', 'J18 卡号识别失败态样式已定义');
has(CSS, '.bank-card-act.is-danger', 'J19 解绑危险操作样式已定义');
has(CSS, '.bank-card-invalid-reason', 'J20 不合规原因提示样式已定义');
ok(!CSS.includes('.bank-card-row.is-mini'), 'J21 主面板紧凑态样式已随入口收敛移除');

// =========================================================================
console.log('== K. 回归 ==');
eq(typeof App.submitWithdraw, 'function', 'K01 提现引擎仍在');
eq(typeof App.validateWithdrawAccount, 'function', 'K02 提现四闸校验仍在');
eq(App.getWithdrawRules().maxPerTx, 10000, 'K03 提现单笔上限仍为 ¥10,000');
eq((MockData.assets.escrowProjects || []).length, 6, 'K04 托管台账 6 条未变');
const activeEscrow = MockData.assets.escrowProjects.filter(p => p.statusKey === 'active')
  .reduce((s, p) => s + p.amount, 0);
eq(activeEscrow, 1500, 'K05 进行中托管冻结合计仍为 ¥1,500');
eq(num(MockData.assets.cards.balance) - num(MockData.assets.cards.withdrawable), 1500,
  'K06 账户余额恒等式仍成立');
eq(typeof App.payFromAccountBalance, 'function', 'K07 统一余额支付引擎仍在');
eq(typeof App.openProPayQrModal, 'function', 'K08 Pro 扫码订阅入口未受影响');
eq(typeof App.openEscrowProgressModal, 'function', 'K09 托管进度弹窗入口未受影响');
eq((MockData.assets.security || []).length, 4, 'K10 资产安全中心安全要素未被破坏');

// =========================================================================
console.log('== L. 弹窗层级：下钻弹窗置顶 ==');
// 场景还原：常用功能【银行卡管理】弹窗 → 点【+ 绑定新银行卡】→ 绑定弹窗必须压在管理弹窗之上
const manageModal = el('modal-bank-card-manage');
const bindModal = el('modal-bank-card-bind');
manageModal.classList.remove('active');
bindModal.classList.remove('active');

// L1 单层弹窗：首个打开的弹窗不加 is-stacked（维持底座层级）
App.openModal('modal-bank-card-manage');
eq(manageModal.classList.contains('active'), true, 'L01 银行卡管理弹窗已打开');
eq(manageModal.classList.contains('is-stacked'), false, 'L02 首个弹窗不带 is-stacked（维持底座层级）');

// L2 下钻弹窗：管理弹窗仍开着时打开绑定弹窗 → 绑定弹窗置顶
App.openModal('modal-bank-card-bind');
eq(bindModal.classList.contains('active'), true, 'L03 绑定弹窗在管理弹窗之上打开');
eq(bindModal.classList.contains('is-stacked'), true, 'L04 【置顶】绑定弹窗自动加 is-stacked（压过父弹窗）');
eq(manageModal.classList.contains('is-stacked'), false, 'L05 父弹窗保持底座层级不被抬升（层级差稳定）');

// L3 真实入口路径复验：openBankCardManageModal() → openBankCardBindModal('bind')
manageModal.classList.remove('active');
bindModal.classList.remove('active');
App.openBankCardManageModal();
eq(manageModal.classList.contains('is-stacked'), false, 'L06 【入口路径】管理弹窗先开且不置顶');
App.openBankCardBindModal('bind');
eq(bindModal.classList.contains('is-stacked'), true, 'L07 【入口路径】点「绑定新银行卡」后绑定弹窗置顶');

// L4 层级阶梯（静态契约）：底座 1000 < 下钻 1100 < 二次确认 1200，且下钻规则不反压确认弹窗
const zBase = /\.modal-backdrop\s*\{[^}]*?z-index:\s*(\d+)/.exec(CSS);
const zStack = /\.modal-backdrop\.is-stacked:not\(\.modal-confirm-backdrop\)\s*\{[^}]*?z-index:\s*(\d+)/.exec(CSS);
const zConfirm = /\.modal-confirm-backdrop\s*\{[^}]*?z-index:\s*(\d+)/.exec(CSS);
ok(!!zBase && !!zStack && !!zConfirm, 'L08 三档 z-index 均可解析',
  JSON.stringify([zBase && zBase[1], zStack && zStack[1], zConfirm && zConfirm[1]]));
eq(Number(zBase[1]) < Number(zStack[1]), true, 'L09 下钻层级高于弹窗底座');
eq(Number(zStack[1]) < Number(zConfirm[1]), true, 'L10 二次确认层级高于下钻层级（确认弹窗恒在最前）');

// L5 复位：无兄弟弹窗时不带残留置顶态
bindModal.classList.remove('active');
manageModal.classList.remove('active');
App.openModal('modal-bank-card-bind');
eq(bindModal.classList.contains('is-stacked'), false, 'L11 无其他弹窗打开时不带 is-stacked（无残留）');
bindModal.classList.remove('active');

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
