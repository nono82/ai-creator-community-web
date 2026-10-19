'use strict';
// 按裁决表删除重复定义中的“废弃那一份”
// 用法： node scratch/_dedup-apply.js            → dry-run（只报告）
//        node scratch/_dedup-apply.js --apply    → 实际写回
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const FILE = path.join(ROOT, 'js', 'app.js');
const APPLY = process.argv.includes('--apply');

// 裁决表：需要“保留前一份 / 删除后一份”的方法（其余重复方法一律删除前一份）
const KEEP_FIRST = ['openSystemAdminModal', 'switchSystemAdminTab'];

const src = fs.readFileSync(FILE, 'utf8');
const L = src.split(/\r?\n/);
const RE_DEF = /^  ([A-Za-z_$][\w$]*)\s*:\s*function|^  ([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/;

const defs = new Map();
L.forEach((l, i) => {
  const m = l.match(RE_DEF);
  if (!m) return;
  const name = m[1] || m[2];
  let end = -1;
  for (let j = i + 1; j < L.length; j++) {
    if (/^  \}[,]?\s*$/.test(L[j])) { end = j; break; }
  }
  if (end === -1) return;
  if (!defs.has(name)) defs.set(name, []);
  defs.get(name).push({ start: i, end });
});

const isComment = (s) => /^\s*\/\//.test(s);
const isBlank = (s) => s.trim() === '';

const targets = [];
for (const [name, arr] of defs) {
  if (arr.length < 2) continue;
  const keepIdx = KEEP_FIRST.includes(name) ? 0 : arr.length - 1;
  arr.forEach((seg, idx) => {
    if (idx === keepIdx) return;
    targets.push({ name, idx, ...seg });
  });
}

// 计算删除区间：吞掉上方的“同款注释块”与其上 1 个空行；并吞掉紧随其后的 1 个空行
const ranges = [];
for (const t of targets) {
  let up = t.start;
  while (up - 1 >= 0 && isComment(L[up - 1])) up--;
  if (up === t.start) {
    // 上方不是注释块，不额外上溯（避免误删邻居）
  } else if (up - 1 >= 0 && isBlank(L[up - 1])) {
    up--;
  }
  let down = t.end;
  if (down + 1 < L.length && isBlank(L[down + 1])) down++;
  ranges.push({ name: t.name, from: up, to: down });
}

ranges.sort((a, b) => a.from - b.from);

// 合并重叠或相接的区间（前一个的“尾随空行”可能与下一个的“起始行”重合）
const merged = [];
for (const r of ranges) {
  const last = merged[merged.length - 1];
  if (last && r.from <= last.to) {
    last.to = Math.max(last.to, r.to);
    last.names.push(r.name);
  } else {
    merged.push({ from: r.from, to: r.to, names: [r.name] });
  }
}

const plan = merged.slice().sort((a, b) => b.from - a.from);

console.log('=== 去重计划（' + (APPLY ? 'APPLY' : 'DRY-RUN') + '）===');
const uniqNames = new Set(targets.map(t => t.name));
console.log('重复方法数 =', uniqNames.size, '   待删除副本数 =', targets.length);
console.log('合并后区间数 =', plan.length, '（合并前 ' + ranges.length + '，含重叠）');
let delLines = 0;
plan.slice().reverse().forEach((r) => {
  const n = r.to - r.from + 1;
  delLines += n;
  console.log('  删除行 ' + String(r.from + 1).padStart(6) + '-' + String(r.to + 1).padStart(6) + '（' + String(n).padStart(3) + ' 行）  ' + r.names.join(' + '));
});
console.log('合计删除行数 =', delLines);

if (!APPLY) {
  console.log('\n（dry-run，未写盘。加 --apply 执行）');
  process.exit(0);
}

// 从后往前删除（plan 已按 from 降序）
const out = L.slice();
for (const r of plan) out.splice(r.from, r.to - r.from + 1);
const text = out.join('\n');
fs.writeFileSync(FILE, text, 'utf8');
console.log('\n✅ 已写回 ' + FILE);
console.log('新行数 =', out.length, '（原 ' + L.length + '，差 ' + (L.length - out.length) + '）');
