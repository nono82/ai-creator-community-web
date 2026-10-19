'use strict';
/** F11 诊断：复现「先 A 后 B，引用 A」的序列，打印中间状态。 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const APP_SRC = fs.readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf8');
const MOCK_SRC = fs.readFileSync(path.join(ROOT, 'js', 'mock_data.js'), 'utf8');

class CL { constructor() { this.s = new Set(); } add(...c) { c.forEach(x => this.s.add(x)); } remove(...c) { c.forEach(x => this.s.delete(x)); } toggle(c, f) { const on = f === undefined ? !this.s.has(c) : !!f; if (on) this.s.add(c); else this.s.delete(c); return on; } contains(c) { return this.s.has(c); } }
class El { constructor(id) { this.id = id; this._a = {}; this.innerText = ''; this.textContent = ''; this.innerHTML = ''; this.value = ''; this.hidden = false; this.disabled = false; this.style = {}; this.classList = new CL(); } getAttribute(n) { return this._a[n] === undefined ? null : this._a[n]; } setAttribute(n, v) { this._a[n] = v; } appendChild(c) { return c; } addEventListener() {} querySelectorAll() { return []; } querySelector() { return null; } }
const reg = new Map();
const el = (id) => { if (!reg.has(id)) reg.set(id, new El(id)); return reg.get(id); };
const doc = { body: el('__b'), getElementById: (id) => el(id), querySelector: () => null, querySelectorAll: () => [], createElement: (t) => new El('__' + t), addEventListener() {} };
const toasts = [];
function load() {
  const sb = { console: { log() {}, error() {}, warn() {}, info() {} }, document: doc, location: { hash: '', href: 'http://localhost/', pathname: '/' }, setTimeout: (fn) => { try { if (typeof fn === 'function') fn(); } catch (e) {} return 0; }, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {}, localStorage: (function () { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), clear: () => m.clear() }; })(), Date, Math, JSON, parseInt, parseFloat, String, Number, Array, Object, RegExp, isNaN, isFinite };
  sb.window = sb; vm.createContext(sb);
  vm.runInContext(MOCK_SRC, sb, { filename: 'm.js' });
  vm.runInContext(APP_SRC + '\n;globalThis.__App = App;', sb, { filename: 'app.js' });
  const App = vm.runInContext('__App', sb);
  if (typeof App.showToast === 'function') App.showToast = function (m) { toasts.push(String(m == null ? '' : m)); };
  return { App, MockData: vm.runInContext('MockData', sb) };
}
const safe = (f, d) => { try { return f(); } catch (e) { return d === undefined ? null : d; } };
const refsByType = (app, key, rt) => (safe(() => app.getAssetRefs(key), []) || []).filter(r => r && r.refType === rt);

const s = load();
const tm = (s.MockData.tools.allTools || []).find(t => t.integration === 'native');
console.log('native 工具:', tm && tm.id, tm && tm.name);
console.log('初始 self:', safe(() => s.App.getComputeBalances().self));

const mk = (c) => {
  const pp = safe(() => s.App.preauthorizeGenerate(tm && tm.id, c));
  console.log('  preauthorize(' + c + ') =>', JSON.stringify(pp && { ok: pp.ok, source: pp.source, cost: pp.cost, reason: pp.reason }));
  if (!pp || pp.ok !== true) return null;
  const g = safe(() => s.App.generateFromTicket(pp.ticket, c));
  console.log('  generateFromTicket =>', JSON.stringify(g));
  return g;
};
const gA = mk('产物 A 的内容');
const gB = mk('产物 B 的内容');
console.log('gA:', JSON.stringify(gA), '| gB:', JSON.stringify(gB));
const keyA = gA && gA.objectKey;
console.log('keyA:', keyA);
console.log('refs(A) after gen:', JSON.stringify(safe(() => s.App.getAssetRefs(keyA))));

s.App.lastStudioDraft = { objectKey: keyA || '', title: 'A', content: '产物 A 的内容', cover: 'c', toolTitle: 'T' };
const r = safe(() => { s.App.submitStudioToTask(); return 'done'; });
console.log('submitStudioToTask =>', r, '| toasts:', JSON.stringify(toasts.slice(-2)));
console.log('refs(A) after delivery:', JSON.stringify(safe(() => s.App.getAssetRefs(keyA))));
console.log('delivery 计数:', refsByType(s.App, keyA, 'delivery').length);

// 附带：myOrders 的 id
const orders = (s.MockData.tasks && s.MockData.tasks.myOrders) || [];
console.log('myOrders 数量:', orders.length, '| 首条 id:', orders[0] && (orders[0].id || orders[0].orderId), '| statusKey:', orders[0] && orders[0].statusKey);
console.log('ASSET_REF_TYPES:', JSON.stringify(s.App.ASSET_REF_TYPES));
