'use strict';
/** baseline：在 notes 末尾追加 L1 下调（7 → 5）的记录。 */
const fs = require('fs');
const P = 'tools/gates-baseline.json';
const L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
if (L.some(function (l) { return l.indexOf('L1 契约 ERROR 由 7 → 5') >= 0; })) { console.log('已存在，跳过'); process.exit(0); }
// 找 notes 数组的最后一条（`    "` 开头且其后是 `  ]`）
let last = -1;
for (let k = L.length - 1; k >= 0; k--) {
  if (/^    "/.test(L[k])) { last = k; break; }
}
if (last < 0) { console.log('未找到 notes 末条'); process.exit(1); }
L[last] = L[last].replace(/,\s*$/, '') + ',';
const rows = [
  '    "【L1 契约 ERROR 由 7 → 5（**下调**，CHG-023）】本 Feature 实现了 L1 文档契约所声明的两个函数名 —— **`App.openStudioModal()`**（`整体设计.md` 声明）与 **`App.applyTemplateToWorkspace()`**（`创作工具设计.md` 声明，且与 `SPEC-003` 的 R4 **共用同一契约名**）⇒ 二者对应的 ERROR 消失。",',
  '    "  ⚠️ **基线下调也必须显式记录**（不得静默改数）。剩余 **5 个 ERROR 均不属本 Feature**：`showAcademyCoursesPage` / `openMyCerts` ×2（**`SPEC-003` 遗留 —— 见 `GAP-13`**）、`showTaskPublishPage` / `openTaskDetail`（**`SPEC-006` 范围**）。"',
];
L.splice(last + 1, 0, ...rows);
fs.writeFileSync(P, L.join('\n'));
const j = JSON.parse(fs.readFileSync(P, 'utf8'));
console.log('baseline：notes 已追加 2 条｜共 ' + j.notes.length + ' 条｜l1ErrorBaseline=' + j.l1ErrorBaseline);
