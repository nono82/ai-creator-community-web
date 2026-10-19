'use strict';
/** CHG-023 收尾：workspace-state 的 registered 格式修正 + current_artifacts 追加。 */
const fs = require('fs');
const P = 'project-design/99-ai/workspace-state.yaml';
let L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
let n = 0;

// ① registered：改为空数组（CHG-023 转绿后无红灯）
const ri = L.findIndex(function (l) { return /^    registered:$/.test(l); });
if (ri >= 0 && L[ri + 1] && L[ri + 1].indexOf('(none)') >= 0) {
  L.splice(ri, 2, '    registered: []                 # ✅ CHG-023：wb-creator-tools-verify 已转绿 ⇒ 当前无红灯');
  n++;
  console.log('① registered → []（已清空）');
}

// ② current_artifacts：在 004 的 spec.md 行后追加四件 + 套件 + 冒烟
const ai = L.findIndex(function (l) { return l.indexOf('specs/004-creator-tools/spec.md') >= 0 && l.indexOf('←') >= 0; });
if (ai >= 0 && !L.some(function (l) { return l.indexOf('specs/004-creator-tools/plan.md') >= 0 && l.indexOf('←') >= 0; })) {
  L.splice(ai + 1, 0, ...[
    '  - "specs/004-creator-tools/plan.md                            ← 实现计划（CHG-022：三条前置声明 + 双阶段 + 「避免清单」6 项硬禁止 + ticket 状态机 + 11 项可机器判定 DoD）"',
    '  - "specs/004-creator-tools/tasks.md                           ← 任务清单（CHG-022：Phase 1 31 项【CHG-023 全部完成】/ Phase 2 5 项登记）"',
    '  - "specs/004-creator-tools/data-model.md                      ← 领域模型（CHG-022：三层次 + 14 条不变量 + 7 个刻意不建的字段）"',
    '  - "specs/004-creator-tools/research.md                        ← 技术研究（CHG-022：R1~R4；含本项目第 4 次「负向动作保护」类比）"',
    '  - "ai-creator-community-wh/tools/wb-creator-tools-verify.js   ← SPEC-004 契约冻结自检（17 项契约 / 140 项断言；✅ CHG-023 已转绿为回归防线）"',
    '  - "ai-creator-community-wh/scratch/_spec004-phase1-smoke.js   ← SPEC-004 Phase 1 行为冒烟（39 项；含 #modal-studio 与 5 个既有方法的逐字比对）"',
  ]);
  n++;
  console.log('② current_artifacts：已追加 6 行');
}

fs.writeFileSync(P, L.join('\n'));
console.log('workspace-state：' + n + ' 处｜行数 ' + L.length);

// 结构校验
const LS = fs.readFileSync(P, 'utf8').split(/\r?\n/);
const bad = [];
LS.forEach(function (l, i) { const a = (l.match(/\{/g) || []).length, b = (l.match(/\}/g) || []).length; if (a !== b) bad.push((i + 1) + ': ' + l.trim().slice(0, 50)); });
const q = [];
LS.forEach(function (l, i) { const c = (l.match(/"/g) || []).length; if (c % 2 !== 0) q.push((i + 1) + ': ' + l.trim().slice(0, 70)); });
console.log('结构：花括号不平衡 ' + (bad.length ? bad.join(' ; ') : '无') + '｜双引号奇数行 ' + (q.length ? q.join(' ; ') : '无'));
