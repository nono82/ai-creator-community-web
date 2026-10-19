'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const file = path.join(ROOT, 'js', 'app.js');
const raw = fs.readFileSync(file, 'utf8');
const lines = raw.split(/\r?\n/);

const RE_DEF = /^  ([A-Za-z_$][\w$]*)\s*:\s*function|^  ([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/;

const defs = new Map();
lines.forEach((l, i) => {
  const m = l.match(RE_DEF);
  if (!m) return;
  const name = m[1] || m[2];
  let end = -1;
  for (let j = i + 1; j < lines.length; j++) {
    if (/^  \}[,]?\s*$/.test(lines[j])) { end = j; break; }
  }
  if (!defs.has(name)) defs.set(name, []);
  defs.get(name).push({ start: i, end: end === -1 ? i : end });
});

const norm = (s) => s.replace(/\s+/g, ' ').trim();
const report = [];
for (const [name, arr] of defs) {
  if (arr.length < 2) continue;
  const bodies = arr.map(a => lines.slice(a.start, a.end + 1));
  const sigs = bodies.map(b => norm(b.join(' ')));
  const allSame = sigs.every(s => s === sigs[0]);
  report.push({
    name,
    count: arr.length,
    lines: arr.map(a => a.start + 1),
    spans: arr.map(a => a.end - a.start + 1),
    identical: allSame,
    chars: sigs.map(s => s.length)
  });
}

report.sort((a, b) => (a.identical === b.identical ? 0 : a.identical ? 1 : -1));

const diff = report.filter(r => !r.identical);
const same = report.filter(r => r.identical);

const out = [];
out.push('文件: js/app.js  总行数=' + lines.length);
out.push('去重后方法数=' + defs.size);
out.push('重复定义方法数=' + report.length);
out.push('  ├ 两份实现内容【相同】(纯死代码) = ' + same.length);
out.push('  └ 两份实现内容【不同】(真实功能分歧) = ' + diff.length);
out.push('');
out.push('===== A) 内容不同的（必须逐个裁决）=====');
diff.forEach(r => {
  out.push(r.name.padEnd(34) + ' 行 ' + r.lines.join(' / ') + '   行数 ' + r.spans.join('/') + '   字数 ' + r.chars.join('/'));
});
out.push('');
out.push('===== B) 内容完全相同的（可直接删前一份）=====');
same.forEach(r => {
  out.push(r.name.padEnd(34) + ' 行 ' + r.lines.join(' / ') + '   行数 ' + r.spans.join('/'));
});

const target = path.join(__dirname, '_dup-report.txt');
fs.writeFileSync(target, out.join('\n'), 'utf8');
console.log(out.join('\n'));
console.log('\n>>> 报告已写入 ' + target);
