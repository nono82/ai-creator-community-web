'use strict';
/**
 * 一次性同步脚本（CHG-017）：更新 workspace-state.yaml 的 next_actions 段。
 * ⚠️ 位于 scratch/（CON-030 过程产物区）；用后即弃。
 * 手法：按**行首特征正则**匹配并整行替换 —— 避免依赖完整行长。
 */
const fs = require('fs');
const P = 'project-design/99-ai/workspace-state.yaml';
let L = fs.readFileSync(P, 'utf8').split(/\r?\n/);

const rules = [
  [/【下一步·最要紧】SPEC-017 Phase 1 的实现/,
    '  - "【已完成】SPEC-017 Phase 1 的实现（tasks.md 共 26 项）✅ **全部落地**（CHG-017）—— 冻结自检 5/66 → **66/66**（+ 不变量 7/7，exit 0），并已从 l3ExpectedRed 移除、转为回归防线；门禁 **L3 2,183 → 2,256 项 / 12 套全绿**、**DUP 480 → 492 键 0 重复**、总判定通过 / exit 0 / 连续 3 次一致"'],
  [/^  - "Phase 1 节奏铁律（tasks\.md §⑤）/,
    '  - "【已执行】Phase 1 节奏铁律（tasks.md §⑤）：★ 标记处均即时跑门禁（T-017-17 是唯一有回归风险的改动 —— 修复假实现，已改完即验）；同文件串行 Edit（ENV-02）；未用子进程跑门禁（ENV-08）；**只按「功能断言」判进度**（不变量断言未实现时会平凡通过）"'],
  [/^  - "Phase 1 DoD：wb-content-asset-verify/,
    '  - "Phase 1 DoD ✅ **6/6 全部达成**（CHG-017）：冻结自检 **66/66 + 7/7 + exit 0**；既有 11 套绿灯零新失败（L3 2,256）；资金恒等式 5,320.50 + 1,500.00 = 6,820.50 **复算成立**；index.html / css **时间戳未变**；连续 3 次一致；已从 l3ExpectedRed 移除"'],
  [/^  - "Phase 1 的降风险策略（plan\.md §十七）/,
    '  - "Phase 1 的降风险策略（plan.md §十七）✅ **实测印证有效**：**「只加字段、不改既有字段、不改既有渲染」** —— 对象记录同时保留 cover（展示路径）与 objectKey ⇒ **既有 2,183 项绿灯零新失败、index.html / css 零改动**；新增行为冒烟 scratch/_spec017-phase1-smoke.js（28 项，含**新旧双沙箱回归对比**）"'],
  [/^  - "【须裁决】REQ-084 悬空引用/,
    '  - "【仍未裁决】REQ-084 悬空引用（GAP-10）：删除该引用（语义已被 REQ-802 + REQ-205 覆盖），或改指 REQ-207 —— 属文档缺陷，不影响代码"'],
  [/^  - "裁决 REQ-084 悬空引用/,
    '  - "【仍未裁决】REQ-084 悬空引用（GAP-10）—— 与上一条同项，**待裁决**"'],
  [/^  - "门禁日常化：每轮迭代跑/,
    '  - "门禁日常化：每轮迭代跑 node tools/gates.js --baseline，确认 L1 ≤ 7、dup = 0（**492 键**）、**12 套绿灯不退化**。⚠️ **红灯已清零**（l3ExpectedRed: []）—— 新出现的红灯必须逐个说明原因（应是契约先行的正式产物），不得当作常态"'],
  [/^  - "后续 Feature 批次：/,
    '  - "后续 Feature 批次：**SPEC-003（成长学院）→ SPEC-004（创作工具）** —— ✅ **SPEC-017 的契约已冻结并已落地实现**（plan.md §二十三 的**五项接口**：对象键语义 / 引用记账口径 / 五处引用点 / 失败零残留 / 回收语义）⇒ **可以直接启动它们的 SPECIFY**"'],
  [/^  - "回滚点：Phase 1 改动前备份为/,
    '  - "回滚点：SPEC-017 Phase 1 改动前备份 = scratch/app.js.bak-20260925-072307 与 scratch/mock_data.js.bak-20260925-072307；前序 SPEC-001 Phase 1 = *.bak-20260924-222825（CON-030：属过程产物区，不得被正式代码引用）"'],
];

let n = 0;
L = L.map((l) => {
  for (const [re, rep] of rules) {
    if (re.test(l)) { n++; return rep; }
  }
  return l;
});

// 在 next_actions 首行插入「下一步」
const j = L.findIndex((l) => /^next_actions:/.test(l));
const head = '  - "【下一步·三选一】A. **SPEC-003 / SPEC-004 的 `SPECIFY`**（✅ 推荐：`SPEC-017` 的接口已冻结并已落地实现，下游可直接依赖）/ B. `SPEC-017` Phase 2（10 项登记）/ C. `SPEC-001` Phase 2（账号骨架重构，风险最高）"';
if (j >= 0 && !/下一步·三选一/.test(L[j + 1] || '')) {
  L.splice(j + 1, 0, head);
  console.log('已插入「下一步」');
}

fs.writeFileSync(P, L.join('\n'));
console.log('整行替换', n, '处（应 9）');
