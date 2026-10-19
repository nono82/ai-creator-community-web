'use strict';
/** CHG-022 收尾：追加当日日志 + 更新两个归档文件。 */
const fs = require('fs');

// ① 追加当日日志
(function () {
  const P = '.workbuddy/memory/2026-09-25.md';
  const add = fs.readFileSync('ai-creator-community-wh/scratch/_log-022.md', 'utf8');
  const before = Buffer.byteLength(fs.readFileSync(P, 'utf8'), 'utf8');
  fs.appendFileSync(P, add);
  const after = Buffer.byteLength(fs.readFileSync(P, 'utf8'), 'utf8');
  console.log('日志：' + before + ' → ' + after + ' B');
})();

// ② PITFALLS-ARCHIVE：追加 §R（批量编辑脚本的三个坑）
(function () {
  const P = '.workbuddy/memory/PITFALLS-ARCHIVE.md';
  let s = fs.readFileSync(P, 'utf8');
  if (s.includes('## §R')) { console.log('PITFALLS-ARCHIVE：已有 §R，跳过'); return; }
  const sec = [
    '',
    '## §R · 批量编辑脚本的三个坑（`CHG-022` 实测，含两次 SyntaxError）',
    '',
    '### R.1 多行字符串 / heredoc 引号 —— **先 Write，再读入**',
    '',
    '- `cat > x.js << \'SCRIPT\'` 里写**跨行字符串字面量**（未闭合的单引号）⇒ `SyntaxError: missing ) after argument list` / `Invalid or unexpected token`；',
    '- **不要**试图用模板字符串（反引号）绕开：内容里若含 Markdown 反引号会提前结束字符串；',
    '- ✅ **做法**：含大量中文 / 换行 / 引号的内容（如文档段落、CHANGELOG 条目）**一律先用 `Write` 工具写到独立文件**，再由脚本 `readFileSync` 读入并 splice；',
    '- ⚠️ 本坑在 `CHG-020` 已踩过，`CHG-022` 又踩两次 ⇒ **已属高频，务必遵守**。',
    '',
    '### R.2 重名检查必须**按父段分组**，不能只看缩进',
    '',
    '- 我写"缩进 2 空格的键出现两次即重复"的检查 ⇒ **误报** `requirements` / `business`；',
    '- 实为**跨父段重名**：`source_of_truth.requirements` vs `counts.requirements`；`modules.business` vs `source_of_truth.business`；',
    '- ✅ **做法**：先找**缩进 0 的父键**，再在父段内比较子键。',
    '',
    '### R.3 命中检查必须基于**替换前快照**',
    '',
    '- `patch()` 类脚本若在替换**之后**再检查"是否命中"，会把已被替换掉的行判为"未命中"；',
    '- ✅ **做法**：`const snap = L.slice();` 在前，所有 `findIndex` 都查 `snap`。',
    '',
  ].join('\n');
  fs.appendFileSync(P, sec);
  const after = Buffer.byteLength(fs.readFileSync(P, 'utf8'), 'utf8');
  console.log('PITFALLS-ARCHIVE：已追加 §R｜字节 ' + after);
})();

// ③ DESIGN-METHOD：§三 补一条「两阶段迁移在本项目的第 3 次应用」
(function () {
  const P = '.workbuddy/memory/DESIGN-METHOD.md';
  let s = fs.readFileSync(P, 'utf8');
  if (s.includes('两阶段迁移在本项目的第 3 次应用')) { console.log('DESIGN-METHOD：已存在，跳过'); return; }
  const anchor = '## 归档记录';
  if (!s.includes(anchor)) { console.log('DESIGN-METHOD：未找到归档记录锚点'); return; }
  const sec = [
    '### §三补 · 「降回归风险」的三种同族手法（本项目已各用多次）',
    '',
    '| 手法 | 首次 | 复用 |',
    '| :--- | :--- | :--- |',
    '| **只加字段、不改既有字段、不改既有渲染** | `SPEC-017`（`CHG-017`） | `SPEC-003`（`CHG-021`）、`SPEC-004`（`CHG-022`，用于 `allTools` / 工具箱 / 榜单） |',
    '| **只加方法 + 旧路径转调（兼容壳）** | `SPEC-003` 的 `completeLesson`（`CHG-021`） | `SPEC-004` 的 Phase 2 计划（`#modal-studio` 降级为转调新方法） |',
    '| **两阶段迁移：先建壳、后迁内** | `SPEC-004` 由 `Q-049` 定稿（`CHG-019` 澄清 / `CHG-022` 落地为 Plan） | —— |',
    '',
    '🔑 **统一判据**：**当「需同时正确的改动点数 >> 1」时，就把风险切到批次边界上。**',
    '（`SPEC-004` 的实测：`#modal-studio` 绑定 **10 处**、`simulateGenerate` 依赖 **8 个 DOM id** ⇒ 一次性迁移风险高。）',
    '',
    '🔑 **配套要求**：分期必须配 **"避免清单"**（明确写出"本次不许动什么"）—— `SPEC-004` 的 `plan.md` §17.2 列了 **6 项硬禁止**。**光说"做什么"不够，还要说"不做什么"。**',
    '',
  ].join('\n');
  s = s.replace(anchor, sec + anchor);
  fs.writeFileSync(P, s);
  console.log('DESIGN-METHOD：已追加 §三补｜字节 ' + Buffer.byteLength(s, 'utf8'));
})();
