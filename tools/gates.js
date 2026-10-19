#!/usr/bin/env node
/**
 * 统一门禁入口（零依赖 · 离线 · 确定性）
 * ---------------------------------------------------------------------------
 * 一次跑完本项目的全部门禁，输出合并报告与总退出码：
 *
 *   L1  契约一致性          tools/doc-contract-check.js
 *   L2  结构冒烟（零依赖）   tools/smoke-test.js
 *   MX  Mermaid 图结构校验   tools/mermaid-check.js
 *   L3  业务闭环自检          tools/wb-*-verify.js（9 套，合计 2,068 项断言）
 *   DUP 重复定义检测          tools/dup-method-check.js
 *
 * 用法：
 *   node tools/gates.js                # 严格模式：L1 必须 0 ERROR
 *   node tools/gates.js --baseline    # 日常模式：L1 ≤ 已登记基线视为「存量债务」不阻断
 *   node tools/gates.js l2 l3         # 只跑指定门禁（l1 / l2 / mx / l3 / dup）
 *   node tools/gates.js --quiet       # 只打印每个门禁的结论行
 *
 * 退出码：0 = 通过（含 --baseline 下的存量债务）；1 = 有门禁未通过
 *
 * ⚠️ 为什么用 worker_threads 隔离（本机实测的三条硬约束）：
 *  ① `spawnSync` / `execFileSync` 拉起 node.exe 会抛 **EBUSY**，子进程 stdout 恒为空
 *     —— 这是原 `temp/_run-verify.js` 汇总器"抓不到输出"的根因 → **不能用子进程**。
 *  ② 若在同一进程内 `require` 各套自检：它们会把真实 `setTimeout/setInterval/setImmediate`
 *     交给被测代码且从不清理，**前序套泄漏的回调会在后序套运行期间抛未捕获异常**，
 *     造成**伪失败**（实测 `bankcard`/`withdraw` 后跑 `task-select` 出现 3 项伪失败，
 *     而单独跑 536/536 全过）。仅屏蔽 `setTimeout` **不足以**根治（微任务/`setImmediate`
 *     仍会泄漏），结果**不确定**。
 *  ③ `worker_threads` 在同一进程内开线程，**不受 EBUSY 限制**，且每个 Worker 拥有独立隔离的
 *     JS 环境与事件循环 → 天然消除套间污染，**结果确定**。
 *  故：每个脚本在**独立 Worker** 中运行（`tools/.internal/gate-worker.js` 负责补丁
 *  `console` / `process.exit` 并回传完整输出）。
 *
 * 零依赖：仅用 fs / path / worker_threads。不写盘、不联网。
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { Worker } = require('worker_threads');

const ROOT = path.resolve(__dirname, '..');
const argv = process.argv.slice(2);
const QUIET = argv.includes('--quiet');
const USE_BASELINE = argv.includes('--baseline');
const pick = argv.filter(a => !a.startsWith('--')).map(s => s.toLowerCase());

const BASELINE_FILE = path.join(__dirname, 'gates-baseline.json');
let BASELINE = { l1ErrorBaseline: 0, recordedAt: 'n/a' };
try { BASELINE = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8')); } catch (e) { /* 无基线文件按 0 处理 */ }

const WORKER = path.join(__dirname, '.internal', 'gate-worker.js');
const SUITE_TIMEOUT_MS = 120000;

const L3_SUITES = [
  'wb-bankcard-verify',
  'wb-withdraw-verify',
  'wb-recharge-verify',
  'wb-task-draft-verify',
  'wb-task-select-verify',
  'wb-academy-path-verify',
  'wb-assets-plus-verify',
  'wb-escrow-progress-verify',
  'wb-pro-subscribe-verify',
  'wb-debt-remediation-verify',
  'wb-identity-admission-verify',   // ← 已转绿（CHG-013），计入断言合计
  'wb-content-asset-verify',        // ← 已转绿（CHG-017），计入断言合计
  'wb-growth-academy-verify',       // ← 已转绿（CHG-021），计入断言合计
  'wb-creator-tools-verify',        // ← 已转绿（CHG-023），计入断言合计
  // ↓ 红旗：契约先行 / 冻结自检 —— 已登记为「待实现」，不阻断总判定（见 gates-baseline.json 的 l3ExpectedRed）
  //   注：已转绿的四套须保留在**上方绿套**中（红灯清零 ≠ 可以删；它们是回归防线）；当前**红旗为空**
];

/**
 * 「已登记的红灯」（l3ExpectedRed）
 * ---------------------------------------------------------------------------
 * 依 Constitution 原则 10：「**先跑门禁拿到待实现清单，再动手写代码**；
 * 校验器是本轮 **TODO 生成器**，不是事后检查官」。
 *
 * ⇒ 对"契约已冻结、实现尚未开始"的自检套件，允许其**以红灯身份常驻**：
 *   · 计为 `RED`（不是 FAIL，**不阻断**总判定）；
 *   · **不计入**「断言合计」（红灯不构成证据）；
 *   · 单独报出「已登记待实现：x/y 项」，一眼看到**实现进度**；
 *   · 一旦某套**转绿**，会提示把它从基线中移除（防止红灯被静默遗忘）。
 */
const EXPECTED_RED = new Set(BASELINE.l3ExpectedRed || []);

const GATES = [
  { id: 'l1', label: 'L1 契约一致性', files: ['tools/doc-contract-check.js'] },
  { id: 'dup', label: 'DUP 重复定义检测', files: ['tools/dup-method-check.js'] },
  { id: 'l2', label: 'L2 结构冒烟（零依赖实现）', files: ['tools/smoke-test.js'] },
  { id: 'mx', label: 'MX Mermaid 图结构校验', files: ['tools/mermaid-check.js'] },
  { id: 'l3', label: 'L3 业务闭环自检（' + L3_SUITES.length + ' 套）', files: L3_SUITES.map(s => 'tools/' + s + '.js') }
];

/** 在独立 Worker 中运行一个脚本，返回 {lines, code, mode} */
function runIsolated(relFile) {
  const abs = path.join(ROOT, relFile);
  return new Promise((resolve) => {
    let done = false;
    let out = null;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };

    let w;
    try {
      w = new Worker(WORKER, { workerData: { file: abs } });
    } catch (e) {
      finish({ lines: ['[worker 不可用] ' + e.message], code: 1, mode: 'failed' });
      return;
    }
    const timer = setTimeout(() => {
      try { w.terminate(); } catch (e) {}
      finish({ lines: ['[超时 ' + (SUITE_TIMEOUT_MS / 1000) + 's] ' + path.basename(relFile)], code: 1, mode: 'timeout' });
    }, SUITE_TIMEOUT_MS);

    w.on('message', (m) => {
      clearTimeout(timer);
      const lines = (m && m.lines) || [];
      if (m && m.threw) lines.push('[异常] ' + String(m.threw).split('\n')[0]);
      out = { lines: lines, code: (m && typeof m.code === 'number') ? m.code : 0, mode: 'worker' };
      finish(out);
    });
    w.on('error', (e) => { clearTimeout(timer); finish({ lines: ['[worker error] ' + e.message], code: 1, mode: 'failed' }); });
    w.on('exit', (c) => { clearTimeout(timer); if (!out) finish({ lines: ['[worker 提前退出 code=' + c + ']'], code: (c === 0 ? 0 : 1), mode: 'early-exit' }); });
  });
}

function parseCount(lines) {
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i];
    let m;
    if ((m = /通过\s*[：:]\s*(\d+)\s*\/\s*(\d+)/.exec(l))) return { pass: +m[1], total: +m[2] };
    if ((m = /(\d+)\s*\/\s*(\d+)\s*全通过/.exec(l))) return { pass: +m[1], total: +m[2] };
    if ((m = /(\d+)\s*\/\s*(\d+)\s*通过/.exec(l))) return { pass: +m[1], total: +m[2] };
    if ((m = /全部通过\s*[：:]\s*(\d+)\s*项/.exec(l))) return { pass: +m[1], total: +m[1] };
    if ((m = /通过\s*(\d+)\s*项/.exec(l))) return { pass: +m[1], total: +m[1] };
  }
  return null;
}

function conclusionLine(lines) {
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i].trim();
    if (l && /通过|失败|ERROR|问题|未通过/.test(l)) return l;
  }
  for (let i = lines.length - 1; i >= 0; i--) if (lines[i].trim()) return lines[i].trim();
  return '(无输出)';
}

(async () => {
  const selected = GATES.filter(g => !pick.length || pick.indexOf(g.id) >= 0);
  if (!selected.length) {
    console.log('用法：node tools/gates.js [l1|l2|mx|l3 ...] [--baseline] [--quiet]');
    process.exit(1);
    return;
  }

  console.log('');
  console.log('================= 门禁总览（零依赖 · 离线 · Worker 隔离） =================');
  console.log('项目根：' + ROOT);
  console.log('模式：' + (USE_BASELINE ? '--baseline（L1 ≤ ' + BASELINE.l1ErrorBaseline + ' ERROR 视为存量债务，不阻断）' : '严格（L1 必须 0 ERROR）'));
  console.log('');

  const summary = [];
  let allPass = true;
  let degraded = false;

  for (const gate of selected) {
    let gateFail = false;
    let acc = { pass: 0, total: 0, hasCount: false };
    let redAcc = { pass: 0, total: 0, suites: 0 };
    const perSuite = [];

    for (const f of gate.files) {
      const r = await runIsolated(f);
      if (r.mode !== 'worker') degraded = true;
      const suiteName = path.basename(f, '.js');
      const isExpectedRed = EXPECTED_RED.has(suiteName);
      const c = parseCount(r.lines);

      if (r.code !== 0 && isExpectedRed) {
        // 已登记的红灯：不判 FAIL、不阻断；计数单独归档
        if (c) { redAcc.pass += c.pass; redAcc.total += c.total; }
        redAcc.suites += 1;
      } else {
        if (r.code !== 0) gateFail = true;
        if (c) { acc.pass += c.pass; acc.total += c.total; acc.hasCount = true; }
        if (r.code === 0 && isExpectedRed) {
          perSuite.push({ file: '(基线提示)', code: 0, count: null, lines: ['✅ ' + suiteName + ' 已转绿 —— 请把它从 gates-baseline.json 的 l3ExpectedRed 中移除'], mode: 'baseline' });
        }
      }
      perSuite.push({ file: f, code: r.code, count: c, lines: r.lines, mode: r.mode, expectedRed: (r.code !== 0 && isExpectedRed) });
    }

    let status = gateFail ? 'FAIL' : (redAcc.suites > 0 ? 'RED' : 'PASS');

    // L1 特例：允许按已登记基线降级为 WARN（存量债务），但超基线仍判 FAIL
    if (gate.id === 'l1') {
      const all = perSuite.map(s => s.lines.join('\n')).join('\n');
      const m = /(\d+)\s*个 ERROR/.exec(all);
      const errCount = m ? +m[1] : (gateFail ? -1 : 0);
      acc = { pass: errCount === 0 ? 1 : 0, total: 1, hasCount: true };
      if (errCount === 0) { status = 'PASS'; }
      else if (USE_BASELINE && errCount > 0 && errCount <= BASELINE.l1ErrorBaseline) {
        status = 'WARN';
        perSuite.push({ file: '(基线对照)', code: 0, count: null, lines: ['存量债务 ' + errCount + '/' + BASELINE.l1ErrorBaseline + ' ERROR（登记于 ' + BASELINE.recordedAt + '，不阻断）'], mode: 'baseline' });
      }
    }
    if (status === 'FAIL') allPass = false;

    console.log('[' + status + '] ' + gate.label
      + (gate.id !== 'l1' && acc.hasCount ? '  ·  ' + acc.pass + '/' + acc.total + ' 项' : '')
      + (redAcc.suites > 0 ? '  ·  🔴 已登记待实现 ' + redAcc.pass + '/' + redAcc.total + ' 项（' + redAcc.suites + ' 套）' : '')
      + (gate.files.length > 1 ? '  ·  ' + gate.files.length + ' 套' : ''));

    if (!QUIET) {
      for (const s of perSuite) {
        const name = path.basename(s.file, '.js');
        if (/^\(/.test(name)) { console.log('        --   ' + s.lines[0]); continue; }
        const cnt = s.count ? '  ' + (s.count.total > s.count.pass ? s.count.pass + '/' + s.count.total : s.count.total + ' 项') : '';
        const tag = s.code === 0 ? 'ok  ' : (s.expectedRed ? 'RED ' : 'FAIL');
        console.log('        ' + tag + '  ' + name.padEnd(28) + cnt + (s.mode !== 'worker' ? '  [' + s.mode + ']' : ''));
        if (s.code !== 0) {
          // 红灯套件只摘「真实进度」那一行，避免几十条 TODO 淹掉报告；其余待实现项看该套件自身输出
          const pick = s.expectedRed
            ? (l) => /【功能断言】|【不变量断言】/.test(l)
            : (l) => /失败|ERROR|❌|✗|\[异常\]/.test(l);
          s.lines.filter(pick).slice(0, 10).forEach(l => console.log('              | ' + l));
        }
      }
      console.log('        结论：' + conclusionLine(perSuite[perSuite.length - 1].lines));
    }
    console.log('');
    summary.push({ gate: gate.label, status: status, acc: acc, redAcc: redAcc });
  }

  console.log('================= 汇总 =================');
  for (const s of summary) {
    console.log(' ' + s.status + '  ' + s.gate + (s.acc.hasCount ? '  ·  ' + s.acc.pass + '/' + s.acc.total + ' 项' : '')
      + (s.redAcc && s.redAcc.suites ? '  ·  🔴 待实现 ' + s.redAcc.pass + '/' + s.redAcc.total + ' 项' : ''));
  }
  const grand = summary.reduce((a, s) => ({ pass: a.pass + s.acc.pass, total: a.total + s.acc.total }), { pass: 0, total: 0 });
  const redGrand = summary.reduce((a, s) => ({ pass: a.pass + (s.redAcc ? s.redAcc.pass : 0), total: a.total + (s.redAcc ? s.redAcc.total : 0), suites: a.suites + (s.redAcc ? s.redAcc.suites : 0) }), { pass: 0, total: 0, suites: 0 });
  if (grand.total) console.log(' 断言合计：' + grand.pass + '/' + grand.total + '（**不含**已登记红灯）');
  if (redGrand.suites) console.log(' 🔴 已登记待实现：' + redGrand.pass + '/' + redGrand.total + ' 项（' + redGrand.suites + ' 套）—— 契约已冻结、实现未开始，不构成证据、不阻断');
  if (degraded) console.log(' ⚠️ 存在未在 Worker 中正常运行的脚本（已降级/超时），结论可能不完整');
  console.log(' 总判定：' + (allPass ? '通过 ✅' + (summary.some(s => s.status === 'WARN') ? '（含存量债务 WARN）' : '') : '存在未通过项 ❌'));
  console.log('=========================================');
  console.log('');

  process.exit(allPass ? 0 : 1);
})();
