'use strict';
/** SPEC-004 数字二次同步：124 → 126，138 → 140，2481 → 2483（补 B10/B11 之后）。 */
const fs = require('fs');
const files = [
  'specs/004-creator-tools/plan.md',
  'specs/004-creator-tools/tasks.md',
  'specs/004-creator-tools/spec.md',
  'ai-creator-community-wh/tools/gates-baseline.json',
];
const pairs = [
  ['4/124', '4/126'],
  ['124/124', '126/126'],
  ['x/124', 'x/126'],
  ['**124 + 14 项断言**', '**126 + 14 项断言**'],
  ['**124 功能 + 14 不变量**', '**126 功能 + 14 不变量**'],
  ['124 项功能断言', '126 项功能断言'],
  ['**17 项契约 / 124 项功能断言 / 14 项不变量**', '**17 项契约 / 126 项功能断言 / 14 项不变量**'],
  ['2343 + 138 = 2481', '2343 + 140 = 2483'],
  ['2343 → 2481', '2343 → 2483'],
  ['（**+138**）', '（**+140**）'],
  ['→ 4/124', '→ 4/126'],
  ['**新增能力 0/124**', '**新增能力 0/126**'],
  ['**新增能力 0/123**', '**新增能力 0/126**'],
];
files.forEach(function (P) {
  let s = fs.readFileSync(P, 'utf8');
  const before = Buffer.byteLength(s, 'utf8');
  let n = 0;
  pairs.forEach(function (p) { const c = s.split(p[0]).length - 1; if (c > 0) { s = s.split(p[0]).join(p[1]); n += c; } });
  fs.writeFileSync(P, s);
  console.log(P + ' → ' + n + ' 处｜' + before + ' → ' + Buffer.byteLength(s, 'utf8'));
});
