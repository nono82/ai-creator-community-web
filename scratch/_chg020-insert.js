'use strict';
/** 把 scratch/_chg020.md 插入 change-impact.md 的 CHG-019 之前（该文件为降序：CHG-010 ~ CHG-020）。 */
const fs = require('fs');
const P = 'project-design/99-ai/change-impact.md';
const L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
const i = L.findIndex(function (l) { return /^## CHG-019/.test(l); });
if (i < 0) { console.log('未找到 CHG-019 锚点'); process.exit(1); }
const neo = fs.readFileSync('ai-creator-community-wh/scratch/_chg020.md', 'utf8').split(/\r?\n/);
while (neo.length && neo[neo.length - 1].trim() === '') neo.pop();
L.splice(i, 0, ...neo);
fs.writeFileSync(P, L.join('\n'));
console.log('change-impact：CHG-020 插入于第 ' + (i + 1) + ' 行之前（' + neo.length + ' 行）｜总行数 → ' + L.length);
