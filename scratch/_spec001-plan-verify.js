'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');

function read(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); }
function count(d, k) { return d.split(k).length - 1; }

const CHECKS = [
  ['specs/001-identity-onboarding/spec.md', ['TASKED', 'plan.md', 'tasks.md', 'data-model.md', 'research.md', 'CHG-012']],
  ['specs/001-identity-onboarding/plan.md', ['T-001-', 'T-002-', 'GAP-9', 'R-1', 'checkAdmission', '97 处']],
  ['specs/001-identity-onboarding/tasks.md', ['T-001-01', 'T-001-46', 'T-002-12', '37/37', '3/37']],
  ['specs/001-identity-onboarding/data-model.md', ['GAP-9', 'CON-022', 'Q-041']],
  ['specs/001-identity-onboarding/research.md', ['R1', 'R2', 'R3', 'Decision']],
  ['project-design/01-requirements/traceability.md', ['T-001-', 'T-002-', 'GAP-9', 'TASKED']],
  ['project-design/99-ai/design-status.md', ['TASKED', 'GAP-9', 'CHG-012']],
  ['project-design/99-ai/workspace-state.yaml', ['GAP-9', 'specs_tasked', 'phase1_tasks', 'IMPLEMENT', 'CHG-012']],
  ['project-design/99-ai/change-impact.md', ['CHG-012', 'CHG-011']],
  ['CHANGELOG.md', ['CHG-012', 'CHG-011']],
  ['specs/README.md', ['TASKED', 'T-001-', '37/37']]
];

console.log('=== 关键条目跨文件一致性 ===');
let problems = 0;
for (const [f, keys] of CHECKS) {
  const d = read(f);
  const parts = keys.map((k) => k + '=' + count(d, k));
  const zeros = keys.filter((k) => count(d, k) === 0);
  if (zeros.length) { problems++; console.log('  ✗ ' + f + '  缺: ' + zeros.join(', ')); }
  console.log((zeros.length ? '  ' : '  ok ') + f.padEnd(52) + parts.join(' '));
}

console.log('');
console.log('=== plan.md 的 §17 必答项覆盖 ===');
const plan = read('specs/001-identity-onboarding/plan.md');
const REQUIRED = [
  'Technical Context', 'Constitution Check', 'Existing System Impact', 'Architecture',
  'Module Impact', 'Domain Impact', 'Data Design', 'API / Contract Design', 'Core Flows',
  'State Transitions', 'Concurrency', 'Idempotency', 'Consistency', 'Security',
  'Observability', 'Migration', 'Testing Strategy', 'Risk', 'Rollback', 'Affected Components'
];
const missing = REQUIRED.filter((s) => plan.toLowerCase().indexOf(s.toLowerCase()) < 0);
if (missing.length) { problems++; console.log('  ✗ 缺: ' + missing.join(', ')); }
else console.log('  ok 20 项全部覆盖（含 Risk）+ §二十二 Definition of Done');

console.log('');
console.log('=== 文件规模 ===');
['plan.md', 'tasks.md', 'data-model.md', 'research.md', 'spec.md'].forEach((f) => {
  const p = 'specs/001-identity-onboarding/' + f;
  const d = read(p);
  console.log('  ' + f.padEnd(16) + d.split(/\r?\n/).length + ' 行');
});

console.log('');
console.log(problems === 0 ? '✅ 一致性校验通过（0 问题）' : '❌ 存在 ' + problems + ' 处问题');
process.exit(problems === 0 ? 0 : 1);
