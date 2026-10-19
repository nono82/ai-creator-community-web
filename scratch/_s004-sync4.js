'use strict';
/** CHG-022 同步第 4 批：change-impact.md（插入 CHG-022）+ CHANGELOG.md（插入条目）。 */
const fs = require('fs');

// ① change-impact.md：按降序插入到 CHG-021 之前
(function () {
  const P = 'project-design/99-ai/change-impact.md';
  const L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
  const i = L.findIndex(function (l) { return /^## CHG-021/.test(l); });
  if (i < 0) { console.log('change-impact：未找到 CHG-021 锚点'); return; }
  let neo = fs.readFileSync('ai-creator-community-wh/scratch/_chg022.md', 'utf8').split(/\r?\n/);
  while (neo.length && neo[neo.length - 1].trim() === '') neo.pop();
  L.splice(i, 0, ...neo);
  fs.writeFileSync(P, L.join('\n'));
  console.log('change-impact：CHG-022 插入于第 ' + (i + 1) + ' 行之前（' + neo.length + ' 行）｜总行数 ' + L.length);
})();

// ② CHANGELOG.md：插入到首条之前
(function () {
  const P = 'CHANGELOG.md';
  const L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
  const i = L.findIndex(function (l) { return /^## \[2026-09-25\]/.test(l); });
  if (i < 0) { console.log('CHANGELOG：未找到首条锚点'); return; }
  const entry = [
    '## [2026-09-25] `SPEC-004` 的立红 + `PLAN` + `TASKS` · 第 4 次走通「立红 → PLAN → TASKS」（CHG-022）',
    '',
    '**类型**：工序推进（**未改业务代码**）',
    '',
    '### 立红：第 4 个契约冻结自检套件',
    '',
    '`ai-creator-community-wh/tools/wb-creator-tools-verify.js` —— 冻结 **17 项契约** / **126 项功能断言** / **14 项不变量**。',
    '',
    '| 指标 | 值 |
    | :--- | :--- |
    | 真实进度 | **功能断言 4/126**（其中 **3 项为【前置】既有事实** + **1 项为既有能力** ⇒ **新增能力 0/126**） |
    | 门禁 | **L3 14 套 = 13 绿（2,343）+ 🔴 1 红**；**总判定通过 / exit 0**（红灯**不阻断**、**不计入**断言合计） |
    | 首跑 → 加固 | **20/129 →（逐项复核 + 合并同类 + 补前置）→ 4/126** —— **13 项属「平凡通过」** |
    | 断言合计 | **未变**（红灯不计入）：`2,869/2,870` |
    '',
    '🔑 **首跑 13 项"平凡通过"的三类成因**（已全部加固）：**字段全缺** ⇒ `A5` 的"非法 0 项"必然成立 · **DOM 桩默认值** ⇒ `C5`（classList 天然不含 active）/ `C11`（hidden 天然 false）· **对象表为空** ⇒ `F3~F7` 的 `0 === 0`。',
    '',
    '🔑 **并修掉一处 `fresh()` 的跨组污染**：未重置 `classList` 与 `value` ⇒ `H8` 会因 `value` 残留而平凡通过、`C5` 会被 `B11` 加上的 `active` 永久污染。',
    '',
    '### 🔴 立红当场测出 6 处 `spec.md` 未记载的缺口',
    '',
    '| # | 缺口 | 证据 |
    | :--- | :--- | :--- |
    | ④ | **扣分是"成功后扣"、不是"预扣"** | `simulateGenerate` 的扣减写在 `setTimeout(…, 1800)` 回调内、位于 `status.innerHTML = \'🎉 生成成功\'` **之后** |
    | ⑤ | **扣减硬编码 `self`** | `const selfLeft = Math.max(0, balBefore.self - COST)` ⇒ 不按工具来源分池 |
    | ⑥ | **`Math.max(0, …)` ⇒ 余额不足静默扣到 0 且照常成功** | 无"不足即拒绝"分支（违反 `EX-004-06/07`）—— 属「缺数据默认放行」同族 |
    | ⑦ | **模型引擎 / 画幅比例控件无 `id`** | `index.html` 2164 / 2173 的两个 `<select>` ⇒ `FR-004-14` 无法被程序读取 |
    | ⑧ | **工具箱 / 榜单卡片无 `id`** | `myToolbox` / `leaderboard` 字段仅 `name/desc/icon/color` ⇒ **卡片无从路由**（违反 `FR-004-05`） |
    | ⑨ | **既有弹窗段大量内联 `style="..."`** | `index.html` 2151 / 2161 / 2183 / 2185 / 2190~2192 |
    '',
    '> 🔑 **④⑤⑥ 的共性：代码不报错，但它做的事与需求不同** —— 靠"跑一遍看有没有异常"**永远发现不了**。',
    '',
    '### 四件产出',
    '',
    '| 文件 | 核心 |
    | :--- | :--- |
    | **`plan.md`** | 三条前置声明（**"新建一页 + 接线"不是"重写工作台"** / **最大风险是"动既有弹窗"** / **Phase 1 不解决分源真源**）+ **§17.2「避免清单」（6 项硬禁止）** + **ticket 状态机** + **11 项可机器判定 DoD** |
    | **`tasks.md`** | Phase 1 **31 项** + Phase 2 5 项登记；★ **14 处"改完即跑门禁"**；**2 处顺序陷阱**；**18 条"不做什么"** |
    | **`data-model.md`** | 三层次（展示 / 事实 / 运行时，**严格单向**）+ **14 条不变量** + **7 个刻意不建字段** |
    | **`research.md`** | R1 迁移分期 · R2 **本项目第 4 次「负向动作保护」类比**（资金 → 身份 → 内容 → **算力**）· R3 分源不伪造 · R4 集成模式数据化 |
    '',
    '### 🔴 Phase 1 的硬约束（本 Feature 独有）',
    '',
    '**不得改动 `#modal-studio` 的 DOM 与 `simulateGenerate` 的既有逻辑** —— 实测绑定 **10 处**（`app.js` 6 + `index.html` 4）、`simulateGenerate` 依赖 **8 个 DOM id**。',
    '⇒ 依 `Q-049` 的「两阶段」：Phase 1 **只建壳**（`#view-tool-detail` + 新方法），生成动作仍走弹窗；Phase 2 才迁内。',
    '⇒ **可回退性：高** —— 所有改动均为**新增**，既有路径未动。',
    '',
    '### 一并修正的两处存量缺陷 + 一处新登记缺口',
    '',
    '| 类型 | 内容 |
    | :--- | :--- |
    | 🔴 存量缺陷 | `workspace-state.yaml` 的**重复键 `clarified`**（CHG-019 插入造成 —— 后者会**静默覆盖**前者，丢失 `SPEC-003` / `SPEC-004`） |
    | 🔴 存量缺陷 | `registered` 里**误留在已转绿的** `wb-growth-academy-verify`（CHG-021 遗漏 ⇒ 应在 `registered` 清空、移入 `transitioned`） |
    | 🔴 存量缺陷 | `design-status.md` §十 **缺 CHG-020 / CHG-021 两行**（上一轮遗漏）⇒ 已补齐 |
    | 🆕 新缺口 | **`GAP-13`**：L1 的 7 个 ERROR 中另有 3 项（`showAcademyCoursesPage` / `openMyCerts` ×2）**在 `SPEC-003` 落地后仍未消失** ⇒ 「文档声明名 vs 实现名」不一致，属 `SPEC-003` 遗留 |
    '',
    '### 实测',
    '',
    '`gates.js --baseline`：L1 **7 ERROR（= 基线，无新增）** / DUP **520/520** / L2 6/6 / MX 通过 / **L3 14 套 = 2,343（13 绿）+ 🔴 1 红** / 断言合计 **2,869/2,870** / **总判定通过 ✅** / exit 0。',
    '红灯进度：**`已登记待实现 4/126 项（1 套）`**。',
    '**业务代码未动**（`index.html` / `css` / `app.js` / `mock_data.js` 时间戳均未变）。',
    '',
    '### 同步范围',
    '',
    '`specs/004-creator-tools/{spec.md,plan.md,tasks.md,data-model.md,research.md}` · `specs/README.md` · `project-design/01-requirements/traceability.md` · `project-design/05-feature-map.md` · `project-design/99-ai/{design-status.md,workspace-state.yaml,change-impact.md}` · `ai-creator-community-wh/tools/{gates.js,gates-baseline.json,wb-creator-tools-verify.js}` · `CHANGELOG.md`',
    '',
    '---',
    '',
  ];
  L.splice(i, 0, ...entry);
  fs.writeFileSync(P, L.join('\n'));
  console.log('CHANGELOG：已插入 CHG-022 条目（' + entry.length + ' 行）｜总行数 ' + L.length);
})();
