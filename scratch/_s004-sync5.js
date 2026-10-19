'use strict';
/** CHG-022 同步第 5 批：tools/README.md。 */
const fs = require('fs');
const P = 'tools/README.md';
let s = fs.readFileSync(P, 'utf8');
const before = Buffer.byteLength(s, 'utf8');
let hit = 0;
const miss = [];

function sub(a, b, label) {
  if (!s.includes(a)) { miss.push(label); return; }
  const c = s.split(a).length - 1;
  s = s.split(a).join(b);
  hit += c;
}

// ① 顶部红灯段
sub('> ✅ **L3 当前 13 套全部全绿（2,343 项），红灯 0**（`gates-baseline.json` 的 `l3ExpectedRed: []`）。',
  '> 🔴 **L3 当前 14 套 = 13 套全绿（2,343 项）+ 1 套「已登记红灯」**（`gates-baseline.json` 的 `l3ExpectedRed: ["wb-creator-tools-verify"]`）。',
  '顶部红灯段');

// ② L3 行
sub('| **L3** 业务闭环 | 按状态机逐状态走查 | **`wb-*-verify.js` × 13 套** | ✅ 在线（**13 套全绿 = 2,343 项断言**）；**红灯 0**（`l3ExpectedRed: []`，CHG-021） |',
  '| **L3** 业务闭环 | 按状态机逐状态走查 | **`wb-*-verify.js` × 14 套** | ✅ 在线（**13 套全绿 = 2,343 项断言**）；🔴 **1 套已登记红灯**（`wb-creator-tools-verify` —— SPEC-004 的契约冻结自检，**功能断言 4/126**，`RED` 不阻断，见 §6.2） |',
  'L3 行');

// ③ 套件表：在 growth-academy 行后追加 creator-tools 行
(function () {
  const lines = s.split(/\r?\n/);
  const i = lines.findIndex(function (l) { return l.startsWith('| **`wb-growth-academy-verify.js`** |'); });
  if (i < 0) { miss.push('套件表行'); return; }
  if (lines[i + 1] && lines[i + 1].startsWith('| **`wb-creator-tools-verify.js`** |')) { return; }
  lines.splice(i + 1, 0,
    '| **`wb-creator-tools-verify.js`** | L3 | 🔴 **SPEC-004 冻结自检（契约先行）**（CHG-022 新增）—— **当前为「已登记红灯」，属待实现清单，不是回归防线**。冻结 **17 项契约**（`TOOL_INTEGRATION_TYPES` / `resolveToolIntegration` / `openToolCard` / `openToolDetail` / `toggleTdHero` / `switchTdTab` / `switchTdWorkTab` / `computeGenerateCost` / `preauthorizeGenerate` / `generateFromTicket` / `refundGenerate` / `failGenerate` / `applyTemplateToWorkspace` / `getToolHistory` / `restoreDraft` / `allTools[].integration` / `tools.toolDetails`），覆盖 `SC-004-01 ~ 16`。当前进度：**功能断言 4/126**（其中 3 项前置事实 + 1 项既有能力 ⇒ **新增能力 0/126**；另有 **14/14 不变量** —— ⚠️ **不计入进度**） |');
  s = lines.join('\n');
  hit++;
})();

// ④ 合计数
sub('合计 **2,343 项** L3 断言（**13 套全绿**，含 `wb-identity-admission-verify` 53 项 + `wb-content-asset-verify` 73 项 + `wb-growth-academy-verify` 87 项）；**红灯 0**；',
  '合计 **2,343 项** L3 断言（**13 套全绿**，含 `wb-identity-admission-verify` 53 项 + `wb-content-asset-verify` 73 项 + `wb-growth-academy-verify` 87 项）；🔴 **另有 1 套红灯**（`wb-creator-tools-verify`，功能断言 **4/126**，**不计入**断言合计）；',
  '合计数');

// ⑤ L3 形态差异
sub('| L3 形态差异 | 现有 **13 套全绿**的是**断言级**业务自检（2,343 项），尚未做到规范定义的"状态机逐节点走查"，可后续补齐（`RISK-006`）；**红灯 0** |',
  '| L3 形态差异 | 现有 **13 套全绿**的是**断言级**业务自检（2,343 项），尚未做到规范定义的"状态机逐节点走查"，可后续补齐（`RISK-006`）；🔴 **另有 1 套红灯**（`wb-creator-tools-verify`）为 SPEC-004 Phase 1 的待实现清单 |',
  'L3 形态差异');

// ⑥ §6.2 补一条同类记录（注释污染）
sub('**两处现',
  '**两处现', // 占位（下面用更精确的替换）
  '占位');
sub('② `CHG-020` —— 同一套件**红灯期缺进度行** ⇒ 红灯进度被计为 `0/0`（`CHG-017` 只补了绿套那条，漏了红灯这条）。',
  '② `CHG-020` —— 同一套件**红灯期缺进度行** ⇒ 红灯进度被计为 `0/0`（`CHG-017` 只补了绿套那条，漏了红灯这条）；③ **`CHG-022` —— 「注释污染源码级断言」复发**：`mock_data.js:4949` 有一句说明性注释提到 `refCount` ⇒ 若不**剔除注释**再匹配，则断言**永远为红**（而实现是正确的）。该坑在 `CHG-020` 已踩过一次 ⇒ **同类第 2 次复发**，现统一以 `APP_CODE` / `MOCK_CODE` / `HTML_CODE` 三个「剔注释基底」处理。',
  '§6.2 记录③');

fs.writeFileSync(P, s);
console.log('tools/README：替换 ' + hit + ' 处｜字节 ' + before + ' → ' + Buffer.byteLength(s, 'utf8') + (miss.length ? '｜未命中：' + miss.join(' ; ') : ''));
