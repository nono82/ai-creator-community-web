'use strict';
/** 一次性同步 _spec017-consistency.js 的期望值（CHG-017）。⚠️ scratch/ 过程产物，用后即弃。 */
const fs = require('fs');
const P = 'scratch/_spec017-consistency.js';
let s = fs.readFileSync(P, 'utf8');
const before = s;
const R = [
  // 1) workspace-state：状态已由 TASKED → PHASE_1_COMPLETED；并补新键
  ["'SPEC017_TASKED'", "'SPEC017_PHASE1_COMPLETED', 'l3_red_suites: 0', 'l3_assertion_total: 2256', 'spec017_phase1_dod', 'CHG-017'"],
  // 2) spec.md：补状态
  ["'specs/017-content-asset-storage/spec.md': ['TASKED'", "'specs/017-content-asset-storage/spec.md': ['TASKED', 'IMPLEMENTED'"],
  // 3) plan.md：补完成标记
  ["'specs/017-content-asset-storage/plan.md': ['PLANNED'", "'specs/017-content-asset-storage/plan.md': ['PLANNED', 'IMPLEMENTED', '6/6'"],
  // 4) 套件：补转绿证据
  ["'gcWindowHours', '功能断言'", "'gcWindowHours', '功能断言', '66/66', '全部通过：'"],
  // 5) specs/README：补 CHG-017 + 状态
  ["'specs/README.md': ['CLARIFIED', 'CHG-014', 'CHG-015'", "'specs/README.md': ['CLARIFIED', 'CHG-014', 'CHG-015', 'CHG-017', 'IMPLEMENTED'"],
  // 6) design-status：补 CHG-017 + 状态
  ["'project-design/99-ai/design-status.md': ['CHG-015', 'CLARIFIED'", "'project-design/99-ai/design-status.md': ['CHG-015', 'CHG-017', 'CLARIFIED', 'IMPLEMENTED'"],
  // 7) change-impact：补 CHG-017
  ["'project-design/99-ai/change-impact.md': ['CHG-015', 'CHG-014'", "'project-design/99-ai/change-impact.md': ['CHG-017', 'CHG-015', 'CHG-014'"],
  // 8) CHANGELOG：补 CHG-017
  ["'CHANGELOG.md': ['CHG-015', 'CHG-014'", "'CHANGELOG.md': ['CHG-017', 'CHG-015', 'CHG-014'"],
  // 9) tasks.md：补勾选与完成
  ["'specs/017-content-asset-storage/tasks.md': ['T-017-01'", "'specs/017-content-asset-storage/tasks.md': ['☑', 'T-017-01'"],
];
let n = 0;
R.forEach(([a, b]) => {
  if (s.includes(a)) { s = s.replace(a, b); n++; }
  else console.log('⚠️ 未命中：' + a.slice(0, 60));
});
fs.writeFileSync(P, s);
console.log('替换', n, '/', R.length, '｜长度', before.length, '→', s.length);
