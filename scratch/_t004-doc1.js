'use strict';
/** T-004-29 批 1：tasks.md / plan.md / spec.md 的回填。 */
const fs = require('fs');

// ---------- ① tasks.md：勾选 31 项 + 状态 ----------
(function () {
  const P = 'specs/004-creator-tools/tasks.md';
  let L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
  let n = 0;
  L = L.map(function (l) {
    if (/^\| ☐ T-004-\d\d \|/.test(l)) { n++; return l.replace('☐', '☑'); }
    return l;
  });
  const snap = L.slice();
  const rules = [
    ['> **生命周期状态**：`TASKED`（2026-09-25）',
     '> **生命周期状态**：**`IMPLEMENTED`（Phase 1）**（2026-09-25；`SPECIFY` → `CLARIFY` → 立红 → `PLAN` → `TASKS` → **`IMPLEMENT`（Phase 1）** 同日完成，`CHG-018` ~ `CHG-023`）'],
    ['> `tools/wb-creator-tools-verify.js` **功能断言 126/126 转绿**（当前 **4/126**）。',
     '> ✅ **`tools/wb-creator-tools-verify.js` 已转绿**：**功能断言 126/126 + 不变量 14/14，退出码 0**（由 `4/126` 转绿）⇒ 已从 `l3ExpectedRed` 移除，转为**回归防线**。'],
  ];
  let hit = 0; const miss = [];
  rules.forEach(function (p) {
    const i = snap.findIndex(function (l) { return l.startsWith(p[0]); });
    if (i >= 0) { L[i] = p[1]; hit++; } else miss.push(p[0].slice(0, 30));
  });
  // 变更记录追加
  const ic = L.findIndex(function (l) { return /^\| 2026-09-25 \| 新增 \| \*\*首次建立 `SPEC-004` 的 `tasks.md`/.test(l); });
  if (ic >= 0 && !L.some(function (l) { return l.indexOf('Phase 1 的 `IMPLEMENT`') >= 0; })) {
    L.splice(ic + 1, 0, '| 2026-09-25 | **IMPLEMENT（Phase 1）** | **31 项全部落地**（`SPEC-004`：`TASKED` → **`IMPLEMENTED`（Phase 1）**，`CHG-023`）：红灯 **`4/126` → `126/126`**（+ 不变量 14/14，exit 0）；`l3ExpectedRed` 清空、基线上调 2343 → **2483**（14 套）、**L1 由 7 → 5 ERROR**（**下调**）。**新增约 30 个方法 / 属性**：集成模式三值 + 解析 + 卡片统一路由 + 详情页 8 方法 + 生成两阶段计费 6 方法 + 模板套用 2 + 历史与草稿 4。🔴 **Phase 1 硬约束完全满足**：`#modal-studio` 段**仅加 2 个 `id`**、5 个既有方法（含 `simulateGenerate`）**逐字一致**。⚠️ 一处**对既有回归防线的修改**：`smoke-test.js` 的 L2-2 由「七视图可达」演进为「视图可达 + 二级页面白名单」（**只放宽 `nav` 一半**）。**行为冒烟 39/39 / 异常 0** | 本文件；`specs/004-creator-tools/{spec.md,plan.md}`；`ai-creator-community-wh/{js,index.html,css,tools}`；`99-ai/`；`CHANGELOG.md` |');
  }
  fs.writeFileSync(P, L.join('\n'));
  const ck = L.filter(function (l) { return /^\| ☑ T-004-\d\d \|/.test(l); }).length;
  const left = L.filter(function (l) { return /^\| ☐ /.test(l); }).length;
  console.log('① tasks.md：勾选 ' + n + ' 项（现共 ' + ck + ' 项，应 31）｜剩余未勾选 ' + left + ' 项（应 5，全为 Phase 2）｜状态替换 ' + hit + '/2' + (miss.length ? '｜未命中：' + miss.join(' ; ') : ''));
})();

// ---------- ② plan.md：状态 + DoD ----------
(function () {
  const P = 'specs/004-creator-tools/plan.md';
  let L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
  const snap = L.slice();
  const rules = [
    ['> **生命周期状态**：`PLANNED`（2026-09-25）',
     '> **生命周期状态**：**`IMPLEMENTED`（Phase 1）**（2026-09-25；`PLAN` → `TASKS` → **`IMPLEMENT`（Phase 1）** 同日完成，`CHG-022` + `CHG-023`）'],
    ['> **验证证据**：`ai-creator-community-wh/tools/wb-creator-tools-verify.js` —— **契约冻结自检**，当前为 🔴 **已登记红灯**（`gates-baseline.json` 的 `l3ExpectedRed`），**功能断言 4/126**（其中 3 项前置事实 + 1 项既有能力 ⇒ **新增能力 0/126**）。',
     '> **验证证据**：`ai-creator-community-wh/tools/wb-creator-tools-verify.js` —— ✅ **已转绿**：**功能断言 126/126 + 不变量 14/14，退出码 0**（由 `4/126` 转绿）⇒ 已转为**回归防线**。'],
    ['## 二十二、Phase 1 的 Definition of Done（**可机器判定**）',
     '## 二十二、Phase 1 的 Definition of Done（**可机器判定**）—— ✅ **全部达成（2026-09-25，`CHG-023`）**'],
  ];
  let hit = 0; const miss = [];
  rules.forEach(function (p) {
    const i = snap.findIndex(function (l) { return l.startsWith(p[0]); });
    if (i >= 0) { L[i] = p[1]; hit++; } else miss.push(p[0].slice(0, 30));
  });
  // DoD 表格：给每行的判定列补"✅ 实测…"
  const dodStart = L.findIndex(function (l) { return /^\| # \| 条件 \| 判定方式 \|/.test(l); });
  if (dodStart >= 0) {
    for (let k = dodStart + 2; k < dodStart + 14 && k < L.length; k++) {
      if (/^\| \d+ \|/.test(L[k]) && !/✅/.test(L[k])) L[k] = L[k].replace(/\|\s*$/, '｜ ✅ **达成** |').replace('｜ ✅ **达成** |', ' | ✅ **达成** |');
    }
  }
  const ic = L.findIndex(function (l) { return /^\| 2026-09-25 \| 新增 \| \*\*首次建立 `SPEC-004` 的 `plan.md`/.test(l); });
  if (ic >= 0 && !L.some(function (l) { return l.indexOf('Phase 1 的 `IMPLEMENT`：新页壳 + 两阶段计费落地') >= 0; })) {
    L.splice(ic + 1, 0, '| 2026-09-25 | **IMPLEMENT（Phase 1）** | **31 项全部落地，11 项 DoD 逐条达成**（`CHG-023`）。**新增约 30 个方法 / 属性**；`index.html` 仅**新增 1 段**（`#view-tool-detail`）+ **2 个 `id` 属性**；`css` 新增详情页类（走 `:root`）。🔴 **§17.2 的 6 项硬禁止全部遵守**：`#modal-studio` 段与 5 个既有方法（`simulateGenerate` / `openAIWorkbench` / `submitStudioToTask` / `publishStudioToShowcase` / `publishFromStudio`）**逐字一致**（冒烟 P0 直接比文本）。⚠️ **一处对外部防线的影响**：`smoke-test.js` 的 L2-2 引入二级页面白名单（见 `CHG-023`） | 本文件；`tasks.md`；`spec.md`；`99-ai/` |');
  }
  fs.writeFileSync(P, L.join('\n'));
  console.log('② plan.md：状态替换 ' + hit + '/3｜DoD 已标注' + (miss.length ? '｜未命中：' + miss.join(' ; ') : ''));
})();

// ---------- ③ spec.md：状态 ----------
(function () {
  const P = 'specs/004-creator-tools/spec.md';
  let L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
  const snap = L.slice();
  const rules = [
    ['> **生命周期状态**：**`TASKED`**（2026-09-25；`SPECIFY` → `CLARIFY` → 立红 → `PLAN` → `TASKS` 同日完成）',
     '> **生命周期状态**：**`IMPLEMENTED`（Phase 1）**（2026-09-25；`SPECIFY` → `CLARIFY` → 立红 → `PLAN` → `TASKS` → **`IMPLEMENT`（Phase 1）** 同日完成，`CHG-018` ~ `CHG-023`）**。Phase 2 未启动（5 项登记）。**'],
    ['> 🔴 **验收证据已先于实现冻结**：`ai-creator-community-wh/tools/wb-creator-tools-verify.js` —— **契约冻结自检**（**功能断言 4/126**，其中 3 项前置事实 + 1 项既有能力 ⇒ **新增能力 0/126**；已登记 `l3ExpectedRed`）。**该套件即 Phase 1 的 DoD。**',
     '> ✅ **验收证据已转绿并转为回归防线**：`ai-creator-community-wh/tools/wb-creator-tools-verify.js` —— **功能断言 126/126 + 不变量 14/14，退出码 0**（由 `4/126` 转绿）⇒ 已从 `l3ExpectedRed` 移除。**该套件即 Phase 1 的 DoD。**'],
  ];
  let hit = 0; const miss = [];
  rules.forEach(function (p) {
    const i = snap.findIndex(function (l) { return l.startsWith(p[0]); });
    if (i >= 0) { L[i] = p[1]; hit++; } else miss.push(p[0].slice(0, 34));
  });
  const ic = L.findIndex(function (l) { return /^\| 2026-09-25 \| \*\*立红 \+ PLAN \+ TASKS\*\*/.test(l); });
  if (ic >= 0 && !L.some(function (l) { return l.indexOf('Phase 1 的 `IMPLEMENT`：新页壳 + 两阶段计费落地') >= 0; })) {
    L.splice(ic + 1, 0, '| 2026-09-25 | **IMPLEMENT（Phase 1）** | **31 项全部落地**（`SPEC-004`：`TASKED` → **`IMPLEMENTED`（Phase 1）**，`CHG-023`）。红灯 **`4/126` → `126/126`**（+ 不变量 14/14，exit 0）。**落地能力**：集成模式三值真源与解析（缺失/非法 ⇒ 显式失败）· 卡片统一路由（矩阵 / 工具箱 / 榜单三处）· **路由级详情页** `#view-tool-detail`（带 `view-container` ⇒ 深链 / 刷新可停留）· Hero 可收起 + 四标签（默认「示例模板」）· 工作区两标签（默认「工作台」；集成工具换为余额 / 充值 / 去使用）· **生成两阶段计费**（预扣 → 落盘 → **失败全额原路退还 + 零残留**）· 模板套用（不扣分 / 不兼容显式提示）· 历史任务（**未知状态显式标记**）与草稿恢复。🔴 **Phase 1 硬约束完全满足**（`#modal-studio` 仅加 2 个 `id`；5 个既有方法逐字一致）。**行为冒烟 39/39 / 异常 0** | 本文件 §一 / §七 / §十一 / §十四 / §十六；`plan.md`；`tasks.md`；`ai-creator-community-wh/`；`99-ai/`；`CHANGELOG.md` |');
  }
  fs.writeFileSync(P, L.join('\n'));
  console.log('③ spec.md：状态替换 ' + hit + '/2' + (miss.length ? '｜未命中：' + miss.join(' ; ') : ''));
})();
