'use strict';
/** 修正 tools/README.md 第 3 条规则（该行无前导空格）。 */
const fs = require('fs');
const P = 'ai-creator-community-wh/tools/README.md';
const L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
const i = L.findIndex(function (l) { return l.startsWith('合计 **2,256 项** L3 断言'); });
if (i < 0) { console.log('⚠️ 仍未命中'); process.exit(1); }
L[i] = '合计 **2,256 项** L3 断言（**12 套全绿**，含 `wb-identity-admission-verify` 53 项 + `wb-content-asset-verify` 73 项）；🔴 **另有 1 套红灯**（`wb-growth-academy-verify`，功能断言 **0/77**，**不计入**断言合计）；另有 DUP **492 键 0 重复**、L2 6 项、L1 存量 **7 ERROR**（= 基线，属既有 FU-002 命名漂移）。';
fs.writeFileSync(P, L.join('\n'));
console.log('tools/README：已修正第 ' + (i + 1) + ' 行');
