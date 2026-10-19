#!/usr/bin/env node
/**
 * SPEC-003 Phase 1 · 行为冒烟（T-003-28）
 * ---------------------------------------------------------------------------
 * 依 `ENV-07`「**断言全绿 ≠ 渲染正确**」，本脚本刻意做契约套件**做不到**的两件事：
 *  ① **不吞异常** —— 契约套件的 `safe()` 会把异常吞成哨兵，观察不到"接线后是否崩"；
 *     本脚本**捕获并逐条报告**异常（异常 0 才算过）。
 *  ② **新旧双沙箱对比** —— 用改动前备份 `scratch/app.js.bak-<TS>` 与新实现各跑同一组动作，
 *     比对**不应变化**的账本（资金）与**应当变化**的口径（阈值 / 命名 / 流水）。
 *     ⚠️ 单跑绿灯只能证明"没坏在我看得见的地方"；新旧对比才能排除"看不见的地方"。
 *
 * 用法： node scratch/_spec003-phase1-smoke.js
 * 退出码 0 = 冒烟通过（异常 0 且账本一致）
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const BK = 'scratch/app.js.bak-20260925-110026';           // 改动前备份（T-003-01）

// ── 结果收集 ─────────────────────────────────────────────
let pass = 0; const fail = []; const errors = [];
function ok(cond, msg) { if (cond) { pass++; console.log('  ✓ ' + msg); } else { fail.push(msg); console.log('  ✗ ' + msg); } }

// ── 最小 DOM 桩（与契约套件同构）────────────────────────
class ClassList {
  constructor() { this.set = new Set(); }
  add(...c) { c.forEach((x) => this.set.add(x)); }
  remove(...c) { c.forEach((x) => this.set.delete(x)); }
  toggle(c, f) { const on = (f === undefined) ? !this.set.has(c) : !!f; if (on) this.set.add(c); else this.set.delete(c); return on; }
  contains(c) { return this.set.has(c); }
}
class El {
  constructor(id) {
    this.id = id; this.innerText = ''; this.textContent = ''; this.innerHTML = '';
    this.value = ''; this.hidden = false; this.disabled = false; this.style = {};
    this.classList = new ClassList();
  }
  getAttribute() { return null; } setAttribute() {} appendChild(c) { return c; }
  addEventListener() {} querySelectorAll() { return []; } querySelector() { return null; }
}
const registry = new Map();
function el(id) { if (!registry.has(id)) registry.set(id, new El(id)); return registry.get(id); }
const documentStub = {
  body: el('__body'), getElementById: (id) => el(id), querySelector: () => null,
  querySelectorAll: () => [], createElement: (t) => new El('__' + t), addEventListener() {}
};

function load(appSrc, mockPath) {
  const mockSrc = fs.readFileSync(mockPath || path.join(ROOT, 'js', 'mock_data.js'), 'utf8');
  const sb = {
    console: { log() {}, error() {}, warn() {}, info() {} },
    document: documentStub,
    location: { hash: '', href: 'http://localhost/', pathname: '/' },
    scrollTo: () => {},                       // ⚠️ 既有 openAcademyCourseDetail / openLessonPlayer 会调用（桩必须补，否则误报异常）
    setTimeout: (fn) => { try { if (typeof fn === 'function') fn(); } catch (e) { /* noop */ } return 0; },
    clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
    localStorage: (function () { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), clear: () => m.clear() }; })(),
    Date, Math, JSON, parseInt, parseFloat, String, Number, Array, Object, RegExp, isNaN, isFinite
  };
  sb.window = sb;
  vm.createContext(sb);
  vm.runInContext(mockSrc, sb, { filename: 'mock_data.js' });
  vm.runInContext(appSrc + '\n;globalThis.__App = App;', sb, { filename: 'app.js' });
  const App = vm.runInContext('__App', sb);
  App.showToast = function () {};
  return { App, MockData: vm.runInContext('MockData', sb) };
}

/** 严格调用：抛异常即记录（**不吞**） */
function call(rt, label, fn) {
  try { return fn(); } catch (e) { errors.push(label + ' → ' + (e && e.message ? e.message : String(e))); return undefined; }
}

function bal(md) {
  const c = (md.assets && md.assets.cards) || {};
  const n = (s) => Number(String(s == null ? '' : s).replace(/[^0-9.\-]/g, ''));
  const all = (md.assets && md.assets.escrowProjects) || [];
  const frozen = all.filter((p) => p.statusKey === 'active' && p.role === '发包方').reduce((s, p) => s + n(p.amount), 0);
  return { balance: n(c.balance), withdrawable: n(c.withdrawable), frozen: frozen };
}
function lessonStates(md) {
  const out = {};
  ((md.academy && md.academy.plans) || []).forEach((p) => { out[p.id] = (p.lessonList || []).map((l) => l.status).join(','); });
  return out;
}

// ============================================================================
console.log('=== P1 · 主链路（新实现）· 异常必须为 0 ===');
const NEW = load(fs.readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf8'));
const OLD = load(fs.readFileSync(path.join(ROOT, BK), 'utf8'));

// 主链路：筛选 → 详情 → 打卡（article）→ 统计 → 结业发证 → 领证
call(NEW, 'P1-1 选课筛选', () => { NEW.App.setAcademyCourseCategory && NEW.App.setAcademyCourseCategory('全部'); });
call(NEW, 'P1-2 筛选渲染', () => { NEW.App.renderAcademyCourseFilters && NEW.App.renderAcademyCourseFilters(); });
call(NEW, 'P1-3 课程详情', () => { NEW.App.openAcademyCourseDetail && NEW.App.openAcademyCourseDetail('P1'); });
call(NEW, 'P1-4 打开播放台', () => { NEW.App.openLessonPlayer && NEW.App.openLessonPlayer('P1', 'P1-L04'); });
const r1 = call(NEW, 'P1-5 打卡（article）', () => NEW.App.markLessonDone('P1', 'P1-L04'));
call(NEW, 'P1-6 统计回写', () => NEW.App.syncAcademyStats());
call(NEW, 'P1-7 发证钩子', () => NEW.App.maybeUnlockCerts());
call(NEW, 'P1-8 领证', () => NEW.App.claimCertificate('CERT-CREDIT'));
call(NEW, 'P1-9 二级页切换', () => NEW.App.switchAcademySubPage('academy-cert-page'));
call(NEW, 'P1-10 资源速览（R2）', () => NEW.App.openResourcePreview('R2', 'R2-1'));
call(NEW, 'P1-11 资源下载（R2）', () => NEW.App.downloadResourceItem('R2', 'R2-1'));
call(NEW, 'P1-12 案例复盘（R3）', () => NEW.App.openCaseSopReport('R3', 'R3-1'));
call(NEW, 'P1-13 模板套用（R4）', () => NEW.App.applyResourceToStudio('R4', 'R4-1'));
call(NEW, 'P1-14 社群（R6）', () => NEW.App.openWechatGroupModal('R6', 'R6-1'));
call(NEW, 'P1-15 手册（R5）', () => NEW.App.gotoToolFromHandbook('R5', 'R5-1'));
call(NEW, 'P1-16 心得发表', () => NEW.App.submitCourseReview('P1', '这门课讲得很清楚', 5));
call(NEW, 'P1-17 空白心得（应拒绝）', () => NEW.App.submitCourseReview('P1', '   ', 5));
call(NEW, 'P1-18 相邻课节', () => NEW.App.gotoAdjacentLesson('P1', 'P1-L04', 1));
call(NEW, 'P1-19 成就详情（存在）', () => NEW.App.openAchievementDetail('A1'));
call(NEW, 'P1-20 成就详情（不存在）', () => NEW.App.openAchievementDetail('ACH-NOT-EXIST'));
call(NEW, 'P1-21 课程排序', () => NEW.App.setAcademyCourseSort('rating'));
call(NEW, 'P1-22 周历兼容壳', () => NEW.App.completeLesson('AI配音情感合成技巧'));
call(NEW, 'P1-23 晋级判定', () => NEW.App.evaluateLevelUp(4));
call(NEW, 'P1-24 等级渲染', () => { NEW.App.syncLevelBadges && NEW.App.syncLevelBadges(); });
call(NEW, 'P1-25 成长路径', () => NEW.App.advanceGrowthPath());

ok(errors.length === 0, 'P1-26 主链路**异常数 = 0**' + (errors.length ? '（实际 ' + errors.length + ' 条，见下）' : ''));
if (errors.length) errors.forEach((e, i) => console.log('     ' + (i + 1) + '. ' + e));
ok(r1 && r1.progress === 60, 'P1-27 打卡后 P1 进度 = 60%（实测 ' + (r1 && r1.progress) + '）');
ok(NEW.MockData.currentUser.learningPoints > 0, 'P1-28 加分已生效（当前积分 ' + NEW.MockData.currentUser.learningPoints + '）');
ok(NEW.MockData.currentUser.points === NEW.MockData.currentUser.learningPoints, 'P1-29 `points` 与 `learningPoints` 同值（双写已消除）');

// ============================================================================
console.log('\n=== P2 · 新旧双沙箱对比（隔离"代码变化"的影响）===');
// ⚠️ 只跑**新旧共有**的动作 —— `markLessonDone` / 资源入口等是**本 Feature 新增**的能力，
//    放进对比会必然报「旧实现没有该方法」，那是**预期**而非回归。
const pairs = [
  ['周历兼容壳', (A) => { A.completeLesson('AI配音情感合成技巧'); }],
  ['成长路径派生', (A) => { if (A.advanceGrowthPath) A.advanceGrowthPath(); }],
];
pairs.forEach(([label, fn]) => {
  const a = load(fs.readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf8'));
  const b = load(fs.readFileSync(path.join(ROOT, BK), 'utf8'));
  const f0a = bal(a.MockData), f0b = bal(b.MockData);
  try { fn(a.App, a.MockData); } catch (e) { errors.push('P2 新·' + label + ' → ' + e.message); }
  try { fn(b.App, b.MockData); } catch (e) { errors.push('P2 旧·' + label + ' → ' + e.message); }
  const f1a = bal(a.MockData), f1b = bal(b.MockData);
  ok(JSON.stringify(f1a) === JSON.stringify(f0a), 'P2 新·资金账本不变（' + label + '）');
  ok(JSON.stringify(f1b) === JSON.stringify(f0b), 'P2 旧·资金账本不变（' + label + '）');
});

// ── 预期内的差异：**数据层**改动（须与 mock 备份对比，而非与新 mock 比）──
console.log('  --- 数据层口径收敛（与 mock_data 备份对比）---');
const MOCK_BK = 'scratch/mock_data.js.bak-20260925-110026';
const mdNew = load(fs.readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf8')).MockData;
const mdOld = load(fs.readFileSync(path.join(ROOT, BK), 'utf8'), path.join(ROOT, MOCK_BK)).MockData;
ok(mdNew.academy.paths[3].pointsMin === 2000 && mdOld.academy.paths[3].pointsMin === 2500,
  'P2-1 阈值差异符合预期（新 2000 / 旧 2500）');
ok(mdNew.academy.paths[1].name === '进阶者' && mdOld.academy.paths[1].name === 'AI 创作者',
  'P2-2 命名差异符合预期（新「进阶者」/ 旧「AI 创作者」）');
const wl = mdNew.academy.studyLog.filter((e) => /完成课节/.test(String(e.action)));
const wlOld = mdOld.academy.studyLog.filter((e) => /完成课节/.test(String(e.action)));
ok(wl.every((e) => e.points === 30) && wlOld.every((e) => e.points === 50),
  'P2-3 流水口径差异符合预期（新 30 / 旧 50）');

// ============================================================================
console.log('\n=== P3 · 资金恒等式（复算，T-003-29）===');
const f = bal(mdNew);
ok(Math.abs((f.withdrawable + f.frozen) - f.balance) < 0.005,
  'P3-1 资金恒等式：可提现 ' + f.withdrawable + ' + 冻结 ' + f.frozen + ' = 余额 ' + f.balance);

// ============================================================================
const total = pass + fail.length;
console.log('\n' + '-'.repeat(72));
console.log(' SPEC-003 Phase 1 行为冒烟：' + pass + '/' + total + ' 项通过｜异常 ' + errors.length + ' 条');
if (errors.length) { console.log(' ⚠️ 异常清单（**不吞**）：'); errors.forEach((e, i) => console.log('   ' + (i + 1) + '. ' + e)); }
console.log('-'.repeat(72) + '\n');
process.exit(fail.length === 0 && errors.length === 0 ? 0 : 1);
