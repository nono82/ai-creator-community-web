'use strict';
/** 修正 `124/126`（链式替换 bug 的产物）→ `126/126`；并更新 tasks.md 的上游状态引用。 */
const fs = require('fs');
const files = [
  'specs/004-creator-tools/tasks.md',
  'specs/004-creator-tools/plan.md',
  'specs/004-creator-tools/spec.md',
  'specs/004-creator-tools/data-model.md',
  'specs/004-creator-tools/research.md',
  'specs/README.md',
  'project-design/99-ai/design-status.md',
  'project-design/99-ai/workspace-state.yaml',
  'project-design/99-ai/change-impact.md',
  'project-design/05-feature-map.md',
  'project-design/01-requirements/traceability.md',
  'CHANGELOG.md',
  'ai-creator-community-wh/tools/README.md',
];
let total = 0;
files.forEach(function (P) {
  if (!fs.existsSync(P)) return;
  let s = fs.readFileSync(P, 'utf8');
  const c = s.split('124/126').length - 1;
  if (c > 0) { s = s.split('124/126').join('126/126'); fs.writeFileSync(P, s); total += c; console.log('  ' + P + '：' + c + ' 处'); }
});
console.log('合计修正 ' + total + ' 处 `124/126` → `126/126`');

// tasks.md：上游 plan 的状态引用
(function () {
  const P = 'specs/004-creator-tools/tasks.md';
  let s = fs.readFileSync(P, 'utf8');
  const a = '> **上游**：`spec.md`（`CLARIFIED`）· `plan.md`（`PLANNED`）· `data-model.md` · `research.md`';
  const b = '> **上游**：`spec.md`（`IMPLEMENTED`（Phase 1））· `plan.md`（`IMPLEMENTED`（Phase 1））· `data-model.md` · `research.md`';
  if (s.includes(a)) { s = s.replace(a, b); fs.writeFileSync(P, s); console.log('  tasks.md：上游状态已更新'); }
})();

// 复核残留
let rest = 0;
files.forEach(function (P) { if (fs.existsSync(P) && fs.readFileSync(P, 'utf8').indexOf('124/126') >= 0) rest++; });
console.log('残留 `124/126` 文件数：' + rest);
