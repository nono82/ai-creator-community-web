const fs = require('fs');
const BASE = 'D:/workspace/ai-creator-community-deepseek/';

function count(p, keys) {
  const d = fs.readFileSync(BASE + p, 'utf8');
  console.log('--- ' + p + '  (' + d.split(/\r?\n/).length + ' 行) ---');
  keys.forEach((k) => {
    let n = 0, i = 0;
    while ((i = d.indexOf(k, i)) !== -1) { n++; i += k.length; }
    console.log('  ' + k.padEnd(16) + ' = ' + n);
  });
}

count('project-design/02-business/business-rules.md', ['RULE-008']);
count('project-design/01-requirements/constraints.md', ['CON-063']);
count('project-design/01-requirements/non-functional-requirements.md', ['NFR-016']);
count('project-design/01-requirements/open-questions.md', ['Q-041']);
count('project-design/99-ai/design-status.md', ['Q-041', 'CHG-010']);
count('project-design/99-ai/workspace-state.yaml', ['Q-041', 'GAP-8', 'CHG-010']);
count('CHANGELOG.md', ['CHG-010', 'CHG-009']);
count('specs/001-identity-onboarding/spec.md', ['US-001-', 'SC-001-', 'FR-001-', 'EX-001-', 'DA-001-']);
count('specs/001-identity-onboarding/checklists/requirements.md', ['CLOSED', 'G-10']);

console.log('');
console.log('=== spec.md 中 FR-001-5x 是否齐全 ===');
const sp = fs.readFileSync(BASE + 'specs/001-identity-onboarding/spec.md', 'utf8');
['FR-001-50', 'FR-001-51', 'FR-001-52', 'FR-001-53', 'FR-001-54', 'FR-001-55', 'FR-001-56', 'FR-001-57', 'FR-001-58'].forEach((k) => {
  console.log('  ' + k + (sp.includes('**' + k + '**') ? '  OK 已定义' : '  ✗ 缺失'));
});
console.log('=== spec.md SC 齐全性 ===');
['SC-001-19', 'SC-001-20', 'SC-001-21', 'SC-001-22'].forEach((k) => {
  console.log('  ' + k + (sp.includes(k) ? '  OK' : '  ✗'));
});

console.log('');
console.log('=== workspace-state.yaml 结构自检 ===');
const y = fs.readFileSync(BASE + 'project-design/99-ai/workspace-state.yaml', 'utf8');
const L = y.split(/\r?\n/);
let bad = [];
L.forEach((l, i) => { const a = (l.match(/\{/g) || []).length, b = (l.match(/\}/g) || []).length; if (a !== b) bad.push((i + 1) + ': ' + l.trim().slice(0, 80)); });
console.log('花括号不平衡行:', bad.length ? bad : '无');
console.log('行数 =', L.length);
console.log('顶层键 =', L.filter((l) => /^[A-Za-z_]/.test(l)).map((l) => l.split(':')[0]).join(', '));
const phase = L.find((l) => /^\s+current_phase:/.test(l));
console.log('current_phase =', phase ? phase.trim() : '(未找到)');
