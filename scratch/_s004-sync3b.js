'use strict';
/** CHG-022 同步第 3 批补充：design-status §十 变更记录表追加 CHG-020 / CHG-021 / CHG-022。 */
const fs = require('fs');
const P = 'project-design/99-ai/design-status.md';
let L = fs.readFileSync(P, 'utf8').split(/\r?\n/);

// 幂等：若已含 CHG-022 行则跳过
if (L.some(function (l) { return l.indexOf('change-impact.md` CHG-022') >= 0; })) {
  console.log('已存在 CHG-022 行，跳过');
  process.exit(0);
}

// 定位最后一条变更记录行（表格行，以 `| 2026-` 开头）
let last = -1;
L.forEach(function (l, i) { if (/^\| 2026-09-2\d \|/.test(l)) last = i; });
if (last < 0) { console.log('未找到变更记录行'); process.exit(1); }
console.log('最后一条变更记录：第 ' + (last + 1) + ' 行 = ' + L[last].slice(0, 70));

const rows = [
  '| 2026-09-25 | **`SPEC-003` 的立红 + `PLAN` + `TASKS`（CHG-020）** | ⚠️ **本项目第 3 个「立红」套件**（前两个：`SPEC-001` / `SPEC-017`）：新建 `tools/wb-growth-academy-verify.js`（**10 项契约 / 77 项功能断言 / 10 项不变量**），登记 `l3ExpectedRed`。**首跑 12/77，逐项复核后全部属「平凡通过」** ⇒ 加固后真实进度 **0/77**。产出 `plan.md` / `tasks.md` / `data-model.md` / `research.md`（Phase 1 **31 项** + Phase 2 8 项）。**立红另测出 4 处 `spec.md` 未记载的缺口**（积分双写 / `progress` 与课节数不符 / `studyLog` 4 条被旧 `+50` 全污染 / 二级页显隐两份内联清单不一致）。另**补齐门禁格式契约**（红灯套件须输出 `通过：x/y 项功能断言`，否则进度被计为 0/0 —— `wb-content-asset-verify` 此前缺此行）。**未改业务代码** | 15 | `change-impact.md` CHG-020 |',
  '| 2026-09-25 | **`SPEC-003` Phase 1 的 `IMPLEMENT`：学职引擎落地，红灯转绿（CHG-021）** | **31 项全部落地**，**红灯转绿 `0/77` → `77/77`**（+ 不变量 10/10，exit 0）；`l3ExpectedRed` 清空、基线上调 2256 → **2343**（13 套）、DUP 492 → **520**。实现学职引擎 **10 方法 / 属性** + 资源库 5 入口 + 评价 2 + 相邻课节 + 成就墙 + 排序 2；**修复 4 处缺陷**（三套加分逻辑 / 晋级判据 / `plans[0]` 兜底 / 等级口径）并**修正数据层**（`paths` 阈值命名收敛、`studyLog` 50 → 30、`progress` 异常值）。⚠️ **新增 `RISK-003-08`**：`wb-academy-path-verify` **7 项断言基于已作废的旧口径** ⇒ 已同步期望值（**判据：更新期望 = 修正测试口径，不是放宽标准**）。**`index.html` 1 处改动 / `css` 零改动** | 14 | `change-impact.md` CHG-021 |',
  '| 2026-09-25 | **`SPEC-004` 的立红 + `PLAN` + `TASKS`（CHG-022）** | ① **立红**：新建 `tools/wb-creator-tools-verify.js`（**17 项契约 / 126 项功能断言 / 14 项不变量**），登记 `l3ExpectedRed` —— **首跑 20/129 → 加固为 4/126**（**13 项属平凡通过**：字段全缺 ⇒ "非法 0 项"必然成立 · DOM 桩默认值天然满足 · 对象表为空 ⇒ `0 === 0`）。② 产出 `plan.md` / `tasks.md` / `data-model.md` / `research.md`（Phase 1 **31 项** + Phase 2 5 项）。③ **立红另测出 6 处 `spec.md` 未记载的缺口**（扣分是"成功后扣"非"预扣" / 扣减硬编码 `self` / `Math.max(0,…)` 使余额不足静默放行 / 模型与画幅控件无 `id` / 工具箱与榜单无 `id` / 既有弹窗段大量内联样式）。④ 🔴 **Phase 1 硬约束**：不得改动 `#modal-studio`（实测绑定 **10 处**）。⑤ **两处存量缺陷修正**：`workspace-state` 的**重复键 `clarified`**（CHG-019 插入造成）、`registered` 里误留在**已转绿**的 `wb-growth-academy-verify`（CHG-021 遗漏）。⑥ **登记 `GAP-13`**：L1 的 7 个 ERROR 中另有 3 项（`showAcademyCoursesPage` / `openMyCerts` ×2）在 `SPEC-003` 落地后**仍未消失** ⇒ 「文档声明名 vs 实现名」不一致，属 `SPEC-003` 遗留。**未改业务代码** | 17 | `change-impact.md` CHG-022 |',
];
L.splice(last + 1, 0, ...rows);
fs.writeFileSync(P, L.join('\n'));
console.log('已追加 ' + rows.length + ' 行（CHG-020 / CHG-021 / CHG-022）｜总行数 ' + L.length);
