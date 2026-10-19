'use strict';
const fs = require('fs');
const P = 'ai-creator-community-wh/scratch/_spec017-consistency.js';
let s = fs.readFileSync(P, 'utf8');
const before = s;
// ① workspace-state 的状态前缀
s = s.split("'SPEC003_004_SPECIFIED'").join("'SPEC003_004_CLARIFIED'");
// ② feature-map 的 SPECIFIED → CLARIFIED
s = s.split("'project-design/05-feature-map.md': ['SPECIFIED'").join("'project-design/05-feature-map.md': ['CLARIFIED'");
// ③ 003/004 spec.md 的状态
s = s.split("'specs/003-growth-academy/spec.md': ['SPECIFIED'").join("'specs/003-growth-academy/spec.md': ['CLARIFIED'");
s = s.split("'specs/004-creator-tools/spec.md': ['SPECIFIED'").join("'specs/004-creator-tools/spec.md': ['CLARIFIED'");
// ④ 追加 CLARIFY 结论的关键词检查
s = s.split("'学职引擎', '认证导师']").join("'学职引擎', '认证导师', 'CLARIFY 结论', 'Q-046', '委托化先例']");
s = s.split("'原路退还', '一键复刻']").join("'原路退还', '一键复刻', 'CLARIFY 结论', '两阶段', 'SPEC-009']");
fs.writeFileSync(P, s);
console.log(before === s ? '⚠️ 未命中' : '✅ 期望值已同步（SPECIFIED → CLARIFIED）');
