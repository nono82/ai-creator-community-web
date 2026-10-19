#!/usr/bin/env node
/**
 * dup 子门禁 · 全局对象重复定义检测（零依赖 · 离线）
 * ---------------------------------------------------------------------------
 * 背景：本项目宿主对象是**单个对象字面量**（`const App = { ... }`）。JS 中同名键
 * **末次生效、前一份成为死代码** ⇒ 修改"前一份"会**静默失效**（改了像没改）。
 * 该缺陷曾真实存在 25 处（2026-09-24 已清零，见 CHG-007）。
 *
 * 检查对象：
 *   ① js/app.js        —— 方法键（`name: function` / `name(args) {`）
 *   ② js/mock_data.js  —— 字段键（同上规则）
 *
 * 用法：
 *   node tools/dup-method-check.js             # 严格：0 处重复才算通过
 *   node tools/dup-method-check.js --quiet     # 只打印结论
 *
 * 裁决白名单：在 tools/gates-baseline.json 中登记
 *   { "dupAllowlist": ["方法名A", "方法名B"] }
 * 仅用于"已知且已裁决、暂未清理"的例外；**新出现的重复一律 FAIL**。
 *
 * 退出码：0 = 通过；1 = 存在未在白名单中的重复定义
 * 零依赖：仅用 fs / path；不写盘、不联网。
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const QUIET = process.argv.includes('--quiet');
const BASELINE_FILE = path.join(__dirname, 'gates-baseline.json');

let BASELINE = {};
try { BASELINE = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8')); } catch (e) { /* 无基线文件 */ }
const ALLOW = new Set((BASELINE.dupAllowlist || []).map(String));

const TARGETS = [
  { file: 'js/app.js', label: 'App' },
  { file: 'js/mock_data.js', label: 'MockData' }
];

// 顶层三空格内联键：`  name: ...` 或 `  name(args) {`
const RE_KEY = /^  ([A-Za-z_$][\w$]*)\s*:/;
const RE_METHOD = /^  ([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/;

function scan(relFile) {
  const abs = path.join(ROOT, relFile);
  if (!fs.existsSync(abs)) return null;
  const lines = fs.readFileSync(abs, 'utf8').split(/\r?\n/);
  const seen = new Map();
  lines.forEach((l, i) => {
    let m = l.match(RE_METHOD);
    if (!m) m = l.match(RE_KEY);
    if (!m) return;
    const name = m[1];
    if (!seen.has(name)) seen.set(name, []);
    seen.get(name).push(i + 1);
  });
  const dups = [];
  for (const [name, at] of seen) {
    if (at.length > 1) dups.push({ name, at });
  }
  return { file: relFile, total: seen.size, dups };
}

const results = [];
let fail = 0;
let allowedHits = 0;
let totalKeys = 0;

for (const t of TARGETS) {
  const r = scan(t.file);
  if (!r) continue;
  results.push(r);
  totalKeys += r.total;
  for (const d of r.dups) {
    if (ALLOW.has(d.name)) { allowedHits++; continue; }
    fail++;
  }
}

if (!QUIET) {
  console.log('');
  console.log('------------------------------------------------------------------------');
  console.log(' dup 子门禁 · 全局对象重复定义检测');
  console.log(' 规则：同名键末次生效，前一份为死代码 ⇒ 改到前一份会静默失效');
  console.log('------------------------------------------------------------------------');
  console.log('');
  for (const r of results) {
    console.log('  ' + r.file.padEnd(18) + ' 键数 ' + String(r.total).padStart(4) + '   重复 ' + r.dups.length);
    for (const d of r.dups) {
      const tag = ALLOW.has(d.name) ? '（白名单已裁决）' : ' ← 需清理';
      console.log('      ✗ ' + d.name + '  行 ' + d.at.join(' / ') + tag);
    }
  }
  console.log('');
  if (allowedHits) console.log('  白名单豁免：' + allowedHits + ' 处');
  console.log('------------------------------------------------------------------------');
}

if (fail === 0) {
  console.log(' dup 检查：全部通过：' + totalKeys + ' 项（0 处未裁决重复）');
  console.log('------------------------------------------------------------------------');
  console.log('');
  process.exit(0);
}

console.log(' dup 检查未通过：' + fail + ' 处未裁决重复定义（见上方清单）');
console.log(' 提示：清理后重跑；若属"已裁决但暂缓"，请登记到 tools/gates-baseline.json 的 dupAllowlist');
console.log('------------------------------------------------------------------------');
console.log('');
process.exit(1);
