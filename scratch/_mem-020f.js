'use strict';
/** MEMORY.md 第六轮微压（目标 ≤ 16384 B）。 */
const fs = require('fs');
const P = '.workbuddy/memory/MEMORY.md';
const L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
const snap = L.slice();
const before = Buffer.byteLength(fs.readFileSync(P, 'utf8'), 'utf8');

const rules = [
  ['- **V1.0 硬门槛**：',
   '- **V1.0 硬门槛**：`Q-035` 法务书面确认 + `Q-019` PoC 验证（`ADR-0005` 的 6 项 Revisit）。'],
  ['- 🔑 **给建议时也自查是否违反项目自己的门禁**',
   '- 🔑 **给建议时也自查是否违反项目自己的门禁**（见 `PITFALLS-ARCHIVE.md` §K.3）。'],
  ['- **登记缺口**：',
   '- **登记缺口**：`GAP-7` / `GAP-8` / `GAP-9` ⇒ Phase 2；**`GAP-10`（`REQ-084` 悬空引用）/ `GAP-11`（编号状态跨行矛盾）/ `GAP-12`（版权确权无归属）**。'],
];

let hit = 0, miss = [];
rules.forEach(function (pair) {
  const k = snap.findIndex(function (l) { return l.startsWith(pair[0]); });
  if (k >= 0) { L[k] = pair[1]; hit++; } else miss.push(pair[0].slice(0, 22));
});
fs.writeFileSync(P, L.join('\n'));
const after = Buffer.byteLength(fs.readFileSync(P, 'utf8'), 'utf8');
console.log('替换 ' + hit + '/' + rules.length + '｜字节 ' + before + ' → ' + after + (after <= 16384 ? ' ✅ 余 ' + (16384 - after) + ' B' : ' ⚠️ 超 ' + (after - 16384) + ' B') + (miss.length ? '｜未命中：' + miss.join(' ; ') : ''));
