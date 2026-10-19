'use strict';
/** 同步一致性校验脚本的期望值（CHG-022）：SPEC-004 由 CLARIFIED → TASKED + 新增 004 四件检查。 */
const fs = require('fs');
const P = 'scratch/_spec017-consistency.js';
let s = fs.readFileSync(P, 'utf8');
const before = s;
let n = 0;
function sub(a, b, label) {
  if (!s.includes(a)) { console.log('  未命中：' + label); return; }
  const c = s.split(a).length - 1;
  s = s.split(a).join(b);
  n += c;
  console.log('  ✓ ' + label + '（' + c + ' 处）');
}

// ① workspace-state 状态与计数
sub("'SPEC003_PHASE1_COMPLETED'", "'SPEC004_TASKED'", 'phase_status');
sub("'l3_red_suites: 0'", "'l3_red_suites: 1'", 'l3_red_suites');
sub("'specs_tasked: 3'", "'specs_tasked: 4'", 'specs_tasked');
sub("'data_models: 3'", "'data_models: 4'", 'data_models');
sub("'research_docs: 3'", "'research_docs: 4'", 'research_docs');

// ② SPEC-004 spec.md 状态
sub("'specs/004-creator-tools/spec.md': ['CLARIFIED'", "'specs/004-creator-tools/spec.md': ['TASKED'", '004 spec 状态');

// ③ mustExist 补 004 四件 + 套件（紧跟 SPEC-003 套件之后）
const anchor = "  'ai-creator-community-wh/tools/wb-growth-academy-verify.js',\n];";
if (s.includes(anchor)) {
  s = s.replace(anchor, [
    "  'ai-creator-community-wh/tools/wb-growth-academy-verify.js',",
    "  'specs/004-creator-tools/spec.md',",
    "  'specs/004-creator-tools/plan.md',",
    "  'specs/004-creator-tools/tasks.md',",
    "  'specs/004-creator-tools/data-model.md',",
    "  'specs/004-creator-tools/research.md',",
    "  'ai-creator-community-wh/tools/wb-creator-tools-verify.js',",
    '];',
  ].join('\n'));
  n++;
  console.log('  ✓ mustExist 补 6 项（004 四件 + 套件）');
} else {
  console.log('  未命中：mustExist 锚点');
}

// ④ 期望表补 004 四件的关键词检查（插在 CHANGELOG 之前）
const anchor2 = "  'CHANGELOG.md': [";
if (s.includes(anchor2) && !s.includes('004-creator-tools/plan.md')) {
  s = s.replace(anchor2, [
    "  'specs/004-creator-tools/plan.md': ['PLANNED', '声明一', '声明三', '17 项契约', 'ticket', '避免清单', 'T-004-01', 'RISK-004-02'],",
    "  'specs/004-creator-tools/tasks.md': ['T-004-01', 'T-004-31', 'T-004-P2-05', 'Phase 1', 'Phase 2', '4/126', '顺序陷阱'],",
    "  'specs/004-creator-tools/data-model.md': ['三层次', '14 条不变量', '刻意', 'computeSource', 'ticket 不落库'],",
    "  'specs/004-creator-tools/research.md': ['R1', 'R2', 'R3', 'R4', '负向动作保护', '两值模型'],",
    "  'ai-creator-community-wh/tools/wb-creator-tools-verify.js': ['17 项契约', 'TOOL_INTEGRATION_TYPES', 'preauthorizeGenerate', 'generateFromTicket', 'refundGenerate'],",
    "  'CHANGELOG.md': [",
  ].join('\n'));
  n++;
  console.log('  ✓ 期望表补 004 五组关键词检查');
}

// ⑤ CHANGELOG 期望加 CHG-022
sub("'CHANGELOG.md': ['CHG-021'", "'CHANGELOG.md': ['CHG-022', 'CHG-021'", 'CHANGELOG 期望');

fs.writeFileSync(P, s);
console.log('一致性脚本：' + n + ' 处｜' + (before === s ? '⚠️ 无变化' : '已更新'));
