'use strict';
/** 落盘 SPEC-003 的 CLARIFY 结论（§十四 状态 + DA-003-04）。 */
const fs = require('fs');
const P = 'specs/003-growth-academy/spec.md';
let L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
const rules = [
  ['| **Q-046** | **P1** |', '| **Q-046** | ~~P1~~ | **学职引擎与 `SPEC-002`（创作者等级与双轨认证）的边界** —— 等级判定应由成长学院（`academy.paths`）还是由 `SPEC-002` 的认证体系持有？二者都涉及"等级" | 决定**真源归属**；若两边各持一份 ⇒ 立刻形成第二事实源 | ✅ **已于 2026-09-25 `CLARIFY` 定稿**：**由本 Feature（学职引擎）持有判定真源**、`SPEC-002` 只消费；三条实测依据见 **§7.6**。⇒ 落为 `DA-003-04`（已确认）。⚠️ **须在 `SPEC-002` 的 `SPECIFY` 时复核** | 架构 + 产品 | **RESOLVED（2026-09-25）** |'],
  ['| **Q-047** | P2 |', '| **Q-047** | ~~P2~~ | **学习数据是否需跨设备 / 跨会话持久化**（现为会话内存 + `localStorage`） | 影响验收口径与 Stage B 规模 | ✅ **已于 2026-09-25 `CLARIFY` 定稿**：**沿用既有模式（会话内存 + `localStorage`）**，不引入新机制；Stage B 再并入后端（见 §7.6） | 产品 + 架构 | **RESOLVED（2026-09-25）** |'],
  ['| **Q-048** | P2 |', '| **Q-048** | ~~P2~~ | **资源下载是否需要真实文件**（现为演示态 +5 加分） | 影响 R2 的验收深度 | ✅ **已于 2026-09-25 `CLARIFY` 定稿**：**演示态为「模拟下载 + 加分」**，不产出真实文件；真实文件属 Stage B（见 §7.6） | 产品 | **RESOLVED（2026-09-25）** |'],
  ['| **DA-003-04** | 等级门槛**可配置**（不硬编码数值） | `Q-003` 明确要求 | —— |', '| **DA-003-04** | 等级门槛**可配置**（不硬编码数值）；**且等级判定的真源在本 Feature** | `Q-003` 明确要求；`Q-046` 已于 2026-09-25 `CLARIFY` 定稿（见 §7.6） | 若 `SPEC-002` 需自持判定 ⇒ 须重划边界并迁移加分链路 |'],
];
let hit = 0, miss = [];
rules.forEach(([pre, to]) => {
  const i = L.findIndex((l) => l.startsWith(pre));
  if (i >= 0) { L[i] = to; hit++; } else miss.push(pre.slice(0, 24));
});
fs.writeFileSync(P, L.join('\n'));
console.log('SPEC-003：替换 ' + hit + '/' + rules.length + (miss.length ? '｜⚠️ 未命中：' + miss.join(' ; ') : ''));
