// SPEC-017 SPECIFY 的跨文件一致性校验（一次性，放 scratch/）
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const cnt = (p, k) => (rd(p).split(k).length - 1);

let problems = [];

// ---------- ① SPEC-017 的编号连续性（spec.md 内部） ----------
const spec = rd('specs/017-content-asset-storage/spec.md');
const seq = (prefix, n, re) => {
  const found = [...new Set((spec.match(re) || []))].sort();
  const missing = [];
  for (let i = 1; i <= n; i++) {
    const id = prefix + String(i).padStart(2, '0');
    if (!found.includes(id)) missing.push(id);
  }
  return { count: found.length, missing };
};
const groups = [
  ['US-017-', 11, /US-017-\d\d/g],
  ['SC-017-', 16, /SC-017-\d\d/g],
  ['FR-017-', 45, /FR-017-\d\d/g],
  ['EX-017-', 18, /EX-017-\d\d/g],
  ['DA-017-', 9, /DA-017-\d\d/g],
];
console.log('=== ① spec.md 编号连续性 ===');
groups.forEach(([p, n, re]) => {
  const r = seq(p, n, re);
  const ok = r.missing.length === 0;
  if (!ok) problems.push(`${p} 缺编号: ${r.missing.join(', ')}`);
  console.log(`  ${p.padEnd(9)} 定义 ${String(r.count).padStart(2)} / 期望 ${n}  ${ok ? '✅' : '❌ 缺 ' + r.missing.join(',')}`);
});

// ---------- ② 跨文件关键条目 ----------
console.log('\n=== ② 跨文件关键条目一致性 ===');
const files = {
  'specs/017-content-asset-storage/spec.md': ['TASKED', 'IMPLEMENTED', 'Q-042', 'Q-043', 'Q-044', 'Q-045', 'REQ-084', 'REQ-802', 'REQ-205', 'objectKey', 'refCount', '五处引用点', '引用记录是唯一真源', 'FR-017-43', '软删除', '待回收'],
  'specs/017-content-asset-storage/plan.md': ['PLANNED', 'IMPLEMENTED', '6/6', 'Stage A', 'Stage B', '回归风险', '只加字段', 'T-017-17', 'submitStudioToTask', '2,183'],
  'specs/017-content-asset-storage/tasks.md': ['☑', 'T-017-01', 'T-017-26', 'T-017-P2-10', 'Phase 1', 'Phase 2', '不得新增', '门禁节奏'],
  'specs/017-content-asset-storage/data-model.md': ['AssetObject', 'AssetRef', 'refCount', '不变量', 'gcWindowHours', '严格单向'],
  'specs/017-content-asset-storage/research.md': ['R1', 'R2', 'R3', 'R4', 'Decision'],
  'ai-creator-community-wh/tools/wb-content-asset-verify.js': ['契约冻结自检', 'ASSET_REF_TYPES', 'sweepRecyclableAssets', 'gcWindowHours', '功能断言', '全部通过：'],
  'specs/README.md': ['CLARIFIED', 'CHG-014', 'CHG-015', 'CHG-017', 'IMPLEMENTED', 'Q-042', '注 ①', '注 ②', '第 5.5 批', 'REQ-084'],
  'project-design/05-feature-map.md': ['CLARIFIED', '注 1', '注 2', 'REQ-084'],
  'project-design/01-requirements/open-questions.md': ['Q-042', 'Q-043', 'Q-044', 'Q-045', '六、'],
  'project-design/01-requirements/traceability.md': ['4.2', 'SPEC-017', 'Q-042', 'REQ-084'],
  'project-design/99-ai/design-status.md': ['CHG-015', 'CHG-017', 'CLARIFIED', 'IMPLEMENTED', 'Q-042', 'GAP-10', 'GAP-11', 'GAP-12', 'FR-017-43'],
  'project-design/99-ai/workspace-state.yaml': ['CHG-016', 'SPEC004_PHASE1_COMPLETED', 'l3_red_suites: 0', 'l3_assertion_total: 2256', 'spec017_phase1_dod', 'CHG-017', 'Q-042', 'GAP-10', 'GAP-11', 'GAP-12', 'open_questions: 51', 'specs_specified: 4', 'FR-017-43', 'T-017-P2-04'],
  'project-design/99-ai/change-impact.md': ['CHG-017', 'CHG-015', 'CHG-014', 'REQ-084', 'GAP-10', 'GAP-11', 'GAP-12', '软删除'],
  'specs/003-growth-academy/spec.md': ['IMPLEMENTED', '0/77', 'Q-046', 'Q-047', 'Q-048', 'awardLearningPoints', 'syncAcademyStats', 'markLessonDone', 'evaluateLevelUp', 'maybeUnlockCerts', 'claimCertificate', 'Lv.2 ≥ 200', 'plans[0]', '学职引擎', '认证导师', 'CLARIFY 结论', 'Q-046', '委托化先例'],
  'specs/004-creator-tools/spec.md': ['IMPLEMENTED', 'Q-049', 'Q-050', 'Q-051', 'view-tool-detail', 'integration', 'attachAssetRef', 'refCount', 'third-integrated', 'third-external', '原路退还', '一键复刻', 'CLARIFY 结论', '两阶段', 'SPEC-009'],
  'CHANGELOG.md': ['CHG-017', 'CHG-015', 'CHG-014', 'Q-042', 'Q-045', 'GAP-10', '软删除'],
};
Object.entries(files).forEach(([f, keys]) => {
  const miss = keys.filter((k) => cnt(f, k) === 0);
  if (miss.length) problems.push(`${f} 缺: ${miss.join(', ')}`);
  console.log(`  ${miss.length === 0 ? '✅' : '❌'}  ${f.padEnd(52)} ${miss.length ? '缺 ' + miss.join(',') : '全部命中'}`);
});

// ---------- ③ 计数一致性（实测 45 条） ----------
console.log('\n=== ③ 计数一致性 ===');
const oq = rd('project-design/01-requirements/open-questions.md');
const ids = [...new Set(oq.match(/Q-0\d\d/g) || [])];
const ws = rd('project-design/99-ai/workspace-state.yaml');
const ds = rd('project-design/99-ai/design-status.md');
const checks = [
  ['open-questions 唯一编号数', ids.length, 51],
  ['workspace-state open_questions', Number((ws.match(/open_questions: (\d+)/) || [])[1]), 51],
  ['design-status §五 总数声明含 45', /完整 \*\*51 条\*\*/.test(ds) ? 51 : 0, 51],
];
checks.forEach(([n, got, want]) => {
  const ok = got === want;
  if (!ok) problems.push(`${n}: ${got} ≠ ${want}`);
  console.log(`  ${ok ? '✅' : '❌'}  ${n.padEnd(40)} ${got} / ${want}`);
});

// ---------- ④ 文件的创建状态（PLAN/TASKS 后已反转：应存在的必须存在，不该有的必须没有） ----------
console.log('\n=== ④ 文件的创建状态 ===');
const mustExist = [
  'specs/017-content-asset-storage/spec.md',
  'specs/017-content-asset-storage/plan.md',
  'specs/017-content-asset-storage/tasks.md',
  'specs/017-content-asset-storage/data-model.md',
  'specs/017-content-asset-storage/research.md',
  'ai-creator-community-wh/tools/wb-content-asset-verify.js',
  // SPEC-003（CHG-020：立红 + PLAN + TASKS）
  'specs/003-growth-academy/spec.md',
  'specs/003-growth-academy/plan.md',
  'specs/003-growth-academy/tasks.md',
  'specs/003-growth-academy/data-model.md',
  'specs/003-growth-academy/research.md',
  'ai-creator-community-wh/tools/wb-growth-academy-verify.js',
  'specs/004-creator-tools/spec.md',
  'specs/004-creator-tools/plan.md',
  'specs/004-creator-tools/tasks.md',
  'specs/004-creator-tools/data-model.md',
  'specs/004-creator-tools/research.md',
  'ai-creator-community-wh/tools/wb-creator-tools-verify.js',
];
mustExist.forEach((f) => {
  const exists = fs.existsSync(path.join(ROOT, f));
  if (!exists) problems.push(`应存在但缺失: ${f}`);
  console.log(`  ${exists ? '✅' : '❌'}  ${f.padEnd(58)} ${exists ? '存在' : '缺失'}`);
});
console.log('  ---');
const mustNotExist = [
  'specs/017-content-asset-storage/contracts',
  'specs/017-content-asset-storage/checklists',
];
mustNotExist.forEach((f) => {
  const exists = fs.existsSync(path.join(ROOT, f));
  if (exists) problems.push(`不应存在: ${f}`);
  console.log(`  ${exists ? '❌' : '✅'}  ${f.padEnd(58)} ${exists ? '存在（依原则 2 / 未做）' : '不存在（符合预期）'}`);
});

// ---------- 汇总 ----------
console.log('\n' + '='.repeat(60));
if (problems.length === 0) {
  console.log('✅ 一致性校验：0 问题');
  process.exit(0);
} else {
  console.log(`❌ 一致性校验：${problems.length} 个问题`);
  problems.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
  process.exit(1);
}
