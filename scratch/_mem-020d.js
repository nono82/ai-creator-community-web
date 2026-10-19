'use strict';
/** MEMORY.md 第四轮回压（目标 ≤ 16384 B）。 */
const fs = require('fs');
const P = '.workbuddy/memory/MEMORY.md';
const L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
const snap = L.slice();
const before = Buffer.byteLength(fs.readFileSync(P, 'utf8'), 'utf8');

const rules = [
  ['- **正式事实来源**：',
   '- **正式事实来源**：`project-design/` / `specs/` / `.specify/` / 根级 md。`ai-creator-community-wh|fjc/` 仅历史归档，**不在其下改设计**。'],
  ['- **双轨积分**：',
   '- **双轨积分**：AI 积分（算力池 · 消费型 · **不定级**）⟷ 创作积分（成长池 · 只增不减）。**账户 / 账本 / 状态机严格分离**。AI 积分**唯一拆分维度 = 算力来源**，禁跨源。'],
  ['- **提现四道闸（顺序即契约）**：',
   '- **提现四道闸（顺序即契约）**：实名 → 同名借记卡 → 单笔 ≤ ¥10,000 → 金额 ≤ 创作收益；+ 24h 出金看门狗。'],
  ['- **合规红线**：',
   '- **合规红线**：绝不二清；绝不无证代征个税；保证金专户隔离；扣罚 / 没收须人工或合议庭裁决前置。'],
  ['- **原型约束**：',
   '- **原型约束**：单入口 `index.html`（**禁整文件重写**）；全局对象仅 `App` / `MockData` / `ChartEngine` / `Icons`（**禁第五个**）；`css/style.css` 走 `:root`；命名即契约。'],
  ['- 🔑 **引用编号前必须回查该编号的定义**',
   '- 🔑 **引用编号前必须回查其定义**（曾把缺陷误标为 `Q-021`，实为「保证金冻结比例」）。'],
  ['- **`SPEC-001` 规模**：',
   '- **`SPEC-001` 规模**：12 US / 22 SC / **58 FR（7 组）** / 16 EX / 10 DA（含 **G.1 权限矩阵 13×5**）；`CHECKLIST` 通过 10。**`tasks.md`：Phase 1 24 项 ✅ + Phase 2 12 项登记**。'],
  ['- **`SPEC-017` 规模**：',
   '- **`SPEC-017` 规模**：11 US / **16 SC** / **45 FR（7 组）** / 18 EX / 9 DA。核心命题「**只存一份、多处引用、归零才收**」。**Phase 1 = 26 项 ✅ / Phase 2 = 10 项登记**。'],
  ['- 🔑 **降风险策略（`SPEC-017` 与 `SPEC-003` 同族）**：',
   '- 🔑 **降风险策略（`SPEC-017` / `SPEC-003` 同族）**：**「只加字段、不改既有字段、不改既有渲染」** ⇒ `CHG-017` 实测**既有绿灯零新失败 + `index.html`/`css` 零改动**；`SPEC-003` 沿用为「**只加方法 + 旧路径转调 + 只改 3 个数据字段值**」。详见 `DESIGN-METHOD.md` §三 / `PITFALLS-ARCHIVE.md` §L。'],
];

let hit = 0, miss = [];
rules.forEach(function (pair) {
  const k = snap.findIndex(function (l) { return l.startsWith(pair[0]); });
  if (k >= 0) { L[k] = pair[1]; hit++; } else miss.push(pair[0].slice(0, 24));
});
fs.writeFileSync(P, L.join('\n'));
const after = Buffer.byteLength(fs.readFileSync(P, 'utf8'), 'utf8');
console.log('替换 ' + hit + '/' + rules.length + '｜字节 ' + before + ' → ' + after + (after <= 16384 ? ' ✅ 余 ' + (16384 - after) + ' B' : ' ⚠️ 超 ' + (after - 16384) + ' B') + (miss.length ? '｜未命中：' + miss.join(' ; ') : ''));
