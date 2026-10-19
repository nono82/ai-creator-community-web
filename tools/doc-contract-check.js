#!/usr/bin/env node
/**
 * 设计契约一致性校验器（门禁 L1）
 * ---------------------------------------------------------------------------
 * 作用：把 design/*.md 里声明的契约，与真实代码/磁盘对账。
 *   #id            → 必须在 index.html 存在
 *   App.fnName     → 必须在 js/app.js 里定义
 *   MockData.obj   → 必须在 js/mock_data.js 里定义
 *   assets/...png  → 必须在磁盘存在
 *   .class-name    → 提示级（可能由 JS 模板动态生成，仅告警）
 *
 * 零依赖 · 离线 · 秒级。退出码 0 = 通过，1 = 存在 ERROR。
 *
 * 用法：
 *   node tools/doc-contract-check.js            # 完整报告
 *   node tools/doc-contract-check.js --quiet    # 只输出 ERROR 与汇总
 *
 * 约定：
 *   - design/ 下以 "_" 开头的文件是元文档（规范/模板），不参与校验；
 *   - 确需豁免的 token 写在文档里： <!-- contract-ignore: #old-id, App.oldFn -->
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DESIGN_DIR = path.join(ROOT, 'design');
const QUIET = process.argv.includes('--quiet');
const MAX_WARN_PER_DOC = 12;

function read(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch (e) { return ''; }
}
function exists(p) {
  try { fs.accessSync(p); return true; } catch (e) { return false; }
}
function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

const CODE = {
  html: read(path.join(ROOT, 'index.html')),
  app: read(path.join(ROOT, 'js', 'app.js')),
  mock: read(path.join(ROOT, 'js', 'mock_data.js')),
  charts: read(path.join(ROOT, 'js', 'charts.js')),
  icons: read(path.join(ROOT, 'js', 'icons.js')),
  css: read(path.join(ROOT, 'css', 'style.css'))
};
const JS_ALL = CODE.app + CODE.mock + CODE.charts + CODE.icons;

const isHexColor = (t) => /^[0-9A-Fa-f]{3,8}$/.test(t);

function idInHtml(id) {
  return CODE.html.includes('id="' + id + '"') || CODE.html.includes("id='" + id + "'");
}
function idInJs(id) {
  return new RegExp('["\'`]' + esc(id) + '["\'`]').test(CODE.app);
}
function fnInApp(name) {
  return new RegExp('(^|[^A-Za-z0-9_$])' + esc(name) + '\\s*:', 'm').test(CODE.app)
      || new RegExp('(^|[^A-Za-z0-9_$])' + esc(name) + '\\s*=\\s*(function|\\()', 'm').test(CODE.app);
}
function fieldInMock(name) {
  return new RegExp('(^|[^A-Za-z0-9_$])' + esc(name) + '\\s*:', 'm').test(CODE.mock);
}
function classKnown(name) {
  const re = new RegExp('(?<![A-Za-z0-9_-])' + esc(name) + '(?![A-Za-z0-9_-])');
  return re.test(CODE.html) || re.test(JS_ALL) || re.test(CODE.css);
}

const RE_IGNORE = /contract-ignore\s*:\s*([^\n]+)/g;
const RE_ID = /#([A-Za-z][A-Za-z0-9_-]*)/g;
const RE_FN = /\bApp\.([A-Za-z_][A-Za-z0-9_]*)/g;
const RE_FIELD = /\bMockData\.([A-Za-z_][A-Za-z0-9_]*)/g;
const RE_ASSET = /assets\/[A-Za-z0-9_\-./]+\.(?:png|jpe?g|svg|webp|gif)/g;
const RE_CLASS = /(?<![\w.$-])\.([a-z][a-zA-Z0-9]*(?:-[a-zA-Z0-9]+)*)/g;

// 形如 #ORD-7842 / #TK13 的是业务单号，不是 DOM id
const isCodeLike = (t) => /^[A-Z]{2,}[-_]?\d/.test(t);

function collect(text, re, filter) {
  const set = new Map();
  let m;
  re.lastIndex = 0;
  while ((m = re.exec(text)) !== null) {
    const tok = m[1];
    if (!tok || tok.length < 3) continue;
    if (isHexColor(tok)) continue;
    if (isCodeLike(tok)) continue;
    if (tok.endsWith('-')) continue;
    if (filter && !filter(tok)) continue;
    set.set(tok, (set.get(tok) || 0) + 1);
  }
  return set;
}

/** 检出全局对象上被重复定义的方法名（后定义的会覆盖先定义的，前者成为死代码） */
function findDuplicateKeys(source) {
  const re = /^ {2}([A-Za-z_$][A-Za-z0-9_$]*)\s*:\s*(?:function|\()/gm;
  const seen = new Map();
  let m;
  while ((m = re.exec(source)) !== null) {
    const line = source.slice(0, m.index).split('\n').length;
    if (!seen.has(m[1])) seen.set(m[1], []);
    seen.get(m[1]).push(line);
  }
  return Array.from(seen.entries()).filter((e) => e[1].length > 1);
}

function main() {
  if (!exists(DESIGN_DIR)) {
    console.error('[L1] 未找到 design/ 目录，请在项目根目录运行。');
    process.exit(1);
  }

  const files = fs.readdirSync(DESIGN_DIR)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
    .sort();

  if (files.length === 0) {
    console.error('[L1] design/ 下没有可校验的模块文档。');
    process.exit(1);
  }

  const allErrors = [];
  const allWarns = [];
  const allIgnored = new Set();
  const docReports = [];

  for (const file of files) {
    const text = read(path.join(DESIGN_DIR, file));

    let m;
    RE_IGNORE.lastIndex = 0;
    while ((m = RE_IGNORE.exec(text)) !== null) {
      // 注释体尾部可能带 HTML 注释结束符 `-->`，必须先剥离，否则豁免 token 永远匹配不上
      const body = m[1].replace(/-{2,}>\s*$/, '');
      body.split(/[,，]/).forEach((t) => {
        const tok = t.trim().replace(/^[#.]/, '').replace(/^App\.|^MockData\./, '').trim();
        if (tok) allIgnored.add(tok);
      });
    }

    const ids = collect(text, RE_ID, (t) => t.includes('-') || /^(?:view|modal|search|notify|global|btn|canvas|chart|lightbox|assets|user|opc|profile|streak|tx)(?:[A-Za-z0-9_-]*)$/.test(t));
    const fns = collect(text, RE_FN);
    const fields = collect(text, RE_FIELD);
    const assets = new Set(Array.from(text.matchAll(RE_ASSET), (x) => x[0]));
    const classes = collect(text, RE_CLASS);

    const errors = [];
    const warns = [];

    ids.forEach((_c, id) => {
      if (allIgnored.has(id)) return;
      if (idInHtml(id)) return;
      if (idInJs(id)) {
        warns.push('ID 仅由 JS 动态生成（未静态声明）：#' + id);
        return;
      }
      errors.push('缺少 DOM 节点：#' + id);
    });

    fns.forEach((_c, fn) => {
      if (allIgnored.has(fn)) return;
      if (fnInApp(fn)) return;
      errors.push('缺少 App 函数：App.' + fn + '()');
    });

    fields.forEach((_c, f) => {
      if (allIgnored.has(f)) return;
      if (fieldInMock(f)) return;
      errors.push('缺少 MockData 字段：MockData.' + f);
    });

    assets.forEach((a) => {
      if (exists(path.join(ROOT, a))) return;
      errors.push('缺少素材文件：' + a);
    });

    const unknownClasses = [];
    classes.forEach((_c, cls) => {
      if (allIgnored.has(cls)) return;
      if (!classKnown(cls)) unknownClasses.push(cls);
    });
    unknownClasses.slice(0, MAX_WARN_PER_DOC).forEach((c) => {
      warns.push('类名未在 html/js/css 中出现：.' + c);
    });
    if (unknownClasses.length > MAX_WARN_PER_DOC) {
      warns.push('…另有 ' + (unknownClasses.length - MAX_WARN_PER_DOC) + ' 个未识别的类名（已折叠）');
    }

    allErrors.push(...errors.map((e) => ({ file, msg: e })));
    allWarns.push(...warns.map((w) => ({ file, msg: w })));
    docReports.push({
      file,
      ids: ids.size,
      fns: fns.size,
      fields: fields.size,
      assets: assets.size,
      classes: classes.size,
      errors: errors.length,
      warns: warns.length
    });
  }

  // ── 代码结构自检：全局对象上的重复方法名（后定义覆盖先定义，前者沦为死代码）──
  findDuplicateKeys(CODE.app).forEach(([name, lines]) => {
    allErrors.push({ file: 'js/app.js（结构自检）', msg: '方法被重复定义，' + lines.join(' / ') + ' 行，实际生效的是最后一个：App.' + name });
  });
  findDuplicateKeys(CODE.mock).forEach(([name, lines]) => {
    allErrors.push({ file: 'js/mock_data.js（结构自检）', msg: '字段被重复定义，' + lines.join(' / ') + ' 行，实际生效的是最后一个：' + name });
  });

  const line = '-'.repeat(72);
  console.log('\n' + line);
  console.log(' 设计契约一致性校验 · L1 门禁');
  console.log(' 真源目录：design/（已跳过 _ 开头的元文档）');
  console.log(line);

  console.log('\n【各文档契约声明量】');
  console.log('  ' + '文档'.padEnd(22) + 'id'.padStart(5) + 'fn'.padStart(5) + '字段'.padStart(6) + '素材'.padStart(6) + '类名'.padStart(6) + '  ERROR'.padStart(8));
  docReports.forEach((r) => {
    console.log('  ' + r.file.padEnd(20)
      + String(r.ids).padStart(5)
      + String(r.fns).padStart(5)
      + String(r.fields).padStart(6)
      + String(r.assets).padStart(6)
      + String(r.classes).padStart(6)
      + ('  ' + r.errors).padStart(8));
  });

  console.log('\n' + line);
  if (allErrors.length === 0) {
    console.log(' L1 通过：0 ERROR');
  } else {
    console.log(' L1 未通过：' + allErrors.length + ' 个 ERROR（这就是本轮待实现/待修复清单）');
    console.log(line);
    let lastFile = '';
    allErrors.forEach((e) => {
      if (e.file !== lastFile) {
        console.log('\n  ▸ ' + e.file);
        lastFile = e.file;
      }
      console.log('      ✗ ' + e.msg);
    });
  }

  if (!QUIET && allWarns.length > 0) {
    console.log('\n' + line);
    console.log(' WARN：' + allWarns.length + ' 条（不阻断，建议逐步收敛）');
    console.log(line);
    let lastFile = '';
    allWarns.forEach((w) => {
      if (w.file !== lastFile) {
        console.log('\n  ▸ ' + w.file);
        lastFile = w.file;
      }
      console.log('      ! ' + w.msg);
    });
  }

  if (allIgnored.size > 0) {
    console.log('\n  已按 contract-ignore 豁免：' + Array.from(allIgnored).join(', '));
  }

  console.log('\n' + line);
  console.log(' ERROR ' + allErrors.length + ' ｜ WARN ' + allWarns.length + ' ｜ 文档 ' + files.length + ' 份');
  console.log(allErrors.length === 0
    ? ' 结论：契约与代码一致，可进入 L2 结构冒烟。'
    : ' 结论：请按上方清单补齐后重跑，禁止跳过 ERROR。');
  console.log(line + '\n');

  process.exit(allErrors.length === 0 ? 0 : 1);
}

main();
