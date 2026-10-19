'use strict';
/** MEMORY.md 五次微压（差 189 B）：精简三条已多次归档的条目。 */
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

rep('- 三条硬约束：',
  '- 三条硬约束：① **禁子进程**（EBUSY）；② **须 `worker_threads` 隔离**；③ **Worker 内须接管 `console`/`process.exit`**。',
  '三条硬约束');

rep('- 🔴 **凡"审计报告 / 计数 / 状态"，一律重新实测**',
  '- 🔴 **凡"审计报告 / 计数 / 状态"，一律重新实测**（已被翻案 3 次）；**引用编号前必须回查其定义**。手法：先数**真实调用点**（扣掉定义行），再数**实际重复定义**。',
  '实测纪律');

// 删除已被 PITFALLS-ARCHIVE 完整覆盖的一条
const di = L.findIndex(function (l) { return l.startsWith('- 🔑 **给建议时也自查是否违反项目自己的门禁**'); });
if (di > 0) { L.splice(di, 1); hit++; console.log('已删除 1 行（该条已在 PITFALLS-ARCHIVE §K.3）'); } else miss.push('自查门禁');

fs.writeFileSync(P, L.join('\n'));
const after = Buffer.byteLength(L.join('\n'), 'utf8');
console.log('MEMORY.md 五次微压：' + before + ' → ' + after + (after <= 16384 ? ' ✅ 在 16KB 内' : ' ⚠️ 超 ' + (after - 16384) + ' B'));
if (miss.length) console.log('未命中：' + miss.join(' ; '));
