'use strict';
/** T-004-25：把 toolDetails 插入 mock_data.js 的 tools 对象内（leaderboard 之后）。 */
const fs = require('fs');
const P = 'js/mock_data.js';
let L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
if (L.some(function (l) { return l.indexOf('toolDetails:') >= 0; })) { console.log('已存在 toolDetails，跳过'); process.exit(0); }

// 定位 leaderboard 数组
const iLb = L.findIndex(function (l) { return /^\s+leaderboard: \[/.test(l); });
if (iLb < 0) { console.log('未找到 leaderboard'); process.exit(1); }
let end = -1;
for (let k = iLb + 1; k < iLb + 20; k++) { if (/^\s+\],\s*$/.test(L[k])) { end = k; break; } }
if (end < 0) { console.log('未找到 leaderboard 闭合'); process.exit(1); }

let neo = fs.readFileSync('scratch/_tool-details.txt', 'utf8').split(/\r?\n/);
while (neo.length && neo[neo.length - 1].trim() === '') neo.pop();

// leaderboard 的 `],` 改为 `],` + 空行 + toolDetails 块
const block = [''].concat(neo);
L.splice(end + 1, 0, ...block);
fs.writeFileSync(P, L.join('\n'));
console.log('toolDetails 已插入（leaderboard 之后，第 ' + (end + 2) + ' 行起，共 ' + block.length + ' 行）｜总行数 ' + L.length);
