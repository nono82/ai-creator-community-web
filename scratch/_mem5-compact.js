'use strict';
const fs = require('fs');
const P = '.workbuddy/memory/MEMORY.md';
const before = fs.readFileSync(P, 'utf8').length;
let L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
const rules = [
  ['- **内容资产层（',
    '- **内容资产层（`SPEC-017` Phase 1 已落地，`CHG-017`）**：对象键 = `creator/{userId}/{digest}`（**用户级去重**）；**引用记录 = 唯一真源**（`refCount` 不落库，计数**重算**）；**两阶段回收**（归零 ⇒ `pendingGC`，**禁物理删除**；窗口 `null` ⇒ **不得回收**）。'],
  ['- **成长学院 / 创作工具（',
    '- **成长学院 / 创作工具（`SPEC-003` / `SPEC-004` 已 `SPECIFIED`，`CHG-018`）**：**等级口径取 `Q-003` 裁决值**（`0/200/500/2000/5000`，命名**无 `AI` 前缀**）；**加分唯一入口** `awardLearningPoints`（课节 +30 / 心得 +5 / 教材 +5 / 领证 +100）；付费课程走**账户余额**；**AI 工具详情页 = 路由级页面**；资产一律走 `SPEC-017`。'],
  ['- **`SPEC-001` 进度**：',
    '- **`SPEC-001` 进度**：Phase 1 已完成（`CHG-013`）—— 24 项、DoD 9/9；能力 = `checkAdmission`（唯一入口，幂等无副作用）/ `evaluateAgeGate`（日期不可解析亦拒）/ 3 个守卫（零副作用）/ 委托化（真源 `isCredentialMet`）/ 审计留痕。'],
];
let hit = 0;
const out = [];
L.forEach((l) => {
  for (const [pre, to] of rules) { if (l.startsWith(pre)) { hit++; out.push(...to.split('\n')); return; } }
  out.push(l);
});
fs.writeFileSync(P, out.join('\n'));
const after = fs.readFileSync(P, 'utf8').length;
console.log('替换 ' + hit + '/' + rules.length + '｜字节 ' + before + ' → ' + after + (after <= 16384 ? ' ✅ 在 16KB 内' : ' ⚠️ 仍超 ' + (after - 16384) + ' B'));
