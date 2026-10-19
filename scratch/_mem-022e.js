'use strict';
/** MEMORY.md 四次微压（差 159 B）。 */
const fs = require('fs');
const P = '.workbuddy/memory/MEMORY.md';
let L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
const before = Buffer.byteLength(L.join('\n'), 'utf8');
const snap = L.slice();
let hit = 0;
const miss = [];
function rep(pre, to, label) {
  const i = snap.findIndex(function (l) { return l.startsWith(pre); });
  if (i >= 0) { L[i] = to; hit++; } else miss.push(label);
}

rep('- **仍未决**：',
  '- **仍未决**：**`Q-043` 剩余两处（窗口时长 + 注销后处置，与 `Q-041` 合并取法务口径）** / **`Q-041`（合规参数不得伪造）** / `Q-044`（配额计费）/ `Q-045`（版权确权 —— **Feature Map 缺口**）/ `Q-037` / `Q-039`（**未预设数值**）/ `Q-040` / `Q-007~010` / `Q-013~018` / `Q-021~027`。**（`Q-046` / `Q-049` / `Q-050` 已于 `CHG-019` 定稿）**',
  '仍未决');

rep('- **个人信息留存（`NFR-016` / `Q-041`）**：',
  '- **个人信息留存（`NFR-016` / `Q-041`）**：须有**留存期限 + 可删除 / 可匿名化能力**；**期限与注销后释放范围待 `Q-041`**（不得伪造）。注销后：**手机号释放**、**身份证号解绑但保留不可逆摘要**（⚠️ 「防刷新」**不得**用"注销时清零积分"实现）。',
  '个人信息留存');

rep('- 工作方式：',
  '- 工作方式：**`AGENTS.md` 为唯一准则**（Spec-Driven Development）。**工序 =「契约先行 → 立红 → `PLAN` → `TASKS` → 最小实现 → 回填收敛」** —— 已在 **`SPEC-001` / `SPEC-017` / `SPEC-003` 三次**完整走通（各含立红 → 转绿）。**三者 = `IMPLEMENTED`（Phase 1）**；**`SPEC-004` = `TASKED`**（四件齐备 + 立红 4/126）；其余 12 个 = `IDEA`（**不预生成**）。',
  '工作方式');

fs.writeFileSync(P, L.join('\n'));
const after = Buffer.byteLength(L.join('\n'), 'utf8');
console.log('MEMORY.md 四次微压：替换 ' + hit + '/3｜' + before + ' → ' + after + (after <= 16384 ? ' ✅ 在 16KB 内' : ' ⚠️ 超 ' + (after - 16384) + ' B'));
if (miss.length) console.log('未命中：' + miss.join(' ; '));
