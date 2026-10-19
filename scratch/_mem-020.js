'use strict';
/** MEMORY.md 同步 CHG-020（含压缩，守 16KB 上限）。 */
const fs = require('fs');
const P = '.workbuddy/memory/MEMORY.md';
let L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
const snap = L.slice();
const before = fs.readFileSync(P, 'utf8').length;

// 规则：[行首前缀, 新内容 | null=删除]
const rules = [
  ['- 工作方式：',
   '- 工作方式：**`AGENTS.md` 为唯一准则**（Spec-Driven Development）。**工序 =「契约先行 → 立红 → `PLAN` → `TASKS` → 最小实现 → 回填收敛」** —— 已在 `SPEC-001`（CHG-011~013）、**`SPEC-017`（CHG-016~017）**、**`SPEC-003`（CHG-020）** **三次**走通；**`SPEC-001` / `SPEC-017` = `IMPLEMENTED`（Phase 1）**；**`SPEC-003` = `TASKED`**（四件齐备 + 立红 0/77）；**`SPEC-004` = `CLARIFIED`**；其余 13 个 Feature 仍为 `IDEA`（**不预生成**）。⚠️ `CHECKLIST` 先于 `PLAN` 的时点偏离已复检完毕、**不再挂账**。'],

  ['- **成长学院 / 创作工具（',
   '- **成长学院 / 创作工具**：**等级口径取 `Q-003` 裁决值**（`0/200/500/2000/5000`，命名**无 `AI` 前缀**）；**加分唯一入口** `awardLearningPoints`（课节 +30 / 心得 +5 / 教材 +5 / 领证 +100）；付费课程走**账户余额**；**AI 工具详情页 = 路由级页面**。**`SPEC-003` 的 10 项契约**（`CHG-020`）：`awardLearningPoints` / `getLearningPoints` / `syncAcademyStats` / `markLessonDone` / `evaluateLevelUp` / **`LEVEL_GATES`（等级唯一可配置真源）** / `maybeUnlockCerts` / `claimCertificate` / `switchAcademySubPage` / `completeLesson`（**兼容壳，必须转调**）。'],

  ['- 🔴 **产出证据要过两道坎**：',
   '- 🔴 **产出证据要过两道坎**：① 断言**写对**；② **套件输出格式须匹配门禁正则** —— **绿套**须 `✓ 全部通过：N 项断言`；**红灯**须末行 ` 通过：x/y 项功能断言`（否则**进度被计为 0/0**、静默失效）。**同一格式问题已踩坑两次**（`CHG-017` 漏绿套 / `CHG-020` 漏红灯）⇒ 详见 `PITFALLS-ARCHIVE.md` §M，**新套件照抄 `wb-identity-admission-verify.js` 的输出块**。**且「绿灯全过」≠「回归已验证」**：**「相等」型断言须配「前置非空」断言**，并另做**行为冒烟**（**不吞异常** + **新旧双沙箱对比**）。'],

  ['- 🔑🔴 **「立红」必须早于实现**：',
   '- 🔑🔴 **「立红」必须早于实现**（已走 3 次）：把 SC 编译成断言 → **先看它红** → 再实现。**每次都当场抓到真实缺陷**（`CHG-011` 3 处 / `CHG-020` 4 处）。'],
  ['- 🔑🔴 **提防「平凡通过」**：',
   '- 🔑🔴 **提防「平凡通过」**（**最危险的一类**）：断言"某状态**不得变化**"或"A **等于** A"时，未实现会因"什么都没做"而**通过** ⇒ ① **不变量断言分两类计数、不计入进度**；② **必须补「前置非空」**（先证明"确实做到了 X"，再断言 X 的后果）。实测：`19/53` 看似完成 19 项，真实 3/37；**`CHG-020` 首跑 12/77，逐项复核后 12 项全是平凡通过 ⇒ 加固后 0/77**。手法见 `DESIGN-METHOD.md` §7.3。'],

  ['- **有效阻塞 = 0 项**；**当前阶段',
   '- **有效阻塞 = 0 项**；**当前阶段 = `TASKS`（`SPEC-003` 已完成 立红 → `PLAN` → `TASKS`，`CHG-020`）** ⇒ **下一步 = `SPEC-003` Phase 1 的 31 项实现**（§49 前置已满足；⚠️ 先 `T-003-01` 备份 + `T-003-02` 基线）。🔴 **两处顺序陷阱**：`paths` 阈值收敛须晚于 `evaluateLevelUp`；`progress` 改派生须晚于 `markLessonDone`。⚠️ `SPEC-003` 与 `SPEC-004` 都动 `app.js` ⇒ **必须串行**（`ENV-02`）。'],

  ['- **Feature 生命周期**：',
   '- **Feature 生命周期**：`SPEC-001` / `SPEC-017` = **`IMPLEMENTED`（Phase 1）**；**`SPEC-003` = `TASKED`**（`spec` + `plan` + `tasks` + `data-model` + `research` 齐备 + 立红）；**`SPEC-004` = `CLARIFIED`**（仅 `spec.md`）；`SPEC-002` / `SPEC-005~016`（**13 个**）= IDEA。**Feature 内部编号 `US/SC/FR/EX/DA-0xx-xx` 不进入全局体系**。⚠️ `SC-001-xx` **≠** `scenarios.md` 的 `SC-01~08`。'],

  ['- **门禁现状**：',
   '- **门禁现状**：L1 **7 ERROR（= 基线）** / **DUP `492` 键 0 重复** / L2 6/6 / MX 通过 / **L3 `2,256` 项（12 套全绿）+ 🔴 1 套已登记红灯**（`wb-growth-academy-verify`，**功能断言 0/77**）/ 断言合计 **`2,754/2,755`**（**不含**红灯）/ 总判定通过 / exit 0 / **连续 3 次一致**。基线：`l3ExpectedRed: ["wb-growth-academy-verify"]`、`l3AssertionTotal: 2256`、`l3Suites: 12`。⚠️ **转绿套件（`identity-admission` 53 / `content-asset` 73）是回归防线，不得删。**'],

  // ---------- 压缩 ----------
  ['- **`SPEC-001` 规模**：',
   '- **`SPEC-001` 规模**：12 US / 22 SC / **58 FR（7 组）** / 16 EX / 10 DA（含 **G.1 权限矩阵 13×5**）；`CHECKLIST` **通过 10**。**`tasks.md`：Phase 1 24 项 ✅ + Phase 2 12 项登记**。'],
  ['- **`SPEC-017` 规模**：',
   '- **`SPEC-017` 规模**：11 US / **16 SC** / **45 FR（7 组）** / 18 EX / 9 DA。核心命题「**只存一份、多处引用、归零才收**」。**Phase 1 = 26 项 ✅ / Phase 2 = 10 项登记**。'],
  ['- 🔑 **`SPEC-017` 的降风险策略**：',
   '- 🔑 **降风险策略（`SPEC-017` 与 `SPEC-003` 同族）**：**「只加字段、不改既有字段、不改既有渲染」** ⇒ `CHG-017` 实测**既有绿灯零新失败 + `index.html`/`css` 零改动**。`SPEC-003` 沿用为「**只加方法 + 旧路径转调 + 只改 3 个数据字段值**」。详见 `DESIGN-METHOD.md` §三 / `PITFALLS-ARCHIVE.md` §L。'],
  ['- **`SPEC-001` 进度**：',
   '- **`SPEC-001` 进度**：Phase 1 ✅（`CHG-013`）—— 24 项、DoD 9/9；能力 = `checkAdmission` / `evaluateAgeGate` / 3 个守卫 / 委托化 `isCredentialMet` / 审计留痕。'],
  ['- **`CHG-017`**（2026-09-25）',
   '- **`CHG-017`**（2026-09-25）= `SPEC-017` Phase 1 落地（内容资产层 + 四处接线 + 冒烟 28 项 + 套件转绿 + 基线上调 2183 → 2256、DUP 480 → 492）。⚠️ `change-impact.md` 条目顺序**不统一**（`001~009` 升序 / `010~020` 降序）⇒ 建议整理。'],
  ['- **`CHG-018`**（2026-09-25）',
   '- **`CHG-018`**（2026-09-25）= `SPEC-003` / `SPEC-004` 的 `SPECIFY`（同日两份规格；合计固化 7 处实测缺陷；新开 `Q-046` ~ `Q-051`）。**教训：受影响文件清单里不写"（如需）"。**'],
  ['- **`CHG-019`**（2026-09-25）',
   '- **`CHG-019`**（2026-09-25）= 二者同日 `CLARIFY`（**六条定稿，含三条 P1**）：**真源归属类的判据 = 因果链而非偏好**（`Q-046`）；**结构级迁移默认「两阶段 + 兼容层」**；**「上游未落地」≠「可以自建」**（禁造临时池）。\n- **`CHG-020`**（2026-09-25）= `SPEC-003` 的**立红 + `PLAN` + `TASKS`**（工序第 3 次走通；**`SPEC-003` → `TASKED`**）：新建 `tools/wb-growth-academy-verify.js`（10 契约 / **77 功能断言** / 10 不变量，**真实进度 0/77**）+ 四件（`plan` 535 行 / `tasks` 204 / `data-model` 215 / `research` 186）。**立红新增 4 处实测缺陷**：积分双写（`points` 与 `learningPoints` 并存）· **`progress` 与课节数不符**（P3 = 45 vs 40%）· `studyLog` 4 条流水被旧 `+50` 全污染 · 二级页显隐**两份内联清单不一致**（`app.js:8302` 5 个 id / `11417` 6 个）。⚠️ 修正 `spec.md` §7.4 事实错误：`claimable` **已存在 1 条**（非"缺失"），真问题是**无驱动机制**。'],
];

let hit = 0, miss = [];
rules.forEach(function (pair) {
  const k = snap.findIndex(function (l) { return l.startsWith(pair[0]); });
  if (k >= 0) { L[k] = pair[1]; hit++; } else miss.push(pair[0].slice(0, 26));
});
fs.writeFileSync(P, L.join('\n'));
const after = fs.readFileSync(P, 'utf8').length;
console.log('替换 ' + hit + '/' + rules.length + '｜字节 ' + before + ' → ' + after + (after <= 16384 ? ' ✅ 在 16KB 内' : ' ⚠️ 超 ' + (after - 16384) + ' B') + (miss.length ? '｜⚠️ 未命中：' + miss.join(' ; ') : ''));
