'use strict';
/** MEMORY.md 三次压缩：针对最长的 4 行（细节均已入归档文件）。 */
const fs = require('fs');
const P = '.workbuddy/memory/MEMORY.md';
let L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
const before = Buffer.byteLength(L.join('\n'), 'utf8');
const snap = L.slice();
let hit = 0;
const miss = [];
function rep(pre, to, label) {
  const i = snap.findIndex(function (l) { return l.startsWith(pre); });
  if (i >= 0) { L[i] = to; hit++; } else miss.push(label);
}

rep('- **成长学院 / 创作工具**：',
  '- **成长学院 / 创作工具**：**等级口径取 `Q-003` 裁决值**（`0/200/500/2000/5000`，命名**无 `AI` 前缀**）；**加分唯一入口** `awardLearningPoints`（课节 +30 / 心得 +5 / 教材 +5 / 领证 +100）；**AI 工具详情页 = 路由级页面**；资产一律走 `SPEC-017`。**`SPEC-004` 另冻结**：`integration` 三值 · **生成两阶段计费**（预扣 → 落盘 → 退还）· **`computeSource` 由 `integration` 派生**。',
  '成长学院/创作工具');

rep('- 🔑🔴 **提防「平凡通过」**（**最危险的一类**）：',
  '- 🔑🔴 **提防「平凡通过」**（**最危险的一类**）：未实现时"什么都没做"会让"某状态不得变化 / A 等于 A"型断言**通过** ⇒ ① **不变量断言分两类计数、不计入进度**；② **必须补「前置非空」**。实测：`CHG-020` 首跑 12/77 全是平凡通过 ⇒ 0/77；**`CHG-022` 首跑 20/129 有 13 项 ⇒ 4/126**。**三类成因**：字段全缺（"非法 0 项"必然成立）/ DOM 桩默认值 / **容器为空 ⇒ `0 === 0`**。⚠️ **"通过项"本身就是缺陷的藏身处** —— `CHG-022` 的 `fresh()` 未重置 `classList`/`value` ⇒ 跨组污染。手法见 `DESIGN-METHOD.md` §7.3。',
  '平凡通过');

rep('- **`CHG-022`**（2026-09-25）=',
  '- **`CHG-022`**（2026-09-25）= `SPEC-004` 的立红 + `PLAN` + `TASKS`：新建 `wb-creator-tools-verify.js`（**17 契约 / 126 断言**，真实进度 **4/126**，新增能力 **0/126**）+ 四件（604 / 239 / 255 / 207 行）。**立红另测出 6 处缺口**（**扣分是"成功后扣"非"预扣"** / **扣减硬编码 `self`** / **余额不足静默放行** / 模型与画幅控件无 `id` / 工具箱与榜单无 `id` / 弹窗段大量内联样式）。**`research.md` R2 = 第 4 次「负向动作保护」类比**（资金 → 身份 → 内容 → **算力**）⇒ **「预扣 + 全额退还」是同构要求**。⚠️ 修 3 处存量缺陷（`workspace-state` 重复键 `clarified` / `registered` 误留已转绿套件 / `design-status` §十 缺两行）。',
  'CHG-022');

rep('- 🔴 **产出证据要过两道坎**：',
  '- 🔴 **产出证据要过两道坎**：① 断言**写对**；② **套件输出格式须匹配门禁正则**（**绿套** `✓ 全部通过：N 项断言`；**红灯** 末行 ` 通过：x/y 项功能断言`）。**同一问题已踩坑两次**（`CHG-017` 漏绿套 / `CHG-020` 漏红灯）。详情见 `PITFALLS-ARCHIVE.md` §M。',
  '产出证据');

fs.writeFileSync(P, L.join('\n'));
const after = Buffer.byteLength(L.join('\n'), 'utf8');
console.log('MEMORY.md 三次压缩：替换 ' + hit + '/4｜' + before + ' → ' + after + (after <= 16384 ? ' ✅ 在 16KB 内' : ' ⚠️ 超 ' + (after - 16384) + ' B'));
if (miss.length) console.log('未命中：' + miss.join(' ; '));
