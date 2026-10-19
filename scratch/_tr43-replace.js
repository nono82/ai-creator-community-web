'use strict';
const fs = require('fs');
const P = 'project-design/01-requirements/traceability.md';
const L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
const i = L.findIndex(function (l) { return /^### 4\.3 /.test(l); });
const j = L.findIndex(function (l) { return /^### 4\.4 /.test(l); });
if (i < 0 || j < 0) { console.log('锚点未找到'); process.exit(1); }
let neo = fs.readFileSync('ai-creator-community-wh/scratch/_tr43.txt', 'utf8').split(/\r?\n/);
while (neo.length && neo[neo.length - 1].trim() === '') neo.pop();
const before = L.length;
L.splice(i, j - i, ...neo, '');
fs.writeFileSync(P, L.join('\n'));
console.log('§4.3 替换：行 ' + (i + 1) + '~' + j + ' → ' + (neo.length + 1) + ' 行｜总行数 ' + before + ' → ' + L.length);
