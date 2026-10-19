#!/usr/bin/env node
/**
 * 【过程脚本】mermaid 图块渲染验收：把 design/任务广场设计.md 的 mermaid 块渲染为 SVG + PNG，
 * 落在 scratch/ 供人工肉眼验收（本模型不支持直接读 PNG，故以 HTTP 200 + 产物体积作为结构合法证据）。
 *
 * 用法：node scratch/render-check.js [块号...]      不带参数 = 渲染全部块
 *
 * ⚠️ 为什么用 kroki 而不是 mermaid.ink：
 *    mermaid.ink 是 GET + base64 把图体塞进 URL，§2.2 / §2.3 这种上百行的时序图会直接撞
 *    nginx 414 Request-URI Too Large（其 pako: 压缩编码实测也被拒，返回 400 Unknown diagram error）。
 *    kroki.io 支持 POST 纯文本图体，无 URL 长度限制。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2).map(Number).filter(Boolean);
const DOC = path.join(ROOT, 'design', '任务广场设计.md');

const text = fs.readFileSync(DOC, 'utf8');
const blocks = []; const re = /^[ \t]*```(.*)$/gm;
let inF = false, lang = '', st = -1, m;
while ((m = re.exec(text)) !== null) {
  const l = m[1].trim();
  if (!inF) { inF = true; lang = l; st = m.index + m[0].length; }
  else { if (lang === 'mermaid') blocks.push(text.slice(st, m.index)); inF = false; lang = ''; }
}

function post(pathname, body) {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'kroki.io', path: pathname, method: 'POST',
      headers: { 'Content-Type': 'text/plain', 'Content-Length': Buffer.byteLength(body), 'User-Agent': 'node' }
    }, (res) => {
      const chunks = [];
      res.on('data', (d) => chunks.push(d));
      res.on('end', () => resolve({ code: res.statusCode, buf: Buffer.concat(chunks) }));
    });
    req.on('error', (e) => resolve({ code: 0, buf: Buffer.from(e.message) }));
    req.setTimeout(150000, () => { req.destroy(); resolve({ code: -1, buf: Buffer.from('timeout') }); });
    req.write(body); req.end();
  });
}

(async () => {
  const list = args.length ? args : blocks.map((_, i) => i + 1);
  let bad = 0;
  for (const no of list) {
    const code = blocks[no - 1];
    if (!code) { console.log('块 ' + no + ' 不存在'); bad += 1; continue; }
    for (const [kind, ext] of [['svg', 'svg'], ['png', 'png']]) {
      const t0 = Date.now();
      const r = await post('/mermaid/' + kind, code);
      const ok = r.code === 200;
      if (!ok) bad += 1;
      const dest = path.join(ROOT, 'scratch', 'seq-block' + no + '.' + ext);
      if (ok) fs.writeFileSync(dest, r.buf);
      console.log('块 ' + no + ' / ' + kind.padEnd(4) + ' HTTP ' + r.code
        + '  ' + (Date.now() - t0) + 'ms  ' + Math.round(r.buf.length / 1024) + 'KB'
        + (ok ? '  → scratch/seq-block' + no + '.' + ext
              : '  :: ' + r.buf.toString('utf8').slice(0, 300).replace(/\n/g, ' ')));
    }
  }
  process.exit(bad ? 1 : 0);
})();
