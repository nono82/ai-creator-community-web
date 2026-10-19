'use strict';
/** CHG-022 同步第 4 批（v2）：change-impact.md + CHANGELOG.md —— 内容从独立文件读入，避免多行字符串转义问题。 */
const fs = require('fs');

function readLines(p) {
  const a = fs.readFileSync(p, 'utf8').split(/\r?\n/);
  while (a.length && a[a.length - 1].trim() === '') a.pop();
  return a;
}

// ① change-impact.md：降序插入到 CHG-021 之前
(function () {
  const P = 'project-design/99-ai/change-impact.md';
  const L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
  if (L.some(function (l) { return /^## CHG-022/.test(l); })) { console.log('change-impact：已存在 CHG-022，跳过'); return; }
  const i = L.findIndex(function (l) { return /^## CHG-021/.test(l); });
  if (i < 0) { console.log('change-impact：未找到 CHG-021 锚点'); return; }
  const neo = readLines('ai-creator-community-wh/scratch/_chg022.md');
  L.splice(i, 0, ...neo);
  fs.writeFileSync(P, L.join('\n'));
  console.log('change-impact：CHG-022 插入于第 ' + (i + 1) + ' 行之前（' + neo.length + ' 行）｜总行数 ' + L.length);
})();

// ② CHANGELOG.md：插入到首条之前
(function () {
  const P = 'CHANGELOG.md';
  const L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
  if (L.some(function (l) { return l.indexOf('CHG-022') >= 0; })) { console.log('CHANGELOG：已存在 CHG-022，跳过'); return; }
  const i = L.findIndex(function (l) { return /^## \[2026-09-25\]/.test(l); });
  if (i < 0) { console.log('CHANGELOG：未找到首条锚点'); return; }
  const neo = readLines('ai-creator-community-wh/scratch/_changelog022.md');
  L.splice(i, 0, ...neo);
  fs.writeFileSync(P, L.join('\n'));
  console.log('CHANGELOG：已插入 CHG-022 条目（' + neo.length + ' 行）｜总行数 ' + L.length);
})();
