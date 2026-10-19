'use strict';
/** CHG-020 同步第 3 批：CHANGELOG.md（插首条之前）+ tools/README.md（红灯登记与格式契约）。 */
const fs = require('fs');

// ---------- CHANGELOG.md ----------
(function () {
  const P = 'CHANGELOG.md';
  const L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
  const i = L.findIndex(function (l) { return l.startsWith('## [2026-09-25] `SPEC-003` / `SPEC-004` 的 `CLARIFY`'); });
  if (i < 0) { console.log('⚠️ CHANGELOG 锚点未命中'); return; }
  const body = [
    '## [2026-09-25] `SPEC-003` 的立红 + `PLAN` + `TASKS`（CHG-020）',
    '',
    '**类型**：工序推进（未改业务代码；只动文档 + 工具层 + 一处 spec 事实修正）',
    '',
    '### 做了什么',
    '',
    '- **立红**：新建 `ai-creator-community-wh/tools/wb-growth-academy-verify.js` —— SPEC-003「成长学院」的**契约冻结自检**。冻结 **10 项契约** / **77 项功能断言** / 10 项不变量，覆盖 `SC-003-01 ~ 20`；登记入 `gates-baseline.json` 的 `l3ExpectedRed`。**真实进度 = 功能断言 0/77**。',
    '- **`plan.md`**（535 行）：三条前置声明（**本 Feature 是"接电"不是"建楼"** / **口径收敛占一半工作量且比新增代码更危险** / **每条判断都有实测依据**）+ 双阶段 + **Phase 1 八步顺序（含两处顺序陷阱）** + 降风险迁移策略（**只加字段 + 旧路径转调 + 只改 3 个数据字段值**）+ **8 项可机器判定 DoD** + **接口冻结**。',
    '- **`tasks.md`**（204 行）：Phase 1 **31 项** + Phase 2 **8 项**登记；每项标注**跑哪组断言**；★ 标记 11 处"改完即跑门禁"；含 **13 条"不做什么"**。',
    '- **`data-model.md`**（215 行）：三层次（展示层 / 事实层 / 派生层，**严格单向**）+ 4 实体 + **10 条不变量** + **6 个刻意不建的字段**。',
    '- **`research.md`**（186 行）：R1 等级判定归属 / R2 加分幂等键 / R3 `progress` 存还是算 / R4 发证钩子挂载点 + **四项的共同模式**。',
    '',
    '### 🔑 立红当场测出 `spec.md` 未记载的 4 处缺陷',
    '',
    '1. `currentUser.points`（2680）与 `currentUser.learningPoints`（2680）**两份并存**，读侧用 `learningPoints || points || 0` 兜底链、写侧只写 `learningPoints` ⇒ **现成的第二事实源**；',
    '2. `plan.progress` **与课节数不符**（P3 = 45 但 2/5 = 40%；P5 = 10 但 0/5 = 0%）⇒ 证明它是**独立存储字段**而非派生值；',
    '3. `studyLog` 中 `action=\'完成课节\'` 的流水 **`points` 全为 50**（4/4）⇒ 旧 `+50` 口径已**污染全部既有数据**；',
    '4. 二级页显隐**两份内联清单不一致**（`app.js:8302` 为 5 个 id，**缺** `academy-lesson-page`；`app.js:11417` 为 6 个）。',
    '',
    '### ⚠️ 一处事实修正',
    '',
    '`spec.md` §7.4 原写「现状**缺** `claimable`」—— **不准确**。复测 `certificates` 分布为 `owned:7 / locked:4 / claimable:1` ⇒ **中间态已存在 1 条**（`CERT-CREDIT`），真问题是「**有中间态、无驱动机制**」。已修正，并写清"本 Feature 的职责是补驱动机制，不是补中间态"。',
    '',
    '### 🔴 一次真实的自我纠错（本轮最有价值）',
    '',
    '立红首跑显示 **12/77**。逐项复核那 12 项"通过"后发现 —— **全部是"平凡通过"**：`C9` / `C14` / `G7` 本质是**不变量**却写成了功能断言；其余是"方法不存在 ⇒ 什么都没做 ⇒ 断言成立"。',
    '加固手法：为每条断言补**前置非空**（如"必须确实完成了一节课，再检查进度"），并把 3 条不变量移入 I 组 ⇒ **加固后真实进度 = 0/77**。',
    '⇒ **任何"通过"都要问一句 —— 它是"做到了"，还是"什么都没做"？后者不是进度。**',
    '',
    '### 🔧 工具层（含一处既有缺口修复）',
    '',
    '- 红灯套件数：L3 由 **12 套全绿** 变为 **13 套 = 12 绿（2,256 项）+ 🔴 1 红**；断言合计 **2,754/2,755 未变**（红灯不计入）。',
    '- **补齐门禁格式契约**：红灯套件必须输出 ` 通过：x/y 项功能断言（...）`（逐字对齐 `wb-identity-admission-verify.js`）。**`wb-content-asset-verify.js` 此前缺此行** ⇒ 其红灯期的进度被计为 `0/0`、红灯机制"单独报进度"的能力失效（`CHG-017` 只补了绿套的「全部通过」格式）。**本轮一并补齐**。',
    '- 新增诊断能力：套件支持 **`WB_VERBOSE=1`** ⇒ 额外打印**已通过的断言清单**，用于逐项复核"平凡判断"。',
    '',
    '### 实测',
    '',
    '`gates.js --baseline`：L1 **7 ERROR（= 基线，无新增）** / DUP **492/492** / L2 6/6 / MX 通过 / **L3 13 套 = 2,256（12 绿）+ 🔴 1 红** / 断言合计 **2,754/2,755** / **总判定通过 ✅** / exit 0。',
    '红灯进度已可被门禁正确提取：**`已登记待实现 0/77 项（1 套）`**。业务代码**未动**。',
    '',
    '### 影响',
    '',
    '`SPEC-003`：`CLARIFIED` → **`TASKED`**（`AGENTS.md` §49 的 8 项 `IMPLEMENT` 前置已全部满足）。同步 **8 处**全局 Artifact。',
    '',
    '---',
    '',
  ];
  L.splice(i, 0, ...body);
  fs.writeFileSync(P, L.join('\n'));
  console.log('CHANGELOG：已插入 CHG-020 条目（第 ' + (i + 1) + ' 行之前）｜行数 → ' + L.length);
})();

// ---------- tools/README.md ----------
(function () {
  const P = 'ai-creator-community-wh/tools/README.md';
  let L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
  const snap = L.slice();
  const rules = [
    ['> ✅ **L3 当前 12 套全绿',
     '> 🔴 **L3 当前 13 套 = 12 套全绿（2,256 项）+ 1 套「已登记红灯」**（`gates-baseline.json` 的 `l3ExpectedRed: ["wb-growth-academy-verify"]`）。`wb-identity-admission-verify`（CHG-013 转绿）与 `wb-content-asset-verify`（CHG-017 转绿）均已由「待实现清单」转为**回归防线**、**不得删除**；当前红灯为 `wb-growth-academy-verify`（SPEC-003，**功能断言 0/77**）。'],
    ['| **L3** 业务闭环 |',
     '| **L3** 业务闭环 | 按状态机逐状态走查 | **`wb-*-verify.js` × 13 套** | ✅ 在线（**12 套绿 = 2,256 项断言**）；🔴 **1 套已登记红灯**（`wb-growth-academy-verify` —— SPEC-003 的契约冻结自检，**功能断言 0/77**，`RED` 不阻断，见 §6.2） |'],
    [' 合计 **2,256 项** L3 断言',
     '合计 **2,256 项** L3 断言（**12 套全绿**，含 `wb-identity-admission-verify` 53 项 + `wb-content-asset-verify` 73 项）；🔴 **另有 1 套红灯**（`wb-growth-academy-verify`，功能断言 **0/77**，**不计入**断言合计）；另有 DUP **492 键 0 重复**、L2 6 项、L1 存量 **7 ERROR**（= 基线，属既有 FU-002 命名漂移）。'],
    ['| L3 形态差异 |',
     '| L3 形态差异 | 现有 **12 套全绿**的是**断言级**业务自检（2,256 项），尚未做到规范定义的"状态机逐节点走查"，可后续补齐；🔴 **另有 1 套红灯**（`wb-growth-academy-verify`）为 SPEC-003 Phase 1 的待实现清单 |'],
  ];
  let hit = 0, miss = [];
  rules.forEach(function (pair) {
    const k = snap.findIndex(function (l) { return l.startsWith(pair[0]); });
    if (k >= 0) { L[k] = pair[1]; hit++; } else miss.push(pair[0].slice(0, 30));
  });
  // 红灯套件说明行：插在 wb-content-asset-verify 行之后
  const i61 = L.findIndex(function (l) { return l.startsWith('| **`wb-content-asset-verify.js`** |'); });
  if (i61 > 0 && !(L[i61 + 1] || '').startsWith('| **`wb-growth-academy-verify.js`** |')) {
    L.splice(i61 + 1, 0,
      '| **`wb-growth-academy-verify.js`** | L3 | 🔴 **SPEC-003 冻结自检（契约先行）**（CHG-020 新增）—— **当前为「已登记红灯」，属待实现清单，不是回归防线**。冻结 **10 项契约**（`awardLearningPoints` / `getLearningPoints` / `syncAcademyStats` / `markLessonDone` / `evaluateLevelUp` / `LEVEL_GATES` / `maybeUnlockCerts` / `claimCertificate` / `switchAcademySubPage` / `completeLesson` 兼容壳），覆盖 `SC-003-01 ~ 20`。当前进度：**功能断言 0/77**（另有 10 项不变量断言 —— ⚠️ **不计入进度**）。⚠️ 其 DOM 桩**额外提供 `location` 与 `localStorage`**（前者为 `navigateTo` 所需、后者为观看进度台账所需），缺桩会让断言被 `safe()` 吞掉而**失真**。支持 **`WB_VERBOSE=1`** 打印通过项以复核"平凡通过" |');
  }
  fs.writeFileSync(P, L.join('\n'));
  console.log(P + ' → 替换 ' + hit + '/' + rules.length + '｜插入 1｜行数 ' + L.length + (miss.length ? '｜⚠️ 未命中：' + miss.join(' ; ') : ''));
})();

// ---------- tools/README.md：格式契约（平凡通过节） ----------
(function () {
  const P = 'ai-creator-community-wh/tools/README.md';
  const L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
  const i = L.findIndex(function (l) { return /^⚠️ \*\*一类必须小心的"平凡通过"\*\*/.test(l); });
  if (i < 0) { console.log('⚠️ 平凡通过节锚点未命中'); return; }
  // 在该节之前插入"格式契约"小节
  const rows = [
    '> 🔴 **输出格式是门禁契约的一部分（两次踩坑的总结，新套件必须照此写）**：',
    '> · **绿套**（全部通过时）必须输出 `✓ 全部通过：N 项断言（功能 x + 不变量 y）` —— `gates.js` 依 `/全部通过\\s*[：:]\\s*(\\d+)\\s*项/` 提取断言数；',
    '> · **红灯**（未全部通过时）必须在**最后一行**输出 ` 通过：x/y 项功能断言（不变量断言 a/b 未计入）` —— 依 `/通过\\s*[：:]\\s*(\\d+)\\s*\\/\\s*(\\d+)/` 提取，用于报出「已登记待实现 x/y 项」。⚠️ **只报功能断言**，且**必须放在最后一行**（`parseCount` 倒序扫描、首个命中即返回）。',
    '> · **两次踩坑记录**：① `CHG-017` —— `wb-content-asset-verify` 绿套格式写成「✓ 全部通过 ⇒ …」，缺「：N 项」⇒ 曾被**计为 0 项**；② `CHG-020` —— 同一套件**红灯期缺进度行** ⇒ 红灯进度被计为 `0/0`（`CHG-017` 只补了绿套那条，漏了红灯这条）。**两处现均已补齐，三套格式已统一。**',
    '',
  ];
  L.splice(i, 0, ...rows);
  fs.writeFileSync(P, L.join('\n'));
  console.log('tools/README：已插入"格式契约"小节（第 ' + (i + 1) + ' 行之前）｜行数 → ' + L.length);
})();
