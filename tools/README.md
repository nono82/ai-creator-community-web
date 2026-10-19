# tools/ · 正式工具与门禁（零依赖 · 离线）

> 目录定位：**正式工具**（对照 `_设计驱动开发规范.md` §七）。此处的脚本可被文档引用、可长期复用；
> `scratch/` 只放过程产物且禁止被正式代码引用；`temp/` 已于 2026-09-24 清空（内容全部转正至本目录）。

---

## 1. 一键跑门禁

```bash
node tools/gates.js                # 严格模式：L1 必须 0 ERROR
node tools/gates.js --baseline     # 日常模式：L1 ≤ 已登记基线视为「存量债务」，不阻断
node tools/gates.js l2 l3          # 只跑指定门禁（l1 / dup / l2 / mx / l3）
node tools/gates.js --quiet         # 只打印每个门禁的结论行
```

> ✅ **L3 当前 14 套全部全绿（2,483 项），红灯 0**（`gates-baseline.json` 的 `l3ExpectedRed: []`）。三套「契约先行 → 转绿」的套件（`wb-identity-admission-verify` CHG-013 / `wb-content-asset-verify` CHG-017 / **`wb-growth-academy-verify` CHG-021**）均已由「待实现清单」转为**回归防线**、**不得删除**；`wb-creator-tools-verify`（SPEC-004，**已于 CHG-023 转绿：126/126 + 14/14**）同样**不得删除**。

退出码：`0` = 通过；`1` = 有门禁未通过。

---

## 2. 门禁的当前实现（2026-09-24 起）

| 门禁 | 规范定义 | 当前实现 | 状态 |
| :--- | :--- | :--- | :--- |
| **L1** 契约一致性 | `node tools/doc-contract-check.js` → **0 ERROR** | `doc-contract-check.js`（原样） | ✅ 在线；**实测基线 7 ERROR**（存量债务，CHG-007 后由 32 下调） |
| **DUP** 重复定义 | —（项目自加，非规范三道门禁） | **`dup-method-check.js`（CHG-007 新增）** | ✅ 在线（**0 处重复 / 466 键**，硬性 0 容忍） |
| **L2** 结构冒烟 | 原定 Playwright 固定 6 条断言 | **`smoke-test.js`（新增 · 零依赖离线实现）** | ✅ 在线（**近似实现**，见 §4） |
| **L3** 业务闭环 | 按状态机逐状态走查 | **`wb-*-verify.js` × 14 套** | ✅ 在线（**14 套全绿 = 2,483 项断言**）；**红灯 0**（`l3ExpectedRed: []`，CHG-023） |
| 附加 | — | `mermaid-check.js`（Mermaid 图结构校验） | ✅ 在线（0 问题 / 59 图块 / 12 文档） |

> 原计划"装 Playwright 恢复 L2"**未采纳**：会引入 `package.json` + `node_modules`，破坏项目"零框架 / 零构建 / 零依赖"约束（CON-026）。改为**零依赖路线**，与既有自检同一技术路线（`最小 DOM 桩 + vm`）。
>
> **DUP 是项目自加的门禁**（不在规范定义的三道门禁内）：本项目宿主对象是**单个对象字面量**，同名键**末次生效、前一份成为死代码** ⇒ 改到前一份会**静默失效**。该缺陷曾真实存在 25 处（2026-09-24 清零，见 CHG-007）。

---

## 3. 文件清单

| 文件 | 门禁 | 职责 |
| :--- | :--- | :--- |
| `gates.js` | — | **统一入口**：串跑全部门禁（每个脚本在独立 Worker 中隔离运行），输出合并报告与总退出码 |
| `.internal/gate-worker.js` | — | Worker 包装器：在 Worker 内接管 `console.*` / `process.exit` 并回传完整输出（内部工具，勿单独运行） |
| `gates-baseline.json` | — | 门禁基线（L1 存量 ERROR 数等），供 `--baseline` 区分「存量债务」与「新增回归」 |
| `doc-contract-check.js` | L1 | 文档声明的 `#id` / `App.fn()` / `MockData.x` / `assets/...` 与真实代码/磁盘逐字对账（**内含"方法被重复定义"自检**） |
| `dup-method-check.js` | **DUP** | 全局对象重复定义检测（`js/app.js` + `js/mock_data.js`）；**支持裁决白名单** `dupAllowlist` |
| `smoke-test.js` | **L2** | 6 条结构冒烟断言（零依赖离线实现） |
| `mermaid-check.js` | 附加 | `design/*.md` 中 Mermaid 块的结构合法性静态校验 |
| `wb-bankcard-verify.js` | L3 | 银行卡域（324 项） |
| `wb-withdraw-verify.js` | L3 | 提现四道闸（160 项） |
| `wb-recharge-verify.js` | L3 | 人民币充值（168 项） |
| `wb-task-draft-verify.js` | L3 | 任务草稿生命周期（133 项） |
| `wb-task-select-verify.js` | L3 | 招募中 → 选定创作者闭环（536 项） |
| `wb-academy-path-verify.js` | L3 | 成长学院路径与等级说明（182 项） |
| `wb-assets-plus-verify.js` | L3 | 我的资产扩展域（375 项） |
| `wb-escrow-progress-verify.js` | L3 | 托管进度（82 项） |
| `wb-pro-subscribe-verify.js` | L3 | Pro 订阅（108 项） |
| `wb-debt-remediation-verify.js` | L3 | **技术债修复回归**（62 项，CHG-007 新增）：结构不变量 / 治理 Tab 选择器 / 证书三板块 / 龙虎榜真实打开 / **结算金额（用金额 ≠ 3000 的样本）** / 生成沉淀与算力扣减 |
| **`wb-identity-admission-verify.js`** | L3 | 🟢 **SPEC-001 冻结自检（契约先行）** —— 已于 **CHG-013 转绿**（**功能断言 37/37，断言 53/53**）⇒ 由「待实现清单」转为「**回归防线**」，计入断言合计 |
| **`wb-content-asset-verify.js`** | L3 | ✅ **SPEC-017 冻结自检（契约先行 → 已转绿）**（CHG-016 立红 / **CHG-017 转绿**）—— **由「待实现清单」转为「回归防线」**。冻结 **9 项契约**（`computeContentDigest` / `ASSET_REF_TYPES` / `registerAssetObject` / `attachAssetRef` / `detachAssetRef` / `getAssetRefs` / `getAssetRefCount` / `sweepRecyclableAssets` / `MockData.assets.{objects,assetRefs,gcWindowHours}`），覆盖 `SC-017-01 ~ 16`。**当前：功能断言 66/66 + 不变量 7/7，退出码 0**（由 `5/66` 转绿）。<br>⚠️ **转绿时修正了本套件的输出格式**：原「✓ 全部通过 ⇒ …」不含「全部通过：N 项」，而 `gates.js` 按 `/全部通过\s*[：:]\s*(\d+)\s*项/` 提取 ⇒ 该套件曾被**计为 0 项**（断言合计被低估、转绿也无法计入证据） |
| **`wb-growth-academy-verify.js`** | L3 | ✅ **SPEC-003 冻结自检（契约先行 → 已转绿）**（CHG-020 立红 / **CHG-021 转绿**）—— **由「待实现清单」转为「回归防线」**。**功能断言 77/77 + 不变量 10/10，退出码 0**。冻结 **10 项契约**（`awardLearningPoints` / `getLearningPoints` / `syncAcademyStats` / `markLessonDone` / `evaluateLevelUp` / `LEVEL_GATES` / `maybeUnlockCerts` / `claimCertificate` / `switchAcademySubPage` / `completeLesson` 兼容壳），覆盖 `SC-003-01 ~ 20`。进度：**功能断言 77/77 + 不变量 10/10，退出码 0**（已计入断言合计）。⚠️ 其 DOM 桩**额外提供 `location` 与 `localStorage`**（前者为 `navigateTo` 所需、后者为观看进度台账所需），缺桩会让断言被 `safe()` 吞掉而**失真**。支持 **`WB_VERBOSE=1`** 打印通过项以复核"平凡通过" |
| **`wb-creator-tools-verify.js`** | L3 | 🔴 **SPEC-004 冻结自检（契约先行）**（CHG-022 立红 / **CHG-023 转绿**）—— **已由「待实现清单」转为「回归防线」**。冻结 **17 项契约**（`TOOL_INTEGRATION_TYPES` / `resolveToolIntegration` / `openToolCard` / `openToolDetail` / `toggleTdHero` / `switchTdTab` / `switchTdWorkTab` / `computeGenerateCost` / `preauthorizeGenerate` / `generateFromTicket` / `refundGenerate` / `failGenerate` / `applyTemplateToWorkspace` / `getToolHistory` / `restoreDraft` / `allTools[].integration` / `tools.toolDetails`），覆盖 `SC-004-01 ~ 16`。**功能断言 126/126 + 不变量 14/14，退出码 0**（由 `4/126` 转绿）|

合计 **2,483 项** L3 断言（**14 套全绿**，含 `wb-identity-admission-verify` 53 项 + `wb-content-asset-verify` 73 项 + `wb-growth-academy-verify` 87 项 + **`wb-creator-tools-verify` 140 项**）；**红灯 0**；另有 DUP **550 键 0 重复**、L2 6 项、L1 存量 **5 ERROR**（= 基线，属既有 FU-002 命名漂移）。

---

## 4. L2 的能力边界（务必知悉）

`smoke-test.js` 是 L2 的**近似实现**，不是等价替代。它用【最小 DOM 桩 + `vm`】在 Node 内运行真实的 `js/*.js`，因此：

**能覆盖**
- 静态：`console.error` 调用计数、`index.html` 脏字面量、视图/导航/弹窗结构集合。
- 行为：`App.navigateTo()` 逐视图切换后「唯一视图可见 + 导航高亮 + hash 同步」；筛选类交互后目标容器**真实重渲**；`openModal/closeModal` 的 `active` 类回写；`MockData` 一级字段与关键数值字段非空且在域内；关键跨模块链路方法齐备。

**不能覆盖（Playwright 才能做）**
- 真实浏览器渲染与 **CSS 布局**（元素尺寸、可见性、遮挡）；
- 真实事件派发（鼠标/键盘/触摸）与浏览器的**默认行为**；
- `console.error` 的**运行期**捕获（只能静态计数）；
- 图片/字体加载失败、跨域、媒体播放等浏览器专属行为。

> 结论：L2 绿**不等于**"页面看起来对"。视觉与交互的最终确认仍需人工目检（导出真实 `innerHTML` / 截图）。

---

## 5. 两个必须知道的运行环境事实（均经实测）

### 5.1 `spawnSync` / `execFileSync` 不可用（EBUSY）

在本机环境下，从 Node 进程拉起 `node.exe` 会抛 `EBUSY`，**子进程 stdout 恒为空**。
> 这正是原 `temp/_run-verify.js` 汇总器"抓不到输出、每套都显示(无汇总行)"的根因——不是脚本没输出，是**捕获不到**。

**对策**：`gates.js` 改为**进程内 `require`**：临时接管 `console.*` 与 `process.exit`，收集输出后还原，全程零子进程。

### 5.2 各套自检会互相污染 → 必须**隔离运行**

各套自检的沙箱把真实 `setTimeout` / `setInterval` / `setImmediate` 与微任务交给被测代码，且**从不清理**。若在同一个进程里连跑，前序套泄漏的回调会在后序套运行期间触发，造成**伪失败**。

**实测症状**：先跑 `bankcard` / `withdraw`，再跑 `task-select`，后者会出现 **3 项伪失败**（"创作者响应接单 → 任务转进行中"），而**单独跑 536/536 全过** —— 极易被误判为产品缺陷。

**曾被尝试但不足的方案**：跑批期间**屏蔽定时器**（把 `setTimeout/setInterval` 变 no-op）。
→ 实测**不能根治**：`setImmediate` 与微任务仍会泄漏，结果**时好时坏**（当时同一命令有时 2068/2068、有时 2065/2068），对门禁而言"不确定"比"失败"更糟。

**最终方案**：**每个脚本在独立 Worker 中运行**。
- `worker_threads` 在同进程内开线程，**不受 EBUSY 限制**（EBUSY 只影响 `spawnSync/execFileSync` 拉子进程）；
- 每个 Worker 拥有**独立的 JS 环境与事件循环** → 套间污染从根上消失；
- `tools/.internal/gate-worker.js` 负责在 Worker 内接管 `console.*` 与 `process.exit`、回传**完整输出**（避免 `process.exit(0)` 截断 stdout）。

**确定性验证**：连续 3 次运行 `node tools/gates.js --baseline`，结果为 **完全一致**（当前：L1 7 / DUP 466 / L2 6 / MX 0 / **L3 绿套 2130 + 红灯 3-37**）。

> ⚠️ 因此：**批量结果以 `gates.js` 为准**；单独运行某套脚本时行为略有差异（定时器真实生效）。

---

## 6. 门禁基线机制

`gates-baseline.json` 记录 L1 的历史 ERROR 数（当前 **7**，CHG-007 后由 32 下调）。`--baseline` 模式下：

- L1 ERROR ≤ 基线 → 显示为 **WARN（存量债务）**，不阻断；
- L1 ERROR **> 基线** → 仍判 **FAIL**（说明本轮引入了新的契约漂移，必须处理）。

**这不改变规范定义的通过标准**（L1 仍以 0 ERROR 为通过）；`--baseline` 只是让日常迭代不被存量债务卡住。

> 📉 **基线下调是好消息，但必须显式记录**（不得静默改数）：CHG-007 清理 `app.js` 的 25 处方法重复定义后，L1 自动消掉 25 条「方法被重复定义」自检 ERROR ⇒ 32 → **7**。剩余 7 条全为"文档声明但代码不存在的 App 函数"（命名漂移，见 `FU-002`）。
>
> 🔑 **实测教训（本项目第一次由门禁拦下错误修复）**：CHG-007 中原计划**直接删除** `creditCreatorIncome`（它同时是"第二事实源"），但删后 L1 立刻由 **7 → 8 ERROR** —— 因为 `我的资产设计.md` 把它声明为契约。最终改为**转发别名**（转发到唯一的 `settleTaskReward`），既满足契约、又消除第二事实源。**若没有 L1，这次"正确方向的修复"会静默破坏文档契约。**
>
> `dupAllowlist`：DUP 门禁的裁决白名单。**因为"同名键该保留哪一份"无法自动推导**（实测 6 处分歧中有 2 处必须保留前一份），裁决结果需人工登记。当前为空 —— 重复定义已清零，采用**硬性 0 容忍**，新出现重复一律 FAIL。

### 6.2 「已登记的红灯」（`l3ExpectedRed`）—— 2026-09-24 新增（CHG-011）

> 依 Constitution 原则 10：「**先跑门禁拿到待实现清单，再动手写代码**；校验器是本轮 **TODO 生成器**，不是事后检查官」。

对「**契约已冻结、实现尚未开始**」的 L3 自检套件，允许其**以红灯身份常驻**：

| 行为 | 说明 |
| :--- | :--- |
| 计为 **`RED`** | **不是 FAIL、不阻断**总判定（退出码仍为 0） |
| **不计入**「断言合计」 | 红灯**不构成证据**，直接排除在 `2602/2603` 之外 |
| 单独报出进度 | `🔴 已登记待实现 3/37 项（1 套）` —— 一眼看到实现进度 |
| **转绿时提示移除** | 某套一旦通过，会打印「✅ 已转绿 —— 请把它从 `l3ExpectedRed` 中移除」，**防止红灯被静默遗忘** |

🔑 **为什么不直接让它 FAIL**：红灯若判 FAIL，总判定永远是失败的 ⇒ 团队会开始**忽略门禁**（"反正就是红的"），这比没有门禁更糟。**把红灯做成"可见的待办清单"，才能让它持续产生价值。**

🔑 **为什么必须先立红、再实现**：若先实现后补断言，断言会**照着实现写**（把实现的形状当成正确性），失去独立验证的意义 —— 这正是项目「契约先行 → **冻结自检** → 最小实现」五道工序里"冻结自检"的位置。

> 🔴 **输出格式是门禁契约的一部分（两次踩坑的总结，新套件必须照此写）**：
> · **绿套**（全部通过时）必须输出 `✓ 全部通过：N 项断言（功能 x + 不变量 y）` —— `gates.js` 依 `/全部通过\s*[：:]\s*(\d+)\s*项/` 提取断言数；
> · **红灯**（未全部通过时）必须在**最后一行**输出 ` 通过：x/y 项功能断言（不变量断言 a/b 未计入）` —— 依 `/通过\s*[：:]\s*(\d+)\s*\/\s*(\d+)/` 提取，用于报出「已登记待实现 x/y 项」。⚠️ **只报功能断言**，且**必须放在最后一行**（`parseCount` 倒序扫描、首个命中即返回）。
> · **两次踩坑记录**：① `CHG-017` —— `wb-content-asset-verify` 绿套格式写成「✓ 全部通过 ⇒ …」，缺「：N 项」⇒ 曾被**计为 0 项**；② `CHG-020` —— 同一套件**红灯期缺进度行** ⇒ 红灯进度被计为 `0/0`（`CHG-017` 只补了绿套那条，漏了红灯这条）；③ **`CHG-022` —— 「注释污染源码级断言」复发**：`mock_data.js:4949` 有一句说明性注释提到 `refCount` ⇒ 若不**剔除注释**再匹配，则断言**永远为红**（而实现是正确的）。该坑在 `CHG-020` 已踩过一次 ⇒ **同类第 2 次复发**，现统一以 `APP_CODE` / `MOCK_CODE` / `HTML_CODE` 三个「剔注释基底」处理。**两处现均已补齐，三套格式已统一。**

⚠️ **一类必须小心的"平凡通过"**：断言"某状态**不得变化**"的**不变量型**断言（如"冻结后创作收益不得清零"），在能力**尚未实现**时因为"什么都没做"而**会通过**。⇒ `wb-identity-admission-verify.js` 与 `wb-content-asset-verify.js` 因此**把断言分成两类计数**：

> 🔑 **CHG-016 的实测教训（值得每个新套件照做一次）**：`wb-content-asset-verify.js` 立红首跑显示 **6/65**，逐项复核后发现 **3 项分类错误** —— `C9`（"引用数不得为负"实为**不变量**却写成了功能断言）、`E2`（"对象数与字节数不变"在对象表**不存在**时 `-1 === -1` 而**平凡通过**）、`D10`（"回收不得删除 ready 对象"在对象不存在时判"不得删除"必然失败，形态上属**功能断言**）。修正后真实进度为 **5/66**，并为 `E2` 补了前置断言 `E2a`。
>
> 🔑 **CHG-017 转绿时的两条新教训**：
> 1. **"相等"型断言必须配一条"前置非空"断言** —— 接线前 `E4` / `E6`（"分享后对象数不变"）在对象表为空时是 `0 === 0` 的**平凡通过**；须由行为冒烟的"生成后对象数**必须 > 0**"证明其真通过。
> 2. **套件输出格式必须匹配 `gates.js` 的提取正则** `/全部通过\s*[：:]\s*(\d+)\s*项/` —— 否则**断言写对了也不计入证据**（本套件曾被计为 **0 项**：转绿后断言合计仍不包含它的 73 项）。
> ⇒ **任何"通过"都要问一句：它是"做到了"，还是"什么都没做"？后者不是进度。**

```text
【功能断言】 3/37   ← 真实进度看这一行（断言能力"存在且正确"，未实现必然失败）
【不变量断言】 16/16 ← ⚠️ 未实现时"什么都没做"⇒ 平凡通过，不代表已完成
```

**通用教训：任何"未实现也能通过"的断言，都不能计入进度。**

---

## 7. 待办（已知缺口）

| 项 | 说明 |
| :--- | :--- |
| L1 清零 | 剩余 **5 ERROR**，全为"文档声明但代码不存在的 App 函数"（`openMyCerts` ↔ `openMyCertsModal` 等命名漂移）。⚠️ 5 条构成：`showAcademyCoursesPage` / `openMyCerts` ×2（`GAP-13`，`SPEC-003` 遗留）、`showTaskPublishPage` / `openTaskDetail`（`SPEC-006` 范围）。需逐项核对后决定**改文档还是补别名**（`design/` 为历史归档，默认不改），见 `FU-002` |
| L3 形态差异 | 现有 **14 套全绿**的是**断言级**业务自检（2,483 项），尚未做到规范定义的"状态机逐节点走查"，可后续补齐（`RISK-006`）；**红灯 0**（`l3ExpectedRed: []`，CHG-023） |
| fjc 侧零覆盖 | `ai-creator-community-fjc/` 无任何验证工具，其 4 个模块无门禁保护 |
| 视觉验证 | 无自动化视觉回归（需 Playwright 或截图比对），依赖人工目检 |
| L2 保真度 | `smoke-test.js` 为近似实现，不含真实浏览器渲染 / CSS 布局 / 真事件派发 |
