'use strict';
/** CHG-023 批 2a：traceability §4.4 重写 + feature-map + specs/README + tools/README。 */
const fs = require('fs');

// ---------- ① traceability §4.4 ----------
(function () {
  const P = 'project-design/01-requirements/traceability.md';
  const L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
  const i = L.findIndex(function (l) { return /^### 4\.4 /.test(l); });
  if (i < 0) { console.log('① traceability：未找到 §4.4'); return; }
  let j = -1;
  for (let k = i + 1; k < L.length; k++) { if (/^---\s*$/.test(L[k])) { j = k; break; } }
  if (j < 0) { console.log('① traceability：未找到 §4.4 终点'); return; }
  let neo = fs.readFileSync('ai-creator-community-wh/scratch/_tr44b.txt', 'utf8').split(/\r?\n/);
  while (neo.length && neo[neo.length - 1].trim() === '') neo.pop();
  L.splice(i, j - i, ...neo);
  fs.writeFileSync(P, L.join('\n'));
  console.log('① traceability §4.4：已重写（行数 → ' + L.length + '）');
})();

// ---------- ② feature-map ----------
(function () {
  const P = 'project-design/05-feature-map.md';
  let L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
  const snap = L.slice();
  const i = snap.findIndex(function (l) { return l.startsWith('| **SPEC-004** |'); });
  if (i >= 0) {
    L[i] = '| **SPEC-004** | 创作工具工作台与模板套用 | 把"灵感"变成"可交付的成片资产" | REQ-201~REQ-206 | SPEC-009（扣积分）、SPEC-017 | **P0** | MVP | ✅ **`IMPLEMENTED`（Phase 1）**（2026-09-25；`specs/004-creator-tools/` 四件齐备；**立红 `4/126` → `126/126`**）。✅ 收敛 **9 处缺陷**（§1.3 的 3 处 + 立红新测 6 处）；**`Q-049`（两阶段）/ `Q-050`（分源真源）/ `Q-051`（Hero 内容）** 均已定稿并落地；🔴 **Phase 1 硬约束完全满足**（`#modal-studio` 仅加 2 个 `id`，5 个既有方法**逐字一致**） |';
    fs.writeFileSync(P, L.join('\n'));
    console.log('② feature-map：SPEC-004 状态已更新');
  } else console.log('② feature-map：未命中');
})();

// ---------- ③ specs/README ----------
(function () {
  const P = 'specs/README.md';
  let L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
  const snap = L.slice();
  let hit = 0; const miss = [];
  const rules = [
    ['> **当前状态**：',
     '> **当前状态**：`SPEC-001` / `SPEC-017` / `SPEC-003` / **`SPEC-004`** 均已完成全程并落地 **Phase 1**（2026-09-24 ~ 09-25）；其余 **12 个** Feature 仍处于 **IDEA**。'],
    ['| **SPEC-004** 创作工具工作台与模板套用 |',
     '| **SPEC-004** 创作工具工作台与模板套用 | **IMPLEMENTED（Phase 1）**（2026-09-25；`SPECIFY` → `CLARIFY` → 立红 → `PLAN` → `TASKS` → `IMPLEMENT`，`CHG-018` ~ `CHG-023`） | `spec.md` / `plan.md` / `tasks.md` / `data-model.md` / `research.md`；实现落点：`js/app.js`（+约 30 方法）、`js/mock_data.js`、`index.html`（+1 段 +2 个 `id`）、`css/style.css`（详情页类）|'],
    ['| **第 3 批** |',
     '| **第 3 批** | ✅ **`SPEC-003` / `SPEC-004` 均已完成全程并落地 Phase 1**（2026-09-25，`CHG-018` ~ `CHG-023`）—— `SPEC-003` 红灯 `0/77 → 77/77`；`SPEC-004` 红灯 `4/126 → 126/126`（+ 不变量 14/14）；⚠️ **`SPEC-004` 的「分源扣减 / 全额退还」仍走既有两值入口**（真源归 `SPEC-009`，`Q-050`）| 关键路径中段 |'],
  ];
  rules.forEach(function (p) {
    const i = snap.findIndex(function (l) { return l.startsWith(p[0]); });
    if (i >= 0) { L[i] = p[1]; hit++; } else miss.push(p[0].slice(0, 28));
  });
  // 把"验收证据已先于实现冻结"段改为"已转绿"
  const k = L.findIndex(function (l) { return l.startsWith('> 🔴 **`SPEC-004` 的验收证据已先于实现冻结'); });
  if (k >= 0) {
    L[k] = '> ✅ **`SPEC-004` 的验收证据已转绿并转为回归防线（2026-09-25，`CHG-023`）**：`ai-creator-community-wh/tools/wb-creator-tools-verify.js` —— **17 项契约 / 功能断言 126/126 + 不变量 14/14，退出码 0**（由 `4/126` 转绿）⇒ 已从 `l3ExpectedRed` 移除。**该套件即 Phase 1 的 DoD，且已转为回归防线（不得删除）。**';
    hit++;
  }
  fs.writeFileSync(P, L.join('\n'));
  console.log('③ specs/README：替换 ' + hit + '/4' + (miss.length ? '｜未命中：' + miss.join(' ; ') : ''));
})();

// ---------- ④ tools/README ----------
(function () {
  const P = 'ai-creator-community-wh/tools/README.md';
  let s = fs.readFileSync(P, 'utf8');
  const before = Buffer.byteLength(s, 'utf8');
  let n = 0;
  function sub(a, b, label) {
    if (!s.includes(a)) { console.log('  · 未命中：' + label); return; }
    const c = s.split(a).length - 1; s = s.split(a).join(b); n += c;
  }
  sub('> 🔴 **L3 当前 14 套 = 13 套全绿（2,343 项）+ 1 套「已登记红灯」**（`gates-baseline.json` 的 `l3ExpectedRed: ["wb-creator-tools-verify"]`）。',
      '> ✅ **L3 当前 14 套全部全绿（2,483 项），红灯 0**（`gates-baseline.json` 的 `l3ExpectedRed: []`）。', '顶部红灯段');
  sub('| **L3** 业务闭环 | 按状态机逐状态走查 | **`wb-*-verify.js` × 14 套** | ✅ 在线（**13 套全绿 = 2,343 项断言**）；🔴 **1 套已登记红灯**（`wb-creator-tools-verify` —— SPEC-004 的契约冻结自检，**功能断言 4/126**，`RED` 不阻断，见 §6.2） |',
      '| **L3** 业务闭环 | 按状态机逐状态走查 | **`wb-*-verify.js` × 14 套** | ✅ 在线（**14 套全绿 = 2,483 项断言**）；**红灯 0**（`l3ExpectedRed: []`，CHG-023） |', 'L3 行');
  sub('（CHG-022 新增）—— **当前为「已登记红灯」，属待实现清单，不是回归防线**。',
      '（CHG-022 立红 / **CHG-023 转绿**）—— **已由「待实现清单」转为「回归防线」**。', '套件行');
  sub('当前进度：**功能断言 4/126**（其中 3 项前置事实 + 1 项既有能力 ⇒ **新增能力 0/126**；另有 **14/14 不变量** —— ⚠️ **不计入进度**） |',
      '**功能断言 126/126 + 不变量 14/14，退出码 0**（由 `4/126` 转绿）|', '套件进度');
  sub('合计 **2,343 项** L3 断言（**13 套全绿**，含 `wb-identity-admission-verify` 53 项 + `wb-content-asset-verify` 73 项 + `wb-growth-academy-verify` 87 项）；🔴 **另有 1 套红灯**（`wb-creator-tools-verify`，功能断言 **4/126**，**不计入**断言合计）；',
      '合计 **2,483 项** L3 断言（**14 套全绿**，含 `wb-identity-admission-verify` 53 项 + `wb-content-asset-verify` 73 项 + `wb-growth-academy-verify` 87 项 + **`wb-creator-tools-verify` 140 项**）；**红灯 0**；', '合计数');
  sub('另有 DUP **520 键 0 重复**', '另有 DUP **550 键 0 重复**', 'DUP 键数');
  sub('🔴 **另有 1 套红灯**（`wb-creator-tools-verify`）为 SPEC-004 Phase 1 的待实现清单 |',
      '**红灯 0**（`l3ExpectedRed: []`，CHG-023） |', 'L3 形态差异');
  fs.writeFileSync(P, s);
  console.log('④ tools/README：替换 ' + n + ' 处｜字节 ' + before + ' → ' + Buffer.byteLength(s, 'utf8'));
})();
