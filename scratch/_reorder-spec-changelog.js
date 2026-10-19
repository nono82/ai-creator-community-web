'use strict';
// 一次性：把 spec.md 变更记录按时间序重排，并追加 IMPLEMENT（Phase 1）行。
// 属 scratch/ 过程产物（CON-030：不得被正式代码引用）。
const fs = require('fs');
const path = require('path');
const P = path.resolve(__dirname, '..', '..', 'specs', '001-identity-onboarding', 'spec.md');
const src = fs.readFileSync(P, 'utf8');
const NL = src.indexOf('\r\n') >= 0 ? '\r\n' : '\n';
const L = src.split(/\r?\n/);

// 只处理「变更记录」表内的数据行
const hIdx = L.findIndex((l) => /^## 变更记录/.test(l));
if (hIdx < 0) { console.error('未找到变更记录章节'); process.exit(1); }
const rowIdx = [];
for (let i = hIdx; i < L.length; i++) if (/^\| 2026-/.test(L[i])) rowIdx.push(i);
if (rowIdx.length !== 6) { console.error('预期 6 行，实际 ' + rowIdx.length); process.exit(1); }

// 时间序关键字（按 1..6 排列）
const ORDER = [
  '首次建立',
  '未创建',
  'CLARIFY + 变更',
  '本 Spec 已产出',
  '缺口闭环',
  'PLAN` + `TASKS`'
];
const rows = rowIdx.map((i) => L[i]);
const sorted = [];
for (const key of ORDER) {
  const hit = rows.find((r) => r.includes(key) && !sorted.includes(r));
  if (!hit) { console.error('关键字未命中: ' + key); process.exit(1); }
  sorted.push(hit);
}
if (sorted.length !== rows.length) { console.error('重排后行数不符'); process.exit(1); }

// 新增行
const NEWROW = '| 2026-09-24 | **`IMPLEMENT`（Phase 1，CHG-013）** | **`SPEC-001`：`TASKED` → `IMPLEMENTED`（Phase 1）**。`tasks.md` **24 项全部完成**，`plan.md` §二十二 的 **9 项 DoD 逐条达成**。**验收证据转绿**：`tools/wb-identity-admission-verify.js` **功能断言 3/37 → 37/37**（断言 53/53，exit 0），并**由「已登记红灯」转为回归防线**（`l3ExpectedRed` 清空）；**L3 2,130（10 套）→ 2,183（11 套）**。**本 Spec 的需求内容未改动**（只做 HOW）。⚠️ **Phase 2 未启动**（`accounts` 集合 / 业务身份切换 / 凭据五态 / `roles` 维度重切 `GAP-9` / 权限矩阵运行时鉴权 / 留存期限机制） | `js/app.js`（+14 方法/属性，改造 4 个既有方法）；`js/mock_data.js`（+3 字段，−`mentor`）；`tools/gates-baseline.json`；`tasks.md` §⑩；`checklists/requirements.md` §4.2；`01-requirements/traceability.md`；`99-ai/{design-status,workspace-state,change-impact}`；`CHANGELOG.md` |';

// 用有序行 + 新行替换原 rowIdx 区段
const first = rowIdx[0];
const last = rowIdx[rowIdx.length - 1];
const out = L.slice(0, first).concat(sorted, NEWROW).concat(L.slice(last + 1));

fs.writeFileSync(P, out.join(NL), 'utf8');

// 校验输出
const chk = fs.readFileSync(P, 'utf8').split(/\r?\n/);
const j = chk.findIndex((l) => /^## 变更记录/.test(l));
console.log('=== 变更记录（时间序）===');
chk.slice(j).forEach((l, k) => {
  if (/^\| 2026-/.test(l)) {
    const kind = l.split('|')[2].trim().slice(0, 46);
    console.log('  ' + (j + k + 1) + ': ' + kind);
  }
});
console.log('');
console.log('总行数 ' + chk.length);
