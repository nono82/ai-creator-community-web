'use strict';
/** MEMORY.md 第三轮回压（目标 ≤ 16384 B）。 */
const fs = require('fs');
const P = '.workbuddy/memory/MEMORY.md';
const L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
const snap = L.slice();
const before = Buffer.byteLength(fs.readFileSync(P, 'utf8'), 'utf8');

const rules = [
  ['- **等级**（`Q-003` · 取 fjc）：',
   '- **等级**（`Q-003` · 取 fjc）：阈值 `0 / 200 / 500 / 2,000 / 5,000`；命名「体验者 / 进阶者 / 内容创作者 / 商业创作者 / OPC 创业者」；由**累计创作积分**（只增不减）定级，**可配置**。**费率**（`Q-004`）`Lv.3 8%` / `Lv.4 3%` / **`Pro <3%`** / `Lv.5 协商`，禁硬编码。⚠️ `fjc/design/成长学院设计.md` §17 实为 **wh 副本**。'],
  ['- **资金托管（`Q-019`）**：',
   '- **资金托管（`Q-019`）**：微信支付**「平台收付通」**（二级商户）为主，支付宝直付通备份，**不用普通分账**（7 项硬约束 → 归档 §K.1）。'],
  ['- **灵活用工（`Q-020`）**：',
   '- **灵活用工（`Q-020`）**：**不引入**（`ASM-011`）⇒ 缺口转 `Q-035` 候选 A（→ 归档 §K.2）。'],
  ['- **Feature 编号**：',
   '- **Feature 编号**：`SPEC-001~017`（见 `05-feature-map.md`）。MVP 关键路径：**001 → 003 → 004 → 006 → 008 → 009**。'],
  ['- 🔴 **`l3ExpectedRed`「已登记红灯」**：',
   '- 🔴 **`l3ExpectedRed`「已登记红灯」**：契约冻结、实现未开始 ⇒ 计 **`RED`**（**不阻断 / 不计入断言合计 / 单独报进度 / 转绿提示移除**）。**为什么不判 FAIL：判 FAIL 则总判定永远失败 ⇒ 团队忽略门禁，比没有门禁更糟。**'],
  ['**设计方法** → 📂 **完整内容见同目录 `DESIGN-METHOD.md`**',
   '**设计方法** → 📂 同目录 `DESIGN-METHOD.md`（`SPECIFY` / `CHECKLIST` / `PLAN` / `TASKS` / `IMPLEMENT` + **§七 立红加固手法与顺序陷阱**）。'],
  ['> **何时读**：开始某个 Feature 的任一带阶段**之前**。', null],
  ['- **工程债**：',
   '- **工程债**：`Q-028` / `Q-030` / `Q-029`（半边）✅；**`Q-036` = 「已接受为已知偏差」**（风险**部分缓解**：准入守卫已就位，**字段对齐仍未做** ⇒ 归 `SPEC-006`）。**`FU-007`** = `PARTIAL_DONE`。'],
  ['- **门禁现状**：',
   '- **门禁现状**：L1 **7 ERROR（= 基线）** / **DUP `492` 键 0 重复** / L2 6/6 / MX 通过 / **L3 `2,256` 项（12 套全绿）+ 🔴 1 套已登记红灯**（`wb-growth-academy-verify`，**0/77**）/ 断言合计 **`2,754/2,755`**（**不含**红灯）/ 总判定通过 / exit 0 / **3 次一致**。基线：`l3ExpectedRed: ["wb-growth-academy-verify"]`、`l3AssertionTotal: 2256`、`l3Suites: 12`。⚠️ **转绿套件（`identity-admission` 53 / `content-asset` 73）是回归防线，不得删。**'],
  ['- **`CHG-020`**（2026-09-25）= `SPEC-003` 的**立红 + `PLAN` + `TASKS`**',
   '- **`CHG-020`**（2026-09-25）= `SPEC-003` 的**立红 + `PLAN` + `TASKS`**（工序第 3 次；**`SPEC-003` → `TASKED`**）：新建 `tools/wb-growth-academy-verify.js`（10 契约 / **77 功能断言** / 10 不变量，**真实进度 0/77**）+ 四件（`plan`/`tasks`/`data-model`/`research`）。**立红新增 4 处实测缺陷**：积分双写（`points` 与 `learningPoints` 并存）· **`progress` 与课节数不符**（P3 = 45 vs 40%）· `studyLog` 4 条流水被旧 `+50` 全污染 · 二级页显隐**两份内联清单不一致**（`app.js:8302` 5 个 / `11417` 6 个）。⚠️ 修正 `spec.md` §7.4 事实错误：`claimable` **已存在 1 条**（非"缺失"），真问题是**无驱动机制**。'],
];

let hit = 0, del = 0;
const out = [];
L.forEach(function (l) {
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
fs.writeFileSync(P, out.join('\n'));
const after = Buffer.byteLength(fs.readFileSync(P, 'utf8'), 'utf8');
console.log('替换 ' + hit + '/' + rules.length + '（删 ' + del + ' 行）｜字节 ' + before + ' → ' + after + (after <= 16384 ? ' ✅ 余 ' + (16384 - after) + ' B' : ' ⚠️ 超 ' + (after - 16384) + ' B'));
