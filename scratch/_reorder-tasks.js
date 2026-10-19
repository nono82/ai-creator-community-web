'use strict';
// 一次性结构重排：把 tasks.md 的 §⑩ 实施结果 移到 §⑨ 不做什么 之后（scratch/ 过程产物）
const fs = require('fs');
const path = require('path');
const P = path.resolve(__dirname, '..', '..', 'specs', '001-identity-onboarding', 'tasks.md');
const src = fs.readFileSync(P, 'utf8');
const NL = src.indexOf('\r\n') >= 0 ? '\r\n' : '\n';
const L = src.split(/\r?\n/);

const i10 = L.findIndex((l) => /^## ⑩ /.test(l));
const i9 = L.findIndex((l) => /^## ⑨ /.test(l));
const iEnd = L.findIndex((l) => /^## 变更记录/.test(l));
if (i10 < 0 || i9 < 0 || iEnd < 0 || !(i10 < i9 && i9 < iEnd)) {
  console.error('定位失败: i10=' + i10 + ' i9=' + i9 + ' iEnd=' + iEnd);
  process.exit(1);
}

// 区块 A = §⑩（含其前的 `---` 分隔与空行）→ 截取 [i10, i9-1]
let aStart = i10;
while (aStart - 1 >= 0 && (/^---\s*$/.test(L[aStart - 1]) || L[aStart - 1].trim() === '')) aStart--;
const block10 = L.slice(aStart, i9);           // §⑩ 区块（含前置分隔）
const block9 = L.slice(i9, iEnd);              // §⑨ 区块
const head = L.slice(0, aStart);

const out = head.concat(block9, block10, L.slice(iEnd));
fs.writeFileSync(P, out.join(NL), 'utf8');
console.log('重排完成：§⑩ 已移到 §⑨ 之后');
console.log('章节顺序：');
out.filter((l) => /^## /.test(l)).forEach((l) => console.log('  ' + l));
