'use strict';
/**
 * T-004-28：套件转绿登记
 * ① `gates-baseline.json`：`l3ExpectedRed` 移除 `wb-creator-tools-verify`；`l3AssertionTotal` 2343 → 2483；`l3Suites` 13 → 14
 * ② `gates.js`：把该套件移入绿套区（**红灯清零 ≠ 可以删**，它是回归防线）
 * ③ 套件头部注释：由「本套件是**红**的」改为「已转绿」
 * ⚠️ **上调必须显式记录，不得静默改数**。
 */
const fs = require('fs');

// ---------- ① baseline ----------
(function () {
  const P = 'tools/gates-baseline.json';
  let s = fs.readFileSync(P, 'utf8');
  const before = s;
  const pairs = [
    ['  "l3AssertionTotal": 2343,', '  "l3AssertionTotal": 2483,'],
    ['  "l3Suites": 13,', '  "l3Suites": 14,'],
    ['  "l3ExpectedRed": ["wb-creator-tools-verify"],', '  "l3ExpectedRed": [],'],
  ];
  let n = 0;
  pairs.forEach(function (p) { if (s.includes(p[0])) { s = s.split(p[0]).join(p[1]); n++; } else console.log('  ⚠️ 未命中：' + p[0].trim()); });
  // notes 追加转绿记录
  const anchor = '    " 另：本套件提供 **`WB_VERBOSE=1`**，会额外打印『已通过的断言』清单 —— 用于逐项复核『平凡通过』（本轮加固即由此发现）。该变量不影响默认输出格式。"\n  ]';
  if (s.includes(anchor) && !s.includes('2343 → 2483')) {
    s = s.replace(anchor, [
      '    " 另：本套件提供 **`WB_VERBOSE=1`**，会额外打印『已通过的断言』清单 —— 用于逐项复核『平凡通过』（本轮加固即由此发现）。该变量不影响默认输出格式。",',
      '    "【2026-09-25 红灯转绿 + 基线上调 2343 → 2483（CHG-023）】wb-creator-tools-verify（SPEC-004 Phase 1 的冻结自检）实现已落地：**功能断言 126/126 + 不变量 14/14，退出码 0** ⇒ 已从 l3ExpectedRed 移除（现为 []）。",',
      '    "  该套件保留在仓库中：由「待实现清单」转为「**回归防线**」—— 后续改动若破坏创作工具的契约（集成模式三值 / 卡片统一路由 / 详情页路由级承载 / 生成两阶段计费 / 双路流转复用对象键 / 模板套用），会立刻变红。",',
      '    "  ⚠️ 「上调」也必须显式记录：2343 + 140 = 2483 项 / 14 套。另：DUP 键数由 520 → **550**（+30：SPEC-004 新增约 30 个方法 / 属性），**0 重复**。",',
      '    "  🔴 **一处对既有回归防线的修改（必须显式记录）**：`tools/smoke-test.js` 的 **L2-2** 由「**七**视图可达（nav ↔ #view-* 一一对应）」演进为「**视图可达**（主视图一一对应；**二级页面**唯一可见但**不入主导航**；hash 同步）」，并引入显式白名单 `SECONDARY_VIEWS = [\'tool-detail\']`。",',
      '    "  理由：`#view-tool-detail` 是 **SPEC-004 引入的二级页面**（由工具卡片 / 深链进入的路由级页面，`REQ-202`）—— 它**本就不应出现在左侧主导航**中 ⇒ 「nav ↔ 视图一一对应」对二级页面**不成立**。",',
      '    "  ⚠️ 白名单**只放宽那一半**：「切换后唯一可见 + `hash` 同步」**仍然必须成立**（等级未降低）。此外 `VIEW_IDS` 由 7 → **8**、`NAV_VIEWS` 仍为 7 —— 逐视图走查 **8/8** 唯一可见且 hash 同步。",',
      '    "  ⚠️ 套件自身的两处实现期修正（**立红时的断言缺陷**，非放宽标准）：① `App.getAssetRefs(objectKey)` **只接受一个参数**（无 `refType`）⇒ 原写法 `getAssetRefs(key, \'post\')` 的第二参被忽略、断言「某类型引用数 === 1」实为「**总引用数 === 1**」⇒ 已引入 `refsByType(app, key, refType)` 辅助修正；② 同上，B5 由「存在 native 工具」的弱前置改为真正的 `EX-004-12` 断言（third-external 未配置 url ⇒ 显式失败）。"',
      '  ]',
    ].join('\n'));
    console.log('① baseline：字段更新 ' + n + ' 处 + notes 追加转绿记录');
  } else {
    fs.writeFileSync(P, s);
    console.log('① baseline：字段更新 ' + n + ' 处（notes 锚点未命中或已存在）');
  }
  fs.writeFileSync(P, s);
  const j = JSON.parse(fs.readFileSync(P, 'utf8'));
  console.log('   → l3AssertionTotal=' + j.l3AssertionTotal + '｜l3Suites=' + j.l3Suites + '｜l3ExpectedRed=' + JSON.stringify(j.l3ExpectedRed) + '｜notes=' + j.notes.length + ' 条｜字节 ' + Buffer.byteLength(s, 'utf8'));
  if (before === s) console.log('   ⚠️ 文件未变化');
})();

// ---------- ② gates.js：移入绿套区 ----------
(function () {
  const P = 'tools/gates.js';
  let s = fs.readFileSync(P, 'utf8');
  const oldBlock = [
    "  'wb-growth-academy-verify',       // ← 已转绿（CHG-021），计入断言合计",
    '  // ↓ 红旗：契约先行 / 冻结自检 —— 已登记为「待实现」，不阻断总判定（见 gates-baseline.json 的 l3ExpectedRed）',
    '  //   注：已转绿的三套须保留在**上方绿套**中（红灯清零 ≠ 可以删；它们是回归防线）',
    "  'wb-creator-tools-verify'",
    '];',
  ].join('\n');
  const newBlock = [
    "  'wb-growth-academy-verify',       // ← 已转绿（CHG-021），计入断言合计",
    "  'wb-creator-tools-verify',        // ← 已转绿（CHG-023），计入断言合计",
    '  // ↓ 红旗：契约先行 / 冻结自检 —— 已登记为「待实现」，不阻断总判定（见 gates-baseline.json 的 l3ExpectedRed）',
    '  //   注：已转绿的四套须保留在**上方绿套**中（红灯清零 ≠ 可以删；它们是回归防线）；当前**红旗为空**',
    '];',
  ].join('\n');
  if (s.includes(oldBlock)) { s = s.split(oldBlock).join(newBlock); fs.writeFileSync(P, s); console.log('② gates.js：已把 wb-creator-tools-verify 移入绿套区'); }
  else console.log('② gates.js：未命中（可能已改）');
})();

// ---------- ③ 套件头部注释：红 → 绿 ----------
(function () {
  const P = 'tools/wb-creator-tools-verify.js';
  let s = fs.readFileSync(P, 'utf8');
  const oldHead = ' * ⚠️ **本套件是"红"的**（登记在 gates-baseline.json 的 l3ExpectedRed 中）。';
  const newHead = ' * ✅ **本套件已转绿**（`CHG-023`：SPEC-004 Phase 1 已落地，**功能断言 126/126 + 不变量 14/14，退出码 0**）。\n *    它已由「待实现清单」转为「**回归防线**」，并已从 gates-baseline.json 的 `l3ExpectedRed` 移除。';
  if (s.includes(oldHead)) { s = s.split(oldHead).join(newHead); fs.writeFileSync(P, s); console.log('③ 套件头部注释：已由「红」改为「已转绿」'); }
  else console.log('③ 套件头部注释：未命中（可能已改）');
})();
