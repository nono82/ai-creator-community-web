'use strict';
/** CHG-021 回填 批 3：change-impact（插入）+ CHANGELOG（插入）+ tools/README（更新）。 */
const fs = require('fs');

// ---------- ① change-impact：插在 CHG-020 之前（降序）----------
(function () {
  const P = 'project-design/99-ai/change-impact.md';
  const L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
  const i = L.findIndex((l) => /^## CHG-020/.test(l));
  if (i < 0) { console.log('⚠️ CHG-020 锚点未命中'); return; }
  const neo = fs.readFileSync('ai-creator-community-wh/scratch/_chg021.md', 'utf8').split(/\r?\n/);
  while (neo.length && neo[neo.length - 1].trim() === '') neo.pop();
  L.splice(i, 0, ...neo);
  fs.writeFileSync(P, L.join('\n'));
  console.log('change-impact：CHG-021 插入于第 ' + (i + 1) + ' 行之前（' + neo.length + ' 行）｜总行数 → ' + L.length);
})();

// ---------- ② CHANGELOG：插在首条之前 ----------
(function () {
  const P = 'CHANGELOG.md';
  const L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
  const i = L.findIndex((l) => l.startsWith('## [2026-09-25] `SPEC-003` 的立红 + `PLAN` + `TASKS`'));
  if (i < 0) { console.log('⚠️ CHANGELOG 锚点未命中'); return; }
  const body = [
    '## [2026-09-25] `IMPLEMENT`（Phase 1）· `SPEC-003` 学职引擎落地，红灯转绿（CHG-021）',
    '',
    '**类型**：实现（**首次改动业务代码** —— 学职引擎 + 数据口径收敛）',
    '',
    '### 做了什么',
    '',
    '- **学职引擎（唯一入口层）10 契约全部实现**：`awardLearningPoints` / `getLearningPoints` / `syncAcademyStats` / `markLessonDone` / `evaluateLevelUp` / `LEVEL_GATES` / `maybeUnlockCerts` / `claimCertificate` / `switchAcademySubPage` / `completeLesson`（**兼容壳**）；',
    '- **其余入口**：资源库 5 个（R2 速览+下载 / R3 SOP 复盘 / R4 模板套用 / R5 手册 / R6 社群）+ 评价与心得 2 + 相邻课节 + 成就墙 + 多维排序 2；',
    '- **改造 3 处**：`completeLesson` 转兼容壳（移除 `+50` / `progress + 18` / `plans[0]` 兜底）、`advanceGrowthPath` 转调（移除「会话完成 2 节」旧判据）、**二级页显隐两份内联清单统一**；',
    '- **数据层 13 处定点修正**：`paths` 阈值与命名收敛到 `Q-003` 裁决值、`requirements[].points` 同步、`studyLog` 4 条 `50 → 30`、`progress` 异常值（P3 `45 → 40`、P5 `10 → 0`）。',
    '',
    '### 🔴 4 处缺陷全部修复',
    '',
    '① 三套加分逻辑并存 ⇒ **收敛为唯一入口**；② 晋级按「会话完成 2 节」⇒ **改为积分达标**；③ `completeLesson` 兜底 `plans[0]` ⇒ **越界显式失败**；④ 等级口径与 `Q-003` 裁决相反 ⇒ **整表收敛**。立红期新测出的 4 处（积分双写 / `progress` 与课节数不符 / 流水被 `+50` 污染 / 显隐清单两份不一致）**亦全部修正**。',
    '',
    '### ⚠️ 意外影响面（新增 `RISK-003-08`）',
    '',
    '**口径收敛导致依赖旧口径的既有套件断言失效**：`wb-academy-path-verify` 有 **7 项**断言建立在已作废的 wh 旧口径上（命名 2 / 门槛 1 / 缺口文案 3 / 门槛区间 1）⇒ 收敛后必然变红。已**同步更新其期望值**，恢复 **182/182**。',
    '**判据：旧断言建立在被 `Q-003` 作废的口径上 ⇒ 更新期望 = 修正测试口径，不是放宽标准。** 🔑 **教训：受影响文件清单必须包含「断言侧」。**',
    '',
    '### 验证',
    '',
    '| 项 | 结果 |',
    '| :--- | :--- |',
    '| 契约冻结自检 | **0/77 → 77/77**（+ 不变量 10/10，exit 0）；**77 项逐项复核全部为"真通过"** |',
    '| 行为冒烟（新建） | **12/12、异常 0**；主链路 25 步无异常；**新旧双沙箱资金账本逐项不变** |',
    '| 口径复算 | 门槛与 `requirements` 全一致、区间连续无缝、`2680 ⇒ Lv.4` 一致；资金恒等式成立 |',
    '| 门禁 | **L1 7（= 基线）** / **DUP 520/520** / L2 6/6 / MX 通过 / **L3 2,343（13 套全绿，红灯 0）** / 断言合计 **2,869/2,870** / **总判定通过** / exit 0 |',
    '',
    '### 影响',
    '',
    '`SPEC-003`：`TASKED` → **`IMPLEMENTED`（Phase 1）**。`index.html` **1 处改动**（新增 `#modal-academy-sheet`）；`css` **零改动**。同步 10 处文档 Artifact。',
    '',
    '---',
    '',
  ];
  L.splice(i, 0, ...body);
  fs.writeFileSync(P, L.join('\n'));
  console.log('CHANGELOG：已插入 CHG-021 条目（第 ' + (i + 1) + ' 行之前）｜行数 → ' + L.length);
})();

// ---------- ③ tools/README ----------
(function () {
  const P = 'ai-creator-community-deepseek/ai-creator-community-wh/tools/README.md';
  const A = 'tools/README.md';
  const F = fs.existsSync(P) ? P : A;
  let s = fs.readFileSync(F, 'utf8');
  const before = Buffer.byteLength(s, 'utf8');
  let hit = 0; const miss = [];
  const pairs = [
    ['> 🔴 **L3 当前 13 套 = 12 套全绿（2,256 项）+ 1 套「已登记红灯」**（`gates-baseline.json` 的 `l3ExpectedRed: ["wb-growth-academy-verify"]`）。`wb-identity-admission-verify`（CHG-013 转绿）与 `wb-content-asset-verify`（CHG-017 转绿）均已由「待实现清单」转为**回归防线**、**不得删除**；当前红灯为 `wb-growth-academy-verify`（SPEC-003，**功能断言 0/77**）。',
     '> ✅ **L3 当前 13 套全部全绿（2,343 项），红灯 0**（`gates-baseline.json` 的 `l3ExpectedRed: []`）。三套「契约先行 → 转绿」的套件（`wb-identity-admission-verify` CHG-013 / `wb-content-asset-verify` CHG-017 / **`wb-growth-academy-verify` CHG-021**）均已由「待实现清单」转为**回归防线**、**不得删除**。', '红灯段'],
    ['| **L3** 业务闭环 | 按状态机逐状态走查 | **`wb-*-verify.js` × 13 套** | ✅ 在线（**12 套绿 = 2,256 项断言**）；🔴 **1 套已登记红灯**（`wb-growth-academy-verify` —— SPEC-003 的契约冻结自检，**功能断言 0/77**，`RED` 不阻断，见 §6.2） |',
     '| **L3** 业务闭环 | 按状态机逐状态走查 | **`wb-*-verify.js` × 13 套** | ✅ 在线（**13 套全绿 = 2,343 项断言**）；**红灯 0**（`l3ExpectedRed: []`，CHG-021） |', 'L3 行'],
    ['| **`wb-growth-academy-verify.js`** | L3 | 🔴 **SPEC-003 冻结自检（契约先行）**（CHG-020 新增）—— **当前为「已登记红灯」，属待实现清单，不是回归防线**。',
     '| **`wb-growth-academy-verify.js`** | L3 | ✅ **SPEC-003 冻结自检（契约先行 → 已转绿）**（CHG-020 立红 / **CHG-021 转绿**）—— **由「待实现清单」转为「回归防线」**。**功能断言 77/77 + 不变量 10/10，退出码 0**。', '套件行'],
    ['合计 **2,256 项** L3 断言（**12 套全绿**，含 `wb-identity-admission-verify` 53 项 + `wb-content-asset-verify` 73 项）；🔴 **另有 1 套红灯**（`wb-growth-academy-verify`，功能断言 **0/77**，**不计入**断言合计）；',
     '合计 **2,343 项** L3 断言（**13 套全绿**，含 `wb-identity-admission-verify` 53 项 + `wb-content-asset-verify` 73 项 + `wb-growth-academy-verify` 87 项）；**红灯 0**；', '合计数'],
    ['| L3 形态差异 | 现有 **12 套全绿**的是**断言级**业务自检（2,256 项），尚未做到规范定义的"状态机逐节点走查"，可后续补齐；🔴 **另有 1 套红灯**（`wb-growth-academy-verify`）为 SPEC-003 Phase 1 的待实现清单 |',
     '| L3 形态差异 | 现有 **13 套全绿**的是**断言级**业务自检（2,343 项），尚未做到规范定义的"状态机逐节点走查"，可后续补齐（`RISK-006`）；**红灯 0** |', '形态差异'],
  ];
  pairs.forEach((p) => { if (!s.includes(p[0])) { miss.push(p[2]); return; } s = s.split(p[0]).join(p[1]); hit++; });
  fs.writeFileSync(F, s);
  console.log(F + ' → ' + hit + '/' + pairs.length + '｜字节 ' + before + ' → ' + Buffer.byteLength(s, 'utf8') + (miss.length ? '｜⚠️ 未命中：' + miss.join(' ; ') : ''));
})();
