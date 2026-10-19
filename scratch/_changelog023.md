## [2026-09-25] `IMPLEMENT`（Phase 1）· `SPEC-004` 创作工具落地，红灯转绿（CHG-023）

**类型**：功能实现（⚠️ **本项目第 5 次改动业务代码**）

### 结果

| 指标 | 值 |
| :--- | :--- |
| 任务 | Phase 1 **31 项全部完成**；`plan.md` 的 **11 项 DoD 逐条达成** |
| 白盒套件 | **`4/126` → `126/126`**（+ 不变量 **14/14**，exit 0）⇒ 转为**回归防线** |
| 门禁 | L1 **5 ERROR**（**7 → 5 下调**）/ DUP **550/550** / L2 **6/6** / **L3 14 套全绿 2,483 项** / 断言合计 **3,039/3,040** / **总判定通过 ✅** / exit 0 / **3 次一致** |
| 行为冒烟 | **39/39，异常 0**（**含 `#modal-studio` 段与 5 个既有方法的逐字比对**） |
| 复算 | 资金恒等式 ✓ / 算力恒等式 ✓ / 三模式样本 ✓ / `toolDetails` 9/9 ✓ / 无悬空 id ✓ |

### 🔴 Phase 1 硬约束：完全满足（**证据比"行为一致"更强**）

本 Feature 独有的硬约束是 **不得改动 `#modal-studio` 的 DOM 与 `simulateGenerate` 的既有逻辑**（实测绑定 **10 处**；依 `Q-049` 的「两阶段」）。

冒烟 **P0** 直接**比文本**（不是比行为）：
- `index.html` 的 `#modal-studio` 段：**除有意新增的 2 个 `id` 外，逐字一致**；
- `js/app.js` 的 **5 个既有方法**（`simulateGenerate` / `openAIWorkbench` / `submitStudioToTask` / `publishStudioToShowcase` / `publishFromStudio`）**逐字一致**；
- `index.html` 相对备份的差异共 **55 行**，其中**被修改的原有行仅 2 行**（两个 `<select>` 加 `id`），其余全是**新增段**。

### 落地能力

**进得去** 集成模式三值真源与解析（缺失/非法 ⇒ 显式失败）· 卡片**统一路由**（矩阵 / 工具箱 / 榜单三处接入）· **路由级详情页** `#view-tool-detail`（带 `view-container` ⇒ **深链 / 刷新可停留**）· Hero 可收起 + 四标签（默认「示例模板」）· 工作区两标签（默认「工作台」；集成工具换为**余额 / 充值 / 去使用**）。

**出得来** **生成两阶段计费**：`preauthorizeGenerate`（**生成前预扣**、**按来源分池**、**不足即拒绝**、空 Prompt 拒绝、渲染中幂等）→ `generateFromTicket`（落盘 + `workcloud` 引用 + 点亮流转）→ **失败 / 超时 ⇒ `failGenerate` 全额原路退还 + 零残留**。

**送得到** 双路流转**复用同一对象键**（不新增物理对象、不改字节数、不再扣费）· 模板套用（**不扣分** / 不兼容显式提示）· 历史任务（**未知状态显式标记**）与草稿恢复。

### 一并收敛的 9 处缺陷

`spec.md` §1.3 的 3 处（**承载形态与 `REQ-202` 相反** / **集成模式未数据化** / **`refCount` 口径冲突**）+ 立红新测的 6 处（**扣分是"成功后扣"非"预扣"** / **扣减硬编码 `self`** / **余额不足静默放行** / 模型与画幅控件无 `id` / 工具箱与榜单无 `id` / 弹窗段大量内联样式）⇒ **全部收敛**。

### ⚠️ 一处对既有回归防线的修改（**已显式记录**）

`tools/smoke-test.js` 的 **L2-2** 由「**七**视图可达（nav ↔ `#view-*` 一一对应）」演进为「**视图可达**（主视图一一对应；**二级页面**唯一可见但**不入主导航**；hash 同步）」，并引入显式白名单 `SECONDARY_VIEWS = ['tool-detail']`。

- **理由**：`#view-tool-detail` 是 **SPEC-004 引入的二级页面**（由工具卡片 / 深链进入的路由级页面）—— 它**本就不应出现在左侧主导航**中。
- ⚠️ **只放宽 `nav` 那一半**：「切换后唯一可见 + `hash` 同步」**仍然必须成立**（等级未降低）。`VIEW_IDS` 7 → **8**、`NAV_VIEWS` 仍为 7，逐视图走查 **8/8**。
- 🔑 **这条修改是被门禁"逼出来"的** —— 新增视图后 L2-2 **立刻变红**（`view=8 nav=7`），促成**显式**的白名单而非静默放过。**这是门禁正常工作的证据。**

### 实现期发现并修正的 4 处「断言 / 实现缺陷」（**均非放宽标准**）

| # | 问题 | 处置 |
| :--- | :--- | :--- |
| ① | `App.getAssetRefs(objectKey)` **只接受一个参数**（无 `refType`）⇒ 立红时 `getAssetRefs(key, 'post')` 的第二参被忽略、断言语义**静默变成「总引用数」** | 引入 `refsByType(app, key, refType)` 修正 |
| ② | B5 原为「存在 native 工具」的**弱前置** | 改为真正的 `EX-004-12` 断言 |
| ③ | 🔴 `failGenerate` / `refundGenerate` 原先只接受 `state === 'issued'`，而**落盘后状态为 `settled`** ⇒ **失败路径永远走不通** | 修正为接受两者；`refunded` 仍为终态（防重复退还） |
| ④ | 冒烟把 `#modal-studio` 段要求「逐字一致」，但本 Feature **有意**加了 2 个 `id` | 改为「除这 2 个 `id` 外逐字一致」并显式说明 |

> 🔑 **新增 `RISK-004-10`**：**「套件断言与被调方法的签名不匹配」是一类独立风险** —— 断言**语义写对了**，但**调用了错误的签名** ⇒ 静默地变成另一个断言（且**仍然会"通过"或"失败"得看似合理**）。
> ⇒ **手法：写套件前必须先读被调方法的签名**（与既有铁律「引用编号前必须回查其定义」**同族**）。

### 新增登记（`GAP-13` 的处置进度）

`GAP-13`（L1 的 3 个 ERROR 在 `SPEC-003` 落地后仍未消失 ⇒ 「文档声明名 vs 实现名」不一致）**仍待 `SPEC-003` 侧处理**；本轮**未顺手改**（属跨 Feature 范围）。

### 同步范围

`specs/004-creator-tools/{spec.md,plan.md,tasks.md}` · `specs/README.md` · `project-design/01-requirements/traceability.md` · `project-design/05-feature-map.md` · `project-design/99-ai/{design-status.md,workspace-state.yaml,change-impact.md}` · `ai-creator-community-wh/{js/app.js,js/mock_data.js,index.html,css/style.css,tools/*}` · `CHANGELOG.md`

---

