'use strict';
/** CHG-023 批 2c：change-impact + CHANGELOG。 */
const fs = require('fs');
function readLines(p) { const a = fs.readFileSync(p, 'utf8').split(/\r?\n/); while (a.length && a[a.length-1].trim() === '') a.pop(); return a; }

// ① change-impact：降序插入到 CHG-022 之前
(function () {
  const P = 'project-design/99-ai/change-impact.md';
  const L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
  if (L.some(function (l) { return /^## CHG-023/.test(l); })) { console.log('change-impact：已存在，跳过'); return; }
  const i = L.findIndex(function (l) { return /^## CHG-022/.test(l); });
  if (i < 0) { console.log('change-impact：未找到 CHG-022'); return; }
  const neo = readLines('ai-creator-community-wh/scratch/_chg023.md');
  L.splice(i, 0, ...neo);
  fs.writeFileSync(P, L.join('\n'));
  console.log('change-impact：CHG-023 已插入（' + neo.length + ' 行）｜总行数 ' + L.length);
})();

// ② CHANGELOG：插入到首条之前
(function () {
  const P = 'CHANGELOG.md';
  const L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
  if (L.some(function (l) { return l.indexOf('CHG-023') >= 0; })) { console.log('CHANGELOG：已存在，跳过'); return; }
  const i = L.findIndex(function (l) { return /^## \[2026-09-25\]/.test(l); });
  if (i < 0) { console.log('CHANGELOG：未找到首条'); return; }
  const neo = readLines('ai-creator-community-wh/scratch/_changelog023.md');
  L.splice(i, 0, ...neo);
  fs.writeFileSync(P, L.join('\n'));
  console.log('CHANGELOG：已插入（' + neo.length + ' 行）｜总行数 ' + L.length);
})();
