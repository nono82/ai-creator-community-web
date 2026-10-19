'use strict';
/** CHG-023 批 2b：workspace-state.yaml + design-status.md。 */
const fs = require('fs');

function patch(P, rules, inserts) {
  let L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
  const snap = L.slice();
  let hit = 0; const miss = [];
  rules.forEach(function (pair) {
    const i = snap.findIndex(function (l) { return l.startsWith(pair[0]); });
    if (i >= 0) { L[i] = pair[1]; hit++; } else miss.push(pair[0].slice(0, 34));
  });
  let ins = 0;
  (inserts || []).forEach(function (it) {
    const i = L.findIndex(function (l) { return l.startsWith(it.anchor); });
    if (i > 0 && !L[i + 1].startsWith(it.guard)) { L.splice(i + 1, 0, ...it.rows); ins++; }
  });
  fs.writeFileSync(P, L.join('\n'));
  console.log(P + ' → 替换 ' + hit + '/' + rules.length + '｜插入 ' + ins + '/' + ((inserts || []).length) + '｜行数 ' + L.length + (miss.length ? '｜未命中：' + miss.join(' ; ') : ''));
}

// ---------- ① workspace-state.yaml ----------
patch('project-design/99-ai/workspace-state.yaml', [
  ['  current_phase:', '  current_phase: "IMPLEMENT"'],
  ['  phase_status:', '  phase_status: "SPEC004_PHASE1_COMPLETED"'],
  ['  next_phase:', '  next_phase: "NEXT_FEATURE"             # 四 Feature 的 Phase 1 均已落地；下一批从 specs/README.md §4 取（含各 Feature 的 Phase 2）'],
  ['  completed_phases:', '  completed_phases: ["PROJECT_INITIALIZATION", "CLARIFY_P0_BATCH", "SPECIFY_SPEC001", "CLARIFY_SPEC001", "CHECKLIST_SPEC001", "PLAN_SPEC001", "TASKS_SPEC001", "IMPLEMENT_SPEC001_PHASE1", "CONVERGE_SPEC001_PHASE1", "SPECIFY_SPEC017", "CLARIFY_SPEC017", "L3_RED_REGISTERED_SPEC017", "PLAN_SPEC017", "TASKS_SPEC017", "IMPLEMENT_SPEC017_PHASE1", "CONVERGE_SPEC017_PHASE1", "SPECIFY_SPEC003", "SPECIFY_SPEC004", "CLARIFY_SPEC003", "CLARIFY_SPEC004", "L3_RED_REGISTERED_SPEC003", "PLAN_SPEC003", "TASKS_SPEC003", "IMPLEMENT_SPEC003_PHASE1", "CONVERGE_SPEC003_PHASE1", "L3_RED_REGISTERED_SPEC004", "PLAN_SPEC004", "TASKS_SPEC004", "IMPLEMENT_SPEC004_PHASE1", "CONVERGE_SPEC004_PHASE1"]'],
  ['  last_updated:', '  last_updated: "2026-09-25"'],
  ['  spec004_status:', '  spec004_status: "IMPLEMENTED_PHASE1"  # CHG-023；Phase 1 的 31 项全部落地，冻结自检 126/126 + 14/14（exit 0）'],
  ['  app_code_modified:', '  app_code_modified: true           # ⚠️ 已改（CHG-013 / CHG-017 / CHG-021 / CHG-023）：js/app.js + js/mock_data.js + index.html + css/style.css'],
  ['  specs_phase1_implemented:', '  specs_phase1_implemented: 4     # SPEC-001 / SPEC-017 / SPEC-003 / SPEC-004（CHG-023）'],
  ['  l3_green_suites:', '  l3_green_suites: 14             # 2,483 项（上一轮 13 套 2,343 + wb-creator-tools-verify 140）'],
  ['  l3_red_suites:', '  l3_red_suites: 0                # ✅ 红灯已清零（CHG-023）—— l3ExpectedRed: []；新出现的红灯必须逐个说明原因'],
  ['      - {suite: wb-creator-tools-verify,',
   '      - {suite: (none), note: "CHG-023：wb-creator-tools-verify 已转绿 ⇒ registered 清空（见 transitioned）"}'],
  ['  determinism:', '  determinism: "连续 3 次运行结果完全一致（L3 2483/2483，14 套全绿；断言合计 3,039/3,040；白盒套件 140 项；行为冒烟 39/39）"'],
  ['  implemented_phase1: ["SPEC-001", "SPEC-017"]', '  implemented_phase1: ["SPEC-001", "SPEC-003", "SPEC-004", "SPEC-017"]'],
  ['  phase2_pending:', '  phase2_pending: ["SPEC-001", "SPEC-003", "SPEC-004", "SPEC-017"]  # 四者的 Phase 2 均未启动（属有意，见各自 tasks.md）'],
  ['    - {id: SPEC-004,',
   '    - {id: SPEC-004, name: "创作工具工作台与模板套用", priority: P0, release: MVP, state: IMPLEMENTED_PHASE1, spec: "specs/004-creator-tools/spec.md", plan: "specs/004-creator-tools/plan.md", tasks: "specs/004-creator-tools/tasks.md", data_model: "specs/004-creator-tools/data-model.md", research: "specs/004-creator-tools/research.md", specified_at: "2026-09-25", clarified_at: "2026-09-25", tasked_at: "2026-09-25", implemented_at: "2026-09-25", depends_on: ["SPEC-009", "SPEC-017"], note: "Phase 1 已落地（CHG-023）：js/app.js 新增约 30 个方法 / 属性；mock_data.js 加 integration(9) + id(10) + toolDetails(9) + 新增 TL9；index.html 仅 +1 段 +2 个 id；css 新增详情页类。冻结自检 4/126 → 126/126（+14/14，exit 0）并转为回归防线；门禁 L3 2343 → 2483（14 套全绿、红灯 0）；L1 7 → 5 ERROR（下调）；DUP 520 → 550。Phase 1 硬约束完全满足（#modal-studio 仅加 2 个 id / 5 个既有方法逐字一致，冒烟 P0 直接比文本）。9 处缺陷全部收敛；剩余 Q-043 两处数值与合规参数；REQ-084 为悬空引用待裁决"}'],
], [
  { anchor: '      - {suite: wb-growth-academy-verify, feature: SPEC-003,',
    guard: '      - {suite: wb-creator-tools-verify, feature: SPEC-004,',
    rows: [
      '      - {suite: wb-creator-tools-verify, feature: SPEC-004, scope: "Phase 1（集成模式数据化 + 卡片路由 + 详情页壳 + 生成两阶段计费 + 双路流转 + 模板套用 + 历史草稿 + Hero 内容集合）", was: "功能断言 4/126", now: "功能断言 126/126，不变量 14/14，断言 140/140，exit 0", became: "回归防线", ref: CHG-023}',
    ] },
]);

// ---------- ② design-status.md ----------
patch('project-design/99-ai/design-status.md', [
  ['→ 生命周期位置：', '→ 生命周期位置：[*] → PROJECT_INITIALIZATION → CLARIFY（P0 批次）→ SPECIFY → CLARIFY（Feature 级）→ CHECKLIST → PLAN → TASKS → **IMPLEMENT（`SPEC-001` ✅ / `SPEC-017` ✅ / `SPEC-003` ✅ / **`SPEC-004` ✅** — 四者 Phase 1 均已落地）** → [下一批：各 Feature 的 Phase 2，或按 `specs/README.md` §4 推进新批次]'],
  ['| 设计深度 |', '| 设计深度 | **L0 总览 + L1 业务 / Feature Map + L2 **四个** Feature 的完整规格链 + **四者 Phase 1 均已落地** + `IMPLEMENT`** |'],
  ['| 已建立 |', '| 已建立 | Constitution、项目上下文、术语表、全局需求、业务视图、领域总览、架构视图、技术基线、Feature Map、Roadmap、风险登记册、**`SPEC-001` / `SPEC-017` / `SPEC-003` / `SPEC-004` 四条完整规格链 + 四者的可用实现** |'],
  ['| 未建立 |', '| 未建立 | 其余 **12 个** Feature 的 `spec.md` / `plan.md` / `tasks.md`；四者的 `checklists/`（`SPEC-001` 除外）；**`contracts/`（有意不建 —— 契约已在 `spec.md` FR + 冻结自检套件头部冻结）**；后端设计；数据库设计；API 契约 |'],
  ['| 应用代码 |', '| 应用代码 | ✅ **已变动（CHG-013 + CHG-017 + CHG-021 + CHG-023）**：**CHG-023** —— `js/app.js` 新增**创作工具 30 个方法 / 属性**（集成模式三值 + 解析 + 卡片统一路由 + 详情页 8 方法 + 生成两阶段计费 6 + 模板套用 2 + 历史与草稿 4 + 渲染辅助）；`js/mock_data.js` 加 `integration`(9 项) / `id`(10 项) / **新增 `toolDetails`**(9 工具) / 新增 **TL9「AI 音乐」**；`index.html` **仅新增 1 段**（`#view-tool-detail`）+ **2 个 `id` 属性**；`css/style.css` **新增详情页类**（走 `:root`）。🔴 **`#modal-studio` 段与 5 个既有方法逐字一致**（冒烟 P0 直接比文本）。备份：`scratch/*.bak-20260925-130137` |'],
  ['| 工具层 |', '| 工具层 | ✅ 已变更：**L3 共 14 套全部全绿（2,483 项）**，**红灯 0**（`l3ExpectedRed: []`）；新增 `wb-creator-tools-verify`（**已转绿 140 项**）；DUP **550 键 0 重复**；`smoke-test.js` 的 L2-2 引入**二级页面白名单**（CHG-003 + CHG-007 + CHG-011 + CHG-013 + CHG-016 + CHG-017 + CHG-020 + CHG-021 + CHG-022 + **CHG-023**） |'],
  ['| 本轮动作 |', '| 本轮动作 | **`SPEC-004` Phase 1 的 `IMPLEMENT`（CHG-023）**：**31 项全部落地**，**红灯转绿 `4/126` → `126/126`**（+ 不变量 14/14，exit 0）；`l3ExpectedRed` 清空、基线上调 2343 → **2483**（14 套）、**L1 由 7 → 5 ERROR**（**下调** —— 本 Feature 实现了 L1 契约声明的 `openStudioModal` 与 `applyTemplateToWorkspace`）、DUP 520 → **550**。**实现**：集成模式三值真源与解析 · 卡片统一路由（矩阵 / 工具箱 / 榜单）· **路由级详情页** `#view-tool-detail` · Hero 可收起 + 四标签 · 工作区两标签（集成工具换余额 / 充值 / 去使用）· **生成两阶段计费**（预扣 → 落盘 → **失败全额退还 + 零残留**）· 模板套用 · 历史任务（未知状态显式标记）与草稿恢复。🔴 **Phase 1 硬约束完全满足**（`#modal-studio` 仅加 2 个 `id`）。⚠️ **一处对既有防线的修改**：`smoke-test.js` 的 **L2-2** 由「七视图可达」演进为「视图可达 + 二级页面白名单」（**只放宽 `nav` 一半**）。**9 处缺陷全部收敛**；**行为冒烟 39/39 / 异常 0** |'],
  ['| **SPEC-004** 创作工具工作台与模板套用 |', '| **SPEC-004** 创作工具工作台与模板套用 | ✅ **`IMPLEMENTED`（Phase 1）**（2026-09-25；同日 `SPECIFY` → `CLARIFY` → 立红 → `PLAN` → `TASKS` → `IMPLEMENT`） | `spec.md` / **`plan.md`** / **`tasks.md`** / **`data-model.md`** / **`research.md`**；**验证证据** = `tools/wb-creator-tools-verify.js`（✅ **126/126 + 14/14**，已转绿为回归防线）；实现落点：`js/app.js` / `js/mock_data.js` / `index.html` / `css/style.css` |'],
], [
  { anchor: '| 2026-09-25 | **`SPEC-004` 的立红 + `PLAN` + `TASKS`（CHG-022）** |',
    guard: '| 2026-09-25 | **`SPEC-004` Phase 1 的 `IMPLEMENT`（CHG-023）** |',
    rows: [
      '| 2026-09-25 | **`SPEC-004` Phase 1 的 `IMPLEMENT`（CHG-023）** | **31 项全部落地，红灯转绿 `4/126` → `126/126`**（+ 不变量 14/14，exit 0）；`l3ExpectedRed` 清空、基线上调 2343 → **2483**（14 套）、**L1 由 7 → 5 ERROR（下调）**、DUP 520 → 550。**新增约 30 个方法 / 属性**；`index.html` 仅 +1 段 +2 个 `id`。🔴 **Phase 1 硬约束完全满足**：`#modal-studio` 段**仅加 2 个 `id`**、5 个既有方法（含 `simulateGenerate`）**逐字一致**（冒烟 P0 直接比文本）。⚠️ **一处对既有回归防线的修改**：`smoke-test.js` 的 **L2-2** 由「七视图可达（nav ↔ 视图一一对应）」演进为「**视图可达**（主视图一一对应；二级页面唯一可见但**不入主导航**）」+ 显式白名单 `SECONDARY_VIEWS`。**9 处缺陷全部收敛**；**行为冒烟 39/39 / 异常 0** | 18 | `change-impact.md` CHG-023 |',
    ] },
]);
