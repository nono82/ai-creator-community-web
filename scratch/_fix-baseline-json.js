'use strict';
/** 修复 gates-baseline.json 的 notes：为裸文本行补双引号 + 去尾随逗号。 */
const fs = require('fs');
const P = 'tools/gates-baseline.json';
const L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
let fixed = 0;

for (let i = 0; i < L.length; i++) {
  const raw = L[i];
  const t = raw.trim();
  if (!t) continue;
  // 裸文本行：不以双引号开头、不是结构行（{ } [ ] 或 "key":）
  if (/^[^"\[\]{}]/.test(t) && !/^"/.test(t) && !/^[\]}]/.test(t)) {
    L[i] = '    "' + t.replace(/",?$/, '') + '",';
    fixed++;
    console.log('  补引号 L' + (i + 1) + '：' + t.slice(0, 46) + '…');
  }
}
// 去尾随逗号：数组最后一个元素后不得有逗号
for (let i = L.length - 1; i >= 0; i--) {
  const t = L[i].trim();
  if (!t) continue;
  if (t === ']' || t === ']' ) {
    // 往上找第一个非空行，若以 ',"结尾则去掉逗号
    for (let j = i - 1; j >= 0; j--) {
      const u = L[j];
      if (!u.trim()) continue;
      if (/,$/.test(u.trim())) { L[j] = u.replace(/,\s*$/, ''); fixed++; console.log('  去尾逗号 L' + (j + 1)); }
      break;
    }
    break;
  }
}
const out = L.join('\n');
fs.writeFileSync(P, out);
try {
  const j = JSON.parse(out);
  console.log('\n✅ JSON 合法｜修复 ' + fixed + ' 处｜notes 条数 ' + (j.notes || []).length + '｜l3AssertionTotal=' + j.l3AssertionTotal + '｜l3Suites=' + j.l3Suites + '｜l3ExpectedRed=' + JSON.stringify(j.l3ExpectedRed));
} catch (e) {
  console.log('\n❌ 仍不合法：' + e.message);
}
