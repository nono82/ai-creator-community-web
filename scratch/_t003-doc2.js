'use strict';
/** CHG-021 回填 批 2：workspace-state.yaml + design-status.md。 */
const fs = require('fs');

function subFile(P, pairs) {
  let s = fs.readFileSync(P, 'utf8');
  const before = Buffer.byteLength(s, 'utf8');
  let hit = 0; const miss = [];
  pairs.forEach((p) => {
    if (!s.includes(p[0])) { miss.push(p[2] || p[0].slice(0, 30)); return; }
    s = s.split(p[0]).join(p[1]); hit++;
  });
  fs.writeFileSync(P, s);
  console.log(P + ' → ' + hit + '/' + pairs.length + '｜字节 ' + before + ' → ' + Buffer.byteLength(s, 'utf8') + (miss.length ? '｜⚠️ 未命中：' + miss.join(' ; ') : ''));
}

// ---------- ① workspace-state.yaml ----------
subFile('project-design/99-ai/workspace-state.yaml', [
  ['  current_phase: "TASKS"', '  current_phase: "IMPLEMENT"', 'current_phase'],
  ['  phase_status: "SPEC003_TASKED"', '  phase_status: "SPEC003_PHASE1_COMPLETED"', 'phase_status'],
  ['  next_phase: "IMPLEMENT_SPEC003_PHASE1"   # ✅ §49 前置已满足（spec / plan / tasks / data-model / research 齐备 + 已立红）；⚠️ 另可并行做 SPEC-004 的 PLAN',
   '  next_phase: "SPEC004_PLAN"        # ✅ SPEC-003 Phase 1 已落地（CHG-021）；下一步可做 SPEC-004 的 PLAN / TASKS，或 SPEC-003 Phase 2（8 项登记）', 'next_phase'],
  ['"TASKS_SPEC003"]', '"TASKS_SPEC003", "IMPLEMENT_SPEC003_PHASE1", "CONVERGE_SPEC003_PHASE1"]', 'completed_phases'],
  ['  spec003_status: "TASKED"           # CHG-020；完整规格链齐备（spec / plan / tasks / data-model / research）+ 立红（功能断言 0/77）⇒ §49 前置已满足',
   '  spec003_status: "IMPLEMENTED_PHASE1"  # CHG-021；31 项全部落地、红灯转绿 0/77 → 77/77（+ 不变量 10/10，exit 0）；Phase 2 的 8 项未启动', 'spec003_status'],
  ['  specs_phase1_implemented: 2     # SPEC-001 Phase 1（CHG-013）+ SPEC-017 Phase 1（CHG-017）；二者的 Phase 2 均未启动',
   '  specs_phase1_implemented: 3     # SPEC-001（CHG-013）+ SPEC-017（CHG-017）+ SPEC-003（CHG-021）；三者的 Phase 2 均未启动', 'specs_phase1_implemented'],
  ['  l3_green_suites: 12             # ✅ 2,256 项（11 套 2,183 + wb-content-asset-verify 转绿后 73）；CHG-017',
   '  l3_green_suites: 13             # ✅ 2,343 项（12 套 2,256 + wb-growth-academy-verify 转绿后 87）；CHG-021', 'l3_green_suites'],
  ['  l3_red_suites: 1                # wb-growth-academy-verify（SPEC-003 立红；功能断言 0/77；CHG-020）—— **有意登记，不阻断总判定、不计入断言合计**',
   '  l3_red_suites: 0                # ✅ 红灯已清零（CHG-021）—— l3ExpectedRed: []；新出现的红灯必须逐个说明原因', 'l3_red_suites'],
  ['  determinism: "连续 3 次运行结果完全一致（L3 2256/2256，12 绿 + 1 红；断言合计 2,754/2,755；红灯进度 0/77）"',
   '  determinism: "连续 3 次运行结果完全一致（L3 2343/2343，13 套全绿；断言合计 2,869/2,870；冒烟 12/12）"', 'determinism'],
  ['state: TASKED, spec: "specs/003-growth-academy/spec.md"', 'state: IMPLEMENTED_PHASE1, spec: "specs/003-growth-academy/spec.md"', 'features.SPEC-003 state'],
  ['  - "ai-creator-community-wh/tools/wb-growth-academy-verify.js   ← SPEC-003 契约冻结自检（10 项契约 / 77 功能断言 / 🔴 已登记红灯）"',
   '  - "ai-creator-community-wh/tools/wb-growth-academy-verify.js   ← SPEC-003 契约冻结自检（10 项契约 / 77 功能断言 / ✅ 已转绿）"\n  - "ai-creator-community-wh/scratch/_spec003-phase1-smoke.js     ← SPEC-003 行为冒烟（12/12，异常 0；新旧双沙箱对比）"', 'artifacts'],
  ['  - "【下一步·已决策】执行 SPEC-003 Phase 1 的 31 项（tasks.md）',
   '  - "【下一步】SPEC-003 Phase 1 ✅ 已完成（CHG-021）。可选：A. SPEC-004 的 PLAN / TASKS（其 SPECIFY + CLARIFY 已完成）/ B. SPEC-003 Phase 2（8 项登记，须先重做其 plan / tasks）/ C. SPEC-001 Phase 2（账号骨架重构，风险最高）。⚠️ 三者都动 app.js ⇒ 必须串行（ENV-02）"\n  - "  ~~执行 SPEC-003 Phase 1 的 31 项（tasks.md）', 'next_actions'],
]);

// ---------- ② design-status.md ----------
subFile('project-design/99-ai/design-status.md', [
  ['→ 生命周期位置：[*] → PROJECT_INITIALIZATION → CLARIFY（P0 批次）→ SPECIFY → CLARIFY（Feature 级）→ CHECKLIST → PLAN → TASKS → **IMPLEMENT（`SPEC-001` Phase 1 ✅ / `SPEC-017` Phase 1 ✅ 均已落地）** → **【当前】第 3 批（`SPEC-003` 已完成 立红 → `PLAN` → `TASKS`；`SPEC-004` 完成 `SPECIFY` → `CLARIFY`）** → [下一批：`SPEC-003` Phase 1 实现 / `SPEC-004` 的 `PLAN`]',
   '→ 生命周期位置：[*] → PROJECT_INITIALIZATION → CLARIFY（P0 批次）→ SPECIFY → CLARIFY（Feature 级）→ CHECKLIST → PLAN → TASKS → **IMPLEMENT（`SPEC-001` ✅ / `SPEC-017` ✅ / **`SPEC-003` ✅** 三者 Phase 1 均已落地）** → **【当前】第 3 批完成（`SPEC-003` 全程走完；`SPEC-004` 完成 `SPECIFY` → `CLARIFY`）** → [下一批：`SPEC-004` 的 `PLAN` / `TASKS`，或 `SPEC-003` Phase 2]', '生命周期位置'],
  ['| 工具层 | ✅ 已变更：`tools/` 含 `gates.js` / `smoke-test.js` / `dup-method-check.js` / `gates-baseline.json` / `README.md`，**L3 共 13 套 = 12 套全绿（2,256 项）+ 🔴 1 套已登记红灯**（`wb-growth-academy-verify`，**功能断言 0/77**）（CHG-003 + CHG-007 + CHG-011 + CHG-013 + CHG-016 + CHG-017 + **CHG-020**） |',
   '| 工具层 | ✅ 已变更：**L3 共 13 套全部全绿（2,343 项）**，**红灯 0**（`l3ExpectedRed: []`）；新增 `wb-growth-academy-verify`（已转绿 87 项）；DUP **520 键 0 重复**（CHG-003 + CHG-007 + CHG-011 + CHG-013 + CHG-016 + CHG-017 + CHG-020 + **CHG-021**） |', '工具层'],
  ['| 本轮动作 | **`SPEC-003` 的立红 + `PLAN` + `TASKS`（CHG-020）**',
   '| 本轮动作 | **`SPEC-003` Phase 1 的 `IMPLEMENT`（CHG-021）**：**31 项全部落地**，**红灯转绿 0/77 → 77/77**（+ 不变量 10/10，exit 0）；`l3ExpectedRed` 清空、基线上调 2256 → **2343**（13 套）、DUP 492 → **520**。**实现学职引擎 10 方法 / 属性**（`awardLearningPoints` / `getLearningPoints` / `syncAcademyStats` / `markLessonDone` / `evaluateLevelUp` / `LEVEL_GATES` / `maybeUnlockCerts` / `claimCertificate` / `switchAcademySubPage` / `completeLesson` 兼容壳）+ 资源库 5 入口 + 评价 2 + 相邻课节 + 成就墙 + 排序 2；**修复 4 处缺陷**（三套加分逻辑 / 晋级判据 / `plans[0]` 兜底 / 等级口径）；**修正数据层**（`paths` 阈值命名收敛、`studyLog` 50 → 30、`progress` 异常值）。⚠️ **新增 `RISK-003-08`**：`wb-academy-path-verify` 有 7 项断言基于已作废旧口径 ⇒ 已同步期望值（**非放宽标准**）。**`index.html` 1 处改动 / `css` 零改动** | 上一轮（CHG-020）：**`SPEC-003` 的立红 + `PLAN` + `TASKS`**', '本轮动作'],
  ['| **SPEC-003** 成长学院（课程研习与认证） | ✅ **`TASKED`**（2026-09-25；同日 `SPECIFY` → `CLARIFY` → 立红 → `PLAN` → `TASKS`） | `spec.md` / **`plan.md`** / **`tasks.md`** / **`data-model.md`** / **`research.md`**；**验证证据** = `tools/wb-growth-academy-verify.js`（🔴 **功能断言 0/77**，已登记 `l3ExpectedRed`） |',
   '| **SPEC-003** 成长学院（课程研习与认证） | ✅ **`IMPLEMENTED`（Phase 1）**（2026-09-25；`SPECIFY` → `CLARIFY` → 立红 → `PLAN` → `TASKS` → **`IMPLEMENT`**，`CHG-018` ~ `CHG-021`） | `spec.md` / **`plan.md`** / **`tasks.md`** / **`data-model.md`** / **`research.md`**；**验证证据** = `tools/wb-growth-academy-verify.js`（✅ **77/77 + 10/10，exit 0**，已转绿）；实现落点：`js/app.js`、`js/mock_data.js`、`index.html`（1 处）；**Phase 2 未启动** |', 'SPEC-003 行'],
]);
