#!/usr/bin/env node
/**
 * Mermaid 图结构校验器（离线 · 零依赖）
 * ---------------------------------------------------------------------------
 * 作用：静态校验 design/*.md 里所有 ```mermaid 围栏块的结构合法性，
 *      在无法运行图表渲染器的前提下，提前捕获「整图渲染失败」这类低级错误。
 *      （L2 结构冒烟依赖 Playwright，当前环境不可用；本脚本是它的离线补充。）
 *
 * 校验项：
 *   ① 围栏配对：每个 ```mermaid 必须被闭合，且不得嵌套
 *   ② sequenceDiagram：
 *      - alt / loop / opt / rect / par / critical / break 与 end 数量配对
 *      - else 必须落在 alt 块内（只有 else 没有 alt = 语法错误）
 *      - else 的宿主块必须是 alt（栈式回溯：else 落在 opt / loop / par 内经全局计数发现不了）
 *      - participant / actor 必须带 `as` 别名
 *      - 消息行必须含合法箭头（->>  -->>  -x  --x  -)  --)）
 *      - Note over / left of / right of 必须带说明文本
 *   ③ stateDiagram-v2：
 *      - 花括号 {} 配对
 *      - 至少存在一条 [*] --> 初始转移
 *      - 状态名不得含半角冒号或等号（避免解析歧义）
 *   ④ 其他图类型（flowchart / erDiagram / gantt ...）仅做类型识别，不深校验
 *
 * 零依赖 · 离线 · 秒级。退出码 0 = 通过，1 = 存在问题。
 *
 * 用法：
 *   node tools/mermaid-check.js            # 完整报告
 *   node tools/mermaid-check.js --quiet    # 只输出问题与汇总
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DESIGN_DIR = path.join(ROOT, 'design');
const QUIET = process.argv.includes('--quiet');

/** 会以 end 收尾的块级关键字（sequenceDiagram） */
const SEQ_BLOCK_OPENERS = ['alt', 'loop', 'opt', 'rect', 'par', 'critical', 'break'];
const ARROWS = /(-->>|->>|--x|-x|--\)|-\))/;
const SEQ_KEYWORD = /^(autonumber|sequenceDiagram|participant|actor|Note|alt|else|end|rect|loop|opt|par|critical|break|activate|deactivate|link|links|box|create|destroy)\b/;
/** 已知图类型前缀（不深校验，仅避免误判为错误） */
const KNOWN_TYPES = ['sequenceDiagram', 'stateDiagram-v2', 'stateDiagram', 'flowchart', 'graph',
  'classDiagram', 'erDiagram', 'gantt', 'pie', 'journey', 'gitGraph', 'mindmap', 'timeline',
  'quadrantChart', 'xychart', 'sankey', 'block', 'packet', 'architecture'];

function read(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch (e) { return ''; }
}

/** 围栏配对：返回 [问题数组, mermaid 块数组] */
function extractBlocks(text) {
  const errs = [];
  const blocks = [];
  const fenceRe = /^[ \t]*```(.*)$/gm;
  let inFence = false;
  let fenceLang = '';
  let startIdx = -1;
  let m;
  while ((m = fenceRe.exec(text)) !== null) {
    const lang = m[1].trim();
    if (!inFence) {
      inFence = true;
      fenceLang = lang;
      startIdx = m.index + m[0].length;
    } else {
      if (lang !== '') errs.push('第 ' + (text.slice(0, m.index).split('\n').length) + ' 行围栏在未闭合时又开启了新围栏（疑似缺少闭合 ```）');
      if (fenceLang === 'mermaid') blocks.push(text.slice(startIdx, m.index));
      inFence = false;
      fenceLang = '';
    }
  }
  if (inFence) errs.push('存在未闭合的围栏（缺少结尾 ```）');
  return [errs, blocks];
}

function checkSequence(lines, errs) {
  const cnt = (re) => lines.filter((l) => re.test(l)).length;
  const opened = SEQ_BLOCK_OPENERS.reduce((sum, k) => sum + cnt(new RegExp('^\\s*' + k + '\\b')), 0);
  const closed = cnt(/^\s*end\s*$/);
  if (opened !== closed) {
    const detail = SEQ_BLOCK_OPENERS.map((k) => [k, cnt(new RegExp('^\\s*' + k + '\\b'))])
      .filter((e) => e[1]).map((e) => e[0] + '=' + e[1]).join(' ');
    errs.push('块级关键字与 end 不配对：开块 [' + (detail || '无') + '] 共 ' + opened + ' 个，end ' + closed + ' 个');
  }
  const altN = cnt(/^\s*alt\b/);
  const elseN = cnt(/^\s*else\b/);
  if (elseN > 0 && altN === 0) errs.push('存在 else 但缺少 alt，语法非法');

  // ── else 宿主块栈式回溯 ──
  // 全局计数只能发现「有 else 无 alt」，却查不出 else 落在了 opt / loop / par 内部
  // （计数完全相等，但渲染语义非法）。这里用栈还原真实的块嵌套关系。
  const stack = [];
  lines.forEach((raw, i) => {
    const t = raw.trim();
    if (!t || t.startsWith('%%')) return;
    const opener = SEQ_BLOCK_OPENERS.find((k) => new RegExp('^' + k + '\\b').test(t));
    if (opener) { stack.push({ kind: opener, line: i + 1 }); return; }
    if (/^else\b/.test(t)) {
      const top = stack[stack.length - 1];
      if (top && top.kind !== 'alt') {
        errs.push('第 ' + (i + 1) + ' 行 else 落在 ' + top.kind + ' 块（第 ' + top.line + ' 行）内，else 只能直接属于 alt');
      }
      return;
    }
    if (/^end\s*$/.test(t)) stack.pop();
  });

  lines.forEach((l, i) => {
    const t = l.trim();
    const no = i + 1;
    if (!t || t.startsWith('%%')) return;
    if (/^(participant|actor)\s/.test(t) && !/\sas\s/.test(t)) {
      errs.push('第 ' + no + ' 行 ' + t.split(/\s/)[0] + ' 缺少 as 别名');
      return;
    }
    if (SEQ_KEYWORD.test(t)) return;
    if (!ARROWS.test(t)) errs.push('第 ' + no + ' 行疑似非法消息（无合法箭头）：' + t.slice(0, 46));
  });

  lines.forEach((l, i) => {
    if (/^\s*Note\s+(over|left of|right of)\s/.test(l) && !/:\s*\S/.test(l)) {
      errs.push('第 ' + (i + 1) + ' 行 Note 缺少说明文本');
    }
  });
}

function checkState(lines, errs) {
  let depth = 0;
  lines.forEach((l, i) => {
    const t = l.trim();
    const no = i + 1;
    if (/^state\s+[^{]*\{/.test(t)) {
      depth++;
      const name = t.replace(/^state\s+/, '').replace(/\s*\{.*$/, '').trim();
      if (!name) errs.push('第 ' + no + ' 行 state 块缺少状态名');
      else if (/[:=]/.test(name)) errs.push('第 ' + no + ' 行状态名含半角冒号或等号，易解析歧义：' + name);
    } else if (/^\}\s*$/.test(t)) {
      depth--;
    }
  });
  if (depth !== 0) errs.push('花括号不平衡：' + (depth > 0 ? '缺少 ' + depth + ' 个 }' : '多出 ' + -depth + ' 个 }'));
  if (!lines.some((l) => /^\s*\[\*\]\s*-->/.test(l))) errs.push('缺少 [*] --> 初始转移');
}

function main() {
  if (!fs.existsSync(DESIGN_DIR)) {
    console.error('[Mermaid] 未找到 design/ 目录，请在项目根目录运行。');
    process.exit(1);
  }

  const files = fs.readdirSync(DESIGN_DIR).filter((f) => f.endsWith('.md')).sort();
  const reports = [];
  let problemTotal = 0;

  for (const file of files) {
    const text = read(path.join(DESIGN_DIR, file));
    const [fenceErrs, blocks] = extractBlocks(text);

    fenceErrs.forEach((e) => {
      reports.push({ file, block: '-', kind: '(围栏)', lines: 0, errs: [e] });
      problemTotal++;
    });

    blocks.forEach((body, bi) => {
      const lines = body.split(/\r?\n/);
      const head = lines.find((l) => l.trim() && !l.trim().startsWith('%%'));
      const kind = head ? head.trim() : '(空块)';
      const errs = [];

      if (/^sequenceDiagram/.test(kind)) {
        checkSequence(lines, errs);
      } else if (/^stateDiagram/.test(kind)) {
        checkState(lines, errs);
      } else if (!KNOWN_TYPES.some((t) => kind.startsWith(t))) {
        errs.push('未识别的图类型：' + kind.slice(0, 40));
      }

      reports.push({ file, block: String(bi + 1), kind: kind.split(/\s/)[0], lines: lines.length, errs });
      problemTotal += errs.length;
    });
  }

  const line = '-'.repeat(72);
  const bad = reports.filter((r) => r.errs.length);

  if (!QUIET) {
    console.log('\n' + line);
    console.log(' Mermaid 图结构校验 · 离线门禁');
    console.log(' 扫描范围：design/*.md（含 _ 开头元文档）');
    console.log(line);
    console.log('\n  ' + '文档'.padEnd(24) + '块'.padStart(3) + '类型'.padStart(20) + '行数'.padStart(7) + '  状态');
    reports.forEach((r) => {
      console.log('  ' + r.file.padEnd(22) + r.block.padStart(3) + r.kind.padStart(20)
        + String(r.lines).padStart(7) + '  ' + (r.errs.length ? '✗ ' + r.errs.length : '✓'));
    });
  }

  if (problemTotal > 0) {
    console.log('\n' + line);
    console.log(' 发现 ' + problemTotal + ' 个结构问题：');
    bad.forEach((r) => {
      console.log('\n  ▸ ' + r.file + ' [块 ' + r.block + ']');
      r.errs.forEach((e) => console.log('      ✗ ' + e));
    });
  }

  console.log('\n' + line);
  console.log(' 问题 ' + problemTotal + ' ｜ 图块 ' + reports.length + ' ｜ 文档 ' + files.length + ' 份');
  console.log(problemTotal === 0
    ? ' 结论：所有 Mermaid 图块结构合法，可正常渲染。'
    : ' 结论：请修复上方结构问题后重跑，结构错误会导致整图渲染失败。');
  console.log(line + '\n');

  process.exit(problemTotal === 0 ? 0 : 1);
}

main();
