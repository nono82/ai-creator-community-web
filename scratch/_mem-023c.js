'use strict';
/** MEMORY.md：合并 CHG-020 / CHG-021 两行（细节已在 change-impact 与 PITFALLS）。 */
const fs = require('fs');
const P = '.workbuddy/memory/MEMORY.md';
let L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
const b = Buffer.byteLength(L.join('\n'), 'utf8');
const i20 = L.findIndex(function (l) { return l.startsWith('- **`CHG-020`**（2026-09-25）='); });
const i21 = L.findIndex(function (l) { return l.startsWith('- **`CHG-021`**（2026-09-25）='); });
if (i20 < 0) { console.log('未找到 CHG-020'); process.exit(0); }
L[i20] = '- **`CHG-020` / `CHG-021`**（2026-09-25）= `SPEC-003` 的（立红 + `PLAN` + `TASKS`）→ Phase 1 的 `IMPLEMENT`：**31 项全落地，`0/77` → `77/77`**（+ 不变量 10/10）；**修复 4 处 + 立红新测出的 4 处**；`index.html` 1 处、`css` 零改动。⚠️ **新增 `RISK-003-08`：口径收敛使依赖旧口径的既有套件断言失效** ⇒ 同步期望（**非放宽标准**）⇒ **受影响文件清单必须含「断言侧」**（`PITFALLS-ARCHIVE.md` §O）。';
if (i21 > i20) L.splice(i21, 1);
fs.writeFileSync(P, L.join('\n'));
const a = Buffer.byteLength(L.join('\n'), 'utf8');
console.log('MEMORY.md：' + b + ' → ' + a + (a <= 16384 ? ' ✅ 在 16KB 内' : ' ⚠️ 超 ' + (a - 16384) + ' B'));
