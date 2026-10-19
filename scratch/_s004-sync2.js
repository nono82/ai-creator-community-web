'use strict';
/** CHG-022 同步第 2 批：workspace-state.yaml（含 3 处存量缺陷修正）。 */
const fs = require('fs');
const P = 'project-design/99-ai/workspace-state.yaml';
let L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
const snap = L.slice();
let hit = 0;
const miss = [];
function rep(pre, to, label) {
  const i = snap.findIndex(function (l) { return l.startsWith(pre); });
  if (i >= 0) { L[i] = to; hit++; } else miss.push(label || pre.slice(0, 30));
}

// ① 头部状态
rep('  current_phase:', '  current_phase: "TASKS"', 'current_phase');
rep('  phase_status:', '  phase_status: "SPEC004_TASKED"', 'phase_status');
rep('  next_phase:', '  next_phase: "IMPLEMENT_SPEC004_PHASE1"   # §49 前置已满足（四件齐备 + 立红 4/126）；Phase 1 硬约束：不得改动 #modal-studio', 'next_phase');
rep('  completed_phases:', '  completed_phases: ["PROJECT_INITIALIZATION", "CLARIFY_P0_BATCH", "SPECIFY_SPEC001", "CLARIFY_SPEC001", "CHECKLIST_SPEC001", "PLAN_SPEC001", "TASKS_SPEC001", "IMPLEMENT_SPEC001_PHASE1", "CONVERGE_SPEC001_PHASE1", "SPECIFY_SPEC017", "CLARIFY_SPEC017", "L3_RED_REGISTERED_SPEC017", "PLAN_SPEC017", "TASKS_SPEC017", "IMPLEMENT_SPEC017_PHASE1", "CONVERGE_SPEC017_PHASE1", "SPECIFY_SPEC003", "SPECIFY_SPEC004", "CLARIFY_SPEC003", "CLARIFY_SPEC004", "L3_RED_REGISTERED_SPEC003", "PLAN_SPEC003", "TASKS_SPEC003", "IMPLEMENT_SPEC003_PHASE1", "CONVERGE_SPEC003_PHASE1", "L3_RED_REGISTERED_SPEC004", "PLAN_SPEC004", "TASKS_SPEC004"]', 'completed_phases');
rep('  spec004_status:', '  spec004_status: "TASKED"           # CHG-022；四件齐备（spec / plan / tasks / data-model / research）+ 立红（功能断言 4/126）⇒ §49 前置已满足', 'spec004_status');

// ② counts
rep('  specs_tasked:', '  specs_tasked: 4                 # SPEC-001 + SPEC-017 + SPEC-003 + SPEC-004（CHG-022）', 'specs_tasked');
rep('  data_models:', '  data_models: 4                  # SPEC-001 + SPEC-017 + SPEC-003 + SPEC-004（均有实质内容，非空壳）', 'data_models');
rep('  research_docs:', '  research_docs: 4                # SPEC-001 + SPEC-017 + SPEC-003 + SPEC-004（均有 Decision）', 'research_docs');
rep('  l3_red_suites:', '  l3_red_suites: 1                # wb-creator-tools-verify（SPEC-004 立红；功能断言 4/126；CHG-022）—— 有意登记，不阻断总判定、不计入断言合计', 'l3_red_suites');

// ③ registered 只留当前红灯（修正 CHG-021 的遗漏：已转绿的套件不应留在 registered）
rep('      - {suite: wb-growth-academy-verify,',
  '      - {suite: wb-creator-tools-verify, feature: SPEC-004, scope: "Phase 1（集成模式数据化 + 卡片路由 + 详情页壳 + 生成两阶段计费 + 双路流转 + 模板套用 + 历史草稿 + Hero 内容集合）", functional_progress: "4/126（其中 3 前置事实 + 1 既有能力 ⇒ 新增能力 0/126）", invariant_assertions: "14/14（未实现时平凡通过，不计入证据）", contracts: 17, ref: CHG-022}',
  'registered 项');

rep('  determinism:', '  determinism: "连续 3 次运行结果完全一致（L3 2343/2343，13 绿 + 1 红；断言合计 2,869/2,870；红灯进度 4/126）"', 'determinism');

// ④ features 集合
rep('  planned: ["SPEC-001", "SPEC-017"]', '  planned: ["SPEC-001", "SPEC-003", "SPEC-004", "SPEC-017"]', 'planned');
rep('  tasked: ["SPEC-001", "SPEC-017"]', '  tasked: ["SPEC-001", "SPEC-003", "SPEC-004", "SPEC-017"]', 'tasked');

// ⑤ SPEC-004 features 行（⚠️ 外层单引号；内部双引号均为内容）
const spec004Line = [
  '    - {id: SPEC-004, name: "创作工具工作台与模板套用", priority: P0, release: MVP, state: TASKED,',
  ' spec: "specs/004-creator-tools/spec.md", plan: "specs/004-creator-tools/plan.md", tasks: "specs/004-creator-tools/tasks.md",',
  ' data_model: "specs/004-creator-tools/data-model.md", research: "specs/004-creator-tools/research.md",',
  ' specified_at: "2026-09-25", clarified_at: "2026-09-25", tasked_at: "2026-09-25",',
  ' depends_on: ["SPEC-009", "SPEC-017"],',
  ' note: "依赖 SPEC-017（Phase 1 已落地）；SPEC-009 未落地 ⇒ 分源扣减 / 全额退还走既有两值入口（Q-050，禁造池）；立红 = wb-creator-tools-verify（17 项契约 / 126 功能断言 / 4/126，新增能力 0/126）；Phase 1 31 项 + Phase 2 5 项登记；缺陷合计 9 处（§1.3 3 处 + 立红新测 6 处）；Phase 1 硬约束：不得改动 #modal-studio"}',
].join('');
rep('    - {id: SPEC-004,', spec004Line, 'features.SPEC-004');

// ⑥ 删除重复的 clarified 键（CHG-019 插入造成）
const dupIdx = L.findIndex(function (l) { return l === '  clarified: ["SPEC-001", "SPEC-017"]'; });
if (dupIdx > 0) {
  L.splice(dupIdx, 1);
  console.log('已删除重复键 clarified（第 ' + (dupIdx + 1) + ' 行，CHG-019 插入造成）');
}

// ⑦ transitioned 追加 wb-growth-academy（修正 registered / transitioned 错位）
const hasGrowthTransition = L.some(function (l) { return l.indexOf('wb-growth-academy-verify') >= 0 && l.indexOf('was:') >= 0; });
const tIdx = L.findIndex(function (l) { return l.indexOf('{suite: wb-content-asset-verify,') >= 0; });
if (tIdx > 0 && !hasGrowthTransition) {
  L.splice(tIdx + 1, 0, '      - {suite: wb-growth-academy-verify, feature: SPEC-003, scope: "Phase 1（学职引擎 + 口径收敛 + 证书三态 + 二级页统一 + 其余入口）", was: "功能断言 0/77", now: "功能断言 77/77，不变量 10/10，断言 87/87，exit 0", became: "回归防线", ref: CHG-021}');
  console.log('已把 wb-growth-academy-verify 移入 transitioned（原误留在 registered）');
}

fs.writeFileSync(P, L.join('\n'));
console.log('workspace-state：替换 ' + hit + '/15｜行数 ' + L.length + (miss.length ? '｜未命中：' + miss.join(' ; ') : ''));

// 结构校验
const LS = fs.readFileSync(P, 'utf8').split(/\r?\n/);
const bad = [];
LS.forEach(function (l, i) { const a = (l.match(/\{/g) || []).length, b = (l.match(/\}/g) || []).length; if (a !== b) bad.push((i + 1) + ': ' + l.trim().slice(0, 60)); });
const q = [];
LS.forEach(function (l, i) { const n = (l.match(/"/g) || []).length; if (n % 2 !== 0) q.push((i + 1) + ': ' + l.trim().slice(0, 90)); });
console.log('结构校验：花括号不平衡 ' + (bad.length ? bad.join(' ; ') : '无') + '｜双引号奇数行 ' + (q.length ? q.join(' ; ') : '无'));
const keys = {};
LS.forEach(function (l) { const m = l.match(/^  ([a-z_]+):/); if (m) keys[m[1]] = (keys[m[1]] || 0) + 1; });
const dups = Object.keys(keys).filter(function (k) { return keys[k] > 1; });
console.log('重复顶层键：' + (dups.length ? dups.join(', ') : '无'));
