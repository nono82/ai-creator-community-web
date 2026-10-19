'use strict';
const fs = require('fs');
const P = '.workbuddy/memory/MEMORY.md';
const before = fs.readFileSync(P, 'utf8').length;
let L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
const rules = [
  ['- **`SPEC-001` 进度**：',
    '- **`SPEC-001` 进度**：Phase 1 已完成（`CHG-013`）—— 24 项、DoD 9/9；能力 = `checkAdmission` + `evaluateAgeGate`（日期不可解析亦拒）+ 3 个守卫 + 委托化 `isCredentialMet` + 审计留痕。'],
  ['- **`SPEC-017` 规模**：',
    '- **`SPEC-017` 规模**：11 US / **16 SC** / **45 FR（7 组）** / 18 EX / **9 DA**。核心命题「**只存一份、多处引用、归零才收**」；冻结**五项契约**。**Phase 1 = 26 项 ✅ 已落地（`CHG-017`）/ Phase 2 = 10 项登记**。'],
  ['- **`CHG-019`**（2026-09-25）',
    '- **`CHG-019`**（2026-09-25）= 二者同日 `CLARIFY`（**六条定稿，含三条 P1**）：**真源归属类的判据 = 因果链而非偏好**（`Q-046`：`REQ-004` 定等级由积分定级 + 积分的唯一来源在成长学院）；**结构级迁移默认「两阶段 + 兼容层」**；**「上游未落地」≠「可以自建」**（过渡期用既有入口，禁造临时池）。'],
  ['- **成长学院 / 创作工具（',
    '- **成长学院 / 创作工具（`SPEC-003` / `SPEC-004` 已 `CLARIFIED`，`CHG-018` + `CHG-019`）**：**等级口径取 `Q-003` 裁决值**（`0/200/500/2000/5000`，命名**无 `AI` 前缀**）；**加分唯一入口** `awardLearningPoints`（课节 +30 / 心得 +5 / 教材 +5 / 领证 +100）；付费课程走**账户余额**；**AI 工具详情页 = 路由级页面**。'],
];
let hit = 0, miss = [];
rules.forEach(([pre, to]) => {
  const i = L.findIndex((l) => l.startsWith(pre));
  if (i >= 0) { L[i] = to; hit++; } else miss.push(pre.slice(0, 20));
});
fs.writeFileSync(P, L.join('\n'));
const after = fs.readFileSync(P, 'utf8').length;
console.log('替换 ' + hit + '/' + rules.length + '｜字节 ' + before + ' → ' + after + (after <= 16384 ? ' ✅' : ' ⚠️ 超 ' + (after - 16384) + ' B') + (miss.length ? '｜未命中：' + miss.join(' ; ') : ''));
