'use strict';
/** MEMORY.md 再压一轮（回到 16KB 内）。 */
const fs = require('fs');
const P = '.workbuddy/memory/MEMORY.md';
const before = fs.readFileSync(P, 'utf8').length;
let L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
const rules = [
  ['- 🔴 **身份类负向动作同构红线',
    '- 🔴 **身份类负向动作同构红线（`RULE-008` / `CON-063`）**：**认证驳回 / 账号冻结 / 造假处置 / 强制注销**一律**不得系统单边执行**；**冻结与清退须双人复核**；须留痕 + 可申诉。**客服不得代提交或代改认证信息**；敏感字段默认掩码，明文查看须**按需解密 + 逐次留痕 + 最小权限**。'],
  ['- **个人信息留存',
    '- **个人信息留存（`NFR-016` / `Q-041`）**：认证敏感信息须有**留存期限 + 可删除 / 可匿名化能力**；**期限取值与注销后释放范围待 `Q-041`**（合规参数，不得伪造）。注销后：**手机号释放**，**身份证号解绑但保留不可逆摘要**（⚠️ **「防刷新」不得用"注销时清零积分"实现**）。'],
  ['- **轨道 B**（`Q-001`）',
    '- **轨道 B**（`Q-001`）：**以「已绑定矩阵账号」为唯一前置**，一键提审、**无需成片与工程源文件**；未绑定则引导至【数据中心 → 矩阵分发】。'],
  ['- **`SPEC-017` 规模**',
    '- **`SPEC-017` 规模**：11 US / **16 SC** / **45 FR（7 组）** / 18 EX / **9 DA** / 9 成功标准。核心命题「**只存一份、多处引用、归零才收**」；冻结**五项契约**（内容寻址 · 对象键 · 引用记账 · **两阶段回收** · 五处引用点）。**Phase 1 = 26 项 ✅ 已落地（`CHG-017`）/ Phase 2 = 10 项登记**。'],
  ['- **`SPEC-001` 进度**：',
    '- **`SPEC-001` 进度**：Phase 1 已完成（`CHG-013`）—— 24 项、DoD 9/9；能力 = `checkAdmission`（唯一入口，幂等无副作用）/ `evaluateAgeGate`（未满 18 或日期不可解析一律拒）/ 3 个守卫（零副作用）/ 委托化（真源 `isCredentialMet`）/ 审计留痕。'],
  ['- `project-design/99-ai/remediation-plan.md` =',
    '- `99-ai/remediation-plan.md` = 遗留问题修复方案（含实测证据、验收标准、跨项关联与执行顺序）。'],
];
let hit = 0;
const out = [];
L.forEach((l) => {
  for (const [pre, to] of rules) { if (l.startsWith(pre)) { hit++; out.push(...to.split('\n')); return; } }
  out.push(l);
});
fs.writeFileSync(P, out.join('\n'));
const after = fs.readFileSync(P, 'utf8').length;
console.log('替换 ' + hit + '/' + rules.length + '｜字节 ' + before + ' → ' + after + (after <= 16384 ? ' ✅' : ' ⚠️ 仍超'));
