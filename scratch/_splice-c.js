'use strict';
const fs = require('fs');
const P = 'tools/wb-growth-academy-verify.js';
const NEWF = 'scratch/_c-group.txt';
const lines = fs.readFileSync(P, 'utf8').split(/\r?\n/);
const i = lines.findIndex(function (l) { return l.includes("console.log(' C 组 · 课节完成唯一入口');"); });
if (i < 0) { console.log('未找到 C 组起点'); process.exit(1); }
let j = -1;
for (let k = i + 1; k < lines.length; k++) { if (lines[k] === '}') { j = k; break; } }
if (j < 0) { console.log('未找到 C 组终点'); process.exit(1); }
let neo = fs.readFileSync(NEWF, 'utf8').split(/\r?\n/);
while (neo.length && neo[neo.length - 1].trim() === '') neo.pop();
const before = lines.length;
lines.splice(i, j - i + 1, ...neo);
fs.writeFileSync(P, lines.join('\n'));
console.log('C 组替换：行 ' + (i + 1) + '~' + (j + 1) + '（' + (j - i + 1) + ' 行）→ ' + neo.length + ' 行｜总行数 ' + before + ' → ' + lines.length);
