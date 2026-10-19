'use strict';
/** CHG-019 落盘：SPEC-003 变更记录 + open-questions 状态 + traceability 关联段。 */
const fs = require('fs');

// ① SPEC-003 变更记录
{
  const P = 'specs/003-growth-academy/spec.md';
  let L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
  const i = L.findIndex((l) => /^\| 2026-09-25 \| 新增 \| \*\*首次建立 `SPEC-003`/.test(l));
  if (i >= 0 && !L.some((l) => /Q-046\` 等三条于同日/.test(l))) {
    L.splice(i + 1, 0, '| 2026-09-25 | **CLARIFY** | **`Q-046` / `Q-047` / `Q-048` 三条于同日 `CLARIFY` 定稿**（`CHG-019`）：**`Q-046`** ⇒ **等级判定的真源 = 本 Feature 的学职引擎**（`SPEC-002` 只消费；三条实测依据：`REQ-004` 规定等级由累计创作积分定级、`feature-map` 的 `SPEC-002` 依赖列已含 `SPEC-003`、与 `SPEC-001` 的委托化先例同构）；**`Q-047`** ⇒ **沿用既有「会话内存 + `localStorage`」模式**；**`Q-048`** ⇒ **演示态为「模拟下载 + 加分」**。⇒ 新增 **§7.6 CLARIFY 结论**；`DA-003-04` **升级为已确认** | 本文件 §七 / §十三 / §十四 / §十六；`01-requirements/open-questions.md`；`traceability.md`；`99-ai/`；`CHANGELOG.md` |');
    console.log('SPEC-003：已追加变更记录');
  }
  fs.writeFileSync(P, L.join('\n'));
}

// ② open-questions：§七 六行状态
{
  const P = 'project-design/01-requirements/open-questions.md';
  let L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
  const concl = {
    'Q-046': { owner: '架构 + 产品', txt: '✅ **RESOLVED（2026-09-25，`CHG-019`）**：**等级判定真源 = `SPEC-003` 的学职引擎**（`SPEC-002` 只消费）。依据：`REQ-004` 规定等级由累计创作积分定级（而积分的唯一来源是成长学院的学习动作）· `feature-map` 的 `SPEC-002` 依赖列已含 `SPEC-003` · 与 `SPEC-001` 委托化先例同构。详见 `SPEC-003` §7.6。⚠️ **须在 `SPEC-002` 的 `SPECIFY` 时复核**' },
    'Q-047': { owner: '产品 + 架构', txt: '✅ **RESOLVED（2026-09-25，`CHG-019`）**：**沿用既有模式（会话内存 + `localStorage`）**，不引入新机制；Stage B 并入后端。详见 `SPEC-003` §7.6' },
    'Q-048': { owner: '产品', txt: '✅ **RESOLVED（2026-09-25，`CHG-019`）**：**演示态为「模拟下载 + 加分」**，不产出真实文件；真实文件属 Stage B。详见 `SPEC-003` §7.6' },
    'Q-049': { owner: '架构 + 产品', txt: '✅ **RESOLVED（2026-09-25，`CHG-019`）**：**两阶段迁移** —— Phase 1 新建路由页 `#view-tool-detail` 承载 Hero + 工作区骨架、**生成动作仍走 `#modal-studio`**；Phase 2 再迁生成动作（实测弹窗**合计绑定 10 处**）。**可回退性：高**。详见 `SPEC-004` §7.6' },
    'Q-050': { owner: '架构 + 产品', txt: '✅ **RESOLVED（2026-09-25，`CHG-019`）**：**真源归 `SPEC-009`**（依据：其 `feature-map` 行注明"积分池维度已确认"且范围含"积分·流水"）；过渡期**沿用既有 `getComputeBalances` / `syncComputeBalances`**，🔴 **`SPEC-004` 不得新增任何"池"结构**。⚠️ 唯余 `SPEC-009` 的**就绪时点**（属排期）。详见 `SPEC-004` §7.6' },
    'Q-051': { owner: '产品 + 架构', txt: '✅ **RESOLVED（2026-09-25，`CHG-019`）**：**需新增工具维度数据集合**；🔴 **工具评论独立、不复用社区**（依据：`SPEC-012` 仍是 `IDEA`，且语义与生命周期不同）。详见 `SPEC-004` §7.6' },
  };
  let n = 0;
  L = L.map((l) => {
    const m = l.match(/^\| \*\*(Q-05[01]|Q-04[6-9])\*\* \|/);
    if (!m) return l;
    const id = m[1], c = concl[id];
    if (!c) return l;
    const before = l;
    l = l.replace('| **OPEN（2026-09-25 新开）** |', '| ' + c.txt + ' |');
    if (l !== before) n++;
    return l;
  });
  fs.writeFileSync(P, L.join('\n'));
  console.log('open-questions：更新 ' + n + '/6 行状态');
}

// ③ traceability：§4.3 / §4.4 关联段
{
  const P = 'project-design/01-requirements/traceability.md';
  let s = fs.readFileSync(P, 'utf8');
  const before = s;
  s = s.replace(
    '**`SPEC-003` 关联待确认问题（本 Spec 新开 3 条）**：',
    '**`SPEC-003` 关联待确认问题（本 Spec 新开 3 条）** —— ✅ **三条已于 2026-09-25 `CLARIFY` 全部定稿**（`CHG-019`）：`Q-046` ⇒ **真源 = 本 Feature 学职引擎**（`SPEC-002` 只消费）；`Q-047` ⇒ 沿用 `localStorage` 模式；`Q-048` ⇒ 演示态模拟下载。见其 `spec.md` **§7.6**：'
  );
  s = s.replace(
    '**`SPEC-004` 关联待确认问题（本 Spec 新开 3 条）**：',
    '**`SPEC-004` 关联待确认问题（本 Spec 新开 3 条）** —— ✅ **三条已于 2026-09-25 `CLARIFY` 全部定稿**（`CHG-019`）：`Q-049` ⇒ **两阶段迁移**（先建壳、后迁内）；`Q-050` ⇒ **分源池真源归 `SPEC-009`**、过渡期沿用既有入口、🔴 **不得新增"池"结构**；`Q-051` ⇒ 需新增工具维度数据集合、评论独立。见其 `spec.md` **§7.6**：'
  );
  fs.writeFileSync(P, s);
  console.log('traceability：' + (before === s ? '⚠️ 未命中' : '✅ 已更新两处关联段'));
}
