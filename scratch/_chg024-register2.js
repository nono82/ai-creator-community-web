/**
 * CHG-024 · 第三批（重写版）：登记缺口 + 写入变更影响条目
 *
 * 设计要点：**所有长文本一律放外部片段文件**，脚本内只保留**短锚点**。
 * 起因：内联长字面量在本环境反复触发 `SyntaxError: Invalid or unexpected token`
 *       （同一问题第二次 —— 第一次是块注释里的 `*​/`），改走"先 Write 再拼接"。
 *
 * ① change-impact.md     插入 CHG-024 正文 + 条目顺序说明（插在 CHG-001 之前）
 * ② design-status.md     缺口表：GAP-12 行后插入 GAP-13 / GAP-14
 * ③ workspace-state.yaml gaps：GAP-12 后插入 GAP-13 / GAP-14
 * ④ specs/README.md      §4 第 4 批行 → 加注 GAP-14
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const S = __dirname;
let problems = 0;

function frag(name) {
  return fs.readFileSync(path.join(S, name), 'utf8').replace(/\s+$/, '');
}
function readLines(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8').split('\n');
}
function writeLines(rel, lines) {
  fs.writeFileSync(path.join(ROOT, rel), lines.join('\n'));
}
function insertAfter(rel, anchor, name) {
  const lines = readLines(rel);
  const idx = lines.findIndex(function (l) { return l.indexOf(anchor) !== -1; });
  if (idx < 0) { console.log('  [MISS] ' + rel + ' :: ' + anchor); problems++; return; }
  const f = frag(name).split('\n');
  lines.splice(idx + 1, 0, ...f);
  writeLines(rel, lines);
  console.log('  [OK] ' + rel + ' 第 ' + (idx + 1) + ' 行后 +' + f.length + ' 行');
}
function replaceLine(rel, anchor, name) {
  const lines = readLines(rel);
  const idx = lines.findIndex(function (l) { return l.indexOf(anchor) !== -1; });
  if (idx < 0) { console.log('  [MISS] ' + rel + ' :: ' + anchor); problems++; return; }
  const f = frag(name).split('\n');
  lines.splice(idx, 1, ...f);
  writeLines(rel, lines);
  console.log('  [OK] ' + rel + ' 第 ' + (idx + 1) + ' 行已替换');
}

// ---------- ① change-impact.md ----------
(function () {
  const rel = 'project-design/99-ai/change-impact.md';
  const note = frag('_chg024-order-note.txt');
  const entry = frag('_chg024-entry.md');
  const block = note + '\n\n---\n\n' + entry + '\n\n---\n\n';
  const s = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const anchor = '## CHG-001 · 2026-09-24';
  const i = s.indexOf(anchor);
  if (i < 0) { console.log('  [MISS] ' + rel + ' :: ' + anchor); problems++; return; }
  fs.writeFileSync(path.join(ROOT, rel), s.slice(0, i) + block + s.slice(i));
  console.log('  [OK] ' + rel + ' 已在 CHG-001 前插入 CHG-024（' + block.length + ' 字符）');
})();

// ---------- ② design-status.md 缺口表 ----------
console.log('');
insertAfter('project-design/99-ai/design-status.md', '| **`GAP-12`** · **版权确权与侵权比对无归属 Feature**', '_chg024-gap13-line.txt');
insertAfter('project-design/99-ai/design-status.md', '| **`GAP-13`** · **`SPEC-003` 遗留的 3 项 L1 ERROR（本轮补登记）**', '_chg024-gap14-line.txt');

// ---------- ③ workspace-state.yaml gaps ----------
console.log('');
insertAfter('project-design/99-ai/workspace-state.yaml', '{id: GAP-12,', '_chg024-wsgap-lines.txt');

// ---------- ④ specs/README.md ----------
console.log('');
replaceLine('specs/README.md', '| **第 4 批** |', '_chg024-specsreadme-line.txt');

// ---------- 复核 ----------
console.log('\n=== 复核 ===');
const ci = fs.readFileSync(path.join(ROOT, 'project-design/99-ai/change-impact.md'), 'utf8');
const ds = fs.readFileSync(path.join(ROOT, 'project-design/99-ai/design-status.md'), 'utf8');
const ws = fs.readFileSync(path.join(ROOT, 'project-design/99-ai/workspace-state.yaml'), 'utf8');
const sr = fs.readFileSync(path.join(ROOT, 'specs/README.md'), 'utf8');
const checks = [
  ['change-impact 有 CHG-024 标题', ci.indexOf('## CHG-024 · 2026-09-25') !== -1],
  ['CHG-024 位于 CHG-001 之前', ci.indexOf('## CHG-024') < ci.indexOf('## CHG-001 · 2026-09-24')],
  ['条目顺序说明已插入', ci.indexOf('条目顺序说明（2026-09-25 实测') !== -1],
  ['CHG-023 未被破坏', ci.indexOf('## CHG-023 · 2026-09-25') !== -1],
  ['CHG-001 未被破坏', ci.indexOf('## CHG-001 · 2026-09-24 · CLARIFY 第一批 P0 四项澄清') !== -1],
  ['CHG-024 含 11 维表', ci.indexOf('### 11. Release（发布影响）') !== -1],
  ['design-status 有 GAP-13', ds.indexOf('| **`GAP-13`**') !== -1],
  ['design-status 有 GAP-14', ds.indexOf('| 🔴 **`GAP-14`**') !== -1],
  ['GAP 表仍完整（8/9/10/11/12/13/14）', [8, 9, 10, 11, 12, 13, 14].every(function (n) { return ds.indexOf('GAP-' + n) !== -1; })],
  ['workspace-state 有 GAP-13', ws.indexOf('{id: GAP-13,') !== -1],
  ['workspace-state 有 GAP-14', ws.indexOf('{id: GAP-14,') !== -1],
  ['specs/README 第 4 批已加注', sr.indexOf('顺序待裁决（`GAP-14`）') !== -1],
  ['specs/README 第 5 批仍在', sr.indexOf('| **第 5 批** |') !== -1],
];
checks.forEach(function (c) { console.log('  ' + (c[1] ? '✓' : '✗') + ' ' + c[0]); if (!c[1]) problems++; });

console.log('\n问题数：' + problems);
if (problems > 0) process.exit(1);
console.log('✅ 第三批完成');
