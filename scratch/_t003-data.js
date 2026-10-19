'use strict';
/**
 * SPEC-003 Phase 1 · 数据层收口（T-003-10 / 11 / 12 / 13）
 * 对象：js/mock_data.js
 *  🔴 全部为**定点字符串替换**（先检查命中、逐处报告），不做全局正则换。
 *  ⚠️ 顺序前提（plan.md §4.3 陷阱 1 / 2）：
 *     · paths 阈值收敛须晚于 evaluateLevelUp 读真源  ✅ 已完成
 *     · progress 改派生须晚于 markLessonDone 建立写入点  ✅ 已完成
 */
const fs = require('fs');
const P = 'js/mock_data.js';
let s = fs.readFileSync(P, 'utf8');
const before = Buffer.byteLength(s, 'utf8');
let hit = 0, miss = [];

function sub(a, b, label) {
  if (!s.includes(a)) { miss.push(label); return; }
  const n = s.split(a).length - 1;
  s = s.split(a).join(b);
  hit++;
  console.log('  ✓ ' + label + '（' + n + ' 处）');
}

console.log('=== T-003-12 / 13 · academy.paths 阈值与命名收敛（Q-003 裁决值） ===');
// Lv.1 体验者：pointsMin 0（不变）、pointsMax 499 → 199、去 AI 前缀
sub('"name":"AI 体验者"', '"name":"体验者"', 'Lv.1 name「AI 体验者」→「体验者」');
sub('"level":"Lv.1","name":"体验者","status":"已解锁","active":false,"done":true,"icon":"path_lv1","perk":"体验 AI 工具与基础课程","pointsMin":0,"pointsMax":499',
    '"level":"Lv.1","name":"体验者","status":"已解锁","active":false,"done":true,"icon":"path_lv1","perk":"体验 AI 工具与基础课程","pointsMin":0,"pointsMax":199',
    'Lv.1 pointsMax 499 → 199');
// Lv.2 进阶者：500 → 200；1499 → 499；命名
sub('"name":"AI 创作者"', '"name":"进阶者"', 'Lv.2 name「AI 创作者」→「进阶者」');
sub('"pointsMin":500,"pointsMax":1499', '"pointsMin":200,"pointsMax":499', 'Lv.2 区间 500~1499 → 200~499');
// Lv.3 内容创作者：1500 → 500；2499 → 1999
sub('"pointsMin":1500,"pointsMax":2499', '"pointsMin":500,"pointsMax":1999', 'Lv.3 区间 1500~2499 → 500~1999');
// Lv.4 商业创作者：2500 → 2000；3999 → 4999
sub('"pointsMin":2500,"pointsMax":3999', '"pointsMin":2000,"pointsMax":4999', 'Lv.4 区间 2500~3999 → 2000~4999');
// Lv.5 OPC 创业者：4000 → 5000（pointsMax 已是 null）
sub('"pointsMin":4000,"pointsMax":null', '"pointsMin":5000,"pointsMax":null', 'Lv.5 pointsMin 4000 → 5000');

console.log('=== T-003-13 · paths[].requirements[].points 与文字同步（RISK-003-02） ===');
sub('{"text":"累计创作积分达 500","points":500}', '{"text":"累计创作积分达 200","points":200}', 'Lv.2 requirement 500 → 200');
sub('{"text":"累计创作积分达 1,500","points":1500}', '{"text":"累计创作积分达 500","points":500}', 'Lv.3 requirement 1,500 → 500');
sub('{"text":"累计创作积分达 2,500","points":2500}', '{"text":"累计创作积分达 2,000","points":2000}', 'Lv.4 requirement 2,500 → 2,000');
sub('{"text":"累计创作积分达 4,000","points":4000}', '{"text":"累计创作积分达 5,000","points":5000}', 'Lv.5 requirement 4,000 → 5,000');
// ⚠️ Lv.1 的「累计创作积分达 100」= 入门里程碑，与 pointsMin=0 **不构成**「标题 vs 清单」矛盾 ⇒ 保留（见 CHG-021）

console.log('=== T-003-10 · studyLog 旧口径修正（4 条 points 50 → 30） ===');
(function () {
  const i = s.indexOf('studyLog: [');
  if (i < 0) { miss.push('studyLog 段未找到'); return; }
  const j = s.indexOf('    ]', i);
  const seg = s.slice(i, j);
  const n = (seg.split('"points": 50').length - 1) + (seg.split('"points":50').length - 1);
  if (n === 0) { miss.push('studyLog 内未找到 points 50'); return; }
  const newSeg = seg.split('"points": 50').join('"points": 30').split('"points":50').join('"points":30');
  s = s.slice(0, i) + newSeg + s.slice(j);
  hit++;
  console.log('  ✓ studyLog 内 points 50 → 30（' + n + ' 处）');
})();

console.log('=== T-003-11 · plans[].progress 异常值修正（派生值对齐课节数） ===');
// 实测：P3 = 45 但 2/5 = 40%；P5 = 10 但 0/5 = 0%（P1/P2/P4 已一致）
(function () {
  const fix = function (pid, from, to) {
    const i = s.indexOf('id: "' + pid + '"');
    if (i < 0) { miss.push(pid + ' 未找到'); return; }
    const j = s.indexOf('progress:', i);
    if (j < 0) { miss.push(pid + ' progress 未找到'); return; }
    const segEnd = s.indexOf(',', j);
    const cur = s.slice(j, segEnd);
    if (cur === 'progress: ' + from) {
      s = s.slice(0, j) + 'progress: ' + to + s.slice(segEnd);
      hit++;
      console.log('  ✓ ' + pid + ' progress ' + from + ' → ' + to);
    } else {
      console.log('  · ' + pid + ' 现状为「' + cur.trim() + '」（与期望 ' + from + ' 不同，跳过）');
    }
  };
  fix('P3', 45, 40);
  fix('P5', 10, 0);
})();

fs.writeFileSync(P, s);
const after = Buffer.byteLength(s, 'utf8');
console.log('\n合计命中 ' + hit + ' 处｜字节 ' + before + ' → ' + after + (miss.length ? '\n⚠️ 未命中：' + miss.join(' ; ') : ''));
