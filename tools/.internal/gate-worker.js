'use strict';
const { parentPort, workerData } = require('worker_threads');
const lines = [];
const push = (...a) => lines.push(a.map(x => (typeof x === 'string' ? x : String(x))).join(' '));
const rl = console.log, re = console.error, rw = console.warn, ri = console.info;
const rx = process.exit;
let code = 0, threw = null;
console.log = push; console.error = push; console.warn = push; console.info = push;
process.exit = (c) => { code = (c === undefined || c === null) ? 0 : Number(c); throw { __gateExit: true }; };
try { require(workerData.file); }
catch (e) { if (!(e && e.__gateExit)) { code = 1; threw = (e && e.stack) || String(e); } }
finally { console.log = rl; console.error = re; console.warn = rw; console.info = ri; process.exit = rx; }
parentPort.postMessage({ code: code, lines: lines, threw: threw });
