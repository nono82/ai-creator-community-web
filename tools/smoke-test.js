#!/usr/bin/env node
/**
 * 结构冒烟校验器（门禁 L2 · 零依赖离线实现）
 * ---------------------------------------------------------------------------
 * 背景：规范原定 L2 用 Playwright（真实浏览器）跑 6 条固定断言。本项目为
 *       「零框架 / 零构建 / 零依赖」，且当前环境无 package.json / node_modules，
 *       `require('playwright')` 不可解析。故本脚本用【最小 DOM 桩 + vm】在 Node 内
 *       实现 6 条断言的**静态 + 行为近似**版本（能力边界见 tools/README.md）。
 *
 * 用法：
 *   node tools/smoke-test.js              # 6 条断言 + 汇总
 *   node tools/smoke-test.js --verbose    # 附未覆盖清单与逐项明细
 *
 * 退出码：0 = 6/6 通过；1 = 有断言失败
 * 零依赖：仅用 fs / path / vm。不写盘、不联网。
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const VERBOSE = process.argv.includes('--verbose');

const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const APP_SRC = fs.readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf8');
const MOCK_SRC = fs.readFileSync(path.join(ROOT, 'js', 'mock_data.js'), 'utf8');
const CHARTS_SRC = fs.readFileSync(path.join(ROOT, 'js', 'charts.js'), 'utf8');
const ICONS_SRC = fs.readFileSync(path.join(ROOT, 'js', 'icons.js'), 'utf8');

const results = [];
function assert(no, name, pass, detail) {
  results.push({ no, name, pass: !!pass, detail: detail || '' });
  console.log('  [' + (pass ? 'PASS' : 'FAIL') + '] L2-' + no + ' ' + name + (detail ? '  ::  ' + detail : ''));
}

// ============================ 最小 DOM 桩 ============================
class ClassList {
  constructor() { this.set = new Set(); }
  add(...c) { c.forEach(x => this.set.add(x)); }
  remove(...c) { c.forEach(x => this.set.delete(x)); }
  toggle(c, force) { const on = (force === undefined) ? !this.set.has(c) : !!force; if (on) this.set.add(c); else this.set.delete(c); return on; }
  contains(c) { return this.set.has(c); }
  get length() { return this.set.size; }
}

const FAKE_CTX = new Proxy({}, {
  get(_t, k) {
    if (k === 'measureText') return () => ({ width: 0 });
    if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({ addColorStop() {} });
    if (k === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
    if (k === 'canvas') return {};
    if (k === 'then') return undefined;
    return () => {};
  },
  set() { return true; }
});

class El {
  constructor(id, attrs) {
    this.id = id;
    this._attrs = attrs || {};
    this.innerText = '';
    this.textContent = '';
    this.innerHTML = '';
    this.value = '';
    this.max = '';
    this.placeholder = '';
    this.disabled = false;
    this.scrollTop = 0;
    this.style = {};
    this.classList = new ClassList();
    this._children = [];
  }
  get className() { return Array.from(this.classList.set).join(' '); }
  set className(v) { this.classList.set = new Set(String(v == null ? '' : v).split(/\s+/).filter(Boolean)); }
  get firstElementChild() { return this._children[0] || null; }
  getAttribute(n) { return this._attrs[n] === undefined ? null : this._attrs[n]; }
  setAttribute(n, v) { this._attrs[n] = v; }
  hasAttribute(n) { return this._attrs[n] !== undefined; }
  appendChild(c) { this._children.push(c); return c; }
  removeChild(c) { return c; }
  insertBefore(c) { this._children.push(c); return c; }
  addEventListener() {}
  removeEventListener() {}
  focus() {}
  blur() {}
  click() {}
  scrollIntoView() {}
  getElementsByClassName() { return []; }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  closest() { return null; }
  contains() { return false; }
  getContext() { return FAKE_CTX; }
  getBoundingClientRect() { return { left: 0, top: 0, width: 1200, height: 800, right: 1200, bottom: 800 }; }
}

const registry = new Map();
function el(id) { if (!registry.has(id)) registry.set(id, new El(id)); return registry.get(id); }

// —— 从 index.html 静态提取真实结构，让桩"知道"应用的真实形状 ——
const VIEW_IDS = Array.from(new Set((HTML.match(/id="view-[a-z-]+"/g) || []).map(s => s.slice(4, -1)))).sort();
const NAV_VIEWS = Array.from(new Set((HTML.match(/data-view="[a-z-]+"/g) || []).map(s => s.slice(11, -1)))).sort();
/**
 * 🔴 **二级页面**（由业务入口进入，**不在主导航**）—— 「nav ↔ 视图一一对应」对它们**不成立**。
 * 首个成员 `tool-detail` 由 **SPEC-004** 引入：AI 工具详情页是**路由级页面**（`REQ-202`），
 * 由**工具卡片 / 深链**进入，**不应**出现在左侧主导航中。
 * ⚠️ 白名单**只放宽 `nav` 那一半** —— 「切换后唯一可见 + `hash` 同步」**仍然必须成立**。
 */
const SECONDARY_VIEWS = ['tool-detail'];
const ALL_MODAL_IDS = Array.from(new Set((HTML.match(/id="modal-[a-z0-9-]+"/g) || []).map(s => s.slice(4, -1)))).sort();
// 弹窗「容器」= 声明在 class 含 modal-backdrop 的元素上；其余 modal-* 是确认框子元素等
const MODAL_CONTAINERS = Array.from(new Set(
  [].concat(
    Array.from(HTML.matchAll(/class="[^"]*modal-backdrop[^"]*"[^>]*?\bid="(modal-[a-z0-9-]+)"/g)).map(m => m[1]),
    Array.from(HTML.matchAll(/id="(modal-[a-z0-9-]+)"[^>]*?class="[^"]*modal-backdrop[^"]*"/g)).map(m => m[1])
  )
)).sort();
const MODAL_SUBELEMENTS = ALL_MODAL_IDS.filter(id => MODAL_CONTAINERS.indexOf(id) < 0);

const navItems = NAV_VIEWS.map(v => new El('nav-item-' + v, { 'data-view': v }));
const viewContainers = VIEW_IDS.map(id => el(id));
viewContainers.forEach(e => e.classList.add('view-container'));
const backdropEls = MODAL_CONTAINERS.map(id => el(id));
backdropEls.forEach(e => e.classList.add('modal-backdrop'));

const documentStub = {
  getElementById: (id) => el(id),
  querySelector: (sel) => { const m = /^#([\w-]+)$/.exec(String(sel)); return m ? el(m[1]) : null; },
  querySelectorAll: (sel) => {
    const s = String(sel);
    if (s === '.nav-item') return navItems.slice();
    if (s === '.view-container') return viewContainers.slice();
    if (s === '.modal-backdrop') return backdropEls.slice();
    if (s === '.modal-backdrop.active') return backdropEls.filter(e => e.classList.contains('active'));
    return [];
  },
  addEventListener: () => {},
  createElement: (tag) => new El('created-' + tag),
  body: new El('body')
};

const storage = new Map();
const localStorageStub = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear()
};

const windowStub = {
  location: { hash: '', href: '', pathname: '/' },
  addEventListener: () => {}, removeEventListener: () => {},
  setTimeout: (fn) => { if (typeof fn === 'function') { try { fn(); } catch (e) { /* 桩内忽略延时回调异常 */ } } return 0; },
  clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
  scrollTo: () => {}, open: () => null,
  localStorage: localStorageStub, navigator: { userAgent: 'node' }
};

const sandbox = {
  console: { log: () => {}, error: () => {}, warn: () => {}, info: () => {}, debug: () => {} },
  document: documentStub, window: windowStub, localStorage: localStorageStub,
  setTimeout: windowStub.setTimeout, clearTimeout: windowStub.clearTimeout,
  setInterval: windowStub.setInterval, clearInterval: windowStub.clearInterval,
  navigator: windowStub.navigator, location: windowStub.location,
  requestAnimationFrame: () => 0,
  XMLHttpRequest: function () { this.open = () => {}; this.send = () => {}; this.setRequestHeader = () => {}; },
  Math: Math, Date: Date, JSON: JSON, Number: Number, String: String, Boolean: Boolean,
  Array: Array, Object: Object, RegExp: RegExp, Error: Error, Map: Map, Set: Set,
  parseInt: parseInt, parseFloat: parseFloat, isNaN: isNaN, isFinite: isFinite,
  encodeURIComponent: encodeURIComponent, decodeURIComponent: decodeURIComponent,
  Buffer: Buffer, Uint8ClampedArray: Uint8ClampedArray, Int32Array: Int32Array, Float64Array: Float64Array
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

let loadErr = '';
const load = (src, file, exportExpr) => {
  try { vm.runInContext(src + '\n;try{globalThis.' + exportExpr + '}catch(e){}', sandbox, { filename: file }); }
  catch (e) { loadErr += '[' + file + '] ' + e.message + ' | '; }
};
load(ICONS_SRC, 'icons.js', '__Icons = Icons;');
load(MOCK_SRC, 'mock_data.js', '__MockData = MockData;');
load(CHARTS_SRC, 'charts.js', '__ChartEngine = ChartEngine;');
load(APP_SRC, 'app.js', '__App = App;');

const App = sandbox.__App;
const MockData = sandbox.__MockData;
const loaded = { ok: !!App && !!MockData, err: loadErr };

// ============================ L2-1 首屏洁净 ============================
(function () {
  const staticErr = [];
  const ceApp = (APP_SRC.match(/console\.error\s*\(/g) || []).length;
  const ceHtml = (HTML.match(/console\.error\s*\(/g) || []).length;
  if (ceApp || ceHtml) staticErr.push('存在 console.error 调用 app=' + ceApp + ' html=' + ceHtml);
  const dirtyLiteral = HTML.match(/>\s*(undefined|NaN|\[object Object\])\s*</g) || [];
  if (dirtyLiteral.length) staticErr.push('index.html 含脏字面量 ' + dirtyLiteral.length + ' 处');

  let tried = 0, failed = 0;
  const dirty = [];
  if (loaded.ok && typeof App.renderAllViews === 'function') {
    const renderers = ['renderDiscover', 'renderAcademy', 'renderTools', 'renderCommunity', 'renderTasks', 'renderAnalytics', 'renderAssets'];
    for (const fn of renderers) {
      if (typeof App[fn] !== 'function') continue;
      tried += 1;
      try { App[fn](); } catch (e) { failed += 1; if (VERBOSE) console.log('      · ' + fn + ' 桩内抛错：' + e.message); }
    }
    for (const [id, e] of registry) {
      const txt = String(e.innerHTML || '') + String(e.innerText || '') + String(e.textContent || '');
      if (/undefined|NaN|\[object Object\]/.test(txt)) dirty.push(id);
    }
  }
  const ok = staticErr.length === 0 && dirty.length === 0 && tried > 0;
  assert(1, '首屏洁净（无 console.error；渲染产物无 undefined·NaN·[object Object]）', ok, [
    staticErr.length ? staticErr.join('; ') : '静态洁净',
    '桩内已渲染 ' + tried + ' 个视图' + (failed ? '（' + failed + ' 个抛错，属桩局限，不判失败）' : ''),
    dirty.length ? '脏命中：' + dirty.slice(0, 6).join(',') : '渲染产物无脏字面量'
  ].join(' / '));
})();

// ============================ L2-2 视图可达 ============================
(function () {
  const views = VIEW_IDS.map(x => x.replace(/^view-/, ''));
  // ⚠️ 主导航只与**主视图**一一对应；二级页面（`SECONDARY_VIEWS`）**不在主导航**
  const primary = views.filter(v => SECONDARY_VIEWS.indexOf(v) < 0);
  const same = primary.length === NAV_VIEWS.length && primary.every((v, i) => v === NAV_VIEWS[i]);
  const routeOk = loaded.ok && typeof App.navigateTo === 'function';
  const walk = [];
  if (routeOk) {
    for (const v of views) {
      try {
        App.navigateTo(v);
        const av = viewContainers.filter(e => e.classList.contains('active')).map(e => e.id);
        const an = navItems.filter(e => e.classList.contains('active')).map(e => e.getAttribute('data-view'));
        walk.push({ v: v, views: av.join(','), nav: an.join(','), hash: windowStub.location.hash === v });
      } catch (e) { walk.push({ v: v, views: '', nav: '', hash: false }); }
    }
  }
  // 主视图：唯一可见 + 对应 nav 高亮；二级页面：唯一可见 + **nav 为空**（不得误入主导航）
  const walkOk = routeOk && walk.length === views.length &&
    walk.every(w => w.views === 'view-' + w.v && w.hash === true &&
      (SECONDARY_VIEWS.indexOf(w.v) >= 0 ? w.nav === '' : w.nav === w.v));
  assert(2, '视图可达（主视图 nav ↔ #view-* 一一对应；二级页面唯一可见但不入主导航；hash 同步）',
    same && routeOk && walkOk,
    'view=' + views.length + ' nav=' + NAV_VIEWS.length + '（二级页面 ' + SECONDARY_VIEWS.length + ' 个已豁免 nav 对账）；'
      + (walkOk ? '逐视图走查 ' + views.length + '/' + views.length + ' 唯一可见且 hash 同步'
        : '异常：' + JSON.stringify(walk.filter(w => !(w.views === 'view-' + w.v && w.hash &&
          (SECONDARY_VIEWS.indexOf(w.v) >= 0 ? w.nav === '' : w.nav === w.v))))));
  if (VERBOSE && walk.length) walk.forEach(w => console.log('      · ' + w.v + ' → view[' + w.views + '] nav[' + w.nav + '] hash=' + w.hash));
})();

// ============================ L2-3 弹窗矩阵可开可关 ============================
(function () {
  const openers = MODAL_CONTAINERS.filter(id => APP_SRC.indexOf("'" + id + "'") >= 0 || HTML.indexOf("'" + id + "'") >= 0);
  const unopened = MODAL_CONTAINERS.filter(id => openers.indexOf(id) < 0);
  const closeCalls = (APP_SRC.match(/closeModal\s*\(/g) || []).length;
  const closeControls = (HTML.match(/modal-close-btn|onclick="App\.closeModal|onclick="App\.closeConfirmModal/g) || []).length;
  const ok = MODAL_CONTAINERS.length > 0 && unopened.length === 0 && closeCalls > 0 && closeControls > 0;
  assert(3, '弹窗矩阵可开可关（每个模态容器有开侧引用 + 存在统一关侧）', ok,
    '容器=' + MODAL_CONTAINERS.length + '（子元素 ' + MODAL_SUBELEMENTS.length + ' 个已排除）' +
    '；无开侧引用=' + unopened.length + (unopened.length ? '（' + unopened.slice(0, 8).join(', ') + '）' : '') +
    '；closeModal 调用点=' + closeCalls + '；关侧控件=' + closeControls);
  if (VERBOSE && unopened.length) console.log('      · 未覆盖容器：' + unopened.join(', '));
})();

// ============================ L2-4 数据字段有值 ============================
(function () {
  const issues = [];
  let keys = [];
  if (!loaded.ok) issues.push('模块加载失败：' + loaded.err);
  else {
    keys = Object.keys(MockData);
    if (!keys.length) issues.push('MockData 无一级字段');
    for (const k of keys) {
      const v = MockData[k];
      if (v === undefined || v === null) { issues.push(k + '=' + String(v)); continue; }
      if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0) issues.push(k + ' 为空对象');
    }
    const cur = MockData.currentUser || {};
    for (const nk of ['level', 'learningPoints', 'studyHours', 'coursesFinished', 'certificates']) {
      if (!(nk in cur)) issues.push('currentUser 缺 ' + nk);
      else if (typeof cur[nk] !== 'number') issues.push('currentUser.' + nk + ' 非数值');
    }
    if (typeof cur.level === 'number' && !(cur.level >= 1 && cur.level <= 5)) issues.push('currentUser.level 越界=' + cur.level);
  }
  assert(4, '数据字段有值（MockData 一级字段非空；关键数值字段为数值且在域内）', issues.length === 0,
    '一级字段=' + keys.length + (keys.length ? '（' + keys.join(',') + '）' : '') + (issues.length ? '；问题：' + issues.slice(0, 6).join('; ') : '；全部非空'));
})();

// ============================ L2-5 状态回写正确 ============================
(function () {
  const fails = [];
  const covered = [];
  if (!loaded.ok) fails.push('模块未加载');
  else {
    // 探针 A：筛选类交互 → 目标容器重渲（非仅改变量）
    const body = el('academy-courses-body');
    const before = body.innerHTML;
    if (typeof App.setAcademyCourseCategory !== 'function') fails.push('setAcademyCourseCategory 不存在');
    else {
      try {
        App.setAcademyCourseCategory('全部');
        App.setAcademyCourseFee('免费');
        if (body.innerHTML !== before) covered.push('筛选→academy-courses-body 重渲');
        else fails.push('筛选调用后 academy-courses-body 未变化（疑似未接线）');
      } catch (e) { fails.push('筛选探针抛错：' + e.message); }
    }
    // 探针 B：弹窗开 → 加 active；关 → 去 active（状态回写到 classList）
    const probe = 'modal-coupon';
    try {
      App.openModal(probe);
      const opened = el(probe).classList.contains('active');
      App.closeModal(probe);
      const closed = !el(probe).classList.contains('active');
      if (opened && closed) covered.push('openModal/closeModal → classList.active 回写');
      else fails.push('弹窗开合态未回写（open=' + opened + ' close=' + closed + '）');
    } catch (e) { fails.push('弹窗探针抛错：' + e.message); }
  }
  assert(5, '状态回写正确（交互后 DOM 真实跟随变化）', fails.length === 0,
    '探针=2；已回写=' + covered.length + (covered.length ? '（' + covered.join('；') + '）' : '') + (fails.length ? '；问题：' + fails.join('; ') : ''));
})();

// ============================ L2-6 跨模块闭环 ============================
(function () {
  const chain = {
    '展厅 → 找 TA 定制': ['openGalleryCustomModal', 'confirmGalleryCustom', 'createGalleryCustomTask'],
    '创作工具 → 交付/发帖': ['submitStudioToTask', 'publishFromStudio'],
    '路由 → 视图': ['navigateTo'],
    '弹窗基础设施': ['openModal', 'closeModal']
  };
  const missing = [];
  for (const k of Object.keys(chain)) for (const m of chain[k]) {
    if (!loaded.ok || typeof App[m] !== 'function') missing.push(k + ':' + m);
  }
  const needViews = ['view-tasks', 'view-community', 'view-tools', 'view-academy'];
  const missingViews = needViews.filter(v => VIEW_IDS.indexOf(v) < 0);
  const ok = loaded.ok && missing.length === 0 && missingViews.length === 0;
  assert(6, '跨模块闭环（关键链路方法齐备 + 目标视图存在）', ok,
    '链路组=' + Object.keys(chain).length + ' 方法=' + Object.values(chain).reduce((a, b) => a + b.length, 0) +
    (missing.length ? '；缺方法：' + missing.join(', ') : '；方法齐备') +
    (missingViews.length ? '；缺视图：' + missingViews.join(', ') : '；目标视图齐备'));
})();

// ============================ 汇总 ============================
const passed = results.filter(r => r.pass).length;
console.log('');
console.log('------------------------------------------------------------------------');
console.log(' L2 结构冒烟（零依赖离线实现）· ' + passed + '/' + results.length + ' 通过');
if (passed !== results.length) console.log(' 失败项：' + results.filter(r => !r.pass).map(r => 'L2-' + r.no).join(', '));
console.log(' 能力边界：以「最小 DOM 桩 + vm」在 Node 内近似；不含真实浏览器渲染 / CSS 布局 / 真事件派发。');
console.log('------------------------------------------------------------------------');
process.exit(passed === results.length ? 0 : 1);
