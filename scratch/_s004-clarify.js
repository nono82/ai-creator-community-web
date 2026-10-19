'use strict';
/** 落盘 SPEC-004 的 CLARIFY 结论（§十四 三行 + DA-004-01/02 + 变更记录）。 */
const fs = require('fs');
const P = 'specs/004-creator-tools/spec.md';
let L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
const rules = [
  ['| **Q-049** | **P1** |', '| **Q-049** | ~~P1~~ | **AI 工具详情页承载形态迁移的回归边界 —— 是否允许保留弹窗作为兼容层？** | `REQ-202` 明确要求详情页是**路由级页面**（`#view-tool-detail`，**非弹窗非抽屉**）；而实现为 **`#modal-studio` 弹窗**（实测**合计绑定 10 处**）⇒ **结构级迁移 = 高回归风险区** | ✅ **已于 2026-09-25 `CLARIFY` 定稿**：**两阶段** —— Phase 1 新建路由页承载 Hero + 工作区骨架、**生成动作仍走弹窗**；Phase 2 再迁生成动作（见 **§7.6**）。⇒ 落为 `DA-004-02`（已确认） | 架构 + 产品 | **RESOLVED（2026-09-25）** |'],
  ['| **Q-050** | **P1** |', '| **Q-050** | ~~P1~~ | **AI 积分分源池的真源归属 —— 由 `SPEC-009`（我的资产）持有，还是由 `SPEC-004` 持有？** | `REQ-204` 要求「**预扣 AI 积分**」与「失败 / 超时**全额原路退还**」；`Q-006` 已定**唯一拆分维度 = 算力来源**。但**分源池的真源归谁**未定 ⇒ 若本 Feature 自建计数器，即**伪造一份分源账**（第二事实源） | ✅ **已于 2026-09-25 `CLARIFY` 定稿**：**真源归 `SPEC-009`**；过渡期**沿用既有 `getComputeBalances` / `syncComputeBalances`**，🔴 **本 Feature 不得新增任何"池"结构**（见 **§7.6**） | 架构 + 产品 | **RESOLVED（2026-09-25；唯余 `SPEC-009` 的就绪时点 → 属排期）** |'],
  ['| **Q-051** | P2 |', '| **Q-051** | ~~P2~~ | **Hero 区四标签（简介 / 示例模板 / 使用技巧 / 评论）的内容来源** | 实测 `MockData.tools.allTools[8]` 字段仅 `id / name / desc / category / users / icon / color / score` ⇒ **Hero 区无数据支撑**。另：工具评论是否复用社区能力？ | ✅ **已于 2026-09-25 `CLARIFY` 定稿**：**需新增工具维度数据集合**；🔴 **工具评论独立、不复用社区**（见 **§7.6**） | 产品 + 架构 | **RESOLVED（2026-09-25）** |'],
  ['| **DA-004-01** | AI 积分分源池的**真源归 `SPEC-009`**，本 Feature 只做调用 | 避免第二事实源 | 若本 Feature 自建池 ⇒ 立刻形成两份账 |', '| **DA-004-01** | AI 积分分源池的**真源归 `SPEC-009`**，本 Feature 只做调用 | 避免第二事实源；`Q-050` 已于 2026-09-25 `CLARIFY` 定稿（见 §7.6） | 若本 Feature 自建池 ⇒ 立刻形成两份账 |'],
  ['| **DA-004-02** | 详情页迁到路由级页面**不改变既有生成交互语义** | 只是承载形态变化 | 若语义需变 ⇒ 须回写 `plan.md` 并评估回归 |', '| **DA-004-02** | 详情页迁到路由级页面**不改变既有生成交互语义**，且迁移**分两阶段**（先建壳、后迁内） | 只是承载形态变化；`Q-049` 已于 2026-09-25 `CLARIFY` 定稿（见 §7.6） | 若语义需变 ⇒ 须回写 `plan.md` 并评估回归 |'],
];
let hit = 0, miss = [];
rules.forEach(([pre, to]) => {
  const i = L.findIndex((l) => l.startsWith(pre));
  if (i >= 0) { L[i] = to; hit++; } else miss.push(pre.slice(0, 22));
});
// 变更记录追加
const ic = L.findIndex((l) => /^\| 2026-09-25 \| 新增 \| \*\*首次建立 `SPEC-004`/.test(l));
if (ic >= 0) {
  L.splice(ic + 1, 0, '| 2026-09-25 | **CLARIFY** | **`Q-049` / `Q-050` / `Q-051` 三条（含两条 P1）于同日 `CLARIFY` 定稿**（`CHG-019`）：**`Q-049`** ⇒ **两阶段迁移**（Phase 1 新建路由页承载 Hero + 工作区骨架、生成动作仍走弹窗；Phase 2 再迁）；**`Q-050`** ⇒ **分源池真源归 `SPEC-009`**，过渡期沿用既有 `getComputeBalances` / `syncComputeBalances`，🔴 **不得新增"池"结构**；**`Q-051`** ⇒ **需新增工具维度数据集合**、工具评论独立。⇒ 新增 **§7.6 CLARIFY 结论**；`DA-004-01` / `DA-004-02` **升级为已确认** | 本文件 §七 / §十三 / §十四 / §十六；`01-requirements/open-questions.md`；`traceability.md`；`99-ai/`；`CHANGELOG.md` |');
  console.log('已追加变更记录');
}
fs.writeFileSync(P, L.join('\n'));
console.log('SPEC-004：替换 ' + hit + '/' + rules.length + (miss.length ? '｜⚠️ 未命中：' + miss.join(' ; ') : ''));
