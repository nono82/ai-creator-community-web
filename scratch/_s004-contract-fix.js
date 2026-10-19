'use strict';
/**
 * 一次性维护脚本：给 `wb-creator-tools-verify.js` 的契约清单补入 ⑩ `generateFromTicket`
 * 并把 ⑩~⑯ 顺延为 ⑪~⑰（契约数 16 → 17）。同时补 ④⑤⑥⑦ 的「可读状态」说明。
 * ⚠️ 顺延必须**倒序**执行，否则会发生链式误替换（⑩→⑪ 后再被 ⑪→⑫ 命中）。
 */
const fs = require('fs');
const P = 'tools/wb-creator-tools-verify.js';
let s = fs.readFileSync(P, 'utf8');
const before = s;

// ① 倒序顺延编号
const pairs = [['⑯', '⑰'], ['⑮', '⑯'], ['⑭', '⑮'], ['⑬', '⑭'], ['⑫', '⑬'], ['⑪', '⑫'], ['⑩', '⑪']];
pairs.forEach(function (p) { s = s.split(p[0]).join(p[1]); });
console.log('① 编号顺延完成（⑩~⑯ → ⑪~⑰）');

// ② 插入新的 ⑩（放在 ⑨ 段之后、⑪ refundGenerate 之前）
const newTen = [
  ' *  ⑩ `App.generateFromTicket(ticket, content)` → `{ ok, objectKey }`',
  ' *     · **落盘 = 提交渲染**（FR-004-17）：**消费 ⑨ 产出的 `ticket`**，把内容登记为内容对象（`SPEC-017` 的',
  ' *       `registerAssetObject`）并建立 `workcloud` 引用。',
  ' *     · 🔴 **落盘成功才点亮双路流转**（`#btn-studio-deliver` / `#btn-studio-publish` / `#btn-studio-showcase`）。',
  ' *     · 🔴 **登记失败（内容不可用 / 字节不可得）⇒ 走 ⑫ 的失败出口**（退还 + 零残留，`EX-004-14`）。',
  ' *     · ⚠️ 为什么把「预扣」与「落盘」拆成两步：只有拆开，才可能表达「**已扣分但渲染失败 ⇒ 全额退还**」',
  ' *       （`REQ-204`）。合并成一步时，"退还"在语义上无处安放。',
  '',
].join('\n');
const anchor = ' *  ⑪ `App.refundGenerate(ticket)` → boolean';
if (!s.includes(anchor)) { console.log('⚠️ 未找到 ⑪ 锚点（已顺延）'); process.exit(1); }
s = s.replace(anchor, newTen + anchor);
console.log('② 已插入 ⑩ `generateFromTicket`');

// ③ 契约数 16 → 17（两处 console.log + 若注释块也有）
s = s.split('16 项契约').join('17 项契约');
s = s.split("console.log(' 16 项契约：").join("console.log(' 17 项契约：");
console.log('③ 契约数 16 → 17');

// ④ console.log 清单里补 generateFromTicket（两处）
const oldList = "console.log('   refundGenerate / failGenerate / applyTemplateToWorkspace / getToolHistory / restoreDraft /');";
const newList = "console.log('   generateFromTicket / refundGenerate / failGenerate / applyTemplateToWorkspace / getToolHistory /');";
const cnt = s.split(oldList).length - 1;
s = s.split(oldList).join(newList);
// 第三行清单原本以 restoreDraft / 结尾，改为 restoreDraft /（保留）
const oldL3 = "console.log('    refundGenerate / failGenerate / applyTemplateToWorkspace / getToolHistory / restoreDraft /');";
console.log('④ 清单行替换 ' + cnt + ' 处');

// ⑤ 顺延后，「打印清单」需要补 restoreDraft（原本第 4 行是 allTools / toolDetails）
const oldTail = "console.log('   allTools[].integration / tools.toolDetails');";
const newTail = "console.log('   restoreDraft / allTools[].integration / tools.toolDetails');";
const cnt2 = s.split(oldTail).length - 1;
s = s.split(oldTail).join(newTail);
console.log('⑤ 尾部清单行替换 ' + cnt2 + ' 处');

// ⑥ 第四行原本是 "MockData.tools.allTools[].integration / MockData.tools.toolDetails"
s = s.split("console.log('   MockData.tools.allTools[].integration / MockData.tools.toolDetails');")
  .join("console.log('   restoreDraft / MockData.tools.allTools[].integration / MockData.tools.toolDetails');");

// ⑦ 补 ④⑤⑥⑦ 的「可读状态」说明
s = s.replace(
  ' *     · ⚠️ `Q-049` 定稿「**两阶段**」：Phase 1 **只建壳**（本条 + ⑤⑥⑦），**生成动作仍走 `#modal-studio`**\n' +
  ' *       ⇒ 本套件**不要求** `simulateGenerate` 迁入新页（那是 Phase 2）。',
  ' *     · 🔑 **可读状态**：`App.currentView === \'tool-detail\'` 与 `App.currentToolId === toolId`\n' +
  ' *       （后者是**深链 / 刷新后渲染**的依据 —— FR-004-13）。\n' +
  ' *     · ⚠️ `Q-049` 定稿「**两阶段**」：Phase 1 **只建壳**（本条 + ⑤⑥⑦），**生成动作仍走 `#modal-studio`**\n' +
  ' *       ⇒ 本套件**不要求** `simulateGenerate` 迁入新页（那是 Phase 2）。'
);
s = s.replace(
  ' *     · 🔴 未知 tab ⇒ 返回 `false` **且不改动现状**（不得静默切到第一个）。',
  ' *     · 🔴 未知 tab ⇒ 返回 `false` **且不改动现状**（不得静默切到第一个）。\n' +
  ' *     · 🔑 **可读状态**：`App.tdHeroTab`（当前 Hero 标签；默认 `\'templates\'`）。'
);
s = s.replace(
  ' *     · 🔴 `third-integrated` 的「工作台」标签内容须为 **余额 / 充值 / 去使用**（FR-004-31）；',
  ' *     · 🔑 **可读状态**：`App.tdWorkTab`（当前工作区标签；默认 `\'workbench\'`）。\n' +
  ' *     · 🔴 `third-integrated` 的「工作台」标签内容须为 **余额 / 充值 / 去使用**（FR-004-31）；'
);
s = s.replace(
  ' *     · Hero 区**整体收起 / 展开**（FR-004-09 / `SC-004-03`）。收起态须**可读**（`App.tdHeroCollapsed`，',
  ' *     · Hero 区**整体收起 / 展开**（FR-004-09 / `SC-004-03`）。\n' +
  ' *     · 🔑 **可读状态**：`App.tdHeroCollapsed`（boolean）；收起后 `#td-hero-identity` **不得**被隐藏。\n' +
  ' *       收起态须**可读**（`App.tdHeroCollapsed`，'
);

fs.writeFileSync(P, s);
console.log('完成：字节 ' + Buffer.byteLength(before, 'utf8') + ' → ' + Buffer.byteLength(s, 'utf8'));
