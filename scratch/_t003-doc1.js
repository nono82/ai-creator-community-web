'use strict';
/** CHG-021 回填 批 1：tasks.md 变更记录 + traceability §4.3 + specs/README。 */
const fs = require('fs');

function patch(P, rules, inserts) {
  let L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
  const snap = L.slice();
  let hit = 0; const miss = [];
  rules.forEach((r) => {
    const i = snap.findIndex((l) => l.startsWith(r[0]));
    if (i >= 0) { L[i] = r[1]; hit++; } else miss.push(r[0].slice(0, 32));
  });
  let ins = 0;
  (inserts || []).forEach((it) => {
    const i = L.findIndex((l) => l.startsWith(it.anchor));
    if (i > 0) { L.splice(i + 1, 0, ...it.rows); ins++; }
  });
  fs.writeFileSync(P, L.join('\n'));
  console.log(P + ' → 替换 ' + hit + '/' + rules.length + '｜插入 ' + ins + '｜行数 ' + L.length + (miss.length ? '｜⚠️ 未命中：' + miss.join(' ; ') : ''));
}

// ---------- ① tasks.md 变更记录 ----------
patch('specs/003-growth-academy/tasks.md', [], [
  { anchor: '| 2026-09-25 | 新增 | **首次建立 `SPEC-003` 的 `tasks.md`**',
    rows: ['| 2026-09-25 | **IMPLEMENT（Phase 1）** | **Phase 1 的 31 项全部完成**（`CHG-021`）⇒ `SPEC-003`：`TASKED` → **`IMPLEMENTED`（Phase 1）**。**红灯转绿：0/77 → 77/77**（+ 不变量 10/10，退出码 0）；`l3ExpectedRed` 已移除该套件；基线 `l3AssertionTotal` 2256 → **2343**、`l3Suites` 12 → **13**、DUP 492 → **520**（0 重复）。**两处顺序陷阱均按序执行**（`paths` 收敛晚于 `evaluateLevelUp`；`progress` 派生晚于 `markLessonDone`）。⚠️ `T-003-13`（`requirements[].points` 同步）已用人工清单逐条核对（`RISK-003-02` 已闭合）。⏸️ Phase 2 的 8 项**未启动** |'],
  },
]);

// ---------- ② traceability §4.3 ----------
patch('project-design/01-requirements/traceability.md', [
  ['### 4.3 `SPEC-003 · 成长学院（课程研习与认证）`（2026-09-25 `SPECIFY` → `CLARIFY` → **立红 → `PLAN` → `TASKS`**；生命周期状态 **`TASKED`**）',
   '### 4.3 `SPEC-003 · 成长学院（课程研习与认证）`（2026-09-25 `SPECIFY` → `CLARIFY` → 立红 → `PLAN` → `TASKS` → **`IMPLEMENT`（Phase 1）**；生命周期状态 **`IMPLEMENTED`（Phase 1）**）'],
  ['> `spec.md`：`specs/003-growth-academy/spec.md`（状态 **`TASKED`**）。',
   '> `spec.md`：`specs/003-growth-academy/spec.md`（状态 **`IMPLEMENTED`（Phase 1）**）。✅ **Phase 1 已落地**：31 项全部完成、**红灯转绿 0/77 → 77/77**（+ 不变量 10/10，退出码 0）；**Phase 2 的 8 项未启动**。'],
  ['> **验证证据**：`ai-creator-community-wh/tools/wb-growth-academy-verify.js` —— **契约冻结自检**（10 项契约 / **功能断言 0/77** + 不变量 10/10；已登记 `l3ExpectedRed`）。',
   '> **验证证据**：`ai-creator-community-wh/tools/wb-growth-academy-verify.js` —— **契约冻结自检**（10 项契约 / **功能断言 77/77** + 不变量 10/10；**已转绿并转为回归防线**）。'],
  ['| `REQ-101` | SPEC-003 | US-003-01 | FR-003-13 / 16 ~ 22 | SC-003-01 / 02 | T-003-27 |',
   '| `REQ-101` | SPEC-003 | US-003-01 | FR-003-13 / 16 ~ 22 | SC-003-01 / 02 | T-003-27 ✅ |'],
  ['| `REQ-102` | SPEC-003 | US-003-02 / 03 | FR-003-23 ~ 25 | SC-003-03 / 04 / 05 | 既有 + T-003-27 |',
   '| `REQ-102` | SPEC-003 | US-003-02 / 03 | FR-003-23 ~ 25 | SC-003-03 / 04 / 05 | 既有 + T-003-27 ✅ |'],
  ['| `REQ-103` | SPEC-003 | US-003-04 / 13 | FR-003-03 / 05 ~ 10 / 29 ~ 33 | SC-003-06 / 07 / 08 | **T-003-04 / 06 / 08 / 10 / 11 / 14 / 24** |',
   '| `REQ-103` | SPEC-003 | US-003-04 / 13 | FR-003-03 / 05 ~ 10 / 29 ~ 33 | SC-003-06 / 07 / 08 | **T-003-04 / 06 / 08 / 10 / 11 / 14 / 24** ✅ |'],
  ['| `REQ-104` | SPEC-003 | US-003-06 / 07 | FR-003-44 ~ 48 | SC-003-11 / 12 / 13 | **T-003-15 / 16 / 17** |',
   '| `REQ-104` | SPEC-003 | US-003-06 / 07 | FR-003-44 ~ 48 | SC-003-11 / 12 / 13 | **T-003-15 / 16 / 17** ✅ |'],
  ['| `REQ-105` | SPEC-003 | US-003-09 | FR-003-02 / 11 / 12 / 34 ~ 36 | SC-003-06 | **T-003-05 / 25 / 26** |',
   '| `REQ-105` | SPEC-003 | US-003-09 | FR-003-02 / 11 / 12 / 34 ~ 36 | SC-003-06 | **T-003-05 / 25 / 26** ✅ |'],
  ['| `REQ-106` | SPEC-003 | US-003-10 | FR-003-37 ~ 43 | SC-003-18 | **T-003-19 ~ 22** |',
   '| `REQ-106` | SPEC-003 | US-003-10 | FR-003-37 ~ 43 | SC-003-18 | **T-003-19 ~ 22** ✅ |'],
  ['| `REQ-107` | SPEC-003 | US-003-05 | FR-003-26 / 27 | SC-003-09 / 10 | T-003-23 |',
   '| `REQ-107` | SPEC-003 | US-003-05 | FR-003-26 / 27 | SC-003-09 / 10 | T-003-23 ✅ |'],
  ['| `REQ-108` | SPEC-003 | US-003-08 / 12 | FR-003-04 / 15 / 49 | SC-003-14 / 15 | **T-003-03 / 07 / 24** |',
   '| `REQ-108` | SPEC-003 | US-003-08 / 12 | FR-003-04 / 15 / 49 | SC-003-14 / 15 | **T-003-03 / 07 / 24** ✅ |'],
  ['| `REQ-206`（交接 `SPEC-004`） | SPEC-003 | US-003-11 | FR-003-40 | SC-003-17 | T-003-21 |',
   '| `REQ-206`（交接 `SPEC-004`） | SPEC-003 | US-003-11 | FR-003-40 | SC-003-17 | T-003-21 ✅ |'],
  ['| `CON-022`（创作积分只增不减） | SPEC-003 | — | FR-003-08 / §7.3 | SC-003-15 / 16 | T-003-04 / 11 |',
   '| `CON-022`（创作积分只增不减） | SPEC-003 | — | FR-003-08 / §7.3 | SC-003-15 / 16 | T-003-04 / 11 ✅ |'],
  ['| `Q-002`（不引入认证导师） | SPEC-003 | — | FR-003-50 | EX-003-11 | T-003-02 |',
   '| `Q-002`（不引入认证导师） | SPEC-003 | — | FR-003-50 | EX-003-11 | T-003-02 ✅ |'],
  ['| `Q-003`（等级阈值裁决） | SPEC-003 | — | FR-003-04 / §7.1 | SC-003-14 / S-3 | **T-003-03 / 12 / 13** |',
   '| `Q-003`（等级阈值裁决） | SPEC-003 | — | FR-003-04 / §7.1 | SC-003-14 / S-3 | **T-003-03 / 12 / 13** ✅ |'],
]);

// ---------- ③ specs/README ----------
patch('specs/README.md', [
  ['> **当前状态**：',
   '> **当前状态**：`SPEC-001` / `SPEC-017` / **`SPEC-003`** 均已完成全程并落地 **Phase 1**（2026-09-24 ~ 09-25）；**`SPEC-004` 完成 `SPECIFY` → `CLARIFY`**（待 `PLAN`）；其余 **13 个** Feature 仍处于 **IDEA**。'],
  ['| **SPEC-003** 成长学院（课程研习与认证） |',
   '| **SPEC-003** 成长学院（课程研习与认证） | **IMPLEMENTED（Phase 1）**（2026-09-25；同日 `SPECIFY` → `CLARIFY` → 立红 → `PLAN` → `TASKS` → `IMPLEMENT`，`CHG-018` ~ `CHG-021`） | **`spec.md`** + **`plan.md`** + **`tasks.md`** + **`data-model.md`** + **`research.md`**；**验证证据** = `tools/wb-growth-academy-verify.js`（✅ **77/77 + 10/10，exit 0**，已转绿）；实现落点：`js/app.js`、`js/mock_data.js`、`index.html`（1 处） |'],
  ['| **第 3 批** |',
   '| **第 3 批** | ✅ **`SPEC-003`（成长学院）已完成全程并落地 Phase 1**（2026-09-25，`CHG-018` ~ `CHG-021`）—— 红灯 **0/77 → 77/77**；**`SPEC-004`（创作工具）待 `PLAN` / `TASKS`**；⚠️ **`SPEC-004` 的「分源扣减 / 全额退还」仍取决于 `SPEC-009`（`IDEA`）的就绪时点** | 关键路径中段 |'],
], [
  { anchor: '> 🔴 **`SPEC-003` 的验收证据已先于实现冻结（2026-09-25，`CHG-020`）**',
    guard: '> ✅ **`SPEC-003` 的验收证据已转绿并转为回归防线（2026-09-25，`CHG-021`）**',
    rows: ['> ✅ **`SPEC-003` 的验收证据已转绿并转为回归防线（2026-09-25，`CHG-021`）**：`wb-growth-academy-verify.js` —— **功能断言 77/77 + 不变量 10/10，退出码 0**；已从 `l3ExpectedRed` 移除（现为 `[]`）。**保留在仓库中**（红灯清零 ≠ 可以删）。⚠️ **立红期 0/77 → 实现的 77/77**：首跑曾显示 12/77，逐项复核发现**全部是「平凡通过」**（含 3 项本质是不变量）⇒ 加固后 0/77 才是可信起点。'],
  },
]);
