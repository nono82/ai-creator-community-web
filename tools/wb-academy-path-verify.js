/**
 * 成长学院 · 成长路径等级说明自检
 *
 * 覆盖：
 *   ① 数据层：Lv.1~Lv.5 每级都具备 等级定位 goal / 业务范围 scope / 积分门槛区间 /
 *      需完成清单 requirements[] / 解锁权益 perks[]；门槛区间单调不重叠；图标素材齐全。
 *   ② 判定层：积分型条件由真实创作积分动态判定（改积分→判定随之变）；完成度 n/m 计算正确。
 *   ③ 渲染层：路径卡片显示「n / m 项达成」且点击打开等级详情弹窗；详情弹窗含
 *      晋级门槛 / 需完成内容 / 达成后解锁 三段；「查看完整路径」5 级全列（旧版只有 Lv.3~5）。
 *   ④ 未解锁等级同样可查看晋级条件（旧版会被 Toast 拦在门外）。
 *   ⑤ 静态契约：新方法定义唯一、新增节点存在、旧硬编码 focus 数组已下线。
 *
 * 用法： node temp/wb-academy-path-verify.js
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
const CSS_SRC = fs.readFileSync(path.join(ROOT, 'css', 'style.css'), 'utf8');

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

['growth-steps-container', 'growth-level-head', 'growth-level-body', 'growth-level-actions',
  'growth-level-sub', 'level-perks-body', 'level-perks-subtitle',
  'modal-growth-level', 'modal-level-perks'].forEach(id => el(id));

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
const lastToast = () => toasts.length ? toasts[toasts.length - 1] : '';
App.navigateTo = function () { App._nav = (App._nav || 0) + 1; };
App.setTasksMode = function (m) { App._lastMode = m; };

const PATHS = () => MockData.academy.paths;
const PTS = () => Number(MockData.currentUser.learningPoints || 0);
const isActive = (id) => el(id).classList.contains('active');

// =========================================================================
// A 组 · 数据层：5 级结构完整性
// =========================================================================
eq(PATHS().length, 5, 'A01 成长路径恒为 5 级（Lv.1 ~ Lv.5）');

const EXPECT_NAME = ['体验者', '进阶者', '内容创作者', '商业创作者', 'OPC 创业者'];
PATHS().forEach((p, i) => {
  const lv = p.level;
  eq(p.name, EXPECT_NAME[i], `A02.${i} ${lv} 等级名称`);
  ok(!!p.icon, `A03.${i} ${lv} 具备图标字段`);
  ok(fs.existsSync(path.join(ROOT, 'assets', 'icons', 'academy', p.icon + '.png')),
    `A04.${i} ${lv} 图标素材存在`);
  ok(!!p.goal && p.goal.length > 6, `A05.${i} ${lv} 具备等级定位 goal`);
  ok(!!p.scope && p.scope.length > 6, `A06.${i} ${lv} 具备业务范围 scope`);
  ok(typeof p.pointsMin === 'number', `A07.${i} ${lv} 具备积分门槛下界`);
  ok(Array.isArray(p.requirements) && p.requirements.length >= 4,
    `A08.${i} ${lv} 需完成清单不少于 4 项`);
  ok(Array.isArray(p.perks) && p.perks.length >= 3,
    `A09.${i} ${lv} 解锁权益不少于 3 项`);
  p.requirements.forEach((r, k) => {
    ok(!!r.text, `A10.${i}.${k} ${lv} 第 ${k + 1} 条条件有文本`);
    ok(r.points != null || r.done !== undefined,
      `A11.${i}.${k} ${lv} 第 ${k + 1} 条条件有判定依据（points 或 done）`);
  });
});

// 门槛区间单调递进、不重叠
const mins = PATHS().map(p => p.pointsMin);
ok(mins.every((v, i) => i === 0 || v > mins[i - 1]), 'A12 各级积分门槛下界严格递增');
PATHS().forEach((p, i) => {
  if (i < PATHS().length - 1) {
    eq(p.pointsMax, PATHS()[i + 1].pointsMin - 1, `A13.${i} ${p.level} 门槛上界 = 下一级下界 - 1`);
  } else {
    eq(p.pointsMax, null, 'A14 最高等级 Lv.5 门槛上界为 null（不封顶）');
  }
});

// 数据数值须与真实 user 档案一致（禁止凭空编造）
const U = MockData.currentUser;
eq(PATHS()[3].pointsMin, 2000, 'A15 Lv.4 门槛 2000（当前 2680 分已跨过）');
ok(PTS() >= PATHS()[3].pointsMin && PTS() < PATHS()[4].pointsMin,
  'A16 当前积分恰好落在 Lv.4 区间内（与 currentUser.level=4 自洽）');
has(PATHS()[3].requirements.map(r => r.text).join('|'), '准时交付率', 'A17 Lv.4 条件引用真实交付率口径');
has(PATHS()[3].requirements[3].metric, U.deliveryRate, 'A18 Lv.4 交付率指标取真实值 99.4%');
has(PATHS()[4].requirements[2].metric, U.income.replace('¥', '¥'), 'A19 Lv.5 收益指标取真实累计收益');

// =========================================================================
// B 组 · 判定层：积分动态判定与完成度
// =========================================================================
const stNull = App.getGrowthRequirementState(null);
eq(stNull.done, false, 'B01 空条件 → 未达成（不抛错）');

const stPtsOk = App.getGrowthRequirementState({ text: 't', points: 2500 });
eq(stPtsOk.done, true, 'B02 积分型条件：2680 ≥ 2500 → 达成');
has(stPtsOk.metric, '2,680 / 2,500 积分', 'B03 积分型条件回显「当前 / 要求」对照');

const stPtsNo = App.getGrowthRequirementState({ text: 't', points: 4000 });
eq(stPtsNo.done, false, 'B04 积分型条件：2680 < 4000 → 未达成');

const stSeed = App.getGrowthRequirementState({ text: 't', done: true, metric: '16 / 12 门' });
eq(stSeed.done, true, 'B05 非积分型条件按种子 done 判定');
eq(stSeed.metric, '16 / 12 门', 'B06 非积分型条件回显 metric');

const p4 = App.getGrowthLevelProgress(3);
eq(p4.total, 5, 'B07 Lv.4 共 5 项需完成内容');
eq(p4.done, 4, 'B08 Lv.4 已达成 4 项（15 单交付未达成）');
eq(p4.percent, 80, 'B09 Lv.4 完成度 80%');
eq(p4.pointsOk, true, 'B10 Lv.4 积分门槛已达成');
eq(p4.pointsGap, 0, 'B11 Lv.4 积分缺口 0');

const p5 = App.getGrowthLevelProgress(4);
eq(p5.done, 2, 'B12 Lv.5 已达成 2 项（积分 / 30 单 / 收益未达成）');
eq(p5.percent, 40, 'B13 Lv.5 完成度 40%');
eq(p5.pointsGap, 5000 - PTS(), 'B14 Lv.5 积分缺口 = 5000 - 2680 = 2320');

const p1 = App.getGrowthLevelProgress(0);
eq(p1.percent, 100, 'B15 Lv.1 全部达成（100%）');
eq(p1.allDone, true, 'B16 Lv.1 allDone = true');

// 动态性证明：改积分 → 判定随之变化（不是写死的种子状态）
const PTS_OLD = MockData.currentUser.learningPoints;
MockData.currentUser.learningPoints = 5000;
eq(App.getGrowthLevelProgress(4).pointsOk, true, 'B17 积分调到 5000 后 Lv.5 门槛自动达成');
eq(App.getGrowthRequirementState({ text: 't', points: 4000 }).done, true, 'B18 积分型条件随积分变化');
MockData.currentUser.learningPoints = 300;
eq(App.getGrowthLevelProgress(3).pointsOk, false, 'B19 积分降到 300 后 Lv.4 门槛转为未达成');
MockData.currentUser.learningPoints = PTS_OLD;
eq(App.getGrowthLevelProgress(3).pointsOk, true, 'B20 还原积分后判定复原');

// 越界安全
const pOut = App.getGrowthLevelProgress(99);
eq(pOut.total, 0, 'B21 越界索引 → 总项数 0（不抛错）');
eq(pOut.percent, 0, 'B22 越界索引 → 完成度 0');

// =========================================================================
// C 组 · 渲染层：路径卡片 + 等级详情 + 完整路径对照
// =========================================================================
App.renderAcademy();
const stepsHtml = el('growth-steps-container').innerHTML;
eq((stepsHtml.match(/growth-step-card /g) || []).length, 5, 'C01 路径渲染 5 张等级卡片');
has(stepsHtml, 'growth-step-req', 'C02 卡片展示达成度文案');
has(stepsHtml, '4 / 5 项达成', 'C03 Lv.4 卡片显示「4 / 5 项达成」');
has(stepsHtml, '2 / 5 项达成', 'C04 Lv.5 卡片显示「2 / 5 项达成」');
has(stepsHtml, 'growth-step-bar-fill', 'C05 卡片带达成度进度条');
has(stepsHtml, "App.openGrowthLevelModal(0)", 'C06 卡片点击打开等级详情弹窗');
notHas(stepsHtml, 'App.onGrowthPathClick(', 'C07 卡片不再走旧 Toast 入口');

// 单级详情：未解锁的 Lv.5 也必须能看（旧版会 Toast「尚未解锁」并 return）
toasts.length = 0;
App.openGrowthLevelModal(4);
eq(isActive('modal-growth-level'), true, 'C08 打开 Lv.5 详情弹窗');
eq(toasts.length, 0, 'C09 未解锁等级不再被 Toast 拦在门外');
const dHead = el('growth-level-head').innerHTML;
const dBody = el('growth-level-body').innerHTML;
has(dHead, 'Lv.5', 'C10 详情头部含等级');
has(dHead, 'OPC 创业者', 'C11 详情头部含等级名称');
has(dHead, '未解锁', 'C12 详情头部含状态徽章');
has(dBody, '晋级门槛', 'C13 详情含「晋级门槛」段');
has(dBody, '需完成内容', 'C14 详情含「需完成内容」段');
has(dBody, '达成后解锁', 'C15 详情含「达成后解锁」段');
has(dBody, '≥ 5,000 积分', 'C16 详情展示门槛区间');
has(dBody, '还差 2,320 积分', 'C17 详情展示积分缺口');
eq((dBody.match(/growth-level-check /g) || []).length, 5, 'C18 详情列出 5 条需完成内容');
eq((dBody.match(/growth-level-check is-done/g) || []).length, 2, 'C19 其中 2 条标记已达成');
has(dBody, '12 / 30 单', 'C20 未达成项展示量化对照');
has(dBody, '导师收益与学徒孵化', 'C21 详情展示解锁权益');
has(dBody, '可组建协作团队派单交付', 'C22 详情展示业务范围 scope');
has(el('growth-level-actions').innerHTML, '去作品展厅接单', 'C23 Lv.5 行动按钮指向展厅');

App.closeGrowthLevelModal();
eq(isActive('modal-growth-level'), false, 'C24 关闭详情弹窗');

// Lv.1 未到接单阶段 → 行动按钮指向学院
App.openGrowthLevelModal(0);
has(el('growth-level-actions').innerHTML, '去学院学习', 'C25 Lv.1 行动按钮指向学院学习');
App.closeGrowthLevelModal();

// 旧入口收敛
App.onGrowthPathClick(2);
eq(isActive('modal-growth-level'), true, 'C26 旧入口 onGrowthPathClick 收敛为打开详情');
App.closeGrowthLevelModal();

// 完整路径对照：5 级全列（旧版硬编码只有 Lv.3 ~ Lv.5）
App.openLevelPerksModal();
const lpBody = el('level-perks-body').innerHTML;
eq((lpBody.match(/growth-path-row /g) || []).length, 5, 'C27 完整路径对照列出 5 个等级');
has(lpBody, 'Lv.1', 'C28 对照含 Lv.1（旧版缺失）');
has(lpBody, 'Lv.2', 'C29 对照含 Lv.2（旧版缺失）');
has(lpBody, 'Lv.5', 'C30 对照含 Lv.5');
has(lpBody, '创作积分门槛', 'C31 每级展示积分门槛');
has(lpBody, 'level-perk-check', 'C32 每级展示需完成清单');
has(lpBody, 'growth-level-perk', 'C33 每级展示解锁权益');
has(lpBody, "App.closeModal('modal-level-perks'); App.openGrowthLevelModal(0);",
  'C34 每级可下钻单级详情（先关父弹窗避免堆叠）');
has(el('level-perks-subtitle').textContent, '距 Lv.5 OPC 创业者 还差 2,320 积分',
  'C35 对照页副标展示距下一级缺口');
has(lpBody, '冲刺中', 'C36 当前等级 Lv.4 标注「冲刺中」');

// =========================================================================
// D 组 · 静态契约
// =========================================================================
['getGrowthRequirementState', 'getGrowthLevelProgress', 'openGrowthLevelModal',
  'closeGrowthLevelModal', 'renderGrowthLevelModal'].forEach((fn, i) => {
    eq((APP_SRC.match(new RegExp('^ {2}' + fn + '\\s*:\\s*function', 'gm')) || []).length, 1,
      `D${String(i + 1).padStart(2, '0')} ${fn} 定义唯一`);
  });

['modal-growth-level', 'growth-level-head', 'growth-level-body', 'growth-level-actions']
  .forEach((id, i) => has(HTML, 'id="' + id + '"', `D${String(i + 6).padStart(2, '0')} 新增节点 #${id} 存在`));

notHas(APP_SRC, 'const focus = [', 'D10 等级权益已改为数据驱动（旧硬编码 focus 数组下线）');
has(MOCK_SRC, 'pointsMin', 'D11 数据层提供积分门槛字段');
has(MOCK_SRC, 'requirements:', 'D12 数据层提供需完成清单');
has(MOCK_SRC, 'perks:', 'D13 数据层提供解锁权益');
has(MOCK_SRC, 'goal:', 'D14 数据层提供等级定位');
has(MOCK_SRC, 'scope:', 'D15 数据层提供业务范围');

['.growth-step-bar', '.growth-step-req', '.growth-level-checklist', '.growth-level-check',
  '.growth-level-perks', '.growth-path-row', '.growth-path-more', '.level-perks-grid']
  .forEach((c, i) => has(CSS_SRC, c, `D${16 + i} 样式类 ${c} 已声明`));

// index.html 内所有 App.* 处理函数都必须有定义（防止死接线）
const called = [...new Set([...HTML.matchAll(/App\.([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)].map(m => m[1]))];
const defined = new Set([...APP_SRC.matchAll(/^ {0,4}([A-Za-z_][A-Za-z0-9_]*)\s*:\s*function/gm)].map(m => m[1]));
const missing = called.filter(f => !defined.has(f));
eq(missing.length, 0, 'D24 index.html 内 App.* 调用点全部有定义' + (missing.length ? '：' + missing.join(', ') : ''));

// ------------------------- 汇总 -------------------------
console.log('');
if (fails.length) {
  console.log('失败明细：');
  fails.forEach(f => console.log('  ✗ ' + f));
}
console.log(`  通过 ${pass} 项 ｜ 失败 ${fails.length} 项`);
console.log(fails.length
  ? ' 结论：成长路径等级说明自检未通过。'
  : ' 结论：成长路径 Lv.1~Lv.5 门槛与需完成内容已完整表达。');
console.log('');
process.exit(fails.length ? 1 : 0);
