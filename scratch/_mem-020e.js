'use strict';
/** MEMORY.md 第五轮回压：合并已落地 Feature 的冗余行 + 合并 CHG 记录。 */
const fs = require('fs');
const P = '.workbuddy/memory/MEMORY.md';
const L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
const snap = L.slice();
const before = Buffer.byteLength(fs.readFileSync(P, 'utf8'), 'utf8');

const rules = [
  // ① SPEC-001 规模 → 改为「已落地两 Feature 的合并行」
  ['- **`SPEC-001` 规模**：',
   '- **已落地 Feature（Phase 1）**：`SPEC-001` 12 US / 22 SC / **58 FR（7 组）** / 16 EX / 10 DA（含**权限矩阵 13×5**）—— 能力 = `checkAdmission` / `evaluateAgeGate` / 3 守卫 / 委托化 `isCredentialMet` / 审计留痕；**`SPEC-017`** 11 US / 16 SC / **45 FR（7 组）** / 18 EX / 9 DA —— 核心命题「**只存一份、多处引用、归零才收**」。**二者的 Phase 2 均未启动。**'],
  // ② 删除 SPEC-001 进度行（已并入上行）
  ['- **`SPEC-001` 进度**：', null],
  // ③ 删除独立 SPEC-017 规模行（已并入 ①）
  ['- **`SPEC-017` 规模**：', null],
  // ④ CHG-017 → 合并 CHG-017 + CHG-018
  ['- **`CHG-017`**（2026-09-25）',
   '- **`CHG-017` / `CHG-018`**（2026-09-25）= ① `SPEC-017` Phase 1 落地（内容资产层 + 四处接线 + 冒烟 28 项 + 基线上调 `2183 → 2256`、DUP `480 → 492`）；② `SPEC-003` / `SPEC-004` 的 `SPECIFY`（同日两份规格；固化 **7 处**缺陷；新开 `Q-046` ~ `Q-051`）。**教训：受影响文件清单里不写"（如需）"。**⚠️ `change-impact.md` 条目顺序**不统一**（`001~009` 升序 / `010~020` 降序）⇒ 建议整理。'],
  // ⑤ 删除 CHG-018 行（已并入 ④）
  ['- **`CHG-018`**（2026-09-25）', null],
];

let hit = 0, del = 0, miss = [];
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
rules.forEach(function (r) { if (!snap.some(function (l) { return l.startsWith(r[0]); })) miss.push(r[0].slice(0, 22)); });
fs.writeFileSync(P, out.join('\n'));
const after = Buffer.byteLength(fs.readFileSync(P, 'utf8'), 'utf8');
console.log('替换 ' + hit + '/' + rules.length + '（删 ' + del + ' 行）｜字节 ' + before + ' → ' + after + (after <= 16384 ? ' ✅ 余 ' + (16384 - after) + ' B' : ' ⚠️ 超 ' + (after - 16384) + ' B') + (miss.length ? '｜未命中：' + miss.join(' ; ') : ''));
