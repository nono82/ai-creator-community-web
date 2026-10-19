'use strict';
const fs = require('fs');
const P = '.workbuddy/memory/MEMORY.md';
const before = fs.readFileSync(P, 'utf8').length;
let L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
const rules = [
  // ① 当前阶段
  ['- **有效阻塞 = 0 项**；**当前阶段',
    '- **有效阻塞 = 0 项**；**当前阶段 = `CLARIFY`（`SPEC-003` / `SPEC-004` 的 `SPECIFY` + `CLARIFY` 均已完成，`CHG-018` + `CHG-019`）** ⇒ **下一步 = 二者的 `PLAN` / `TASKS`**（⚠️ 建议 `SPEC-003` 先行，`SPEC-004` 的详情页迁移放最后 —— 它是**最高回归风险区**）。⚠️ 二者都动 `app.js` ⇒ **必须串行**（`ENV-02`）。'],
  // ② 仍未决：移除已定稿的三条
  ['- **仍未决**：',
    '- **仍未决**：**`Q-043` 剩余两处（窗口时长 + 注销后处置，与 `Q-041` 合并取法务口径）** / **`Q-041`（留存期限 / 释放；合规参数不得伪造）** / `Q-044`（配额计费）/ `Q-045`（版权确权 —— **Feature Map 缺口**）/ `Q-037` / `Q-039`（**未预设数值**）/ `Q-040` / `Q-007~010` / `Q-013~018`（规模）/ `Q-021~027`（资金）。**（`Q-046` / `Q-049` / `Q-050` 已于 `CHG-019` 定稿：等级判定真源 = `SPEC-003`；详情页两阶段迁移；分源池真源 = `SPEC-009`）**'],
  // ③ CHG-019
  ['- **`CHG-018`**（2026-09-25）',
    '- **`CHG-018`**（2026-09-25）= `SPEC-003` / `SPEC-004` 的 `SPECIFY`（同日两份规格；**合计固化 7 处实测缺陷**；新开 `Q-046` ~ `Q-051`）。⚠️ 并修正 CHG-017 的遗漏（`feature-map` 的 `SPEC-017` 行）。**教训：受影响文件清单里不写"（如需）"。**\n- **`CHG-019`**（2026-09-25）= 二者同日 `CLARIFY`（**六条全部定稿，含三条 P1**）：**真源归属类问题的判据 = 因果链而非偏好**（`Q-046`：`REQ-004` 规定等级由累计创作积分定级 + 积分的唯一来源在成长学院 ⇒ 加分来源即定级真源）；**结构级迁移默认「两阶段 + 保留兼容层」**（绑定数 >> 1 时）；**「上游未落地」≠「可以自建」**（过渡期用既有入口顶上，禁造临时池）。'],
];
let hit = 0, miss = [];
rules.forEach(([pre, to]) => {
  const i = L.findIndex((l) => l.startsWith(pre));
  if (i >= 0) { L[i] = to; hit++; } else miss.push(pre.slice(0, 22));
});
fs.writeFileSync(P, L.join('\n'));
const after = fs.readFileSync(P, 'utf8').length;
console.log('替换 ' + hit + '/' + rules.length + '｜字节 ' + before + ' → ' + after + (after <= 16384 ? ' ✅ 在 16KB 内' : ' ⚠️ 超 ' + (after - 16384) + ' B') + (miss.length ? '｜未命中：' + miss.join(' ; ') : ''));
