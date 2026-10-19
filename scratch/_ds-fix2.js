'use strict';
const fs = require('fs');
const P = 'project-design/99-ai/design-status.md';
let L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
const rules = [
  ['| 本轮动作 |', '| 本轮动作 | **`SPEC-003` / `SPEC-004` 的 `CLARIFY`（CHG-019）**：**六条问题同日全部定稿** —— **`Q-046`** ⇒ **等级判定真源 = `SPEC-003` 的学职引擎**（`SPEC-002` 只消费；依据：`REQ-004` 规定等级由累计创作积分定级 + `feature-map` 依赖方向已含 `SPEC-003` + 与 `SPEC-001` 委托化先例同构）；**`Q-047`** ⇒ 沿用 `localStorage`；**`Q-048`** ⇒ 演示态模拟下载；**`Q-049`** ⇒ **两阶段迁移**（先建壳后迁内；实测弹窗绑定 **10 处**）；**`Q-050`** ⇒ **分源池真源归 `SPEC-009`**（过渡期沿用既有入口，🔴 不得新增"池"）；**`Q-051`** ⇒ 需新增工具维度数据集合。⇒ 两份 spec 各新增 **§7.6 CLARIFY 结论**；`DA-003-04` / `DA-004-01` / `DA-004-02` 升级为已确认。**未改业务代码**（本轮只动文档） |'],
  ['→ 生命周期位置：', '→ 生命周期位置：[*] → PROJECT_INITIALIZATION → CLARIFY（P0 批次）→ SPECIFY → CLARIFY（Feature 级）→ CHECKLIST → PLAN → TASKS → **IMPLEMENT（`SPEC-001` Phase 1 ✅ / `SPEC-017` Phase 1 ✅ 均已落地）** → **`SPEC-003` / `SPEC-004` 的 `SPECIFY` ✅ + `CLARIFY` ✅（`CHG-018` + `CHG-019`）** → [下一批：二者的 `PLAN` / `TASKS` / 实现]'],
];
let hit = 0, miss = [];
rules.forEach(([pre, to]) => {
  const i = L.findIndex((l) => l.startsWith(pre));
  if (i >= 0) { L[i] = to; hit++; } else miss.push(pre);
});
fs.writeFileSync(P, L.join('\n'));
console.log('design-status：替换 ' + hit + '/' + rules.length + (miss.length ? '｜⚠️ 未命中：' + miss.join(' ; ') : ''));
