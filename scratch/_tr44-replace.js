'use strict';
const fs = require('fs');
const P = 'project-design/01-requirements/traceability.md';
const L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
const i = L.findIndex(function (l) { return /^### 4\.4 /.test(l); });
if (i < 0) { console.log('未找到 §4.4'); process.exit(1); }
// 终点：下一个 `---` 分隔线（§4.4 段末）
let j = -1;
for (let k = i + 1; k < L.length; k++) { if (/^---\s*$/.test(L[k])) { j = k; break; } }
if (j < 0) { console.log('未找到 §4.4 终点'); process.exit(1); }
let neo = fs.readFileSync('ai-creator-community-wh/scratch/_tr44.txt', 'utf8').split(/\r?\n/);
while (neo.length && neo[neo.length - 1].trim() === '') neo.pop();
const before = L.length;
L.splice(i, j - i, ...neo);
fs.writeFileSync(P, L.join('\n'));
console.log('§4.4 替换：行 ' + (i + 1) + ' ~ ' + j + ' → ' + neo.length + ' 行｜总行数 ' + before + ' → ' + L.length);
