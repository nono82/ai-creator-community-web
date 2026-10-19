'use strict';
/** SPEC-004 立红数字同步：123 → 124（补 D30 后），137 → 138，2480 → 2481。 */
const fs = require('fs');
const files = [
  'specs/004-creator-tools/plan.md',
  'specs/004-creator-tools/tasks.md',
  'ai-creator-community-wh/tools/gates-baseline.json',
];
// 顺序：先长后短，避免链式误替换
const pairs = [
  ['4/123', '4/124'],
  ['123/123', '124/124'],
  ['x/123', 'x/124'],
  ['**123 + 14 项断言**', '**124 + 14 项断言**'],
  ['**123 功能 + 14 不变量**', '**124 功能 + 14 不变量**'],
  ['123 项功能断言', '124 项功能断言'],
  ['2343 + 137 = 2480', '2343 + 138 = 2481'],
  ['2343 → 2480', '2343 → 2481'],
  ['（**+137**）', '（**+138**）'],
  ['20/129 →（逐项复核 + 补前置）→ 4/123', '20/129 →（逐项复核 + 合并同类 + 补前置）→ 4/124'],
  ['20/129 → 逐项复核后加固为 4/123', '20/129 → 逐项复核后加固为 4/124'],
];
files.forEach(function (P) {
  let s = fs.readFileSync(P, 'utf8');
  const before = Buffer.byteLength(s, 'utf8');
  let n = 0;
  pairs.forEach(function (p) {
    const c = s.split(p[0]).length - 1;
    if (c > 0) { s = s.split(p[0]).join(p[1]); n += c; }
  });
  fs.writeFileSync(P, s);
  console.log(P + ' → 替换 ' + n + ' 处｜字节 ' + before + ' → ' + Buffer.byteLength(s, 'utf8'));
});
