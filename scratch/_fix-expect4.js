'use strict';
/** 同步 _spec017-consistency.js 的期望值（CHG-020）。 */
const fs = require('fs');
const P = 'ai-creator-community-deepseek/ai-creator-community-wh/scratch/_spec017-consistency.js';
const ALT = 'ai-creator-community-wh/scratch/_spec017-consistency.js';
const F = fs.existsSync(P) ? P : ALT;
let s = fs.readFileSync(F, 'utf8');
const before = s.length;
let n = 0;
function sub(a, b, label) {
  if (!s.includes(a)) { console.log('⚠️ 未命中：' + (label || a.slice(0, 40))); return; }
  s = s.split(a).join(b); n++;
}

// ① workspace-state 期望：状态与红灯数
sub("'SPEC003_004_CLARIFIED'", "'SPEC003_TASKED'", 'phase_status');
sub("'l3_red_suites: 0'", "'l3_red_suites: 1'", 'l3_red_suites');
sub("'l3_red_suites: 0'", "'l3_red_suites: 1'", 'l3_red_suites-2');
sub("'specs_tasked: 2'", "'specs_tasked: 3'", 'specs_tasked');
sub("'specs_planned: 2'", "'specs_planned: 3'", 'specs_planned');
sub("'data_models: 2'", "'data_models: 3'", 'data_models');
sub("'research_docs: 2'", "'research_docs: 3'", 'research_docs');

// ② SPEC-003 的 spec.md 期望：加 TASKED 与四件相关词
sub("'specs/003-growth-academy/spec.md': ['CLARIFIED'",
    "'specs/003-growth-academy/spec.md': ['TASKED', '0/77'", 'spec003 spec');

// ③ 新增四件 + 套件的创建状态检查
const anchor = '  ai-creator-community-wh/tools/wb-content-asset-verify.js   存在';
const add = [
  "  specs/003-growth-academy/spec.md                             存在",
  "  specs/003-growth-academy/plan.md                             存在",
  "  specs/003-growth-academy/tasks.md                            存在",
  "  specs/003-growth-academy/data-model.md                       存在",
  "  specs/003-growth-academy/research.md                         存在",
  "  ai-creator-community-wh/tools/wb-growth-academy-verify.js    存在",
].join(',\n');
if (s.includes(anchor) && !s.includes('wb-growth-academy-verify.js')) {
  s = s.replace(anchor, anchor + ',\n' + add);
  n++;
  console.log('已补 6 项创建状态检查');
} else if (s.includes('wb-growth-academy-verify.js')) {
  console.log('创建状态检查已存在，跳过');
}

fs.writeFileSync(F, s);
console.log('期望值同步：' + n + ' 处｜字节 ' + before + ' → ' + s.length);
