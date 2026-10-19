#!/usr/bin/env node
/**
 * SPEC-003「成长学院（课程研习与认证）」自检 —— **冻结自检套件（契约先行）**
 * ---------------------------------------------------------------------------
 * ⚠️ **本套件是"红"的**（登记在 gates-baseline.json 的 l3ExpectedRed 中）。
 *    它**不是回归防线**，而是 **SPEC-003 的待实现清单**：
 *    依 Constitution 原则 10 —— 「**先跑门禁拿到待实现清单，再动手写代码**；
 *    校验器是本轮 TODO 生成器，不是事后检查官」。
 *
 * 顺序（项目自己的「五道工序」）：
 *   契约先行 → **冻结自检（本文件）** → 最小实现 → 三道门禁 → 回填收敛
 *   ⇒ **必须先有本文件的断言，再有实现**；反过来（先实现后补断言）就是"照着实现写测试"，失去意义。
 *
 * 断言来源：`specs/003-growth-academy/spec.md` 的验收场景（SC-003-01 ~ 20）。
 *
 * ---------------------------------------------------------------------------
 * 【本套件冻结的契约】（10 项；实现必须逐字遵守 —— 命名即契约 CON-032）
 * ---------------------------------------------------------------------------
 *  ① `App.awardLearningPoints(amount, reason)` → number | **null**
 *     · **全站唯一的加分入口**（FR-003-01）。写累计创作积分 **并** 在 `studyLog` 头部插入一条流水，返回**新积分**。
 *     · 🔴 **只增不减**：`amount` 非正数 / 非有限数字 ⇒ 返回 `null`，**积分与流水均不变**（CON-022 同族）。
 *     · ⚠️ 例外：`amount === 0` 亦视为无效（**不得**写一条 0 分流水）。
 *
 *  ② `App.getLearningPoints()` → number
 *     · **创作积分的唯一读取点**（消除 `currentUser.points` 与 `currentUser.learningPoints` 双写）。
 *     · 🔴 缺数据（`undefined` / `NaN`）⇒ **显式失败语义**：返回 `-1`（**不得**返回 0 冒充"零积分"）。
 *       （理由：`EX-003-16` —— "缺数据默认放行"的第 1 种形态是"默认一个金额"）
 *
 *  ③ `App.syncAcademyStats()` → `{ hours, courses, certs, points }`
 *     · **统计回写唯一入口**（FR-003-02）。一次刷新：侧栏 4 维（`#academy-stat-hours/-courses/-certs/-points`）、
 *       记录页 4 维、streak 进度条、证书计数。
 *     · 🔴 **不得硬编码**（FR-003-11）；数值必须与 `MockData` 真源一致。
 *
 *  ④ `App.markLessonDone(planId, lessonId)` → `{ points, progress, levelUp }` | **null**
 *     · **课节完成唯一入口**（FR-003-03）。置 `done` → **按课节数重算** `plan.progress` →
 *       下一节置 `learning` → 加分（+30） → 结业发证钩子 → 晋级判定 → 统计回写。
 *     · 🔴 **精确标识**：`planId` + `lessonId` 必须命中；**任一未命中 ⇒ 返回 `null` 且不改动任何数据**
 *       （**绝对禁止**兜底到 `plans[0]` —— 缺陷 ③ / `EX-003-10`）。
 *     · 🔴 视频课未看够 `playerConfig.minFinishPercent`（= 95）⇒ **拒绝**，课节状态不变（FR-003-32）。
 *     · 🔴 **幂等**：已完成课节重复调用 ⇒ 返回 `null`，**积分 / 进度 / 流水均不变**（FR-003-09）。
 *
 *  ⑤ `App.evaluateLevelUp(prevLevel)` → number | **null**
 *     · **晋级判定唯一入口**（FR-003-04）；判据 = **累计创作积分达标**（`Q-003` 裁决值），
 *       **不是**"本次会话完成了几节"（缺陷 ②）。
 *     · 返回值：新等级（> `prevLevel`）| `null`（未晋级）。**等级只升不降**（FR-003-08）。
 *     · 🔴 空前积分（`undefined` / 非数字）⇒ **返回 `null`，不得晋级**（`EX-003-16`）。
 *     · 🔴 门槛配置缺失 ⇒ **返回 `null`，不得放行**（`EX-003-17`）。
 *
 *  ⑥ `App.LEVEL_GATES` → array[5] of `{ level, name, pointsMin }`
 *     · **等级口径的唯一可配置真源**（FR-003-04 / §7.1 / `Q-003`）。
 *     · 冻结值：`[0, 200, 500, 2000, 5000]`；命名 `体验者 / 进阶者 / 内容创作者 / 商业创作者 / OPC 创业者`
 *       （🔴 **无 `AI` 前缀**）。
 *     · 🔴 **禁止硬编码**：`evaluateLevelUp` 与 `MockData.academy.paths` 的 `pointsMin` 必须与之一致
 *       （否则又是第二事实源）。`paths` 可保留展示字段，但**门槛数值须由本真源派生**。
 *
 *  ⑦ `App.maybeUnlockCerts()` → number（本次新解锁数）
 *     · **结业自动发证钩子**（FR-003-45）：某课程 `progress === 100` ⇒ 其 `certId` 对应证书 `locked → claimable`，
 *       **由系统自动触发**（不是用户点出来）。
 *     · 🔴 课程**无课节**（数据异常）⇒ **不得**把 progress 算成 100 而误发证书（`EX-003-09`）。
 *
 *  ⑧ `App.claimCertificate(certId)` → boolean
 *     · **领证唯一入口**（FR-003-46）：`claimable → owned` + 写防伪编号 + **+100** + 写流水。
 *     · 🔴 非 `claimable` 领取 ⇒ `false`（`EX-003-13`）；已 `owned` 重复领取 ⇒ `false` **且不重复加分**（`EX-003-14`）。
 *
 *  ⑨ `App.switchAcademySubPage(pageId)` → boolean
 *     · **二级页显隐唯一入口**（FR-003-51）：消费可接受 6 个页面 id。
 *     · 🔴 **同一时刻恰好一页可见**（`SC-003-20`）；未知 id ⇒ `false` 且**不改变现状**。
 *     · 六个页面 id：`academy-courses-page` / `academy-course-page` / `academy-lesson-page` /
 *       `academy-records-page` / `academy-resource-page` / `academy-cert-page`
 *
 *  ⑩ `App.completeLesson(title)` → **兼容壳**（FR-003-05）
 *     · 周历卡片仍在调用本方法 ⇒ **保留**，但**内部必须转调 `markLessonDone`**。
 *     · 🔴 **必须移除两处旧口径**：`+50` 与 `progress + 18%`（缺陷 ①②）。
 *     · ⇒ 本套件以**源码级断言**固化：`app.js` 中不得出现 `academy.plans[0]` 与完成课节的 `+ 50`。
 *
 * 用法： node tools/wb-growth-academy-verify.js
 * 退出码 0 = 全过（SPEC-003 Phase 1 已落地）；1 = 仍有待实现项
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const APP_SRC = fs.readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf8');
const MOCK_SRC = fs.readFileSync(path.join(ROOT, 'js', 'mock_data.js'), 'utf8');

/**
 * 源码级断言的匹配基底：**剔除注释**后的代码。
 * ⚠️ 为什么必须剔除：F3 / F4 / F5 用字符串匹配找"旧口径特征"，而**说明性注释**里天然会提到它们
 *    （例如「已移除 `learningPoints + 50` 的旧口径」）⇒ 若不剔除，**正确的实现反而会红**。
 *    （立红 → 实现过程中实测踩到：`app.js:8997` 的注释导致 F4 / F5 误判。）
 * ⚠️ 已知局限：会连带删掉字符串里的 `//`（如 `http://`）—— 对本 Feature 的三条断言无影响。
 */
const APP_CODE = APP_SRC
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split(/\r?\n/)
  .map(function (l) { return l.replace(/\/\/.*$/, ''); })
  .join('\n');

// ------------------------- 最小 DOM 桩（与既有套件同构） -------------------------
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

/**
 * DOM 桩全局共享；每次 load() 新建独立 vm 上下文。
 * ⚠️ **与 SPEC-001 / SPEC-017 套件的有意差异**：本套件额外提供 `location` 桩
 *    （`App.navigateTo` 与部分跳转会读写它）—— 缺它会抛异常，导致断言被 `safe()` 吞掉而失真。
 */
const toasts = [];
function load() {
  const sb = {
    console: { log() {}, error() {}, warn() {}, info() {} },
    document: documentStub,
    location: { hash: '', href: 'http://localhost/', pathname: '/' },
    setTimeout: (fn) => { try { if (typeof fn === 'function') fn(); } catch (e) { /* 红套件不得因未实现而崩 */ } return 0; },
    clearTimeout: () => {},
    setInterval: () => 0,
    clearInterval: () => {},
    // ⚠️ 显式提供 localStorage 桩：本 Feature 的观看进度台账会读写它（实测既有实现已依赖）
    localStorage: (function () {
      const m = new Map();
      return {
        getItem: (k) => (m.has(k) ? m.get(k) : null),
        setItem: (k, v) => { m.set(k, String(v)); },
        removeItem: (k) => { m.delete(k); },
        clear: () => { m.clear(); }
      };
    })(),
    Date, Math, JSON, parseInt, parseFloat, String, Number, Array, Object, RegExp, isNaN, isFinite
  };
  sb.window = sb;
  vm.createContext(sb);
  vm.runInContext(MOCK_SRC, sb, { filename: 'mock_data.js' });
  vm.runInContext(APP_SRC + '\n;globalThis.__App = App;', sb, { filename: 'app.js' });
  const App = vm.runInContext('__App', sb);
  // 记录 Toast（用于"不得静默失败 / 不得误报成功"类断言）
  if (typeof App.showToast === 'function') {
    App.showToast = function (msg) { toasts.push(String(msg == null ? '' : msg)); };
  }
  return { App, MockData: vm.runInContext('MockData', sb), sandbox: sb };
}
function fresh() { toasts.length = 0; registry.forEach((v) => { v.hidden = false; v.innerHTML = ''; v.innerText = ''; v.textContent = ''; }); return load(); }

// ------------------------- 断言累积（两类计数） -------------------------
// ⚠️ 刻意分成两类 —— 否则进度会被"平凡通过"严重高估：
//   · ok(   ) → **功能断言**：断言某能力/行为**存在且正确**。未实现时**必然失败** ⇒ 反映真实进度。
//   · okInv( ) → **不变量断言**：断言"某状态**不得变化**"。⚠️ 在能力尚未实现时，
//               因为"什么都没做"，不变量**会平凡通过（vacuous pass）** ⇒ **不代表已实现**。
let pass = 0;
let passInv = 0;
const fails = [];
const failsInv = [];
const passMsgs = [];      // 诊断用：通过项（WB_VERBOSE=1 时打印，用于复核"平凡通过"）
const passInvMsgs = [];
function ok(cond, msg) { if (cond) { pass++; passMsgs.push(msg); } else fails.push(msg); }
function okInv(cond, msg) { if (cond) { passInv++; passInvMsgs.push(msg); } else failsInv.push(msg); }
/** 安全调用：能力未实现时返回哨兵，避免整套崩掉（红套件必须能跑完，才能当 TODO 清单用） */
function safe(fn, dflt) { try { return fn(); } catch (e) { return dflt; } }
function isFn(o, k) { return !!(o && typeof o[k] === 'function'); }

// ------------------------- 域工具 -------------------------
const SUB_PAGES = [
  'academy-courses-page', 'academy-course-page', 'academy-lesson-page',
  'academy-records-page', 'academy-resource-page', 'academy-cert-page'
];
/** 等级口径的冻结值（`Q-003` 裁决 + spec §7.1） */
const GATE_POINTS = [0, 200, 500, 2000, 5000];
const GATE_NAMES = ['体验者', '进阶者', '内容创作者', '商业创作者', 'OPC 创业者'];

function plans(md) { return (md.academy && md.academy.plans) || []; }
function planOf(md, id) { return plans(md).find((p) => p.id === id) || null; }
function lessonOf(md, planId, lessonId) {
  const p = planOf(md, planId);
  if (!p) return null;
  return (p.lessonList || []).find((l) => l.id === lessonId) || null;
}
function doneCount(md, planId) {
  const p = planOf(md, planId);
  if (!p) return -1;
  return (p.lessonList || []).filter((l) => l.status === 'done').length;
}
function certOf(md, id) { return (md.academy && md.academy.certificates || []).find((c) => c.id === id) || null; }
function logLen(md) { return ((md.academy && md.academy.studyLog) || []).length; }
function writeLogPoints(md) {
  return ((md.academy && md.academy.studyLog) || []).filter((e) => /完成课节/.test(String(e.action || '')));
}
function bal(md) {
  const c = (md.assets && md.assets.cards) || {};
  const n = (s) => Number(String(s == null ? '' : s).replace(/[^0-9.\-]/g, ''));
  return { balance: n(c.balance), withdrawable: n(c.withdrawable) };
}
function frozen(md) {
  const all = (md.assets && md.assets.escrowProjects) || [];
  const n = (s) => Number(String(s == null ? '' : s).replace(/[^0-9.\-]/g, ''));
  return all.filter((p) => p.statusKey === 'active' && p.role === '发包方').reduce((s, p) => s + n(p.amount), 0);
}

// ============================================================================
// A 组 · 加分唯一入口（`awardLearningPoints`）—— SC-003-06 / 08 / 09 / 16
// ============================================================================
console.log(' A 组 · 加分唯一入口');
{
  let { App, MockData: md } = fresh();
  ok(isFn(App, 'awardLearningPoints'), 'A1 `App.awardLearningPoints` 存在且为函数（FR-003-01）');

  let s = fresh(); App = s.App; md = s.MockData;
  const before = safe(() => App.getLearningPoints(), NaN);
  const base = Number(md.currentUser.learningPoints || 0);
  const baseLen = logLen(md);                       // ⚠️ 加分**前**的流水条数（不得在加分后取）
  const ret = safe(() => App.awardLearningPoints(30, '完成课节'), null);
  const after = Number(md.currentUser.learningPoints || 0);
  ok(typeof ret === 'number' && ret === before + 30,
    'A2 加分返回**新积分**（' + before + ' + 30 ⇒ ' + ret + '，FR-003-01）');
  ok(after === base + 30, 'A3 累计创作积分实际 +30（' + base + ' → ' + after + '）');
  ok(logLen(md) === baseLen + 1,
    'A4 加分在 `studyLog` 插入 1 条流水（' + baseLen + ' → ' + logLen(md) + '，FR-003-01）');
  const top = (md.academy.studyLog || [])[0] || {};
  ok(Number(top.points) === 30, 'A5 流水的 `points` 等于本次加分额（实测 ' + top.points + '，期望 30）');

  s = fresh(); App = s.App; md = s.MockData;
  const p0 = Number(md.currentUser.learningPoints || 0);
  const neg = safe(() => App.awardLearningPoints(-100, '非法负数'), undefined);
  ok(neg === null && Number(md.currentUser.learningPoints || 0) === p0,
    'A6 🔴 **只增不减**：负数金额 ⇒ 返回 null 且积分不变（CON-022 同族）');
  const zero = safe(() => App.awardLearningPoints(0, '零分'), undefined);
  ok(zero === null && Number(md.currentUser.learningPoints || 0) === p0,
    'A7 🔴 零金额 ⇒ 拒绝（不得写一条 0 分流水）');
  const nan = safe(() => App.awardLearningPoints('abc', '非数字'), undefined);
  ok(nan === null && Number(md.currentUser.learningPoints || 0) === p0,
    'A8 🔴 非数字金额 ⇒ 拒绝（不得把 NaN 写进积分）');

  s = fresh(); App = s.App; md = s.MockData;
  ok(isFn(App, 'getLearningPoints'), 'A9 `App.getLearningPoints` 存在（创作积分的**唯一读取点**）');
  const pts0 = Number(md.currentUser.points || 0);
  const lp0 = Number(md.currentUser.learningPoints || 0);
  safe(() => App.awardLearningPoints(30, '完成课节'), null);
  ok(safe(() => App.getLearningPoints(), NaN) === Number(md.currentUser.learningPoints || 0),
    'A10 `getLearningPoints()` 与 `currentUser.learningPoints` 一致（唯一真源）');
  ok(Number(md.currentUser.points) === pts0 + 30 && Number(md.currentUser.learningPoints) === lp0 + 30,
    'A11 🔴 **消除双写**：加分后 `points` 与 `learningPoints` **必须同步变化**（实测 ' + pts0 + '/' + lp0 + ' → ' + md.currentUser.points + '/' + md.currentUser.learningPoints + '；两字段并存即第二事实源）');
  const bad = safe(() => { md.currentUser.learningPoints = undefined; const v = App.getLearningPoints(); return v; }, 'THROW');
  ok(bad === -1, 'A12 🔴 缺数据不放行：积分不可得 ⇒ `getLearningPoints()` 返回 **-1**（**不得**返回 0 冒充零积分，EX-003-16）');
}

// ============================================================================
// B 组 · 等级口径与晋级判定 —— SC-003-14 / 15 / S-3
// ============================================================================
console.log(' B 组 · 等级口径与晋级');
{
  const { App, MockData: md } = fresh();
  const G = App.LEVEL_GATES;
  ok(Array.isArray(G) && G.length === 5, 'B1 `App.LEVEL_GATES` 存在且为 5 项（等级口径唯一真源）');
  ok(Array.isArray(G) && G.map((g) => g && g.pointsMin).join(',') === GATE_POINTS.join(','),
    'B2 🔴 阈值恰为 `0/200/500/2000/5000`（实测 ' + (Array.isArray(G) ? G.map((g) => g && g.pointsMin).join('/') : '无') + '；Q-003 裁决）');
  ok(Array.isArray(G) && G.map((g) => g && g.name).join('|') === GATE_NAMES.join('|'),
    'B3 🔴 命名恰为「' + GATE_NAMES.join(' / ') + '」且**无 `AI` 前缀**（Q-003 裁决）');
  ok(Array.isArray(G) && G.every((g) => !/^AI\s/.test(String(g && g.name || ''))),
    'B4 命名**不得**出现 `AI ` 前缀（wh 旧口径作废，§7.1）');

  ok(isFn(App, 'evaluateLevelUp'), 'B5 `App.evaluateLevelUp` 存在（晋级判定唯一入口，FR-003-04）');
  // 边界用例：[prevLevel, 累计创作积分, 期望返回]
  //   ⚠️ 期望值为 **新等级（> prevLevel）| null（未晋级）** —— 与契约 ⑤ 一致、与 `FR-003-04`「返回新等级供提示与跳转」一致。
  //   （`prev` 已达标亦返回 null —— 因为"没有晋级动作"；"等级只升不降"由实现保证，不靠返回值表达。）
  const cases = [[1, 199, null], [1, 200, 2], [2, 499, null], [2, 500, 3], [3, 1999, null], [3, 2000, 4], [4, 4999, null], [4, 5000, 5]];
  let okCount = 0;
  const missed = [];
  cases.forEach(([prev, pts, want]) => {
    const sc = fresh();
    sc.MockData.currentUser.learningPoints = pts;
    const got = safe(() => sc.App.evaluateLevelUp(prev), 'THROW');
    if (got === want) okCount++; else missed.push(pts + '⇒' + got + '(期望' + want + ')');
  });
  ok(okCount === cases.length,
    'B6 🔴 晋级判据 = **累计创作积分达标**（8 组边界 ' + okCount + '/8 ' + (missed.length ? '｜未过：' + missed.join(', ') : '') + '；对照缺陷 ②：既有实现按"本次会话完成 2 节"晋级）');

  const s2 = fresh();
  s2.MockData.currentUser.learningPoints = 9999;
  ok(safe(() => s2.App.evaluateLevelUp(1), 'THROW') === 5,
    'B7 同一积分满足多档 ⇒ 取**最高**满足等级（EX-003-15）');

  const s3 = fresh();
  s3.MockData.currentUser.learningPoints = undefined;
  ok(safe(() => s3.App.evaluateLevelUp(1), 'THROW') === null,
    'B8 🔴 空前积分 ⇒ **不得晋级**（返回 null，EX-003-16；"缺数据默认放行"第 1 种形态）');

  const s4 = fresh();
  const saved = s4.App.LEVEL_GATES;
  s4.App.LEVEL_GATES = [];
  ok(safe(() => s4.App.evaluateLevelUp(4), 'THROW') === null,
    'B9 🔴 门槛配置缺失 ⇒ **不得放行**（返回 null，EX-003-17；"缺配置即放宽"的保守原则）');
  s4.App.LEVEL_GATES = saved;

  const s5 = fresh();
  const paths = (s5.MockData.academy && s5.MockData.academy.paths) || [];
  const pm = paths.map((p) => p.pointsMin).join(',');
  ok(pm === GATE_POINTS.join(','),
    'B10 🔴 `academy.paths` 的 `pointsMin` 必须收敛到裁决值（实测 ' + pm + '；对照缺陷 ④ 等级口径与 Q-003 相反）');
  const lv1name = (paths[0] || {}).name || '';
  const lv2name = (paths[1] || {}).name || '';
  ok(!/^AI\s/.test(lv1name) && !/^AI\s/.test(lv2name),
    'B11 🔴 `paths[0].name` / `paths[1].name` 须去除 `AI ` 前缀（实测「' + lv1name + '」/「' + lv2name + '」）');
}

// ============================================================================
// C 组 · 课节完成唯一入口（`markLessonDone`）—— SC-003-06 / 07 / 08
// ============================================================================
console.log(' C 组 · 课节完成唯一入口');
{
  let s = fresh();
  ok(isFn(s.App, 'markLessonDone'), 'C1 `App.markLessonDone` 存在（课节完成唯一入口，FR-003-03）');

  // ---- 成功路径：取一节**非视频**且未完成的课节（视频有 95% 闸门，不能用作成功路径）----
  // 实测：P1-L04 = article / todo / 下一节 P1-L05 = todo ⇒ 完成后 L05 应变 learning、progress 40 → 60
  s = fresh();
  const SUCC = { planId: 'P1', lessonId: 'P1-L04', idx: 3 };
  const lpBefore = Number(s.MockData.currentUser.learningPoints || 0);
  const lgBefore = logLen(s.MockData);
  const ret = safe(() => s.App.markLessonDone(SUCC.planId, SUCC.lessonId), null);
  const tLesson = lessonOf(s.MockData, SUCC.planId, SUCC.lessonId);
  const tPlan = planOf(s.MockData, SUCC.planId);
  const tDone = doneCount(s.MockData, SUCC.planId);
  const tTotal = (tPlan && tPlan.lessonList || []).length;
  const tNext = tPlan && tPlan.lessonList ? tPlan.lessonList[SUCC.idx + 1] : null;
  const reached = !!tLesson && tLesson.status === 'done';   // 🔑 前置非空：以下断言全部建立在它之上

  ok(reached, 'C2 完成课节 ⇒ 该节 `status` 变为 `done`（P1-L04，实测 ' + (tLesson ? tLesson.status : '—') + '）');
  ok(reached && Number(tPlan.progress) === Math.round((tDone / tTotal) * 100),
    'C3 🔴 `progress` **按课节数重算**（' + tDone + '/' + tTotal + ' ⇒ 期望 ' + Math.round((tDone / tTotal) * 100) + '，实测 ' + (tPlan ? tPlan.progress : '—') + '；禁止固定增量，FR-003-07）');
  ok(reached && !!tNext && tNext.status === 'learning',
    'C4 完成后**下一节**置 `learning`（P1-L05 实测 ' + (tNext ? tNext.status : '—') + '）');
  ok(reached && Number(s.MockData.currentUser.learningPoints) === lpBefore + 30,
    'C5 🔴 完成课节 ⇒ **+30**（' + lpBefore + ' → ' + Number(s.MockData.currentUser.learningPoints) + '；REQ-103）');
  ok(reached && logLen(s.MockData) === lgBefore + 1,
    'C6 完成课节写流水 1 条（' + lgBefore + ' → ' + logLen(s.MockData) + '）');
  ok(reached && ret && typeof ret === 'object' && Number(ret.progress) === Number(tPlan.progress),
    'C7 返回值携带新 `progress`（供 UI 与断言消费）');

  // ---- 视频闸门（**前置 = 成功路径已成立**，否则"方法不存在"也会平凡通过）----
  s = fresh();
  const vLess = lessonOf(s.MockData, 'P1', 'P1-L03');
  const isVideo = !!vLess && vLess.type === 'video';
  safe(() => s.App.markLessonDone('P1', 'P1-L03'), null);
  ok(reached && isVideo && vLess.status !== 'done',
    'C8 🔴 视频课**未看够 95% ⇒ 不得标记完成**（P1-L03 未观看即打卡 ⇒ 实测 ' + vLess.status + '；FR-003-32）');

  // ---- 幂等（**前置 = 首次打卡确实加了分**）----
  s = fresh();
  const lp0 = Number(s.MockData.currentUser.learningPoints || 0);
  const lg0 = logLen(s.MockData);
  safe(() => s.App.markLessonDone(SUCC.planId, SUCC.lessonId), null);
  const afterFirst = Number(s.MockData.currentUser.learningPoints || 0);
  const dup = safe(() => s.App.markLessonDone(SUCC.planId, SUCC.lessonId), 'THROW');
  ok(afterFirst === lp0 + 30 && dup === null,
    'C9 🔴 **幂等**：已完成课节重复打卡 ⇒ 返回 null（首次 ' + lp0 + ' → ' + afterFirst + '；FR-003-09）');
  ok(afterFirst === lp0 + 30 && Number(s.MockData.currentUser.learningPoints) === afterFirst && logLen(s.MockData) === lg0 + 1,
    'C10 🔴 重复打卡**不重复加分、不重复写流水**（SC-003-08）');

  s = fresh();
  ok(safe(() => s.App.markLessonDone('NOT-EXIST', 'P1-L03'), 'THROW') === null,
    'C11 🔴 未知 `planId` ⇒ **显式失败**（返回 null；FR-003-06 / EX-003-10）');
  ok(safe(() => s.App.markLessonDone('P1', 'NOT-EXIST'), 'THROW') === null,
    'C12 🔴 未知 `lessonId` ⇒ **显式失败**（返回 null）');

  // ---- 兼容壳 completeLesson(title)：必须**精确标识**并转调（FR-003-05 / 缺陷 ①③）----
  // 实测：calendarTasks day30 ⇒ 「AI配音情感合成技巧」对应 P2-L04（article / learning）
  s = fresh();
  safe(() => s.App.completeLesson('AI配音情感合成技巧'), 'THROW');
  const pl04 = lessonOf(s.MockData, 'P2', 'P2-L04');
  const shPlan = planOf(s.MockData, 'P2');
  const shDone = doneCount(s.MockData, 'P2');
  const shTotal = (shPlan && shPlan.lessonList || []).length;
  ok(!!pl04 && pl04.status === 'done',
    'C13 🔴 兼容壳必须**精确命中 P2-L04** 并置 done（实测 ' + (pl04 ? pl04.status : '—') + '；旧实现靠模糊匹配 + 兜底 `plans[0]` ⇒ 会落到 P1 上，缺陷 ③）');
  ok(!!pl04 && pl04.status === 'done' && Number(shPlan.progress) === Math.round((shDone / shTotal) * 100),
    'C14 🔴 兼容壳同样走**按课节数重算**（P2 实测 ' + (shPlan ? shPlan.progress : '—') + '，期望 ' + Math.round((shDone / shTotal) * 100) + '；不得 `progress + 18`，缺陷 ①）');

  // ---- 数据层：既有流水被旧口径污染（缺陷 ①）----
  const wl = writeLogPoints(fresh().MockData);
  ok(wl.length > 0 && wl.every((e) => Number(e.points) === 30),
    'C15 🔴 「完成课节」流水的 `points` **恒为 30**（实测含 ' + wl.map((e) => e.points).join(',') + ' ⇒ 既有数据被旧 `+50` 口径污染，须一并收敛）');
}

// ============================================================================
// D 组 · 统计回写唯一入口（`syncAcademyStats`）—— SC-003-06（三处同步）
// ============================================================================
console.log(' D 组 · 统计回写');
{
  let s = fresh();
  ok(isFn(s.App, 'syncAcademyStats'), 'D1 `App.syncAcademyStats` 存在（统计回写唯一入口，FR-003-02）');

  s = fresh();
  const st = safe(() => s.App.syncAcademyStats(), null);
  ok(st && typeof st === 'object' && ['hours', 'courses', 'certs', 'points'].every((k) => k in st),
    'D2 返回值含 4 维（hours / courses / certs / points，FR-003-11）');

  s = fresh();
  // ⚠️ 用 **article** 课节（P1-L04）：video 课节会被 95% 观看闸门拦下 ⇒ 打卡不成立、统计不会回写
  safe(() => s.App.markLessonDone('P1', 'P1-L04'), null);
  const ptEl = el('academy-stat-points');
  ok(/\d/.test(String(ptEl.textContent || ptEl.innerText || ptEl.innerHTML || '')),
    'D3 打卡后侧栏 `#academy-stat-points` 被写入**真实数值**（不得硬编码 / 不得留空）');
  const hrEl = el('academy-stat-hours');
  ok(/\d/.test(String(hrEl.textContent || hrEl.innerText || hrEl.innerHTML || '')),
    'D4 打卡后侧栏 `#academy-stat-hours` 被写入真实学时');
  const st2 = safe(() => s.App.syncAcademyStats(), null);
  ok(st2 && Number(st2.points) === Number(s.MockData.currentUser.learningPoints || 0),
    'D5 🔴 统计的 `points` 与唯一真源 `getLearningPoints()` 一致（三处同源的判定依据，S-4）');
}

// ============================================================================
// E 组 · 证书三态（`locked → claimable → owned`）—— SC-003-11 / 12 / 13
// ============================================================================
console.log(' E 组 · 证书三态');
{
  let s = fresh();
  ok(isFn(s.App, 'maybeUnlockCerts'), 'E1 `App.maybeUnlockCerts` 存在（结业自动发证钩子，FR-003-45）');
  ok(isFn(s.App, 'claimCertificate'), 'E2 `App.claimCertificate` 存在（领证唯一入口，FR-003-46）');

  s = fresh();
  const p1 = planOf(s.MockData, 'P1');
  (p1.lessonList || []).forEach((l) => { l.status = 'done'; });
  p1.progress = 100;
  const unlocked = safe(() => s.App.maybeUnlockCerts(), null);
  ok(certOf(s.MockData, 'CERT-P1').status === 'claimable',
    'E3 🔴 课程 100% 结业 ⇒ 对应证书自动 `locked → claimable`（实测 ' + certOf(s.MockData, 'CERT-P1').status + '；SC-003-11）');
  ok(typeof unlocked === 'number' && unlocked >= 1, 'E4 钩子返回**本次新解锁数**');

  s = fresh();
  const before = Number(s.MockData.currentUser.learningPoints || 0);
  const r = safe(() => s.App.claimCertificate('CERT-CREDIT'), 'THROW');
  const claimOk = (r === true) && Number(s.MockData.currentUser.learningPoints || 0) === before + 100;  // 🔑 前置
  ok(r === true, 'E5 `claimable` 证书可领取（CERT-CREDIT 现为 claimable）');
  ok(certOf(s.MockData, 'CERT-CREDIT').status === 'owned',
    'E6 领取后状态置 `owned`（SC-003-12）');
  ok(Number(s.MockData.currentUser.learningPoints || 0) === before + 100,
    'E7 🔴 领证 **+100** 创作积分（' + before + ' → ' + Number(s.MockData.currentUser.learningPoints) + '；REQ-104）');
  ok(((s.MockData.academy.studyLog || [])[0] || {}).points === 100 ||
     ((s.MockData.academy.studyLog || [])[0] || {}).points === '100',
    'E8 领证写流水（头部 1 条，points=100）');

  s = fresh();
  ok(safe(() => s.App.claimCertificate('CERT-P3'), 'THROW') === false,
    'E9 🔴 非 `claimable`（locked）⇒ **拒绝**（CERT-P3 现为 locked，EX-003-13）');
  s = fresh();
  const b2 = Number(s.MockData.currentUser.learningPoints || 0);
  ok(safe(() => s.App.claimCertificate('CERT-P2'), 'THROW') === false,
    'E10 🔴 已 `owned` 重复领取 ⇒ **拒绝**（CERT-P2 现为 owned，EX-003-14）');
  ok(claimOk && Number(s.MockData.currentUser.learningPoints || 0) === b2,
    'E11 🔴 重复领取**不重复加分**（前置：单次领取确实 +100；EX-003-14）');

  s = fresh();
  // ⚠️ 触发方式修正：证书台顶部操作区应由「**切换到证书台页面**」渲染（`FR-003-51` 的唯一入口），
  //    而非由「领证动作」渲染 —— 后者在领取失败时不应产生渲染副作用。
  safe(() => s.App.switchAcademySubPage('academy-cert-page'), 'THROW');
  const el2 = el('academy-cert-top-actions');
  ok(String(el2.innerHTML || '').length > 0,
    'E12 🔴 证书台顶部操作区 `#academy-cert-top-actions` **必须有内容**（由切换证书台页面触发渲染；实测从未被赋值，FR-003-44）');
}

// ============================================================================
// F 组 · 成就墙与显式失败（无假数据兜底）—— SC-003-19 / FR-003-14 / 36
// ============================================================================
console.log(' F 组 · 成就墙与显式失败');
{
  let s = fresh();
  ok(isFn(s.App, 'openAchievementDetail'), 'F1 `App.openAchievementDetail` 存在（成就墙点击，FR-003-14）');

  s = fresh();
  const a1 = ((s.MockData.academy && s.MockData.academy.achievements) || [])[0];
  toasts.length = 0;
  const good = safe(() => s.App.openAchievementDetail(a1 && a1.id), 'THROW');
  const openedOk = good === true || toasts.length > 0;          // 🔑 前置：存在的成就**能**打开
  toasts.length = 0;
  const bad = safe(() => s.App.openAchievementDetail('ACH-NOT-EXIST'), 'THROW');
  const saidFail = bad === false || toasts.some((t) => /未找到|不存在|失败|异常/.test(t));
  ok(openedOk && saidFail,
    'F2 🔴 成就墙须**区分"能打开"与"查不到"**：存在的成就可打开（实测 ' + (a1 ? a1.id : '—') + '）、不存在的**显式失败**（不得回退默认证书 / 不得误报成功；FR-003-14）');

  s = fresh();
  ok(!/MockData\.academy\.plans\[0\]/.test(APP_CODE),
    'F3 🔴 **源码级**（已剔除注释）：`app.js` 中不得出现 `MockData.academy.plans[0]`（缺陷 ③ 的兜底特征）');
  const plus50 = /learningPoints[^\n]{0,40}\+\s*50/.test(APP_CODE);
  ok(!plus50, 'F4 🔴 **源码级**（已剔除注释）：不得再出现"完成课节 +50"（缺陷 ① 的旧口径）');
  const plus18 = /progress[^\n]{0,60}\+\s*18/.test(APP_CODE);
  ok(!plus18, 'F5 🔴 **源码级**（已剔除注释）：不得再用 `progress + 18`（改为按课节数重算，FR-003-07）');
}

// ============================================================================
// G 组 · 二级页显隐唯一入口 —— SC-003-20 / FR-003-51
// ============================================================================
console.log(' G 组 · 二级页显隐');
{
  let s = fresh();
  ok(isFn(s.App, 'switchAcademySubPage'), 'G1 `App.switchAcademySubPage` 存在（二级页显隐唯一入口）');

  s = fresh();
  const r = safe(() => s.App.switchAcademySubPage('academy-cert-page'), 'THROW');
  const vis = SUB_PAGES.filter((id) => el(id).hidden === false);
  const othersHidden = SUB_PAGES.filter((id) => id !== 'academy-cert-page').every((id) => el(id).hidden === true);
  ok(r === true, 'G2 切换到合法页面 id ⇒ 返回 true');
  ok(r === true && el('academy-cert-page').hidden === false && othersHidden,
    'G3 🔴 **同一时刻恰好一页可见**：目标页可见 **且其余 5 页全部 `hidden`**（实测可见 ' + vis.length + ' 页：' + (vis.join(',') || '空') + '；SC-003-20 —— DOM 桩下 6 页默认全可见，故未实现时必然失败）');

  s = fresh();
  const r2 = safe(() => s.App.switchAcademySubPage('academy-lesson-page'), 'THROW');
  const vis2 = SUB_PAGES.filter((id) => el(id).hidden === false);
  ok(r2 === true && vis2.length === 1 && vis2[0] === 'academy-lesson-page',
    'G4 🔴 `academy-lesson-page` 也必须纳入统一入口（实测显隐清单**两份且不一致**：一处 5 个 id、一处 6 个 id —— 后者含 lesson 页）');

  s = fresh();
  const beforeHidden = SUB_PAGES.map((id) => el(id).hidden);
  ok(safe(() => s.App.switchAcademySubPage('NOT-A-PAGE'), 'THROW') === false,
    'G5 未知页面 id ⇒ 返回 false');
  okInv(JSON.stringify(SUB_PAGES.map((id) => el(id).hidden)) === JSON.stringify(beforeHidden),
    'G6[inv] 未知 id 调用**不得改变现状**');
}

// ============================================================================
// H 组 · 其余入口（资源库 / 评价 / 相邻课节 / 排序）—— SC-003-17 / 18
// ============================================================================
console.log(' H 组 · 其余入口');
{
  const s = fresh();
  const need = [
    ['openResourcePreview', 'H1 R2 教材速览（FR-003-38）'],
    ['openCaseSopReport', 'H2 R3 案例 SOP 复盘（FR-003-39）'],
    ['applyResourceToStudio', 'H3 R4 模板套用至工作台（FR-003-40，与 SPEC-004 交接）'],
    ['openWechatGroupModal', 'H4 R6 社群二维码（FR-003-41）'],
    ['gotoToolFromHandbook', 'H5 R5 手册去创作工具（FR-003-42）'],
    ['submitCourseReview', 'H6 评价与心得（FR-003-26）'],
    ['setCourseReviewStar', 'H7 星级评分（FR-003-26）'],
    ['gotoAdjacentLesson', 'H8 上一节 / 下一节（FR-003-29）'],
    ['setAcademyCourseSort', 'H9 多维排序（FR-003-20）']
  ];
  need.forEach(([k, msg]) => ok(isFn(s.App, k), msg + ' —— `App.' + k + '` 存在'));

  // ⚠️ 顺序有意调换：先证明"有效心得**能**加分"，再断言"空白心得**不得**加分" —— 否则"方法不存在"也会平凡通过
  const s3 = fresh();
  const b3 = Number(s3.MockData.currentUser.learningPoints || 0);
  safe(() => s3.App.submitCourseReview('P1', '这门课讲得很清楚', 5), null);
  const reviewOk = Number(s3.MockData.currentUser.learningPoints || 0) === b3 + 5;   // 🔑 前置
  ok(reviewOk,
    'H10 心得发表成功 ⇒ **+5**（' + b3 + ' → ' + Number(s3.MockData.currentUser.learningPoints || 0) + '；SC-003-09 / REQ-107）');

  const s2 = fresh();
  const b = Number(s2.MockData.currentUser.learningPoints || 0);
  const blank = safe(() => s2.App.submitCourseReview('P1', '   ', 5), 'THROW');
  ok(reviewOk && blank !== true && Number(s2.MockData.currentUser.learningPoints || 0) === b,
    'H11 🔴 心得为空 / 仅空白 ⇒ **拒绝，不加分**（前置：有效心得确实 +5；SC-003-10 / FR-003-27）');

  const s4 = fresh();
  const rr = safe(() => s4.App.applyResourceToStudio('R4', 'R4-1'), undefined);
  ok(rr === true,
    'H12 R4 套用至工作台 ⇒ **返回 true 并实际预填**（FR-003-40 / FR-003-43：🔴 **禁止仅 Toast**）');
}

// ============================================================================
// I 组 · 不变量（**未实现时会平凡通过 ⇒ 不计入进度**）
// ============================================================================
console.log(' I 组 · 不变量');
{
  // I1/I2 资金口径不受影响（本 Feature 绝不碰资金）
  // ⚠️ 一律用 **article** 课节（P1-L04）：video 会被 95% 闸门拦下 ⇒ "学习动作"根本没发生，不变量就没有意义
  const s = fresh();
  const b0 = bal(s.MockData);
  const f0 = frozen(s.MockData);
  safe(() => s.App.markLessonDone('P1', 'P1-L04'), null);
  safe(() => s.App.claimCertificate('CERT-CREDIT'), null);
  safe(() => s.App.awardLearningPoints(30, '完成课节'), null);
  const b1 = bal(s.MockData);
  const f1 = frozen(s.MockData);
  okInv(b1.balance === b0.balance && b1.withdrawable === b0.withdrawable,
    'I1[inv] 学习动作**不得改动账户余额 / 可提现**（资金口径与学习口径严格分离）');
  okInv(f1 === f0, 'I2[inv] 学习动作**不得改动托管冻结**');

  // I3 等级只升不降
  const s2 = fresh();
  const lv0 = Number(s2.MockData.currentUser.level || 0);
  safe(() => s2.App.markLessonDone('P1', 'P1-L04'), null);
  okInv(Number(s2.MockData.currentUser.level || 0) >= lv0,
    'I3[inv] 等级**只升不降**（FR-003-08 / SC-003-15）');

  // I4 创作积分不减少
  const s3 = fresh();
  const p0 = Number(s3.MockData.currentUser.learningPoints || 0);
  safe(() => s3.App.markLessonDone('P1', 'P1-L04'), null);
  safe(() => s3.App.claimCertificate('CERT-CREDIT'), null);
  okInv(Number(s3.MockData.currentUser.learningPoints || 0) >= p0,
    'I4[inv] 创作积分**只增不减**（CON-022 / SC-003-16）');

  // I5 失败调用后数据不变
  const s4 = fresh();
  const snap = JSON.stringify(s4.MockData.academy.plans);
  safe(() => s4.App.markLessonDone('NOT-EXIST', 'NOT-EXIST'), null);
  okInv(JSON.stringify(s4.MockData.academy.plans) === snap,
    'I5[inv] 未知标识调用后**所有 plan 与课节状态均不变**');

  // I6 重复打卡不增流水
  const s5 = fresh();
  const l0 = logLen(s5.MockData);
  safe(() => s5.App.markLessonDone('P1', 'P1-L01'), null);
  const l1 = logLen(s5.MockData);
  safe(() => s5.App.markLessonDone('P1', 'P1-L01'), null);
  okInv(logLen(s5.MockData) === l1,
    'I6[inv] 重复打卡**不新增流水**');

  // I7 承 SPEC-017：资产引用类型不得被本 Feature 扩展
  const s6 = fresh();
  const types = s6.App.ASSET_REF_TYPES;
  okInv(Array.isArray(types) && types.length === 5,
    'I7[inv] 承 `SPEC-017`：`ASSET_REF_TYPES` **仍为 5 项**（本 Feature 不得自行扩展枚举，FR-003-53）');

  // I8 二级页切换不触碰数据
  const s7 = fresh();
  const snap2 = JSON.stringify(s7.MockData.academy.plans);
  safe(() => s7.App.switchAcademySubPage('academy-cert-page'), null);
  okInv(JSON.stringify(s7.MockData.academy.plans) === snap2,
    'I8[inv] 二级页切换**不得改动任何业务数据**');

  // I9 课节状态值域（原 C14；本质是"不得出现旧值"的**不变量** ⇒ 按铁律归入此类，不计入进度）
  const BAD_STATUS = /已完成|未开始|学习中|已解锁/;
  const badStatus = plans(fresh().MockData).some((pp) => (pp.lessonList || []).some((l) => BAD_STATUS.test(String(l.status || ''))));
  okInv(!badStatus, 'I9[inv] 课节状态值域统一为 `done / learning / todo`（**不得**用中文状态，FR-003-10）');
}

// ============================================================================
// 输出
// ============================================================================
const totalFunc = pass + fails.length;
const totalInv = passInv + failsInv.length;
const line = '-'.repeat(72);
console.log('\n' + line);
console.log(' SPEC-003 成长学院（课程研习与认证）—— 契约冻结自检（契约先行 · 冻结自检）');
console.log(' 契约：awardLearningPoints / getLearningPoints / syncAcademyStats / markLessonDone');
console.log('       evaluateLevelUp / LEVEL_GATES / maybeUnlockCerts / claimCertificate');
console.log('       switchAcademySubPage / completeLesson（兼容壳）');
console.log(' 依据：specs/003-growth-academy/spec.md  SC-003-01 ~ 20');
console.log(line);
console.log(' 【功能断言】 ' + pass + '/' + totalFunc + '   ← 真实进度看这一行');
console.log(' 【不变量断言】 ' + passInv + '/' + totalInv + '   ← ⚠️ 未实现时会平凡通过，不构成证据、不计入进度');
console.log(line);
// 诊断：WB_VERBOSE=1 时列出**通过项** —— 用于逐项复核"是真通过了，还是什么都没做（平凡通过）"
if (process.env.WB_VERBOSE) {
  console.log(' 【已通过的功能断言 ' + pass + ' 项】—— 请逐项复核是否为"平凡通过"：');
  passMsgs.forEach((m, i) => console.log('   ' + (i + 1) + '. ' + m));
  console.log('');
  console.log(' 【已通过的不变量断言 ' + passInv + ' 项】：');
  passInvMsgs.forEach((m, i) => console.log('   ' + (i + 1) + '. ' + m));
  console.log(line);
}
if (fails.length === 0 && failsInv.length === 0) {
  // ⚠️ 本行格式**必须**为「全部通过：N 项断言」—— `tools/gates.js` 依此正则提取断言数
  //    （`/全部通过\s*[：:]\s*(\d+)\s*项/`）。格式不符 ⇒ 本套件会被计为 0 项，
  //    导致「断言合计」低估、转绿后也无法计入证据。与既有两套保持一致。
  console.log(' ✓ 全部通过：' + (pass + passInv) + ' 项断言（功能 ' + pass + ' + 不变量 ' + passInv + '）');
  console.log('   ⇒ SPEC-003 Phase 1 已落地。请把本套件从 gates-baseline.json 的 l3ExpectedRed 中移除（转为回归防线）。');
} else {
  if (fails.length) {
    console.log(' ✗ 功能断言待实现 ' + fails.length + ' 项 —— 这是 SPEC-003 Phase 1 的 TODO 清单：');
    fails.forEach((f, i) => console.log('   ' + (i + 1) + '. ' + f));
  }
  if (failsInv.length) {
    console.log('');
    console.log(' ⚠️ 不变量断言未通过 ' + failsInv.length + ' 项（实现后应转为通过，但**不得**计入进度）：');
    failsInv.forEach((f, i) => console.log('   ' + (i + 1) + '. ' + f));
  }
  // ⚠️ 本行是**门禁格式契约**的一部分（`wb-identity-admission-verify.js` 早已采用同一格式）：
  //    `tools/gates.js` 的 `parseCount` 依 `/通过\s*[：:]\s*(\d+)\s*\/\s*(\d+)/` 提取红灯套件的
  //    「已登记待实现 x/y 项」。缺此行 ⇒ 该套件的**实现进度无法被单独报出**（会显示 0/0），
  //    红灯机制「单独报进度」的能力随之失效。
  //    ⚠️ 必须**只报功能断言**（不变量断言未计入 —— 它们现在不构成任何证据）。
  //    ⚠️ 必须放在**最后一行**：`parseCount` 倒序扫描、首个命中即返回。
  console.log(' 通过：' + pass + '/' + totalFunc + ' 项功能断言（不变量断言 ' + passInv + '/' + totalInv + ' 未计入）');
}
console.log(line + '\n');
process.exit(fails.length === 0 && failsInv.length === 0 ? 0 : 1);
