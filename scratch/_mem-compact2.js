'use strict';
const fs = require('fs');
const P = '.workbuddy/memory/MEMORY.md';
const before = fs.readFileSync(P, 'utf8').length;
let L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
const rules = [
  ['- 🔴 **年龄与核验红线',
    '- 🔴 **年龄与核验红线（`Q-038`）**：**未满 18 周岁不得注册**（实名核验须**含年龄判定**，以证件出生日期为准；拒绝时**不创建账号、不落中间态**）⇒ 未成年人**天然不满足**接单 / 发包 / 提现 / 收款的实名前置，**无须为其单设闸门**。⚠️ **不引入人脸活体**；`NFR-005` 重点转为「判定准确 / 防规避 / 申诉」。'],
  ['  ⚠️ 代价已记录：', null],
  ['- **等级**（`Q-003`',
    '- **等级**（`Q-003` · 取 fjc）：阈值 `0 / 200 / 500 / 2,000 / 5,000`；命名「体验者 / 进阶者 / 内容创作者 / 商业创作者 / OPC 创业者」；由**累计创作积分**（只增不减）定级，阈值可配置。**费率**（`Q-004`）`Lv.3 8%` / `Lv.4 3%` / **`Pro 严格 <3%`** / `Lv.5 协商`，禁硬编码。⚠️ `fjc/design/成长学院设计.md` §17 实为 **wh 副本**。'],
  ['- **仍未决**：',
    '- **仍未决**：**`Q-043` 剩余两处（**窗口时长** + **注销后处置**，与 `Q-041` 合并取法务口径）** / **`Q-041`（留存期限 / 释放；合规参数不得伪造）** / `Q-044`（配额计费）/ `Q-045`（版权确权 —— **Feature Map 缺口**）/ `Q-037` / `Q-039`（**未预设数值**）/ `Q-040` / `Q-007~010` / `Q-013~018`（规模）/ `Q-021~027`（资金）。'],
];
let hit = 0, del = 0;
const out = [];
L.forEach((l) => {
  for (const [pre, rep] of rules) {
    if (l.startsWith(pre)) { hit++; if (rep === null) { del++; return; } out.push(rep); return; }
  }
  out.push(l);
});
fs.writeFileSync(P, out.join('\n'));
console.log('命中', hit, '/', rules.length, '｜删除', del, '行｜字符', before, '→', fs.readFileSync(P, 'utf8').length);
