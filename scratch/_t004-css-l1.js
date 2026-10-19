'use strict';
/** T-004-10：追加详情页 CSS + baseline 的 L1 下调（7 → 5 ERROR）。 */
const fs = require('fs');

// ---------- ① 追加 CSS ----------
(function () {
  const P = 'css/style.css';
  let s = fs.readFileSync(P, 'utf8');
  if (s.includes('.td-wrap')) { console.log('① CSS：已存在 td-wrap，跳过'); return; }
  const add = fs.readFileSync('scratch/_td-styles.css', 'utf8');
  const before = Buffer.byteLength(s, 'utf8');
  fs.appendFileSync(P, add);
  const after = Buffer.byteLength(fs.readFileSync(P, 'utf8'), 'utf8');
  console.log('① CSS：追加 ' + (after - before) + ' B（' + before + ' → ' + after + '）');
})();

// ---------- ② baseline：L1 下调 7 → 5 ----------
(function () {
  const P = 'tools/gates-baseline.json';
  let s = fs.readFileSync(P, 'utf8');
  const before = s;
  if (s.includes('"l1ErrorBaseline": 7,')) {
    s = s.split('"l1ErrorBaseline": 7,').join('"l1ErrorBaseline": 5,');
    console.log('② baseline：l1ErrorBaseline 7 → 5（**下调**）');
  } else console.log('② baseline：l1ErrorBaseline 未命中（可能已改）');
  // notes 追加 L1 下调记录
  const anchor = '    "  另：实现期发现两处**数据完整性缺口**并补齐 —— ① `third-external` 的 TL7 **未配 `externalUrl`**（同为外跳工具，理应配官网地址）；② `myToolbox` **并非** `allTools` 的子集（名字不同且有独有项「AI 音乐」）⇒ 为它**新增 TL9「AI 音乐」**，使工具箱 5 项的 `id` **全部可指向 `allTools`**（不悬空）。"\n  ]';
  if (s.includes(anchor) && !s.includes('L1 契约 ERROR 由 7 → 5')) {
    s = s.replace(anchor, [
      '    "  另：实现期发现两处**数据完整性缺口**并补齐 —— ① `third-external` 的 TL7 **未配 `externalUrl`**（同为外跳工具，理应配官网地址）；② `myToolbox` **并非** `allTools` 的子集（名字不同且有独有项「AI 音乐」）⇒ 为它**新增 TL9「AI 音乐」**，使工具箱 5 项的 `id` **全部可指向 `allTools`**（不悬空）。",',
      '    "【L1 契约 ERROR 由 7 → 5（**下调**，CHG-023）】本 Feature 实现了 L1 文档契约所声明的两个函数名 —— **`App.openStudioModal()`**（`整体设计.md` 声明）与 **`App.applyTemplateToWorkspace()`**（`创作工具设计.md` 声明，且与 `SPEC-003` 的 R4 **共用同一契约名**）⇒ 二者对应的 ERROR 消失。",',
      '    "  ⚠️ **基线下调也必须显式记录**（不得静默改数）。剩余 **5 个 ERROR 均不属本 Feature**：`showAcademyCoursesPage` / `openMyCerts` ×2（**`SPEC-003` 遗留 —— 见 `GAP-13`**）、`showTaskPublishPage` / `openTaskDetail`（**`SPEC-006` 范围**）。",',
      '  ]',
    ].join('\n'));
    console.log('   → notes 已追加 L1 下调记录');
  } else console.log('   → notes 锚点未命中或已存在');
  fs.writeFileSync(P, s);
  if (before === s) console.log('   ⚠️ 文件未变化');
  const j = JSON.parse(fs.readFileSync(P, 'utf8'));
  console.log('   → l1ErrorBaseline=' + j.l1ErrorBaseline + '｜notes=' + j.notes.length + ' 条');
})();
