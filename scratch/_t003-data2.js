'use strict';
/**
 * SPEC-003 Phase 1 · 数据层收口（T-003-10 / 11 / 12 / 13）· 第 2 版（按实测格式）
 * 对象：js/mock_data.js
 *  ⚠️ 实际格式：**无引号 key**、`, ` 单空格分隔（首版按 JSON 风格写 ⇒ 全未命中）
 */
const fs = require('fs');
const P = 'js/mock_data.js';
let s = fs.readFileSync(P, 'utf8');
const before = Buffer.byteLength(s, 'utf8');
let hit = 0; const miss = [];

function sub(a, b, label) {
  if (!s.includes(a)) { miss.push(label); return; }
  const n = s.split(a).length - 1;
  s = s.split(a).join(b);
  hit++;
  console.log('  ✓ ' + label + '（' + n + ' 处）');
}

console.log('=== T-003-12 · paths 阈值 / 命名收敛（Q-003 裁决值） ===');
sub('level: "Lv.1", name: "AI 体验者"', 'level: "Lv.1", name: "体验者"', 'Lv.1 命名「AI 体验者」→「体验者」');
sub('pointsMin: 0, pointsMax: 499,', 'pointsMin: 0, pointsMax: 199,', 'Lv.1 区间 0~499 → 0~199');
sub('level: "Lv.2", name: "AI 创作者"', 'level: "Lv.2", name: "进阶者"', 'Lv.2 命名「AI 创作者」→「进阶者」');
sub('pointsMin: 500, pointsMax: 1499,', 'pointsMin: 200, pointsMax: 499,', 'Lv.2 区间 500~1499 → 200~499');
sub('pointsMin: 1500, pointsMax: 2499,', 'pointsMin: 500, pointsMax: 1999,', 'Lv.3 区间 1500~2499 → 500~1999');
sub('pointsMin: 2500, pointsMax: 3999,', 'pointsMin: 2000, pointsMax: 4999,', 'Lv.4 区间 2500~3999 → 2000~4999');
sub('pointsMin: 4000, pointsMax: null,', 'pointsMin: 5000, pointsMax: null,', 'Lv.5 pointsMin 4000 → 5000');

console.log('=== T-003-13 · requirements[].points 与文字同步（RISK-003-02） ===');
sub('{ text: "累计创作积分达 500", points: 500 }', '{ text: "累计创作积分达 200", points: 200 }', 'Lv.2 requirement 500 → 200');
sub('{ text: "累计创作积分达 1,500", points: 1500 }', '{ text: "累计创作积分达 500", points: 500 }', 'Lv.3 requirement 1,500 → 500');
sub('{ text: "累计创作积分达 2,500", points: 2500 }', '{ text: "累计创作积分达 2,000", points: 2000 }', 'Lv.4 requirement 2,500 → 2,000');
sub('{ text: "累计创作积分达 4,000", points: 4000 }', '{ text: "累计创作积分达 5,000", points: 5000 }', 'Lv.5 requirement 4,000 → 5,000');
// ⚠️ Lv.1「达 100」= 入门里程碑，与 pointsMin=0 不构成「标题 vs 清单」矛盾 ⇒ 保留（CHG-021 记录）
sub('unlock: "累计创作积分达到 2,680 分（Lv.4 门槛 2,400）"', 'unlock: "累计创作积分达到 2,680 分（Lv.4 门槛 2,000）"', '同源门槛文案 Lv.4 2,400 → 2,000');

console.log('=== T-003-10 · studyLog 旧口径修正（4 条 50 → 30） ===');
sub('action: "完成课节", points: 50 }', 'action: "完成课节", points: 30 }', 'studyLog 完成课节流水 50 → 30');

fs.writeFileSync(P, s);
console.log('\n合计命中 ' + hit + ' 处｜字节 ' + before + ' → ' + Buffer.byteLength(s, 'utf8') + (miss.length ? '\n⚠️ 未命中：' + miss.join(' ; ') : ''));
