'use strict';
/** CHG-022 同步第 1 批：feature-map + specs/README。命中检查基于替换前快照。 */
const fs = require('fs');
function patch(P, rules, inserts) {
  let L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
  const snap = L.slice();
  let hit = 0; const miss = [];
  rules.forEach(function (pair) {
    const i = snap.findIndex(function (l) { return l.startsWith(pair[0]); });
    if (i >= 0) { L[i] = pair[1]; hit++; } else miss.push(pair[0].slice(0, 34));
  });
  let ins = 0;
  (inserts || []).forEach(function (it) {
    const i = L.findIndex(function (l) { return l.startsWith(it.anchor); });
    if (i > 0 && !L[i + 1].startsWith(it.guard)) { L.splice(i + 1, 0, ...it.rows); ins++; }
  });
  fs.writeFileSync(P, L.join('\n'));
  console.log(P + ' → 替换 ' + hit + '/' + rules.length + '｜插入 ' + ins + '/' + ((inserts || []).length) + '｜行数 ' + L.length + (miss.length ? '｜⚠️ 未命中：' + miss.join(' ; ') : ''));
}

// ---------- 05-feature-map.md ----------
patch('project-design/05-feature-map.md', [
  ['| **SPEC-004** |',
   '| **SPEC-004** | 创作工具工作台与模板套用 | 把"灵感"变成"可交付的成片资产" | REQ-201~REQ-206 | SPEC-009（扣积分）、SPEC-017 | **P0** | MVP | ✅ **`TASKED`**（2026-09-25；`specs/004-creator-tools/` 四件齐备 + 立红 **4/126**）。⚠️ §1.3 固化 **3 处**真实缺陷 + **立红另测出 6 处**（合计 **9 处**）；**`Q-049`（两阶段迁移）/ `Q-050`（分源池真源归 `SPEC-009`）/ `Q-051`（Hero 内容集合）** 均已定稿；🔴 **Phase 1 硬约束：不得改动 `#modal-studio`**（实测绑定 **10 处**） |'],
]);

// ---------- specs/README.md ----------
patch('specs/README.md', [
  ['> **当前状态**：',
   '> **当前状态**：`SPEC-001` / `SPEC-017` / **`SPEC-003`** 均已完成全程并落地 **Phase 1**（2026-09-24 ~ 09-25）；**`SPEC-004` 已完成 `SPECIFY` → `CLARIFY` → 立红 → `PLAN` → `TASKS`**（2026-09-25，`CHG-018` ~ `CHG-022`）；其余 **12 个** Feature 仍处于 **IDEA**。'],
  ['| **SPEC-004** 创作工具工作台与模板套用 |',
   '| **SPEC-004** 创作工具工作台与模板套用 | **TASKED**（2026-09-25；同日 `SPECIFY` → `CLARIFY` → 立红 → `PLAN` → `TASKS`，`CHG-018` ~ `CHG-022`） | **`spec.md`** + **`plan.md`** + **`tasks.md`** + **`data-model.md`** + **`research.md`**（15 US / 16 SC / 37 FR（8 组）/ 15 EX；Phase 1 **31 项** + Phase 2 5 项）；**`checklists/` / `contracts/` 未创建**（有意）|'],
  ['| **第 3 批** |',
   '| **第 3 批** | ✅ **`SPEC-003`（成长学院）已完成全程并落地 Phase 1**（2026-09-25，`CHG-018` ~ `CHG-021`）—— 红灯 **0/77 → 77/77**；**`SPEC-004`（创作工具）已完成立红 + `PLAN` + `TASKS`**（`CHG-018` ~ `CHG-022`）—— 立红 **4/126**（新增能力 **0/126**）⇒ 待其 Phase 1 实现；⚠️ **`SPEC-004` 的「分源扣减 / 全额退还」仍取决于 `SPEC-009`（`IDEA`）的就绪时点** | 关键路径中段 |'],
], [
  { anchor: '> 🔴 **`SPEC-003` 的验收证据已先于实现冻结（2026-09-25，`CHG-020`）**',
    guard: '> 🔴 **`SPEC-004` 的验收证据已先于实现冻结',
    rows: [
      '> 🔴 **`SPEC-004` 的验收证据已先于实现冻结（2026-09-25，`CHG-022`）**：`ai-creator-community-wh/tools/wb-creator-tools-verify.js` —— **契约冻结自检**（冻结 **17 项契约** / **126 项功能断言** / 14 项不变量），已登记 `gates-baseline.json` 的 `l3ExpectedRed`。**真实进度 = 功能断言 4/126**（⚠️ 其中 3 项为【前置】既有事实、1 项为既有能力 ⇒ **新增能力 0/126**）。**该套件即 Phase 1 的 DoD。**',
      '> 🔑 **该套件的立红另测出 6 处 `spec.md` 未记载的缺口**：**扣分是"成功后扣"而非"预扣"** · **扣减硬编码 `self`** · **`Math.max(0,…)` 使余额不足静默放行** · **模型/画幅控件无 `id`** · **工具箱与榜单无 `id`** · **既有弹窗段大量内联样式**。',
      '> 🔑 **立红首跑 20/129 → 加固为 4/126**：通过的 20 项中 **13 项属「平凡通过」**（典型三类：字段全缺 ⇒ "非法 0 项"必然成立；DOM 桩默认值天然满足；对象表为空 ⇒ `0 === 0`）⇒ 已为每条「相等 / 不得变化」型断言补**前置非空**，并把「源码级负向」断言移入不变量组。',
    ] },
]);
