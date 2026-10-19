'use strict';
/** CHG-020 同步第 2 批：workspace-state.yaml。 */
const fs = require('fs');
const P = 'project-design/99-ai/workspace-state.yaml';
let s = fs.readFileSync(P, 'utf8');
const before = s.length;
let n = 0;
function sub(a, b, label) {
  if (!s.includes(a)) { console.log('⚠️ 未命中：' + (label || a.slice(0, 40))); return; }
  s = s.split(a).join(b); n++;
}

// ① 阶段
sub('  current_phase: "CLARIFY"', '  current_phase: "TASKS"', 'current_phase');
sub('  phase_status: "SPEC003_004_CLARIFIED"', '  phase_status: "SPEC003_TASKED"', 'phase_status');
sub('  next_phase: "PLAN_SPEC003_004"    # ✅ 六条问题已定稿 ⇒ 无 CLARIFY 阻塞；⚠️ SPEC-004 的 `Q-050` 唯余 SPEC-009 的就绪时点（属排期）',
    '  next_phase: "IMPLEMENT_SPEC003_PHASE1"   # ✅ §49 前置已满足（spec / plan / tasks / data-model / research 齐备 + 已立红）；⚠️ 另可并行做 SPEC-004 的 PLAN', 'next_phase');
sub('"CLARIFY_SPEC003", "CLARIFY_SPEC004"]',
    '"CLARIFY_SPEC003", "CLARIFY_SPEC004", "L3_RED_REGISTERED_SPEC003", "PLAN_SPEC003", "TASKS_SPEC003"]', 'completed_phases');

// ② Feature 状态
sub('  spec003_status: "CLARIFIED"        # CHG-019；Q-046~Q-048 已定稿（见其 spec.md §7.6）',
    '  spec003_status: "TASKED"           # CHG-020；完整规格链齐备（spec / plan / tasks / data-model / research）+ 立红（功能断言 0/77）⇒ §49 前置已满足', 'spec003_status');

// ③ counts
sub('  specs_planned: 2                # SPEC-001（CHG-012）+ SPEC-017（CHG-016）',
    '  specs_planned: 3                # SPEC-001（CHG-012）+ SPEC-017（CHG-016）+ SPEC-003（CHG-020）', 'specs_planned');
sub('  specs_tasked: 2                 # SPEC-001（CHG-012）+ SPEC-017（CHG-016）',
    '  specs_tasked: 3                 # SPEC-001（CHG-012）+ SPEC-017（CHG-016）+ SPEC-003（CHG-020）', 'specs_tasked');
sub('  data_models: 2                  # SPEC-001 + SPEC-017（均有实质内容，非空壳）',
    '  data_models: 3                  # SPEC-001 + SPEC-017 + SPEC-003（均有实质内容，非空壳）', 'data_models');
sub('  research_docs: 2                # SPEC-001 + SPEC-017（均有 Decision）',
    '  research_docs: 3                # SPEC-001 + SPEC-017 + SPEC-003（均有 Decision）', 'research_docs');

// ④ 门禁
sub('  l3_red_suites: 0                # ✅ 红灯已清零（CHG-017）—— l3ExpectedRed: []；新出现的红灯必须逐个说明原因',
    '  l3_red_suites: 1                # wb-growth-academy-verify（SPEC-003 立红；功能断言 0/77；CHG-020）—— **有意登记，不阻断总判定、不计入断言合计**', 'l3_red_suites');
sub('    registered: []                 # ✅ CHG-017：wb-content-asset-verify 已转绿并移除（当前无红灯）',
    '    registered:\n      - {suite: wb-growth-academy-verify, feature: SPEC-003, scope: "Phase 1（学职引擎 + 口径收敛 + 证书三态 + 二级页统一 + 其余入口）", functional_progress: "0/77", invariant_assertions: "10/10（未实现时平凡通过，不计入证据）", contracts: 10, ref: CHG-020}', 'registered');
sub('  determinism: "连续 3 次运行结果完全一致（L3 2256/2256，12 套；断言合计 2,754/2,755；套件 73 项；冒烟 28 项）"',
    '  determinism: "连续 3 次运行结果完全一致（L3 2256/2256，12 绿 + 1 红；断言合计 2,754/2,755；红灯进度 0/77）"', 'determinism');

// ⑤ features list
sub('    - {id: SPEC-003, name: "成长学院（课程研习与认证）", priority: P0, release: MVP, state: SPECIFIED, spec: "specs/003-growth-academy/spec.md", specified_at: "2026-09-25",',
    '    - {id: SPEC-003, name: "成长学院（课程研习与认证）", priority: P0, release: MVP, state: TASKED, spec: "specs/003-growth-academy/spec.md", plan: "specs/003-growth-academy/plan.md", tasks: "specs/003-growth-academy/tasks.md", data_model: "specs/003-growth-academy/data-model.md", research: "specs/003-growth-academy/research.md", specified_at: "2026-09-25", clarified_at: "2026-09-25", tasked_at: "2026-09-25",', 'features.SPEC-003');

// ⑥ artifacts 插入
sub('  - "specs/003-growth-academy/spec.md                            ← 第三个 Feature 规格（CHG-018；SPEC-003 成长学院：14 US / 20 SC / 53 FR（9 组）/ 19 EX）"',
    '  - "specs/003-growth-academy/spec.md                            ← 第三个 Feature 规格（CHG-018 ~ CHG-020；SPEC-003 成长学院：14 US / 20 SC / 53 FR（9 组）/ 19 EX）"\n' +
    '  - "specs/003-growth-academy/plan.md                            ← 实现计划（CHG-020：三条前置声明 + Phase 1 八步顺序 + 两处顺序陷阱 + 8 项可机器判定 DoD + 接口冻结）"\n' +
    '  - "specs/003-growth-academy/tasks.md                           ← 任务清单（CHG-020：Phase 1 31 项 / Phase 2 8 项登记；每项标注跑哪组断言）"\n' +
    '  - "specs/003-growth-academy/data-model.md                      ← 领域模型（CHG-020：三层次 + 10 条不变量 + 6 个刻意不建的字段）"\n' +
    '  - "specs/003-growth-academy/research.md                        ← 技术研究（CHG-020：R1~R4 均有 Decision；含"宁可漏分不可重复分"的取舍）"\n' +
    '  - "ai-creator-community-wh/tools/wb-growth-academy-verify.js   ← SPEC-003 契约冻结自检（10 项契约 / 77 功能断言 / 🔴 已登记红灯）"', 'artifacts');

// ⑦ next_actions
sub('  - "【下一步·三选一】A. **SPEC-003 / SPEC-004 的 `SPECIFY`**（✅ 推荐：`SPEC-017` 的接口已冻结并已落地实现，下游可直接依赖）/ B. `SPEC-017` Phase 2（10 项登记）/ C. `SPEC-001` Phase 2（账号骨架重构，风险最高）"',
    '  - "【下一步·已决策】执行 SPEC-003 Phase 1 的 31 项（tasks.md）—— §49 前置已满足（spec / plan / tasks / data-model / research 齐备 + 立红 0/77）；⚠️ 必须先做 T-003-01（备份）+ T-003-02（基线）；🔴 遵守 §④ 的两处顺序陷阱（paths 收敛晚于 evaluateLevelUp；progress 派生晚于 markLessonDone）"\n' +
    '  - "【可并行·不阻塞】SPEC-004 的 PLAN / TASKS（其 SPECIFY + CLARIFY 已完成）；⚠️ 二者都动 app.js ⇒ 按 ENV-02 必须串行，建议 SPEC-003 先行"\n' +
    '  - "【最高回归风险区】SPEC-004 的详情页迁移（Q-049 的两阶段：Phase 1 建壳 / Phase 2 迁内）—— 放在最后做"', 'next_actions');

fs.writeFileSync(P, s);
console.log('workspace-state：替换 ' + n + ' 处｜字节 ' + before + ' → ' + s.length);
