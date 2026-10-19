'use strict';
/** 给 _spec017-consistency.js 增加 SPEC-003 / SPEC-004 的期望条目。 */
const fs = require('fs');
const P = 'ai-creator-community-wh/scratch/_spec017-consistency.js';
let s = fs.readFileSync(P, 'utf8');
const anchor = "  'CHANGELOG.md': [";
if (!s.includes(anchor)) { console.log('⚠️ 未找到锚点'); process.exit(0); }
if (s.includes('003-growth-academy/spec.md')) { console.log('已存在，跳过'); process.exit(0); }
const add = [
  "  'specs/003-growth-academy/spec.md': ['SPECIFIED', 'Q-046', 'Q-047', 'Q-048', 'awardLearningPoints', 'syncAcademyStats', 'markLessonDone', 'evaluateLevelUp', 'maybeUnlockCerts', 'claimCertificate', 'Lv.2 ≥ 200', 'plans[0]', '学职引擎', '认证导师'],",
  "  'specs/004-creator-tools/spec.md': ['SPECIFIED', 'Q-049', 'Q-050', 'Q-051', 'view-tool-detail', 'integration', 'attachAssetRef', 'refCount', 'third-integrated', 'third-external', '原路退还', '一键复刻'],",
  '',
].join('\n');
s = s.replace(anchor, add + anchor);
fs.writeFileSync(P, s);
console.log('✅ 已增加 2 组期望检查');
