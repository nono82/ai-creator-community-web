#!/usr/bin/env node
/**
 * SPEC-001「账号·实名与身份准入」自检 —— **冻结自检套件（契约先行）**
 * ---------------------------------------------------------------------------
 * ⚠️ **本套件是"红"的（已登记在 gates-baseline.json 的 l3ExpectedRed 中）**。
 *    它**不是回归防线**，而是 **SPEC-001 的待实现清单**：
 *    依 Constitution 原则 10 —— 「**先跑门禁拿到待实现清单，再动手写代码**；
 *    校验器是本轮 TODO 生成器，不是事后检查官」。
 *
 * 顺序（项目自己的「五道工序」）：
 *   契约先行 → **冻结自检（本文件）** → 最小实现 → 三道门禁 → 回填收敛
 *   ⇒ **必须先有本文件的断言，再有实现**；反过来（先实现后补断言）就是"照着实现写测试"，失去意义。
 *
 * 断言来源：`specs/001-identity-onboarding/spec.md` 的验收场景（SC-001-xx）。
 *   本套件**只覆盖第一刀的最小切片**（准入判定 + 年龄闸门 + 权益不回溯 + 双轨隔离），
 *   不覆盖第二刀（多账号集合 / 业务身份切换 / 权限矩阵落地 / 留存期限机制）。
 *
 * ---------------------------------------------------------------------------
 * 【本套件冻结的契约】（仅 4 项，最小集；实现必须逐字遵守 —— 命名即契约 CON-032）
 * ---------------------------------------------------------------------------
 *  ① `App.evaluateAgeGate(birthDate)` → `{ passed: boolean, reason: string }`
 *     · birthDate：'YYYY-MM-DD' | Date | null | 非法值
 *     · 以"今天"为基准：**未满 18 周岁 ⇒ passed=false**；**恰好年满 18 周岁当日 ⇒ passed=true**
 *     · **缺失 / 不可解析 ⇒ passed=false**（禁止"未提供即视为成年"，见 spec.md EX-001-13）
 *     · reason：非空字符串（失败必填；用于给出唯一原因）
 *
 *  ② `App.ADMISSION_ACTIONS` → string[5]
 *     · 恰为 ['acceptTask','publishTask','publishShowcase','withdraw','receiveSettlement']
 *
 *  ③ `App.checkAdmission(action)` → `{ allowed: boolean, missing: string[], guide: string }`
 *     · 全站**唯一**准入判定入口（FR-001-20）；**幂等且无副作用**（FR-001-26）
 *     · missing：缺失项的**中文名**数组（通过时为空数组）；缺失项名须含
 *       「实名认证」/「收款主体资格」（本套件按此措辞断言）
 *     · guide：**唯一引导入口**，值必须是 `App` 上**真实存在的方法名**（便于直接调用）
 *     · **不得过度拦截**：凭据齐备时须 `allowed=true`
 *
 *  ④ `MockData.currentUser.accountStatus` / `MockData.currentUser.merchantStatus`
 *     · accountStatus ∈ '正常' | '冻结' | '注销中' | '已注销'
 *     · merchantStatus ∈ '未入驻' | '入驻中' | '已入驻' | '入驻失败'
 *
 * 用法： node tools/wb-identity-admission-verify.js
 * 退出码 0 = 全过（第一刀已落地）；1 = 仍有待实现项
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const APP_SRC = fs.readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf8');
const MOCK_SRC = fs.readFileSync(path.join(ROOT, 'js', 'mock_data.js'), 'utf8');

// ------------------------- 最小 DOM 桩（与既有 10 套同构） -------------------------
class ClassList {
  constructor() { this.set = new Set(); }
  add(...c) { c.forEach((x) => this.set.add(x)); }
  remove(...c) { c.forEach((x) => this.set.delete(x)); }
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
    this.max = '';
    this.placeholder = '';
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
function el(id) {
  if (!registry.has(id)) registry.set(id, new El(id));
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

/** DOM 桩全局共享（便于回读 classList / innerText）；每次 load() 新建独立 vm 上下文 */
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
  vm.runInContext(APP_SRC + '\n;globalThis.__App = App;', sb, { filename: 'app.js' });
  return { App: vm.runInContext('__App', sb), MockData: vm.runInContext('MockData', sb), sandbox: sb };
}
function fresh() { return load(); }

// ------------------------- 断言累积 -------------------------
// ⚠️ 刻意分成两类计数 —— 否则进度会被"平凡通过"严重高估：
//   · ok(   ) → **功能断言**：断言某个能力/行为**存在且正确**。未实现时**必然失败** ⇒ 反映真实进度。
//   · okInv( ) → **不变量断言**：断言"某状态**不得变化**"。⚠️ 在能力尚未实现时，
//               因为"什么都没做"，不变量**会平凡通过（vacuous pass）** ⇒ **不代表已实现**。
let pass = 0;     // 功能断言通过
let passInv = 0;  // 不变量断言通过（未实现时可能平凡通过）
const fails = [];
const failsInv = [];
function ok(cond, msg) {
  if (cond) pass++;
  else fails.push(msg);
}
function okInv(cond, msg) {
  if (cond) passInv++;
  else failsInv.push(msg);
}
/** 安全调用：能力未实现时返回哨兵，避免整套崩掉（红套件必须能跑完，才能当 TODO 清单用） */
function safe(fn, dflt) {
  try { return fn(); } catch (e) { return dflt; }
}
const parse = (v) => parseFloat(String(v == null ? '0' : v).replace(/,/g, '')) || 0;
const near = (a, b) => Math.abs(Number(a) - Number(b)) < 0.005;

/** 造一个相对"今天"的日期串，保证断言不随时间失效（确定性） */
function birthDateYearsAgo(years, extraDays) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  if (extraDays) d.setDate(d.getDate() + extraDays);
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

const ACTIONS = ['acceptTask', 'publishTask', 'publishShowcase', 'withdraw', 'receiveSettlement'];

/** 把 currentUser 置为「未实名」并保留其余字段 */
function asUnverified(md) {
  md.currentUser.idVerified = false;
}

// ============================================================================
// A. 契约存在性（4 项）
// ============================================================================
{
  const { App, MockData } = fresh();
  ok(typeof App.evaluateAgeGate === 'function', 'A1 App.evaluateAgeGate 应为函数（年龄闸门契约，spec.md FR-001-45）');
  ok(typeof App.checkAdmission === 'function', 'A2 App.checkAdmission 应为函数（统一准入判定入口，FR-001-20）');
  ok(Array.isArray(App.ADMISSION_ACTIONS) && ACTIONS.every((a) => App.ADMISSION_ACTIONS.indexOf(a) >= 0),
    'A3 App.ADMISSION_ACTIONS 应含 5 个动作：' + ACTIONS.join(' / '));
  ok(['正常', '冻结', '注销中', '已注销'].indexOf(MockData.currentUser.accountStatus) >= 0,
    'A4 currentUser.accountStatus 应为四态之一（正常/冻结/注销中/已注销），实际 ' + JSON.stringify(MockData.currentUser.accountStatus));
  ok(['未入驻', '入驻中', '已入驻', '入驻失败'].indexOf(MockData.currentUser.merchantStatus) >= 0,
    'A5 currentUser.merchantStatus 应为四态之一（未入驻/入驻中/已入驻/入驻失败），实际 ' + JSON.stringify(MockData.currentUser.merchantStatus));
}

// ============================================================================
// B. 年龄闸门 App.evaluateAgeGate（6 项）—— SC-001-17 / SC-001-18 / EX-001-13
// ============================================================================
{
  const { App } = fresh();
  const call = (bd) => safe(() => App.evaluateAgeGate(bd), null);

  const r17 = call(birthDateYearsAgo(17));
  ok(!!r17 && r17.passed === false, 'B1【核心】未满 18 周岁应 passed=false（SC-001-17），实际 ' + JSON.stringify(r17));
  ok(!!r17 && typeof r17.reason === 'string' && r17.reason.length > 0, 'B2 未满 18 周岁应给出非空 reason');

  const r18 = call(birthDateYearsAgo(18));
  ok(!!r18 && r18.passed === true, 'B3【边界】恰好年满 18 周岁当日应 passed=true（SC-001-18），实际 ' + JSON.stringify(r18));

  const r24 = call(birthDateYearsAgo(24));
  ok(!!r24 && r24.passed === true, 'B4 已成年（24 岁）应 passed=true');

  const rNull = call(null);
  ok(!!rNull && rNull.passed === false, 'B5【核心】出生日期缺失时**不得默认放行**（EX-001-13），实际 ' + JSON.stringify(rNull));

  const rBad = call('not-a-date');
  ok(!!rBad && rBad.passed === false, 'B6 出生日期不可解析时**不得默认放行**，实际 ' + JSON.stringify(rBad));
}

// ============================================================================
// C. 准入判定 · 未实名必须拦截（7 项）—— SC-001-05
// ============================================================================
{
  const { App, MockData } = fresh();
  asUnverified(MockData);
  const r = safe(() => App.checkAdmission('withdraw'), null);

  ok(!!r && typeof r.allowed === 'boolean', 'C1 checkAdmission 应返回含 allowed 的对象');
  ok(!!r && Array.isArray(r.missing), 'C2 checkAdmission 应返回 missing 数组');
  ok(!!r && typeof r.guide === 'string', 'C3 checkAdmission 应返回 guide 字符串');
  ok(!!r && r.allowed === false, 'C4【核心】未实名时 withdraw 应 allowed=false（SC-001-05）');
  ok(!!r && r.missing.join('|').indexOf('实名认证') >= 0, 'C5 未实名时 missing 应含「实名认证」，实际 ' + JSON.stringify(r && r.missing));
  ok(!!r && !!r.guide && typeof App[r.guide] === 'function', 'C6 guide 应指向 App 上真实存在的方法（可执行引导），实际 ' + JSON.stringify(r && r.guide));

  const allBlocked = ACTIONS.every((a) => {
    const x = safe(() => App.checkAdmission(a), null);
    return !!x && x.allowed === false;
  });
  ok(allBlocked, 'C7【核心】未实名时**5 个动作全部**应被拦截（不得漏动作）');

  // C8 判定不得有副作用（FR-001-26）
  const { App: A2, MockData: M2 } = fresh();
  asUnverified(M2);
  const snap = (m) => JSON.stringify({ u: m.currentUser, e: m.assets.escrowProjects, t: m.assets.transactions, b: m.assets.cards });
  const before = snap(M2);
  ACTIONS.forEach((a) => safe(() => A2.checkAdmission(a), null));
  okInv(snap(M2) === before, 'C8【核心】准入判定必须幂等且无副作用（调用前后业务状态不得变化，FR-001-26）');
}

// ============================================================================
// D. 准入判定 · 不得过度拦截（3 项）
// ============================================================================
{
  const { App, MockData } = fresh();
  MockData.currentUser.idVerified = true;
  MockData.currentUser.accountStatus = '正常';
  const r = safe(() => App.checkAdmission('withdraw'), null);
  ok(!!r && r.allowed === true, 'D1 已实名 + 正常态时 withdraw 应 allowed=true（不得过度拦截）');
  ok(!!r && Array.isArray(r.missing) && r.missing.length === 0, 'D2 通过时 missing 应为空数组');

  const four = ['acceptTask', 'publishTask', 'publishShowcase', 'withdraw'];
  const allOpen = four.every((a) => {
    const x = safe(() => App.checkAdmission(a), null);
    return !!x && x.allowed === true;
  });
  ok(allOpen, 'D3 已实名 + 正常态时，仅需实名的 4 个动作应全部 allowed=true');
}

// ============================================================================
// E. 收款主体资格门控（3 项）—— SC-001-11 / FR-001-16 / CON-055
// ============================================================================
{
  const { App, MockData } = fresh();
  MockData.currentUser.idVerified = true;
  MockData.currentUser.accountStatus = '正常';
  MockData.currentUser.merchantStatus = '未入驻';

  const r = safe(() => App.checkAdmission('receiveSettlement'), null);
  ok(!!r && r.allowed === false, 'E1 未完成二级商户入驻时 receiveSettlement 应 allowed=false（FR-001-16）');
  ok(!!r && r.missing.join('|').indexOf('收款主体资格') >= 0, 'E2 missing 应含「收款主体资格」，实际 ' + JSON.stringify(r && r.missing));

  MockData.currentUser.merchantStatus = '已入驻';
  const r2 = safe(() => App.checkAdmission('receiveSettlement'), null);
  ok(!!r2 && r2.allowed === true, 'E3 已入驻后 receiveSettlement 应 allowed=true');
}

// ============================================================================
// F. 入口拦截 · 提现（5 项）—— SC-001-05 的可观察出口
// ============================================================================
{
  const { App, MockData } = fresh();
  asUnverified(MockData);
  const w = el('modal-withdraw');
  w.classList.remove('active');
  el('toast-message').innerText = '';

  const snap = () => ({
    balance: parse(MockData.assets.cards.balance),
    withdrawable: parse(MockData.assets.cards.withdrawable),
    earnings: parse(MockData.assets.cards.monthlyEarnings),
    frozen: (function () {
      const it = ((MockData.assets.breakdown && MockData.assets.breakdown.items) || []).find((i) => i.label === '冻结金额');
      return it ? Number(it.value) || 0 : NaN;
    })(),
    tx: (MockData.assets.transactions || []).length
  });
  const before = snap();
  safe(() => App.openWithdrawModal(), null);
  const after = snap();

  ok(!w.classList.contains('active'), 'F1【核心】未实名时 openWithdrawModal 应被拦截（modal-withdraw 不得打开）');
  okInv(near(before.balance, after.balance) && near(before.withdrawable, after.withdrawable)
    && near(before.earnings, after.earnings),
    'F2【核心】拦截后账户余额 / 可提现 / 创作收益应零变动');
  okInv(near(before.frozen, after.frozen), 'F3 拦截后冻结金额应零变动');
  okInv(before.tx === after.tx, 'F4 拦截后不得产生新流水');
  ok(/实名/.test(String(el('toast-message').innerText || '')), 'F5 拦截须给出可观察原因（Toast 含「实名」），实际 ' + JSON.stringify(el('toast-message').innerText));

  // 不得误拦：已实名时应能打开
  const { App: A2, MockData: M2 } = fresh();
  M2.currentUser.idVerified = true;
  M2.currentUser.accountStatus = '正常';
  const w2 = el('modal-withdraw');
  w2.classList.remove('active');
  safe(() => A2.openWithdrawModal(), null);
  ok(w2.classList.contains('active'), 'F6 已实名时 openWithdrawModal 应正常打开（不得误拦）');
}

// ============================================================================
// G. 入口拦截 · 接单 / 发包（4 项）
// ============================================================================
{
  const { App, MockData } = fresh();
  asUnverified(MockData);
  const apply = el('modal-task-apply');
  apply.classList.remove('active');
  el('toast-message').innerText = '';

  const taskId = (MockData.tasks.list && MockData.tasks.list[0] && MockData.tasks.list[0].id) || 'TK-1';
  safe(() => App.openTaskApplyModal(taskId), null);
  ok(!apply.classList.contains('active'), 'G1【核心】未实名时 openTaskApplyModal 应被拦截（报名接单不得打开）');
  ok(/实名/.test(String(el('toast-message').innerText || '')), 'G2 报名拦截须给出可观察原因（Toast 含「实名」）');

  const escBefore = (MockData.assets.escrowProjects || []).length;
  const ordersBefore = (MockData.tasks.myOrders || []).length;
  safe(() => App.submitPublishTask(), null);
  const escAfter = (MockData.assets.escrowProjects || []).length;
  const ordersAfter = (MockData.tasks.myOrders || []).length;

  ok(escAfter === escBefore, 'G3【核心】未实名时 submitPublishTask 不得产生托管冻结（escrowProjects ' + escBefore + ' → ' + escAfter + '）');
  ok(ordersAfter === ordersBefore, 'G4 未实名时发包不得产生订单（myOrders ' + ordersBefore + ' → ' + ordersAfter + '）');
}

// ============================================================================
// H. 账号冻结：拦截动作但保留权益（5 项）—— SC-001-12
// ============================================================================
{
  const { App, MockData } = fresh();
  MockData.currentUser.idVerified = true;
  MockData.currentUser.accountStatus = '冻结';

  const r = safe(() => App.checkAdmission('withdraw'), null);
  ok(!!r && r.allowed === false, 'H1 冻结态 withdraw 应 allowed=false');
  const allBlocked = ACTIONS.every((a) => {
    const x = safe(() => App.checkAdmission(a), null);
    return !!x && x.allowed === false;
  });
  ok(allBlocked, 'H2【核心】冻结态下 5 个动作应全部被拦截');

  okInv(!near(parse(MockData.currentUser.learningPointsLifetime), 0), 'H3【核心】冻结不得清零累计创作积分（权益保留）');
  okInv(Number(MockData.currentUser.level) >= 1, 'H4 冻结不得使等级失效');
  okInv(parse(MockData.assets.cards.monthlyEarnings) > 0, 'H5 冻结不得清零创作收益');
}

// ============================================================================
// I. 凭据失效不回溯扣减（4 项）—— SC-001-14 / FR-001-41 / RULE-004
// ============================================================================
{
  const { App, MockData } = fresh();
  const read = () => ({
    lifetime: parse(MockData.currentUser.learningPointsLifetime),
    level: Number(MockData.currentUser.level),
    earnings: parse(MockData.assets.cards.monthlyEarnings)
  });
  const before = read();
  MockData.currentUser.campusVerified = false; // 学籍失效（毕业 / 退学）
  const after = read();

  okInv(near(before.lifetime, after.lifetime), 'I1【核心】学籍失效不得扣减累计创作积分（' + before.lifetime + ' → ' + after.lifetime + '）');
  okInv(before.level === after.level, 'I2【核心】学籍失效不得使等级回退（' + before.level + ' → ' + after.level + '，RULE-004）');
  okInv(near(before.earnings, after.earnings), 'I3 学籍失效不得影响创作收益');
  okInv((after.lifetime - before.lifetime) === 0 && (before.level - after.level) === 0 && (after.earnings - before.earnings) === 0,
    'I4【核心】凭据失效后的负向变化量必须全为 0（等级 / 积分 / 收益）');
}

// ============================================================================
// J. 双轨账本严格隔离（5 项）—— SC-001-15 / CON-021 / CON-022
// ============================================================================
{
  const { App, MockData, sandbox } = fresh();
  const read = () => ({
    lifetime: parse(MockData.currentUser.learningPointsLifetime),
    avail: parse(MockData.currentUser.learningPoints),
    level: Number(MockData.currentUser.level),
    earnings: parse(MockData.assets.cards.monthlyEarnings),
    tokens: parse(MockData.assets.cards.tokensAC)
  });
  const before = read();

  // 触发一次 AI 生成（消耗 AI 积分）
  el('modal-studio-title').innerText = 'AI 视频生成';
  el('studio-prompt-input').value = '身份准入自检用提示词';
  const realST = sandbox.setTimeout;
  sandbox.setTimeout = (fn) => { fn(); return 0; };
  try { safe(() => App.simulateGenerate(), null); } finally { sandbox.setTimeout = realST; }

  const after = read();
  okInv(near(before.lifetime, after.lifetime), 'J1【核心】消耗 AI 积分不得改变累计创作积分（' + before.lifetime + ' → ' + after.lifetime + '，CON-022）');
  okInv(near(before.avail, after.avail), 'J2【核心】消耗 AI 积分不得改变可用创作积分');
  okInv(before.level === after.level, 'J3【核心】消耗 AI 积分不得导致等级变化');
  okInv(near(before.earnings, after.earnings), 'J4 消耗 AI 积分不得影响创作收益');
  ok(before.tokens - after.tokens > 0, 'J5 生成应真实消耗 AI 积分（tokensAC ' + before.tokens + ' → ' + after.tokens + '）');

  // 不变量：累计 ≥ 可用（CON-023：定级口径与可消费余额解耦但有序）
  const { MockData: M2 } = fresh();
  okInv(parse(M2.currentUser.learningPointsLifetime) >= parse(M2.currentUser.learningPoints),
    'J6 不变量：累计创作积分应 ≥ 可用创作积分（' + M2.currentUser.learningPointsLifetime + ' ≥ ' + M2.currentUser.learningPoints + '）');
}

// ============================================================================
// K. 口径漂移（顺带冻结）—— Q-002：认证导师 / 教学机构不引入
// ============================================================================
{
  const { MockData } = fresh();
  const roles = (MockData.systemAdmin && MockData.systemAdmin.roles) || [];
  const keys = roles.map((r) => String(r.key));
  ok(keys.indexOf('mentor') < 0,
    'K1【口径】systemAdmin.roles 不应再含 mentor（签约导师 / 教学机构）—— 违反 Q-002（不引入）。实际 keys=' + JSON.stringify(keys));
  ok(keys.indexOf('creator') >= 0 && keys.indexOf('buyer') >= 0,
    'K2 roles 应保留两类业务身份 creator / buyer');
  ok(!/签约导师|教学机构/.test(JSON.stringify(roles)),
    'K3 roles 中不应残留「签约导师 / 教学机构」字样');
}

// ------------------------- 输出 -------------------------
const funcTotal = pass + fails.length;        // 功能断言总数
const invTotal = passInv + failsInv.length;   // 不变量断言总数
const line = '-'.repeat(70);
console.log('\n' + line);
console.log(' SPEC-001 身份与准入自检（契约先行 · 冻结自检 · 第一刀最小切片）');
console.log(' 契约：App.evaluateAgeGate / App.checkAdmission / App.ADMISSION_ACTIONS');
console.log('       currentUser.accountStatus / currentUser.merchantStatus');
console.log(' 依据：specs/001-identity-onboarding/spec.md  SC-001-05 / 11 / 12 / 14 / 15 / 17 / 18');
console.log(line);
if (fails.length === 0 && failsInv.length === 0) {
  console.log(' ✓ 全部通过：' + (pass + passInv) + ' 项断言（功能 ' + pass + ' + 不变量 ' + passInv + '）');
  console.log('   ⇒ 第一刀已落地。请把本套件从 gates-baseline.json 的 l3ExpectedRed 中移除。');
} else {
  console.log(' ✗ SPEC-001 第一刀尚待实现 —— 以下即 TODO 清单');
  console.log('');
  console.log(' 【功能断言】 ' + pass + '/' + funcTotal + '  ← **真实进度看这一行**（断言能力"存在且正确"，未实现必然失败）');
  console.log(' 【不变量断言】 ' + passInv + '/' + invTotal + '  ← ⚠️ 未实现时"什么都没做"⇒ **平凡通过**，**不代表已完成**');
  if (fails.length) {
    console.log('');
    console.log(' ── 待实现（功能断言 ' + fails.length + ' 项）──');
    fails.forEach((f, i) => console.log('   ' + (i + 1) + '. ' + f));
  }
  if (failsInv.length) {
    console.log('');
    console.log(' ── 未通过（不变量断言 ' + failsInv.length + ' 项）──');
    failsInv.forEach((f, i) => console.log('   ' + (i + 1) + '. ' + f));
  }
  console.log('');
  // 机器可读行：只报**功能断言**进度（不变量断言未计入 —— 它们现在不构成任何证据）
  console.log(' 通过：' + pass + '/' + funcTotal + ' 项功能断言（不变量断言 ' + passInv + '/' + invTotal + ' 未计入）');
}
console.log(line + '\n');
process.exit((fails.length === 0 && failsInv.length === 0) ? 0 : 1);
