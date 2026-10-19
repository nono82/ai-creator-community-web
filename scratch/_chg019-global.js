'use strict';
/** CHG-019 全局同步：两份 spec 状态 + workspace-state + specs/README + feature-map + design-status。 */
const fs = require('fs');
function patch(P, rules, inserts) {
  let L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
  let hit = 0, miss = [];
  rules.forEach(([pre, to]) => {
    const i = L.findIndex((l) => l.startsWith(pre));
    if (i >= 0) { L[i] = to; hit++; } else miss.push(pre.slice(0, 30));
  });
  let ins = 0;
  (inserts || []).forEach(({ anchor, rows, guard }) => {
    const i = L.findIndex((l) => l.startsWith(anchor));
    if (i > 0 && !L[i + 1]?.startsWith(guard)) { L.splice(i + 1, 0, ...rows); ins++; }
  });
  fs.writeFileSync(P, L.join('\n'));
  console.log(P + ' → 替换 ' + hit + '/' + rules.length + '｜插入 ' + ins + '｜行数 ' + L.length + (miss.length ? '｜⚠️ 未命中：' + miss.join(' ; ') : ''));
}

// ① 两份 spec.md 的状态
patch('specs/003-growth-academy/spec.md', [
  ['> **生命周期状态**：`SPECIFIED`（2026-09-25）', '> **生命周期状态**：**`CLARIFIED`**（2026-09-25；`SPECIFY` → `CLARIFY` 同日完成 —— `Q-046` / `Q-047` / `Q-048` 三条已定稿，见 **§7.6**）'],
]);
patch('specs/004-creator-tools/spec.md', [
  ['> **生命周期状态**：`SPECIFIED`（2026-09-25）', '> **生命周期状态**：**`CLARIFIED`**（2026-09-25；`SPECIFY` → `CLARIFY` 同日完成 —— `Q-049` / `Q-050` / `Q-051` 三条已定稿，见 **§7.6**）'],
]);

// ② workspace-state
patch('project-design/99-ai/workspace-state.yaml', [
  ['  current_phase:', '  current_phase: "CLARIFY"'],
  ['  phase_status:', '  phase_status: "SPEC003_004_CLARIFIED"'],
  ['  next_phase:', '  next_phase: "PLAN_SPEC003_004"    # ✅ 六条问题已定稿 ⇒ 无 CLARIFY 阻塞；⚠️ SPEC-004 的 `Q-050` 唯余 SPEC-009 的就绪时点（属排期）'],
  ['  completed_phases:', '  completed_phases: ["PROJECT_INITIALIZATION", "CLARIFY_P0_BATCH", "SPECIFY_SPEC001", "CLARIFY_SPEC001", "CHECKLIST_SPEC001", "PLAN_SPEC001", "TASKS_SPEC001", "IMPLEMENT_SPEC001_PHASE1", "CONVERGE_SPEC001_PHASE1", "SPECIFY_SPEC017", "CLARIFY_SPEC017", "L3_RED_REGISTERED_SPEC017", "PLAN_SPEC017", "TASKS_SPEC017", "IMPLEMENT_SPEC017_PHASE1", "CONVERGE_SPEC017_PHASE1", "SPECIFY_SPEC003", "SPECIFY_SPEC004", "CLARIFY_SPEC003", "CLARIFY_SPEC004"]'],
  ['  spec003_status:', '  spec003_status: "CLARIFIED"        # CHG-019；Q-046~Q-048 已定稿（见其 spec.md §7.6）'],
  ['  spec004_status:', '  spec004_status: "CLARIFIED"        # CHG-019；Q-049~Q-051 已定稿（见其 spec.md §7.6）'],
  ['  specified: ["SPEC-001", "SPEC-003", "SPEC-004", "SPEC-017"]', '  specified: ["SPEC-001", "SPEC-003", "SPEC-004", "SPEC-017"]\n  clarified: ["SPEC-001", "SPEC-003", "SPEC-004", "SPEC-017"]'],
]);

// ③ specs/README
patch('specs/README.md', [
  ['| **SPEC-003** 成长学院（课程研习与认证） |', '| **SPEC-003** 成长学院（课程研习与认证） | **CLARIFIED**（2026-09-25；`SPECIFY` → `CLARIFY` 同日完成，`CHG-018` + `CHG-019`） | **`spec.md`**（14 US / 20 SC / 53 FR（9 组）/ 19 EX；**§7.6 CLARIFY 结论**）；`plan.md` / `tasks.md` / `data-model.md` / `research.md` / `checklists/` **未创建**（待其 `PLAN` / `TASKS` 阶段） |'],
  ['| **SPEC-004** 创作工具工作台与模板套用 |', '| **SPEC-004** 创作工具工作台与模板套用 | **CLARIFIED**（2026-09-25；`SPECIFY` → `CLARIFY` 同日完成，`CHG-018` + `CHG-019`） | **`spec.md`**（15 US / 16 SC / 37 FR（8 组）/ 15 EX；**§7.6 CLARIFY 结论**）；`plan.md` / `tasks.md` / `data-model.md` / `research.md` / `checklists/` **未创建**（待其 `PLAN` / `TASKS` 阶段） |'],
  ['| **第 3 批** |', '| **第 3 批** | ✅ **`SPEC-003`（成长学院）/ `SPEC-004`（创作工具）已完成 `SPECIFY` → `CLARIFY`**（2026-09-25，`CHG-018` + `CHG-019`）—— 六条问题（含三条 P1）**全部定稿**；⚠️ **`SPEC-004` 的「分源扣减 / 全额退还」仍取决于 `SPEC-009`（`IDEA`）的就绪时点** | 关键路径中段 |'],
]);

// ④ feature-map
patch('project-design/05-feature-map.md', [
  ['| **SPEC-003** |', '| **SPEC-003** | 成长学院（课程研习与认证） | 让零基础创作者具备可商业化的技能，并产出供给 | REQ-101~108 | SPEC-001、SPEC-017 | **P0** | MVP | ✅ **`CLARIFIED`**（2026-09-25；`specs/003-growth-academy/`）。⚠️ 实测为「骨架完整、业务未通电」；§1.3 固化 **4 处真实缺陷**；**§7.6 定稿 `Q-046`（等级判定真源 = 本 Feature）** |'],
  ['| **SPEC-004** |', '| **SPEC-004** | 创作工具工作台与模板套用 | 把"灵感"变成"可交付的成片资产" | REQ-201~REQ-206 | SPEC-009（扣积分）、SPEC-017 | **P0** | MVP | ✅ **`CLARIFIED`**（2026-09-25；`specs/004-creator-tools/`）。⚠️ §1.3 固化 **3 处真实缺陷**；**§7.6 定稿 `Q-049`（两阶段迁移）/ `Q-050`（分源池真源归 `SPEC-009`）** |'],
]);

// ⑤ design-status（§一 当前 + §七 两行 + §十）
patch('project-design/99-ai/design-status.md', [
  ['→ **【当前】`IMPLEMENT`（Phase 1）✅ 已完成**', '→ `IMPLEMENT`（Phase 1）✅ 已完成：26 项全部落地，**红灯转绿 `5/66` → `66/66`**（CHG-017）\n→ **【当前】`SPEC-003` / `SPEC-004` 的 `SPECIFY` ✅ + `CLARIFY` ✅ 已完成**（`CHG-018` + `CHG-019`）—— **六条问题（含三条 P1）同日全部定稿**'],
  ['| **本轮动作** |', '| 本轮动作 | **`SPEC-003` / `SPEC-004` 的 `CLARIFY`（CHG-019）**：**六条问题同日全部定稿** —— **`Q-046`** ⇒ **等级判定真源 = `SPEC-003` 的学职引擎**（`SPEC-002` 只消费；依据：`REQ-004` 规定等级由累计创作积分定级 + `feature-map` 依赖方向已含 `SPEC-003` + 与 `SPEC-001` 委托化先例同构）；**`Q-047`** ⇒ 沿用 `localStorage`；**`Q-048`** ⇒ 演示态模拟下载；**`Q-049`** ⇒ **两阶段迁移**（先建壳后迁内；实测弹窗绑定 10 处）；**`Q-050`** ⇒ **分源池真源归 `SPEC-009`**（过渡期沿用既有入口，🔴 不得新增"池"）；**`Q-051`** ⇒ 需新增工具维度数据集合。⇒ 两份 spec 各新增 **§7.6 CLARIFY 结论**。**未改业务代码** |'],
  ['| **SPEC-003** 成长学院（课程研习与认证） |', '| **SPEC-003** 成长学院（课程研习与认证） | ✅ **`CLARIFIED`**（2026-09-25；`SPECIFY` → `CLARIFY` 同日完成，`CHG-018` + `CHG-019`） | **`spec.md`**（14 US / 20 SC / 53 FR（9 组）/ 19 EX，含 **§7.6 CLARIFY 结论**） |'],
  ['| **SPEC-004** 创作工具工作台与模板套用 |', '| **SPEC-004** 创作工具工作台与模板套用 | ✅ **`CLARIFIED`**（2026-09-25；`SPECIFY` → `CLARIFY` 同日完成，`CHG-018` + `CHG-019`） | **`spec.md`**（15 US / 16 SC / 37 FR（8 组）/ 15 EX，含 **§7.6 CLARIFY 结论**） |'],
], [
  { anchor: '| 2026-09-25 | **`SPEC-003` / `SPEC-004` 的 `SPECIFY`（CHG-018）** |', rows: [
    '| 2026-09-25 | **`SPEC-003` / `SPEC-004` 的 `CLARIFY`（CHG-019）** | **六条问题同日全部定稿**（含三条 P1）：**`Q-046`** ⇒ **等级判定真源 = `SPEC-003` 的学职引擎**、`SPEC-002` 只消费（三条实测依据）；**`Q-047`** ⇒ 沿用「会话内存 + `localStorage`」；**`Q-048`** ⇒ 演示态「模拟下载 + 加分」；**`Q-049`** ⇒ **两阶段迁移**（Phase 1 建壳 / Phase 2 迁内；实测 `#modal-studio` 绑定 **10 处**）；**`Q-050`** ⇒ **分源池真源归 `SPEC-009`**、过渡期沿用 `getComputeBalances` / `syncComputeBalances`、🔴 **不得新增"池"结构**；**`Q-051`** ⇒ 需新增工具维度数据集合、工具评论独立。⇒ 两份 spec 各新增 **§7.6**；`DA-003-04` / `DA-004-01` / `DA-004-02` **升级为已确认**。**未改业务代码** | 11 | `change-impact.md` CHG-019 |',
  ], guard: '| 2026-09-25 | **`SPEC-003` / `SPEC-004` 的 `CLARIFY`' },
]);
