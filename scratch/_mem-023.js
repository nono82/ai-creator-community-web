'use strict';
/** CHG-023 收尾：追加日志 + 更新归档（PITFALLS §S）+ MEMORY.md。 */
const fs = require('fs');

// ① 日志
(function () {
  const P = '.workbuddy/memory/2026-09-25.md';
  const add = fs.readFileSync('ai-creator-community-wh/scratch/_log-023.md', 'utf8');
  const b = Buffer.byteLength(fs.readFileSync(P, 'utf8'), 'utf8');
  fs.appendFileSync(P, add);
  console.log('日志：' + b + ' → ' + Buffer.byteLength(fs.readFileSync(P, 'utf8'), 'utf8') + ' B');
})();

// ② PITFALLS-ARCHIVE：§S
(function () {
  const P = '.workbuddy/memory/PITFALLS-ARCHIVE.md';
  let s = fs.readFileSync(P, 'utf8');
  if (s.includes('## §S')) { console.log('PITFALLS：已有 §S，跳过'); return; }
  const sec = [
    '',
    '## §S · 「断言签名不匹配」—— 一类独立风险（`RISK-004-10`，`CHG-023` 实测）',
    '',
    '### 症状',
    '',
    '套件里的断言**语义写对了**，但**调用了错误的方法签名** ⇒ 它**静默地变成另一个断言**，且"通过/失败"都**看似合理**。',
    '',
    '实测案例：`App.getAssetRefs(objectKey)` **只接受一个参数**（无 `refType`）。',
    '- 原写法：`getAssetRefs(key, \'post\').length === 1`',
    '- 实际语义：第二参被忽略 ⇒ 返回**全部**引用 ⇒ 断言变成「**总引用数 === 1**」',
    '- 后果：生成 + 交付两步后总数为 2 ⇒ **断言失败**，但失败原因**看起来像实现缺陷**（而实现是对的）',
    '',
    '### 判据 / 手法',
    '',
    '- 🔑 **写套件前必须先读被调方法的签名**（与既有铁律「**引用编号前必须回查其定义**」**同族**）；',
    '- ✅ 修正方式：套件侧引入按类型过滤的辅助（`refsByType(app, key, refType)`），**不改被测代码的签名**；',
    '- ⚠️ **同类家族**：`Object.keys(array)`（索引数组）恰好"能用"；`objCount` 对数组与对象都能算 —— 这类"**巧合可用**"最危险。',
    '',
    '### 同轮的第二处（状态机"来源态"漏列）',
    '',
    '- `failGenerate` / `refundGenerate` 原先只接受 `state === \'issued\'`，而**落盘后状态为 `settled`** ⇒ **失败路径永远走不通**；',
    '- 🔑 **教训：设计状态机时，"可进入某出口的来源态"必须列全** —— 不能只想到"正常路径上的那一个"。',
    '- ⚠️ 这类缺陷**只有真跑该路径才会暴露**（静态看代码"逻辑通顺"）。',
    '',
    '### 第三处（断言强度 vs 声称语义）',
    '',
    '- 冒烟把 `#modal-studio` 段要求「**逐字一致**」，但本 Feature **有意**加了 2 个 `id` 属性；',
    '- 🔑 **断言的强度必须与其声称的语义对齐** —— 要表达的是"**除有意改动外未变**"，就不该写成"逐字一致"。',
    '',
  ].join('\n');
  fs.appendFileSync(P, sec);
  console.log('PITFALLS-ARCHIVE：已追加 §S｜字节 ' + Buffer.byteLength(fs.readFileSync(P, 'utf8'), 'utf8'));
})();

// ③ MEMORY.md：状态更新（受控净增）
(function () {
  const P = '.workbuddy/memory/MEMORY.md';
  let L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
  const b = Buffer.byteLength(L.join('\n'), 'utf8');
  const snap = L.slice();
  let hit = 0; const miss = [];
  function rep(pre, to, label) {
    const i = snap.findIndex(function (l) { return l.startsWith(pre); });
    if (i >= 0) { L[i] = to; hit++; } else miss.push(label);
  }
  rep('- 工作方式：', '- 工作方式：**`AGENTS.md` 为唯一准则**（Spec-Driven Development）。**工序 =「契约先行 → 立红 → `PLAN` → `TASKS` → 最小实现 → 回填收敛」** —— 已在 **`SPEC-001` / `SPEC-017` / `SPEC-003` / `SPEC-004` 四次**完整走通。**四者均 = `IMPLEMENTED`（Phase 1）**；其余 13 个 = `IDEA`（**不预生成**）。', '工作方式');
  rep('- **有效阻塞 = 0 项**；**当前阶段', '- **有效阻塞 = 0 项**；**当前阶段 = `IMPLEMENT`（四 Feature 的 Phase 1 均已落地）** ⇒ **下一步二选一**：A. 按 `specs/README.md` §4 推进**新批次**（`SPEC-005` / `SPEC-006` / `SPEC-007` …）/ B. 任一 Feature 的 **Phase 2**（`001` 12 / `017` 10 / `003` 8 / `004` 5 项）。⚠️ 全部动 `app.js` ⇒ **必须串行**（`ENV-02`）。', '当前阶段');
  rep('- **Feature 生命周期**：', '- **Feature 生命周期**：`SPEC-001` / `SPEC-017` / `SPEC-003` / **`SPEC-004`** = **`IMPLEMENTED`（Phase 1）**；其余 **13 个** = IDEA。**Feature 内部编号 `US/SC/FR/EX/DA-0xx-xx` 不进入全局体系**。', 'Feature 生命周期');
  rep('- **已落地 Feature（Phase 1）**：', '- **已落地 Feature（Phase 1）**：`SPEC-001`（准入 / 年龄闸门 / 委托化 / 审计）· `SPEC-017`（内容资产层「**只存一份、多处引用、归零才收**」）· `SPEC-003`（学职引擎 10 契约 + 资源库）· **`SPEC-004`**（集成模式三值 + 卡片统一路由 + **路由级详情页** + **生成两阶段计费（预扣 / 落盘 / 全额退还）** + 模板套用 + 历史草稿）。**四者 Phase 2 均未启动。**', '已落地 Feature');
  rep('- **门禁现状**：', '- **门禁现状**：L1 **5 ERROR（= 基线；`CHG-023` 由 7 下调）** / **DUP `550` 键 0 重复** / L2 **6/6** / MX 通过 / **L3 `14` 套全绿 `2,483`** / 断言合计 **`3,039/3,040`** / 总判定通过 / exit 0 / **3 次一致**。基线：`l3ExpectedRed: []`、`l3AssertionTotal: 2483`。⚠️ **四套白盒（`identity` 53 / `content-asset` 73 / `growth-academy` 87 / `creator-tools` 140）是回归防线，不得删。**', '门禁现状');
  rep('- **`CHG-022`**（2026-09-25）=', '- **`CHG-022`**（2026-09-25）= `SPEC-004` 的立红 + `PLAN` + `TASKS`：新建 `wb-creator-tools-verify.js`（**17 契约 / 126 断言**）+ 四件。**立红另测出 6 处缺口**（**扣分是"成功后扣"非"预扣"** / **扣减硬编码 `self`** / **余额不足静默放行** / 模型与画幅控件无 `id` / 工具箱与榜单无 `id` / 弹窗段大量内联样式）。**`research.md` R2 = 第 4 次「负向动作保护」类比**（资金 → 身份 → 内容 → **算力**）。\n- **`CHG-023`**（2026-09-25）= `SPEC-004` Phase 1 的 `IMPLEMENT`：**31 项全落地，`4/126` → `126/126`**（+ 不变量 14/14）；基线上调 2343 → **2483**、**L1 由 7 → 5 ERROR（下调）**、DUP 520 → **550**。🔴 **Phase 1 硬约束完全满足**（`#modal-studio` 仅加 2 个 `id`、5 个既有方法**逐字一致** —— 冒烟 P0 直接比文本）。⚠️ **一处对既有防线的修改**：`smoke-test.js` 的 L2-2 引入**二级页面白名单**（**只放宽 `nav` 一半**）—— **门禁"逼"出的显式演进**。**新增 `RISK-004-10`：套件断言与被调方法的签名不匹配是一类独立风险**（`PITFALLS-ARCHIVE.md` §S）。', 'CHG-022/023');
  fs.writeFileSync(P, L.join('\n'));
  const a = Buffer.byteLength(L.join('\n'), 'utf8');
  console.log('MEMORY.md：替换 ' + hit + '/6｜' + b + ' → ' + a + (a <= 16384 ? ' ✅ 在 16KB 内' : ' ⚠️ 超 ' + (a - 16384) + ' B') + (miss.length ? '｜未命中：' + miss.join(' ; ') : ''));
})();
