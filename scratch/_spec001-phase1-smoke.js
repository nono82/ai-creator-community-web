'use strict';
/**
 * SPEC-001 Phase 1 · 真实行为冒烟（临时，属 scratch/ 过程产物）
 * 目的：断言全绿 ≠ 行为正确（ENV-07）。验证三件事：
 *   ① 默认数据（已实名 / 正常 / 已入驻）⇒ 3 个入口**不得误拦**
 *   ② 未实名 ⇒ 拦截 + Toast 含「实名」+ 弹窗不打开 + 资金零变动
 *   ③ **冻结态 ⇒ 提现被拦截，且提示归因于「账号状态」**（T-001-24 委托化带来的新能力）
 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const APP = fs.readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf8');
const MOCK = fs.readFileSync(path.join(ROOT, 'js', 'mock_data.js'), 'utf8');

class CL { constructor(){this.s=new Set();} add(...c){c.forEach(x=>this.s.add(x));} remove(...c){c.forEach(x=>this.s.delete(x));} toggle(c,f){const on=f===undefined?!this.s.has(c):!!f; on?this.s.add(c):this.s.delete(c); return on;} contains(c){return this.s.has(c);} }
class El { constructor(id){ this.id=id; this.innerText=''; this.innerHTML=''; this.value=''; this.max=''; this.placeholder=''; this.style={}; this.classList=new CL(); this._a={}; }
  getAttribute(n){return this._a[n]===undefined?null:this._a[n];} setAttribute(n,v){this._a[n]=v;} appendChild(c){return c;}
  addEventListener(){} querySelectorAll(){return [];} querySelector(){return null;} scrollIntoView(){} }
const reg = new Map();
const el = (id) => { if(!reg.has(id)) reg.set(id, new El(id)); return reg.get(id); };
const doc = { body: el('__body'), getElementById: (id)=>el(id), querySelector: ()=>null, querySelectorAll: ()=>[], createElement: (t)=>new El('__'+t), addEventListener(){} };

function load() {
  const sb = { console:{log(){},error(){},warn(){},info(){}}, document: doc,
    setTimeout:()=>0, clearTimeout:()=>{}, setInterval:()=>0, clearInterval:()=>{},
    scrollTo:()=>{}, scrollBy:()=>{}, alert:()=>{}, open:()=>null, close:()=>{},
    Date, Math, JSON, parseInt, parseFloat, String, Number, Array, Object, RegExp, isNaN };
  sb.window = sb;
  sb.location = { hash: '', href: '', reload: () => {} };
  vm.createContext(sb);
  vm.runInContext(MOCK, sb, { filename:'mock_data.js' });
  vm.runInContext(APP + '\n;globalThis.__App = App;', sb, { filename:'app.js' });
  return { App: vm.runInContext('__App', sb), MockData: vm.runInContext('MockData', sb) };
}
const num = (s) => parseFloat(String(s==null?0:s).replace(/[,\s¥]/g,'')) || 0;
let pass = 0; const fails = [];
const ok = (c, m) => { c ? pass++ : fails.push(m); };

console.log('== ① 默认数据：3 个入口不得误拦 ==');
{
  const { App, MockData } = load();
  const toasts = [];
  App.showToast = (m) => toasts.push(String(m));
  const w = el('modal-withdraw'); w.classList.remove('active');
  const a = el('modal-task-apply'); a.classList.remove('active');

  const adm = App.checkAdmission('withdraw');
  ok(adm.allowed === true, '①-1 默认数据下 checkAdmission(withdraw).allowed 应为 true，实际 ' + JSON.stringify(adm));

  App.openWithdrawModal('income');
  ok(w.classList.contains('active'), '①-2 【默认已实名】openWithdrawModal 应正常打开（不得误拦）');

  const tid = MockData.tasks.list[0].id;
  App.openTaskApplyModal(tid);
  ok(a.classList.contains('active'), '①-3 【默认已实名】openTaskApplyModal 应正常打开');

  const esc0 = MockData.assets.escrowProjects.length;
  App.submitPublishTask(true);   // 草稿：避免污染招募中列表
  ok(MockData.assets.escrowProjects.length === esc0 + 1, '①-4 【默认已实名】submitPublishTask 应正常托管（' + esc0 + ' → ' + MockData.assets.escrowProjects.length + '）');
  // ⚠️ 断言修正：成功发布本就会产生一条**成功** Toast；此处应断言「未出现**拦截** Toast」
  ok(!toasts.some((t) => /需先完成/.test(t)), '①-5 默认路径不应出现任何拦截 Toast，实际 ' + JSON.stringify(toasts));
}

console.log('== ② 未实名：拦截 + 可观察原因 + 零副作用 ==');
{
  const { App, MockData } = load();
  const toasts = []; App.showToast = (m) => toasts.push(String(m));
  let securityOpenedWith = null;
  const orig = App.openSecuritySettings.bind(App);
  App.openSecuritySettings = function (f) { securityOpenedWith = f; return orig(f); };

  MockData.currentUser.idVerified = false;
  const w = el('modal-withdraw'); w.classList.remove('active');
  const snap = () => JSON.stringify([MockData.assets.cards, (MockData.assets.transactions||[]).length]);
  const before = snap();

  App.openWithdrawModal('income');
  ok(!w.classList.contains('active'), '②-1 未实名时提现弹窗不得打开');
  ok(/实名/.test(toasts.join('|')), '②-2 拦截 Toast 须含「实名」，实际 ' + JSON.stringify(toasts));
  ok(securityOpenedWith === '实名认证', '②-3 引导入口应为「实名认证」，实际 ' + JSON.stringify(securityOpenedWith));
  ok(snap() === before, '②-4 拦截后资金状态应零变动');
  ok(MockData.assets.escrowProjects.length === 6, '②-5 escrowProjects 应仍为 6');
  ok(MockData.tasks.myOrders.length === 23, '②-6 myOrders 应仍为 23');

  // 审计留痕
  const audit = App.getAuditLog('admission-block');
  ok(audit.length >= 1 && audit[audit.length - 1].action === 'withdraw',
    '②-7 应产生审计留痕且可回放，实际 ' + JSON.stringify(audit));
}

console.log('== ③ 冻结态 ⇒ 提现拦截且归因于「账号状态」（T-001-24 委托化的新能力）==');
{
  const { App, MockData } = load();
  const toasts = []; App.showToast = (m) => toasts.push(String(m));
  let securityOpenedWith = null; App.openSecuritySettings = function (f) { securityOpenedWith = f; };

  MockData.currentUser.idVerified = true;       // 实名没问题
  MockData.currentUser.accountStatus = '冻结';   // 但账号被冻结

  const r = App.checkAdmission('withdraw');
  ok(r.allowed === false && r.missing[0] === '账号状态',
    '③-1 冻结态应以「账号状态」为由拦截，实际 ' + JSON.stringify(r));

  App.submitWithdraw();
  const last = toasts[toasts.length - 1] || '';
  ok(/账号状态/.test(last), '③-2 提现拦截提示应归因于「账号状态」（旧实现会说"未实名"——错误归因），实际 ' + JSON.stringify(last));
  ok(/不能提现/.test(last), '③-3 仍须保留「不能提现」口径（既有断言）');
  ok(securityOpenedWith === '账号状态', '③-4 引导项应为真实缺失项，实际 ' + JSON.stringify(securityOpenedWith));

  // 权益保留（SC-001-12）
  ok(num(MockData.currentUser.learningPointsLifetime) === 4120, '③-5 冻结不得清零累计创作积分');
  ok(Number(MockData.currentUser.level) === 4, '③-6 冻结不得使等级失效');
}

console.log('== ④ 年龄闸门边界（R2 口径）==');
{
  const { App } = load();
  const d = new Date(); const y = d.getFullYear();
  const pad = (n) => String(n).padStart(2, '0');
  const todayMD = pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const r18 = App.evaluateAgeGate((y - 18) + '-' + todayMD);   // 恰好 18 岁生日当天
  ok(r18.passed === true, '④-1 生日当天应通过（SC-001-18），实际 ' + JSON.stringify(r18));
  const r18b = App.evaluateAgeGate((y - 18 + 1) + '-' + todayMD); // 差一天满 18
  ok(r18b.passed === false, '④-2 差一天满 18 应拒绝，实际 ' + JSON.stringify(r18b));
  // ⚠️ 断言修正：2008-02-29（有效闰日）在 2026-09 已满 18 ⇒ 应**通过**，不是拒绝
  ok(App.evaluateAgeGate('2008-02-29').passed === true, '④-3a 有效闰日出生且已成年应通过（闰日须能被正确解析）');
  ok(App.evaluateAgeGate('2009-02-29').passed === false, '④-3b 非闰年的 2/29 不存在 ⇒ 不可解析 ⇒ 应拒绝');
  ok(App.evaluateAgeGate('2026-02-30').passed === false, '④-4 不存在的日期应拒绝（2/30）');
  ok(App.evaluateAgeGate('2030-01-01').passed === false, '④-5 未来出生日期应拒绝');
  ok(App.evaluateAgeGate('').passed === false && App.evaluateAgeGate('').reason.length > 0, '④-6 空串应拒绝且 reason 非空');
  // 防规避计数（调用方计数，纯函数不受影响）
  const n1 = App.bumpAgeGateReject('110101199001011234');
  const n2 = App.bumpAgeGateReject('110101199001011234');
  ok(n2 === n1 + 1 && App.getAdmissionFunnel().byIdentity['110101199001011234'] === n2,
    '④-7 防规避计数应可观察，实际 ' + JSON.stringify(App.getAdmissionFunnel()));
  ok(App.evaluateAgeGate('2000-01-01').passed === true && App.getAdmissionFunnel().ageGateReject === n2,
    '④-8 evaluateAgeGate 须保持纯函数（调用它不得改变计数）');
}

console.log('');
console.log('通过 ' + pass + ' / ' + (pass + fails.length));
fails.forEach((f, i) => console.log('  ✗ ' + (i + 1) + '. ' + f));
process.exit(fails.length ? 1 : 0);
