'use strict';
/** 把两段追加内容插入归档文件的「归档记录」之前；并修正 DESIGN-METHOD 的章节编号（六 → 七）。 */
const fs = require('fs');

// ---------- DESIGN-METHOD.md ----------
(function () {
  const P = '.workbuddy/memory/DESIGN-METHOD.md';
  let L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
  const i = L.findIndex(function (l) { return /^## 归档记录/.test(l); });
  if (i < 0) { console.log('⚠️ DESIGN-METHOD：未找到「归档记录」'); return; }
  let neo = fs.readFileSync('ai-creator-community-wh/scratch/_dm-append.md', 'utf8').split(/\r?\n/);
  // 章节号修正：六 → 七（含小节 6.x → 7.x）
  neo = neo.map(function (l) {
    return l
      .replace(/^## 六、/, '## 七、')
      .replace(/^## 七、`CLARIFY` 与「立红」的加固经验（CHG-019 \/ CHG-020）$/, '## 七、`CLARIFY` 的判据与「立红」的加固手法（`CHG-019` / `CHG-020`）')
      .replace(/^### 6\.(\d)/, '### 7.$1');
  });
  while (neo.length && neo[neo.length - 1].trim() === '') neo.pop();
  L.splice(i, 0, ...neo, '');
  fs.writeFileSync(P, L.join('\n'));
  console.log('DESIGN-METHOD：已插入 §七（' + neo.length + ' 行）｜总行数 → ' + L.length);
})();

// ---------- PITFALLS-ARCHIVE.md ----------
(function () {
  const P = '.workbuddy/memory/PITFALLS-ARCHIVE.md';
  const L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
  const i = L.findIndex(function (l) { return /^## 归档记录/.test(l); });
  if (i < 0) { console.log('⚠️ PITFALLS：未找到「归档记录」'); return; }
  const neo = fs.readFileSync('ai-creator-community-wh/scratch/_pa-append.md', 'utf8').split(/\r?\n/);
  while (neo.length && neo[neo.length - 1].trim() === '') neo.pop();
  L.splice(i, 0, ...neo, '');
  fs.writeFileSync(P, L.join('\n'));
  console.log('PITFALLS-ARCHIVE：已插入 §M / §N（' + neo.length + ' 行）｜总行数 → ' + L.length);
})();

// ---------- 当日日志 ----------
(function () {
  const P = '.workbuddy/memory/2026-09-25.md';
  const prev = fs.readFileSync(P, 'utf8');
  const add = fs.readFileSync('ai-creator-community-wh/scratch/_log-append.md', 'utf8');
  fs.writeFileSync(P, prev + add);
  console.log('当日日志：追加 ' + add.length + ' 字符｜总字节 → ' + fs.readFileSync(P, 'utf8').length);
})();
