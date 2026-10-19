'use strict';
/** 同步 design-status 与 _spec017-consistency.js 的计数期望（45 → 51）。 */
const fs = require('fs');

// ① design-status：总数声明
{
  const P = 'project-design/99-ai/design-status.md';
  let s = fs.readFileSync(P, 'utf8');
  const before = s;
  s = s.split('完整 **45 条**').join('完整 **51 条**');
  fs.writeFileSync(P, s);
  console.log('design-status: ' + (before === s ? '⚠️ 未命中' : '✅ 已更新 45 → 51'));
}

// ② 一致性校验脚本：期望值
{
  const P = 'ai-creator-community-wh/scratch/_spec017-consistency.js';
  let s = fs.readFileSync(P, 'utf8');
  const before = s;
  s = s.split(', 45]').join(', 51]');
  s = s.split('完整 \\*\\*45 条\\*\\*').join('完整 \\*\\*51 条\\*\\*');
  s = s.split('? 45 : 0').join('? 51 : 0');
  // workspace-state 期望行：状态与计数
  s = s.split("'SPEC017_PHASE1_COMPLETED'").join("'SPEC003_004_SPECIFIED'");
  s = s.split("'open_questions: 45'").join("'open_questions: 51'");
  s = s.split("'specs_specified: 2'").join("'specs_specified: 4'");
  fs.writeFileSync(P, s);
  console.log('一致性脚本: ' + (before === s ? '⚠️ 未命中' : '✅ 已更新期望值'));
}
