const fs = require('fs');

const appFile = 'ai-creator-community/js/app.js';
let content = fs.readFileSync(appFile, 'utf8');

// 1. 替换 renderTaskDetailPage 中的渲染调用
const oldTarget = `      \${applicantsHtml}
      \${fulfillmentHtml}

      <div class="tasks-detail-cta-bar">
        \${ctaBar}
      </div>`;

const newTarget = `      \${this.renderTaskStateSpecificBottomSection(task, isPublisher, manage, myOrderAny)}

      <div class="tasks-detail-cta-bar">
        \${ctaBar}
      </div>`;

if (!content.includes(oldTarget)) {
  console.error('Target chunk not found in app.js!');
  process.exit(1);
}

content = content.replace(oldTarget, newTarget);

// 2. 插入专属状态渲染函数群
const insertMarker = `  renderTaskApplicantsSection: function(task, isPublisher, manageMode) {`;

const newMethods = `  renderTaskStateSpecificBottomSection: function(task, isPublisher, manage, myOrderAny) {
    const life = this.getTaskHallLifecycle(task);
    const status = task.status || '';

    // 状态 1: 待验收 (查验交付文件与网盘凭据、72小时倒计时、确认打款/驳回操作台)
    if (status === '待验收') {
      return this.renderSectionPendingAcceptance(task, isPublisher, myOrderAny);
    }

    // 状态 2: 返修中 (买家具体修改意见、版本对比、重新提交)
    if (status === '返修中') {
      return this.renderSectionRevision(task, isPublisher, myOrderAny);
    }

    // 状态 3: 仲裁中 (官方仲裁介入、证据陈述链条、24h调处进度)
    if (status === '仲裁中') {
      return this.renderSectionArbitration(task, isPublisher, myOrderAny);
    }

    // 状态 4: 已完成 (双方双向真实互评、商业成果归档、展厅收录态)
    if (status === '已完成') {
      return this.renderSectionCompleted(task, isPublisher, myOrderAny);
    }

    // 状态 5: 未成交 / 已截止 / 已关闭 (审计说明、资金全额退回、创作者落选补偿)
    if (status === '未成交' || status === '已截止' || status === '已关闭' || life === 'ended') {
      return this.renderSectionClosed(task, isPublisher, myOrderAny);
    }

    // 状态 6: 履约中 / 进行中 (中标合作者档案、四大里程碑追踪、协作日报)
    if (status === '进行中' || life === 'active') {
      return this.renderSectionInProgress(task, isPublisher, myOrderAny);
    }

    // 状态 7: 默认招募中 / 开放报名 (竞标创作者方案池、需求问答与咨询)
    return this.renderSectionOpenBidding(task, isPublisher, manage, myOrderAny);
  },

  // 1. 招募中：竞标候选人与方案池 + 需求问答与咨询互动
  renderSectionOpenBidding: function(task, isPublisher, manage, myOrderAny) {
    const applicants = task.applicants || [];
    const mode = this.getTaskAcceptMode(task);
    const canSelect = mode === 'manual' && task.status === '招募中' && isPublisher;

    const listHtml = applicants.length === 0
      ? '<div style="padding:20px; text-align:center; color:var(--text-muted); font-size:13px;">当前开放报名中，暂无创作者提交方案，点击上方“去报名”抢占先机！</div>'
      : applicants.map(a => {
          const statusLabel = a.status === 'accepted' ? '已入选' : (a.status === 'rejected' ? '未入选' : '竞标方案待审');
          return \`
            <div class="task-applicant-card">
              <img src="\${a.avatar || 'assets/avatars/user_1.png'}" alt="\${a.name}" class="task-applicant-avatar">
              <div class="task-applicant-main">
                <div class="task-applicant-name-row">
                  <strong style="font-size:14px; color:var(--text-primary);">\${a.name}</strong>
                  <span class="gallery-creator-lv">\${a.level || 'Lv.4 商业创作者'}</span>
                  <span style="font-size:11.5px; color:#B45309; background:#FEF3C7; padding:1px 6px; border-radius:4px; font-weight:600;">信誉 \${a.credit || 98} 分</span>
                  <span class="task-applicant-status \${a.status}">\${statusLabel}</span>
                </div>
                <div class="task-applicant-sub">\${a.school || '高校认证'} · 申请时间：\${a.appliedAt || '1天前'}</div>
                <p class="task-applicant-proposal"><strong>竞标思路：</strong>\${a.proposal || '具备完整商业交付经验，已搭建专属ComfyUI超分流水线，严格按时保质交付。'}</p>
                \${a.portfolio ? \`<div style="font-size:12px; color:var(--primary); margin-top:4px;">参考作品：\${a.portfolio}</div>\` : ''}
              </div>
              <div class="task-applicant-actions">
                \${canSelect && a.status === 'pending'
                  ? \`<button type="button" class="hero-btn-primary" style="padding:6px 14px; font-size:12px;" onclick="App.selectTaskApplicant('\${task.id}', '\${a.id}')">选定此人</button>\`
                  : \`<button type="button" class="hero-btn-secondary" style="padding:6px 12px; font-size:12px;" onclick="App.showToast('已查看该创作者商业履约主页')">创作者主页</button>\`}
              </div>
            </div>\`;
        }).join('');

    return \`
      <div class="detail-state-section">
        <!-- 竞标候选人与方案池 -->
        <div class="detail-state-card">
          <div class="detail-state-card-head">
            <h3 class="detail-state-card-title">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              参与竞标创作者与方案池
            </h3>
            <span class="detail-state-card-badge" style="background:#EEF2FF; color:var(--primary);">已有 \${applicants.length} 位创作者提交方案</span>
          </div>
          <div class="task-applicants-list">
            \${listHtml}
          </div>
        </div>

        <!-- 需求咨询与答疑互动 -->
        <div class="detail-state-card">
          <div class="detail-state-card-head">
            <h3 class="detail-state-card-title">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              需求咨询与发布方答疑 (3)
            </h3>
            <span style="font-size:12px; color:var(--text-muted);">公开透明 · 官方答疑保障</span>
          </div>
          <div class="detail-qa-list">
            <div class="detail-qa-item">
              <div class="detail-qa-q">
                <span class="detail-qa-tag">问</span>
                <span>请问生成工具是否限定为 Runway 或 Sora？支持采用国产 Kling 可灵或智象吗？</span>
              </div>
              <div class="detail-qa-a">
                <span class="detail-qa-tag is-a">发布方答</span>
                <span>完全支持！工具不限，但要求最终输出 4K 60fps ProRes 母带，杜绝肢体形变与频闪，并需保留分镜 Prompt 与 Seed 种子表。</span>
              </div>
            </div>
            <div class="detail-qa-item">
              <div class="detail-qa-q">
                <span class="detail-qa-tag">问</span>
                <span>成片的商业版权买断是否包含衍生品数字藏品开发权？</span>
              </div>
              <div class="detail-qa-a">
                <span class="detail-qa-tag is-a">发布方答</span>
                <span>包含全球全渠道商业授权，成片通过验收后将由双方签署平台统一商业版权转让协议。</span>
              </div>
            </div>
            <div class="detail-qa-item">
              <div class="detail-qa-q">
                <span class="detail-qa-tag">问</span>
                <span>请问前期的分镜脚本是否需要提供两套方案比选？</span>
              </div>
              <div class="detail-qa-a">
                <span class="detail-qa-tag is-a">发布方答</span>
                <span>建议提供冷色调未来科技与赛博朋克霓虹两套分镜色彩标定，以便我方选定后快速推进。</span>
              </div>
            </div>
          </div>
          <div class="detail-qa-input-bar">
            <input type="text" id="task-qa-input" class="form-input" placeholder="对该商单有疑问？在此向发布方提问（如工具限制、时间档期等）...">
            <button type="button" class="hero-btn-primary" style="padding:0 18px; font-size:13px; white-space:nowrap;" onclick="App.showToast('提问已提交，等待发布方答疑并推送通知'); document.getElementById('task-qa-input').value='';">发送提问</button>
          </div>
        </div>
      </div>\`;
  },

  // 2. 履约中：签约中标创作者档案 + 4大里程碑追踪看板 + 阶段协同动态
  renderSectionInProgress: function(task, isPublisher, myOrderAny) {
    const acceptedApplicant = (task.applicants || []).find(a => a.status === 'accepted') || {
      name: '星芒AI数字人工作室',
      school: '清华美院创作者团队',
      level: 'Lv.4 商业创作者',
      avatar: 'assets/avatars/user_1.png',
      credit: 99
    };

    return \`
      <div class="detail-state-section">
        <!-- 签约合作创作者卡片 -->
        <div class="detail-state-card">
          <div class="detail-state-card-head">
            <h3 class="detail-state-card-title">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>
              签约执行创作者（合作中）
            </h3>
            <span class="detail-state-card-badge" style="background:#DCFCE7; color:#15803D;">电子合作协议生效中 · 资金100%锁定</span>
          </div>
          <div class="task-applicant-card" style="border:none; padding:0;">
            <img src="\${acceptedApplicant.avatar}" alt="\${acceptedApplicant.name}" class="task-applicant-avatar" style="width:48px; height:48px;">
            <div class="task-applicant-main">
              <div class="task-applicant-name-row">
                <strong style="font-size:15px; color:var(--text-primary);">\${acceptedApplicant.name}</strong>
                <span class="gallery-creator-lv">\${acceptedApplicant.level || 'Lv.4'}</span>
                <span style="font-size:11.5px; color:#B45309; background:#FEF3C7; padding:1px 6px; border-radius:4px; font-weight:600;">履约信用 \${acceptedApplicant.credit || 99} 分</span>
              </div>
              <div class="task-applicant-sub">\${acceptedApplicant.school || '高校认证'} · 签署专属保密承诺 · 平台履约险已承保</div>
              <p class="task-applicant-proposal" style="color:var(--primary); font-weight:500;">当前进展：分镜与提示词工作流已确认，正在进行 4K 超分辨率动态成片渲染。</p>
            </div>
            <div class="task-applicant-actions">
              <button type="button" class="hero-btn-primary" style="padding:8px 14px; font-size:12px;" onclick="App.showToast('正在为您建立加密协同通讯频道...')">私信沟通</button>
            </div>
          </div>
        </div>

        <!-- 4大里程碑追踪看板 -->
        <div class="detail-state-card">
          <div class="detail-state-card-head">
            <h3 class="detail-state-card-title">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 14 14"/></svg>
              项目里程碑全周期跟踪看板
            </h3>
            <span style="font-size:12.5px; font-weight:700; color:var(--primary);">总体履约进度 75%</span>
          </div>
          <div class="fulfillment-summary" style="grid-template-columns: repeat(4, 1fr); margin-bottom:14px;">
            <div style="border-left: 3px solid #10B981;">
              <label>阶段 1：分镜确认</label>
              <span style="color:#059669; font-size:12.5px;">已达成 (100%)</span>
            </div>
            <div style="border-left: 3px solid #10B981;">
              <label>阶段 2：粗剪Demo</label>
              <span style="color:#059669; font-size:12.5px;">已验收 (100%)</span>
            </div>
            <div style="border-left: 3px solid #3B82F6;">
              <label>阶段 3：4K超分渲染</label>
              <span style="color:#2563EB; font-size:12.5px;">进行中 (75%)</span>
            </div>
            <div style="border-left: 3px solid #CBD5E1;">
              <label>阶段 4：版权买断交付</label>
              <span style="color:var(--text-muted); font-size:12.5px;">待提交</span>
            </div>
          </div>
          <div class="fulfillment-progress-row" style="margin:0 0 10px 0;">
            <div class="fulfillment-bar"><div class="fulfillment-bar-fill" style="width: 75%; background:linear-gradient(90deg, #10B981, #3B82F6);"></div></div>
            <strong>75%</strong>
          </div>
          <div class="fulfillment-rule" style="margin:0;">
            • 创作者每日按约更新进度；双方确认阶段成果后资金分阶段解冻，确保交付质量。
          </div>
        </div>
      </div>\`;
  },

  // 3. 待验收：成果查验与网盘凭据 + 72h自动打款倒计时 + 验收/催促操作台
  renderSectionPendingAcceptance: function(task, isPublisher, myOrderAny) {
    const pubOrder = (MockData.tasks.myOrders || []).find(o => o.role === 'publisher' && o.sourceId === task.id);
    const orderId = pubOrder ? pubOrder.id : (myOrderAny ? myOrderAny.id : 'MO-TEMP');

    return \`
      <div class="detail-state-section">
        <div class="detail-state-card" style="border-color:#FCD34D;">
          <div class="detail-state-card-head">
            <h3 class="detail-state-card-title" style="color:#B45309;">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              成果交付核验凭据
            </h3>
            <span class="detail-state-card-badge" style="background:#FEF3C7; color:#B45309;">状态：已正式提交交付 · 等待买家验收</span>
          </div>

          <!-- 72小时自动倒计时 -->
          <div class="detail-countdown-banner" style="margin-bottom:14px;">
            <div>
              <strong>72小时自动打款倒计时</strong>：剩余 <strong>68小时15分20秒</strong>
            </div>
            <div style="font-size:11.5px; opacity:0.9;">超时买家无操作，系统将全额自动结算划转</div>
          </div>

          <!-- 网盘与交付物信息 -->
          <div class="detail-delivery-inspect-box">
            <div class="detail-delivery-link-row">
              <span style="font-weight:600; font-size:13px;">交付网盘下载地址：</span>
              <div style="display:flex; align-items:center; gap:8px;">
                <span class="detail-delivery-link-val">https://pan.baidu.com/s/ai-opc-master-delivery-v2</span>
                <button type="button" class="hero-btn-secondary" style="padding:4px 10px; font-size:12px;" onclick="navigator.clipboard && navigator.clipboard.writeText('https://pan.baidu.com/s/ai-opc-master-delivery-v2'); App.showToast('网盘链接已复制到剪贴板');">复制链接</button>
              </div>
            </div>
            <div style="font-size:12.5px; color:var(--text-secondary); margin-bottom:8px;">
              <strong>提取密码：</strong><code style="background:#E2E8F0; padding:2px 6px; border-radius:4px; font-weight:700;">AI2026</code>
            </div>
            <div style="font-size:12.5px; color:var(--text-secondary); margin-bottom:8px;">
              <strong>创作者交付说明：</strong>已按合同要求完成全流程4K 60fps动态渲染与分轨音效合成，包含ProRes无损母带、ComfyUI工程工作流JSON及商用买断授权书。
            </div>
            <div style="font-weight:600; font-size:12.5px; margin-top:10px; color:var(--text-primary);">交付包清单：</div>
            <ul class="detail-delivery-files-list">
              <li>未来城市预告片_4K60fps_ProRes母带.mov (1.85 GB)</li>
              <li>分镜头Prompt与工作流模型包.zip (3.42 GB)</li>
              <li>分轨音频工程（BGM+赛博环境音效）.wav (420 MB)</li>
              <li>企业全球全渠道商业授权协议电子签署件.pdf (2.1 MB)</li>
            </ul>
          </div>

          <!-- 底部验收决策操作台 -->
          <div style="display:flex; align-items:center; justify-content:flex-end; gap:10px;">
            \${isPublisher || (pubOrder && pubOrder.role === 'publisher')
              ? \`<button type="button" class="hero-btn-secondary" style="color:#D97706; border-color:#D97706;" onclick="App.openRejectTaskModal('\${orderId}')">驳回返修</button>
                 <button type="button" class="hero-btn-primary" onclick="App.acceptMyTaskDelivery('\${orderId}')">确认验收通过并打款</button>\`
              : \`<button type="button" class="hero-btn-secondary" onclick="App.remindTaskAcceptance('\${orderId}')">催促买家验收</button>
                 <button type="button" class="hero-btn-primary" onclick="App.simulateAutoAccept('\${orderId}')">模拟超时自动打款</button>\`}
          </div>
        </div>
      </div>\`;
  },

  // 4. 返修中：买家返修建议工单 + 历史版本留存对比 + 重新提交入口
  renderSectionRevision: function(task, isPublisher, myOrderAny) {
    const myOrder = (MockData.tasks.myOrders || []).find(o => o.sourceId === task.id) || myOrderAny;
    const orderId = myOrder ? myOrder.id : 'MO-TEMP';

    return \`
      <div class="detail-state-section">
        <div class="detail-state-card" style="border-color:#F97316;">
          <div class="detail-state-card-head">
            <h3 class="detail-state-card-title" style="color:#C2410C;">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              买家驳回返修工单 (第 1 / 3 轮)
            </h3>
            <span class="detail-state-card-badge" style="background:#FFEDD5; color:#C2410C;">剩余 2 次返修机会 · 倒计时 36小时</span>
          </div>

          <div class="detail-revision-docket">
            <div style="font-weight:700; color:#9A3412; font-size:13.5px; margin-bottom:6px;">买家提出的具体修改意见：</div>
            <div style="font-size:13px; color:#7C2D12; line-height:1.6;">
              1. 视频第 00:18 处全景磁悬浮运镜速率偏快，请放慢约 15% 并增强景深光晕；<br>
              2. 人物右手手指部分在第 00:35 帧有轻微频闪形变，请使用 Inpaint 进行局部重绘修缮；<br>
              3. 结尾标板 Logo 颜色请替换为官方 Pantone 286C 品牌蓝。
            </div>
          </div>

          <!-- 历史版本对比 -->
          <div style="background:#F8FAFC; border-radius:8px; padding:12px 14px; margin-bottom:14px;">
            <div style="font-weight:600; font-size:13px; margin-bottom:8px;">历史版本留存链条：</div>
            <div style="font-size:12.5px; color:var(--text-secondary); display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px dashed #E2E8F0;">
              <span>V1.0 初版母带交付包 (提交于 2026-09-15)</span>
              <span style="color:#EF4444; font-weight:600;">已驳回返修</span>
            </div>
            <div style="font-size:12.5px; color:var(--text-secondary); display:flex; justify-content:space-between; padding:6px 0;">
              <span>V2.0 修订版交付包 (等待创作者重新提交)</span>
              <span style="color:#D97706; font-weight:600;">修改中</span>
            </div>
          </div>

          <div style="display:flex; justify-content:flex-end; gap:10px;">
            <button type="button" class="hero-btn-secondary" onclick="App.openDisputeModal('\${orderId}')">对返修要求有分歧？申请仲裁</button>
            <button type="button" class="hero-btn-primary" style="background:#D97706; border-color:#D97706;" onclick="App.openSubmitDeliveryModal('\${orderId}')">重新提交修改物</button>
          </div>
        </div>
      </div>\`;
  },

  // 5. 仲裁中：官方仲裁专席工单 + 双方证据链 + 调处进度
  renderSectionArbitration: function(task, isPublisher, myOrderAny) {
    const myOrder = (MockData.tasks.myOrders || []).find(o => o.sourceId === task.id) || myOrderAny;
    const orderId = myOrder ? myOrder.id : 'MO-TEMP';

    return \`
      <div class="detail-state-section">
        <div class="detail-state-card" style="border-color:#8B5CF6;">
          <div class="detail-state-card-head">
            <h3 class="detail-state-card-title" style="color:#6D28D9;">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              平台纠纷仲裁专席工单 [ARB-202609-0822]
            </h3>
            <span class="detail-state-card-badge" style="background:#EDE9FE; color:#6D28D9;">资金已司法级锁定 · 平台人工专席审理中</span>
          </div>

          <div class="detail-arbitration-docket">
            <div style="font-weight:700; color:#5B21B6; font-size:13.5px; margin-bottom:6px;">争议案情与诉求摘要：</div>
            <div style="font-size:13px; color:#4C1D95; line-height:1.6;">
              <strong>创作者申诉：</strong>已按照原始双方确定的分镜脚本完成交付，买家在第3轮返修时提出超出原始需求清单的非标全量重构要求，且拒绝按比例支付进度款，请求官方介入。<br>
              <strong>买家抗辩：</strong>认为成片动作连贯度未达到预期样片水准，要求全额退款。
            </div>
          </div>

          <!-- 仲裁调解处理进度时间轴 -->
          <div style="background:#F8FAFC; border-radius:8px; padding:12px 14px; margin-bottom:14px;">
            <div style="font-weight:600; font-size:13px; margin-bottom:8px;">官方调处时间线：</div>
            <div style="font-size:12.5px; color:var(--text-secondary); line-height:1.8;">
              <div>✓ 2026-09-16 10:20:00 · 仲裁申请受理，资金全额冻结</div>
              <div>✓ 2026-09-16 14:15:30 · 调取双方聊天全量记录、交付文件哈希与时间戳凭证</div>
              <div style="color:#6D28D9; font-weight:600;">▶ 2026-09-17 当前进度 · 专员正在比对原始分镜需求与成品，预计 12 小时内下达最终调解裁决</div>
            </div>
          </div>

          <div style="display:flex; justify-content:flex-end; gap:10px;">
            <button type="button" class="hero-btn-secondary" onclick="App.openDisputeModal('\${orderId}')">补充举证材料</button>
            <button type="button" class="hero-btn-primary" style="background:#8B5CF6; border-color:#8B5CF6;" onclick="App.showToast('已向仲裁专席催办，专属法务专员将加快审查')">联系仲裁专员</button>
          </div>
        </div>
      </div>\`;
  },

  // 6. 已完成：双方双向真实互评卡片 + 成果归档与展厅收录态
  renderSectionCompleted: function(task, isPublisher, myOrderAny) {
    const pubOrder = (MockData.tasks.myOrders || []).find(o => o.role === 'publisher' && o.sourceId === task.id);
    const crtOrder = (MockData.tasks.myOrders || []).find(o => o.role === 'creator' && o.sourceId === task.id);
    const acceptedCreator = (task.applicants || []).find(a => a.status === 'accepted') || {
      name: '小宇同学',
      avatar: 'assets/avatars/user_profile_large.png'
    };

    return \`
      <div class="detail-state-section">
        <!-- 合作双方双向真实互评卡片 -->
        <div class="detail-state-card">
          <div class="detail-state-card-head">
            <h3 class="detail-state-card-title">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              合作双方真实履约评价 (5.0 满分沉淀)
            </h3>
            <span class="detail-state-card-badge" style="background:#DCFCE7; color:#15803D;">双方互评已归档入个人信誉链</span>
          </div>

          <div class="detail-reviews-grid">
            <!-- 雇主评价 -->
            <div class="detail-review-item">
              <div class="detail-review-user-row">
                <div class="detail-review-user-info">
                  <img src="\${task.publisher && task.publisher.avatar ? task.publisher.avatar : 'assets/avatars/avatar_business.png'}" alt="" class="detail-review-avatar">
                  <div>
                    <strong style="font-size:13px; color:var(--text-primary);">\${task.publisherRole || '企业雇主 / 蔚来科技'}</strong>
                    <div style="font-size:11px; color:var(--text-muted);">发布方评价</div>
                  </div>
                </div>
                <div class="detail-review-stars">★★★★★ 5.0</div>
              </div>
              <div class="detail-review-content">
                “交付效率非常惊人！对 AI 提示词与动态色彩的把控超出预期，完美再现了未来交通的科技质感。成片已被集团营销部直接采纳，极力推荐！”
              </div>
              <div class="detail-review-tags">
                <span class="detail-review-tag">#交付极速</span>
                <span class="detail-review-tag">#审美在线</span>
                <span class="detail-review-tag">#商业授权完整</span>
              </div>
            </div>

            <!-- 创作者评价 -->
            <div class="detail-review-item">
              <div class="detail-review-user-row">
                <div class="detail-review-user-info">
                  <img src="\${acceptedCreator.avatar || 'assets/avatars/user_profile_large.png'}" alt="" class="detail-review-avatar">
                  <div>
                    <strong style="font-size:13px; color:var(--text-primary);">\${acceptedCreator.name}</strong>
                    <div style="font-size:11px; color:var(--text-muted);">创作者评价</div>
                  </div>
                </div>
                <div class="detail-review-stars">★★★★★ 5.0</div>
              </div>
              <div class="detail-review-content">
                “非常专业高效的发布方！需求交代得极为清楚，修改反馈具体且尊重创作者想法，验收结算秒到账，合作极度舒适！”
              </div>
              <div class="detail-review-tags">
                <span class="detail-review-tag">#需求清晰</span>
                <span class="detail-review-tag">#打款爽快</span>
                <span class="detail-review-tag">#五星雇主</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 商业成果归档与展厅收录情况 -->
        <div class="detail-state-card">
          <div class="detail-state-card-head">
            <h3 class="detail-state-card-title">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
              商业版权归档与展厅精选收录
            </h3>
            <span class="detail-state-card-badge" style="background:#EEF2FF; color:var(--primary);">版权存证编号：OPC-CERT-202609-088</span>
          </div>
          <div style="display:flex; align-items:center; justify-content:space-between; background:#F8FAFC; border-radius:10px; padding:14px 18px;">
            <div>
              <div style="font-weight:700; font-size:14px; color:var(--text-primary); margin-bottom:4px;">该任务优秀成果已正式入选【作品展厅 · 精选馆】</div>
              <div style="font-size:12.5px; color:var(--text-secondary);">全平台创作者可前往展厅观摩学习，其他品牌商可直接基于该样片发起同款定向定制。</div>
            </div>
            <button type="button" class="hero-btn-primary" style="white-space:nowrap; padding:8px 16px; font-size:12.5px;" onclick="App.setTasksMode('gallery'); App.closeTaskDetailPage();">逛作品展厅查看</button>
          </div>
        </div>
      </div>\`;
  },

  // 7. 未成交 / 已截止：结案审计 + 资金退回凭证 + 创作者竞标落选补偿
  renderSectionClosed: function(task, isPublisher, myOrderAny) {
    return \`
      <div class="detail-state-section">
        <div class="detail-state-card">
          <div class="detail-state-card-head">
            <h3 class="detail-state-card-title" style="color:var(--text-secondary);">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              商单结案审计与安全善后报告
            </h3>
            <span class="detail-state-card-badge" style="background:#F1F5F9; color:#64748B;">商单状态：未成交结案 · 全周期审计合规</span>
          </div>

          <div style="background:#F8FAFC; border-radius:10px; padding:14px 16px; margin-bottom:14px; font-size:13px; color:var(--text-secondary); line-height:1.6;">
            <strong>结案原因说明：</strong>本商单招募期满，由于项目非标定制要求特殊，未能匹配到完全契合的高校创作方，系统已自动触发安全结案机制。<br>
            <strong>资金退回凭证：</strong>发布方预先全额托管的赏金 <strong>\${task.rewardMoney || '¥ 5,000'}</strong> 已通过工行资金监管通道 100% 原路返还至发布方账户，零手续费。<br>
            <strong>创作者竞标保护：</strong>所有提交了有效竞标方案的高校学生个体，平台均已补偿发放 <strong>5点创作积分 + 1点信誉分</strong>。
          </div>

          <div style="display:flex; justify-content:flex-end; gap:10px;">
            <button type="button" class="hero-btn-secondary" onclick="App.closeTaskDetailPage()">返回任务大厅</button>
            \${isPublisher ? \`<button type="button" class="hero-btn-primary" onclick="App.openPublishTaskModal()">调整赏金并重新发布</button>\` : ''}
          </div>
        </div>
      </div>\`;
  },
`;

content = content.replace(insertMarker, newMethods + '\n' + insertMarker);
fs.writeFileSync(appFile, content, 'utf8');
console.log('Successfully injected state-driven bottom sections into app.js!');
