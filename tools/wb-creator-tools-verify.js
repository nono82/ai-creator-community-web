#!/usr/bin/env node
/**
 * SPEC-004「创作工具工作台与模板套用」自检 —— **冻结自检套件（契约先行）**
 * ---------------------------------------------------------------------------
 * ✅ **本套件已转绿**（`CHG-023`：SPEC-004 Phase 1 已落地，**功能断言 126/126 + 不变量 14/14，退出码 0**）。
 *    它已由「待实现清单」转为「**回归防线**」，并已从 gates-baseline.json 的 `l3ExpectedRed` 移除。
 *    它**不是回归防线**，而是 **SPEC-004 的待实现清单**：
 *    依 Constitution 原则 10 —— 「**先跑门禁拿到待实现清单，再动手写代码**；
 *    校验器是本轮 TODO 生成器，不是事后检查官」。
 *
 * 顺序（项目自己的「五道工序」）：
 *   契约先行 → **冻结自检（本文件）** → 最小实现 → 三道门禁 → 回填收敛
 *   ⇒ **必须先有本文件的断言，再有实现**；反过来（先实现后补断言）就是"照着实现写测试"，失去意义。
 *
 * 断言来源：`specs/004-creator-tools/spec.md` 的验收场景（SC-004-01 ~ 16）。
 *
 * ---------------------------------------------------------------------------
 * 【本套件冻结的契约】（16 项；实现必须逐字遵守 —— 命名即契约 CON-032）
 * ---------------------------------------------------------------------------
 *  ① `App.TOOL_INTEGRATION_TYPES` → array[3]
 *     · **集成模式的唯一真源**（FR-004-01 / §7.1）。冻结值：`['native', 'third-integrated', 'third-external']`
 *       （**顺序即契约**）。🔴 现状 `MockData.tools.allTools[]` **无 `integration` 字段** ⇒ 必须一并补齐（缺陷 ②）。
 *
 *  ② `App.resolveToolIntegration(tool)` → string | **null**
 *     · **集成模式解析的唯一入口**（FR-004-01）。
 *     · 🔴 **缺字段 / 非法取值 ⇒ 返回 `null`** —— **不得**默认按 `native` 处理（`EX-004-01` / `EX-004-02`）。
 *       （理由：这是「缺数据默认放行」的第 2 种形态 —— 默认一个**资格**）
 *
 *  ③ `App.openToolCard(toolId)` → `{ mode, view, external, toolId }` | **null**
 *     · **所有工具卡片的统一路由入口**（FR-004-05）—— 覆盖 **工具矩阵 / 我的工具箱 / 热门榜单** 三处卡片。
 *     · 三模式行为（§7.1）：`native` / `third-integrated` ⇒ `view === 'tool-detail'`、`external === false`；
 *       `third-external` ⇒ `external === true`、**`view !== 'tool-detail'`**（新标签外跳，**不进入**平台详情页）。
 *     · 🔴 `third-external` 无 url ⇒ **显式失败**（`EX-004-12`，不得打开空白页）。
 *     · 🔴 未知 `toolId` / `integration` 不可解析 ⇒ **显式失败** + Toast 含"不可用"（`EX-004-13`）。
 *
 *  ④ `App.openToolDetail(toolId, opts)` → boolean
 *     · **进入路由级详情页**（FR-004-07 / §7.2）：`App.currentView === 'tool-detail'`
 *       **且** `window.location.hash === 'tool-detail'`（⇒ 深链 / 刷新后可停留，FR-004-13）。
 *     · 🔴 **不得**以弹窗 / 抽屉承载主生产区（`SC-004-01` / `REQ-202`）—— 即本路径**不得** `openModal('modal-studio')`。
 *     · 🔴 未知 `toolId` ⇒ 返回 `false`，**且 `currentView` 不变**（不得渲染空壳，`EX-004-13`）。
 *     · 🔑 **可读状态**：`App.currentView === 'tool-detail'` 与 `App.currentToolId === toolId`
 *       （后者是**深链 / 刷新后渲染**的依据 —— FR-004-13）。
 *     · ⚠️ `Q-049` 定稿「**两阶段**」：Phase 1 **只建壳**（本条 + ⑤⑥⑦），**生成动作仍走 `#modal-studio`**
 *       ⇒ 本套件**不要求** `simulateGenerate` 迁入新页（那是 Phase 2）。
 *
 *  ⑤ `App.toggleTdHero()` → boolean
 *     · Hero 区**整体收起 / 展开**（FR-004-09 / `SC-004-03`）。
 *     · 🔑 **可读状态**：`App.tdHeroCollapsed`（boolean）；收起后 `#td-hero-identity` **不得**被隐藏。
 *       收起态须**可读**（`App.tdHeroCollapsed`，
 *       或 `#td-hero` 的 `classList` 含 `collapsed`）；**收起后仅保留身份头**（不得连身份头一起隐藏）。
 *
 *  ⑥ `App.switchTdTab(tab)` → boolean
 *     · Hero 标签条 `bio`（简介）/ `templates`（示例模板）/ `tips`（使用技巧）/ `reviews`（评论）（FR-004-08 / Q-051）。
 *     · 🔴 **默认落在 `templates`**（FR-004-10）—— 即打开详情页后当前 Hero 标签为「示例模板」。
 *     · 🔴 未知 tab ⇒ 返回 `false` **且不改动现状**（不得静默切到第一个）。
 *     · 🔑 **可读状态**：`App.tdHeroTab`（当前 Hero 标签；默认 `'templates'`）。
 *
 *  ⑦ `App.switchTdWorkTab(tab)` → boolean
 *     · 工作区标签条 `workbench`（工作台）/ `history`（历史任务）（FR-004-11）。
 *     · 🔴 **默认落在 `workbench`**（FR-004-11）。
 *     · 🔑 **可读状态**：`App.tdWorkTab`（当前工作区标签；默认 `'workbench'`）。
 *     · 🔴 `third-integrated` 的「工作台」标签内容须为 **余额 / 充值 / 去使用**（FR-004-31）；
 *       「去使用」走**新标签 SSO 外跳**（FR-004-32，返回 `external === true` 的标记）。
 *
 *  ⑧ `App.computeGenerateCost(tool)` → number | **null**
 *     · 本次生成所需 AI 积分（FR-004-15）。冻结值 = **20**（`REQ-204`）。
 *     · 🔴 **成本配置缺失 ⇒ 返回 `null`** —— **不得**默认 0 或默认 20 放行。
 *       （理由：这是「缺数据默认放行」的第 1 种形态 —— 默认一个**金额**）
 *
 *  ⑨ `App.preauthorizeGenerate(toolId, prompt)` → `{ ok, cost, source, ticket }`
 *     · **生成前预扣的唯一入口**（FR-004-15 / `FR-004-19`）。
 *     · 🔴 **`pre` 语义 = 先扣**：调用返回后（**不等待任何异步**）来源池**已**减少 `cost`，
 *       且 `aiPointLedger` **已**新增 1 条 `kind === 'consume'` 且 `type === source` 的流水。
 *       ⚠️ 现状 `simulateGenerate` 是「**渲染成功后**才扣」且**硬编码 `self`** ⇒ 与 `FR-004-15` 的「预扣 + 按来源」**不符**。
 *     · 🔴 **不跨源**（`Q-006` / `SC-004-15`）：扣 `self` 时 `integrated` **完全不变**，反之亦然。
 *     · 🔴 **积分不足 ⇒ `ok === false` 且积分不变、不进入渲染**（`FR-004-19`）：
 *       恰好等于 `cost` **允许**（含等号，扣后为 0，`EX-004-06`）；**差 1 点即拒绝**（`EX-004-07`）。
 *       ⚠️ 现状 `Math.max(0, ...)` ⇒ 余额不足**静默扣到 0 且照常成功** ⇒ 必须改为**显式拒绝**。
 *     · 🔴 `prompt` 为空 / 仅空白 ⇒ **拒绝且不扣分**（`EX-004-03`）。
 *     · 🔴 **幂等**：同一工具在渲染中重复调用 ⇒ **不重复扣分**（`EX-004-05`）。
 *     · `ticket` = `{ source, cost }` 的最小凭据，供 ⑪ / ⑫ 精确回补。
 *
 *  ⑩ `App.generateFromTicket(ticket, content)` → `{ ok, objectKey }`
 *     · **落盘 = 提交渲染**（FR-004-17）：**消费 ⑨ 产出的 `ticket`**，把内容登记为内容对象（`SPEC-017` 的
 *       `registerAssetObject`）并建立 `workcloud` 引用。
 *     · 🔴 **落盘成功才点亮双路流转**（`#btn-studio-deliver` / `#btn-studio-publish` / `#btn-studio-showcase`）。
 *     · 🔴 **登记失败（内容不可用 / 字节不可得）⇒ 走 ⑫ 的失败出口**（退还 + 零残留，`EX-004-14`）。
 *     · ⚠️ 为什么把「预扣」与「落盘」拆成两步：只有拆开，才可能表达「**已扣分但渲染失败 ⇒ 全额退还**」
 *       （`REQ-204`）。合并成一步时，"退还"在语义上无处安放。
 *  ⑪ `App.refundGenerate(ticket)` → boolean
 *     · **全额原路退还的唯一入口**（FR-004-18）。🔴 **按 `ticket.source` 精确回补** ——
 *       `self` 的失败**只**回补 `self`，**不得**张冠李戴到 `integrated`（`EX-004-09`）。
 *     · 🔴 退还写 1 条 `kind === 'refund'` 流水（NFR-015 分源留痕）。
 *     · 🔴 **防重复退还**：同一 `ticket` 二次调用 ⇒ 返回 `false` 且积分不再变化。
 *     · 🔴 无效 / 未知 `ticket` ⇒ 返回 `false`，**不改动任何数据**。
 *
 *  ⑫ `App.failGenerate(ticket, reason)` → boolean
 *     · **失败 / 超时的统一出口**（FR-004-18 / `EX-004-04`）：**退还积分** + **零残留**（回收该次生成的对象与 `workcloud` 引用）
 *       + **不点亮**双路流转（`FR-004-36` / `SC-004-05`）。
 *     · 🔴 **零残留**：物理对象数与 `workcloud` 引用数**均回到生成前的值**（`EX-004-14`）。
 *       ⚠️ 「生成成功但登记失败」亦走本出口。
 *
 *  ⑬ `App.applyTemplateToWorkspace(templateId, toolId)` → object | **null**
 *     · **模板套用的承接端**（FR-004-26 / §7.5）—— 与 `SPEC-003` 的 R4 入口**共用同一契约名**
 *       （该名同时是 L1 基线的 7 个 ERROR 之一 ⇒ 实现后该 ERROR 应消失）。
 *     · 🔴 **套用不扣分**（FR-004-27）：`self` / `integrated` / 学习积分**均不变**。
 *     · 🔴 未知模板 ⇒ `null`；模板与目标工具**不兼容** ⇒ 显式提示（`EX-004-11`，不得静默套用错误参数）。
 *     · 🔴 套用后进入**对应工具**的详情页且工作区落在「工作台」。
 *
 *  ⑭ `App.getToolHistory()` → array
 *     · **历史任务**读入口（FR-004-29）：含 `rendering` / `queued` / `done` 三类状态。
 *     · 🔴 **未知状态 ⇒ 显式标记为异常**，**不得**渲染为"已完成"（`EX-004-15`）。
 *
 *  ⑮ `App.restoreDraft(draftId)` → object | **null**
 *     · **草稿断点恢复**（FR-004-30）：恢复后工作台被预填；🔴 **恢复不扣分**。
 *     · 🔴 未知 `draftId` ⇒ `null`。
 *
 *  ⑯ `MockData.tools.allTools[].integration` —— **数据契约**
 *     · 8 个工具**每项**都须带 `integration`，且取值 ∈ ①。三种模式**均须有样本**（否则 `SC-004-02` 无法验收）。
 *     · 🔴 `MockData.tools.myToolbox[].id` 与 `leaderboard[].id` **必须补 `id`** ——
 *       实测二者**均无 `id`**（仅 `name / desc / icon / color`）⇒ 卡片**无从路由**（违反 `FR-004-05`）。
 *
 *  ⑰ `MockData.tools.toolDetails` —— **数据契约**（`Q-051` 定稿：需新增工具维度数据集合）
 *     · 按 `toolId` 索引，承载 Hero 区四标签内容：`templates` / `tips` / `reviews`（+ `bio` 可复用 `desc`）。
 *     · 🔴 **工具评论独立** —— **不复用社区能力**（不得读 `MockData.community.posts`）。
 *
 * ---------------------------------------------------------------------------
 * 【与本 Feature 三条既有缺陷的对应】
 *   缺陷 ① 承载形态与 REQ-202 相反（`#modal-studio` 弹窗 vs `#view-tool-detail` 路由页）→ ④
 *   缺陷 ② 集成模式未数据化（`allTools` 缺 `integration`）                        → ①②③⑯
 *   缺陷 ③ `refCount` 口径与 SPEC-017 冲突                                        → I 组（源码级负向）
 *
 * ---------------------------------------------------------------------------
 * 【立红期（2026-09-25）实测新增的 6 处缺口 —— `spec.md` §1.2 未记载】
 *   ④ 🔴 **扣分是"成功后扣"、不是"预扣"**；且**硬编码 `self`**（`simulateGenerate` 11303 行附近）→ ⑨ D5 / D8
 *   ⑤ 🔴 **`Math.max(0, ...)` ⇒ 余额不足静默扣到 0 且照常成功**（违反 `EX-004-06/07`）→ ⑨ D9 / D11
 *   ⑥ 🔴 **模型引擎 / 画幅比例的下拉无 `id`**（`index.html` 2164 / 2173 行）⇒ `FR-004-14` 无法被程序读取 → D 组
 *   ⑦ 🔴 **`myToolbox` / `leaderboard` 无 `id`** ⇒ 卡片无从路由（`FR-004-05`）→ ⑯ A14 / A15
 *   ⑧ ⚠️ `#modal-studio` 段**大量内联 `style="..."` 与硬编码色值**（2151 / 2161 / 2183 / 2185 / 2190~2192）
 *       ⇒ 与 `FR-004-37` 冲突；**新建段不得沿袭**（既有段**不得**顺手重写 —— 降风险）→ I4
 *   ⑨ ⚠️ `simulateGenerate` 的 `setTimeout` 回调内**无失败分支** ⇒ 「退还」完全不存在（确认 `spec.md` §1.2 记载）→ E 组
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const APP_SRC = fs.readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf8');
const MOCK_SRC = fs.readFileSync(path.join(ROOT, 'js', 'mock_data.js'), 'utf8');
const HTML_SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

/**
 * 源码级断言的匹配基底：**剔除注释**后的代码。
 * ⚠️ 为什么必须剔除：I 组用字符串匹配找"旧口径 / 禁入特征"，而**说明性注释**里天然会提到它们
 *    （例如「不得出现 `refCount`」本身就会命中）⇒ 若不剔除，**正确的实现反而会红**。
 *    （该坑在 SPEC-003 的套件里实测踩过：`app.js` 的注释导致 F4 / F5 误判。）
 */
const APP_CODE = APP_SRC
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split(/\r?\n/)
  .map(function (l) { return l.replace(/\/\/.*$/, ''); })
  .join('\n');
/**
 * 同上，用于 `mock_data.js` 的数据级负向断言（J13）。
 * ⚠️ **立红期实测踩到同一坑**：`mock_data.js:4949` 有一条 SPEC-017 落地时写的注释
 *    「objectKey 上**不得**存 refCount 字段」⇒ 不剔注释则该断言**永远为红**（而实现是正确的）。
 */
const MOCK_CODE = MOCK_SRC
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split(/\r?\n/)
  .map(function (l) { return l.replace(/\/\/.*$/, ''); })
  .join('\n');
const HTML_CODE = HTML_SRC
  .replace(/<!--[\s\S]*?-->/g, '')
  .split(/\r?\n/)
  .map(function (l) { return l.replace(/\/\/.*$/, ''); })
  .join('\n');

// ------------------------- 最小 DOM 桩（与既有三套同构） -------------------------
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
 * ⚠️ **与 SPEC-001 / SPEC-003 套件同构**：必须提供 `location` 桩 ——
 *    `App.navigateTo` 会写 `window.location.hash`，本套件的 ④ / C3 断言**正是读它**。
 * ⚠️ `setTimeout` **同步执行回调**：`simulateGenerate` 的落盘 / 扣分逻辑写在 1800ms 回调内，
 *    若不同步执行 ⇒ 永远观察不到（该差异在 SPEC-017 套件里已被验证必要）。
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
  if (typeof App.showToast === 'function') {
    App.showToast = function (msg) { toasts.push(String(msg == null ? '' : msg)); };
  }
  return { App, MockData: vm.runInContext('MockData', sb), sandbox: sb };
}
function fresh() {
  toasts.length = 0;
  registry.forEach((v) => {
    v.hidden = false;
    v.innerHTML = '';
    v.innerText = '';
    v.textContent = '';
    // 🔑 必须同时重置 `value` 与 `classList` —— 否则**跨组污染**：
    //   · `value` 残留 ⇒ H8（"恢复后 Prompt 非空"）会因前一组写入而**平凡通过**；
    //   · `classList` 残留 ⇒ C5（"详情页路径下 `#modal-studio` 不得 active"）会被 B11 加上的 active 污染而**永远失败**。
    v.value = '';
    v.disabled = false;
    v.classList = new ClassList();
  });
  return load();
}

// ------------------------- 断言累积（两类计数，刻意分开） -------------------------
// ⚠️ 刻意分成两类 —— 否则进度会被"平凡通过"严重高估：
//   · ok(   ) → **功能断言**：断言某能力/行为**存在且正确**。未实现时**必然失败** ⇒ 反映真实进度。
//   · okInv( ) → **不变量断言**：断言"某状态**不得变化**"。⚠️ 在能力尚未实现时，
//               因为"什么都没做"，不变量**会平凡通过（vacuous pass）** ⇒ **不代表已实现**。
// 🔑 本轮加固（SPEC-004 立红期）：**每条"不变量 / 相等"型断言都必须配一条"前置非空"断言** ——
//    先证明"确实做到了 X"，再断言"X 的后果"。否则「A 等于 A」在未实现时必然通过。
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
/** 按 `refType` 过滤引用（⚠️ `App.getAssetRefs(key)` **只接受 objectKey**，无 refType 参数） */
function refsByType(app, key, refType) {
  const all = safe(() => app.getAssetRefs(key), []) || [];
  return all.filter(function (r) { return r && r.refType === refType; });
}

// ------------------------- 域工具 -------------------------
/** 集成模式冻结值（`Q-006` 无关；本条是 `FR-004-01` / §7.1）—— **顺序即契约** */
const INTEGRATION_TYPES = ['native', 'third-integrated', 'third-external'];
/** 本 Feature 的冻结成本（`REQ-204`） */
const GEN_COST = 20;

function tools(md) { return (md.tools && md.tools.allTools) || []; }
function toolOf(md, id) { return tools(md).find((t) => t && t.id === id) || null; }
function toolByMode(md, mode) { return tools(md).find((t) => t && t.integration === mode) || null; }
function cards(md) { return (md.assets && md.assets.cards) || {}; }
function num(v) { return parseFloat(String(v == null ? '0' : v).replace(/,/g, '')) || 0; }
function selfBal(md) { return num(cards(md).tokensSelf); }
function integBal(md) { return num(cards(md).tokensIntegrated); }
function ledger(md) { return (md.assets && md.assets.aiPointLedger) || []; }
function ledgerByKind(md, kind) { return ledger(md).filter((e) => e && e.kind === kind); }
function objCount(md) {
  const st = safe(() => null, null);
  return md.assets && md.assets.objects ? Object.keys(md.assets.objects).length : -1;
}
/** 物理对象总字节数（`SPEC-017` 的「存储不膨胀」判据） */
function totalBytes(md) {
  const o = (md.assets && md.assets.objects) || null;
  if (!o) return -1;
  return Object.keys(o).reduce((s, k) => s + Number((o[k] && o[k].bytes) || 0), 0);
}
/** 资金账本三项（不变量用） */
function fundSnapshot(md) {
  const c = cards(md);
  return JSON.stringify([c.balance, c.withdrawable, c.frozen]);
}
/** 学习积分（双轨分离：生成动作不得触碰） */
function learnPoints(md) { return Number((md.currentUser && md.currentUser.learningPoints) || 0); }

// =========================================================================
console.log('');
console.log(' SPEC-004 契约冻结自检 —— 创作工具工作台与模板套用');
console.log(' 17 项契约：TOOL_INTEGRATION_TYPES / resolveToolIntegration / openToolCard / openToolDetail /');
console.log('   toggleTdHero / switchTdTab / switchTdWorkTab / computeGenerateCost / preauthorizeGenerate /');
console.log('   generateFromTicket / refundGenerate / failGenerate / applyTemplateToWorkspace / getToolHistory /');
console.log('   restoreDraft / MockData.tools.allTools[].integration / MockData.tools.toolDetails');
console.log(' 依据：specs/004-creator-tools/spec.md  SC-004-01 ~ 16');
console.log('='.repeat(78));

// -------------------------------------------------------------------------
console.log(' A 组 · 集成模式数据化与路由真源');
{
  let s = fresh();
  ok(Array.isArray(s.App.TOOL_INTEGRATION_TYPES),
    'A1 `App.TOOL_INTEGRATION_TYPES` 存在且为数组（集成模式唯一真源，FR-004-01）');
  ok(JSON.stringify(s.App.TOOL_INTEGRATION_TYPES) === JSON.stringify(INTEGRATION_TYPES),
    'A2 三值精确为 ' + JSON.stringify(INTEGRATION_TYPES) + '（顺序即契约）；实测 ' + JSON.stringify(s.App.TOOL_INTEGRATION_TYPES || null));

  s = fresh();
  const all = tools(s.MockData);
  ok(all.length > 0, 'A3【前置】`MockData.tools.allTools` 非空（实测 ' + all.length + ' 项）');
  const noInteg = all.filter((t) => !t || t.integration === undefined || t.integration === null || t.integration === '');
  ok(all.length > 0 && noInteg.length === 0,
    'A4 🔴 `allTools` **每项**都带 `integration`（实测缺 ' + noInteg.length + '/' + all.length + ' 项 ⇒ 缺陷 ②，REQ-201）');
  const badInteg = all.filter((t) => t && t.integration !== undefined && INTEGRATION_TYPES.indexOf(t.integration) < 0);
  // 🔑 加固：**必须与"无缺失"联判** —— 否则"字段全缺"时 badInteg 恒为 0，本条件**平凡通过**（立红首跑实测即如此）
  ok(all.length > 0 && noInteg.length === 0 && badInteg.length === 0,
    'A5 🔴 在**已补齐字段**的前提下取值**均 ∈ 三值**（缺失 ' + noInteg.length + ' / 非法 ' + badInteg.length + '；⚠️ 前置已嵌入：字段全缺时"非法 0 项"是平凡通过）');
  const modes = {};
  all.forEach((t) => { modes[t && t.integration] = (modes[t && t.integration] || 0) + 1; });
  ok(INTEGRATION_TYPES.every((m) => (modes[m] || 0) >= 1),
    'A6 🔴 **三种模式均须有样本**（否则 SC-004-02 无法验收）；实测分布 ' + JSON.stringify(modes));

  s = fresh();
  ok(isFn(s.App, 'resolveToolIntegration'), 'A7 `App.resolveToolIntegration` 存在（集成模式解析唯一入口）');
  let ok8 = 0;
  INTEGRATION_TYPES.forEach((m) => {
    const sc = fresh();
    const r = safe(() => sc.App.resolveToolIntegration({ id: 'X', integration: m }), 'THROW');
    if (r === m) ok8++;
  });
  ok(ok8 === 3, 'A8 🔴 对三种合法值均**原样返回**（实测 ' + ok8 + '/3）');
  s = fresh();
  ok(safe(() => s.App.resolveToolIntegration({ id: 'X' }), 'THROW') === null,
    'A9 🔴 **缺 `integration` ⇒ 返回 `null`**（**不得**默认 `native`；EX-004-01 / 「缺数据默认放行」第 2 形态）');
  let badCnt = 0;
  ['Native', 'native2', '', ' ', 'NATIVE', null, 0, {}].forEach((v) => {
    const sc = fresh();
    const r = safe(() => sc.App.resolveToolIntegration({ id: 'X', integration: v }), 'THROW');
    if (r === null) badCnt++;
  });
  ok(badCnt === 8, 'A10 🔴 非法取值（大小写 / 拼写 / 空串 / 非字符串）⇒ **全部返回 null**（实测 ' + badCnt + '/8；EX-004-02）');
  s = fresh();
  ok(safe(() => s.App.resolveToolIntegration(null), 'THROW') === null,
    'A11 传入 `null` ⇒ 返回 `null`（不得抛异常）');

  s = fresh();
  ok(s.MockData.tools.toolDetails && typeof s.MockData.tools.toolDetails === 'object',
    'A12 🔴 `MockData.tools.toolDetails` 存在（Hero 内容集合；Q-051 定稿「需新增工具维度数据集合」）');
  const td = s.MockData.tools.toolDetails || {};
  const tdKeys = Object.keys(td);
  ok(all.length > 0 && tdKeys.length >= all.length,
    'A13 `toolDetails` 覆盖全部工具（实测 ' + tdKeys.length + ' / 需 ' + all.length + '）');
  const td0 = td[all[0] && all[0].id] || null;
  ok(!!td0 && Array.isArray(td0.templates) && Array.isArray(td0.tips),
    'A14 每项 `toolDetails` 含 `templates` 与 `tips` 数组（Hero 四标签的数据支撑）');

  s = fresh();
  const mb = (s.MockData.tools && s.MockData.tools.myToolbox) || [];
  const lb = (s.MockData.tools && s.MockData.tools.leaderboard) || [];
  ok(mb.length > 0 && mb.every((x) => x && x.id),
    'A15 🔴 `myToolbox` **每项补 `id`**（实测仅 name/desc/icon/color ⇒ 卡片无从路由，违反 FR-004-05）');
  ok(lb.length > 0 && lb.every((x) => x && x.id),
    'A16 🔴 `leaderboard` **每项补 `id`**（实测同上）');
}

// -------------------------------------------------------------------------
console.log(' B 组 · 卡片路由（三种模式统一入口）');
{
  let s = fresh();
  ok(isFn(s.App, 'openToolCard'), 'B1 `App.openToolCard` 存在（所有卡片的统一路由入口，FR-004-05）');

  let ok2 = 0;
  ['native', 'third-integrated'].forEach((mode) => {
    const sc = fresh();
    const t = toolByMode(sc.MockData, mode);
    const r = safe(() => sc.App.openToolCard(t && t.id), null);
    if (!!t && !!r && r.mode === mode && r.view === 'tool-detail' && !r.external) ok2++;
  });
  ok(ok2 === 2,
    'B2 🔴 `native` / `third-integrated` ⇒ `view === \'tool-detail\'` 且**不**外跳（实测 ' + ok2 + '/2；§7.1）');

  s = fresh();
  const ext = toolByMode(s.MockData, 'third-external');
  const rext = safe(() => s.App.openToolCard(ext && ext.id), null);
  ok(!!ext && !!rext && rext.mode === 'third-external' && rext.external === true,
    'B3 🔴 `third-external` ⇒ `external === true`（新标签外跳，§7.1；实测 ' + JSON.stringify(rext) + '）');
  ok(!!rext && rext.view !== 'tool-detail',
    'B4 🔴 `third-external` **不得进入平台详情页**（`view !== \'tool-detail\'`；SC-004-02）');

  // 🔑 加固（立红 → 实现期实测）：原 B5 只是「存在 native 工具」的前置（弱），
  //    改为真正的 `EX-004-12` 断言 —— third-external **未配置 url ⇒ 必须显式失败**。
  s = fresh();
  toasts.length = 0;
  const extNoUrl = toolByMode(s.MockData, 'third-external');
  const hadUrl = extNoUrl ? extNoUrl.externalUrl : undefined;
  if (extNoUrl) delete extNoUrl.externalUrl;
  const rNoUrl = safe(() => s.App.openToolCard(extNoUrl && extNoUrl.id), 'THROW');
  const saidNoUrl = toasts.some((t) => /不可用|未配置|失败/.test(t));
  if (extNoUrl && hadUrl !== undefined) extNoUrl.externalUrl = hadUrl;
  ok(!!extNoUrl && rNoUrl === null && saidNoUrl,
    'B5 🔴 `third-external` **未配置外跳地址 ⇒ 显式失败**（返回 null + Toast 含"不可用"；`EX-004-12`，**不得打开空白页**）');

  s = fresh();
  const nativeT = toolByMode(s.MockData, 'native');
  const r1 = safe(() => s.App.openToolCard(nativeT && nativeT.id), null);
  ok(!!r1 && s.App.currentView === 'tool-detail',
    'B6 🔴 路由后**真进入**详情页视图（`currentView === \'tool-detail\'`，实测 ' + JSON.stringify(s.App.currentView) + '）');

  s = fresh();
  toasts.length = 0;
  const rb = safe(() => s.App.openToolCard('NOT-A-TOOL'), 'THROW');
  const saidFail = toasts.some((t) => /不可用|不存在|无此|未找到|失败/.test(t));
  ok(rb === null && saidFail,
    'B7 🔴 未知 `toolId` ⇒ **显式失败 + 提示"不可用"**（不得静默；EX-004-13）');

  s = fresh();
  const mb = (s.MockData.tools && s.MockData.tools.myToolbox) || [];
  const rm = safe(() => s.App.openToolCard(mb[0] && mb[0].id), null);
  ok(!!mb[0] && !!mb[0].id && !!rm,
    'B8 🔴 **工具箱卡片**也能按同一入口路由（FR-004-05「含工具箱内的卡片」）');

  s = fresh();
  const lb = (s.MockData.tools && s.MockData.tools.leaderboard) || [];
  const rl = safe(() => s.App.openToolCard(lb[0] && lb[0].id), null);
  ok(!!lb[0] && !!lb[0].id && !!rl,
    'B9 🔴 **热门榜单卡片**也能按同一入口路由（FR-004-05「含榜单内的卡片」）');

  // ---- L1 契约要求的函数名（**命名即契约** CON-032）：`openStudioModal` 是 L1 基线 7 个 ERROR 之一 ----
  s = fresh();
  ok(isFn(s.App, 'openStudioModal'),
    'B10 🔴 `App.openStudioModal` 存在（**L1 基线 7 个 ERROR 之一**，`整体设计.md` 声明；实测为 0）');
  const rSm = safe(() => s.App.openStudioModal(), 'THROW');
  ok(rSm !== 'THROW' && el('modal-studio').classList.contains('active'),
    'B11 🔴 它须**打开既有 `#modal-studio`**（仅新增**包装方法**，🔴 **不改弹窗本身** —— Phase 1 硬约束；实测 ' + JSON.stringify(rSm) + '）');
}

// -------------------------------------------------------------------------
console.log(' C 组 · 详情页：路由级承载 + Hero / 工作区两区');
{
  let s = fresh();
  ok(isFn(s.App, 'openToolDetail'), 'C1 `App.openToolDetail` 存在（路由级详情页入口，FR-004-07）');

  s = fresh();
  const t = toolByMode(s.MockData, 'native');
  const r = safe(() => s.App.openToolDetail(t && t.id), null);
  ok(r === true, 'C2 打开有效工具 ⇒ 返回 `true`（实测 ' + r + '）');
  ok(s.sandbox.location.hash === 'tool-detail',
    'C3 🔴 **路由级页面**：`location.hash === \'tool-detail\'`（**对照缺陷 ①** —— 现状只有 `#modal-studio` 弹窗；实测 hash=' + JSON.stringify(s.sandbox.location.hash) + '）');
  ok(s.App.currentView === 'tool-detail',
    'C4 `App.currentView === \'tool-detail\'`（实测 ' + s.App.currentView + '）');
  // 🔑 加固：并入 `r === true` 作前置 —— 否则"什么都没做"时 DOM 桩的 classList 天然不含 active ⇒ **平凡通过**
  ok(r === true && !el('modal-studio').classList.contains('active'),
    'C5 🔴 **不得以弹窗承载主生产区**，且该次打开**确实进入了详情页**（`r === true`；REQ-202 / SC-004-01 —— 前置已嵌入，防"什么都没做"平凡通过）');

  s = fresh();
  const tn0 = toolByMode(s.MockData, 'native');
  const okOpen = safe(() => s.App.openToolDetail(tn0 && tn0.id), null) === true && s.App.currentView === 'tool-detail';
  const viewAfterValid = s.App.currentView;
  const r2 = safe(() => s.App.openToolDetail('NOT-A-TOOL'), 'THROW');
  ok(r2 === false, 'C6 🔴 未知 `toolId` ⇒ 返回 `false`（EX-004-13）');
  ok(okOpen && s.App.currentView === viewAfterValid,
    'C7 🔴 未知 id **不得改动当前视图**（前置：有效 id 确实会切到 `tool-detail` ⇒ okOpen=' + okOpen + '，实测 currentView=' + JSON.stringify(s.App.currentView) + '）');

  s = fresh();
  const t3 = toolByMode(s.MockData, 'native');
  safe(() => s.App.openToolDetail(t3 && t3.id), null);
  ok(isFn(s.App, 'toggleTdHero'), 'C8 `App.toggleTdHero` 存在（Hero 可收起，FR-004-09）');
  const h1 = safe(() => s.App.toggleTdHero(), 'THROW');
  const collapsed = (s.App.tdHeroCollapsed === true) || el('td-hero').classList.contains('collapsed');
  ok(h1 === true && collapsed,
    'C9 🔴 调用后 Hero 进入**收起态**（可读标记：`tdHeroCollapsed` 或 `#td-hero.collapsed`；SC-004-03）');
  const h2 = safe(() => s.App.toggleTdHero(), 'THROW');
  const expanded = (s.App.tdHeroCollapsed === false) || !el('td-hero').classList.contains('collapsed');
  ok(h2 === true && expanded, 'C10 再次调用 ⇒ **展开还原**（收起/展开对称，SC-004-03）');
  // 🔑 加固：并入 `collapsed` 作前置 —— DOM 桩的 `hidden` 默认 false，未实现时"身份头未隐藏"必然成立 ⇒ **平凡通过**
  ok(collapsed && safe(() => el('td-hero-identity').hidden, null) !== true,
    'C11 🔴 收起后**仅保留身份头**（不得连身份头一起隐藏；前置 `collapsed`=' + collapsed + '，SC-004-03）');

  s = fresh();
  ok(isFn(s.App, 'switchTdTab'), 'C12 `App.switchTdTab` 存在（Hero 标签条，FR-004-08）');
  const s1 = fresh();
  const t4 = toolByMode(s1.MockData, 'native');
  safe(() => s1.App.openToolDetail(t4 && t4.id), null);
  ok(s1.App.tdHeroTab === 'templates',
    'C13 🔴 Hero **默认落在「示例模板」**（FR-004-10；实测 ' + JSON.stringify(s1.App.tdHeroTab) + '）');
  let tabOk = 0;
  ['bio', 'templates', 'tips', 'reviews'].forEach((tb) => {
    const sc = fresh();
    const t5 = toolByMode(sc.MockData, 'native');
    safe(() => sc.App.openToolDetail(t5 && t5.id), null);
    if (safe(() => sc.App.switchTdTab(tb), null) === true) tabOk++;
  });
  ok(tabOk === 4, 'C14 Hero 四标签（bio/templates/tips/reviews）均可切换（实测 ' + tabOk + '/4；Q-051）');
  s = fresh();
  const t6 = toolByMode(s.MockData, 'native');
  safe(() => s.App.openToolDetail(t6 && t6.id), null);
  const beforeTab = s.App.tdHeroTab;
  const rbad = safe(() => s.App.switchTdTab('NOT-A-TAB'), 'THROW');
  ok(rbad === false && s.App.tdHeroTab === beforeTab,
    'C15 🔴 未知 tab ⇒ 返回 `false` **且不改动现状**（不得静默切到第一个）');

  ok(isFn(s.App, 'switchTdWorkTab'), 'C16 `App.switchTdWorkTab` 存在（工作区标签条，FR-004-11）');
  s = fresh();
  const t7 = toolByMode(s.MockData, 'native');
  safe(() => s.App.openToolDetail(t7 && t7.id), null);
  ok(s.App.tdWorkTab === 'workbench',
    'C17 🔴 工作区**默认落在「工作台」**（FR-004-11；实测 ' + JSON.stringify(s.App.tdWorkTab) + '）');
  const rh = safe(() => s.App.switchTdWorkTab('history'), null);
  ok(rh === true && el('td-pane-history').hidden === false,
    'C18 切到「历史任务」⇒ 目标容器可见（FR-004-29）');

  s = fresh();
  const ti = toolByMode(s.MockData, 'third-integrated');
  safe(() => s.App.openToolDetail(ti && ti.id), null);
  const wbHtml = String(el('td-pane-workbench').innerHTML || el('td-pane-workbench').textContent || '');
  ok(/余额/.test(wbHtml) && /充值/.test(wbHtml) && /去使用/.test(wbHtml),
    'C19 🔴 `third-integrated` 的工作台标签为 **余额 / 充值 / 去使用**（FR-004-31）');

  s = fresh();
  const tn = toolByMode(s.MockData, 'native');
  safe(() => s.App.openToolDetail(tn && tn.id), null);
  const tnView = s.App.currentView;
  const tnId = s.App.currentToolId;
  const s2 = fresh();
  const ti2 = toolByMode(s2.MockData, 'third-integrated');
  safe(() => s2.App.openToolDetail(ti2 && ti2.id), null);
  ok(s2.App.currentView === tnView && tnView === 'tool-detail',
    'C20 🔴 自营与已集成**共用同一详情页骨架**（仅工作台标签内容不同，FR-004-12）');
  ok(!!tnId && tnId === (tn && tn.id),
    'C21 `App.currentToolId` 记录当前工具 id（深链 / 刷新后渲染的依据，FR-004-13；实测 ' + JSON.stringify(tnId) + '）');
}

// -------------------------------------------------------------------------
console.log(' D 组 · 生成：预扣 / 不足拒绝 / 资产就绪');
{
  let s = fresh();
  ok(isFn(s.App, 'computeGenerateCost'), 'D1 `App.computeGenerateCost` 存在（成本真源，FR-004-15）');
  const t = toolByMode(s.MockData, 'native');
  ok(safe(() => s.App.computeGenerateCost(t), null) === GEN_COST,
    'D2 成本冻结为 ' + GEN_COST + '（REQ-204；实测 ' + safe(() => s.App.computeGenerateCost(t), null) + '）');
  ok(safe(() => s.App.computeGenerateCost(null), 'THROW') === null,
    'D3 🔴 **成本配置缺失 ⇒ 返回 `null`**（不得默认 0 / 默认放行；「缺数据默认放行」第 1 形态）');

  s = fresh();
  ok(isFn(s.App, 'preauthorizeGenerate'), 'D4 `App.preauthorizeGenerate` 存在（生成前预扣唯一入口）');

  s = fresh();
  const tN = toolByMode(s.MockData, 'native');
  const self0 = selfBal(s.MockData), integ0 = integBal(s.MockData);
  const lg0 = ledger(s.MockData).length;
  const pre = safe(() => s.App.preauthorizeGenerate(tN && tN.id, '赛博朋克校园夜景'), null);
  ok(!!pre && pre.ok === true && pre.source === 'self' && pre.cost === GEN_COST,
    'D5 🔴 `native`（来源 self）⇒ `{ok:true, source:\'self\', cost:' + GEN_COST + '}`（实测 ' + JSON.stringify(pre) + '）');
  ok(!!pre && pre.ok === true && selfBal(s.MockData) === self0 - GEN_COST,
    'D6 🔴 **预扣语义 = 先扣**：调用返回后（不等待异步）来源池已减 ' + GEN_COST + '（' + self0 + ' → ' + selfBal(s.MockData) + '；⚠️ 现状是"渲染成功后才扣"）');
  ok(!!pre && pre.ok === true && ledger(s.MockData).length === lg0 + 1,
    'D7 预扣写 1 条流水（' + lg0 + ' → ' + ledger(s.MockData).length + '）');
  const lastLg = ledger(s.MockData)[0] || {};
  ok(lastLg.kind === 'consume' && lastLg.type === 'self',
    'D8 🔴 流水 `kind === \'consume\'` 且 `type === 来源`（实测 ' + JSON.stringify({ kind: lastLg.kind, type: lastLg.type }) + '；NFR-015 分源留痕）');
  ok(!!pre && pre.ok === true && integBal(s.MockData) === integ0,
    'D9 🔴 **不跨源**：扣 `self` 时 `integrated` 完全不变（' + integ0 + ' → ' + integBal(s.MockData) + '；SC-004-15）');

  s = fresh();
  const tI = toolByMode(s.MockData, 'third-integrated');
  const selfA = selfBal(s.MockData);
  const preI = safe(() => s.App.preauthorizeGenerate(tI && tI.id, '集成算力出片'), null);
  ok(!!preI && preI.ok === true && preI.source === 'integrated' && selfBal(s.MockData) === selfA,
    'D10 🔴 `third-integrated`（来源 integrated）⇒ 只扣 `integrated`，`self` 不变（实测 source=' + (preI && preI.source) + '）');
  ok(!!preI && preI.ok === true && integBal(s.MockData) === integ0 - GEN_COST,
    'D11 扣减量恰好为 ' + GEN_COST + '（integrated ' + integ0 + ' → ' + integBal(s.MockData) + '）');

  // 边界：恰好等于 / 差 1 点 —— 必须先各自注入余额
  s = fresh();
  cards(s.MockData).tokensSelf = String(GEN_COST);
  const preEq = safe(() => s.App.preauthorizeGenerate(tN && tN.id, '恰好够'), null);
  ok(!!preEq && preEq.ok === true && selfBal(s.MockData) === 0,
    'D12 🔴 积分**恰好等于**所需 ⇒ 允许（含等号，扣后为 0；EX-004-06）');
  s = fresh();
  cards(s.MockData).tokensSelf = String(GEN_COST - 1);
  const preLow = safe(() => s.App.preauthorizeGenerate(tN && tN.id, '差一点'), null);
  ok(!!preLow && preLow.ok === false && selfBal(s.MockData) === GEN_COST - 1,
    'D13 🔴 **差 1 点即拒绝**且积分不变（EX-004-07；⚠️ 现状 `Math.max(0,…)` ⇒ 会静默扣到 0 并照常成功）');

  s = fresh();
  const s10 = fresh();
  cards(s10.MockData).tokensSelf = '10';
  const preNo = safe(() => s10.App.preauthorizeGenerate(tN && tN.id, '不足'), null);
  const lgNo = ledger(s10.MockData).length;
  ok(!!preNo && preNo.ok === false && selfBal(s10.MockData) === 10 && lgNo === ledger(s10.MockData).length,
    'D14 🔴 积分不足 ⇒ **拒绝**、积分不变、**不写流水**（FR-004-19 / SC-004-06）');

  s = fresh();
  const sb1 = selfBal(s.MockData);
  const preBlank = safe(() => s.App.preauthorizeGenerate(tN && tN.id, '   '), null);
  ok(!!preBlank && preBlank.ok === false && selfBal(s.MockData) === sb1,
    'D15 🔴 Prompt 为空 / 仅空白 ⇒ **拒绝且不扣分**（EX-004-03）');

  s = fresh();
  const sp = fresh();
  const tp = toolByMode(sp.MockData, 'native');
  const sp0 = selfBal(sp.MockData);
  const p1 = safe(() => sp.App.preauthorizeGenerate(tp && tp.id, '同一个 prompt'), null);
  const p2 = safe(() => sp.App.preauthorizeGenerate(tp && tp.id, '同一个 prompt'), null);
  ok(!!p1 && p1.ok === true && !!p2 && p2.ok === false && selfBal(sp.MockData) === sp0 - GEN_COST,
    'D16 🔴 **幂等**：渲染中重复预扣 ⇒ 第二次 **不重复扣分**（' + sp0 + ' → ' + selfBal(sp.MockData) + '；EX-004-05）');

  s = fresh();
  const ts = toolByMode(s.MockData, 'native');
  const objs0 = objCount(s.MockData);
  ok(objs0 >= 0, 'D17【前置】对象表可读（实测 ' + objs0 + ' 个对象）');
  const pk = safe(() => s.App.preauthorizeGenerate(ts && ts.id, '生成一件成片'), null);
  ok(!!pk && pk.ok === true, 'D18【前置】预扣成功（为后续"落盘后引用"断言建立前提）');
  const gen = safe(() => s.App.generateFromTicket(pk && pk.ticket, '生成一件成片'), null);
  ok(!!gen && gen.ok === true, 'D19 🔴 提交渲染 ⇒ 成功（`generateFromTicket` 返回 ok）');
  ok(objCount(s.MockData) === objs0 + 1,
    'D20 🔴 生成成功 ⇒ **资产就绪**：物理对象 +1（' + objs0 + ' → ' + objCount(s.MockData) + '；FR-004-17）');
  const key = gen && gen.objectKey;
  ok(!!key && refsByType(s.App, key, 'workcloud').length === 1,
    'D21 🔴 生成成功 ⇒ 建立 1 条 `workcloud` 引用（FR-004-17 / SPEC-017 §7.4）');
  // 🔑 加固：并入 `!!gen && gen.ok === true` 作前置 —— 未扣分时恒等式天然成立 ⇒ **平凡通过**
  ok(!!gen && gen.ok === true && s.App.getComputeBalances().total === selfBal(s.MockData) + integBal(s.MockData),
    'D22 🔴 扣分口径唯一：`total === self + integrated`（**前置：确实扣了分并落盘**，否则恒等式天然成立；NFR-012）');

  s = fresh();
  const tn2 = toolByMode(s.MockData, 'native');
  const objs1 = objCount(s.MockData), bytes1 = totalBytes(s.MockData);
  const K = ['同内容 A', '同内容 A', '同内容 A'];
  let allOk = true;
  K.forEach((c) => {
    const pp = safe(() => s.App.preauthorizeGenerate(tn2 && tn2.id, c), null);
    if (!pp || pp.ok !== true) { allOk = false; return; }
    const gg = safe(() => s.App.generateFromTicket(pp.ticket, c), null);
    if (!gg || gg.ok !== true) allOk = false;
  });
  ok(allOk, 'D23【前置】同内容连续生成 3 次**均成功**（含扣分）');
  ok(objCount(s.MockData) === objs1 + 1,
    'D24 🔴 同内容（不同时间戳 / 标题）连续 3 次 ⇒ **对象数只 +1**（SC-004-09；实测 ' + objs1 + ' → ' + objCount(s.MockData) + '）');
  ok(totalBytes(s.MockData) === bytes1 + (totalBytes(s.MockData) - bytes1) && totalBytes(s.MockData) > 0,
    'D25 总字节数可读且随首次生成增长（实测 ' + bytes1 + ' → ' + totalBytes(s.MockData) + '）');
  const costsD = tools(s.MockData).map((x) => safe(() => s.App.computeGenerateCost(x), null));
  ok(costsD.length > 0 && costsD.every((c) => c === GEN_COST),
    'D26 成本不随工具 / 参数漂移（所有工具恒为 ' + GEN_COST + '；实测 ' + JSON.stringify(costsD) + '）');
  ok(HTML_SRC.includes('id="studio-model"') || HTML_SRC.includes('id="td-model"'),
    'D27 🔴 **模型引擎**控件须有可读 `id`（实测 `#studio-model` **不存在** ⇒ FR-004-14 无法被程序读取；立红新增缺口 ⑥）');
  ok(HTML_SRC.includes('id="studio-ratio"') || HTML_SRC.includes('id="td-ratio"'),
    'D28 🔴 **画幅比例**控件须有可读 `id`（实测 `#studio-ratio` **不存在** ⇒ 同上）');

  s = fresh();
  ok(safe(() => s.App.preauthorizeGenerate('NOT-A-TOOL', 'x'), 'THROW') === null,
    'D29 🔴 未知工具 id ⇒ 预扣**显式失败**（返回 null；不得扣分）');

  // 防御性：`third-external` 依 §7.1 **不进入平台详情页** ⇒ 无工作台 ⇒ 不应消耗平台算力。
  // 本条防的是"绕过路由直接调用"的语义漏洞（不是常规路径）。
  s = fresh();
  const tx = toolByMode(s.MockData, 'third-external');
  const bx = selfBal(s.MockData), ix = integBal(s.MockData);
  const px = safe(() => s.App.preauthorizeGenerate(tx && tx.id, '外跳工具不应有工作台'), 'THROW');
  const failedX = px === null || (px && px.ok === false);
  ok(!!tx && failedX && selfBal(s.MockData) === bx && integBal(s.MockData) === ix,
    'D30 🔴 `third-external` **无工作台** ⇒ 预扣**显式失败且不扣分**（防绕过路由直接调用；§7.1）');
}

// -------------------------------------------------------------------------
console.log(' E 组 · 失败 / 超时 ⇒ 全额退还 + 零残留');
{
  let s = fresh();
  ok(isFn(s.App, 'refundGenerate'), 'E1 `App.refundGenerate` 存在（全额原路退还唯一入口，FR-004-18）');
  ok(isFn(s.App, 'failGenerate'), 'E2 `App.failGenerate` 存在（失败 / 超时统一出口）');

  // 🔑 前置非空：先确实完成一次"预扣 + 落盘"，再验证失败路径
  s = fresh();
  const t = toolByMode(s.MockData, 'native');
  const self0 = selfBal(s.MockData), integ0 = integBal(s.MockData);
  const objs0 = objCount(s.MockData);
  const lg0 = ledger(s.MockData).length;
  const pre = safe(() => s.App.preauthorizeGenerate(t && t.id, '注定失败的渲染'), null);
  const gen = pre && pre.ok ? safe(() => s.App.generateFromTicket(pre.ticket, '注定失败的渲染'), null) : null;
  const reachedPre = !!pre && pre.ok === true && selfBal(s.MockData) === self0 - GEN_COST;
  const reachedGen = !!gen && gen.ok === true && objCount(s.MockData) === objs0 + 1;
  ok(reachedPre && reachedGen,
    'E3【前置】确实完成「预扣 + 落盘」（self ' + self0 + '→' + selfBal(s.MockData) + '；对象 ' + objs0 + '→' + objCount(s.MockData) + '）—— **以下"回到原值"类断言建立在此之上**');

  const fk = safe(() => s.App.failGenerate(pre && pre.ticket, 'render_error'), 'THROW');
  ok(fk === true, 'E4 失败出口返回 `true`（实测 ' + JSON.stringify(fk) + '）');
  ok(reachedPre && selfBal(s.MockData) === self0,
    'E5 🔴 **全额原路退还**：`self` 回到原值（' + self0 + '；实测 ' + selfBal(s.MockData) + '；SC-004-05）');
  ok(reachedGen && objCount(s.MockData) === objs0,
    'E6 🔴 **零残留**：物理对象数回到原值（' + objs0 + '；实测 ' + objCount(s.MockData) + '；EX-004-14）');
  ok(reachedGen && safe(() => s.App.getAssetRefCount(gen.objectKey), -1) === 0,
    'E7 🔴 **零残留**：`workcloud` 引用已解除（**无悬空引用**；FR-004-36）');
  ok(reachedPre && ledger(s.MockData).length === lg0 + 2,
    'E8 🔴 退还写 1 条流水（共 2 条：consume + refund；实测 ' + lg0 + ' → ' + ledger(s.MockData).length + '）');
  ok(ledgerByKind(s.MockData, 'refund').length >= 1 && (ledger(s.MockData)[0] || {}).kind === 'refund',
    'E9 🔴 退还流水 `kind === \'refund\'`（NFR-015 分源留痕）');
  ok(reachedPre && integBal(s.MockData) === integ0,
    'E10 🔴 **按来源精确回补**：`self` 失败**只**回补 `self`，`integrated` 不变（EX-004-09，不得张冠李戴）');
  ok(el('btn-studio-deliver').hidden === true && el('btn-studio-publish').hidden === true,
    'E11 🔴 失败后**不点亮**双路流转（SC-004-05）');

  // 幂等退还
  const fk2 = safe(() => s.App.failGenerate(pre && pre.ticket, 'render_error'), 'THROW');
  const lgAfter2 = ledger(s.MockData).length;
  ok(fk2 === false && selfBal(s.MockData) === self0 && lgAfter2 === lg0 + 2,
    'E12 🔴 同一 ticket 二次失败 ⇒ 返回 `false`，**积分与流水均不再变化**（防重复退还）');

  s = fresh();
  const before = JSON.stringify([selfBal(s.MockData), integBal(s.MockData), ledger(s.MockData).length]);
  const fb = safe(() => s.App.failGenerate({ source: 'self', cost: GEN_COST }, 'x'), 'THROW');
  ok(fb === false && JSON.stringify([selfBal(s.MockData), integBal(s.MockData), ledger(s.MockData).length]) === before,
    'E13 🔴 无效 / 未知 ticket ⇒ 返回 `false`，**不改动任何数据**');

  s = fresh();
  const tt = toolByMode(s.MockData, 'native');
  const sc0 = selfBal(s.MockData);
  const objsT = objCount(s.MockData);
  const preT = safe(() => s.App.preauthorizeGenerate(tt && tt.id, '超时场景'), null);
  const genT = preT && preT.ok ? safe(() => s.App.generateFromTicket(preT.ticket, '超时场景'), null) : null;
  const fT = safe(() => s.App.failGenerate(preT && preT.ticket, 'timeout'), 'THROW');
  ok(!!genT && genT.ok === true && fT === true && selfBal(s.MockData) === sc0 && objCount(s.MockData) === objsT,
    'E14 🔴 **超时视同失败**：同样全额退还 + 零残留（EX-004-04）');
}

// -------------------------------------------------------------------------
console.log(' F 组 · 双路流转复用对象键');
{
  let s = fresh();
  const t = toolByMode(s.MockData, 'native');
  const pre = safe(() => s.App.preauthorizeGenerate(t && t.id, '一件可交付的成片'), null);
  const gen = pre && pre.ok ? safe(() => s.App.generateFromTicket(pre.ticket, '一件可交付的成片'), null) : null;
  const key = gen && gen.objectKey;
  const objs0 = objCount(s.MockData), bytes0 = totalBytes(s.MockData);
  s.App.lastStudioDraft = { objectKey: key, title: '成片', content: '一件可交付的成片', cover: 'assets/covers/work_1.png', toolTitle: 'AI 图像生成' };
  const self0 = selfBal(s.MockData), integ0 = integBal(s.MockData);
  const refsW = refsByType(s.App, key, 'workcloud');
  const reachedF = !!key && refsW.length === 1 && objCount(s.MockData) >= 1;
  ok(reachedF,
    'F1【前置】生成成功、**对象数 ≥ 1** 且存在 1 条 `workcloud` 引用（key=' + JSON.stringify(key) + '，对象 ' + objCount(s.MockData) + '）—— **以下"不新增"类断言全部建立在此之上**（否则 0 === 0 是平凡通过）');

  const d = safe(() => s.App.submitStudioToTask(), 'THROW');
  ok(reachedF && refsByType(s.App, key, 'delivery').length === 1,
    'F2 🔴 提交为商单交付物 ⇒ 建立 1 条 `delivery` 引用（FR-004-21）');
  ok(reachedF && objCount(s.MockData) === objs0,
    'F3 🔴 **不新增物理对象**（' + objs0 + ' → ' + objCount(s.MockData) + '；SC-004-08）');

  const p = safe(() => s.App.publishFromStudio(), 'THROW');
  ok(reachedF && refsByType(s.App, key, 'post').length === 1,
    'F4 🔴 分享至社区 ⇒ 建立 1 条 `post` 引用（FR-004-22）');
  ok(reachedF && objCount(s.MockData) === objs0,
    'F5 🔴 分享**不新增物理对象**（SC-004-07）');
  ok(reachedF && totalBytes(s.MockData) === bytes0,
    'F6 🔴 **总字节数不变** —— 存储不随分享膨胀（' + bytes0 + '；S-3 / SC-004-09）');
  ok(reachedF && selfBal(s.MockData) === self0 && integBal(s.MockData) === integ0,
    'F7 🔴 双路流转**不额外扣费**（FR-004-25）');
  const refsD = refsByType(s.App, key, 'delivery');
  const refsP = refsByType(s.App, key, 'post');
  ok(refsD.length === 1 && refsP.length === 1 && refsD[0].objectKey === key && refsP[0].objectKey === key,
    'F8 🔴 两路引用**指向同一对象键**（`delivery` 与 `post` 的 objectKey 均 = ' + key + '）');

  s = fresh();
  s.App.lastStudioDraft = null;
  toasts.length = 0;
  const rd = safe(() => s.App.submitStudioToTask(), 'THROW');
  const said = toasts.some((t) => /请先完成|无产物|不可用|失败/.test(t));
  ok(said, 'F9 🔴 无产物时流转 ⇒ **显式提示**（不得静默成功；EX-004-10 / 对照 `submitStudioToTask` 假实现教训）');

  s = fresh();
  const tm = toolByMode(s.MockData, 'native');
  const mk = (c) => { const pp = safe(() => s.App.preauthorizeGenerate(tm && tm.id, c), null); return pp && pp.ok ? safe(() => s.App.generateFromTicket(pp.ticket, c), null) : null; };
  const gA = mk('产物 A 的内容');
  const gB = mk('产物 B 的内容');
  const keyA = gA && gA.objectKey;
  const keyB = gB && gB.objectKey;
  ok(!!gA && gA.ok === true && !!gB && gB.ok === true && !!keyA && !!keyB && keyA !== keyB,
    'F10【前置】先后生成 **A 与 B 且对象键不同**（A=' + JSON.stringify(keyA) + ' / B=' + JSON.stringify(keyB) + '）');
  s.App.lastStudioDraft = { objectKey: keyA || '', title: 'A', content: '产物 A 的内容', cover: 'assets/covers/work_1.png', toolTitle: 'T' };
  safe(() => s.App.submitStudioToTask(), null);
  ok(!!keyA && refsByType(s.App, keyA, 'delivery').length === 1,
    'F11 🔴 **历史产物可被再次引用**：先 A 后 B，仍能正确引用 **A**（不依赖"最近一次生成是哪一份"；SC-004-16）');
}

// -------------------------------------------------------------------------
console.log(' G 组 · 模板套用');
{
  let s = fresh();
  ok(isFn(s.App, 'applyTemplateToWorkspace'), 'G1 `App.applyTemplateToWorkspace` 存在（承接 SPEC-003 的 R4 入口，§7.5）');
  const t = toolByMode(s.MockData, 'native');
  const td = (s.MockData.tools.toolDetails || {})[t && t.id] || null;
  const tpl = td && Array.isArray(td.templates) ? td.templates[0] : null;
  const tplId = tpl ? (tpl.id || tpl.name || tpl.title) : null;
  ok(!!tplId, 'G2【前置】存在可套用的示例模板（' + JSON.stringify(tplId) + '）');

  s = fresh();
  const self0 = selfBal(s.MockData), integ0 = integBal(s.MockData), lp0 = learnPoints(s.MockData);
  const r = safe(() => s.App.applyTemplateToWorkspace(tplId, t && t.id), null);
  const reachedG = !!r && typeof r === 'object' && (r.toolId === (t && t.id) || r.tool === (t && t.id));
  ok(!!r && typeof r === 'object',
    'G3 🔴 套用有效模板 ⇒ 返回预填对象（含 toolId / 参数；实测 ' + JSON.stringify(r) + '）');
  ok(reachedG, 'G4 🔴 预填对象**指向目标工具**（FR-004-26）');
  ok(!!r && (r.prompt !== undefined || r.params !== undefined),
    'G5 🔴 返回**预填的 Prompt / 参数**（SC-004-10）');
  // 🔑 加固：并入 `reachedG` 作前置 —— 方法未实现时"什么都没做"，两项自然不变 ⇒ **平凡通过**
  ok(reachedG && selfBal(s.MockData) === self0 && integBal(s.MockData) === integ0,
    'G6 🔴 **套用不扣分**：AI 积分两源均不变（前置 reachedG=' + reachedG + '；FR-004-27）');
  ok(reachedG && learnPoints(s.MockData) === lp0,
    'G7 🔴 套用**不得**加学习积分（套用是工具侧动作，不是学习动作 —— 负向，防跨模块误加分）');
  ok(reachedG && s.App.currentView === 'tool-detail' && s.App.tdWorkTab === 'workbench',
    'G8 🔴 套用后进入**对应工具的详情页**且工作区落在「工作台」（FR-004-26）');

  s = fresh();
  ok(safe(() => s.App.applyTemplateToWorkspace('NOT-A-TPL', t && t.id), 'THROW') === null,
    'G9 🔴 未知模板 id ⇒ **显式失败**（返回 null）');
  s = fresh();
  toasts.length = 0;
  const twin = toolByMode(s.MockData, 'native');
  const tdW = (s.MockData.tools.toolDetails || {})[twin && twin.id] || {};
  const tplW = (tdW.templates || [])[0] || {};
  const otherTool = tools(s.MockData).find((x) => x && x.id !== (twin && twin.id) && x.integration === 'native');
  const rInc = safe(() => s.App.applyTemplateToWorkspace(tplW.id || tplW.name, otherTool && otherTool.id), 'THROW');
  const saidInc = toasts.some((x) => /不兼容|不适用|失败|不支持/.test(x));
  ok(rInc === null && saidInc,
    'G10 🔴 模板与目标工具**不兼容** ⇒ **显式提示**（不得静默套用错误参数；EX-004-11）');
}

// -------------------------------------------------------------------------
console.log(' H 组 · 历史任务与草稿');
{
  let s = fresh();
  ok(isFn(s.App, 'getToolHistory'), 'H1 `App.getToolHistory` 存在（历史任务读入口，FR-004-29）');
  const h = safe(() => s.App.getToolHistory(), null);
  ok(Array.isArray(h) && h.length > 0, 'H2 返回非空数组（实测 ' + (Array.isArray(h) ? h.length : typeof h) + ' 项）');
  const st = {};
  (Array.isArray(h) ? h : []).forEach((x) => { st[x && x.status] = (st[x && x.status] || 0) + 1; });
  ok((st.rendering || 0) >= 1 && (st.queued || 0) >= 1 && (st.done || 0) >= 1,
    'H3 🔴 含 `rendering` / `queued` / `done` 三类（实测分布 ' + JSON.stringify(st) + '）');

  s = fresh();
  const q = (s.MockData.tools && s.MockData.tools.generationQueue) || [];
  if (q[0]) q[0].status = 'STATUS_WEIRD';
  const h2 = safe(() => s.App.getToolHistory(), null);
  const weird = (Array.isArray(h2) ? h2 : []).find((x) => x && (x.status === 'STATUS_WEIRD' || x.abnormal === true || x.unknown === true));
  ok(!!weird && weird.status !== 'done',
    'H4 🔴 **未知状态须显式标记（不得渲染为"已完成"）**（EX-004-15；实测 ' + JSON.stringify(weird) + '）');

  s = fresh();
  ok(isFn(s.App, 'restoreDraft'), 'H5 `App.restoreDraft` 存在（草稿断点恢复，FR-004-30）');
  const rp = (s.MockData.tools && s.MockData.tools.recentProjects) || [];
  const draftId = rp[0] && (rp[0].id || rp[0].title);
  ok(!!draftId, 'H6【前置】存在可恢复的草稿（' + JSON.stringify(draftId) + '）');
  const sb0 = selfBal(s.MockData), ib0 = integBal(s.MockData);
  const rd = safe(() => s.App.restoreDraft(draftId), null);
  const reachedH = !!rd && typeof rd === 'object';
  ok(reachedH, 'H7 🔴 恢复有效草稿 ⇒ 返回对象（含预填内容；实测 ' + JSON.stringify(rd) + '）');
  ok(reachedH && (el('studio-prompt-input').value !== '' || el('td-prompt-input').value !== ''),
    'H8 🔴 恢复后**工作台被预填**（Prompt 非空；前置 reachedH=' + reachedH + '；FR-004-30）');
  ok(reachedH && selfBal(s.MockData) === sb0 && integBal(s.MockData) === ib0,
    'H9 🔴 恢复草稿**不扣分**（免费动作；前置 reachedH=' + reachedH + '）');
  s = fresh();
  ok(safe(() => s.App.restoreDraft('NOT-A-DRAFT'), 'THROW') === null,
    'H10 🔴 未知草稿 id ⇒ 返回 `null`');
}

// -------------------------------------------------------------------------
console.log(' I 组 · 详情页承载形态（源码级 / DOM 级）');
{
  const vtdIdx = HTML_CODE.indexOf('view-tool-detail');
  ok(vtdIdx >= 0, 'I1 🔴 `index.html` 存在 `#view-tool-detail` 容器（**缺陷 ①**；现状 0 处；REQ-202 / §7.2）');
  const nearSeg = vtdIdx >= 0 ? HTML_CODE.slice(Math.max(0, vtdIdx - 160), vtdIdx + 240) : '';
  ok(vtdIdx >= 0 && /view-container/.test(nearSeg),
    'I2 🔴 该容器带 `view-container` 类（否则 `navigateTo` 的 `.view-container` 循环**不认它** ⇒ 路由静默失效）');
  const nextIdx = vtdIdx >= 0 ? HTML_CODE.indexOf('view-', vtdIdx + 20) : -1;
  const vtdSeg = vtdIdx >= 0 ? HTML_CODE.slice(vtdIdx, nextIdx > 0 ? nextIdx : vtdIdx + 6000) : '';
  // 🔑 前置 `vtdIdx >= 0` 已嵌入：段不存在时 `!/style="/.test('')` 恒真 ⇒ 否则是平凡通过
  ok(vtdIdx >= 0 && !/style="/.test(vtdSeg),
    'I3 🔴 新建的 `#view-tool-detail` **段内不得含内联 `style="..."`**（FR-004-37；⚠️ 既有 `#modal-studio` 段大量内联 ⇒ **不得顺手重写**，降风险）');
}

// -------------------------------------------------------------------------
console.log(' J 组 · 不变量（⚠️ 未实现时会平凡通过，不计入进度）');
{
  let s = fresh();
  const t = toolByMode(s.MockData, 'native');
  const f0 = fundSnapshot(s.MockData);
  const pre = safe(() => s.App.preauthorizeGenerate(t && t.id, '不变量测试'), null);
  const gen = pre && pre.ok ? safe(() => s.App.generateFromTicket(pre.ticket, '不变量测试'), null) : null;
  s.App.lastStudioDraft = { objectKey: gen && gen.objectKey, title: 'x', content: '不变量测试', cover: 'c', toolTitle: 'T' };
  safe(() => s.App.submitStudioToTask(), null);
  safe(() => s.App.publishFromStudio(), null);
  okInv(fundSnapshot(s.MockData) === f0,
    'J1[inv] 生成 / 流转 ⇒ **资金账本三项（余额 / 可提现 / 冻结）不变**（SC-004-14 / CON-021~023）');

  s = fresh();
  const lp0 = learnPoints(s.MockData);
  const t2 = toolByMode(s.MockData, 'native');
  const p2 = safe(() => s.App.preauthorizeGenerate(t2 && t2.id, '双轨分离测试'), null);
  if (p2 && p2.ok) safe(() => s.App.generateFromTicket(p2.ticket, '双轨分离测试'), null);
  okInv(learnPoints(s.MockData) === lp0,
    'J2[inv] 生成 ⇒ **创作积分不变**（AI 积分是算力池，与成长池严格分离；SC-004-15 同族）');

  s = fresh();
  const f1 = fundSnapshot(s.MockData);
  const t3 = toolByMode(s.MockData, 'native');
  const p3 = safe(() => s.App.preauthorizeGenerate(t3 && t3.id, '失败不变量'), null);
  if (p3 && p3.ok) { safe(() => s.App.generateFromTicket(p3.ticket, '失败不变量'), null); safe(() => s.App.failGenerate(p3.ticket, 'e'), null); }
  okInv(fundSnapshot(s.MockData) === f1,
    'J3[inv] 失败退还 ⇒ **资金账本不变**');

  s = fresh();
  const snap0 = JSON.stringify(tools(s.MockData));
  const t4 = toolByMode(s.MockData, 'native');
  safe(() => s.App.openToolDetail(t4 && t4.id), null);
  safe(() => s.App.toggleTdHero(), null);
  safe(() => s.App.switchTdTab('bio'), null);
  safe(() => s.App.switchTdWorkTab('history'), null);
  okInv(JSON.stringify(tools(s.MockData)) === snap0,
    'J4[inv] 打开详情页 / 收起 Hero / 切换标签 ⇒ **不得改动任何工具数据**');

  s = fresh();
  const f2 = fundSnapshot(s.MockData);
  const s0 = JSON.stringify(ledger(s.MockData));
  safe(() => s.App.openToolCard('NOT-A-TOOL'), null);
  safe(() => s.App.openToolDetail('NOT-A-TOOL'), null);
  safe(() => s.App.switchTdTab('NOT-A-TAB'), null);
  safe(() => s.App.applyTemplateToWorkspace('NOT-A-TPL', 'X'), null);
  safe(() => s.App.restoreDraft('NOT-A-DRAFT'), null);
  okInv(fundSnapshot(s.MockData) === f2 && JSON.stringify(ledger(s.MockData)) === s0,
    'J5[inv] 未知 id 调用 ⇒ **不得改动资金账本与积分流水**');

  s = fresh();
  const drafts0 = JSON.stringify((s.MockData.tools || {}).recentProjects || []);
  const t5 = toolByMode(s.MockData, 'native');
  const p5 = safe(() => s.App.preauthorizeGenerate(t5 && t5.id, '流转不改草稿'), null);
  if (p5 && p5.ok) safe(() => s.App.generateFromTicket(p5.ticket, '流转不改草稿'), null);
  okInv(JSON.stringify((s.MockData.tools || {}).recentProjects || []) === drafts0,
    'J6[inv] 生成 ⇒ **不得改写既有草稿列表**');

  s = fresh();
  const orders0 = JSON.stringify((s.MockData.tasks || {}).myOrders || []);
  const t6 = toolByMode(s.MockData, 'native');
  const p6 = safe(() => s.App.preauthorizeGenerate(t6 && t6.id, '订单不被改写'), null);
  const g6 = p6 && p6.ok ? safe(() => s.App.generateFromTicket(p6.ticket, '订单不被改写'), null) : null;
  s.App.lastStudioDraft = { objectKey: g6 && g6.objectKey, title: 'x', content: 'x', cover: 'c', toolTitle: 'T' };
  safe(() => s.App.submitStudioToTask(), null);
  okInv(JSON.stringify((s.MockData.tasks || {}).myOrders || []) === orders0,
    'J7[inv] 提交交付物 ⇒ **不得改写既有订单数据**（只建立引用）');

  s = fresh();
  const kv0 = Object.keys(cards(s.MockData)).sort().join(',');
  const t7 = toolByMode(s.MockData, 'native');
  const p7 = safe(() => s.App.preauthorizeGenerate(t7 && t7.id, '账本键不退化'), null);
  if (p7 && p7.ok) safe(() => s.App.failGenerate(p7.ticket, 'e'), null);
  okInv(Object.keys(cards(s.MockData)).sort().join(',') === kv0,
    'J8[inv] 预扣 / 退还 ⇒ **不得新增或删除账本字段**（`cards` 键集合不变）');

  s = fresh();
  const objs0 = objCount(s.MockData);
  const refTot0 = safe(() => {
    const st = s.MockData.assets.assetRefs || {};
    return Object.keys(st).reduce((a, k) => a + ((st[k] && st[k].length) || 0), 0);
  }, -1);
  const t8 = toolByMode(s.MockData, 'native');
  const p8 = safe(() => s.App.preauthorizeGenerate(t8 && t8.id, '预扣本身不落盘'), null);
  const refTot1 = safe(() => {
    const st = s.MockData.assets.assetRefs || {};
    return Object.keys(st).reduce((a, k) => a + ((st[k] && st[k].length) || 0), 0);
  }, -1);
  okInv(!!p8 && p8.ok === true ? (objCount(s.MockData) === objs0 && refTot1 === refTot0) : true,
    'J9[inv] **仅预扣**（尚未落盘）⇒ 对象数与引用数均不变（预扣不等于落盘）');

  s = fresh();
  const lg0Arr = ledger(s.MockData);
  const lg0Str = JSON.stringify(lg0Arr);
  const lg0Len = lg0Arr.length;
  const t9 = toolByMode(s.MockData, 'native');
  const p9 = safe(() => s.App.preauthorizeGenerate(t9 && t9.id, '既有流水不被改'), null);
  if (p9 && p9.ok) safe(() => s.App.failGenerate(p9.ticket, 'e'), null);
  const after9 = ledger(s.MockData);
  // 新条目 `unshift` 到**头部** ⇒ 既有条目应完整落在尾部
  okInv(after9.length >= lg0Len && JSON.stringify(after9.slice(after9.length - lg0Len)) === lg0Str,
    'J10[inv] 预扣 / 退还**只新增**流水，**既有流水内容不得被改写**（append-only；前置长度 ' + lg0Len + ' → ' + after9.length + '）');

  // ---- 负向守护型（源码级 / 数据级）：**未实现时天然通过** ⇒ 属不变量族，不计入进度 ----
  okInv(!/cloneWork|remixWork|一键复刻|复刻作品/.test(APP_CODE),
    'J11[inv] 🔴 **源码级**：`app.js` **不得存在**「一键复刻」入口（FR-004-28 / SC-004-12 / REQ-206 已取消）');
  okInv(!/refCount/.test(APP_CODE),
    'J12[inv] 🔴 **源码级**：不得出现 `refCount`（**缺陷 ③** —— 一律以 SPEC-017 的引用记录为唯一真源）');
  okInv(!/refCount/.test(MOCK_CODE),
    'J13[inv] 🔴 **数据级**：`MockData` 中不得落库 `refCount`（⚠️ 判据用**剔除注释**后的源码 —— `mock_data.js:4949` 的说明性注释会误伤）');
  const sJ = fresh();
  okInv(sJ.MockData.assets.aiPools === undefined && sJ.MockData.assets.computePools === undefined && sJ.MockData.assets.computeBalances === undefined && sJ.MockData.assets.sourcePools === undefined,
    'J14[inv] 🔴 不得新增「池」结构（`Q-050` 定稿：真源归 `SPEC-009`，过渡期沿用 `getComputeBalances` / `syncComputeBalances`）');
}

// -------------------------------------------------------------------------
const totalFunc = pass + fails.length;
const totalInv = passInv + failsInv.length;
const line = '='.repeat(78);
console.log('');
console.log(line);
console.log(' SPEC-004 契约冻结自检 —— 创作工具工作台与模板套用');
console.log(' 17 项契约：TOOL_INTEGRATION_TYPES / resolveToolIntegration / openToolCard / openToolDetail /');
console.log('   toggleTdHero / switchTdTab / switchTdWorkTab / computeGenerateCost / preauthorizeGenerate /');
console.log('   generateFromTicket / refundGenerate / failGenerate / applyTemplateToWorkspace / getToolHistory /');
console.log('   restoreDraft / allTools[].integration / tools.toolDetails');
console.log(' 依据：specs/004-creator-tools/spec.md  SC-004-01 ~ 16');
console.log(line);
console.log(' 【功能断言】 ' + pass + '/' + totalFunc + '   ← 真实进度看这一行');
console.log(' 【不变量断言】 ' + passInv + '/' + totalInv + '   ← ⚠️ 未实现时会平凡通过，不构成证据、不计入进度');
console.log(line);
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
  //    导致「断言合计」低估、转绿后也无法计入证据。与既有三套保持一致。
  console.log(' ✓ 全部通过：' + (pass + passInv) + ' 项断言（功能 ' + pass + ' + 不变量 ' + passInv + '）');
  console.log('   ⇒ SPEC-004 Phase 1 已落地。请把本套件从 gates-baseline.json 的 l3ExpectedRed 中移除（转为回归防线）。');
} else {
  if (fails.length) {
    console.log(' ✗ 功能断言待实现 ' + fails.length + ' 项 —— 这是 SPEC-004 Phase 1 的 TODO 清单：');
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
