#!/usr/bin/env node
/** 【过程脚本·看完即删】把任务详情页真实渲染的 innerHTML 打到 stdout 供人工目检 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const APP_SRC = fs.readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf8');
const MOCK_SRC = fs.readFileSync(path.join(ROOT, 'js', 'mock_data.js'), 'utf8');

class ClassList {
  constructor() { this.set = new Set(); }
  add(...c) { c.forEach(x => this.set.add(x)); }
  remove(...c) { c.forEach(x => this.set.delete(x)); }
  toggle(c, f) { const on = f === undefined ? !this.set.has(c) : !!f; on ? this.set.add(c) : this.set.delete(c); return on; }
  contains(c) { return this.set.has(c); }
}
class El {
  constructor(id) { this.id = id; this.innerText = ''; this.textContent = ''; this.innerHTML = ''; this.value = ''; this.hidden = false; this.disabled = false; this.style = {}; this.classList = new ClassList(); }
  get className() { return Array.from(this.classList.set).join(' '); }
  set className(v) { this.classList.set = new Set(String(v == null ? '' : v).split(/\s+/).filter(Boolean)); }
  getAttribute() { return null; } setAttribute() {} appendChild(c) { return c; }
  addEventListener() {} querySelectorAll() { return []; } querySelector() { return null; }
  getContext() { return null; } scrollIntoView() {}
}
const reg = new Map();
const el = (id) => { if (!reg.has(id)) reg.set(id, new El(id)); return reg.get(id); };
const doc = { getElementById: el, querySelector: () => null, querySelectorAll: () => [], addEventListener: () => {}, body: new El('body') };
['tasks-detail-body', 'task-detail-top-actions', 'tasks-main-shell', 'tasks-publish-page', 'tasks-detail-page', 'tasks-mine-list-container', 'tasks-plaza-list-container'].forEach(el);
const win = { location: { hash: '' }, scrollTo: () => {}, addEventListener: () => {}, setTimeout, clearTimeout, setInterval, clearInterval, document: doc };
const sb = { window: win, document: doc, console, setTimeout, clearTimeout, setInterval, clearInterval, Date, Math, JSON, Object, Array, String, Number, Boolean, RegExp, Error, isNaN, parseInt, parseFloat, encodeURIComponent };
sb.globalThis = sb;
vm.createContext(sb);
vm.runInContext(MOCK_SRC + '\nglobalThis.__MockData = MockData;', sb, { filename: 'mock_data.js' });
vm.runInContext(APP_SRC + '\nglobalThis.__App = App;', sb, { filename: 'app.js' });
const App = sb.__App;
App.showToast = () => {};
App.navigateTo = function (v) { this.currentView = v; };
App.renderTasksPlaza = function () {};
App.renderMyTasks = function () {};
App.renderTasksCharts = function () {};
App.currentView = 'tasks';

function dump(taskId, mode, focus) {
  App.activeTasksMode = mode;
  App.openTaskDetailPage(taskId, focus);
  return { body: el('tasks-detail-body').innerHTML, top: el('task-detail-top-actions').innerHTML };
}
function section(html, startMarker, endMarker) {
  const a = html.indexOf(startMarker);
  if (a < 0) return '  [未找到 ' + startMarker + ']';
  const b = endMarker ? html.indexOf(endMarker, a) : -1;
  return html.slice(a, b > 0 ? b : a + 4000);
}

const creator = dump('TK02', 'mine', 'fulfillment');
const publisher = dump('TK02B', 'mine', 'fulfillment');
const hall = dump('TK02', 'hall');

console.log('================ TK02（我是承接方）· 顶栏 ================');
console.log(creator.top.replace(/</g, '\n<'));
console.log('================ TK02B（我是发布方）· 顶栏 ================');
console.log(publisher.top.replace(/</g, '\n<'));
console.log('================ TK02（大厅访客）· 顶栏 ================');
console.log(hall.top.replace(/</g, '\n<'));
console.log('================ TK02 · 项目进度与日报协同看板 ================');
console.log(section(creator.body, 'id="task-detail-fulfillment"', '商单协同问答'));
console.log('================ TK02 · 协同问答卡 ================');
console.log(section(creator.body, '商单协同问答', 'task-detail-top-actions'));
console.log('================ TK02B · 履约协同看板（发布方只读） ================');
console.log(section(publisher.body, 'id="task-detail-fulfillment"', '商单协同问答'));
console.log('================ TK02（大厅访客）· 脱敏区 ================');
console.log(section(hall.body, '履约日报与项目协同内容仅对合作双方开放', '商单协同问答'));
console.log('================ 一致性检查 ================');
console.log('index.html 是否含 modal-qa-answer : ' + /id="modal-qa-answer"/.test(HTML));
console.log('大厅访客含日报正文? ' + /完成中段尺度跃迁光效合成/.test(hall.body));
console.log('承接方含日报正文?   ' + /完成中段尺度跃迁光效合成/.test(creator.body));
console.log('发布方含日报正文?   ' + /完成中段尺度跃迁光效合成|8 组表情集与 7\/12/.test(publisher.body));
console.log('承接方顶栏含填报日报? ' + /填报项目日报/.test(creator.top));
console.log('发布方顶栏含查看进度与日报? ' + /查看进度与日报/.test(publisher.top));
console.log('承接方顶栏无填报表单越权? ' + !/daily-report-form/.test(hall.body));
