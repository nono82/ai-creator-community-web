'use strict';
/** MEMORY.md 同步 CHG-018（净增受控：替换 + 删除 + 精简）。 */
const fs = require('fs');
const P = '.workbuddy/memory/MEMORY.md';
const before = fs.readFileSync(P, 'utf8').length;
let L = fs.readFileSync(P, 'utf8').split(/\r?\n/);

const rules = [
  // ① 工作方式：加 SPEC-003/004
  ['- 工作方式：',
    '- 工作方式：**`AGENTS.md` 为唯一准则**（Spec-Driven Development）。**工序 =「契约先行 → 立红 → `PLAN` → `TASKS` → 最小实现 → 回填收敛」** —— 已在 `SPEC-001`（CHG-011~013）与 **`SPEC-017`（CHG-016~017）** 两次走通 ⇒ 二者均为 **`IMPLEMENTED`（Phase 1）**；**`SPEC-003` / `SPEC-004` 已 `SPECIFIED`**（`CHG-018`）；其余 13 个 Feature 仍为 `IDEA`（**不预生成**）。⚠️ `CHECKLIST` 先于 `PLAN` 的时点偏离已复检完毕、**不再挂账**。'],

  // ② 新增一行口径（放在"内容资产层"之后）
  ['- **内容资产层（',
    '- **内容资产层（`SPEC-017` Phase 1 已落地，`CHG-017`）**：对象键 = `creator/{userId}/{digest}`（**用户级去重**）；**引用记录 = 唯一真源**（`refCount` 不落库，计数**重算**）；**两阶段回收**（归零 ⇒ `pendingGC`，**禁物理删除**；窗口 `null` ⇒ **不得回收**）。**四处接线**：生成登记 + `workcloud`/`post`/`showcase`/`delivery`。\n- **成长学院 / 创作工具（`SPEC-003` / `SPEC-004` 已 `SPECIFIED`，`CHG-018`）**：**等级口径取 `Q-003` 裁决值**（`0/200/500/2000/5000`，命名「体验者/进阶者/…」**无 `AI` 前缀**）；**加分唯一入口** `awardLearningPoints`（课节 +30 / 心得 +5 / 教材 +5 / 领证 +100）；付费课程走**账户余额**；**AI 工具详情页 = 路由级页面**（非弹窗）；资产一律走 `SPEC-017`。'],

  // ③ 当前阶段
  ['- **有效阻塞 = 0 项**；**当前阶段',
    '- **有效阻塞 = 0 项**；**当前阶段 = `SPECIFY`（`SPEC-003` / `SPEC-004` 已 `SPECIFIED`，`CHG-018`）** ⇒ **下一步 = 二者的 `CLARIFY`**（⚠️ `Q-046` / `Q-049` / `Q-050` 三条 **P1** 关乎**真源归属 / 结构级改动**）→ `PLAN` / `TASKS`。⚠️ 二者都动 `app.js` ⇒ **必须串行**（`ENV-02`）；`SPEC-004` 的详情页迁移是**最高回归风险区**。'],

  // ④ Feature 生命周期
  ['- **Feature 生命周期**：',
    '- **Feature 生命周期**：`SPEC-001` = **`IMPLEMENTED`（Phase 1）**；**`SPEC-017` = `IMPLEMENTED`（Phase 1）**（完整规格链 + 内容资产层已落地）；**`SPEC-003` / `SPEC-004` = `SPECIFIED`**（仅 `spec.md`）；`SPEC-002` / `SPEC-005~016`（**13 个**）= IDEA。**Feature 内部编号 `US/SC/FR/EX/DA-0xx-xx` 不进入全局体系**。⚠️ `SC-001-xx` **≠** `scenarios.md` 的 `SC-01~08`。'],

  // ⑤ 仍未决：加 Q-046~051
  ['- **仍未决**：',
    '- **仍未决**：**`Q-043` 剩余两处（**窗口时长** + **注销后处置**，与 `Q-041` 合并取法务口径）** / **`Q-041`（留存期限 / 释放；合规参数不得伪造）** / **`Q-046`（学职引擎与 `SPEC-002` 的边界 —— 等级判定归谁，P1）/ `Q-049`（详情页迁移的回归边界，P1）/ `Q-050`（**AI 积分分源池的真源归属**，P1 —— 🔴 就绪前不得伪造池）** / `Q-044`（配额计费）/ `Q-045`（版权确权 —— **Feature Map 缺口**）/ `Q-037` / `Q-039`（**未预设数值**）/ `Q-040` / `Q-047` / `Q-048` / `Q-051` / `Q-007~010` / `Q-013~018`（规模）/ `Q-021~027`（资金）。'],

  // ⑥ 删除（已完全闭环，价值低）
  ['- **已澄清关闭**：', null],

  // ⑦ 精简
  ['- **工程债**：',
    '- **工程债**：`Q-028` ✅ / `Q-030` ✅ / `Q-029` ✅ 半边；**`Q-036` = 「已接受为已知偏差」**（风险**部分缓解**：准入守卫已就位，**字段对齐仍未做** ⇒ 归 `SPEC-006`）。**`FU-007`** = `PARTIAL_DONE`。'],
  ['- **登记缺口**：',
    '- **登记缺口**：`GAP-7` / `GAP-8` / `GAP-9` ⇒ Phase 2；**`GAP-10`（`REQ-084` 悬空引用，仍未裁决）/ `GAP-11`（编号状态跨行矛盾，复发）/ `GAP-12`（版权确权无归属）**。'],

  // ⑧ §5 加 CHG-018
  ['- **`CHG-017`**（2026-09-25）',
    '- **`CHG-017`**（2026-09-25）= `SPEC-017` Phase 1 落地（内容资产层 + 四处接线 + 冒烟 28 项 + 套件转绿并修正其**输出格式** + 基线上调 2183 → 2256、DUP 480 → 492）。⚠️ `change-impact.md` 条目顺序**不统一**（`001~009` 升序 / `010~018` 降序）⇒ 建议整理。\n- **`CHG-018`**（2026-09-25）= `SPEC-003` / `SPEC-004` 的 `SPECIFY`（同日两份规格；**合计固化 7 处实测缺陷**；新开 `Q-046` ~ `Q-051`）。⚠️ 并修正 CHG-017 的一处遗漏（`feature-map` 的 `SPEC-017` 行未更新）。**教训：受影响文件清单里不写"（如需）"。**'],
];

let hit = 0, del = 0;
const out = [];
L.forEach((l) => {
  for (const [pre, to] of rules) {
    if (l.startsWith(pre)) { hit++; if (to === null) { del++; return; } out.push(...to.split('\n')); return; }
  }
  out.push(l);
});
fs.writeFileSync(P, out.join('\n'));
const after = fs.readFileSync(P, 'utf8').length;
console.log('替换 ' + hit + '/' + rules.length + '｜删除 ' + del + ' 行｜字节 ' + before + ' → ' + after + (after <= 16384 ? ' ✅ 在 16KB 内' : ' ⚠️ 仍超 16KB'));
