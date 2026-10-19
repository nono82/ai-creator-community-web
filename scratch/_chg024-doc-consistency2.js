/**
 * CHG-024 · 跨文档一致性收口 —— 第二批
 *
 * 第一批（_chg024-doc-consistency.js）修的是一眼可见的「当前状态」数字（18 处）。
 * 本批修的是**承载"下一步"语义**的段落 —— 它们停留在旧轮次（CHG-013 / CHG-017），
 * 会**误导后续决策**（§八「下一步重点」仍写着"执行 SPEC-017 Phase 1"）。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
let problems = 0;
let applied = 0;

function patch(rel, pairs) {
  const p = path.join(ROOT, rel);
  let s = fs.readFileSync(p, 'utf8');
  const before = s;
  console.log('\n=== ' + rel + ' ===');
  for (let i = 0; i < pairs.length; i++) {
    const from = pairs[i][0];
    const to = pairs[i][1];
    const n = s.split(from).length - 1;
    if (n === 0) { console.log('  [MISS] ' + from.slice(0, 88)); problems++; continue; }
    if (n > 1) console.log('  [WARN] 命中 ' + n + ' 次');
    s = s.replace(from, to);
    applied++;
    console.log('  [OK] ' + from.slice(0, 70));
  }
  if (s !== before) { fs.writeFileSync(p, s); console.log('  -> 已写回'); }
  else console.log('  -> 无改动');
}

// ---------- A. design-status.md ----------
patch('project-design/99-ai/design-status.md', [
  ['| 未建立 | 其余 **12 个** Feature 的 `spec.md`',
   '| 未建立 | 其余 **13 个** Feature 的 `spec.md`'],

  ['> **上一轮完成（`CHG-017`）**：`SPEC-017` 的 `IMPLEMENT`（Phase 1）—— 26 项全部落地；冻结自检 `5/66` → `66/66`（+ 不变量 `7/7`，退出码 0）并转为**回归防线**；门禁 L3 `2,183` → `2,256` 项 / 12 套全绿；`index.html` / `css` 未动。',
   '> **上一轮完成（`CHG-023`）**：`SPEC-004` 的 `IMPLEMENT`（Phase 1）—— 31 项全部落地；冻结自检 `4/126` → `126/126`（+ 不变量 `14/14`，退出码 0）并转为**回归防线**；门禁 L3 `2,343` → `2,483` 项 / 14 套全绿；**L1 由 7 → 5 ERROR（下调）**、DUP `520` → `550`；`index.html` **仅 +1 段 +2 个 `id`**。'],

  ['**本轮实测（`IMPLEMENT` 后）**：L1 **7 ERROR（= 基线）** / **DUP 480 键 0 重复** / L2 6/6 / MX 通过 / **L3 11 套全绿 2,183 项，红灯 0** / 断言合计 **2,669/2,670** / **总判定通过 ✅** / exit 0 / **连续 3 次一致**。**`index.html` / `css/style.css` 时间戳未变。**',
   '**本轮实测（`--baseline`，2026-09-25 · `CHG-023` + `CHG-024` 复跑）**：L1 **5 ERROR（= 基线）** / **DUP 550 键 0 重复** / L2 6/6 / MX 通过 / **L3 14 套全绿 2,483 项，红灯 0** / 断言合计 **3,039/3,040** / **总判定通过 ✅** / exit 0 / **连续 3 次一致**。⚠️ 严格模式下 L1 仍 FAIL（5 ERROR）—— 那是**存量债务**，非回归。'],

  ['**下一步重点：执行 `SPEC-017` Phase 1 第一刀的 26 项任务（`tasks.md`），让冻结自检由 🔴 转 🟢。**',
   '**下一步重点：`SPEC-001` / `SPEC-017` / `SPEC-003` / `SPEC-004` 四者的 Phase 1 均已落地（`CHG-013` ~ `CHG-023`），当前有效阻塞 = 0。下一批 Feature 的推进顺序存在**三处文档不一致**（已登记为 **`GAP-14`**，见 §四 缺口表）⇒ **须先裁决顺序，再启动 `SPECIFY`**；不得在顺序未定时直接为某一 Feature 写 `spec.md`。'],

  ['18. **后续 Feature 批次（2026-09-24 已修正）**：**`SPEC-003`（成长学院）→ `SPEC-004`（创作工具）** —— ⚠️ 二者均依赖 `SPEC-017`，**但其契约现已冻结**（`plan.md` §二十三 明确列出给下游的**四项接口**：对象键语义 / 引用记账口径 / 五处引用点 / 失败零残留）⇒ **可以启动它们的 `SPECIFY`**（纯文档，与 `SPEC-017` Phase 1 的实现**不冲突**）。**`SPEC-016`（站内消息）后移至 `SPEC-006` / `SPEC-007` 之后**（见 `specs/README.md` §4）。',
   '18. ✅ **后续 Feature 批次（已完成）**：`SPEC-003` → `SPEC-004` 均已完成全程并落地 Phase 1（`CHG-018` ~ `CHG-023`）；`SPEC-016` 按实测**后移**至 `SPEC-006` / `SPEC-007` 之后（其发送点清单是二者业务动作的函数）。\n19. 🔴 **裁决下一批 Feature 的顺序（`GAP-14`）** —— 三处不一致：① `workspace-state.yaml` `key_path_note` + 本文件 §七 = **`SPEC-006 → SPEC-008 → SPEC-009`**；② `specs/README.md` §4 第 4 批 = **`SPEC-009 → SPEC-008`**（与 ① 相反）；③ 依赖图实测 `S008 → S006` **且** `S006 → S008` ⇒ **构成循环**。**判据**：「被依赖度」>「自身优先级」⇒ `SPEC-008` 被 `S006` / `S009` / `S010` / `S015` 依赖，**被依赖度最高**；但 `SPEC-006` 是平台核心收入来源（`S011` / `S013` / `S015` / `S016` 均依赖其业务动作）。⇒ **建议：以 `SPEC-008` 的「契约冻结（双阶段声明：Stage A 演示态 / Stage B 目标态）」解开循环，再并行推进 `SPEC-006`**（`SPEC-008` 的 `Q-019` 已 RESOLVED，PoC 属 V1.0 门槛、不阻塞 MVP）。\n20. **`CHG-024`（2026-09-25）一致性收口**：修正 25 处**跨文档过时数字**（门禁状态 / Feature 计数 / 下一步段落）；未改任何代码 —— 门禁复跑与收口前**逐项一致**。🔑 **教训：`IMPLEMENT` 的收口动作（回填 §四 / §八 / `gate_status`）此前仅做了「部分字段」，导致同一事实出现两份矛盾记录（项目铁律已预警）。**'],
]);

// ---------- B. workspace-state.yaml ----------
patch('project-design/99-ai/workspace-state.yaml', [
  ['gate_status:                      # 2026-09-24 实测（node tools/gates.js --baseline）；CHG-007 后',
   'gate_status:                      # 2026-09-25 实测（node tools/gates.js --baseline）；CHG-023 后'],

  ['    measured: {errors: 7, warns: 0, docs: 9}',
   '    measured: {errors: 5, warns: 0, docs: 9}'],

  ['    note: "基线下调 32 → 7（CHG-007）：去重自动消掉 25 条「方法被重复定义」自检 ERROR。剩余 7 条全为「文档声明但代码不存在的 App 函数」（命名漂移，见 FU-002）"',
   '    note: "基线下调链：32 → 7（CHG-007 去重自动消掉 25 条「方法被重复定义」）→ **5（CHG-023 下调，实现了 openStudioModal / applyTemplateToWorkspace）**。剩余 5 条全为「文档声明但代码不存在的 App 函数」（命名漂移，见 FU-002）：showAcademyCoursesPage / openMyCerts ×2（GAP-13，SPEC-003 遗留）+ showTaskPublishPage / openTaskDetail（SPEC-006 范围）"'],

  ['    measured: {duplicates: 0, keys: 480, whitelisted: 0}   # keys 466 → 480（CHG-013：+14 个新增方法，全部唯一）',
   '    measured: {duplicates: 0, keys: 550, whitelisted: 0}   # keys 466 → 480（CHG-013）→ 492（CHG-017）→ 520（CHG-021）→ 550（CHG-023：+30 个 SPEC-004 方法），全部唯一'],

  ['    impl: "tools/wb-*-verify.js × 11（原 temp/ 9 套已转正；CHG-007 新增 wb-debt-remediation-verify；CHG-011 新增 wb-identity-admission-verify；CHG-013 后者转绿）"',
   '    impl: "tools/wb-*-verify.js × 14（原 temp/ 9 套已转正；CHG-007 新增 wb-debt-remediation-verify；CHG-011 新增 wb-identity-admission-verify【CHG-013 转绿】；CHG-016 新增 wb-content-asset-verify【CHG-017 转绿】；CHG-020 新增 wb-growth-academy-verify【CHG-021 转绿】；CHG-022 新增 wb-creator-tools-verify【CHG-023 转绿】）"'],

  ['    measured: {assertions_pass: 2183, assertions_total: 2183, suites: 11, green_suites: 11, red_suites: 0}',
   '    measured: {assertions_pass: 2483, assertions_total: 2483, suites: 14, green_suites: 14, red_suites: 0}'],

  ['  overall: "PASS（--baseline 模式）；严格模式下 L1 FAIL（7 ERROR）属预期"',
   '  overall: "PASS（--baseline 模式）；严格模式下 L1 FAIL（5 ERROR）属预期 —— 存量债务，非回归"'],

  ['  - "后续 Feature 批次：**SPEC-003（成长学院）→ SPEC-004（创作工具）** —— ✅ **SPEC-017 的契约已冻结并已落地实现**（plan.md §二十三 的**五项接口**：对象键语义 / 引用记账口径 / 五处引用点 / 失败零残留 / 回收语义）⇒ **可以直接启动它们的 SPECIFY**"',
   '  - "🔴 【须先裁决】下一批 Feature 的顺序（GAP-14）：三处文档不一致 —— ① 本文件 key_path_note + design-status §七 = SPEC-006 → SPEC-008 → SPEC-009；② specs/README.md §4 第 4 批 = SPEC-009 → SPEC-008（与 ① 相反）；③ 依赖图 S008 → S006 且 S006 → S008（**循环**）。建议：以 SPEC-008 的契约冻结解开循环，再推进 SPEC-006"'],

  ['  - "【下一步】SPEC-003 Phase 1 ✅ 已完成（CHG-021）。可选：A. SPEC-004 的 PLAN / TASKS（其 SPECIFY + CLARIFY 已完成）/ B. SPEC-003 Phase 2（8 项登记，须先重做其 plan / tasks）/ C. SPEC-001 Phase 2（账号骨架重构，风险最高）。⚠️ 三者都动 app.js ⇒ 必须串行（ENV-02）"',
   '  - "【下一步】四 Feature 的 Phase 1 均已落地（SPEC-001 / SPEC-017 / SPEC-003 / SPEC-004，CHG-013 ~ CHG-023），有效阻塞 0。⚠️ 下一批顺序须先裁决（见下条 GAP-14）。可选路径：A. SPEC-008 契约冻结（被依赖度最高）→ 再 SPEC-006；B. 任一 Feature 的 Phase 2（001 = 12 项 / 017 = 10 项 / 003 = 8 项 / 004 = 5 项，启动前须重做其 plan / tasks）；C. SPEC-006（任务广场，含 Q-036 的字段对齐）。⚠️ 全部动 js/app.js ⇒ 按 ENV-02 必须串行"'],
]);

// ---------- 负向复核 ----------
console.log('\n=== 负向复核 ===');
const stale = [
  ['project-design/99-ai/design-status.md', ['**下一步重点：执行 `SPEC-017`', '**上一轮完成（`CHG-017`）**']],
  ['project-design/99-ai/workspace-state.yaml', ['measured: {errors: 7', 'keys: 480,', 'assertions_pass: 2183', 'L1 FAIL（7 ERROR）', '【下一步】SPEC-003 Phase 1 ✅ 已完成（CHG-021）']],
];
let residue = 0;
stale.forEach(function (item) {
  const s = fs.readFileSync(path.join(ROOT, item[0]), 'utf8');
  item[1].forEach(function (frag) {
    if (s.indexOf(frag) !== -1) { console.log('  ✗ 仍残留: ' + item[0] + ' :: ' + frag); residue++; }
  });
});
if (residue === 0) console.log('  ✓ 无残留');

console.log('\n已应用替换：' + applied + '；未命中：' + problems + '；残留：' + residue);
if (problems > 0 || residue > 0) process.exit(1);
console.log('✅ 第二批完成');
