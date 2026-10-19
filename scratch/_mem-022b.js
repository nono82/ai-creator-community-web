'use strict';
/** MEMORY.md 同步 CHG-022（净增受控：替换 + 压缩）。目标 ≤ 16,384 B。 */
const fs = require('fs');
const P = '.workbuddy/memory/MEMORY.md';
let L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
const before = Buffer.byteLength(L.join('\n'), 'utf8');
const snap = L.slice();
let hit = 0;
const miss = [];
function rep(pre, to, label) {
  const i = snap.findIndex(function (l) { return l.startsWith(pre); });
  if (i >= 0) { L[i] = to; hit++; } else miss.push(label || pre.slice(0, 26));
}

// ① 立红次数 + 平凡通过（含 CHG-022 的新成因）
rep('- 🔑🔴 **「立红」必须早于实现**（已走 3 次）',
  '- 🔑🔴 **「立红」必须早于实现**（**已走 4 次**：`CHG-011` / `CHG-016` / `CHG-020` / `CHG-022`）：把 SC 编译成断言 → **先看它红** → 再实现。**每次都当场抓到真实缺陷**（3 / 4 / 4 / **6** 处）。',
  '立红次数');
rep('- 🔑🔴 **提防「平凡通过」**（**最危险的一类**）',
  '- 🔑🔴 **提防「平凡通过」**（**最危险的一类**）：断言"某状态**不得变化**"或"A **等于** A"时，未实现会因"什么都没做"而**通过** ⇒ ① **不变量断言分两类计数、不计入进度**；② **必须补「前置非空」**。实测：`CHG-020` 首跑 12/77 全是平凡通过 ⇒ 0/77；**`CHG-022` 首跑 20/129 有 13 项平凡通过 ⇒ 4/126**。**三类成因**：字段全缺（"非法 0 项"必然成立）/ DOM 桩默认值 / **容器为空 ⇒ `0 === 0`**。⚠️ **"通过项"本身就是缺陷的藏身处** —— `CHG-022` 的 `fresh()` 未重置 `classList`/`value` ⇒ 跨组污染（`H8` 平凡通过、`C5` 永久失败）。手法见 `DESIGN-METHOD.md` §7.3。',
  '平凡通过');

// ② 当前阶段
rep('- **有效阻塞 = 0 项**；**当前阶段',
  '- **有效阻塞 = 0 项**；**当前阶段 = `TASKS`（`SPEC-004` 已 `TASKED`，`CHG-022`）** ⇒ **下一步 = `SPEC-004` Phase 1 实现（31 项）**（§49 前置已满足）。⚠️ **Phase 1 硬约束：不得改动 `#modal-studio`**（实测绑定 **10 处**；`Q-049` 定稿两阶段）。备选：`SPEC-003` Phase 2（8 项）/ `SPEC-001` Phase 2（风险最高）。四者都动 `app.js` ⇒ **必须串行**（`ENV-02`）。',
  '当前阶段');

// ③ Feature 生命周期
rep('- **Feature 生命周期**：',
  '- **Feature 生命周期**：`SPEC-001` / `SPEC-017` / `SPEC-003` = **`IMPLEMENTED`（Phase 1）**；**`SPEC-004` = `TASKED`**（**四件齐备 + 已立红**）；其余 **12 个** = IDEA。**Feature 内部编号 `US/SC/FR/EX/DA-0xx-xx` 不进入全局体系**；⚠️ `SC-001-xx` **≠** `scenarios.md` 的 `SC-01~08`。',
  'Feature 生命周期');

// ④ 已落地 Feature
rep('- **已落地 Feature（Phase 1）**：',
  '- **已落地 Feature（Phase 1）**：`SPEC-001`（准入 / 年龄闸门 / 委托化 / 审计）· `SPEC-017`（内容资产层「**只存一份、多处引用、归零才收**」）· `SPEC-003`（学职引擎 10 契约 + 资源库 5 入口）。**三者 Phase 2 均未启动。**',
  '已落地 Feature');

// ⑤ 降风险策略 → 升级为「三种同族手法」
rep('- 🔑 **降风险策略（`SPEC-017` / `SPEC-003` 同族）**：',
  '- 🔑 **降回归风险的三种同族手法**（见 `DESIGN-METHOD.md` §三补）：① **「只加字段、不改既有渲染」**（`SPEC-017` → `SPEC-003` → `SPEC-004`）② **「只加方法 + 旧路径转调（兼容壳）」**（`SPEC-003` 的 `completeLesson`）③ **「两阶段迁移：先建壳、后建内」**（`SPEC-004` 的 `Q-049`；判据：**改动点数 >> 1 时，把风险切到批次边界上**）。🔑 **分期必须配「避免清单」**（明确写出"本次不许动什么"）—— `SPEC-004` 列了 **6 项硬禁止**。详见 `PITFALLS-ARCHIVE.md` §L。',
  '降风险策略');

// ⑥ 登记缺口
rep('- **登记缺口**：',
  '- **登记缺口**：`GAP-7` / `GAP-8` / `GAP-9` ⇒ Phase 2；**`GAP-10`（`REQ-084` 悬空）/ `GAP-11`（Q 状态跨行矛盾）/ `GAP-12`（版权确权无归属）/ `GAP-13`（**L1 的 3 个 ERROR 在 `SPEC-003` 落地后仍未消失** ⇒ 「文档声明名 vs 实现名」不一致，属 `SPEC-003` 遗留）**。',
  '登记缺口');

// ⑦ 门禁现状
rep('- **门禁现状**：',
  '- **门禁现状**：L1 **7 ERROR（= 基线）** / **DUP `520` 键 0 重复** / L2 6/6 / MX 通过 / **L3 `14` 套 = `2,343`（13 绿）+ 🔴 1 红（`4/126`）** / 断言合计 **`2,869/2,870`**（不含红灯）/ 总判定通过 / exit 0 / **3 次一致**。基线：`l3ExpectedRed: ["wb-creator-tools-verify"]`、`l3AssertionTotal: 2343`。⚠️ **四套套件（`identity` 53 / `content-asset` 73 / `growth-academy` 87 / **`creator-tools` 待转绿**）是回归防线，不得删。**',
  '门禁现状');

// ⑧ 变更机制：追加 CHG-022 并压缩 CHG-017/018 段
rep('- **`CHG-021`**（2026-09-25）',
  '- **`CHG-021`**（2026-09-25）= `SPEC-003` Phase 1 的 `IMPLEMENT`：**31 项全落地，`0/77` → `77/77`**；修复 4 处 + 立红新测 4 处；`index.html` 1 处、`css` 零改动。⚠️ **新增 `RISK-003-08`：口径收敛使依赖旧口径的既有套件断言失效**（`wb-academy-path-verify` 7 项）⇒ 同步期望（**非放宽标准**）⇒ **受影响文件清单必须含「断言侧」**（`PITFALLS-ARCHIVE.md` §O）。\n- **`CHG-022`**（2026-09-25）= `SPEC-004` 的立红 + `PLAN` + `TASKS`：新建 `wb-creator-tools-verify.js`（**17 契约 / 126 断言**，真实进度 **4/126**，新增能力 **0/126**）+ 四件（`plan` 604 / `tasks` 239 / `data-model` 255 / `research` 207 行）。**立红另测出 6 处缺口**（**扣分是"成功后扣"非"预扣"** / **扣减硬编码 `self`** / **`Math.max(0,…)` ⇒ 余额不足静默放行** / 模型与画幅控件无 `id` / 工具箱与榜单无 `id` / 弹窗段大量内联样式）。**`research.md` R2 = 本项目第 4 次「负向动作保护」类比**（资金 → 身份 → 内容 → **算力**）⇒ **「预扣 + 全额退还」是同构要求，不是偏好**。⚠️ 一并修 3 处存量缺陷（`workspace-state` 重复键 `clarified` / `registered` 误留已转绿套件 / `design-status` §十 缺 `CHG-020/021` 两行）。',
  'CHG-021/022');

// ⑨ 压缩 CHG-017/018 段（已归档 change-impact）
rep('- **`CHG-017` / `CHG-018`**（2026-09-25）=',
  '- **`CHG-017` / `CHG-018`**（2026-09-25）= ① `SPEC-017` Phase 1 落地（基线上调 `2183 → 2256`、DUP `480 → 492`）；② `SPEC-003` / `SPEC-004` 的 `SPECIFY`（同日两份规格；固化 7 处缺陷；新开 `Q-046` ~ `Q-051`）。**教训：受影响文件清单里不写"（如需）"。**⚠️ `change-impact.md` 条目顺序**不统一**（`001~009` 升序 / `010~022` 降序）⇒ 建议整理。',
  'CHG-017/018');

// ⑩ 压缩工程债行
rep('- **工程债**：',
  '- **工程债**：`Q-028` / `Q-030` / `Q-029`（半边）✅；**`Q-036` = 「已接受为已知偏差」**（准入守卫已就位，**字段对齐归 `SPEC-006`**）。**`FU-007`** = `PARTIAL_DONE`。',
  '工程债');

fs.writeFileSync(P, L.join('\n'));
const after = Buffer.byteLength(L.join('\n'), 'utf8');
console.log('MEMORY.md：替换 ' + hit + '/10｜' + before + ' → ' + after + (after <= 16384 ? ' ✅ 在 16KB 内' : ' ⚠️ 超 ' + (after - 16384) + ' B'));
if (miss.length) console.log('未命中：' + miss.join(' ; '));
