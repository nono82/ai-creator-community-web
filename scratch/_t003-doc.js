'use strict';
/** CHG-021 · 回填 plan.md / spec.md / tasks.md 的状态与 DoD。 */
const fs = require('fs');
const ROOT = '.';

function patch(P, rules, inserts) {
  let L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
  const snap = L.slice();
  let hit = 0; const miss = [];
  rules.forEach((r) => {
    const i = snap.findIndex((l) => l.startsWith(r[0]));
    if (i >= 0) { L[i] = r[1]; hit++; } else miss.push(r[0].slice(0, 34));
  });
  let ins = 0;
  (inserts || []).forEach((it) => {
    const i = L.findIndex((l) => l.startsWith(it.anchor));
    if (i > 0 && !(L[i + 1] || '').startsWith(it.guard)) { L.splice(i + 1, 0, ...it.rows); ins++; }
  });
  fs.writeFileSync(P, L.join('\n'));
  console.log(P + ' → 替换 ' + hit + '/' + rules.length + '｜插入 ' + ins + '｜行数 ' + L.length + (miss.length ? '｜⚠️ 未命中：' + miss.join(' ; ') : ''));
}

// ---------- plan.md ----------
patch('specs/003-growth-academy/plan.md', [
  ['> **生命周期状态**：`PLANNED`（2026-09-25，`CHG-020`）',
   '> **生命周期状态**：**`IMPLEMENTED`（Phase 1）**（2026-09-25，`CHG-020` → `CHG-021`：31 项全部落地、红灯转绿）'],
  ['> **验证证据**：`ai-creator-community-wh/tools/wb-growth-academy-verify.js` —— **契约冻结自检**，当前为 🔴 **已登记红灯**（`gates-baseline.json` 的 `l3ExpectedRed`），**功能断言 0/77 + 不变量 10/10**。',
   '> **验证证据**：`ai-creator-community-wh/tools/wb-growth-academy-verify.js` —— **契约冻结自检**，**已转绿**（**功能断言 77/77 + 不变量 10/10，退出码 0**），已从 `l3ExpectedRed` 移除并转为**回归防线**。'],
  // DoD 表
  ['| 1 | 红灯套件**转绿** |',
   '| 1 | 红灯套件**转绿** | `wb-growth-academy-verify.js` **功能断言 77/77**、不变量 **10/10**、**退出码 0** | ✅ **已达成**（`CHG-021`） |'],
  ['| 2 | **既有 12 套绿灯零新失败** |',
   '| 2 | **既有 12 套绿灯零新失败** | `gates.js --baseline` 的 L3 断言合计 **≥ 2,256** 且无 FAIL | ✅ **已达成**（2343/2343，13 套全绿；`wb-academy-path-verify` 的 7 项期望值已按口径同步，非放宽标准） |'],
  ['| 3 | 从 `l3ExpectedRed` 移除 |',
   '| 3 | 从 `l3ExpectedRed` 移除 | 该套件由「待实现清单」转为**回归防线** | ✅ **已达成**（`l3ExpectedRed: []`；`l3AssertionTotal` 2256 → **2343**、`l3Suites` 12 → **13**） |'],
  ['| 4 | **资金恒等式不变** |',
   '| 4 | **资金恒等式不变** | `可提现 + 冻结 = 账户余额` = `5,320.50 + 1,500.00 = 6,820.50`；学习动作**零资金副作用**（`I1/I2`） | ✅ **已达成**（冒烟 P3-1 复算 + 新旧双沙箱逐项一致） |'],
  ['| 5 | `index.html` / `css` 改动**显式记录** |',
   '| 5 | `index.html` / `css` 改动**显式记录** | 时间戳核对（若改动须回写本 Plan §十七 / §二十一） | ⚠️ **`index.html` 有 1 处改动**（新增 `#modal-academy-sheet` 通用弹窗容器，13 行）；**`css` 零改动**（复用既有 `.modal-*` 类）⇒ 已回写 §二十一 |'],
  ['| 6 | 确定性 |',
   '| 6 | 确定性 | `gates.js --baseline` **连续 3 次结果完全一致** | ✅ **已达成** |'],
  ['| 7 | **口径复算通过** |',
   '| 7 | **口径复算通过** | 等级边界 8 组（`B6` 8/8）+ `paths` 与 `LEVEL_GATES` 一致（`B10`）+ `requirements[].points` 人工清单 | ✅ **已达成**（门槛/清单全一致、区间连续无缝、当前用户 `2680 ⇒ Lv.4` 一致） |'],
  ['| 8 | 冒烟**不吞异常** |',
   '| 8 | 冒烟**不吞异常** | `scratch/_spec003-phase1-smoke.js` 异常 **0** 条 + 新旧双沙箱既有账本**逐项一致** | ✅ **已达成**（12/12 项通过、异常 0；数据层差异仅限预期项） |'],
], [
  { anchor: '| 2026-09-25 | 新增 | **首次建立 `SPEC-003` 的 `plan.md`**',
    guard: '| 2026-09-25 | **IMPLEMENT（Phase 1）** |',
    rows: ['| 2026-09-25 | **IMPLEMENT（Phase 1）** | **`SPEC-003` 的 31 项全部落地**（`CHG-021`，`PLANNED` → **`IMPLEMENTED`（Phase 1）**）。**红灯转绿：5/77 → 77/77**（+ 不变量 10/10，退出码 0）。**新增**：学职引擎 10 方法 / 属性 + 资源库 5 入口 + 评价 2 + 相邻课节 + 成就墙 + 排序 2 + 渲染辅助（共约 **28 个方法 / 属性**）；**改造**：`completeLesson` 转兼容壳、`advanceGrowthPath` 转调（消除缺陷 ②）、**两处内联显隐清单统一**；**数据层**：`paths` 阈值与命名收敛、`requirements[].points` 同步、`studyLog` 4 条 50 → 30、`progress` 异常值修正（P3 45 → 40 / P5 10 → 0）。⚠️ **意外影响面（新增 `RISK-003-08`）**：`wb-academy-path-verify` 的 **7 项**断言建立在已作废的旧口径上 ⇒ 已同步其期望值（**非放宽标准**）。**`index.html` 1 处改动 / `css` 零改动** | 本文件；`specs/003-growth-academy/{spec.md,tasks.md}`；`ai-creator-community-wh/{js/app.js,js/mock_data.js,index.html,tools/{gates.js,gates-baseline.json,wb-growth-academy-verify.js,wb-academy-path-verify.js}}`；`99-ai/`；`CHANGELOG.md` |'],
  },
]);

// ---------- spec.md ----------
patch('specs/003-growth-academy/spec.md', [
  ['> **生命周期状态**：**`TASKED`**',
   '> **生命周期状态**：**`IMPLEMENTED`（Phase 1）**（2026-09-25，`CHG-020` → `CHG-021`：31 项全部落地、**红灯转绿 77/77**）'],
  ['> 🔴 **验收证据已先于实现冻结**：',
   '> ✅ **验收证据已转绿并转为回归防线**：`ai-creator-community-wh/tools/wb-growth-academy-verify.js` —— **功能断言 77/77 + 不变量 10/10，退出码 0**；已从 `l3ExpectedRed` 移除。**该套件保留在仓库中**（红灯清零 ≠ 可以删）。'],
], [
  { anchor: '| 2026-09-25 | **立红 + PLAN + TASKS** |',
    guard: '| 2026-09-25 | **IMPLEMENT（Phase 1）** |',
    rows: ['| 2026-09-25 | **IMPLEMENT（Phase 1）** | **31 项全部落地**（`CHG-021`，`TASKED` → **`IMPLEMENTED`（Phase 1）**）：**红灯转绿 0/77 → 77/77**（+ 不变量 10/10，退出码 0）。**10 项契约全部实现**；**4 处缺陷全部修复**（① 三套加分逻辑收敛为唯一入口 ② 晋级判据改为积分达标 ③ 移除 `plans[0]` 兜底 ④ 等级口径收敛到 `Q-003` 裁决值）；**立红另测出的 4 处**亦全部修正（积分双写 / `progress` 派生 / 流水 50 → 30 / 二级页显隐统一）。⏸️ **Phase 2 未启动** | 本文件；`plan.md`；`tasks.md`；`ai-creator-community-wh/js/{app.js,mock_data.js}`；`index.html`；`tools/`；`99-ai/`；`CHANGELOG.md` |'],
  },
]);

// ---------- tasks.md ----------
patch('specs/003-growth-academy/tasks.md', [
  ['> **生命周期状态**：`TASKED`（2026-09-25，`CHG-020`）',
   '> **生命周期状态**：**`IMPLEMENTED`（Phase 1）**（2026-09-25，`CHG-020` → `CHG-021`）'],
  ['> `tools/wb-growth-academy-verify.js` **功能断言 77/77 转绿**（当前 **0/77**）。',
   '> `tools/wb-growth-academy-verify.js` **功能断言 77/77 转绿**（✅ **已达成**：`CHG-021`，+ 不变量 10/10，退出码 0）。'],
]);
