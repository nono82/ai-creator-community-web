'use strict';
/** 一次性同步 traceability.md（CHG-018）：§一 加状态注 + §三 追加 Q-046~051 映射。 */
const fs = require('fs');
const P = 'project-design/01-requirements/traceability.md';
let L = fs.readFileSync(P, 'utf8').split(/\r?\n/);

const note = [
  '',
  '> **2026-09-25 状态更新**：`REQ-101 ~ REQ-108`（成长学院）**已由 `SPEC-003` 完成 `SPECIFY`**（`specs/003-growth-academy/spec.md`，14 US / 20 SC / 53 FR（9 组）/ 19 EX）；`REQ-201 ~ REQ-206`（创作工具）**已由 `SPEC-004` 完成 `SPECIFY`**（`specs/004-creator-tools/spec.md`，15 US / 16 SC / 37 FR（8 组）/ 15 EX）。⚠️ 其中 **`REQ-203`（三种集成模式路由）为 `SPEC-004` 与 `SPEC-005` 共担** —— `SPEC-004` 只负责**卡片点击的路由行为**，第三方工具的**真实集成与结算**归 `SPEC-005`（`Q-007` 未决）。',
];

const qRows = [
  "| **Q-046** | **`SPEC-003` `FR-003-04`、`DA-003-04`、`S-3`、`§7.1`（等级口径真源）、`SPEC-002`** —— ⚠️ **OPEN（2026-09-25 新开，P1）**：等级判定由谁持有？答错即**第二事实源** |",
  "| **Q-047** | `SPEC-003` `DA-003-02`、`NFR` 持久化 —— ⚠️ **OPEN（2026-09-25 新开，P2）** |",
  "| **Q-048** | `SPEC-003` `FR-003-38`（R2 下载） —— ⚠️ **OPEN（2026-09-25 新开，P2）** |",
  "| **Q-049** | **`SPEC-004` `§7.2`、`FR-004-07`、`DA-004-02`、`SC-004-01`**、`REQ-202` —— ⚠️ **OPEN（2026-09-25 新开，P1；结构级迁移属高回归风险区）** |",
  "| **Q-050** | **`SPEC-004` `FR-004-15` / `FR-004-18`、`DA-004-01`、`SC-004-15`、`EX-004-09`**、`REQ-204`、`SPEC-009` —— ⚠️ **OPEN（2026-09-25 新开，P1；🔴 分源池未就绪前不得伪造）** |",
  "| **Q-051** | `SPEC-004` `FR-004-08` / `FR-004-10`、`SC-004-03`、`MockData.tools.allTools` —— ⚠️ **OPEN（2026-09-25 新开，P2；现状无数据支撑）** |",
];

// ① 在 §二 之前插入状态注
const i2 = L.findIndex((l) => /^## 二、NFR/.test(l));
if (i2 > 0 && !L.slice(0, i2).some((l) => /2026-09-25 状态更新/.test(l))) {
  L.splice(i2, 0, ...note);
  console.log('已插入 §一 状态注');
}
// ② 在 §四 之前插入 Q 映射行
const i4 = L.findIndex((l) => /^## 四、Feature 粒度追踪/.test(l));
if (i4 > 0 && !L.slice(0, i4).some((l) => /Q-046/.test(l))) {
  L.splice(i4, 0, ...qRows);
  console.log('已插入 §三 的 Q-046~051 映射（6 行）');
}
fs.writeFileSync(P, L.join('\n'));
console.log('总行数', L.length);
