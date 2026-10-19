#!/usr/bin/env node
/**
 * SPEC-017「内容资产存储与转存」自检 —— **冻结自检套件（契约先行）**
 * ---------------------------------------------------------------------------
 * ⚠️ **本套件是"红"的**（登记在 gates-baseline.json 的 l3ExpectedRed 中）。
 *    它**不是回归防线**，而是 **SPEC-017 的待实现清单**：
 *    依 Constitution 原则 10 —— 「**先跑门禁拿到待实现清单，再动手写代码**；
 *    校验器是本轮 TODO 生成器，不是事后检查官」。
 *
 * 顺序（项目自己的「五道工序」）：
 *   契约先行 → **冻结自检（本文件）** → 最小实现 → 三道门禁 → 回填收敛
 *   ⇒ **必须先有本文件的断言，再有实现**；反过来（先实现后补断言）就是"照着实现写测试"，失去意义。
 *
 * 断言来源：`specs/017-content-asset-storage/spec.md` 的验收场景（SC-017-xx）。
 *
 * ---------------------------------------------------------------------------
 * 【本套件冻结的契约】（9 项；实现必须逐字遵守 —— 命名即契约 CON-032）
 * ---------------------------------------------------------------------------
 *  ① `App.computeContentDigest(content)` → string
 *     · **确定性**：同内容 ⇒ 同摘要；不同内容 ⇒ 摘要不同
 *     · ⚠️ 演示态为**简化散列**（零依赖，**非真 SHA-1**）；Stage B 换真 SHA-1 —— 本套件只断言"确定性 + 可用性"，不绑定算法
 *     · **空 / null / 非字符串 ⇒ 返回空串 ''**（**不得**返回一个"看起来合法"的摘要，见 FR-017-42）
 *
 *  ② `App.ASSET_REF_TYPES` → string[5]
 *     · 恰为 ['workcloud','post','delivery','showcase','transcode']
 *       （作品云盘 / 社区帖子附件 / 商单交付物 / 展厅展品 / 第三方被动转存 —— spec §3.1 的五处引用点）
 *
 *  ③ `App.registerAssetObject(payload)` → `{ objectKey, contentDigest, bytes, created }` | **null**
 *     · payload：`{ content, bytes }`
 *     · **幂等**：同内容重复登记 ⇒ `created=false`，**物理对象数不增加**（FR-017-07 / SC-017-02）
 *     · objectKey **由内容摘要派生** ⇒ 同内容 ⇒ 同 key（FR-017-03 / SC-017-10）
 *     · ⚠️ **bytes 不可得（undefined / null / NaN / < 0）⇒ 返回 `null` 显式失败**，**禁止默认 0**（FR-017-42）
 *
 *  ④ `App.attachAssetRef(objectKey, refType, refId)` → boolean
 *     · 建立引用；**幂等**（同 refType+refId 重复 ⇒ 不重复计数，FR-017-13）
 *     · `refType` 必须 ∈ `ASSET_REF_TYPES`，否则返回 false（FR-017-28 的契约面）
 *     · ⚠️ **objectKey 不存在 ⇒ 返回 false**（**禁止静默成功**，FR-017-42 同族）
 *
 *  ⑤ `App.detachAssetRef(objectKey, refType, refId)` → boolean
 *     · 解除引用；**幂等**；对不存在的引用 ⇒ false，且**引用数不得为负**（FR-017-14 / FR-017-15）
 *     · ⚠️ 引用数归零 ⇒ 对象 state 变 **'pendingGC'**，**禁止直接物理删除**（`FR-017-43` / G 组）
 *
 *  ⑥ `App.getAssetRefs(objectKey)` → array（**引用记录 = 唯一真源**，FR-017-12）
 *     `App.getAssetRefCount(objectKey)` → number（**必须由引用记录重算**，不得读缓存计数）
 *     `App.getAssetObject(objectKey)` → object | null
 *     `App.getAssetStoreStats()` → `{ objects, bytes, refs, pendingGC, recycled }`
 *
 *  ⑦ `MockData.assets.objects` / `MockData.assets.assetRefs`
 *     · objects 每条：`{ objectKey, contentDigest, bytes, state, createdAt }`
 *       `state ∈ 'ready' | 'pendingGC' | 'recycled'`（正常 / 待回收 / 已回收）
 *     · assetRefs 每条：`{ objectKey, refType, refId, createdAt }`
 *     · ⚠️ `refCount` **不得**作为存储字段（否则就成为第二事实源 —— Constitution 原则 2）
 *
 *  ⑧ `App.sweepRecyclableAssets()` → `{ recycled: number, pending: number }`
 *     · **仅回收** `state='pendingGC'` **且**观察窗口已过 **且**引用数仍为 0 的对象
 *     · 🔴 **观察窗口未配置（`MockData.assets.gcWindowHours` 为 null / undefined）⇒ 不得回收**
 *       （**禁止退化为"立即回收"**，`FR-017-45` / `EX-017-18`）
 *     · 🔴 引用数 > 0 的对象**在任何路径下都不得被回收**（`FR-017-19` / SC-017-07）
 *
 *  ⑨ `MockData.assets.gcWindowHours` → number | null
 *     · **观察窗口时长（占位）** —— ⚠️ **本套件不预设数值**（属 `Q-043` 剩余项，不得伪造）；
 *       测试通过**临时赋值**来驱动分支，而非依赖某个特定默认值
 *
 * 用法： node tools/wb-content-asset-verify.js
 * 退出码 0 = 全过（SPEC-017 Phase 1 已落地）；1 = 仍有待实现项
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const APP_SRC = fs.readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf8');
const MOCK_SRC = fs.readFileSync(path.join(ROOT, 'js', 'mock_data.js'), 'utf8');

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
 * ⚠️ **与 SPEC-001 套件的一处有意差异**：本套件的 `setTimeout` **同步执行回调**。
 *    原因：`App.simulateGenerate()` 的"生成成功"逻辑写在 `setTimeout(..., 1800)` 里；
 *    若像 SPEC-001 那样让 setTimeout 空转，则**永远观察不到落盘行为**，SC-017-01 无法断言。
 *    （同步执行不影响确定性 —— 回调体本身不依赖时间流逝。）
 */
const toasts = [];
function load() {
  const sb = {
    console: { log() {}, error() {}, warn() {}, info() {} },
    document: documentStub,
    setTimeout: (fn) => { try { if (typeof fn === 'function') fn(); } catch (e) { /* 红套件不得因未实现而崩 */ } return 0; },
    clearTimeout: () => {},
    setInterval: () => 0,
    clearInterval: () => {},
    Date, Math, JSON, parseInt, parseFloat, String, Number, Array, Object, RegExp, isNaN
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
function fresh() { toasts.length = 0; return load(); }

// ------------------------- 断言累积（两类计数） -------------------------
// ⚠️ 刻意分成两类 —— 否则进度会被"平凡通过"严重高估：
//   · ok(   ) → **功能断言**：断言某能力/行为**存在且正确**。未实现时**必然失败** ⇒ 反映真实进度。
//   · okInv( ) → **不变量断言**：断言"某状态**不得变化**"。⚠️ 在能力尚未实现时，
//               因为"什么都没做"，不变量**会平凡通过（vacuous pass）** ⇒ **不代表已实现**。
let pass = 0;
let passInv = 0;
const fails = [];
const failsInv = [];
function ok(cond, msg) { if (cond) pass++; else fails.push(msg); }
function okInv(cond, msg) { if (cond) passInv++; else failsInv.push(msg); }
/** 安全调用：能力未实现时返回哨兵，避免整套崩掉（红套件必须能跑完，才能当 TODO 清单用） */
function safe(fn, dflt) { try { return fn(); } catch (e) { return dflt; } }

const REF_TYPES = ['workcloud', 'post', 'delivery', 'showcase', 'transcode'];
/** 内容资产域的对象表 / 引用表（契约 ⑦） */
function store(md) { return (md.assets && md.assets.objects) || null; }
function refsTable(md) { return (md.assets && md.assets.assetRefs) || null; }
function objCount(md) { const s = store(md); return Array.isArray(s) ? s.length : -1; }
function refCount(md) { const r = refsTable(md); return Array.isArray(r) ? r.length : -1; }
/** 物理对象"总字节"（成功标准 S-3 的量化基线之一） */
function totalBytes(md) {
  const s = store(md);
  if (!Array.isArray(s)) return -1;
  return s.reduce((a, o) => a + (Number(o && o.bytes) || 0), 0);
}
const C1 = '一份用于演示态自检的成片内容 —— 未来江南水乡赛博朋克风（内容 A）';
const C2 = '另一份内容（内容 B），与内容 A 不同';
const BYTES_C1 = 2_400_000;

// ============================================================================
// A 组 · 契约存在性（10 项）
// ============================================================================
{
  const { App, MockData } = fresh();
  ok(typeof App.computeContentDigest === 'function', 'A1 App.computeContentDigest 应为函数（内容摘要契约，FR-017-05）');
  ok(Array.isArray(App.ASSET_REF_TYPES) && REF_TYPES.every((t) => App.ASSET_REF_TYPES.indexOf(t) >= 0),
    'A2 App.ASSET_REF_TYPES 应含 5 处引用点：' + REF_TYPES.join(' / '));
  ok(typeof App.registerAssetObject === 'function', 'A3 App.registerAssetObject 应为函数（落盘即登记，FR-017-01）');
  ok(typeof App.attachAssetRef === 'function', 'A4 App.attachAssetRef 应为函数（建立引用，FR-017-09）');
  ok(typeof App.detachAssetRef === 'function', 'A5 App.detachAssetRef 应为函数（解除引用，FR-017-14）');
  ok(typeof App.getAssetRefs === 'function', 'A6 App.getAssetRefs 应为函数（引用记录 = 唯一真源，FR-017-12）');
  ok(typeof App.getAssetRefCount === 'function', 'A7 App.getAssetRefCount 应为函数（派生引用数，FR-017-12）');
  ok(typeof App.sweepRecyclableAssets === 'function', 'A8 App.sweepRecyclableAssets 应为函数（两阶段回收，FR-017-43）');
  ok(Array.isArray(MockData.assets && MockData.assets.objects), 'A9 MockData.assets.objects 应为数组（契约 ⑦）');
  ok(Array.isArray(MockData.assets && MockData.assets.assetRefs), 'A10 MockData.assets.assetRefs 应为数组（契约 ⑦）');
}

// ============================================================================
// B 组 · 对象登记与内容寻址（FR-017-01 ~ 08；SC-017-01 / 02 / 10 / 13）
// ============================================================================
{
  const { App, MockData } = fresh();
  const o0 = objCount(MockData);

  const r1 = safe(() => App.registerAssetObject({ content: C1, bytes: BYTES_C1 }), null);
  ok(!!r1 && typeof r1.objectKey === 'string' && r1.objectKey.length > 0,
    'B1 登记一份内容应返回非空 objectKey（FR-017-02）');
  ok(!!r1 && r1.created === true, 'B2 首次登记应标记 created=true（FR-017-01）');
  ok(objCount(MockData) === o0 + 1, 'B3 首次登记应新增 1 个物理对象（' + o0 + ' → ' + objCount(MockData) + '，SC-017-01）');

  // B4【核心】同内容重复登记 ⇒ 不新增物理对象
  const before = objCount(MockData);
  const r2 = safe(() => App.registerAssetObject({ content: C1, bytes: BYTES_C1 }), null);
  ok(!!r2 && r2.created === false, 'B4【核心】同内容重复登记应标记 created=false（幂等，FR-017-07）');
  ok(objCount(MockData) === before,
    'B5【核心】同内容重复登记**不得**新增物理对象（' + before + ' → ' + objCount(MockData) + '，SC-017-02）');
  ok(!!r1 && !!r2 && r1.objectKey === r2.objectKey,
    'B6【核心】objectKey 应由内容摘要派生 ⇒ 同内容同 key（FR-017-03）');

  // B7 内容不同 ⇒ 不同 key
  const r3 = safe(() => App.registerAssetObject({ content: C2, bytes: 1_000_000 }), null);
  ok(!!r3 && r3.objectKey !== (r1 && r1.objectKey),
    'B7 内容不同 ⇒ objectKey 必须不同（FR-017-03）');

  // B8【核心】元数据不同但内容相同 ⇒ 共享同一对象键（SC-017-10）
  const before8 = objCount(MockData);
  const r4 = safe(() => App.registerAssetObject({ content: C1, bytes: BYTES_C1, title: '另一个标题（元数据不同）' }), null);
  ok(!!r4 && r4.objectKey === (r1 && r1.objectKey),
    'B8【核心】元数据不同但内容相同 ⇒ 共享同一 objectKey（SC-017-10）');
  ok(objCount(MockData) === before8, 'B9 元数据不同不得新增物理对象（SC-017-10）');

  // B10【缺数据不放行】bytes 不可得 ⇒ 显式失败，禁止默认 0
  const bad = ['undefined', 'null', 'NaN', 0 - 1];
  const badResults = [
    safe(() => App.registerAssetObject({ content: '缺字节数-1', bytes: undefined }), 'THROW'),
    safe(() => App.registerAssetObject({ content: '缺字节数-2', bytes: null }), 'THROW'),
    safe(() => App.registerAssetObject({ content: '缺字节数-3', bytes: NaN }), 'THROW'),
    safe(() => App.registerAssetObject({ content: '缺字节数-4', bytes: -1 }), 'THROW')
  ];
  badResults.forEach((r, i) => {
    ok(r === null, 'B10.' + (i + 1) + '【缺数据不放行】bytes 为 ' + bad[i] + ' 时应返回 null（禁止默认 0，FR-017-42）');
  });

  // B11 内容摘要的确定性
  const d1 = safe(() => App.computeContentDigest(C1), '');
  const d2 = safe(() => App.computeContentDigest(C1), '');
  ok(typeof d1 === 'string' && d1.length > 0 && d1 === d2,
    'B11 computeContentDigest 应对同内容返回稳定的非空摘要（FR-017-05）');
  ok(safe(() => App.computeContentDigest(C2), '') !== d1,
    'B12 不同内容的摘要必须不同（FR-017-05）');
}
{
  // ---- 不变量 ----
  const { App, MockData } = fresh();
  const s0 = JSON.stringify(store(MockData));
  safe(() => App.registerAssetObject({ content: C2, bytes: 999 }), null);
  const s1 = JSON.stringify(store(MockData));
  okInv(s0 !== s1, 'B13[inv] 登记应确实改变对象表（否则断言无效 —— 防止平凡通过）');
}
{
  const { App, MockData } = fresh();
  const bal0 = JSON.stringify(MockData.assets.cards) + '|' + JSON.stringify(MockData.assets.transactions);
  safe(() => App.registerAssetObject({ content: C1, bytes: BYTES_C1 }), null);
  const bal1 = JSON.stringify(MockData.assets.cards) + '|' + JSON.stringify(MockData.assets.transactions);
  okInv(bal0 === bal1, 'B14[inv] 对象登记**不得**改动资金账本（内容资产与资金严格分离，CON-021~023）');
}

// ============================================================================
// C 组 · 引用记账（FR-017-09 ~ 16；SC-017-03 / 04 / 11）
// ============================================================================
{
  const { App, MockData } = fresh();
  const reg = safe(() => App.registerAssetObject({ content: C1, bytes: BYTES_C1 }), null);
  const K = reg && reg.objectKey;

  ok(safe(() => App.attachAssetRef(K, 'post', 'P-1'), false) === true,
    'C1 attachAssetRef 建立引用应返回 true（FR-017-09）');
  ok(safe(() => App.getAssetRefCount(K), -1) === 1, 'C2 建立 1 次引用后引用数应为 1（FR-017-11）');

  // C3【核心】幂等：同 refType+refId 重复 attach 不得重复计数
  ok(safe(() => App.attachAssetRef(K, 'post', 'P-1'), false) === true,
    'C3 重复 attach 同一引用应返回 true（幂等，FR-017-13）');
  ok(safe(() => App.getAssetRefCount(K), -1) === 1,
    'C4【核心】同一引用重复 attach **不得**重复计数（幂等，FR-017-13）');

  // C5【核心】不同引用点引用同一对象 ⇒ 计数累加（SC-017-04）
  safe(() => App.attachAssetRef(K, 'delivery', 'MO-1'), false);
  safe(() => App.attachAssetRef(K, 'showcase', 'GW-1'), false);
  ok(safe(() => App.getAssetRefCount(K), -1) === 3,
    'C5【核心】三处引用同一对象 ⇒ 引用数应为 3（SC-017-04）');
  ok(objCount(MockData) === 1,
    'C6【核心】三处引用**不得**新增物理对象（仍应为 1，SC-017-04）');

  // C7 解除引用 ⇒ 计数 -1
  safe(() => App.detachAssetRef(K, 'showcase', 'GW-1'), false);
  ok(safe(() => App.getAssetRefCount(K), -1) === 2, 'C7 解除一处引用后引用数应为 2（FR-017-14）');

  // C8 幂等：解除不存在的引用不得报错、计数不变
  safe(() => App.detachAssetRef(K, 'showcase', 'GW-1'), false);
  ok(safe(() => App.getAssetRefCount(K), -1) === 2,
    'C8 解除不存在的引用应幂等（计数不变，FR-017-14）');

  // C9 过度解除后引用数仍不得为负 —— ⚠️ 这是**不变量型**：未实现时会因"什么都没做"而平凡通过
  ['workcloud', 'post', 'delivery', 'transcode'].forEach((t) => {
    for (let i = 0; i < 4; i++) safe(() => App.detachAssetRef(K, t, 'X-' + i), false);
  });
  okInv(safe(() => App.getAssetRefCount(K), 0) >= 0,
    'C9[inv] 过度解除后引用数**不得为负**（FR-017-15）');

  // C10 refType 非法 ⇒ false
  const r2 = safe(() => App.registerAssetObject({ content: C2, bytes: 1 }), null);
  const K2 = r2 && r2.objectKey;
  ok(safe(() => App.attachAssetRef(K2, 'not-a-real-ref-type', 'Z-1'), true) === false,
    'C10 refType 不在 ASSET_REF_TYPES 内时应返回 false（契约 ④）');

  // C11【缺数据不放行】引用不存在的对象键 ⇒ false（禁止静默成功）
  ok(safe(() => App.attachAssetRef('__NO_SUCH_KEY__', 'post', 'P-X'), true) === false,
    'C11【缺数据不放行】引用不存在的 objectKey 应返回 false（禁止静默成功，FR-017-42）');

  // C12【核心】引用记录是唯一真源：派生计数必须等于引用记录重算值
  const byRefs = safe(() => (App.getAssetRefs(K) || []).length, -1);
  ok(byRefs === safe(() => App.getAssetRefCount(K), -2),
    'C12【核心】getAssetRefCount 必须等于 getAssetRefs().length（引用记录为唯一真源，FR-017-12）');

  // C13 不得把 refCount 存成字段（否则即第二事实源）
  const obj = safe(() => App.getAssetObject(K), null);
  ok(!!obj && obj.refCount === undefined,
    'C13【核心】对象上**不得**存在 refCount 字段（防止第二事实源，Constitution 原则 2）');
}
{
  // ---- 不变量 ----
  const { App, MockData } = fresh();
  const reg = safe(() => App.registerAssetObject({ content: C1, bytes: BYTES_C1 }), null);
  const K = reg && reg.objectKey;
  const snap = () => JSON.stringify(safe(() => App.getAssetObject(K), null));
  const s0 = snap();
  safe(() => App.attachAssetRef(K, 'post', 'P-1'), false);
  safe(() => App.attachAssetRef(K, 'delivery', 'MO-1'), false);
  okInv(snap() === s0, 'C14[inv] 引用变更**不得**改动对象本体（contentDigest / bytes 不变，FR-017-16）');
}
{
  const { App, MockData } = fresh();
  const reg = safe(() => App.registerAssetObject({ content: C1, bytes: BYTES_C1 }), null);
  const K = reg && reg.objectKey;
  const bal0 = JSON.stringify(MockData.assets.cards);
  safe(() => App.attachAssetRef(K, 'delivery', 'MO-9'), false);
  okInv(bal0 === JSON.stringify(MockData.assets.cards),
    'C15[inv] 引用变更**不得**改动账户余额（内容资产与资金分离，CON-021~023）');
}

// ============================================================================
// D 组 · 回收与生命周期（FR-017-17 ~ 22 + G 组 FR-017-43 ~ 45；SC-017-06 / 07 / 16）
// ============================================================================
{
  const { App, MockData } = fresh();
  const reg = safe(() => App.registerAssetObject({ content: C1, bytes: BYTES_C1 }), null);
  const K = reg && reg.objectKey;
  safe(() => App.attachAssetRef(K, 'post', 'P-1'), false);

  // D1【核心】引用 > 0 ⇒ 任何回收路径下对象必须存活
  safe(() => App.sweepRecyclableAssets(), null);
  const o1 = safe(() => App.getAssetObject(K), null);
  ok(!!o1 && o1.state !== 'recycled',
    'D1【核心】引用数 > 0 的对象**任何情况下不得被回收**（SC-017-07）');
  ok(safe(() => App.getAssetRefCount(K), -1) === 1,
    'D2 回收流程**不得**影响仍存活的引用（FR-017-20）');

  // D3【核心】引用归零 ⇒ 进入 'pendingGC'，不得直接物理删除
  safe(() => App.detachAssetRef(K, 'post', 'P-1'), false);
  const o2 = safe(() => App.getAssetObject(K), null);
  ok(!!o2 && o2.state === 'pendingGC',
    'D3【核心】引用归零 ⇒ 对象应进入「待回收」态 pendingGC（FR-017-43，实际 ' + JSON.stringify(o2 && o2.state) + '）');
  ok(!!safe(() => App.getAssetObject(K), null),
    'D4【核心】引用刚归零时**不得**被立即物理删除（两阶段回收，FR-017-43）');

  // D5【核心】观察窗口未配置 ⇒ 不得回收（禁止退化为"立即回收"）
  MockData.assets.gcWindowHours = null;
  safe(() => App.sweepRecyclableAssets(), null);
  const o3 = safe(() => App.getAssetObject(K), null);
  ok(!!o3 && o3.state === 'pendingGC',
    'D5【核心】观察窗口未配置 ⇒ **不得**回收（禁止退化为立即回收，FR-017-45 / EX-017-18）');

  // D6 窗口已配置但未到期 ⇒ 不得回收
  MockData.assets.gcWindowHours = 24;
  const o4 = safe(() => App.getAssetObject(K), null);
  if (o4 && o4.pendingSince !== undefined) o4.pendingSince = Date.now();
  safe(() => App.sweepRecyclableAssets(), null);
  ok(!!safe(() => App.getAssetObject(K), null) && safe(() => App.getAssetObject(K), {}).state === 'pendingGC',
    'D6 观察窗口未到期 ⇒ 不得回收（FR-017-43）');

  // D7【核心】pendingGC 期间被重新引用 ⇒ 自动退出待回收态
  ok(safe(() => App.attachAssetRef(K, 'post', 'P-2'), false) === true,
    'D7【核心】待回收态的对象应仍可被引用（FR-017-44）');
  const o5 = safe(() => App.getAssetObject(K), null);
  ok(!!o5 && o5.state === 'ready',
    'D8【核心】窗口期内被重新引用 ⇒ 应自动退出待回收态回到 ready（FR-017-44 / SC-017-16）');
  ok(safe(() => App.getAssetRefCount(K), -1) === 1,
    'D9 复活后的引用数应正确为 1（FR-017-44）');
}
{
  // ---- 不变量 ----
  const { App, MockData } = fresh();
  const a = safe(() => App.registerAssetObject({ content: C1, bytes: BYTES_C1 }), null);
  const b = safe(() => App.registerAssetObject({ content: C2, bytes: 2 }), null);
  const KA = a && a.objectKey, KB = b && b.objectKey;
  safe(() => App.attachAssetRef(KA, 'post', 'P-1'), false);   // A 被引用（ready）
  safe(() => App.attachAssetRef(KB, 'post', 'P-2'), false);
  safe(() => App.detachAssetRef(KB, 'post', 'P-2'), false);   // B 归零 → pendingGC
  MockData.assets.gcWindowHours = 24;
  safe(() => App.sweepRecyclableAssets(), null);
  ok(!!safe(() => App.getAssetObject(KA), null),
    'D10 回收流程**不得**删除 state=ready 的对象（FR-017-19）');
}
{
  const { App, MockData } = fresh();
  const reg = safe(() => App.registerAssetObject({ content: C1, bytes: BYTES_C1 }), null);
  const K = reg && reg.objectKey;
  safe(() => App.attachAssetRef(K, 'post', 'P-1'), false);
  const refs0 = safe(() => JSON.stringify(App.getAssetRefs(K)), '[]');
  safe(() => App.sweepRecyclableAssets(), null);
  safe(() => App.sweepRecyclableAssets(), null);
  okInv(safe(() => JSON.stringify(App.getAssetRefs(K)), '[]') === refs0,
    'D11[inv] 回收流程**不得**改动引用记录（回收只影响对象，不影响引用，FR-017-22）');
}
{
  const { App, MockData } = fresh();
  const reg = safe(() => App.registerAssetObject({ content: C1, bytes: BYTES_C1 }), null);
  const K = reg && reg.objectKey;
  safe(() => App.attachAssetRef(K, 'post', 'P-1'), false);
  const bal0 = JSON.stringify(MockData.assets.cards);
  safe(() => App.sweepRecyclableAssets(), null);
  okInv(bal0 === JSON.stringify(MockData.assets.cards),
    'D12[inv] 回收流程**不得**改动资金账本（CON-021~023）');
}

// ============================================================================
// E 组 · 五处引用点与"存储不膨胀"（FR-017-23 ~ 30；SC-017-01 / 03 / 04 / 08 / 15）
// ============================================================================
{
  // E1【核心】生成成功 ⇒ 必然登记对象（对照 lastStudioDraft 单例缺陷）
  const { App, MockData } = fresh();
  const o0 = objCount(MockData);
  safe(() => App.simulateGenerate(), null);
  ok(objCount(MockData) > o0,
    'E1【核心】生成成功后应登记 1 个内容对象（落盘即登记，SC-017-01；实际 ' + o0 + ' → ' + objCount(MockData) + '）');
}
{
  // E2【核心】存储不随分享膨胀 —— 同一对象被 N 次引用后，对象数与字节数不变
  const { App, MockData } = fresh();
  const reg = safe(() => App.registerAssetObject({ content: C1, bytes: BYTES_C1 }), null);
  const K = reg && reg.objectKey;
  const n0 = objCount(MockData), b0 = totalBytes(MockData);
  // ⚠️ 前置断言：否则对象表不存在时（-1 === -1）E2b 会**平凡通过**，把真实进度报成"已完成"
  ok(n0 > 0 && b0 > 0,
    'E2a 前置：登记后对象表应非空且总字节 > 0（' + n0 + ' / ' + b0 + '；缺此断言 E2b 会平凡通过）');
  for (let i = 1; i <= 3; i++) {
    safe(() => App.attachAssetRef(K, 'post', 'P-' + i), false);
    safe(() => App.attachAssetRef(K, 'delivery', 'MO-' + i), false);
    safe(() => App.attachAssetRef(K, 'showcase', 'GW-' + i), false);
  }
  ok(objCount(MockData) === n0 && totalBytes(MockData) === b0,
    'E2b【核心】9 次引用后物理对象数与总字节数**均不得增加**（' + n0 + '/' + b0 + ' → ' + objCount(MockData) + '/' + totalBytes(MockData) + '，SC-017-08 / S-3）');
  ok(safe(() => App.getAssetRefCount(K), -1) === 9,
    'E3【核心】9 次引用应被完整记账（引用数 = 9，FR-017-11）');
}
{
  const { App, MockData } = fresh();
  const o0 = objCount(MockData);
  safe(() => App.simulateGenerate(), null);
  const o1 = objCount(MockData);
  safe(() => App.publishFromStudio(), null);
  ok(objCount(MockData) === o1,
    'E4【核心】分享至社区**不得**新增物理对象（复用同一对象键，SC-017-03）');
  ok(o1 > o0, 'E5 生成 + 分享后应有对象登记（前置条件确认，便于定位失败原因）');
}
{
  const { App, MockData } = fresh();
  const o0 = objCount(MockData);
  safe(() => App.simulateGenerate(), null);
  const o1 = objCount(MockData);
  safe(() => App.publishStudioToShowcase(), null);
  ok(objCount(MockData) === o1,
    'E6【核心】上架展厅**不得**新增物理对象（应为引用而非副本，SC-017-08 / FR-017-26）');
}
{
  // E7【核心】提交商单交付物必须真的"挂载"（对照当前假实现：只跳转 + Toast）
  const { App, MockData } = fresh();
  safe(() => App.simulateGenerate(), null);
  const refBefore = refCount(MockData);
  safe(() => App.submitStudioToTask(), null);
  ok(refCount(MockData) > refBefore,
    'E7【核心】提交为商单交付物应真的建立一次 delivery 引用（当前实现只跳转+Toast，属假实现，FR-017-25 / SC-017-04；引用记录 ' + refBefore + ' → ' + refCount(MockData) + '）');
}
{
  const { App, MockData } = fresh();
  const reg = safe(() => App.registerAssetObject({ content: C1, bytes: BYTES_C1 }), null);
  const K = reg && reg.objectKey;
  ['post', 'delivery', 'showcase', 'workcloud'].forEach((t) => safe(() => App.attachAssetRef(K, t, 'R-' + t), false));
  const refs = safe(() => App.getAssetRefs(K), []);
  const types = [...new Set((refs || []).map((r) => r && r.refType))];
  ok(REF_TYPES.filter((t) => t !== 'transcode').every((t) => types.indexOf(t) >= 0),
    'E8 四处引用点应可同时引用同一对象（refType 覆盖：' + types.join(',') + '，FR-017-23 ~ 26）');
}

// ============================================================================
// F 组 · 可观测与对账（FR-017-36 ~ 38；SC-017-14）
// ============================================================================
{
  const { App, MockData } = fresh();
  const a = safe(() => App.registerAssetObject({ content: C1, bytes: BYTES_C1 }), null);
  const b = safe(() => App.registerAssetObject({ content: C2, bytes: 1024 }), null);
  safe(() => App.attachAssetRef(a && a.objectKey, 'post', 'P-1'), false);

  const st = safe(() => App.getAssetStoreStats(), null);
  ok(!!st && typeof st.objects === 'number' && typeof st.bytes === 'number' && typeof st.refs === 'number',
    'F1 getAssetStoreStats 应返回 { objects, bytes, refs }（FR-017-36）');
  ok(!!st && st.objects === objCount(MockData),
    'F2 objects 计数应与对象表一致（可对账，FR-017-37）');
  ok(!!st && st.refs === refCount(MockData),
    'F3 refs 计数应与引用表一致（可对账，FR-017-37）');
  ok(!!st && st.bytes === totalBytes(MockData),
    'F4 bytes 应与对象表重算值一致（可对账，FR-017-37）');

  // F5 兼容既有渲染字段：对象仍需能解析出可展示的封面（不得破坏既有 UI）
  const o = safe(() => App.getAssetObject(a && a.objectKey), null);
  ok(!!o && o.state === 'ready', 'F5 对象应有 state 且初始为 ready（契约 ⑦）');
  ok(safe(() => App.getAssetRefs('__NO_SUCH_KEY__'), null) !== null,
    'F6【缺数据不放行】getAssetRefs(不存在的键) 应返回空数组而非 null（避免调用方解引用崩溃，FR-017-38）');
}

// ============================================================================
// G 组 · 缺数据 / 缺配置不放行（FR-017-42 / 45；EX-017-18）
// ============================================================================
{
  const { App } = fresh();
  ok(safe(() => App.computeContentDigest(''), 'X') === '',
    'G1【缺数据不放行】空内容 ⇒ 内容摘要应为空串（不得返回"看起来合法"的摘要，FR-017-42）');
  ok(safe(() => App.computeContentDigest(null), 'X') === '',
    'G2【缺数据不放行】null 内容 ⇒ 内容摘要应为空串（FR-017-42）');
  ok(safe(() => App.computeContentDigest(12345), 'X') === '',
    'G3【缺数据不放行】非字符串内容 ⇒ 内容摘要应为空串（FR-017-42）');
  ok(safe(() => App.registerAssetObject({ content: '', bytes: 100 }), 'X') === null,
    'G4【缺数据不放行】空内容登记应显式失败（返回 null，FR-017-42）');
}

// ============================================================================
// 输出
// ============================================================================
const totalFunc = pass + fails.length;
const totalInv = passInv + failsInv.length;
const line = '-'.repeat(72);
console.log('\n' + line);
console.log(' SPEC-017 内容资产存储与转存 —— 契约冻结自检（契约先行 · 冻结自检）');
console.log(' 契约：computeContentDigest / ASSET_REF_TYPES / registerAssetObject / attachAssetRef');
console.log('       detachAssetRef / getAssetRefs / getAssetRefCount / sweepRecyclableAssets');
console.log('       MockData.assets.objects / .assetRefs / .gcWindowHours');
console.log(' 依据：specs/017-content-asset-storage/spec.md  SC-017-01 ~ 16');
console.log(line);
console.log(' 【功能断言】 ' + pass + '/' + totalFunc + '   ← 真实进度看这一行');
console.log(' 【不变量断言】 ' + passInv + '/' + totalInv + '   ← ⚠️ 未实现时会平凡通过，不构成证据、不计入进度');
console.log(line);
if (fails.length === 0 && failsInv.length === 0) {
  // ⚠️ 本行格式**必须**为「全部通过：N 项断言」—— `tools/gates.js` 依此正则提取断言数
  //    （`/全部通过\s*[：:]\s*(\d+)\s*项/`）。格式不符 ⇒ 本套件会被计为 0 项，
  //    导致「断言合计」低估、转绿后也无法计入证据。与 `wb-identity-admission-verify.js` 保持一致。
  console.log(' ✓ 全部通过：' + (pass + passInv) + ' 项断言（功能 ' + pass + ' + 不变量 ' + passInv + '）');
  console.log('   ⇒ SPEC-017 Phase 1 已落地。请把本套件从 gates-baseline.json 的 l3ExpectedRed 中移除（转为回归防线）。');
} else {
  if (fails.length) {
    console.log(' ✗ 功能断言待实现 ' + fails.length + ' 项 —— 这是 SPEC-017 Phase 1 的 TODO 清单：');
    fails.forEach((f, i) => console.log('   ' + (i + 1) + '. ' + f));
  }
  if (failsInv.length) {
    console.log('');
    console.log(' ⚠️ 不变量断言未通过 ' + failsInv.length + ' 项（实现后应转为通过，但**不得**计入进度）：');
    failsInv.forEach((f, i) => console.log('   ' + (i + 1) + '. ' + f));
  }
  // ⚠️ 本行是**门禁格式契约**的一部分（补齐于 CHG-020；`wb-identity-admission-verify.js` 早已采用同一格式）：
  //    `tools/gates.js` 的 `parseCount` 依 `/通过\s*[：:]\s*(\d+)\s*\/\s*(\d+)/` 提取红灯套件的
  //    「已登记待实现 x/y 项」。缺此行 ⇒ 该套件**红灯期的实现进度无法被单独报出**（显示 0/0），
  //    红灯机制「单独报进度」的能力随之失效。
  //    逐字对齐 identity 套件 —— **只报功能断言**（不变量断言未计入，它们不构成任何证据）。
  //    该套件已于 CHG-017 转绿，此行在绿灯时不会执行；保留它是为了让「再变红」时仍能报进度。
  console.log(' 通过：' + pass + '/' + totalFunc + ' 项功能断言（不变量断言 ' + passInv + '/' + totalInv + ' 未计入）');
}
console.log(line + '\n');
process.exit(fails.length === 0 && failsInv.length === 0 ? 0 : 1);
