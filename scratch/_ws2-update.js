'use strict';
/** 一次性同步 workspace-state.yaml + specs/README.md（CHG-018）。 */
const fs = require('fs');

function patch(P, rules, inserts) {
  let L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
  let hit = 0, miss = [];
  L = L.map((l) => {
    for (const [pre, to] of rules) {
      if (l.startsWith(pre)) { hit++; return to; }
    }
    return l;
  });
  rules.forEach(([pre]) => { if (!L.some((l) => l.startsWith(pre))) miss.push(pre); });
  let ins = 0;
  (inserts || []).forEach(({ anchor, prefix, rows, guard }) => {
    const i = L.findIndex((l) => l.startsWith(anchor));
    if (i > 0 && !L[i + 1]?.startsWith(guard)) { L.splice(i + 1, 0, ...rows); ins++; }
  });
  fs.writeFileSync(P, L.join('\n'));
  console.log(P + ' → 替换 ' + hit + '/' + rules.length + '｜插入 ' + ins + '/' + (inserts || []).length + '｜行数 ' + L.length);
  if (miss.length) console.log('  ⚠️ 未命中：' + miss.join(' ; '));
}

// ---------- workspace-state.yaml ----------
patch('project-design/99-ai/workspace-state.yaml', [
  ['  current_phase:', '  current_phase: "SPECIFY"'],
  ['  phase_status:', '  phase_status: "SPEC003_004_SPECIFIED"'],
  ['  next_phase:', '  next_phase: "CLARIFY_SPEC003_004"   # 或直接 PLAN；⚠️ Q-046 / Q-049 / Q-050 为 P1，建议先 CLARIFY'],
  ['  completed_phases:', '  completed_phases: ["PROJECT_INITIALIZATION", "CLARIFY_P0_BATCH", "SPECIFY_SPEC001", "CLARIFY_SPEC001", "CHECKLIST_SPEC001", "PLAN_SPEC001", "TASKS_SPEC001", "IMPLEMENT_SPEC001_PHASE1", "CONVERGE_SPEC001_PHASE1", "SPECIFY_SPEC017", "CLARIFY_SPEC017", "L3_RED_REGISTERED_SPEC017", "PLAN_SPEC017", "TASKS_SPEC017", "IMPLEMENT_SPEC017_PHASE1", "CONVERGE_SPEC017_PHASE1", "SPECIFY_SPEC003", "SPECIFY_SPEC004"]'],
  ['  last_updated:', '  last_updated: "2026-09-25"'],
  ['  spec017_status:', '  spec017_status: "IMPLEMENTED_PHASE1"  # CHG-017；Phase 1 的 26 项全部落地，冻结自检 66/66 + 7/7（exit 0）\n  spec003_status: "SPECIFIED"        # CHG-018；14 US / 20 SC / 53 FR（9 组）/ 19 EX；其 plan.md / tasks.md 等未创建\n  spec004_status: "SPECIFIED"        # CHG-018；15 US / 16 SC / 37 FR（8 组）/ 15 EX；其 plan.md / tasks.md 等未创建'],
  ['  specs_specified:', '  specs_specified: 4              # SPEC-001 + SPEC-017 + SPEC-003（CHG-018）+ SPEC-004（CHG-018）'],
  ['  open_questions: 45', '  open_questions: 51              # ✅ 实测（2026-09-25）：Q-001 ~ Q-051 共 51 个唯一编号'],
  ['  specified: ["SPEC-001", "SPEC-017"]', '  specified: ["SPEC-001", "SPEC-003", "SPEC-004", "SPEC-017"]'],
  ['    - {id: SPEC-003,', '    - {id: SPEC-003, name: "成长学院（课程研习与认证）", priority: P0, release: MVP, state: SPECIFIED, spec: "specs/003-growth-academy/spec.md", specified_at: "2026-09-25", depends_on: ["SPEC-001", "SPEC-017"], note: "依赖 SPEC-017（Phase 1 已落地、接口已冻结）；实测为「骨架完整、业务未通电」—— 6 个二级页容器齐备但学职引擎（S7）6 个方法实测全缺；14 US / 20 SC / 53 FR（9 组）/ 19 EX；§1.3 固化 4 处真实缺陷（三套加分逻辑 / 晋级判据 / plans[0] 兜底 / 等级口径与 Q-003 相反）；新开 Q-046~Q-048"}'],
  ['    - {id: SPEC-004,', '    - {id: SPEC-004, name: "创作工具工作台与模板套用", priority: P0, release: MVP, state: SPECIFIED, spec: "specs/004-creator-tools/spec.md", specified_at: "2026-09-25", depends_on: ["SPEC-009", "SPEC-017"], note: "依赖 SPEC-017（Phase 1 已落地）；⚠️ SPEC-009 未落地 ⇒ 分源扣减 / 全额退还缺可信账本（Q-050）；15 US / 16 SC / 37 FR（8 组）/ 15 EX；§1.3 固化 3 处真实缺陷（#modal-studio vs #view-tool-detail / allTools 缺 integration / refCount 口径冲突）；新开 Q-049~Q-051"}'],
], [
  { anchor: '  - "specs/017-content-asset-storage/research.md', prefix: '', guard: '  - "specs/003-growth-academy/spec.md', rows: [
    '  - "specs/003-growth-academy/spec.md                            ← 第三个 Feature 规格（CHG-018；SPEC-003 成长学院：14 US / 20 SC / 53 FR（9 组）/ 19 EX）"',
    '  - "specs/004-creator-tools/spec.md                             ← 第四个 Feature 规格（CHG-018；SPEC-004 创作工具：15 US / 16 SC / 37 FR（8 组）/ 15 EX）"',
  ] },
]);

// ---------- specs/README.md ----------
patch('specs/README.md', [
  ['> **当前状态**：', '> **当前状态**：`SPEC-001` 已完成 **`SPECIFY` → `CLARIFY` → `CHECKLIST` → 立红 → `PLAN` → `TASKS` → `IMPLEMENT`（Phase 1）**（2026-09-24）；**`SPEC-017` 已完成 `SPECIFY` → `CLARIFY` → 立红 → `PLAN` → `TASKS` → `IMPLEMENT`（Phase 1）**（2026-09-24 ~ 09-25）；**`SPEC-003` / `SPEC-004` 已完成 `SPECIFY`**（2026-09-25，`CHG-018`）；其余 **13 个** Feature 仍处于 **IDEA**。'],
  ['| **第 2 批** |', '| **第 2 批** | ✅ **`SPEC-017`（内容资产存储）已完成全链并落地实现**（2026-09-24 ~ 09-25，`CHG-014` ~ `CHG-017`）—— **其接口已冻结并已实现**；⚠️ **`SPEC-016` 已从本批移出**（见下方注 ①） | **它被 `SPEC-003` / `SPEC-004`（均 P0）依赖**（依赖图 `S017 → S003` / `S017 → S004`）⇒ 不先定契约，二者只能各自假设"资产怎么存"、契约必然分叉 |'],
  ['| **第 3 批** |', '| **第 3 批** | ✅ **`SPEC-003`（成长学院）/ `SPEC-004`（创作工具）已完成 `SPECIFY`**（2026-09-25，`CHG-018`）—— 二者均依赖 `SPEC-017`（已冻结并落地）；⚠️ **`SPEC-004` 另依赖 `SPEC-009`（我的资产，仍是 `IDEA`）**⇒ 其「分源扣减 / 全额退还」缺可信账本（`Q-050`） | 关键路径中段 |'],
], [
  { anchor: '| **SPEC-017** 内容资产存储与转存 |', prefix: '', guard: '| **SPEC-003** 成长学院 |', rows: [
    '| **SPEC-003** 成长学院（课程研习与认证） | **SPECIFIED**（2026-09-25，`CHG-018`） | **`spec.md`**（14 US / 20 SC / 53 FR（9 组）/ 19 EX）；`plan.md` / `tasks.md` / `data-model.md` / `research.md` / `checklists/` **未创建**（待其 `PLAN` / `TASKS` 阶段） |',
    '| **SPEC-004** 创作工具工作台与模板套用 | **SPECIFIED**（2026-09-25，`CHG-018`） | **`spec.md`**（15 US / 16 SC / 37 FR（8 组）/ 15 EX）；`plan.md` / `tasks.md` / `data-model.md` / `research.md` / `checklists/` **未创建**（待其 `PLAN` / `TASKS` 阶段） |',
  ] },
]);
