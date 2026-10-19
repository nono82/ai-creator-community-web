'use strict';
/**
 * 修正 toolDetails 的插入位置。
 * 问题：`leaderboard` 是 `tools` 的**最后一个键** ⇒ 其闭合是 `    ]`（**无逗号**），
 *   而脚本的正则要求带逗号 ⇒ 误匹配到 `community.hotTopics` 的 `    ],`（第 1506 行）。
 * 修正：① 移除错位块；② 给 leaderboard 的 `]` 补逗号；③ 在正确位置重新插入。
 */
const fs = require('fs');
const P = 'js/mock_data.js';
let L = fs.readFileSync(P, 'utf8').split(/\r?\n/);

// ---------- ① 定位并移除错位块 ----------
const start = L.findIndex(function (l) { return /^    toolDetails: \{$/.test(l); });
if (start < 0) { console.log('未找到错位的 toolDetails 块'); process.exit(1); }
let depth = 0, end = -1, seen = false;
for (let k = start; k < L.length; k++) {
  const l = L[k];
  const o = (l.match(/\{/g) || []).length, c = (l.match(/\}/g) || []).length;
  depth += o - c;
  if (o > 0) seen = true;
  if (seen && depth === 0) { end = k; break; }
}
if (end < 0) { console.log('未找到块结束位置'); process.exit(1); }
// 连同紧随其后的空行一起移除
let tail = end;
while (L[tail + 1] !== undefined && L[tail + 1].trim() === '') tail++;
const block = L.slice(start, end + 1);
console.log('移除错位块：第 ' + (start + 1) + ' ~ ' + (end + 1) + ' 行（' + block.length + ' 行）');
L.splice(start, tail - start + 1);

// ---------- ② 给 leaderboard 的闭合补逗号 ----------
const iLb = L.findIndex(function (l) { return /^    leaderboard: \[/.test(l); });
if (iLb < 0) { console.log('未找到 leaderboard'); process.exit(1); }
let lbEnd = -1;
for (let k = iLb + 1; k < iLb + 20; k++) { if (/^    \]\s*$/.test(L[k])) { lbEnd = k; break; } }
if (lbEnd < 0) { console.log('未找到 leaderboard 的无逗号闭合'); process.exit(1); }
L[lbEnd] = '    ],';
console.log('leaderboard 闭合已补逗号（第 ' + (lbEnd + 1) + ' 行）');

// ---------- ③ 在正确位置插入 ----------
L.splice(lbEnd + 1, 0, '', ...block);
fs.writeFileSync(P, L.join('\n'));
console.log('toolDetails 已插入于第 ' + (lbEnd + 2) + ' 行起｜总行数 ' + L.length);
