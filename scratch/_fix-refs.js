'use strict';
/**
 * 修正套件中 `getAssetRefs` 的用法。
 * 实测：`App.getAssetRefs(objectKey)` **只接受一个参数**（无 `refType`），
 *   返回该对象键的**全部**引用 ⇒ 原写法 `getAssetRefs(key, 'post')` 的第二参被忽略，
 *   断言"某类型引用数 === 1"实为"总引用数 === 1" ⇒ **会误判**（如 F2：生成 + 交付 ⇒ 总数 2）。
 * 修正：新增 `refsByType(app, key, refType)` 辅助，并把所有两参调用改为它。
 */
const fs = require('fs');
const P = 'tools/wb-creator-tools-verify.js';
let s = fs.readFileSync(P, 'utf8');
const before = s;
let n = 0;

// ① 加辅助函数（插在 safe / isFn 之后）
const anchor = "function isFn(o, k) { return !!(o && typeof o[k] === 'function'); }";
if (!s.includes('function refsByType(')) {
  if (!s.includes(anchor)) { console.log('未找到 isFn 锚点'); process.exit(1); }
  s = s.replace(anchor, anchor + [
    '',
    '/** 按 `refType` 过滤引用（⚠️ `App.getAssetRefs(key)` **只接受 objectKey**，无 refType 参数） */',
    'function refsByType(app, key, refType) {',
    '  const all = safe(() => app.getAssetRefs(key), []) || [];',
    '  return all.filter(function (r) { return r && r.refType === refType; });',
    '}',
  ].join('\n'));
  n++;
  console.log('① 已新增 refsByType 辅助函数');
}

// ② 替换所有两参 getAssetRefs 调用
const pairs = [
  ["safe(() => s.App.getAssetRefs(key, 'workcloud').length, 0) === 1", "refsByType(s.App, key, 'workcloud').length === 1", 'F1/D21'],
  ["safe(() => s.App.getAssetRefs(key, 'delivery').length, 0) === 1", "refsByType(s.App, key, 'delivery').length === 1", 'F2'],
  ["safe(() => s.App.getAssetRefs(key, 'post').length, 0) === 1", "refsByType(s.App, key, 'post').length === 1", 'F4'],
  ["safe(() => s.App.getAssetRefs(key, 'delivery'), []) || []", "refsByType(s.App, key, 'delivery')", 'F8d'],
  ["safe(() => s.App.getAssetRefs(key, 'post'), []) || []", "refsByType(s.App, key, 'post')", 'F8p'],
  ["safe(() => s.App.getAssetRefs(gA.objectKey, 'delivery').length, 0) === 1", "refsByType(s.App, gA.objectKey, 'delivery').length === 1", 'F11'],
  ["safe(() => s.App.getAssetRefs(key, 'workcloud'), []) || []", "refsByType(s.App, key, 'workcloud')", 'F1 前置'],
];
pairs.forEach(function (p) {
  const c = s.split(p[0]).length - 1;
  if (c > 0) { s = s.split(p[0]).join(p[1]); n += c; console.log('  ✓ ' + p[2] + '（' + c + ' 处）'); }
  else console.log('  · ' + p[2] + ' 未命中（可能已被改）');
});

fs.writeFileSync(P, s);
console.log('套件修正：' + n + ' 处｜' + (before === s ? '⚠️ 无变化' : '已更新'));
