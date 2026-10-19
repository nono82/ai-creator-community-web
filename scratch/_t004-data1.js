'use strict';
/**
 * SPEC-004 · T-004-04 / T-004-05：数据层改动（**只加不改**）
 * ---------------------------------------------------------------------------
 * ① `allTools` 8 项各补 `integration`（三值之一；**三模式均须有样本**）
 * ② `allTools` **新增 TL9「AI 音乐」** —— 因为 `myToolbox` 的 5 项**并非** `allTools` 的子集
 *    （实测：`myToolbox` 的名字与 `allTools` 不同名，且有「AI 音乐」在 `allTools` 中完全没有）
 * ③ `myToolbox` 5 项各补 `id`（指向 `allTools`；**不得悬空**）
 * ④ `leaderboard` 5 项各补 `id`（指向 `allTools`）
 */
const fs = require('fs');
const P = 'js/mock_data.js';
let L = fs.readFileSync(P, 'utf8').split(/\r?\n/);
const before = L.length;

// ---------------- ① + ② allTools 的 integration 与新增 TL9 ----------------
const INTEG = {
  TL1: 'native',
  TL2: 'native',
  TL3: 'native',
  TL4: 'third-integrated',
  TL5: 'native',
  TL6: 'third-integrated',
  TL7: 'third-external',
  TL8: 'native',
};
let add = 0;
Object.keys(INTEG).forEach(function (id) {
  const i = L.findIndex(function (l) { return l.indexOf('id: "' + id + '",') >= 0; });
  if (i < 0) { console.log('  ⚠️ 未找到 ' + id); return; }
  // 从该对象起，找块内最后一行 score（块末尾）
  let j = -1;
  for (let k = i; k < i + 12; k++) {
    if (/^\s+score: [\d.]+\s*$/.test(L[k] || '')) { j = k; break; }
  }
  if (j < 0) { console.log('  ⚠️ ' + id + ' 未找到 score 行'); return; }
  L[j] = L[j].replace(/\s*$/, '') + ',\n        integration: "' + INTEG[id] + '"';
  add++;
});
console.log('① allTools 补 integration：' + add + '/8');

// ② 新增 TL9（插在 TL8 对象之后、`]` 之前）
const iTL8 = L.findIndex(function (l) { return l.indexOf('id: "TL8",') >= 0; });
if (iTL8 > 0 && !L.some(function (l) { return l.indexOf('id: "TL9"') >= 0; })) {
  let closeIdx = -1;
  for (let k = iTL8; k < iTL8 + 14; k++) { if (/^\s+\}\s*$/.test(L[k] || '')) { closeIdx = k; break; } }
  if (closeIdx > 0) {
    const tl9 = [
      '      },',
      '      {',
      '        id: "TL9",',
      '        name: "AI 音乐",',
      '        desc: "生成原创配乐与人声旋律，可导出分轨",',
      '        category: "音频处理",',
      '        users: "4.2万人使用",',
      '        icon: "music",',
      '        color: "#EC4899",',
      '        score: 4.5,',
      '        integration: "third-external",',
      '        externalUrl: "https://example.com/ai-music"',
    ];
    L.splice(closeIdx, closeIdx - closeIdx + 1, ...tl9);
    console.log('② allTools 新增 TL9「AI 音乐」（third-external，含 externalUrl）');
  } else { console.log('② ⚠️ 未找到 TL8 对象闭合位置'); }
} else {
  console.log('② TL9 已存在或未找到 TL8');
}

// ---------------- ③ myToolbox 补 id ----------------
const MB_MAP = {
  'AI 文案助手': 'TL1',
  'AI 图片生成': 'TL2',
  '智能剪辑': 'TL3',
  '配音合成': 'TL4',
  'AI 音乐': 'TL9',
};
let mb = 0;
Object.keys(MB_MAP).forEach(function (nm) {
  const i = L.findIndex(function (l) { return l.indexOf('{ name: "' + nm + '"') >= 0; });
  if (i < 0) { console.log('  ⚠️ 未找到 myToolbox 项：' + nm); return; }
  L[i] = L[i].replace('{ name: "' + nm + '"', '{ id: "' + MB_MAP[nm] + '", name: "' + nm + '"');
  mb++;
});
console.log('③ myToolbox 补 id：' + mb + '/5');

// ---------------- ④ leaderboard 补 id ----------------
const LB_MAP = { 'AI 图像生成': 'TL2', '智能视频剪辑': 'TL3', 'AI 长文写作': 'TL1', 'AI 配音合成': 'TL4', 'AI 封面设计': 'TL5' };
let lb = 0;
Object.keys(LB_MAP).forEach(function (nm) {
  const i = L.findIndex(function (l) { return /^\s+\{ rank: \d+, name: "/.test(l) && l.indexOf('name: "' + nm + '"') >= 0; });
  if (i < 0) { console.log('  ⚠️ 未找到 leaderboard 项：' + nm); return; }
  L[i] = L[i].replace('{ rank: ', '{ id: "' + LB_MAP[nm] + '", rank: ');
  lb++;
});
console.log('④ leaderboard 补 id：' + lb + '/5');

fs.writeFileSync(P, L.join('\n'));
console.log('mock_data.js：行数 ' + before + ' → ' + L.length + '｜字节 ' + Buffer.byteLength(fs.readFileSync(P, 'utf8'), 'utf8'));
