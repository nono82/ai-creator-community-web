'use strict';
/** CHG-022 同步第 3 批：design-status.md。按行首前缀整行替换 + 定点插入。 */
const fs = require('fs');
const P = 'project-design/99-ai/design-status.md';
let L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
const snap = L.slice();
let hit = 0;
const miss = [];
function rep(pre, to, label) {
  const i = snap.findIndex(function (l) { return l.startsWith(pre); });
  if (i >= 0) { L[i] = to; hit++; } else miss.push(label || pre.slice(0, 34));
}

// ① 去掉 L19 的陈旧「【当前】」（它是 CHG-008 的历史轨迹，不该再标"当前"）
rep('→ 【当前】SPECIFY ✅ 首个 Feature 规格已产出',
  '→ SPECIFY ✅ 首个 Feature 规格已产出（`SPEC-001` `spec.md`，CHG-008）',
  'L19 去【当前】');

// ② 当前行（原 L31 = SPEC-003/004 的 SPECIFY+CLARIFY）→ 拆为 SPEC-003 全程 + SPEC-004 当前
rep('→ **【当前】`SPEC-003` / `SPEC-004` 的 `SPECIFY` ✅ + `CLARIFY` ✅ 已完成**',
  '→ `SPEC-003` / `SPEC-004` 的 `SPECIFY` ✅ + `CLARIFY` ✅ 已完成（`CHG-018` + `CHG-019`）—— **六条问题（含三条 P1）同日全部定稿**\n→ `SPEC-003` 的 立红 ✅ + `PLAN` ✅ + `TASKS` ✅（10 项契约 / 77 项功能断言 / 真实进度 0/77，`CHG-020`）\n→ `SPEC-003` 的 `IMPLEMENT`（Phase 1）✅ 已完成：31 项全部落地，**红灯转绿 `0/77` → `77/77`**（`CHG-021`）\n→ **【当前】`SPEC-004` 的 立红 ✅ + `PLAN` ✅ + `TASKS` ✅ 已完成**（**17 项契约** / **126 项功能断言** / 真实进度 **4/126**，其中 3 项前置事实 + 1 项既有能力 ⇒ **新增能力 0/126**；`CHG-022`）',
  '当前行');

// ③ 生命周期位置
rep('→ 生命周期位置：',
  '→ 生命周期位置：[*] → PROJECT_INITIALIZATION → CLARIFY（P0 批次）→ SPECIFY → CLARIFY（Feature 级）→ CHECKLIST → PLAN → TASKS → **IMPLEMENT（`SPEC-001` ✅ / `SPEC-017` ✅ / `SPEC-003` ✅ 三者 Phase 1 均已落地）** → **【当前】第 4 批（`SPEC-004` 已完成 立红 → `PLAN` → `TASKS`）** → [下一批：`SPEC-004` Phase 1 实现（31 项）]',
  '生命周期位置');

// ④ 设计深度
rep('| 设计深度 |',
  '| 设计深度 | **L0 总览 + L1 业务 / Feature Map + L2 **四个** Feature 的完整规格链（`SPEC-001` / `SPEC-017` / `SPEC-003` 已落地实现 + `SPEC-004` 已 `TASKED`）+ `IMPLEMENT`** |',
  '设计深度');

// ⑤ 已建立 / 未建立
rep('| 已建立 |',
  '| 已建立 | Constitution、项目上下文、术语表、全局需求、业务视图、领域总览、架构视图、技术基线、Feature Map、Roadmap、风险登记册、**`SPEC-001` / `SPEC-017` / `SPEC-003` 三条完整规格链 + 三者的可用实现**、**`SPEC-004` 完整规格链（`spec` + `plan` + `tasks` + `data-model` + `research`）** |',
  '已建立');
rep('| 未建立 |',
  '| 未建立 | 其余 **12 个** Feature 的 `spec.md` / `plan.md` / `tasks.md`；**`SPEC-003` / `SPEC-004` 的 `checklists/`**；`SPEC-017` 的 `checklists/`；**`contracts/`（有意不建 —— 契约已在 `spec.md` FR + 冻结自检套件头部冻结）**；后端设计；数据库设计；API 契约 |',
  '未建立');

// ⑥ 工具层
rep('| 工具层 |',
  '| 工具层 | ✅ 已变更：**L3 共 14 套 = 13 套全绿（2,343 项）+ 🔴 1 套已登记红灯**（`wb-creator-tools-verify`，**功能断言 4/126**）；DUP **520 键 0 重复**（CHG-003 + CHG-007 + CHG-011 + CHG-013 + CHG-016 + CHG-017 + CHG-020 + CHG-021 + **CHG-022**） |',
  '工具层');

// ⑦ 本轮动作
rep('| 本轮动作 |',
  '| 本轮动作 | **`SPEC-004` 的立红 + `PLAN` + `TASKS`（CHG-022）**：① **立红** —— 新建 **`tools/wb-creator-tools-verify.js`**（**17 项契约** / **126 项功能断言** / 14 项不变量），登记 `l3ExpectedRed`；**首跑 20/129，逐项复核后 13 项属「平凡通过」**（典型三类：字段全缺 ⇒ "非法 0 项"必然成立；DOM 桩默认值天然满足；对象表为空 ⇒ `0 === 0`）⇒ **加固为 4/126**。② 产出 **`plan.md`**（三条前置声明 + 双阶段 + **§三 固化 10 处缺口**（其中 **6 处为本轮立红新测**）+ **"避免清单"** + 11 项可机器判定 DoD）/ **`tasks.md`**（Phase 1 **31 项** + Phase 2 5 项）/ **`data-model.md`**（三层次 + 14 条不变量 + 7 个刻意不建字段）/ **`research.md`**（R1~R4；含**本项目第 4 次「负向动作保护」类比**）。③ 🔴 **Phase 1 硬约束**：**不得改动 `#modal-studio`**（实测绑定 **10 处**；`Q-049` 定稿两阶段）。④ 一并修正两处**存量缺陷**（`workspace-state` 的重复键 `clarified` / `registered` 里误留在**已转绿**的套件）。**未改业务代码**（本轮只动文档 + 工具层） |',
  '本轮动作');

// ⑧ §七 生命周期表的 SPEC-004 行
rep('| **SPEC-004** 创作工具工作台与模板套用 |',
  '| **SPEC-004** 创作工具工作台与模板套用 | ✅ **`TASKED`**（2026-09-25；同日 `SPECIFY` → `CLARIFY` → 立红 → `PLAN` → `TASKS`） | `spec.md` / **`plan.md`** / **`tasks.md`** / **`data-model.md`** / **`research.md`**；**验证证据** = `tools/wb-creator-tools-verify.js`（🔴 **功能断言 4/126**，已登记 `l3ExpectedRed`） |',
  '§七 SPEC-004');

fs.writeFileSync(P, L.join('\n'));
console.log('design-status：替换 ' + hit + '/8｜行数 ' + L.length + (miss.length ? '｜未命中：' + miss.join(' ; ') : ''));

// ⑨ §十 变更记录：在 CHG-021 行后插入 CHG-022
const i10 = L.findIndex(function (l) { return /\| 2026-09-25 \| \*\*`SPEC-003` Phase 1 的 `IMPLEMENT`（CHG-021）\*\* \|/.test(l); });
if (i10 < 0) {
  console.log('未找到 §十 的 CHG-021 锚点 —— 尝试宽松匹配');
  const j = L.findIndex(function (l) { return l.indexOf('CHG-021') >= 0 && l.indexOf('2026-09-25') >= 0; });
  console.log('  宽松命中行：' + (j >= 0 ? j + 1 : '无'));
} else {
  L.splice(i10 + 1, 0, '| 2026-09-25 | **`SPEC-004` 的立红 + `PLAN` + `TASKS`（CHG-022）** | ① **立红**：新建 `tools/wb-creator-tools-verify.js`（**17 项契约 / 126 项功能断言 / 14 项不变量**），登记 `l3ExpectedRed` —— **首跑 20/129 → 加固为 4/126**（13 项属平凡通过）。② 产出 `plan.md` / `tasks.md` / `data-model.md` / `research.md`（Phase 1 **31 项** + Phase 2 5 项）。③ **立红另测出 6 处 `spec.md` 未记载的缺口**：扣分是"成功后扣"非"预扣" / 扣减硬编码 `self` / `Math.max(0,…)` 使余额不足静默放行 / 模型与画幅控件无 `id` / 工具箱与榜单无 `id` / 既有弹窗段大量内联样式。④ **两处存量缺陷修正**：`workspace-state` 的重复键 `clarified`（CHG-019 插入造成）、`registered` 里误留在**已转绿**的 `wb-growth-academy-verify`（CHG-021 遗漏）。⑤ **登记 `GAP-13`**：L1 的 7 个 ERROR 中另有 3 项（`showAcademyCoursesPage` / `openMyCerts` ×2）在 `SPEC-003` 落地后仍未消失 ⇒ 「文档声明名 vs 实现名」不一致，属 `SPEC-003` 遗留。**未改业务代码** | 17 | `change-impact.md` CHG-022 |');
  fs.writeFileSync(P, L.join('\n'));
  console.log('§十：已插入 CHG-022（第 ' + (i10 + 2) + ' 行）');
}
