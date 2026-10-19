'use strict';
/** MEMORY.md 二次压缩（细节均在 PITFALLS-ARCHIVE / DESIGN-METHOD / 日志中）。 */
const fs = require('fs');
const P = '.workbuddy/memory/MEMORY.md';
let L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
const before = Buffer.byteLength(L.join('\n'), 'utf8');
const snap = L.slice();
let hit = 0;
const miss = [];
function rep(pre, to, label) {
  const i = snap.findIndex(function (l) { return l.startsWith(pre); });
  if (i >= 0) { L[i] = to; hit++; } else miss.push(label || pre.slice(0, 26));
}

// ① 5 种形态 → 精简（细节已在 PITFALLS-ARCHIVE）
rep('- 🔑🔴 **「缺数据默认放行」有 5 种形态**：',
  '- 🔑🔴 **「缺数据默认放行」有 5 种形态**：默认**金额**（`Q-036`）/ **资格**（`EX-001-13`）/ **状态**（`accountStatus === undefined`）/ **配置**（`gcWindowHours` 缺失不得退化为"立即回收"）/ **归属**（`plans[0]`）。**判据：它默认的是"钱 / 资格"，还是"省事"？**',
  '5 种形态');

// ② 排期判据 → 精简
rep('- 🔑 **排期判据：「被依赖度」>「自身优先级」**',
  '- 🔑 **排期判据：「被依赖度」>「自身优先级」** —— `SPEC-017` 标 P1 却被两个 P0 依赖 ⇒ **前置**；`SPEC-016` 的发送点清单**是 `SPEC-006`/`007` 的函数**且**无人依赖** ⇒ **后移**；`SPEC-004` 依赖 `SPEC-017`（已冻结并落地）与 `SPEC-003`（已落地）。',
  '排期判据');

// ③ 关键数字 → 精简
rep('- **跨文档重复、门禁不校验，改一处必须跟多处**：',
  '- **跨文档重复、门禁不校验，改一处必须跟多处**：`99.4%` / `36h` / `785`（及 750 免押）/ `¥3,500` / `¥620` / `24h 冷静期` / `¥10,000` 提现上限 / `1,640·700·2,340`（算力两值 + 合计）。',
  '关键数字');

// ④ 内容资产层行 → 精简
rep('- **内容资产层（',
  '- **内容资产层（`SPEC-017` Phase 1 已落地）**：对象键 = `creator/{userId}/{digest}`（**用户级去重**）；**引用记录 = 唯一真源**（`refCount` 不落库）；**两阶段回收**（归零 ⇒ `pendingGC`，窗口 `null` ⇒ 不得回收）。',
  '内容资产层');

// ⑤ 成长学院 / 创作工具行 → 更新 + 精简
rep('- **成长学院 / 创作工具（',
  '- **成长学院 / 创作工具**：**等级口径取 `Q-003` 裁决值**（`0/200/500/2000/5000`，命名**无 `AI` 前缀**）；**加分唯一入口** `awardLearningPoints`（课节 +30 / 心得 +5 / 教材 +5 / 领证 +100）；**AI 工具详情页 = 路由级页面**；资产一律走 `SPEC-017`。**`SPEC-004` 另冻结**：`integration` 三值（`native`/`third-integrated`/`third-external`）· **生成两阶段计费**（预扣 → 落盘 → 退还）· **`computeSource` 由 `integration` 派生**（native→self）。',
  '成长学院/创作工具');

// ⑥ 工具层细节行 → 精简
rep('- **`l3ExpectedRed`「已登记红灯」**：',
  '- 🔴 **`l3ExpectedRed`「已登记红灯」**：契约已冻结、实现未开始 ⇒ 计 **`RED`**（**不阻断 / 不计入断言合计 / 单独报进度 / 转绿提示移除**）。**为什么不判 FAIL：红灯若判 FAIL，总判定永远失败 ⇒ 团队会忽略门禁，比没有门禁更糟。**',
  'l3ExpectedRed');

fs.writeFileSync(P, L.join('\n'));
const after = Buffer.byteLength(L.join('\n'), 'utf8');
console.log('MEMORY.md 二次压缩：替换 ' + hit + '/6｜' + before + ' → ' + after + (after <= 16384 ? ' ✅ 在 16KB 内' : ' ⚠️ 超 ' + (after - 16384) + ' B'));
if (miss.length) console.log('未命中：' + miss.join(' ; '));
