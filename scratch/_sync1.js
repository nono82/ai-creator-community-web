'use strict';
/** CHG-020 同步第 1 批：specs/README.md + design-status.md。命中检查基于替换前快照。 */
const fs = require('fs');

function patch(P, rules, inserts) {
  let L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
  const snap = L.slice();
  let hit = 0, miss = [];
  rules.forEach(function (pair) {
    const pre = pair[0], to = pair[1];
    const i = snap.findIndex(function (l) { return l.startsWith(pre); });
    if (i >= 0) { L[i] = to; hit++; } else miss.push(pre.slice(0, 34));
  });
  let ins = 0;
  (inserts || []).forEach(function (it) {
    const i = L.findIndex(function (l) { return l.startsWith(it.anchor); });
    if (i > 0 && !L[i + 1].startsWith(it.guard)) { L.splice(i + 1, 0, ...it.rows); ins++; }
  });
  fs.writeFileSync(P, L.join('\n'));
  console.log(P + ' → 替换 ' + hit + '/' + rules.length + '｜插入 ' + ins + '/' + ((inserts || []).length) + '｜行数 ' + L.length + (miss.length ? '｜⚠️ 未命中：' + miss.join(' ; ') : ''));
}

// ---------- specs/README.md ----------
patch('specs/README.md', [
  ['> **当前状态**：',
   '> **当前状态**：`SPEC-001` 完成全程并落地 **Phase 1**；**`SPEC-017` 完成全程并落地 Phase 1**；**`SPEC-003` 完成 `SPECIFY` → `CLARIFY` → 立红 → `PLAN` → `TASKS`**（2026-09-25，`CHG-018` ~ `CHG-020`）；**`SPEC-004` 完成 `SPECIFY` → `CLARIFY`**；其余 **13 个** Feature 仍处于 **IDEA**。'],
  ['| **SPEC-003** 成长学院（课程研习与认证） |',
   '| **SPEC-003** 成长学院（课程研习与认证） | **TASKED**（2026-09-25；同日 `SPECIFY` → `CLARIFY` → 立红 → `PLAN` → `TASKS`，`CHG-018` ~ `CHG-020`） | **`spec.md`** + **`plan.md`** + **`tasks.md`** + **`data-model.md`** + **`research.md`**（14 US / 20 SC / 53 FR（9 组）/ 19 EX；Phase 1 **31 项** + Phase 2 8 项）；**`checklists/` / `contracts/` 未创建**（有意）|'],
  ['| **第 3 批** |',
   '| **第 3 批** | ✅ **`SPEC-003`（成长学院）已完成全程规格链并 `TASKED`**（2026-09-25，`CHG-018` ~ `CHG-020`）—— 已立红（**功能断言 0/77**）；**`SPEC-004`（创作工具）已完成 `SPECIFY` → `CLARIFY`，待 `PLAN` / `TASKS`**；⚠️ **`SPEC-004` 的「分源扣减 / 全额退还」仍取决于 `SPEC-009`（`IDEA`）的就绪时点** | 关键路径中段 |'],
], [
  { anchor: '> ✅ **验收证据已转绿并转为回归防线（2026-09-25，`CHG-017`）**',
    guard: '> 🔴 **`SPEC-003` 的验收证据已先于实现冻结',
    rows: [
      '> 🔴 **`SPEC-003` 的验收证据已先于实现冻结（2026-09-25，`CHG-020`）**：`ai-creator-community-wh/tools/wb-growth-academy-verify.js` —— **契约冻结自检**（冻结 **10 项契约** / **77 项功能断言** / 10 项不变量），已登记 `gates-baseline.json` 的 `l3ExpectedRed`。**真实进度 = 功能断言 0/77**（⚠️ 首跑显示 12/77，逐项复核后发现**全部是"平凡通过"** ⇒ 已补前置非空断言加固）。**该套件即 Phase 1 的 DoD。**',
      '> 🔑 **该套件的立红另新增 4 处实测发现**（`spec.md` §1.3 未记载）：`currentUser.points` 与 `learningPoints` **双读双写** · `plan.progress` **与课节数不符**（P3/P5）· 既有 `studyLog` 4 条流水被旧 `+50` **全部污染** · 二级页显隐**两份内联清单不一致**。',
    ] },
]);

// ---------- design-status.md ----------
patch('project-design/99-ai/design-status.md', [
  ['→ 生命周期位置：',
   '→ 生命周期位置：[*] → PROJECT_INITIALIZATION → CLARIFY（P0 批次）→ SPECIFY → CLARIFY（Feature 级）→ CHECKLIST → PLAN → TASKS → **IMPLEMENT（`SPEC-001` Phase 1 ✅ / `SPEC-017` Phase 1 ✅ 均已落地）** → **【当前】第 3 批（`SPEC-003` 已完成 立红 → `PLAN` → `TASKS`；`SPEC-004` 完成 `SPECIFY` → `CLARIFY`）** → [下一批：`SPEC-003` Phase 1 实现 / `SPEC-004` 的 `PLAN`]'],
  ['| 工具层 |',
   '| 工具层 | ✅ 已变更：`tools/` 含 `gates.js` / `smoke-test.js` / `dup-method-check.js` / `gates-baseline.json` / `README.md`，**L3 共 13 套 = 12 套全绿（2,256 项）+ 🔴 1 套已登记红灯**（`wb-growth-academy-verify`，**功能断言 0/77**）（CHG-003 + CHG-007 + CHG-011 + CHG-013 + CHG-016 + CHG-017 + **CHG-020**） |'],
  ['| 本轮动作 |',
   '| 本轮动作 | **`SPEC-003` 的立红 + `PLAN` + `TASKS`（CHG-020）**：① **立红** —— 新建 **`tools/wb-growth-academy-verify.js`**（**10 项契约** / **77 项功能断言** / 10 项不变量），登记 `l3ExpectedRed`；**首跑 12/77 经逐项复核全部属「平凡通过」**（加固后真实进度 = **0/77**）⇒ 再次印证铁律「**「相等」型断言必须配「前置非空」断言**」。② 产出 **`plan.md`** / **`tasks.md`** / **`data-model.md`** / **`research.md`**。③ **修正 `spec.md` §7.4 的一处事实错误**（`claimable` **已存在 1 条**，不是"缺失"）。④ **补齐门禁格式契约**（红灯套件须输出 `通过：x/y 项功能断言`，否则进度被计为 0/0）。**未改业务代码**（本轮只动文档 + 工具层） |'],
  ['| **SPEC-003** 成长学院（课程研习与认证） |',
   '| **SPEC-003** 成长学院（课程研习与认证） | ✅ **`TASKED`**（2026-09-25；同日 `SPECIFY` → `CLARIFY` → 立红 → `PLAN` → `TASKS`） | `spec.md` / **`plan.md`** / **`tasks.md`** / **`data-model.md`** / **`research.md`**；**验证证据** = `tools/wb-growth-academy-verify.js`（🔴 **功能断言 0/77**，已登记 `l3ExpectedRed`） |'],
], [
  { anchor: '| **`specs/003-growth-academy/spec.md`** |',
    guard: '| **`specs/003-growth-academy/plan.md`** |',
    rows: [
      '| **`specs/003-growth-academy/plan.md`** | ✅ **实现计划（CHG-020）**：三条前置声明（**本 Feature 是"接电"不是"建楼"** / **口径收敛占一半工作量且比新增代码更危险** / **每条判断都有实测依据**）+ 双阶段声明 + **Phase 1 八步顺序（含两处顺序陷阱）** + 降风险迁移策略（**只加字段 + 旧路径转调 + 只改 3 个数据字段值**）+ §二十二 **8 项可机器判定 DoD** + §二十三 **接口冻结**。⚠️ 特别标注 **`RISK-003-02`（`requirements[].points` 漏改会产生新矛盾）** |',
      '| **`specs/003-growth-academy/tasks.md`** | ✅ **任务清单（CHG-020）**：Phase 1 **31 项**（骨架 3 / 入口 5 / 转调与数据收口 3 / 口径收敛 3 / 证书 3 / 二级页 1 / 其余入口 6 / 收尾 7）+ Phase 2 **8 项**登记；每项标注**跑哪组断言**；★ 标记 11 处**必须立即跑门禁**；含 **3 条顺序警戒** 与 **13 条"不做什么"** |',
      '| **`specs/003-growth-academy/data-model.md`** | ✅ **领域模型（CHG-020）**：**三层次**（展示层 / 事实层 / 派生层，**严格单向**）+ 4 个实体 + **10 条不变量** + **6 个刻意不建的字段** + Domain vs Schema 显式区分。⚠️ 一并**修正 `spec.md` §7.4 的事实错误** |',
      '| **`specs/003-growth-academy/research.md`** | ✅ **技术研究（CHG-020）**：R1 等级判定归属（承 `Q-046`，三条实测依据）· R2 加分幂等键（**并写明"宁可漏分不可重复分"的取舍**）· R3 `progress` 存还是算（**并写明 P3/P5 的修正属数据修正而非回归**）· R4 发证钩子挂载点 · 附**四项的共同模式**（**本项目第四次应用同一模式**） |',
    ] },
]);
