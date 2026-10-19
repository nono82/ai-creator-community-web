/**
 * CHG-024 · 跨文档一致性收口（Cross-document Consistency Sweep）
 *
 * 背景：CHG-023（SPEC-004 Phase 1 落地）后，多份「当前状态」文档中的门禁数字**未同步**，
 *       形成「同一事实的两份矛盾记录」（项目铁律：每次收口按 ID 扫重）。
 *
 * 原则：
 *   ① 只改「当前状态」类文档（design-status / workspace-state / tools/README / specs/README）；
 *   ② **不改**历史记录类文档（CHANGELOG.md 与 change-impact.md 的历史条目、各 spec 的 tasks.md
 *      中的"当时基线"、.workbuddy/memory 流水日志）—— 那些是**当时的事实**，改了反而失真；
 *   ③ 每处替换**必须命中**，否则报错（禁止静默跳过）；命中多次亦报警。
 *
 * 实测基线（2026-09-25，`node tools/gates.js --baseline`）：
 *   L1 5 ERROR（= 基线）/ DUP 550/550 / L2 6/6 / MX 通过 / L3 14 套全绿 2,483
 *   断言合计 3,039/3,040 / 总判定通过 ✅ / exit 0
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
    if (n === 0) {
      console.log('  [MISS] ' + from.replace(/\n/g, '\\n').slice(0, 90));
      problems++;
      continue;
    }
    if (n > 1) console.log('  [WARN] 命中 ' + n + ' 次（将只替换首处）');
    s = s.replace(from, to);
    applied++;
    console.log('  [OK] ' + from.replace(/\n/g, '\\n').slice(0, 72));
  }
  if (s !== before) {
    fs.writeFileSync(p, s);
    console.log('  -> 已写回');
  } else {
    console.log('  -> 无改动');
  }
}

// ---------- A. project-design/99-ai/design-status.md ----------
patch('project-design/99-ai/design-status.md', [
  ['**变更影响记录 CHG-001 ~ CHG-014**',
   '**变更影响记录 CHG-001 ~ CHG-024**（含本轮一致性收口）'],

  ['+ **11 套全绿 L3（2,183 项，红灯 0）** +',
   '+ **14 套全绿 L3（2,483 项，红灯 0）** +'],

  ['| **L1 剩余 7 ERROR** | 全为"文档声明但代码不存在的 App 函数"（命名漂移，如 `openMyCerts` ↔ `openMyCertsModal`）。**原 32 条中 25 条已随 `Q-028` 去重自动消除。** | `FU-002`、`Q-028`（RESOLVED）、RISK-005/006 |',
   '| **L1 剩余 5 ERROR** | 全为"文档声明但代码不存在的 App 函数"（命名漂移）。**消减链：32 → 25（`Q-028` 去重消除）→ 7（CHG-007）→ 5（CHG-023 下调，本 Feature 实现了 `openStudioModal` / `applyTemplateToWorkspace`）。** 剩余 5 条：`showAcademyCoursesPage` / `openMyCerts` ×2（**`GAP-13`，`SPEC-003` 遗留**）、`showTaskPublishPage` / `openTaskDetail`（**`SPEC-006` 范围**）。 | `FU-002`、`GAP-13`、`Q-028`（RESOLVED）、RISK-005/006 |'],

  ['| L3 形态差异 | **12 套**为**断言级**自检（**2,256 项**），未做到"状态机逐节点走查" | RISK-006 |',
   '| L3 形态差异 | **14 套**为**断言级**自检（**2,483 项**），未做到"状态机逐节点走查" | RISK-006 |'],

  ['13. **清零 L1 剩余 7 ERROR**（`FU-002`）—— 全为**文档命名漂移**；**建议与 Phase 2 合并做**（都要动 `app.js`，一次改完更便宜）。',
   '13. **清零 L1 剩余 5 ERROR**（`FU-002`）—— 全为**文档命名漂移**；**建议与 Phase 2 合并做**（都要动 `app.js`，一次改完更便宜）。⚠️ 其中 2 条属 **`SPEC-006` 范围**（`showTaskPublishPage` / `openTaskDetail`）⇒ 可随 Phase 2 一并清零的实为 3 条（`showAcademyCoursesPage` / `openMyCerts` ×2，均属 `SPEC-003` 遗留 `GAP-13`）。⚠️ 且 `design/` 为**历史归档、默认不改** ⇒ 清零方式是**补别名**而非改文档。'],

  ['确认 **L1 ≤ 7、dup = 0（492 键）、12 套绿灯不退化**。',
   '确认 **L1 ≤ 5、dup = 0（550 键）、14 套绿灯不退化**。'],
]);

// ---------- B. project-design/99-ai/workspace-state.yaml ----------
patch('project-design/99-ai/workspace-state.yaml', [
  ['  l3_assertion_total: 2256        # CHG-017 基线上调（2183 + 73）—— ⚠️ 上调已显式记录，不得静默改数',
   '  l3_assertion_total: 2483        # CHG-023 基线上调（2343 + 140）—— ⚠️ 上调已显式记录，不得静默改数'],

  ['    desc: "清零 L1 剩余 7 ERROR（原 32，去重后已消 25）"',
   '    desc: "清零 L1 剩余 5 ERROR（消减链：32 → 25 去重 → 7 CHG-007 → 5 CHG-023）"'],

  ['  - "ai-creator-community-wh/tools/wb-*-verify.js × 12 （✅ 12 套全绿 2,256 项；红灯 0）"',
   '  - "ai-creator-community-wh/tools/wb-*-verify.js × 14 （✅ 14 套全绿 2,483 项；红灯 0）"'],

  ['  - "清零 L1 剩余 7 ERROR（FU-002）：建议与 SPEC-001 Phase 2 合并做（都要动 app.js）"',
   '  - "清零 L1 剩余 5 ERROR（FU-002）：建议与 SPEC-001 Phase 2 合并做（都要动 app.js）；⚠️ 其中 2 条属 SPEC-006 范围（showTaskPublishPage / openTaskDetail），可随 Phase 2 清零的实为 3 条（showAcademyCoursesPage / openMyCerts ×2，GAP-13）"'],

  ['确认 L1 ≤ 7、dup = 0（**492 键**）、**12 套绿灯不退化**',
   '确认 L1 ≤ 5、dup = 0（**550 键**）、**14 套绿灯不退化**'],
]);

// ---------- C. ai-creator-community-wh/tools/README.md ----------
patch('ai-creator-community-wh/tools/README.md', [
  ['；当前红灯为 `wb-creator-tools-verify`（SPEC-004，**功能断言 4/126** —— 转绿后同样**不得删除**）。',
   '；`wb-creator-tools-verify`（SPEC-004，**已于 CHG-023 转绿：126/126 + 14/14**）同样**不得删除**。'],

  ['当前进度：**功能断言 0/77**（另有 10 项不变量断言 —— ⚠️ **不计入进度**）。',
   '进度：**功能断言 77/77 + 不变量 10/10，退出码 0**（已计入断言合计）。'],

  ['L1 存量 **7 ERROR**（= 基线，属既有 FU-002 命名漂移）。',
   'L1 存量 **5 ERROR**（= 基线，属既有 FU-002 命名漂移）。'],

  ['| L1 清零 | 剩余 **7 ERROR**，全为"文档声明但代码不存在的 App 函数"（`openMyCerts` ↔ `openMyCertsModal` 等命名漂移）。',
   '| L1 清零 | 剩余 **5 ERROR**，全为"文档声明但代码不存在的 App 函数"（`openMyCerts` ↔ `openMyCertsModal` 等命名漂移）。⚠️ 5 条构成：`showAcademyCoursesPage` / `openMyCerts` ×2（`GAP-13`，`SPEC-003` 遗留）、`showTaskPublishPage` / `openTaskDetail`（`SPEC-006` 范围）。'],

  ['| L3 形态差异 | 现有 **13 套全绿**的是**断言级**业务自检（2,343 项）',
   '| L3 形态差异 | 现有 **14 套全绿**的是**断言级**业务自检（2,483 项）'],
]);

// ---------- D. specs/README.md ----------
patch('specs/README.md', [
  ['其余 **12 个** Feature 仍处于 **IDEA**',
   '其余 **13 个** Feature 仍处于 **IDEA**'],

  ['| SPEC-002 ~ SPEC-016（**15 个**） | **IDEA**（原型已有可交互 demo，但无 `spec.md`） | —— |',
   '| SPEC-002 / SPEC-005 ~ SPEC-016（**13 个**） | **IDEA**（原型已有可交互 demo，但无 `spec.md`） | —— |'],
]);

// ---------- 负向复核：这些过时串应已消失 ----------
console.log('\n=== 负向复核（残留过时串，应为空） ===');
const stale = [
  ['project-design/99-ai/design-status.md', ['**L1 剩余 7 ERROR**', '**12 套**为**断言级**', 'CHG-001 ~ CHG-014**']],
  ['project-design/99-ai/workspace-state.yaml', ['l3_assertion_total: 2256', '清零 L1 剩余 7 ERROR', '× 12 （✅ 12 套全绿 2,256 项']],
  ['ai-creator-community-wh/tools/README.md', ['存量 **7 ERROR**', '剩余 **7 ERROR**', '现有 **13 套全绿**', '功能断言 0/77**（另有']],
  ['specs/README.md', ['其余 **12 个** Feature', '（**15 个**）']],
];
let residue = 0;
stale.forEach(function (item) {
  const s = fs.readFileSync(path.join(ROOT, item[0]), 'utf8');
  item[1].forEach(function (frag) {
    if (s.indexOf(frag) !== -1) { console.log('  ✗ 仍残留: ' + item[0] + ' :: ' + frag); residue++; }
  });
});
if (residue === 0) console.log('  ✓ 无残留');

console.log('\n========== 结果 ==========');
console.log('已应用替换：' + applied + ' 处；未命中：' + problems + ' 处；残留：' + residue + ' 处');
if (problems > 0 || residue > 0) {
  console.log('❌ 存在未命中或残留，请检查');
  process.exit(1);
}
console.log('✅ 全部命中且无残留');
