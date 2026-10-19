/**
 * CHG-024 · 第三批：登记缺口 + 写入变更影响条目
 *
 *  ① change-impact.md   —— 头部插入 CHG-024 正文（另存于 _chg024-entry.md）+ 顺序说明
 *  ② design-status.md   —— 缺口表补登记 GAP-13（此前漏登）与 GAP-14（新发现）
 *  ③ workspace-state.yaml —— gaps 列表同步补 GAP-13 / GAP-14
 *  ④ specs/README.md    —— §4 第 4 批加注「顺序待裁决 GAP-14」
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

// ---------- ① change-impact.md ----------
const entry = fs.readFileSync(path.join(__dirname, '_chg024-entry.md'), 'utf8').trim();

const CI_ANCHOR =
  '> 每条记录覆盖：`Business / Requirement / Spec / Domain / Architecture / Data / API / Security / Migration / Testing / Release`。\n\n---\n\n## CHG-001 · 2026-09-24 · CLARIFY 第一批 P0 四项澄清';

const CI_NEW =
  '> 每条记录覆盖：`Business / Requirement / Spec / Domain / Architecture / Data / API / Security / Migration / Testing / Release`。\n' +
  '> ⚠️ **条目顺序说明（2026-09-25 实测，`CHG-024`）**：本文件条目顺序**不统一** —— `CHG-001 ~ 009` 为**升序**、`CHG-010 ~ 024` 为**降序**。**新条目一律插入本文件最前部**（紧随本说明之后）；整理归并列入 `CHG-024` 的后续建议。\n\n' +
  '---\n\n' + entry + '\n\n---\n\n' +
  '## CHG-001 · 2026-09-24 · CLARIFY 第一批 P0 四项澄清';

patch('project-design/99-ai/change-impact.md', [[CI_ANCHOR, CI_NEW]]);

// ---------- ② design-status.md 缺口表 ----------
const DS_GAP12 = '| **`GAP-12`** · **版权确权与侵权比对无归属 Feature** | `03-domain/domain-overview.md` 的「资产与财税域」提到「**版权确权**」，但 `05-feature-map.md` **未建对应 Feature** ⇒ **Feature Map 缺口**；另：内容摘要（SHA-1）是否可复用于侵权 / 洗稿比对亦未定 | `Q-045`、CHG-014 |';

const DS_NEW =
  DS_GAP12 + '\n' +
  '| **`GAP-13`** · **`SPEC-003` 遗留的 3 项 L1 ERROR（本轮补登记）** | L1 的 **3 项** ERROR（`showAcademyCoursesPage` / `openMyCerts` ×2）**在 `SPEC-003` 落地后仍未消失** ⇒ 「**文档声明名 vs 实现名**」不一致。⚠️ 此前**仅**出现在 `CHANGELOG.md` 与 `traceability.md`，**漏登进本表** ⇒ 本轮补登（不补登则收口时看不见它）。⚠️ 另 2 项（`showTaskPublishPage` / `openTaskDetail`）归 **`SPEC-006` 范围**。清零方式 = **补别名**（`ai-creator-community-wh/design/` 为**历史归档、默认不改**） | `FU-002`、`CHG-023`、`tools/README.md` §7 |
  +
  '\n| 🔴 **`GAP-14`** · **下一批 Feature 的推进顺序三处不一致（本轮新发现）** | ① `workspace-state.yaml` 的 `key_path_note` 与下文 §七 = **`SPEC-006 → SPEC-008 → SPEC-009`**；② `specs/README.md` §4 第 4 批 = **`SPEC-009 → SPEC-008`**（**与 ① 相反**）；③ `05-feature-map.md` 依赖图实测 **`S008 → S006` 与 `S006 → S008` 并存 ⇒ 构成循环**。⇒ **顺序裁决前，不得为任一 Feature 启动 `SPECIFY`**。**建议**（依「被依赖度 > 自身优先级」）：先为 `SPEC-008` 做**契约冻结（双阶段：Stage A 演示态 / Stage B 目标态）**以解循环，再推进 `SPEC-006`；`Q-019` 已 RESOLVED，PoC 属 V1.0 门槛、**不阻塞 MVP** | `05-feature-map.md` 依赖图、`specs/README.md` §4、`workspace-state.yaml` `key_path_note`、CHG-024 |';

patch('project-design/99-ai/design-status.md', [[DS_GAP12, DS_NEW]]);

// ---------- ③ workspace-state.yaml gaps ----------
const WS_GAP12 = '  - {id: GAP-12, desc: "⚠️ 版权确权与侵权比对**无归属 Feature** —— 03-domain/domain-overview.md 的「资产与财税域」提到「版权确权」，但 05-feature-map.md 未建对应 Feature；另：内容摘要（SHA-1）能否复用于侵权 / 洗稿比对亦未定", refs: [Q-045, "03-domain/domain-overview.md", "05-feature-map.md", CHG-014], defer_to: "Feature Map 决策（新开 Feature 或明确不做）"}';

const WS_NEW =
  WS_GAP12 + '\n' +
  '  - {id: GAP-13, desc: "⚠️ SPEC-003 遗留 3 项 L1 ERROR（showAcademyCoursesPage / openMyCerts ×2）：文档声明名 vs 实现名不一致 ⇒ 在 SPEC-003 落地后仍未消失。此前仅在 CHANGELOG.md / traceability.md 出现，未登记进 design-status.md 缺口表，CHG-024 补登记。另 2 项（showTaskPublishPage / openTaskDetail）归 SPEC-006 范围", refs: [FU-002, CHG-023, "tools/README.md"], defer_to: "补别名（design/ 为历史归档默认不改）；建议与 SPEC-001 Phase 2 合并做"}'
  +
  '\n  - {id: GAP-14, desc: "🔴 下一批 Feature 推进顺序三处不一致：① workspace-state.key_path_note + design-status §七 = SPEC-006 → SPEC-008 → SPEC-009；② specs/README.md §4 第 4 批 = SPEC-009 → SPEC-008（相反）；③ 依赖图 S008 → S006 且 S006 → S008（循环）。⇒ 顺序裁决前不得启动任一 Feature 的 SPECIFY", refs: ["05-feature-map.md", "specs/README.md", CHG-024], defer_to: "建议先冻结 SPEC-008 契约（双阶段）以解循环，再推进 SPEC-006"}';

patch('project-design/99-ai/workspace-state.yaml', [[WS_GAP12, WS_NEW]]);

// ---------- ④ specs/README.md §4 第 4 批 ----------
patch('specs/README.md', [
  ['| **第 4 批** | SPEC-009（我的资产）→ SPEC-008（托管分账） | 资金口径须先澄清 |',
   '| **第 4 批** | ⚠️ **顺序待裁决（`GAP-14`）** —— 本表写 `SPEC-009 → SPEC-008`，但 `workspace-state.yaml` 的 `key_path_note` 与 `design-status.md` §七 均记 **`SPEC-006 → SPEC-008 → SPEC-009`**（**与本节相反**）；且依赖图实测 `S008 → S009` / `S008 → S006` / `S006 → S008` 并存 ⇒ **循环**。⇒ **裁决前不得启动 `SPECIFY`** | 资金口径须先澄清 |'],
]);

// ---------- 负向复核 ----------
console.log('\n=== 复核 ===');
const ci = fs.readFileSync(path.join(ROOT, 'project-design/99-ai/change-impact.md'), 'utf8');
const checks = [
  ['CHG-024 已插入', ci.indexOf('## CHG-024 · 2026-09-25') !== -1],
  ['CHG-024 在文件前部', ci.indexOf('## CHG-024 · 2026-09-25') < ci.indexOf('## CHG-001 · 2026-09-24')],
  ['顺序说明已插入', ci.indexOf('条目顺序说明（2026-09-25 实测') !== -1],
  ['CHG-023 仍在', ci.indexOf('## CHG-023 · 2026-09-25') !== -1],
  ['CHG-001 仍在', ci.indexOf('## CHG-001 · 2026-09-24') !== -1],
];
const ds = fs.readFileSync(path.join(ROOT, 'project-design/99-ai/design-status.md'), 'utf8');
checks.push(['design-status 有 GAP-13 行', ds.indexOf('| **`GAP-13`**') !== -1]);
checks.push(['design-status 有 GAP-14 行', ds.indexOf('| 🔴 **`GAP-14`**') !== -1]);
const ws = fs.readFileSync(path.join(ROOT, 'project-design/99-ai/workspace-state.yaml'), 'utf8');
checks.push(['workspace-state 有 GAP-13', ws.indexOf('{id: GAP-13,') !== -1]);
checks.push(['workspace-state 有 GAP-14', ws.indexOf('{id: GAP-14,') !== -1]);
const sr = fs.readFileSync(path.join(ROOT, 'specs/README.md'), 'utf8');
checks.push(['specs/README 有 GAP-14 注', sr.indexOf('顺序待裁决（`GAP-14`）') !== -1]);

checks.forEach(function (c) { console.log('  ' + (c[1] ? '✓' : '✗') + ' ' + c[0]); if (!c[1]) problems++; });

console.log('\n已应用替换：' + applied + '；问题：' + problems);
if (problems > 0) process.exit(1);
console.log('✅ 第三批完成');
