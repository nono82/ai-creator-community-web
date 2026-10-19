#!/usr/bin/env node
/**
 * 任务广场 ·「招募中 → 选定创作者」自检脚本
 * ---------------------------------------------------------------------------
 * 零依赖、离线。用最小 DOM 桩加载 js/mock_data.js + js/app.js，断言：
 *   ① 发布方身份判定唯一口径 App.isPublisherOfTask()：以「我的任务」台账为真源，
 *      **不得再用 publisherRole 关键词白名单猜**（用户自己发布的任务署名为
 *      「我发布的任务（小宇同学 / 星芒视觉工作室）」，会被旧实现误判为非发布方）；
 *   ② 我的任务 · 发布任务 · 招募中（manual）→ 详情页必须渲染出【选定此人】按钮，
 *      候选人数 = 待审候选人数，顶栏为发布方视角（不得出现「提交报名」）；
 *   ③ auto（报名即接）模式不提供选人入口，顶栏为「查看接单」（「查看名额」文案已全项目下线）；
 *   ④ 选定**必须二次确认**：卡片入口 requestSelectApplicant() 只开确认弹窗、零状态变动，
 *      confirmSelectCreator() 才提交；非发布方 / 未知任务 / 未知候选人一律拦截；
 *   ⑤ 候选人卡片同时提供【创作者主页】：档案唯一真源 App.getCreatorProfile()，
 *      显式档案 → 作品展厅聚合 → 报名记录现场合成 三级回落（任何候选人都不出现死链）；
 *   ⑥ 选定后任务转「**待接单**」（非直接进行中）：同时向创作者侧下发「待接单」承接商单，
 *      该商单出现在「我的任务 · 承接任务 · 待接单」标签下并提供【响应商单】；
 *   ⑦ 创作者响应接单（App.confirmCustomOrder）→ 任务与双方台账同步转「进行中」；
 *      创作者婉拒（App.declineCustomOrder）→ 任务退回「招募中」且候选人池整体还原；
 *   ⑧ 大厅投稿人视角不受影响（第三方任务仍可「去报名」）；
 *   ⑨ 静态契约：跳转锚点 #task-detail-applicants 真实存在、方法唯一、旧白名单已下线。
 *   ⑩ 站内消息：选定创作者 / 催办响应各下发一条「我发出」的站内消息，全站唯一写入口
 *      App.sendSiteMessage()；通知下拉 / 未读角标 / 消息中心三处同源；「全部已读」可清角标。
 *   ⑪ 履约协同（状态 = 进行中）：承接方随时填报项目进度与日报（App.submitDailyReport）、
 *      发布方随时查看进度与日报（双向同一份事实、大厅访客日报正文脱敏）、双方互问互答
 *      （App.submitTaskQuestion / App.openTaskAnswerModal / App.submitTaskAnswer）；
 *      「查看名额」按钮文案全项目下线，招募中发布方入口收敛为单一文案口径。
 *   ⑬ 日报入口收敛（2026-09-23）：承接方卡片【填报日报】与详情页顶栏【填报项目日报】两个
 *      按钮**全部下线**；唯一路径 = 点整张卡片 → 进详情页 → 在正文「项目进度与日报协同看板」
 *      内填报。卡片整卡点击对「进行中 / 返修中」自动带 focus='fulfillment' 直达看板；
 *      发布方【查看进度日报】/【催办日报】不受影响。
 *   ⑫ 作品展厅【找 TA 定制】：报价口径为**明确价格**（预算区间已下线），默认取创作者基准
 *      报价 / 服务套餐明码标价；【发送定制邀请】自动生成一条 status=「待接单」的定向商单
 *      任务 + 发布方与承接方双台账 + 一条定制邀请站内消息，承接方在【我的任务 · 承接任务】
 *      可直接【响应商单】；婉拒后退回「招募中」且候选人还原为待选（不卡死）。大厅徽章统一
 *      走 getHallCoverBadge()（不得把 active 硬编码成「履约中」）。
 *
 * 用法： node temp/wb-task-select-verify.js
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
  get className() { return Array.from(this.classList.set).join(' '); }
  set className(v) { this.classList.set = new Set(String(v == null ? '' : v).split(/\s+/).filter(Boolean)); }
  getAttribute(n) { return this._attrs[n] === undefined ? null : this._attrs[n]; }
  setAttribute(n, v) { this._attrs[n] = v; }
  appendChild(c) { return c; }
  addEventListener() {}
  querySelectorAll() { return []; }
  querySelector() { return null; }
  getContext() { return null; }
  scrollIntoView() {}
}

const registry = new Map();
function el(id) { if (!registry.has(id)) registry.set(id, new El(id)); return registry.get(id); }

const documentStub = {
  getElementById: (id) => el(id),
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: () => {},
  body: new El('body')
};

[
  'tasks-detail-body', 'task-detail-top-actions', 'tasks-main-shell',
  'tasks-publish-page', 'tasks-detail-page', 'tasks-mine-list-container',
  'tasks-plaza-list-container'
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

// 副作用抑制
const toasts = [];
App.showToast = function (msg) { toasts.push(String(msg)); };
function lastToast() { return toasts.length ? toasts[toasts.length - 1] : ''; }
function resetToast() { toasts.length = 0; }
App.navigateTo = function (view) { this.currentView = view; };
// 保留真实大厅渲染器：L 组要验证大厅徽章口径（「待接单」不得被硬编码成「履约中」）
const REAL_RENDER_PLAZA = App.renderTasksPlaza.bind(App);
App.renderTasksPlaza = function () {};
// 保留真实渲染器：承接任务列表的可见性要在 I 组里被真正渲染一次
const REAL_RENDER_MY_TASKS = App.renderMyTasks.bind(App);
App.renderMyTasks = function () {};
App.renderTasksCharts = function () {};
App.currentView = 'tasks';

// ------------------------- 工具 -------------------------
const TASKS = () => MockData.tasks.list || [];
const ORDERS = () => MockData.tasks.myOrders || [];
const taskOf = (id) => TASKS().find(t => t.id === id) || null;
const pubOrdersOf = (taskId) => ORDERS().filter(o => (o.role === 'publisher' || o.role === 'buyer') && o.sourceId === taskId);
function taskSnapshot(taskId) { return JSON.stringify(taskOf(taskId)); }
function ordersSnapshot() { return JSON.stringify(ORDERS()); }

// 全量快照 / 还原：让每个分组都能在干净的种子状态上跑（原地替换，保持对象引用）
function snapshotAll() {
  return { tasks: JSON.stringify(TASKS()), orders: JSON.stringify(ORDERS()) };
}
function restoreAll(snap) {
  const tasks = JSON.parse(snap.tasks);
  TASKS().forEach((t, i) => {
    if (!tasks[i]) return;
    Object.keys(t).forEach(k => delete t[k]);
    Object.assign(t, tasks[i]);
  });
  MockData.tasks.myOrders = JSON.parse(snap.orders);
}

// 资金复位：冻结只动「可消费」、不动账户余额后，跨用例累计冻结会把可消费余额耗尽，
// 导致后续建单被「可消费余额不足」拦下。资金类用例组开始前先复位到种子值。
const FUNDS_SEED = JSON.stringify({
  cards: MockData.assets.cards,
  breakdown: MockData.assets.breakdown
});
function restoreFunds() {
  const seed = JSON.parse(FUNDS_SEED);
  const cards = MockData.assets.cards;
  Object.keys(cards).forEach(k => delete cards[k]);
  Object.assign(cards, seed.cards);
  const bd = MockData.assets.breakdown;
  const items = JSON.parse(JSON.stringify(seed.breakdown.items));
  bd.total = seed.breakdown.total;
  bd.items.forEach((it, i) => { if (items[i]) Object.assign(it, items[i]); });
}

function openDetail(taskId, mode, focus) {
  App.activeTasksMode = mode;
  App.openTaskDetailPage(taskId, focus);
  return {
    body: el('tasks-detail-body').innerHTML,
    top: el('task-detail-top-actions').innerHTML
  };
}
function topButtonTexts(html) {
  return (html.match(/>([^<>]+)<\/button>/g) || []).map(s => s.replace(/[<>/button]/g, ''));
}

const OWN_DRAFT = 'MO-P0';       // 我发布 · 草稿 → TK12
const OWN_RECRUITING = 'MO-P1';  // 我发布 · 招募中 · manual → TK05（4 位待审候选）
const OWN_AUTO = 'MO-P1B';       // 我发布 · 招募中 · auto → TK03
const THEIR_RECRUITING = 'TK01'; // 第三方（品牌方）· 招募中 · manual

// =========================================================================
// A 组 · 发布方身份判定（唯一口径）
// =========================================================================
App.activeTasksMode = 'mine';

eq(App.isPublisherOfTask(taskOf('TK05')), true, 'A01 自己发布的招募中任务（TK05）→ 是发布方');
eq(App.isPublisherOfTask(taskOf('TK12')), true, 'A02 自己发布的草稿任务（TK12）→ 是发布方');
eq(App.isPublisherOfTask(taskOf('TK08')), true, 'A03 自己发布的待验收任务（TK08）→ 是发布方');
eq(App.isPublisherOfTask(taskOf('TK09')), true, 'A04 自己发布的仲裁中任务（TK09）→ 是发布方');
eq(App.isPublisherOfTask(taskOf('TK11')), true, 'A05 自己发布的已完成任务（TK11）→ 是发布方');

eq(App.isPublisherOfTask(taskOf('TK01')), false, 'A06 第三方品牌方任务（TK01）→ 不是发布方');
eq(App.isPublisherOfTask(taskOf('TK13')), false, 'A07 第三方企业任务（TK13）→ 不是发布方');
eq(App.isPublisherOfTask(taskOf('TK06')), false, 'A08 第三方科研机构任务（TK06）→ 不是发布方');
eq(App.isPublisherOfTask({ id: 'TK999', publisherRole: '某品牌方' }), false, 'A09 台账无记录的未知任务 → 不是发布方');
eq(App.isPublisherOfTask(null), false, 'A10 null 入参 → 不是发布方');

// 兜底：署名包含当前用户昵称
const meName = MockData.currentUser.name;
eq(App.isPublisherOfTask({ id: 'TK998', publisherRole: '企业雇主 / ' + meName }), true,
  'A11 兜底：署名为「企业雇主 / 当前用户昵称」→ 是发布方');
eq(App.isPublisherOfTask({ id: 'TK997', publisherRole: '我发布的任务（' + meName + ' / 星芒视觉工作室）' }), true,
  'A12 兜底：署名为「我发布的任务（当前用户昵称 …）」→ 是发布方');

// 回归护栏：台账未被破坏
ok(pubOrdersOf('TK05').length >= 1, 'A13 TK05 在发布方台账中有订单条目');

// =========================================================================
// B 组 · 我的任务 · 招募中（manual）→ 详情页出现【选定此人】
// =========================================================================
const tk05 = taskOf('TK05');
const pending05 = (tk05.applicants || []).filter(a => a.status === 'pending').length;
const b = openDetail('TK05', 'mine', 'applicants');

eq(App._taskDetailManageMode, true, 'B01 从我的任务进入 → manage 模式');
has(b.body, 'requestSelectApplicant', 'B02 详情页渲染出【选定此人】按钮（本轮修复的核心）');
eq((b.body.match(/App\.requestSelectApplicant\('/g) || []).length, pending05,
  'B03【选定此人】按钮数 = 待审候选人数');
has(b.body, "App.requestSelectApplicant('TK05'", 'B04 按钮绑定到 requestSelectApplicant 并带上任务 id');
has(b.body, '选定此人', 'B05 按钮文案为「选定此人」');
has(b.body, 'id="task-detail-applicants"', 'B06 候选人列表带跳转锚点 id');
has(b.body, '竞标方案待审', 'B07 待审状态标签与选定按钮并存（标签未被吞掉）');

has(b.top, '选定创作者', 'B08 顶栏为发布方视角「选定创作者」');
notHas(b.top, '提交报名', 'B09 顶栏不得再对自己的任务显示「提交报名」');
notHas(b.top, '去报名', 'B10 顶栏不得出现「去报名」');
has(b.top, "App.focusTaskDetailBlock('task-detail-applicants')", 'B11 顶栏按钮接到锚点跳转统一入口');
has(b.top, 'task-detail-applicants', 'B12 顶栏跳转目标 = 候选人列表锚点');

has(b.body, '请从上方候选人中选定一位合作创作者', 'B13 底部 CTA 提示发布方从候选人中选定');
has(b.body, '参与竞标创作者与方案池', 'B14 参与人员卡片标题正确');

// 候选人卡片逐个都应是发布方视角
ok((b.body.match(/requestSelectApplicant/g) || []).length === pending05,
  'B15 每位待审候选人都恰有一个选定入口');

// 【创作者主页】：不分状态、每位候选人都应可查看
eq((b.body.match(/App\.openApplicantProfileModal\('/g) || []).length, (tk05.applicants || []).length,
  'B16 每位候选人都带【创作者主页】入口（含已评定的候选人）');
has(b.body, '>创作者主页</button>', 'B17 按钮文案为「创作者主页」');
// 选定入口已走二次确认，不得再有直接提交的裸入口
notHas(b.body, "App.selectTaskApplicant(", 'B18 候选人卡片不再直接提交选定（必须先过确认弹窗）');

// =========================================================================
// C 组 · 全站报名制：原 auto（报名即接 / 立即接单）模式已下线，
//        所有任务统一走「报名 → 发布方从候选人中选定」，故一律提供选人入口
// =========================================================================
const c = openDetail('TK03', 'mine', 'applicants');
has(c.top, '选定创作者', 'C02 报名制下顶栏为「选定创作者」（auto 的「查看接单」已下线）');
notHas(c.top, '查看接单', 'C02a「查看接单」按钮已随 auto 模式全项目下线');
notHas(c.top, '查看名额', 'C02b「查看名额」按钮已全项目下线');
has(c.body, '请从上方候选人中选定一位合作创作者', 'C03 报名制下详情页提示选人');
has(c.body, '参与竞标创作者与方案池', 'C04 详情页仍展示候选人池');
has(c.body, '创作者主页', 'C05 候选人仍可查看【创作者主页】（只读核验不设限）');

// =========================================================================
// D 组 · 选定闭环 selectTaskApplicant()：任务转「待接单」+ 双向台账下发
// =========================================================================
const snapBeforeD = snapshotAll();
openDetail('TK05', 'mine', 'applicants');
const targetId = (tk05.applicants || []).find(a => a.status === 'pending').id;
const targetName = (tk05.applicants || []).find(a => a.id === targetId).name;
const beforeOrderCount = pubOrdersOf('TK05').length;
resetToast();

App.selectTaskApplicant('TK05', targetId);

eq(taskOf('TK05').status, '待接单', 'D01 任务流转为「待接单」（不再直接进入进行中）');
eq(taskOf('TK05').selectedCreatorId, targetId, 'D02 记录 selectedCreatorId');
eq((taskOf('TK05').applicants || []).find(a => a.id === targetId).status, 'accepted',
  'D03 中标候选人状态转为 accepted');
eq((taskOf('TK05').applicants || []).filter(a => a.status === 'rejected').length, pending05 - 1,
  'D04 同批其余候选人全部转为 rejected');
has(lastToast(), '合作邀请', 'D05 Toast 提示已发出合作邀请');
has(lastToast(), targetName, 'D06 Toast 带上创作者名称');
has(lastToast(), '待接单', 'D07 Toast 告知任务已转「待接单」');

eq(pubOrdersOf('TK05').length, beforeOrderCount, 'D08 发布台账**不新增重复条目**（就地转化）');
const conv = pubOrdersOf('TK05')[0];
eq(conv.status, '待接单', 'D09 原「招募中」发布订单就地转为「待接单」');
has(conv.counterpart, targetName, 'D10 订单 counterpart 更新为中标创作者');
has(conv.coreInfo, targetName, 'D11 订单 coreInfo 更新为已选定创作者');
has(conv.coreInfo, '响应接单', 'D12 订单 coreInfo 提示等待对方响应接单');
notHas(JSON.stringify(conv), '"招募中"', 'D13 转化后的订单不含残留「招募中」状态');

// 创作者侧台账：应下发一条「待接单」承接商单
const creatorOrder = ORDERS().find(o => o.role === 'creator' && o.sourceId === 'TK05');
ok(!!creatorOrder, 'D14 创作者侧台账下发一条承接商单');
eq(creatorOrder.status, '待接单', 'D15 承接商单状态为「待接单」');
eq(creatorOrder.assigneeName, targetName, 'D16 承接商单记录被选定的创作者');
eq(creatorOrder.applicantId, targetId, 'D17 承接商单回写候选人 id（供婉拒还原候选人池）');
has(creatorOrder.coreInfo, '待你响应接单', 'D18 承接商单明确提示待响应接单');

// 锁定后的状态口径
eq(App.getTaskHallLifecycle(taskOf('TK05')), 'active', 'D19「待接单」归入履约中阶段（不可再报名）');
eq(App.getHallCoverBadge(taskOf('TK05')), '待接单', 'D20 封面角标显示「待接单」');
eq(App.getTaskDisplayStatus(taskOf('TK05')), '待接单', 'D21 展示状态为「待接单」');
eq(App.normalizeOrderStatusLabel('待接单'), '待接单', 'D22 订单状态文案映射含「待接单」');

// 转化后详情页应切到待响应视图，不再出现选人入口
const after = { body: el('tasks-detail-body').innerHTML, top: el('task-detail-top-actions').innerHTML };
notHas(after.body, 'requestSelectApplicant', 'D23 选定后详情页撤下【选定此人】');
notHas(after.top, '选定创作者', 'D24 选定后顶栏不再显示「选定创作者」');
has(after.top, '待创作者响应', 'D25 发布方顶栏转为「已选定 · 待创作者响应」');
has(after.body, '等待创作者响应', 'D26 状态看板切为等待创作者响应');

// 闸门：非发布方调用被拦截，零变动
const tk01Before = taskSnapshot('TK01');
const ordersBefore = ordersSnapshot();
resetToast();
App.selectTaskApplicant('TK01', 'AP02');
eq(taskSnapshot('TK01'), tk01Before, 'D27 非发布方调用 → 任务零变动');
eq(ordersSnapshot(), ordersBefore, 'D28 非发布方调用 → 台账零变动');
has(lastToast(), '仅该任务的发布方', 'D29 非发布方调用被拦截并给出原因');

// 闸门：未知任务 / 未知候选人
resetToast();
App.selectTaskApplicant('TK999', 'AP01');
has(lastToast(), '未找到该任务', 'D30 未知任务被拦截');
resetToast();
App.selectTaskApplicant('TK13', 'AP_NOT_EXIST');
has(lastToast(), '未找到该竞标创作者', 'D31 未知候选人被拦截');

// 还原种子状态，供后续分组使用
restoreAll(snapBeforeD);
eq(taskOf('TK05').status, '招募中', 'D32 快照还原：TK05 回到「招募中」');
ok(!ORDERS().some(o => o.role === 'creator' && o.sourceId === 'TK05'), 'D33 快照还原：临时承接商单已移除');

// =========================================================================
// E 组 · 大厅投稿人视角不受影响
// =========================================================================
// TK13（大疆 · manual · 招募中）是「用户既未发布、也未承接」的干净第三方样本
const e1 = openDetail('TK13', 'hall');
has(e1.top, '去报名', 'E01 大厅打开第三方招募中任务 → 仍可「去报名」');
notHas(e1.body, 'selectTaskApplicant', 'E02 大厅打开第三方任务 → 无【选定此人】');
eq(App.isPublisherOfTask(taskOf('TK13')), false, 'E02b 第三方任务发布方判定为否');

// 已承接的第三方任务 → 维持「已报名」（投稿人视角不被发布方判定污染）
const e1b = openDetail('TK01', 'hall');
has(e1b.top, '已报名', 'E02c 已承接的任务在大厅显示「已报名」');

const e2 = openDetail('TK05', 'hall');
notHas(e2.top, '去报名', 'E03 大厅打开自己发布的任务 → 不得出现「去报名」');
notHas(e2.top, '提交报名', 'E04 大厅打开自己发布的任务 → 不得出现「提交报名」');
has(e2.top, 'disabled', 'E04b 自己发布的任务不可报名（按钮置灰）');

// 全站统一报名制：原 auto（立即接单）模式已下线，任何任务都不再出现「立即接单」
const e3 = openDetail('TK03', 'hall');
notHas(e3.top, '立即接单', 'E05 报名制下自己发布的任务 → 不得出现「立即接单」');
has(e3.top, 'disabled', 'E06 自己发布的任务不可报名（按钮置灰）');
eq(App.getTaskAcceptMode(taskOf('TK03')), 'manual', 'E06b 原 auto 任务接单模式已收敛为 manual');
eq((MockData.tasks.list || []).filter(t => t.acceptMode === 'auto').length, 0, 'E06c 台账中已无 auto 接单模式任务');
notHas(APP_SRC, '>立即接单<', 'E06d app.js 不再渲染「立即接单」按钮文案');
notHas(HTML, '>立即接单<', 'E06e index.html 不再出现「立即接单」按钮文案');
notHas(HTML, '报名即接', 'E06f index.html 发布向导已移除「报名即接」选项');

// =========================================================================
// G 组 · 选定前二次确认：requestSelectApplicant → 确认弹窗 → confirmSelectCreator
// =========================================================================
const snapBeforeG = snapshotAll();
const g = openDetail('TK05', 'mine', 'applicants');
notHas(g.body, 'App.selectTaskApplicant(', 'G01 候选人卡片不再直接提交选定');
has(g.body, "App.requestSelectApplicant('TK05'", 'G02 选定入口改走 requestSelectApplicant');

const gId = (taskOf('TK05').applicants || []).find(a => a.status === 'pending').id;
const gName = (taskOf('TK05').applicants || []).find(a => a.id === gId).name;
const gTaskBefore = taskSnapshot('TK05');
const gOrdersBefore = ordersSnapshot();
resetToast();
App.requestSelectApplicant('TK05', gId);

eq(taskSnapshot('TK05'), gTaskBefore, 'G03 仅打开确认弹窗 → 任务零变动');
eq(ordersSnapshot(), gOrdersBefore, 'G04 仅打开确认弹窗 → 台账零变动');
eq(el('modal-select-creator').classList.contains('active'), true, 'G05 二次确认弹窗已打开');

const gCard = el('select-creator-card').innerHTML;
has(gCard, gName, 'G06 确认弹窗回显候选人姓名');
has(gCard, '竞标思路', 'G07 确认弹窗回显竞标思路');
eq(el('select-creator-task-id').value, 'TK05', 'G08 弹窗隐藏域回填任务 id');
eq(el('select-creator-applicant-id').value, gId, 'G09 弹窗隐藏域回填候选人 id');

const gImpact = el('select-creator-impact').innerHTML;
has(gImpact, '待接单', 'G10 影响提示明确任务将转「待接单」');
has(gImpact, '响应接单', 'G11 影响提示说明须创作者响应接单');
has(gImpact, '落选', 'G12 影响提示告知其余候选人将自动落选');
has(gImpact, '托管冻结', 'G13 影响提示重申赏金仍托管冻结');

// 取消：不产生任何变动（不可逆动作必须可安全退出）
App.closeSelectCreatorModal();
eq(el('modal-select-creator').classList.contains('active'), false, 'G14 取消后弹窗关闭');
eq(taskSnapshot('TK05'), gTaskBefore, 'G15 取消后任务零变动');
eq(ordersSnapshot(), gOrdersBefore, 'G16 取消后台账零变动');

// 确认：走同一条提交链路
resetToast();
App.requestSelectApplicant('TK05', gId);
eq(el('modal-select-creator').classList.contains('active'), true, 'G17 再次打开确认弹窗');
App.confirmSelectCreator();
eq(el('modal-select-creator').classList.contains('active'), false, 'G18 确认后弹窗自动关闭');
eq(taskOf('TK05').status, '待接单', 'G19 确认后任务转为「待接单」');
eq(taskOf('TK05').selectedCreatorId, gId, 'G20 确认后记录中标候选人');
has(lastToast(), '合作邀请', 'G21 确认后给出「已发出合作邀请」反馈');

// 闸门：确认弹窗不能绕过发布方身份校验
resetToast();
const gTk01Before = taskSnapshot('TK01');
App.requestSelectApplicant('TK01', 'AP02');
has(lastToast(), '仅该任务的发布方', 'G22 非发布方点【选定此人】被拦截');
eq(taskSnapshot('TK01'), gTk01Before, 'G23 非发布方点击 → 任务零变动');
eq(el('modal-select-creator').classList.contains('active'), false, 'G24 被拦截时不打开确认弹窗');

resetToast();
App.requestSelectApplicant('TK999', 'X');
has(lastToast(), '未找到该任务', 'G25 未知任务被拦截');
resetToast();
App.requestSelectApplicant('TK05', 'NO_SUCH_APPLICANT');
has(lastToast(), '未找到该竞标创作者', 'G26 未知候选人被拦截');
has(lastToast(), '未找到该竞标创作者', 'G27 未知候选人不会误开弹窗');
eq(el('modal-select-creator').classList.contains('active'), false, 'G28 未知候选人被拦截后弹窗保持关闭');

// 候选人 id 兜底：种子数据里 TK13 的候选人没有 id，须由 syncTaskApplicantMeta 补齐
openDetail('TK13', 'hall');
const tk13Applicants = (taskOf('TK13').applicants || []);
ok(tk13Applicants.length > 0 && tk13Applicants.every(a => !!a.id), 'G29 缺 id 的候选人被自动补齐');
notHas(el('tasks-detail-body').innerHTML, "'undefined'", 'G30 候选人按钮不再渲染出 undefined 参数');

restoreAll(snapBeforeG);
eq(taskOf('TK05').status, '招募中', 'G31 快照还原：TK05 回到「招募中」');

// =========================================================================
// H 组 · 创作者主页（候选人入口 + 档案三级回落 + 主页内选定联动）
// =========================================================================
const hTask = taskOf('TK01');
const h = openDetail('TK01', 'hall');
eq((h.body.match(/App\.openApplicantProfileModal\('/g) || []).length, (hTask.applicants || []).length,
  'H01 每位候选人都带【创作者主页】入口');
has(h.body, '>创作者主页</button>', 'H02 按钮文案为「创作者主页」');

// 档案解析：① 显式档案
const p1 = App.getCreatorProfile('小宇同学');
ok(!!p1, 'H03 显式档案命中「小宇同学」');
eq(p1.source, 'profile', 'H04 命中显式 creatorProfiles 档案');
ok((p1.works || []).length >= 3, 'H05 显式档案含 ≥3 部代表作');
ok(p1.stats && p1.stats.completed !== '—', 'H06 显式档案含履约口碑统计');
ok(!!p1.credit, 'H07 显式档案含信誉分');

// ② 作品展厅聚合兜底（青墨AI漫社 只在展厅有作品，无显式档案）
const p2 = App.getCreatorProfile('青墨AI漫社');
ok(!!p2 && p2.source === 'gallery', 'H08 无显式档案时回落到作品展厅聚合');
ok((p2.works || []).length >= 2, 'H09 展厅回落档案含作品');

// ③ 报名记录现场合成（保证任何候选人都不出现死链）
const p3 = App.getCreatorProfile({ name: '未知候选人甲', credit: 88, proposal: '测试竞标思路', avatar: 'assets/avatars/rank_user_2.png' });
ok(!!p3 && p3.source === 'applicant', 'H10 未知候选人可现场合成档案（不死链）');
eq(p3.credit, 88, 'H11 合成档案保留候选人信誉分');
has(p3.intro, '测试竞标思路', 'H12 合成档案保留候选人竞标思路');

// 打开抽屉（大厅投稿人视角：只读核验）
resetToast();
App.openApplicantProfileModal('TK01', 'AP02');
eq(el('modal-creator-profile').classList.contains('active'), true, 'H13 创作者主页抽屉已打开');
const hp = el('creator-profile-body').innerHTML;
has(hp, '星际造梦师', 'H14 主页展示创作者姓名');
has(hp, '代表作品', 'H15 主页含代表作品区块');
has(hp, '完成商单', 'H16 主页含履约口碑统计');
has(hp, '准时交付率', 'H17 主页含准时交付率');
notHas(hp, '选定此人', 'H18 大厅投稿人视角不出现【选定此人】');

// 发布方视角：主页内可直接选定
openDetail('TK05', 'mine', 'applicants');
const hId = (taskOf('TK05').applicants || []).find(a => a.status === 'pending').id;
App.openApplicantProfileModal('TK05', hId);
has(el('creator-profile-body').innerHTML, '选定此人', 'H19 发布方视角主页内出现【选定此人】');
App.selectFromCreatorProfile();
eq(el('modal-creator-profile').classList.contains('active'), false, 'H20 主页内选定 → 主页关闭');
eq(el('modal-select-creator').classList.contains('active'), true, 'H21 主页内选定 → 弹出二次确认弹窗');
eq(el('select-creator-applicant-id').value, hId, 'H22 二次确认弹窗带入正确的候选人');
eq(taskOf('TK05').status, '招募中', 'H23 主页内选定仍需二次确认才提交（此刻任务未变）');
App.closeSelectCreatorModal();

// 未知候选人打开主页不应崩溃
resetToast();
App.openApplicantProfileModal('TK05', 'NO_SUCH');
has(lastToast(), '未找到该候选创作者', 'H24 未知候选人不打开主页并给出提示');

restoreAll(snapBeforeG);

// =========================================================================
// I 组 · 待接单闭环：承接列表可见 → 响应接单 / 婉拒退回招募中
// =========================================================================
const iPending0 = (taskOf('TK05').applicants || []).filter(a => a.status === 'pending').length;
const iPick = (taskOf('TK05').applicants || []).filter(a => a.status === 'pending')[0];
const iPickName = iPick.name;
resetToast();
App.selectTaskApplicant('TK05', iPick.id);

// --- I-A 承接任务列表可见 ---
const iOrder = ORDERS().find(o => o.role === 'creator' && o.sourceId === 'TK05');
ok(!!iOrder, 'I01 选定后承接任务列表新增该商单');
eq(iOrder.status, '待接单', 'I02 承接商单状态为「待接单」');

App.activeMyTasksRole = 'taken';
App.activeMyTasksStatus = '待接单';
App.renderMyTasksStatusTabs();
has(el('my-tasks-status-tabs').innerHTML, '待接单', 'I03 承接任务状态标签新增「待接单」');
const stubMyTasks = App.renderMyTasks;
App.renderMyTasks = REAL_RENDER_MY_TASKS;
App.renderMyTasks();
App.renderMyTasks = stubMyTasks;
const mineHtml = el('tasks-mine-list-container').innerHTML;
has(mineHtml, iPickName, 'I04 待接单商单出现在承接任务列表');
has(mineHtml, '响应商单', 'I05 承接列表提供【响应商单】入口');
has(mineHtml, `App.openCustomConfirmModal('${iOrder.id}')`, 'I06 响应商单接到 openCustomConfirmModal');
has(mineHtml, iPickName, 'I07 承接卡片标注被选定的创作者（避免与他人商单混淆）');

// --- I-B 创作者婉拒 → 任务退回「招募中」且候选人池整体还原 ---
App.openCustomConfirmModal(iOrder.id);
eq(el('modal-custom-confirm').classList.contains('active'), true, 'I08 响应商单弹窗已打开');
has(el('custom-confirm-title').textContent, '合作邀请', 'I09 弹窗标题为广场商单口径');
has(el('custom-confirm-sub').textContent, '响应后正式进入履约', 'I10 弹窗副标题为广场商单口径');
has(el('custom-confirm-accept').textContent, '响应接单', 'I11 主按钮文案为「响应接单」');
has(el('custom-confirm-decline').textContent, '退回重选', 'I12 次按钮文案区分「退回重选」');
eq(el('custom-confirm-order-id').value, iOrder.id, 'I13 隐藏域回填商单 id');

App.declineCustomOrder();
eq(taskOf('TK05').status, '招募中', 'I14 婉拒后任务退回「招募中」');
eq(taskOf('TK05').selectedCreatorId, null, 'I15 婉拒后清空 selectedCreatorId');
eq((taskOf('TK05').applicants || []).filter(a => a.status === 'pending').length, iPending0 - 1,
  'I16 婉拒后其余候选人恢复待审（候选人池整体还原）');
eq((taskOf('TK05').applicants || []).find(a => a.id === iPick.id).status, 'rejected',
  'I17 婉拒者本人标记为未入选，不可被再次选定');
eq((ORDERS().find(o => o.id === iOrder.id) || {}).status, '未成交', 'I18 承接商单转「未成交」');
eq((ORDERS().find(o => o.role === 'publisher' && o.sourceId === 'TK05') || {}).status, '招募中',
  'I19 发布台账退回「招募中」');
has(lastToast(), '退回', 'I20 Toast 说明任务已退回招募中');

// --- I-C 改选另一位候选人 → 响应接单 → 双方台账转「进行中」 ---
const iPick2 = (taskOf('TK05').applicants || []).filter(a => a.status === 'pending')[0];
App.selectTaskApplicant('TK05', iPick2.id);
eq(taskOf('TK05').status, '待接单', 'I21 改选后任务再次进入「待接单」');
const iOrder2 = ORDERS().find(o => o.role === 'creator' && o.sourceId === 'TK05' && o.status === '待接单');
ok(!!iOrder2, 'I22 改选后承接商单重新进入待接单');
App.openCustomConfirmModal(iOrder2.id);
App.confirmCustomOrder();
eq(taskOf('TK05').status, '进行中', 'I23 创作者响应接单 → 任务转「进行中」');
eq((ORDERS().find(o => o.id === iOrder2.id) || {}).status, '进行中', 'I24 承接商单转「进行中」');
eq((ORDERS().find(o => o.role === 'publisher' && o.sourceId === 'TK05') || {}).status, '进行中',
  'I25 发布台账同步转「进行中」');
eq(el('modal-custom-confirm').classList.contains('active'), false, 'I26 响应后弹窗关闭');
has(lastToast(), '已响应接单', 'I27 Toast 确认已响应接单');
eq((taskOf('TK05').applicants || []).filter(a => a.status === 'accepted').length, 1,
  'I28 履约中仅一位中标创作者');

// --- I-D 展厅定向定制路径不受影响（无关联广场任务） ---
const galleryOrder = ORDERS().find(o => o.role === 'creator' && o.status === '待接单' && o.sourceId === 'GW09');
ok(!!galleryOrder, 'I29 展厅定向定制样本仍为「待接单」');
App.openCustomConfirmModal(galleryOrder.id);
eq(el('custom-confirm-title').textContent, '定制商单邀请确认', 'I30 展厅来源仍走定制文案');
App.closeModal('modal-custom-confirm');

restoreAll(snapBeforeG);

// =========================================================================
// J 组 · 站内消息：选定创作者 / 催办响应 各下发一条站内消息
// =========================================================================
// 站内消息是「协同动作留痕」的唯一载体：全站只有一个写入口 App.sendSiteMessage()，
// 业务侧（选定 / 催办）只负责传参，禁止各处直接 push MockData.messages.records。
const MESSAGES_SEED = JSON.stringify(MockData.messages.records);
function restoreMessages() { MockData.messages.records = JSON.parse(MESSAGES_SEED); }
function outMessages() { return App.getSiteMessages('out'); }
function inMessages() { return App.getSiteMessages('in'); }

restoreMessages();

// --- J-A 选定创作者 → 向中标创作者下发「合作邀请」站内消息 ---
const jOut0 = outMessages().length;
const jUnread0 = App.countUnreadMessages();
const jPick = (taskOf('TK05').applicants || []).filter(a => a.status === 'pending')[0];
resetToast();
App.selectTaskApplicant('TK05', jPick.id);

const jInvite = outMessages()[0];
ok(!!jInvite, 'J01 选定创作者后写入一条站内消息');
eq(outMessages().length, jOut0 + 1, 'J02 已发送消息数 +1');
eq(jInvite.direction, 'out', 'J03 消息方向为「我发出」');
eq(jInvite.type, 'select-invite', 'J04 消息类型为「合作邀请」');
eq(jInvite.typeLabel, '合作邀请', 'J05 消息类型标签为「合作邀请」');
eq(jInvite.to, jPick.name, 'J06 收件人为被选定的创作者');
has(jInvite.title, taskOf('TK05').title, 'J07 消息标题带任务名');
has(jInvite.body, '响应接单', 'J08 消息正文提示响应接单');
eq(jInvite.taskId, 'TK05', 'J09 消息关联任务 id');
eq(jInvite.route, 'tasks', 'J10 消息点击跳转到任务广场');
eq(jInvite.read, true, 'J11 我发出的消息对我恒为已读');
eq(jInvite.status, '已送达', 'J12 发送状态为「已送达」');
eq(App.countUnreadMessages(), jUnread0, 'J13 发出消息不增加我的未读角标');
has(lastToast(), '站内消息', 'J14 Toast 告知站内消息已送达');

// --- J-B 催办响应 → 再下发一条「响应催办」消息（且不改任务状态） ---
const jPubOrder = ORDERS().find(o => (o.role === 'publisher' || o.role === 'buyer') && o.sourceId === 'TK05');
ok(!!jPubOrder && jPubOrder.status === '待接单', 'J15 发布台账处于「待接单」');
const jStatusBefore = taskOf('TK05').status;
const jOut1 = outMessages().length;
resetToast();
App.remindCreatorAccept(jPubOrder.id);

const jRemind = outMessages()[0];
eq(outMessages().length, jOut1 + 1, 'J16 催办响应写入一条站内消息');
eq(jRemind.direction, 'out', 'J17 催办消息方向为「我发出」');
eq(jRemind.type, 'accept-remind', 'J18 消息类型为「响应催办」');
eq(jRemind.typeLabel, '响应催办', 'J19 消息类型标签为「响应催办」');
eq(jRemind.to, jPick.name, 'J20 催办收件人为已选定的创作者');
eq(jRemind.taskId, 'TK05', 'J21 催办消息关联任务 id');
has(jRemind.body, '待接单', 'J22 催办正文说明任务当前状态');
eq(taskOf('TK05').status, jStatusBefore, 'J23 催办不改变任务状态');
has(lastToast(), '站内消息', 'J24 催办 Toast 告知站内消息已送达');
notHas(lastToast(), '邮件', 'J25 催办不再对外承诺「邮件通知」（实际只发站内消息）');

// 闸门：非「待接单」商单不可催办，且不得发消息
jPubOrder.status = '进行中';
const jOut2 = outMessages().length;
resetToast();
App.remindCreatorAccept(jPubOrder.id);
eq(outMessages().length, jOut2, 'J26 非「待接单」商单零消息写入（闸门生效）');
has(lastToast(), '已不在待响应状态', 'J27 拦截 Toast 说明原因');
jPubOrder.status = '待接单';
resetToast();
App.remindCreatorAccept('MO-NOT-EXIST');
eq(outMessages().length, jOut2, 'J28 未知商单同样被拦截且零消息写入');

// --- J-C 角标 · 通知下拉 · 消息中心 三处同源 ---
const jUnreadSeed = App.countUnreadMessages();
ok(jUnreadSeed > 0, 'J29 收件箱存在未读消息（角标有数据源）');
App.updateNotifyBadge();
eq(el('notify-badge').hidden, false, 'J30 有未读时通知角标可见');

const jDrop = el('notify-dropdown');
jDrop.hidden = true;
App.toggleNotifyDropdown();
eq(jDrop.hidden, false, 'J31 点击铃铛展开通知下拉');
has(jDrop.innerHTML, '查看全部站内消息', 'J32 下拉提供消息中心入口');
has(jDrop.innerHTML, '全部已读', 'J33 有未读时下拉提供「全部已读」');
has(jDrop.innerHTML, '我发出的站内消息', 'J34 下拉展示我刚发出的站内消息');
has(jDrop.innerHTML, jPick.name, 'J35 下拉可看到消息发给了谁');
App.toggleNotifyDropdown();
eq(jDrop.hidden, true, 'J36 再次点击收起下拉');

App.openMessagesModal('inbox');
eq(el('modal-messages').classList.contains('active'), true, 'J37 消息中心弹窗已打开');
const jInboxHtml = el('messages-center-body').innerHTML;
has(jInboxHtml, '来自', 'J38 收件箱渲染消息来源');
notHas(jInboxHtml, '合作邀请', 'J39 收件箱不混入我发出的消息');

App.switchMessagesTab('sent');
const jSentHtml = el('messages-center-body').innerHTML;
has(jSentHtml, '合作邀请', 'J40 已发送 Tab 渲染「合作邀请」');
has(jSentHtml, '响应催办', 'J41 已发送 Tab 渲染「响应催办」');
has(jSentHtml, '发给', 'J42 已发送渲染收件人');
has(jSentHtml, '已送达', 'J43 已发送标注送达状态');
notHas(jSentHtml, '来自', 'J44 已发送不混入收件箱消息');
has(el('messages-tab-sent').className, 'active', 'J45 已发送 Tab 高亮');

// 已读机制
App.switchMessagesTab('inbox');
const jFirstIn = inMessages()[0];
App.markMessageRead(jFirstIn.id);
eq(App.countUnreadMessages(), jUnreadSeed - 1, 'J46 单条已读后未读数 -1');
eq(inMessages().find(r => r.id === jFirstIn.id).read, true, 'J47 该条标记为已读');
App.markAllMessagesRead();
eq(App.countUnreadMessages(), 0, 'J48 全部已读后未读数为 0');
eq(el('notify-badge').hidden, true, 'J49 无未读时角标隐藏');
App.closeMessagesModal();
eq(el('modal-messages').classList.contains('active'), false, 'J50 消息中心可关闭');

// 点击行为：收件箱条目先标已读再跳转；已发送条目不标已读
const jInAction = App.buildMessageAction(inMessages()[0], true);
has(jInAction, 'App.closeMessagesModal', 'J51 消息中心内点击先关面板');
has(jInAction, 'App.markMessageRead', 'J52 收件箱条目点击标记已读');
has(jInAction, 'navigateTo', 'J53 收件箱条目按 route 跳转');
const jOutAction = App.buildMessageAction(outMessages()[0], false);
has(jOutAction, 'App.closeNotifyDropdown', 'J54 下拉内点击关闭下拉');
notHas(jOutAction, 'App.markMessageRead', 'J55 已发送条目不标记已读');

// --- J-D 静态契约 ---
const CSS_SRC = fs.readFileSync(path.join(ROOT, 'css', 'style.css'), 'utf8');
eq((APP_SRC.match(/^ {2}sendSiteMessage\s*:\s*function/gm) || []).length, 1,
  'J56 sendSiteMessage 定义唯一（唯一写入口）');
['getSiteMessages', 'countUnreadMessages', 'updateNotifyBadge', 'markMessageRead',
  'markAllMessagesRead', 'refreshMessages', 'renderNotifyDropdown', 'buildMessageAction',
  'openMessagesModal', 'closeMessagesModal', 'switchMessagesTab', 'renderMessagesModal'
].forEach((fn, i) => {
  eq((APP_SRC.match(new RegExp('^ {2}' + fn + '\\s*:\\s*function', 'gm')) || []).length, 1,
    `J${57 + i} ${fn} 定义唯一`);
});
has(MOCK_SRC, 'messages: {', 'J69 mock_data 提供 messages 数据集');
has(MOCK_SRC, '"direction": "in"', 'J70 种子含收件箱消息');
has(APP_SRC, "direction: 'out'", 'J71 已发送消息由写入口标记为 out 方向');
has(HTML, 'id="modal-messages"', 'J72 消息中心弹窗节点存在');
eq((HTML.match(/id="modal-messages"/g) || []).length, 1, 'J73 消息中心 id 唯一');
has(HTML, 'id="messages-center-body"', 'J74 消息列表容器存在');
has(HTML, 'id="messages-tab-inbox"', 'J75 收件箱 Tab 节点存在');
has(HTML, 'id="messages-tab-sent"', 'J76 已发送 Tab 节点存在');
has(HTML, 'id="messages-mark-all-btn"', 'J77 全部已读按钮存在');
has(HTML, 'id="notify-badge"', 'J78 通知角标可被 JS 控显隐');
has(CSS_SRC, '.notify-badge[hidden]', 'J79 角标 hidden 态样式已声明');
has(CSS_SRC, '.messages-center-body', 'J80 消息中心样式已声明');
has(CSS_SRC, '.message-item', 'J81 消息条目样式已声明');
has(APP_SRC, "typeLabel: '合作邀请'", 'J82 选定创作者下发「合作邀请」消息');
has(APP_SRC, "typeLabel: '响应催办'", 'J83 催办响应下发「响应催办」消息');
// 站内消息发送点：选定 / 催办（基础两处）+ 履约协同新增四类（日报、日报催办、提问、解答）
//   ⚠️ 这里断言的是**类型集合**而非固定条数——固定条数会随业务扩展假失败。
const SEND_TYPES = ['select-invite', 'accept-remind', 'daily-report', 'daily-report-urge', 'task-question', 'task-answer', 'custom-invite'];
SEND_TYPES.forEach((t, i) => {
  has(APP_SRC, `type: '${t}'`, `J84-${i + 1} 站内消息发送点覆盖类型 ${t}`);
});
ok((APP_SRC.match(/this\.sendSiteMessage\(/g) || []).length >= SEND_TYPES.length,
  'J84b 站内消息发送点数量 ≥ 已声明的类型数（全部经唯一写入口）');
notHas(APP_SRC, 'MockData.messages.records.push', 'J85 无旁路直写消息台账（写入口唯一）');
has(APP_SRC, 'MockData.messages.records.unshift(', 'J86 唯一写入口内部按时间倒序插入');
const jInitBlock = APP_SRC.slice(APP_SRC.indexOf('init: function()'), APP_SRC.indexOf('renderStaticIcons: function'));
has(jInitBlock, 'this.updateNotifyBadge();', 'J87 启动时同步通知角标');

// --- J-E 内联 onclick 与消息一致性（由真实渲染目检发现的回归点） ---
// ⚠️ 内联 onclick 里多条 App.xxx() 调用必须用 '; ' 分隔：裸空格拼接会让
// community / assets 这类单语句路由直接 SyntaxError（只有 tasks 路由因自带分号侥幸能跑）。
function callSepOk(action) {
  const s = String(action);
  const pos = [];
  let i = s.indexOf('App.');
  while (i !== -1) { pos.push(i); i = s.indexOf('App.', i + 4); }
  return pos.length > 1 && pos.every(p => p === 0 || s.slice(Math.max(0, p - 2), p) === '; ');
}
[
  { label: '收件箱条目（通知下拉）', a: App.buildMessageAction(inMessages()[0], false) },
  { label: '收件箱条目（消息中心）', a: App.buildMessageAction(inMessages()[0], true) },
  { label: '已发送条目', a: App.buildMessageAction(outMessages()[0], false) }
].forEach((c, i) => {
  ok(callSepOk(c.a), `J${88 + i} ${c.label} 的内联 onclick 各语句以分号分隔`, c.a);
});
has(App.buildMessageAction(inMessages()[0], false), 'App.markMessageRead', 'J91 收件箱条目行为含标记已读');

const jInviteMsg = outMessages().find(r => r.type === 'select-invite');
const jRemindMsg = outMessages().find(r => r.type === 'accept-remind');
ok(!!jInviteMsg && !!jRemindMsg, 'J92 选定 / 催办两条业务消息均已落库');
eq(jInviteMsg.to, jRemindMsg.to, 'J93 同一创作者的两条消息收件人一致');
eq(jInviteMsg.toAvatar, jRemindMsg.toAvatar, 'J94 同一创作者的两条消息头像一致（同源解析）');
has(jInviteMsg.body, MockData.currentUser.name, 'J95 邀请正文署名当前登录用户（发布方昵称）');
notHas(jInviteMsg.body, '我发布的任务', 'J96 邀请正文不暴露台账署名串（可读性回归）');

// =========================================================================
// K 组 · 履约协同：项目进度 / 项目日报 / 合作双方问答（状态：进行中）
//   样本：TK02（我是承接方 · 进度 70%）、TK02B（我是发布方 · 进度 65%）
// =========================================================================
const K_SNAP = snapshotAll();
const TK02 = () => taskOf('TK02');
const TK02B = () => taskOf('TK02B');
const outMsgs = (type) => App.getSiteMessages('out').filter(m => m.type === type);

// --- K-A 身份口径 ---
eq(App.getTaskPartyRole(TK02()), 'creator', 'K01 TK02（我是承接方）→ 合作角色 = creator');
eq(App.getTaskPartyRole(TK02B()), 'publisher', 'K02 TK02B（我是发布方）→ 合作角色 = publisher');
eq(App.getTaskPartyRole(taskOf('TK05')), 'publisher', 'K03 TK05（我发布 · 招募中）→ 合作角色 = publisher');
eq(App.getTaskPartyRole(taskOf('TK01')), '', 'K04 TK01（第三方任务）→ 无合作角色');
eq(App.getTaskPartyRole(null), '', 'K05 null 入参 → 无合作角色');

eq(App.getTaskFulfillment(TK02()).progress, 70, 'K06 TK02 履约进度读自 fulfillment 数据集');
eq((App.getTaskFulfillment(TK02()).dailyReports || []).length, 2, 'K07 TK02 已有 2 期项目日报');
eq((App.getTaskFulfillment(TK02()).questions || []).length, 2, 'K08 TK02 已有 2 条项目问答');

// 数据自愈：没有 fulfillment 的任务也不得死链
const healed = App.getTaskFulfillment(taskOf('TK06'));
ok(healed && Array.isArray(healed.dailyReports) && Array.isArray(healed.questions),
  'K09 无 fulfillment 的任务由台账自愈合成（日报/问答数组就绪，不死链）');

// 阶段口径：按进度区间唯一划分
eq(App.getFulfillmentStage(70).name, '阶段 3：4K 超分与渲染', 'K10 进度 70% → 阶段 3');
eq(App.getFulfillmentStage(10).name, '阶段 1：分镜与设定确认', 'K11 进度 10% → 阶段 1');
eq(App.getFulfillmentStage(100).name, '阶段 4：版权交付与验收', 'K12 进度 100% → 阶段 4');
eq(App.getFulfillmentStages().length, 4, 'K13 履约阶段恒为 4 段（唯一真源）');

// --- K-B 承接方填报项目进度与日报 ---
const kb = openDetail('TK02', 'mine', 'fulfillment');
has(kb.body, 'id="task-detail-fulfillment"', 'K14 详见页渲染出履约协同看板锚点');
has(kb.body, '项目进度与日报协同看板', 'K15 看板标题正确');
has(kb.body, 'id="daily-report-form"', 'K16 承接方可见【填报今日进度与日报】表单');
has(kb.body, 'id="daily-report-done"', 'K17 表单单据：今日完成内容输入区');
has(kb.body, "App.submitDailyReport('MO-T2')", 'K18 提交按钮绑定承接侧订单 id');
has(kb.body, 'App.resetDailyReportForm()', 'K19 提供清空草稿入口');
notHas(kb.top, '填报项目日报', 'K20 承接方顶栏已下线「填报项目日报」按钮（入口收敛到正文看板）');
has(kb.top, "App.openSubmitDeliveryModal('MO-T2')", 'K21 承接方顶栏仅保留「提交交付」动作');
notHas(kb.top, 'focusTaskDetailBlock', 'K21b 承接方顶栏已无日报锚点跳转按钮');

const kbReports0 = App.getTaskFulfillment(TK02()).dailyReports.length;
const kbOut0 = outMsgs('daily-report').length;
el('daily-report-progress').value = '85';
el('daily-report-stage').value = '阶段 4：版权交付与验收';
el('daily-report-done').value = '完成整片 4K 补帧与音画同步，输出 ProRes 母带初版。';
el('daily-report-plan').value = '提交成片初审并附 LUT 预设。';
el('daily-report-risk').value = '';
resetToast();
App.submitDailyReport('MO-T2');

eq(App.getTaskFulfillment(TK02()).dailyReports.length, kbReports0 + 1, 'K22 提交后日报台账 +1 期');
eq(App.getTaskFulfillment(TK02()).progress, 85, 'K23 履约进度被日报更新为 85%');
eq(TK02().progress, 85, 'K24 任务对象同步进度（大厅与详情一致）');
eq(ORDERS().find(o => o.id === 'MO-T2').progress, 85, 'K25 承接侧台账同步进度');
has(ORDERS().find(o => o.id === 'MO-T2').coreInfo, '85%', 'K26 承接侧台账 coreInfo 同步进度');
eq(outMsgs('daily-report').length, kbOut0 + 1, 'K27 日报向发布方下发一条站内消息');
has(lastToast(), '日报已提交', 'K28 提交后有明确 Toast 反馈');
const kbLast = App.getTaskFulfillment(TK02()).dailyReports.slice(-1)[0];
eq(kbLast.author, '小宇同学', 'K29 日报记录承接方署名');
eq(kbLast.progress, 85, 'K30 日报记录自身快照进度（历史可追溯）');
ok(!!kbLast.at && kbLast.at.indexOf('-') > 0, 'K31 日报记录留痕时间');

// 负向闸门：不许用日报绕过交付（100% 请走【提交交付】）
const kbReports1 = App.getTaskFulfillment(TK02()).dailyReports.length;
el('daily-report-progress').value = '100';
el('daily-report-done').value = '全部完成';
resetToast();
App.submitDailyReport('MO-T2');
has(lastToast(), '100%', 'K32 进度 100% 被拦截（须走【提交交付】）');
eq(App.getTaskFulfillment(TK02()).dailyReports.length, kbReports1, 'K33 被拦截时日报台账零变动');

// 负向闸门：必填校验
el('daily-report-progress').value = '90';
el('daily-report-done').value = '   ';
resetToast();
App.submitDailyReport('MO-T2');
has(lastToast(), '今日完成内容', 'K34 今日完成内容为空被拦截');
eq(App.getTaskFulfillment(TK02()).dailyReports.length, kbReports1, 'K35 校验失败时日报台账零变动');

// 负向闸门：发布方订单不得冒名填报
resetToast();
App.submitDailyReport('MO-P2');
has(lastToast(), '仅承接方', 'K36 发布方订单被拦截（仅承接方可填报）');

// 负向闸门：非「进行中」不得填报
resetToast();
App.submitDailyReport('MO-T3');
has(lastToast(), '进行中', 'K37 非「进行中」商单被拦截');
resetToast();
App.submitDailyReport('MO-T999');
has(lastToast(), '仅承接方', 'K38 未知商单被拦截');

// 清空草稿：不动数据
el('daily-report-done').value = '临时内容';
resetToast();
App.resetDailyReportForm();
eq(el('daily-report-done').value, '', 'K39 清空草稿后输入区已复位');
eq(App.getTaskFulfillment(TK02()).dailyReports.length, kbReports1, 'K40 清空草稿不产生任何台账变动');

// --- K-C 发布方随时查看进度与日报（双方同一份事实） ---
const kc = openDetail('TK02B', 'mine', 'fulfillment');
has(kc.body, 'id="task-detail-fulfillment"', 'K41 发布方视角同样渲染履约协同看板');
has(kc.body, '总体履约进度 65%', 'K42 发布方看到真实进度（不再写死 75%）');
has(kc.body, '国风水墨侠', 'K43 发布方可见承接方提交的日报');
has(kc.body, '10:15 提交', 'K44 日报展示提交时间（留痕）');
has(kc.body, '今日完成：', 'K45 日报展示今日完成内容');
notHas(kc.body, 'id="daily-report-form"', 'K46 发布方不出现填报表单（无越权入口）');
has(kc.body, "App.remindDailyReport('MO-P2')", 'K47 发布方提供【催办日报】入口');
has(kc.top, '查看进度与日报', 'K48 发布方顶栏入口为「查看进度与日报」');

// 承接方视角看到的是同一份日报（双向同一份事实）
const kc2 = openDetail('TK02', 'mine', 'fulfillment');
has(kc2.body, '完成中段尺度跃迁光效合成', 'K49 承接方看到自己提交的日报正文');
has(kc2.body, '共 ' + App.getTaskFulfillment(TK02()).dailyReports.length + ' 期', 'K50 日报期数与台账一致');

// 大厅访客：进度可见、日报正文脱敏
const kc3 = openDetail('TK02', 'hall');
has(kc3.body, '总体履约进度', 'K51 大厅访客可见整体履约进度');
has(kc3.body, '履约日报与项目协同内容仅对合作双方开放', 'K52 大厅访客日报正文脱敏提示');
notHas(kc3.body, '完成中段尺度跃迁光效合成', 'K53 大厅访客看不到日报正文');
notHas(kc3.body, 'id="daily-report-form"', 'K54 大厅访客无填报入口');

// 催办日报：只发消息、不改状态
const kcOut0 = outMsgs('daily-report-urge').length;
const kcStatus0 = TK02B().status;
openDetail('TK02B', 'mine', 'fulfillment');
resetToast();
App.remindDailyReport('MO-P2');
eq(outMsgs('daily-report-urge').length, kcOut0 + 1, 'K55 催办日报下发一条站内消息');
eq(TK02B().status, kcStatus0, 'K56 催办日报不改变任务状态');
has(lastToast(), '不改变任务状态', 'K57 催办明确声明不改状态');
resetToast();
App.remindDailyReport('MO-T2');
has(lastToast(), '仅发布方', 'K58 承接方订单不能催办日报');

// --- K-D 双方互问互答 ---
const kd = openDetail('TK02', 'mine');
has(kd.body, '商单协同问答', 'K59 进行中详情页渲染协同问答卡');
has(kd.body, '合作双方可互问互答', 'K60 问答卡标注双方可互问互答');
has(kd.body, "App.submitTaskQuestion('TK02')", 'K61 提问按钮绑定当前任务');
has(kd.body, 'id="task-qa-input"', 'K62 问答输入区存在');
has(kd.body, "App.openTaskAnswerModal('TK02','QA-TK02-2')", 'K63 未解答问题对对手方渲染【解答该问题】');
has(kd.body, '对方正在等待你的解答', 'K64 未答问题有明确待办提示');
notHas(kd.body, "App.openTaskAnswerModal('TK02','QA-TK02-1')", 'K65 已解答问题不再出现解答入口');
has(kd.body, '对比截图供确认', 'K66 已解答问题保留解答内容留痕');
has(kd.body, '答</span>', 'K67 已解答问题渲染「答」标签');

// 提问
const kdQ0 = App.getTaskFulfillment(TK02()).questions.length;
const kdOut0 = outMsgs('task-question').length;
el('task-qa-input').value = '结尾标板是否可直接使用官方品牌蓝？';
resetToast();
App.submitTaskQuestion('TK02');
eq(App.getTaskFulfillment(TK02()).questions.length, kdQ0 + 1, 'K68 提问写入问答台账');
const kdNewQ = App.getTaskFulfillment(TK02()).questions.slice(-1)[0];
eq(kdNewQ.role, 'creator', 'K69 提问记录我方角色（承接方）');
eq(kdNewQ.from, '小宇同学', 'K70 提问记录提问人');
eq(kdNewQ.answer, '', 'K71 新提问初始为未解答');
eq(el('task-qa-input').value, '', 'K72 提交后输入区被清空');
eq(outMsgs('task-question').length, kdOut0 + 1, 'K73 提问向对手方下发站内消息');

// 提问负向闸门
resetToast();
el('task-qa-input').value = '   ';
App.submitTaskQuestion('TK02');
has(lastToast(), '提问内容', 'K74 空提问被拦截');
openDetail('TK01', 'mine');
resetToast();
el('task-qa-input').value = '测试';
App.submitTaskQuestion('TK01');
has(lastToast(), '进行中', 'K75 非「进行中」任务不支持互问互答');
eq(App.getTaskFulfillment(taskOf('TK01')).questions.length, 0, 'K76 被拦截时零问答写入');

// 解答闸门：自己的问题不能自答 / 已解答不能重复答
openDetail('TK02', 'mine');
resetToast();
App.openTaskAnswerModal('TK02', kdNewQ.id);
has(lastToast(), '自己提出的问题', 'K77 不能解答自己提出的问题');
eq(App._pendingAnswer, null, 'K78 自答被拦截时不建立待答上下文');
resetToast();
App.openTaskAnswerModal('TK02', 'QA-TK02-1');
has(lastToast(), '已解答', 'K79 已解答的问题不可重复解答');

// 解答：对手方（发布方）提出的未答问题可答
const kdOut2 = outMsgs('task-answer').length;
App.openTaskAnswerModal('TK02', 'QA-TK02-2');
ok(!!App._pendingAnswer && App._pendingAnswer.questionId === 'QA-TK02-2', 'K80 打开解答弹窗记录待答上下文');
eq(el('qa-answer-question').innerText, App.getTaskFulfillment(TK02()).questions.find(q => q.id === 'QA-TK02-2').text,
  'K81 弹窗回显被解答的问题原文');
eq(el('qa-answer-input').value, '', 'K82 弹窗输入区初始为空');

resetToast();
App.submitTaskAnswer();
has(lastToast(), '解答内容', 'K83 空解答被拦截');
eq(App.getTaskFulfillment(TK02()).questions.find(q => q.id === 'QA-TK02-2').answer, '', 'K84 空解答零写入');

el('qa-answer-input').value = '包含。交付包内附达芬奇调色工程与 LUT 预设，可直接复用于年会二次剪辑。';
resetToast();
App.submitTaskAnswer();
const kdAnswered = App.getTaskFulfillment(TK02()).questions.find(q => q.id === 'QA-TK02-2');
eq(kdAnswered.answer.length > 0, true, 'K85 解答写入问答台账');
eq(kdAnswered.answerRole, 'creator', 'K86 解答记录作答方角色');
eq(kdAnswered.answerBy, '小宇同学', 'K87 解答记录作答人');
ok(!!kdAnswered.answerAt, 'K88 解答记录留痕时间');
eq(outMsgs('task-answer').length, kdOut2 + 1, 'K89 解答向提问方下发站内消息');
eq(App._pendingAnswer, null, 'K90 提交后清理待答上下文');

resetToast();
App.submitTaskAnswer();
has(lastToast(), '已失效', 'K91 无待答上下文时提交被拦截');

// 关闭弹窗清理上下文
App.openTaskAnswerModal('TK02B', 'QA-TK02B-1');
App.closeTaskAnswerModal();
eq(App._pendingAnswer, null, 'K92 关闭解答弹窗清理待答上下文');
resetToast();
App.openTaskAnswerModal('TK99', 'QA-X');
has(lastToast(), '未找到', 'K93 未知任务打开解答弹窗被拦截');

// 发布方侧：可向承接方提问
const kdPub = openDetail('TK02B', 'mine');
has(kdPub.body, "App.submitTaskQuestion('TK02B')", 'K94 发布方同样可提问（双方互通）');
has(kdPub.body, '以「发布方」身份向对方提问', 'K95 提问输入区按身份切换提示文案');
const kdPubQ0 = App.getTaskFulfillment(TK02B()).questions.length;
el('task-qa-input').value = '第三格分镜能否补一版低机位备选？';
resetToast();
App.submitTaskQuestion('TK02B');
eq(App.getTaskFulfillment(TK02B()).questions.length, kdPubQ0 + 1, 'K96 发布方提问写入同一问答台账');
eq(App.getTaskFulfillment(TK02B()).questions.slice(-1)[0].role, 'publisher', 'K97 发布方提问记录角色 publisher');

// --- K-E 非「进行中」状态不含新交互 ---
const ke = openDetail('TK06', 'mine', 'fulfillment');
notHas(ke.body, 'id="daily-report-form"', 'K98 待验收任务无日报填报表单');
notHas(ke.body, '商单协同问答', 'K99 待验收任务不走协同问答流');
has(ke.body, '商单交流与需求问答', 'K100 非进行中任务保留既有静态答疑卡');

restoreAll(K_SNAP);

// =========================================================================
// L 组 · 作品展厅「找 TA 定制」：明确价格 + 发送后自动生成「待接单」定向商单
// =========================================================================
const L_SNAP = snapshotAll();
const L_MSG = JSON.stringify(MockData.messages.records);
const LEN_BEFORE = TASKS().length;
const gw = (id) => (MockData.tasks.gallery.works || []).find(w => w.id === id) || null;
// 资金复位：本组会连续冻结两笔定制托管款（4,500 + 1,200），不复位会被「可消费余额不足」拦下
restoreFunds();

// --- L-A 打开弹窗：报价口径为「明确价格」 ---
eq(gw('GW01').author, '星际造梦师', 'L01 取 GW01（非当前用户）作定制样本');
resetToast();
App.openGalleryCustomModal('GW01');
eq(el('gallery-custom-title').value, `定制：${gw('GW01').title}`, 'L02 打开即预填商单标题');
eq(el('gallery-custom-budget').value, String(App.parseMoneyText(gw('GW01').basePrice)),
  'L03 报价默认取创作者基准报价（明确价格，非区间）');
has(el('gallery-custom-pkgs').innerHTML, 'gallery-price-pkg', 'L04 渲染创作者服务套餐卡片');
has(el('gallery-custom-pkgs').innerHTML, '¥ 4,500', 'L05 套餐为明码标价（含精确金额）');
has(el('gallery-custom-pkgs').innerHTML, '¥ 9,800', 'L05b 高档套餐同样为明码标价');
has(el('gallery-custom-price-hint').innerHTML, '明码标价', 'L06 提示区标明「明码标价」');
has(el('modal-gallery-creator').innerHTML, '星际造梦师', 'L07 创作者信息取自 author 字段（旧实现读 work.creator 恒空）');
has(el('modal-gallery-creator').innerHTML, gw('GW01').authorAvatar, 'L08 创作者头像取自 authorAvatar');
const modalHtml = HTML.slice(HTML.indexOf('id="modal-gallery-custom"'), HTML.indexOf('id="modal-gallery-custom"') + 5000);
notHas(modalHtml, '预算区间', 'L09 弹窗内已无「预算区间」字样');
notHas(modalHtml, '¥1,000-3,000', 'L10 弹窗内已无区间选项');

const pkgBtnStub = { classList: { add() {}, remove() {}, contains() { return false; } } };
App.pickGalleryCustomPrice(9800, pkgBtnStub);
eq(el('gallery-custom-budget').value, '9800', 'L11 点击套餐直接填入明确价格');

// --- L-B 明确价格闸门（区间 / 空值一律拦截） ---
resetToast();
el('gallery-custom-budget').value = '';
App.confirmGalleryCustom();
has(lastToast(), '明确的定制价格', 'L12 空报价被拦截');
eq(TASKS().length, LEN_BEFORE, 'L13 被拦截时零任务落库');

resetToast();
el('gallery-custom-budget').value = '0';
App.confirmGalleryCustom();
has(lastToast(), '明确的定制价格', 'L14 零元报价被拦截');
eq(TASKS().length, LEN_BEFORE, 'L15 零元时零任务落库');

resetToast();
App.currentCustomWorkId = 'GW-NOT-EXIST';
el('gallery-custom-budget').value = '3000';
App.confirmGalleryCustom();
has(lastToast(), '未找到该作品', 'L16 未知作品被拦截');

// --- L-C 发送定制邀请 → 自动生成一条「待接单」发布任务 ---
App.currentCustomWorkId = 'GW01';
el('gallery-custom-title').value = '30 秒校园品牌概念片（参考《数字生命》）';
el('gallery-custom-brief').value = '参考该作品风格制作 30 秒概念片，需分镜与配音。';
el('gallery-custom-deadline').value = '7 天内';
el('gallery-custom-budget').value = '5200';
const lOrderBefore = ORDERS().length;
const lOutBefore = App.getSiteMessages('out').length;
resetToast();
App.confirmGalleryCustom();

const lTask = TASKS()[0];
eq(TASKS().length, LEN_BEFORE + 1, 'L17 发送后新增一条发布任务');
eq(lTask.status, '待接单', 'L18 新任务状态为「待接单」（非直接进行中）');
eq(lTask.customSource, 'gallery', 'L19 任务标记为展厅定向来源');
eq(lTask.sourceWorkId, 'GW01', 'L20 任务回链来源作品');
eq(lTask.title, '30 秒校园品牌概念片（参考《数字生命》）', 'L21 任务标题取弹窗输入');
eq(lTask.rewardAmount, 5200, 'L22 任务赏金 = 明确报价数字');
eq(lTask.rewardMoney, '¥ 5,200', 'L23 任务赏金展示为明确价格');
eq(lTask.desc, '参考该作品风格制作 30 秒概念片，需分镜与配音。', 'L24 需求简述落入任务描述');
eq(lTask.escrow, true, 'L25 任务标记为平台托管');
has(lTask.escrowStatus, '¥ 5,200', 'L26 托管说明写明明确金额');
eq(lTask.selectedCreatorName, '星际造梦师', 'L27 受邀创作者 = 作品作者');
eq(lTask.applicants.length, 1, 'L28 定向商单仅一位受邀候选人');
eq(lTask.applicants[0].status, 'accepted', 'L29 受邀候选人状态为已入选');
eq(App.isPublisherOfTask(lTask), true, 'L30 当前用户是新任务的发布方');
has(lastToast(), '待接单', 'L31 Toast 明确新任务为「待接单」');
has(lastToast(), '响应商单', 'L32 Toast 引导去承接任务响应商单');

// --- L-D 双台账：发布方 + 承接方（承接列表可见的根因） ---
const lPub = ORDERS().find(o => o.role === 'publisher' && o.sourceId === lTask.id);
const lCre = ORDERS().find(o => o.role === 'creator' && o.sourceId === lTask.id);
ok(!!lPub, 'L33 生成发布方台账');
ok(!!lCre, 'L34 生成承接方台账');
eq(ORDERS().length, lOrderBefore + 2, 'L35 恰好新增两条台账（不产生重复条目）');
eq(lPub.status, '待接单', 'L36 发布方台账状态为待接单');
eq(lCre.status, '待接单', 'L37 承接方台账状态为待接单');
eq(lPub.type, 'gallery-custom', 'L38 发布方台账类型标记为展厅定制');
eq(lCre.assigneeName, '星际造梦师', 'L39 承接方台账记录受邀创作者');
eq(lCre.applicantId, lTask.applicants[0].id, 'L40 承接方台账回链候选人 id');
eq(lCre.rewardMoney, '¥ 5,200', 'L41 承接方台账赏金为明确价格');
eq(lPub.counterpart, '创作者 / 星际造梦师', 'L42 发布方台账对手方为受邀创作者');

// --- L-E 定制邀请站内消息 ---
const lOut = App.getSiteMessages('out');
eq(lOut.length, lOutBefore + 1, 'L43 发送后新增一条「我发出」的站内消息');
eq(lOut[0].type, 'custom-invite', 'L44 消息类型为定制邀请');
eq(lOut[0].to, '星际造梦师', 'L45 收件人为被邀请创作者');
eq(lOut[0].taskId, lTask.id, 'L46 消息回链新任务');
has(lOut[0].body, '¥ 5,200', 'L47 消息正文写明明确报价');
eq(lOut[0].direction, 'out', 'L48 方向为我发出（不增加自己的未读角标）');

// --- L-E2 大厅徽章口径回归（目检发现：active 分支曾把「待接单」硬编码成「履约中」）---
App.activeTasksPlazaLifecycle = 'active';
REAL_RENDER_PLAZA();
const lHall = el('tasks-plaza-list-container').innerHTML;
has(lHall, lTask.title, 'L49  待接单定向商单出现在大厅「履约中」标签');
has(lHall, '待接单', 'L50  大厅徽章为「待接单」（与承接列表 / 详情页同口径）');
has(lHall, 'badge-cyan', 'L51  待接单徽章使用青色色调');
eq((APP_SRC.match(/taskLife === 'active' \? '履约中'/g) || []).length, 0,
  'L52  大厅卡片已无「active 一律显示履约中」的硬编码分支');

// --- L-F 承接任务列表可见 → 响应商单 → 双方转「进行中」 ---
App.activeMyTasksRole = 'taken';
App.activeMyTasksStatus = '待接单';
const stubMyTasksL = App.renderMyTasks;
App.renderMyTasks = REAL_RENDER_MY_TASKS;
App.renderMyTasks();
App.renderMyTasks = stubMyTasksL;
const lMineHtml = el('tasks-mine-list-container').innerHTML;
has(lMineHtml, lTask.title, 'L53  承接任务列表出现该定向商单');
has(lMineHtml, '响应商单', 'L54  承接列表提供【响应商单】入口');
has(lMineHtml, `App.openCustomConfirmModal('${lCre.id}')`, 'L55  响应入口接到 openCustomConfirmModal');

App.openCustomConfirmModal(lCre.id);
has(el('custom-confirm-title').textContent, '合作邀请', 'L56  响应弹窗按广场商单口径渲染');
has(el('custom-confirm-accept').textContent, '响应接单', 'L57  主按钮为「响应接单」');
resetToast();
App.confirmCustomOrder();
eq(taskOf(lTask.id).status, '进行中', 'L58  响应后任务转「进行中」');
eq((ORDERS().find(o => o.id === lCre.id) || {}).status, '进行中', 'L59  承接方台账转「进行中」');
eq((ORDERS().find(o => o.id === lPub.id) || {}).status, '进行中', 'L60  发布方台账同步转「进行中」');
has(lastToast(), '已响应接单', 'L61  Toast 确认已响应接单');

// --- L-G 婉拒：退回「招募中」且候选人还原为待选（不卡死） ---
restoreFunds(); // 上一笔定制已冻结 4,500，复位后再发起 1,200 的婉拒用例
App.currentCustomWorkId = 'GW02';
el('gallery-custom-title').value = '婉拒回归用例';
el('gallery-custom-budget').value = '1200';
resetToast();
App.confirmGalleryCustom();
const gTask = TASKS()[0];
const gCre = ORDERS().find(o => o.role === 'creator' && o.sourceId === gTask.id);
const gPub = ORDERS().find(o => o.role === 'publisher' && o.sourceId === gTask.id);
App.openCustomConfirmModal(gCre.id);
resetToast();
App.declineCustomOrder();
eq(taskOf(gTask.id).status, '招募中', 'L62  婉拒后定向商单退回「招募中」');
eq(taskOf(gTask.id).applicants[0].status, 'pending', 'L63  候选人还原为待选（不被标 rejected 而卡死）');
eq((ORDERS().find(o => o.id === gCre.id) || {}).status, '未成交', 'L64  承接方台账标记未成交');
eq((ORDERS().find(o => o.id === gPub.id) || {}).status, '招募中', 'L65  发布方台账回到招募中');
has(lastToast(), '重新发起', 'L66  婉拒提示可重新发起邀请');

// --- L-H 静态契约 ---
notHas(APP_SRC, 'custom-budget-input', 'L67  旧死接线 id（custom-budget-input）已下线');
notHas(HTML, '预算区间', 'L68  全项目已无「预算区间」字样');
has(HTML, '定制报价 · 明确价格', 'L69  弹窗报价标签为「明确价格」');
has(APP_SRC, "type: 'custom-invite'", 'L70  定制邀请站内消息类型已登记');
eq((APP_SRC.match(/^ {2}createGalleryCustomTask\s*:\s*function/gm) || []).length, 1, 'L71  建单入口定义唯一');
eq((APP_SRC.match(/^ {2}confirmGalleryCustom\s*:\s*function/gm) || []).length, 1, 'L72  confirmGalleryCustom 定义唯一');
has(APP_SRC, "customSource === 'gallery'", 'L73  婉拒分支识别展厅定向商单');
has(CSS_SRC, '.gallery-price-input-wrap', 'L74  明确价格输入样式已就位');
has(CSS_SRC, '.gallery-price-pkg', 'L75  套餐卡片样式已就位');

// 本组新增的任务要手动清理（restoreAll 只按索引还原，不会删除新增条目）
MockData.messages.records = JSON.parse(L_MSG);
MockData.tasks.list.splice(0, TASKS().length - LEN_BEFORE);
restoreAll(L_SNAP);

// =========================================================================
// M 组 · 日报入口收敛：承接方不再有独立【填报日报】按钮，
//        改为「点整张卡片 → 进详情页 → 在项目进度与日报协同看板内填报」
// =========================================================================
const M_SNAP = snapshotAll();
const M_ROLE0 = App.activeMyTasksRole;
const M_ST0 = App.activeMyTasksStatus;
const stubMyTasksM = App.renderMyTasks;

App.activeMyTasksRole = 'taken';
App.activeMyTasksStatus = '全部';
App.renderMyTasks = REAL_RENDER_MY_TASKS;
App.renderMyTasks();
App.renderMyTasks = stubMyTasksM;
const mMineHtml = el('tasks-mine-list-container').innerHTML;

const mCreOrder = ORDERS().find(o => o.role === 'creator' && o.status === '进行中');
ok(!!mCreOrder, 'M01 存在一条承接方「进行中」台账用于验证');

notHas(mMineHtml, '填报日报</button>', 'M02 承接卡片已下线【填报日报】按钮');
has(mMineHtml, `App.openTaskDetailPage('${mCreOrder.sourceId}', 'fulfillment')`,
  'M03 承接卡片整卡点击直达详情页履约看板（替代原按钮）');
has(mMineHtml, `App.openSubmitDeliveryModal('${mCreOrder.id}')`, 'M04 承接卡片保留【提交交付】');
has(mMineHtml, `App.openDisputeModal('${mCreOrder.id}')`, 'M05 承接卡片保留【申请仲裁】');

// 发布方视角不受本轮改动影响
App.activeMyTasksRole = 'published';
App.activeMyTasksStatus = '全部';
App.renderMyTasks = REAL_RENDER_MY_TASKS;
App.renderMyTasks();
App.renderMyTasks = stubMyTasksM;
const mPubHtml = el('tasks-mine-list-container').innerHTML;
has(mPubHtml, '查看进度日报', 'M06 发布方卡片仍保留【查看进度日报】');
has(mPubHtml, '催办日报', 'M07 发布方卡片仍保留【催办日报】');
App.activeMyTasksRole = M_ROLE0;
App.activeMyTasksStatus = M_ST0;

// 详情页正文是日报填报的唯一落点
const md = openDetail(mCreOrder.sourceId, 'mine', 'fulfillment');
has(md.body, 'id="daily-report-form"', 'M08 详情页正文仍是日报填报唯一落点');
has(md.body, `App.submitDailyReport('${mCreOrder.id}')`, 'M09 正文表单绑定承接侧订单 id');
notHas(md.top, '填报项目日报</button>', 'M10 详情页顶栏已无【填报项目日报】按钮');
has(md.top, '提交交付', 'M11 详情页顶栏保留【提交交付】');

// 静态契约：按钮文案全项目下线（toast 文案中的「填报项目日报」不属按钮，不在此列）
notHas(APP_SRC, '填报日报</button>', 'M12 全项目已无【填报日报】按钮');
notHas(APP_SRC, '填报项目日报</button>', 'M13 全项目已无【填报项目日报】按钮');
restoreAll(M_SNAP);

// =========================================================================
// F 组 · 静态契约
// =========================================================================
const reIsPub = /^ {2}isPublisherOfTask\s*:\s*function/gm;
eq((APP_SRC.match(reIsPub) || []).length, 1, 'F01 isPublisherOfTask 定义唯一');
eq((APP_SRC.match(/^ {2}selectTaskApplicant\s*:\s*function/gm) || []).length, 1, 'F02 selectTaskApplicant 定义唯一');

const pubBlock = APP_SRC.slice(
  APP_SRC.indexOf('isPublisherOfTask: function'),
  APP_SRC.indexOf('isMyTakenOrder: function')
);
has(pubBlock, 'MockData.tasks.myOrders', 'F03 发布方判定读取「我的任务」台账');
has(pubBlock, "o.role === 'publisher'", 'F04 台账匹配 role 为 publisher');
notHas(pubBlock, ".includes('企业')", 'F05 旧关键词白名单（企业）已下线');
notHas(pubBlock, ".includes('品牌')", 'F06 旧关键词白名单（品牌）已下线');
notHas(pubBlock, ".includes('发布方')", 'F07 旧关键词白名单（发布方）已下线');

has(APP_SRC, `id="task-detail-applicants"`, 'F08 候选人列表渲染锚点 id');
has(APP_SRC, "getElementById(anchorId)", 'F09 顶栏按钮经统一入口按 id 定位锚点');
has(APP_SRC, "'仅该任务的发布方可选定合作创作者'", 'F10 selectTaskApplicant 内含发布方闸门');

// 选定入口的渲染条件：manual + 招募中 + 是发布方
const canSelectLine = APP_SRC.split(/\r?\n/).find(l => /const canSelect =/.test(l)) || '';
has(canSelectLine, "status === '招募中'", 'F12 选定入口限「招募中」状态');
has(canSelectLine, 'isPublisher', 'F13 选定入口以发布方身份为前提');
notHas(canSelectLine, 'manage', 'F14 选定入口不再受「从哪个视图进入」限制');

// index.html 未被动过（详情页锚点是 JS 动态渲染的容器）
has(HTML, 'id="tasks-detail-body"', 'F15 详情页容器节点仍在');
has(HTML, 'id="task-detail-top-actions"', 'F16 详情页顶栏节点仍在');

// 新增契约方法必须各自唯一（防止落进 app.js 的重复方法名陷阱）
['requestSelectApplicant', 'renderSelectCreatorModal', 'closeSelectCreatorModal',
  'confirmSelectCreator', 'openApplicantProfileModal', 'selectFromCreatorProfile',
  'getCreatorProfile', 'remindCreatorAccept'].forEach((fn, i) => {
    eq((APP_SRC.match(new RegExp('^ {2}' + fn + '\\s*:\\s*function', 'gm')) || []).length, 1,
      `F${17 + i} ${fn} 定义唯一`);
  });

// index.html 新增节点
has(HTML, 'id="modal-select-creator"', 'F25 二次确认弹窗节点存在');
has(HTML, 'id="select-creator-card"', 'F26 确认弹窗候选人名片容器存在');
has(HTML, 'id="select-creator-impact"', 'F27 确认弹窗状态影响提示容器存在');
has(HTML, 'id="modal-creator-profile"', 'F28 创作者主页抽屉节点存在（复用既有节点，未新建重复 id）');
eq((HTML.match(/id="modal-creator-profile"/g) || []).length, 1, 'F29 创作者主页抽屉 id 唯一');
has(HTML, 'id="custom-confirm-title"', 'F30 响应商单弹窗标题可动态切换');
has(HTML, 'id="custom-confirm-accept"', 'F31 响应商单主按钮可动态切换文案');

// 状态口径接入点
has(APP_SRC, "task.status = '待接单'", 'F32 选定动作写入「待接单」状态');
has(APP_SRC, "s === '待接单'", 'F33 「待接单」纳入履约中生命周期（不可再报名）');
has(APP_SRC, "'待接单': '待接单'", 'F34 「待接单」纳入订单状态文案映射');
has(APP_SRC, "'全部', '待接单', '待选定'", 'F35 承接任务状态标签含「待接单」');
has(APP_SRC, 'assigneeName', 'F36 承接商单标注被选定的创作者');
has(APP_SRC, '_preSelectStatus', 'F37 选定前快照候选人状态（供婉拒还原）');

// 候选人 id 兜底
has(APP_SRC, 'task.applicants.forEach((a, i) =>', 'F38 候选人 id 缺失时自动补齐');
// 创作者档案真源
has(APP_SRC, 'MockData.tasks.creatorProfiles', 'F39 创作者档案读取显式 creatorProfiles');
has(APP_SRC, "source: 'applicant'", 'F40 未知候选人现场合成档案（不死链）');
// mock_data 提供档案数据
has(MOCK_SRC, '"creatorProfiles"', 'F41 mock_data 提供 creatorProfiles 数据集');
ok((MOCK_SRC.match(/"id": "CR\d+"/g) || []).length >= 9, 'F42 creatorProfiles 覆盖全部待审候选人');

// --- F-K 履约协同静态契约（新增方法必须各自唯一，防落进 app.js 重复方法名陷阱） ---
[
  'getTaskFulfillment', 'getTaskPartyRole', 'getTaskPublisherLabel', 'getTaskCounterpartLabel',
  'renderFulfillmentBoard', 'submitDailyReport', 'remindDailyReport', 'resetDailyReportForm',
  'submitTaskQuestion', 'openTaskAnswerModal', 'closeTaskAnswerModal', 'submitTaskAnswer',
  'renderTaskQaThread', 'getTaskOpenActionLabel', 'focusTaskDetailBlock',
  'getFulfillmentStages', 'getFulfillmentStage', 'getDemoNowText'
].forEach((fn, i) => {
  eq((APP_SRC.match(new RegExp('^ {2}' + fn + '\\s*:\\s*function', 'gm')) || []).length, 1,
    `F${43 + i} ${fn} 定义唯一`);
});

has(APP_SRC, 'id="task-detail-fulfillment"', 'F61 履约协同看板区块锚点已落地');
has(APP_SRC, "this._detailFocusFulfillment ? 'task-detail-fulfillment'", 'F62 入场焦点标志被真正消费（跳转不再空操作）');
has(HTML, 'id="modal-qa-answer"', 'F63 解答提问弹窗节点存在');
eq((HTML.match(/id="modal-qa-answer"/g) || []).length, 1, 'F64 解答提问弹窗 id 唯一');
has(HTML, 'id="qa-answer-question"', 'F65 解答弹窗问题回显容器存在');
has(HTML, 'id="qa-answer-input"', 'F66 解答弹窗输入区存在');
has(MOCK_SRC, '"dailyReports"', 'F67 mock_data 提供项目日报数据集');
has(MOCK_SRC, '"questions"', 'F68 mock_data 提供双方问答数据集');
has(MOCK_SRC, '"id": "TK02B"', 'F69 mock_data 补齐发布方视角进行中样本（同时修复 MO-P2 死链）');
has(CSS_SRC, '.fulfillment-day.is-risk', 'F70 风险日报样式已声明');
has(CSS_SRC, '.qa-answer-question', 'F71 解答弹窗样式已声明');
has(CSS_SRC, '.qna-meta', 'F72 问答留痕元信息样式已声明');

// 「查看名额」按钮文案：只允许出现在注释里，不得再作为按钮标签渲染
const viewQuotaLabels = APP_SRC.split(/\r?\n/).filter(l => l.indexOf('查看名额') !== -1 && /<button|innerHTML/.test(l));
eq(viewQuotaLabels.length, 0, 'F73「查看名额」按钮文案已全项目下线');
has(APP_SRC, "getTaskOpenActionLabel: function(task) {\n    return '选定创作者';", 'F74 招募中发布方入口收敛为「选定创作者」单一文案');
has(APP_SRC, "return 'manual';", 'F74b getTaskAcceptMode 恒返回 manual（报名制单点收敛）');

// ------------------------- 汇总 -------------------------
console.log('');
if (fails.length === 0) {
  console.log('  通过 ' + pass + ' 项 ｜ 失败 0 项');
  console.log(' 结论：招募中 → 选定创作者闭环自检通过。\n');
  process.exit(0);
} else {
  console.log('  通过 ' + pass + ' 项 ｜ 失败 ' + fails.length + ' 项');
  fails.forEach((f, i) => console.log('   ✗ ' + (i + 1) + '. ' + f));
  console.log('');
  process.exit(1);
}
