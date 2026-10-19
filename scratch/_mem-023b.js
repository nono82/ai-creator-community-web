'use strict';
/** MEMORY.md 微压：精简 CHG-022 行（细节已在 change-impact / PITFALLS / 日志中）。 */
const fs = require('fs');
const P = '.workbuddy/memory/MEMORY.md';
let L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
const b = Buffer.byteLength(L.join('\n'), 'utf8');
const i = L.findIndex(function (l) { return l.startsWith('- **`CHG-022`**（2026-09-25）='); });
if (i < 0) { console.log('未找到 CHG-022 行'); process.exit(0); }
L[i] = '- **`CHG-022`**（2026-09-25）= `SPEC-004` 的立红 + `PLAN` + `TASKS`：新建 `wb-creator-tools-verify.js`（**17 契约 / 126 断言**）+ 四件。**立红另测出 6 处缺口**（扣分是"成功后扣"非"预扣" / 扣减硬编码 `self` / 余额不足静默放行 / 模型与画幅控件无 `id` / 工具箱与榜单无 `id` / 弹窗段大量内联样式）。**`research.md` R2 = 第 4 次「负向动作保护」类比**（资金 → 身份 → 内容 → **算力**）。';
// CHG-023 行也略压
const j = L.findIndex(function (l) { return l.startsWith('- **`CHG-023`**（2026-09-25）='); });
if (j >= 0) {
  L[j] = '- **`CHG-023`**（2026-09-25）= `SPEC-004` Phase 1 的 `IMPLEMENT`：**31 项全落地，`4/126` → `126/126`**（+ 不变量 14/14）；基线上调 2343 → **2483**、**L1 由 7 → 5 ERROR（下调）**、DUP 520 → **550**。🔴 **Phase 1 硬约束完全满足**（`#modal-studio` 仅加 2 个 `id`、5 个既有方法**逐字一致** —— 冒烟 P0 直接比文本）。⚠️ **一处对既有防线的修改**：`smoke-test.js` 的 L2-2 引入**二级页面白名单**（**只放宽 `nav` 一半**）—— **门禁"逼"出的显式演进**。**新增 `RISK-004-10`：断言与被调方法的签名不匹配是一类独立风险**（`PITFALLS-ARCHIVE.md` §S）。';
}
fs.writeFileSync(P, L.join('\n'));
const a = Buffer.byteLength(L.join('\n'), 'utf8');
console.log('MEMORY.md：' + b + ' → ' + a + (a <= 16384 ? ' ✅ 在 16KB 内' : ' ⚠️ 超 ' + (a - 16384) + ' B'));
