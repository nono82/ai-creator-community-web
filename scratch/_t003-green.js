'use strict';
/** T-003-30 · 套件转绿登记：l3ExpectedRed 移除 + 基线上调 + gates.js 绿套归位。 */
const fs = require('fs');

// ---------- ① gates-baseline.json ----------
(function () {
  const P = 'ai-creator-community-deepseek/ai-creator-community-wh/tools/gates-baseline.json';
  const A = 'tools/gates-baseline.json';
  const F = fs.existsSync(P) ? P : A;
  let s = fs.readFileSync(F, 'utf8');
  const before = Buffer.byteLength(s, 'utf8');
  let n = 0;
  const sub = (a, b, label) => { if (!s.includes(a)) { console.log('⚠️ 未命中：' + label); return; } s = s.split(a).join(b); n++; console.log('  ✓ ' + label); };

  sub('"l3AssertionTotal": 2256,', '"l3AssertionTotal": 2343,', 'l3AssertionTotal 2256 → 2343');
  sub('"l3Suites": 12,', '"l3Suites": 13,', 'l3Suites 12 → 13（绿套数）');
  sub('"l3ExpectedRed": ["wb-growth-academy-verify"],', '"l3ExpectedRed": [],', 'l3ExpectedRed 移除 wb-growth-academy-verify');
  sub('"recordedAt": "2026-09-25",', '"recordedAt": "2026-09-25",', 'recordedAt 保持');

  // 追加 CHG-021 说明（插在 notes 数组最后一项之后）
  const tail = '    "  另：本套件提供 **`WB_VERBOSE=1` 环境变量**，会额外打印『已通过的断言』清单 —— 用于逐项复核『平凡通过』（本次加固即由此发现）。该变量不影响默认输出格式。"';
  const add = [
    tail,
    '    "【2026-09-25 红灯转绿 + 基线上调 2256 → 2343（CHG-021）】wb-growth-academy-verify（SPEC-003 Phase 1 的冻结自检）实现已落地：**功能断言 77/77 + 不变量 10/10，退出码 0** ⇒ 按机制提示已从 l3ExpectedRed 移除（现为 []），计入正常 L3 绿套。",',
    '    该套件保留在仓库中：由「待实现清单」转为「**回归防线**」—— 后续改动若破坏学职引擎契约（加分唯一入口 / 等级真源 / 幂等 / 证书三态），会立刻变红。",',
    '    "  ⚠️ 「上调」也必须显式记录：2256 + 87 = 2343 项 / 13 套。另：DUP 键数由 492 → **520**（+28：学职引擎 10 方法 + 资源库 5 入口 + 评价 2 + 相邻课节 + 成就墙 + 排序 2 + 辅助 6），**0 重复**。",',
    '    "  🔴 **口径收敛导致既有套件断言失效（本轮的意外影响面，新增 RISK-003-08）**：`wb-academy-path-verify` 有 **7 项**断言建立在**已作废的 wh 旧口径**上（`paths` 阈值 2500/4000、命名「AI 体验者 / AI 创作者」、由此派生的缺口文案 1,320）⇒ 收敛后必然变红。",',
    '    已**同步更新其期望值**（A02.0/A02.1 命名、A15 门槛 2500 → 2000、B14 缺口 1320 → 2320、C16/C17/C35 文案），恢复 **182/182**。⚠️ **判据：旧断言建立在被 `Q-003` 作废的口径上 ⇒ 更新期望 = 修正测试口径，不是放宽标准。**",',
    '    "  🔑 **Plan 的教训**：`plan.md` §十七 只列了「`academy.paths` 的字段要改」，**没有列「依赖该口径的既有套件」** ⇒ 下次做口径收敛时，受影响文件清单必须包含**断言侧**。",'
  ].join('\n');
  if (s.includes(tail) && !s.includes('CHG-021')) { s = s.replace(tail, add); n++; console.log('  ✓ notes 追加 CHG-021 记录'); }
  else if (s.includes('CHG-021')) console.log('  · CHG-021 记录已存在，跳过');
  else console.log('  ⚠️ notes 锚点未命中');

  fs.writeFileSync(F, s);
  console.log('gates-baseline.json：' + n + ' 处｜字节 ' + before + ' → ' + Buffer.byteLength(s, 'utf8'));
})();

// ---------- ② gates.js：把增长学院套件移入绿套段 ----------
(function () {
  const P = 'ai-creator-community-deepseek/ai-creator-community-wh/tools/gates.js';
  const A = 'tools/gates.js';
  const F = fs.existsSync(P) ? P : A;
  let s = fs.readFileSync(F, 'utf8');
  const oldBlock = [
    "  'wb-content-asset-verify',        // ← 已转绿（CHG-017），计入断言合计",
    "  // ↓ 红旗：契约先行 / 冻结自检 —— 已登记为「待实现」，不阻断总判定（见 gates-baseline.json 的 l3ExpectedRed）",
    "  //   注：已转绿的两套须保留在上方绿套中（红灯清零 ≠ 可以删；它们是回归防线）；当前红旗只有下一条",
    "  'wb-growth-academy-verify'"
  ].join('\n');
  const newBlock = [
    "  'wb-content-asset-verify',        // ← 已转绿（CHG-017），计入断言合计",
    "  'wb-growth-academy-verify',       // ← 已转绿（CHG-021），计入断言合计",
    "  // ↓ 红旗：契约先行 / 冻结自检 —— 已登记为「待实现」，不阻断总判定（见 gates-baseline.json 的 l3ExpectedRed）",
    "  //   注：已转绿的三套须保留在**上方绿套**中（红灯清零 ≠ 可以删；它们是回归防线）；当前**红旗为空**"
  ].join('\n');
  if (s.includes(oldBlock)) {
    s = s.replace(oldBlock, newBlock);
    fs.writeFileSync(F, s);
    console.log('gates.js：已把 wb-growth-academy-verify 移入绿套段');
  } else {
    console.log('⚠️ gates.js 未命中（可能已改）');
  }
})();
