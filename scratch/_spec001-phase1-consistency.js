'use strict';
// SPEC-001 Phase 1 收口 · 跨文件一致性校验（scratch/ 过程产物）
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const n = (d, k) => d.split(k).length - 1;

const CHECKS = [
  ['specs/001-identity-onboarding/spec.md', ['IMPLEMENTED', '37/37', 'CHG-013', 'Phase 2 未启动']],
  ['specs/001-identity-onboarding/plan.md', ['T-001-', 'T-002-', 'GAP-9', '37/37']],
  ['specs/001-identity-onboarding/tasks.md', ['IMPLEMENTED', '37/37', '2,183', '27/27']],
  ['specs/001-identity-onboarding/data-model.md', ['GAP-9', 'Q-041', 'CON-022']],
  ['specs/001-identity-onboarding/research.md', ['R1', 'R2', 'R3']],
  ['specs/001-identity-onboarding/checklists/requirements.md', ['4.2', '复检', '无新增缺口']],
  ['project-design/01-requirements/traceability.md', ['IMPLEMENTED', 'CODE', 'isCredentialMet', 'CHG-013']],
  ['project-design/99-ai/design-status.md', ['CHG-013', 'IMPLEMENTED', '2,183', '2,669/2,670']],
  ['project-design/99-ai/workspace-state.yaml', ['CHG-013', 'PHASE_1_IMPLEMENTED', 'l3_red_suites: 0', 'l3_green_suites: 11']],
  ['project-design/99-ai/change-impact.md', ['CHG-013', 'CHG-012']],
  ['CHANGELOG.md', ['CHG-013', 'CHG-012']],
  ['specs/README.md', ['IMPLEMENTED', '37/37', 'CHG-013']]
];

console.log('=== 跨文件一致性（CHG-013 关键词）===');
let problems = 0;
for (const [f, keys] of CHECKS) {
  const d = read(f);
  const zeros = keys.filter((k) => n(d, k) === 0);
  if (zeros.length) { problems++; console.log('  ✗ ' + f + '  缺: ' + zeros.join(', ')); }
  else console.log('  ok ' + f.padEnd(50) + keys.map((k) => k + '=' + n(d, k)).join(' '));
}

console.log('');
console.log('=== 关键数字一致性（应全部为 37/37 · 2183 · 480 · 2669/2670）===');
const FILES = [
  'project-design/99-ai/design-status.md',
  'project-design/99-ai/workspace-state.yaml',
  'project-design/99-ai/change-impact.md',
  'CHANGELOG.md',
  'specs/README.md',
  'specs/001-identity-onboarding/tasks.md'
];
for (const f of FILES) {
  const d = read(f);
  const bad = [];
  if (/\b3\/37\b/.test(d) && !/3\/37 → 37\/37|3\/37\s*→|由 3\/37|原.*3\/37|改前|was:/.test(d)) bad.push('残留 3/37（未标注为"改前"）');
  console.log('  ' + (bad.length ? '⚠️ ' : 'ok ') + f.padEnd(50) + (bad.length ? bad.join('; ') : '无未标注的历史值'));
}

console.log('');
console.log('=== 门禁基线 ==="');
const b = JSON.parse(read('ai-creator-community-wh/tools/gates-baseline.json'));
console.log('  l3ExpectedRed = ' + JSON.stringify(b.l3ExpectedRed) + '（应为 []）');
console.log('  l3AssertionTotal = ' + b.l3AssertionTotal + '（应为 2183）  l3Suites = ' + b.l3Suites + '（应为 11）');
console.log('  l1ErrorBaseline = ' + b.l1ErrorBaseline + '（应仍为 7）');
if (b.l3ExpectedRed.length !== 0 || b.l3AssertionTotal !== 2183 || b.l1ErrorBaseline !== 7) problems++;

console.log('');
console.log(problems === 0 ? '✅ 一致性校验通过（0 问题）' : '❌ 存在 ' + problems + ' 处问题');
process.exit(problems === 0 ? 0 : 1);
