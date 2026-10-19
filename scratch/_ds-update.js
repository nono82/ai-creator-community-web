'use strict';
/** 一次性同步 design-status.md（CHG-018）。按行首前缀整行替换 + 定点插入。 */
const fs = require('fs');
const P = 'project-design/99-ai/design-status.md';
let L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
let hit = 0;

const rep = [
  ['→ 生命周期位置：',
    '→ 生命周期位置：[*] → PROJECT_INITIALIZATION → CLARIFY（P0 批次）→ SPECIFY → CLARIFY（Feature 级）→ CHECKLIST → PLAN → TASKS → **IMPLEMENT（`SPEC-001` Phase 1 ✅ / `SPEC-017` Phase 1 ✅ 均已落地）** → **【当前】横向铺第 3 / 4 个 Feature 规格（`SPEC-003` / `SPEC-004` 已于 2026-09-25 `SPECIFIED`）** → [下一批：二者的 `CLARIFY` / `PLAN` / `TASKS` / 实现]'],

  ['| 设计深度 |',
    '| 设计深度 | **L0 总览 + L1 业务 / Feature Map + L2 **四个** Feature 的规格链（`SPEC-001` / `SPEC-017` 已落地实现 + `SPEC-003` / `SPEC-004` 已 `SPECIFIED`）+ `IMPLEMENT`** |'],

  ['| 未建立 |',
    '| 未建立 | 其余 **13 个** Feature 的 `spec.md` / `plan.md` / `tasks.md`；**`SPEC-003` / `SPEC-004` 的 `plan.md` / `tasks.md` / `data-model.md` / `research.md` / `checklists/`**（待其 `PLAN` / `TASKS` 阶段）；`SPEC-017` 的 `checklists/`；**`contracts/`（有意不建 —— 契约已在 `spec.md` FR + 冻结自检套件头部冻结）**；后端设计；数据库设计；API 契约 |'],

  ['| 本轮动作 |',
    '| 本轮动作 | **`SPEC-003` / `SPEC-004` 的 `SPECIFY`（CHG-018）**：新建 **`specs/003-growth-academy/spec.md`**（14 US / **20 验收场景** / **53 FR（9 组）** / **19 边界** / 5 DA / 6 成功标准）与 **`specs/004-creator-tools/spec.md`**（15 US / **16 验收场景** / **37 FR（8 组）** / **15 边界** / 5 DA / 7 成功标准）。🔴 **§1.3 合计固化 7 处实测真实缺陷**（`SPEC-003` 4 处 + `SPEC-004` 3 处）。**新开 6 条待确认问题**（`Q-046` ~ `Q-051`；其中 `Q-046` / `Q-049` / `Q-050` 为 **P1**）。⚠️ 一并修正上一轮遗漏（`05-feature-map.md` 的 `SPEC-017` 行）。**未改业务代码**（本轮只动文档） |'],

  ['**✅ 最近完成：',
    '**✅ 最近完成：`SPEC-003`（成长学院）/ `SPEC-004`（创作工具）的 `SPECIFY`（2026-09-25，`CHG-018`）—— 同日产出两份 Feature 规格，并合计固化 7 处实测真实缺陷。**'],

  ['> **Phase 1 的产出（2026-09-25，`CHG-017`）**：',
    '> **上一轮完成（`CHG-017`）**：`SPEC-017` 的 `IMPLEMENT`（Phase 1）—— 26 项全部落地；冻结自检 `5/66` → `66/66`（+ 不变量 `7/7`，退出码 0）并转为**回归防线**；门禁 L3 `2,183` → `2,256` 项 / 12 套全绿；`index.html` / `css` 未动。'],
];

L = L.map((l) => {
  for (const [pre, to] of rep) {
    if (l.startsWith(pre)) { hit++; return to; }
  }
  return l;
});

// 插入：Artifact 表（在 specs/017-content-asset-storage/ 行之后）
const iArt = L.findIndex((l) => l.startsWith('| **`specs/017-content-asset-storage/`** |'));
if (iArt > 0 && !L[iArt + 1]?.startsWith('| **`specs/003-growth-academy/`**')) {
  L.splice(iArt + 1, 0,
    '| **`specs/003-growth-academy/`** | ✅ **`SPEC-003` 成长学院的 `spec.md`（2026-09-25，CHG-018）**：14 US / **20 验收场景** / **53 FR（9 组）** / **19 边界** / 5 DA / 6 成功标准。**`plan.md` / `tasks.md` / `data-model.md` / `research.md` / `checklists/` / `contracts/` 未创建**（待其 `PLAN` / `TASKS` 阶段） |',
    '| **`specs/003-growth-academy/spec.md`** | ✅ **`SPEC-003` 成长学院（课程研习与认证）（CHG-018）**：核心命题「**把已有的壳接上电**」；**学职引擎（S7）为地基**（加分 / 统计回写 / 课节完成**各只有一个入口**）；**§1.3 固化 4 处真实缺陷**（三套加分逻辑并存 / 晋级判据非积分达标 / `completeLesson` 兜底到 `plans[0]` / 等级口径与 `Q-003` 裁决**相反**）；**§7.1 冻结等级口径**（阈值 `0/200/500/2000/5000`、命名**无 `AI` 前缀**）；**新开 `Q-046` ~ `Q-048`** |',
    '| **`specs/004-creator-tools/`** | ✅ **`SPEC-004` 创作工具的 `spec.md`（2026-09-25，CHG-018）**：15 US / **16 验收场景** / **37 FR（8 组）** / **15 边界** / 5 DA / 7 成功标准。**`plan.md` / `tasks.md` / `data-model.md` / `research.md` / `checklists/` / `contracts/` 未创建**（待其 `PLAN` / `TASKS` 阶段） |',
    '| **`specs/004-creator-tools/spec.md`** | ✅ **`SPEC-004` 创作工具工作台与模板套用（CHG-018）**：**§7.2 冻结承载形态**（详情页 = **路由级页面** `#view-tool-detail`，**非弹窗非抽屉**）；**§7.4 明确资产口径遵循 `SPEC-017`**（`refCount` **不落库**、一律走 `attachAssetRef`）；**§1.3 固化 3 处真实缺陷**（承载形态与 `REQ-202` 相反 / `allTools` 缺 `integration` 字段 / 设计文档 `refCount` 口径冲突）；**新开 `Q-049` ~ `Q-051`** |');
  console.log('已插入 Artifact 表 4 行');
}

// 插入：§七 生命周期表（在 SPEC-017 行之后）
const i7 = L.findIndex((l) => l.startsWith('| **SPEC-017** 内容资产存储与转存 |'));
if (i7 > 0 && !L[i7 + 1]?.startsWith('| **SPEC-003** 成长学院')) {
  L.splice(i7 + 1, 0,
    '| **SPEC-003** 成长学院（课程研习与认证） | ✅ **`SPECIFIED`**（2026-09-25，CHG-018） | **`spec.md`**（14 US / 20 SC / 53 FR（9 组）/ 19 EX；`plan.md` / `tasks.md` / `data-model.md` / `research.md` / `checklists/` **未创建**，待其 `PLAN` / `TASKS` 阶段） |',
    '| **SPEC-004** 创作工具工作台与模板套用 | ✅ **`SPECIFIED`**（2026-09-25，CHG-018） | **`spec.md`**（15 US / 16 SC / 37 FR（8 组）/ 15 EX；`plan.md` / `tasks.md` / `data-model.md` / `research.md` / `checklists/` **未创建**，待其 `PLAN` / `TASKS` 阶段） |');
  console.log('已插入 §七 两行');
}

// 插入：§十 变更记录（在 CHG-017 行之后）
const i10 = L.findIndex((l) => /\| 15 \| `change-impact\.md` CHG-017 \|/.test(l));
if (i10 > 0) {
  L.splice(i10 + 1, 0,
    '| 2026-09-25 | **`SPEC-003` / `SPEC-004` 的 `SPECIFY`（CHG-018）** | 同日产出**两份** Feature 规格：**`specs/003-growth-academy/spec.md`**（14 US / 20 SC / 53 FR（9 组）/ 19 EX）与 **`specs/004-creator-tools/spec.md`**（15 US / 16 SC / 37 FR（8 组）/ 15 EX）。🔴 **合计固化 7 处实测真实缺陷** —— `SPEC-003` 4 处（**三套加分逻辑并存**：`completeLessonById` +30 / `completeLesson` +50 / `advanceGrowthPath` 不加分；**晋级判据为"会话完成 2 节"而非积分达标**；`completeLesson` **匹配失败兜底到 `plans[0]`**；`academy.paths` **等级口径与 `Q-003` 裁决相反**）+ `SPEC-004` 3 处（`#modal-studio` 弹窗 vs `REQ-202` 要求的 `#view-tool-detail` 路由级页面；`allTools` **缺 `integration` 字段**；设计文档 `refCount` 口径**与 `SPEC-017` 冲突**）。**新开 6 条**：`Q-046`（学职引擎与 `SPEC-002` 的边界，P1）/ `Q-047` / `Q-048` / `Q-049`（详情页迁移的回归边界，P1）/ `Q-050`（**AI 积分分源池的真源归属**，P1）/ `Q-051`。⚠️ 一并修正上一轮遗漏（`05-feature-map.md` 的 `SPEC-017` 行仍写 `SPECIFIED`）。**未改业务代码** | 16 | `change-impact.md` CHG-018 |');
  console.log('已插入 §十 CHG-018');
}

fs.writeFileSync(P, L.join('\n'));
console.log('整行替换', hit, '/', rep.length, '｜总行数', L.length);
