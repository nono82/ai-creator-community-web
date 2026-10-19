'use strict';
/** CHG-021 写记忆：日志追加 + PITFALLS 插入 + MEMORY.md 更新（含压缩，守 16KB）。 */
const fs = require('fs');

// ---------- ① 当日日志追加 ----------
(function () {
  const P = '.workbuddy/memory/2026-09-25.md';
  const add = fs.readFileSync('ai-creator-community-wh/scratch/_log-021.md', 'utf8');
  fs.writeFileSync(P, fs.readFileSync(P, 'utf8') + add);
  console.log('日志：追加 ' + add.length + ' 字符｜字节 → ' + Buffer.byteLength(fs.readFileSync(P, 'utf8'), 'utf8'));
})();

// ---------- ② PITFALLS-ARCHIVE：插在「归档记录」之前 ----------
(function () {
  const P = '.workbuddy/memory/PITFALLS-ARCHIVE.md';
  const L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
  const i = L.findIndex((l) => /^## 归档记录/.test(l));
  if (i < 0) { console.log('⚠️ PITFALLS 锚点未命中'); return; }
  const neo = fs.readFileSync('ai-creator-community-wh/scratch/_pa-021.md', 'utf8').split(/\r?\n/);
  while (neo.length && neo[neo.length - 1].trim() === '') neo.pop();
  L.splice(i, 0, ...neo, '');
  fs.writeFileSync(P, L.join('\n'));
  console.log('PITFALLS：已插入 §O / §P / §Q（' + neo.length + ' 行）｜行数 → ' + L.length);
})();

// ---------- ③ MEMORY.md ----------
(function () {
  const P = '.workbuddy/memory/MEMORY.md';
  const L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
  const snap = L.slice();
  const before = Buffer.byteLength(fs.readFileSync(P, 'utf8'), 'utf8');
  const rules = [
    ['- 工作方式：',
     '- 工作方式：**`AGENTS.md` 为唯一准则**（Spec-Driven Development）。**工序 =「契约先行 → 立红 → `PLAN` → `TASKS` → 最小实现 → 回填收敛」** —— 已在 **`SPEC-001` / `SPEC-017` / `SPEC-003` 三次**完整走通（各含立红 → 转绿）。**三者 = `IMPLEMENTED`（Phase 1）**；**`SPEC-004` = `CLARIFIED`**；其余 13 个 = `IDEA`（**不预生成**）。'],
    ['- **有效阻塞 = 0 项**；**当前阶段',
     '- **有效阻塞 = 0 项**；**当前阶段 = `IMPLEMENT`（`SPEC-003` Phase 1 ✅ 已落地，`CHG-021`）** ⇒ **下一步三选一**：A. `SPEC-004` 的 `PLAN` / `TASKS`（推荐）/ B. `SPEC-003` Phase 2（8 项登记）/ C. `SPEC-001` Phase 2（风险最高）。⚠️ 三者都动 `app.js` ⇒ **必须串行**（`ENV-02`）。'],
    ['- **Feature 生命周期**：',
     '- **Feature 生命周期**：`SPEC-001` / `SPEC-017` / **`SPEC-003`** = **`IMPLEMENTED`（Phase 1）**；**`SPEC-004` = `CLARIFIED`**（仅 `spec.md`）；`SPEC-002` / `SPEC-005~016`（**13 个**）= IDEA。**Feature 内部编号 `US/SC/FR/EX/DA-0xx-xx` 不进入全局体系**；⚠️ `SC-001-xx` **≠** `scenarios.md` 的 `SC-01~08`。'],
    ['- **已落地 Feature（Phase 1）**：',
     '- **已落地 Feature（Phase 1）**：`SPEC-001`（准入判定 / 年龄闸门 / 委托化 `isCredentialMet` / 审计留痕）· `SPEC-017`（内容资产层，「**只存一份、多处引用、归零才收**」）· **`SPEC-003`**（学职引擎 10 契约 + 资源库 5 入口；**修复 4 处缺陷**）。**三者的 Phase 2 均未启动。**'],
    ['- **门禁现状**：',
     '- **门禁现状**：L1 **7 ERROR（= 基线）** / **DUP `520` 键 0 重复** / L2 6/6 / MX 通过 / **L3 `2,343` 项（13 套全绿，红灯 0）** / 断言合计 **`2,869/2,870`** / 总判定通过 / exit 0 / **3 次一致**。基线：`l3ExpectedRed: []`、`l3AssertionTotal: 2343`、`l3Suites: 13`。⚠️ **三套转绿套件（`identity-admission` 53 / `content-asset` 73 / `growth-academy` 87）是回归防线，不得删。**'],
    ['- **`CHG-020`**（2026-09-25）= `SPEC-003` 的**立红 + `PLAN` + `TASKS`**',
     '- **`CHG-020`**（2026-09-25）= `SPEC-003` 的立红 + `PLAN` + `TASKS`（`TASKED`）：新建 `wb-growth-academy-verify.js`（10 契约 / 77 断言，**真实进度 0/77**）+ 四件。**立红另测出 4 处缺陷**：积分双写（`points` 与 `learningPoints`）/ **`progress` 与课节数不符** / `studyLog` 4 条被旧 `+50` 全污染 / 二级页显隐**两份内联清单不一致**。\n- **`CHG-021`**（2026-09-25）= **`SPEC-003` Phase 1 的 `IMPLEMENT`**（`TASKED` → **`IMPLEMENTED`（Phase 1）**）：**31 项全部落地，红灯 0/77 → 77/77**（+ 不变量 10/10）；修复 4 处缺陷 + 立红新测出的 4 处；`index.html` **1 处改动**、`css` **零改动**。⚠️ **新增 `RISK-003-08`：口径收敛导致依赖旧口径的既有套件断言失效**（`wb-academy-path-verify` 7 项）⇒ 同步期望（**非放宽标准**）⇒ **受影响文件清单必须包含「断言侧」**（`PITFALLS-ARCHIVE.md` §O）。'],
    // ---------- 删除已并入上行的旧行 ----------
    ['- **内容资产层（`SPEC-017` Phase 1 ✅，`CHG-017`）**：', null],
  ];

  let hit = 0, del = 0; const miss = [];
  const out = [];
  L.forEach((l) => {
    for (let i = 0; i < rules.length; i++) {
      if (l.startsWith(rules[i][0])) {
        hit++;
        if (rules[i][1] === null) { del++; return; }
        out.push(rules[i][1]);
        return;
      }
    }
    out.push(l);
  });
  rules.forEach((r) => { if (!snap.some((l) => l.startsWith(r[0]))) miss.push(r[0].slice(0, 24)); });
  fs.writeFileSync(P, out.join('\n'));
  const after = Buffer.byteLength(fs.readFileSync(P, 'utf8'), 'utf8');
  console.log('MEMORY.md → ' + hit + '/' + rules.length + '（删 ' + del + '）｜字节 ' + before + ' → ' + after + (after <= 16384 ? ' ✅ 余 ' + (16384 - after) + ' B' : ' ⚠️ 超 ' + (after - 16384) + ' B') + (miss.length ? '｜未命中：' + miss.join(' ; ') : ''));
})();
