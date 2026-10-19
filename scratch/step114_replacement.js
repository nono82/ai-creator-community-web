  renderMyTasks: function() {
    const container = document.getElementById('tasks-mine-list-container');
    if (!container) return;
    if (!MockData.tasks.myOrders) MockData.tasks.myOrders = [];
    this.syncExpiredCreatorApplications();

    const role = this.activeMyTasksRole || 'taken';
    let list = [...MockData.tasks.myOrders].filter(o =>
      role === 'published' ? this.isMyPublishedOrder(o) : this.isMyTakenOrder(o)
    );

    if (this.activeMyTasksStatus && this.activeMyTasksStatus !== '全部') {
      if (this.activeMyTasksStatus === '招募中') {
        list = list.filter(o => o.status === '招募中');
      } else {
        list = list.filter(o =>
          o.status === this.activeMyTasksStatus
          || (this.activeMyTasksStatus === '草稿' && o.isDraft)
          || (this.activeMyTasksStatus === '未入选' && (o.status === '未入选' || o.status === '未中标'))
          || (this.activeMyTasksStatus === '未成交' && (o.status === '未成交' || o.status === '已截止'))
        );
      }
    }

    if (list.length === 0) {
      container.innerHTML = role === 'published'
        ? `<div class="gallery-empty">暂无该状态的发布任务，点击「发布任务」创建需求或保存草稿</div>`
        : `<div class="gallery-empty">暂无该状态的接单，去任务大厅报名，或在展厅发起定制</div>`;
      return;
    }

    container.innerHTML = list.map(o => {
      const roleTag = o.role === 'publisher'
        ? (o.status === '草稿' || o.isDraft ? '草稿' : '广场发布')
        : (o.role === 'buyer' ? '展厅定制' : '广场承接');
      const displayStatus = this.normalizeOrderStatusLabel(o.status);
      
      let coreLine = o.coreInfo
        || (o.role === 'publisher' && o.status === '招募中'
          ? `${(o.applicantCount != null ? o.applicantCount : '—')} 人报名 · 待选定`
          : (o.status === '未成交' || o.status === '已截止'
            ? (o.role === 'publisher' ? '未成交 · 选人超时资金已原路退回' : '未成交 · 招募结束未产生合作')
            : (o.deadline || o.desc || '')));
      
      // 状态角标颜色映射
      let badgeClass = 'badge-muted';
      if (o.status === '已完成') badgeClass = 'badge-green';
      else if (o.status === '进行中') badgeClass = 'badge-green';
      else if (o.status === '返修中') badgeClass = 'badge-amber';
      else if (o.status === '待验收') badgeClass = 'badge-amber';
      else if (o.status === '仲裁中') badgeClass = 'badge-purple';
      else if (o.status === '待接单') badgeClass = 'badge-cyan';
      else if (o.status === '招募中' || o.status === '待选定') badgeClass = '';

      // 倒计时提醒条
      let countdownBar = '';
      if (o.status === '待验收') {
        const hrs = o.autoAcceptHoursRemain || 68;
        countdownBar = `
          <div class="task-countdown-bar">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>发布方验收倒计时 <strong>${hrs}:15:20</strong> · 超期系统自动打款</span>
          </div>`;
      } else if (o.status === '返修中') {
        countdownBar = `
          <div class="task-countdown-bar is-revision">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span>发布方修改意见：${(o.revisions && o.revisions[0] && o.revisions[0].note) || '请按修改清单完善成片'}</span>
          </div>`;
      } else if (o.status === '仲裁中') {
        countdownBar = `
          <div class="task-countdown-bar is-dispute">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            <span>纠纷调处中 · 专员将于 24 小时内出具解决方案</span>
          </div>`;
      }

      // 动作按状态与角色精准分发
      let actions = '';
      if (o.status === '草稿' || o.isDraft) {
        actions = `<button type="button" class="btn-apply-task" onclick="App.resumePublishTaskDraft('${o.id}')">继续编辑</button>`;
      } else if (o.status === '未成交' || o.status === '已截止') {
        if (o.role === 'publisher') {
          actions = `<button type="button" class="btn-apply-task" onclick="App.republishTask('${o.id}')">重新发布</button>`;
        } else {
          actions = `<button type="button" class="btn-apply-task" onclick="App.openTaskDetailPage('${o.sourceId}')">查看详情</button>`;
        }
      } else if (o.status === '待接单' && o.role === 'creator') {
        actions = `<button type="button" class="btn-apply-task" onclick="App.openCustomConfirmModal('${o.id}')">响应商单</button>`;
      } else if ((o.status === '招募中' || o.status === '待选定') && o.role === 'publisher') {
        const pickLabel = o.acceptMode === 'auto' ? '查看名额' : '选定创作者';
        actions = `<button type="button" class="btn-apply-task" onclick="App.openTaskDetailPage('${o.sourceId}', 'applicants')">${pickLabel}</button>`;
      } else if (o.status === '待选定' && o.role === 'creator') {
        actions = `<button type="button" class="btn-apply-task" onclick="App.openTaskDetailPage('${o.sourceId}')">查看进度</button>`;
      } else if (o.status === '未中标' || o.status === '未入选') {
        actions = `<button type="button" class="btn-apply-task" onclick="App.openTaskDetailPage('${o.sourceId}')">查看详情</button>`;
      } else if (o.status === '进行中') {
        if (o.role === 'buyer') {
          actions = `<button type="button" class="btn-apply-task" onclick="App.openSubmitDeliveryModal('${o.id}')">标记已交付</button>`;
        } else if (o.role === 'publisher') {
          actions = `<button type="button" class="btn-apply-task" onclick="App.openTaskDetailPage('${o.sourceId}', 'fulfillment')">查看履约</button>
            <button type="button" class="btn-apply-task applied" style="margin-left:4px;" onclick="App.openDisputeModal('${o.id}')">申请仲裁</button>`;
        } else {
          actions = `<button type="button" class="btn-apply-task" onclick="App.openSubmitDeliveryModal('${o.id}')">提交交付</button>
            <button type="button" class="btn-apply-task applied" style="margin-left:4px;" onclick="App.openDisputeModal('${o.id}')">申请仲裁</button>`;
        }
      } else if (o.status === '返修中') {
        if (o.role === 'creator') {
          actions = `<button type="button" class="btn-apply-task" style="background:#D97706; border-color:#D97706;" onclick="App.openSubmitDeliveryModal('${o.id}')">重新提交交付</button>
            <button type="button" class="btn-apply-task applied" style="margin-left:4px;" onclick="App.openDisputeModal('${o.id}')">申请仲裁</button>`;
        } else {
          actions = `<button type="button" class="btn-apply-task" onclick="App.openTaskDetailPage('${o.sourceId}', 'fulfillment')">查看返修进度</button>
            <button type="button" class="btn-apply-task applied" style="margin-left:4px;" onclick="App.openDisputeModal('${o.id}')">申请仲裁</button>`;
        }
      } else if (o.status === '待验收') {
        if (o.role === 'creator') {
          actions = `<button type="button" class="btn-apply-task" onclick="App.remindTaskAcceptance('${o.id}')">催促验收</button>
            <button type="button" class="btn-apply-task applied" style="margin-left:4px; font-size:11px;" title="72小时无操作自动确认打款" onclick="App.simulateAutoAccept('${o.id}')">一键模拟超时打款</button>`;
        } else {
          actions = `<button type="button" class="btn-apply-task" onclick="App.acceptMyTaskDelivery('${o.id}')">确认验收</button>
            <button type="button" class="btn-apply-task" style="background:#D97706; border-color:#D97706; margin-left:4px;" onclick="App.openRejectTaskModal('${o.id}')">驳回返修</button>`;
        }
      } else if (o.status === '仲裁中') {
        actions = `<button type="button" class="btn-apply-task" style="background:#8B5CF6; border-color:#8B5CF6;" onclick="App.openDisputeModal('${o.id}')">查看调处详情</button>`;
      } else if (o.status === '已完成') {
        let evalBtn = '';
        if (o.evaluation) {
          evalBtn = `<button type="button" class="btn-apply-task applied" onclick="App.openTaskEvaluateModal('${o.id}')">查看互评</button>`;
        } else {
          evalBtn = `<button type="button" class="btn-apply-task" style="background:linear-gradient(135deg,#F59E0B,#D97706); border-color:#D97706;" onclick="App.openTaskEvaluateModal('${o.id}')">评价对方</button>`;
        }

        let galleryBtn = '';
        if (o.role === 'creator') {
          if (o.listedToGallery || o.galleryStatus === 'approved') {
            galleryBtn = `<button type="button" class="btn-apply-task applied" style="margin-left:4px;" onclick="App.setTasksMode('gallery')">已上架展厅</button>`;
          } else if (o.galleryStatus === 'pending' || o.galleryApplyPending) {
            galleryBtn = `<button type="button" class="btn-apply-task applied" style="margin-left:4px;" onclick="App.simulateApproveGalleryListing('${o.id}')">展厅审核中(点击快审)</button>`;
          } else {
            galleryBtn = `<button type="button" class="btn-apply-task" style="margin-left:4px;" onclick="App.requestGalleryListing('${o.id}')">申请上架</button>`;
          }
        }
        actions = `${evalBtn}${galleryBtn}`;
      } else {
        actions = `<button type="button" class="btn-apply-task applied" disabled>已结束</button>`;
      }

      const cardClick = (o.status === '草稿' || o.isDraft)
        ? `App.resumePublishTaskDraft('${o.id}')`
        : `App.openTaskDetailPage('${o.sourceId || o.id}')`;

      return `
        <div class="task-plaza-card tasks-mine-card" onclick="${cardClick}">
          <div class="task-card-cover-wrap">
            <img src="${o.cover}" alt="${o.title}" class="task-card-cover-img">
            <span class="task-cover-badge ${badgeClass}">${displayStatus}</span>
          </div>
          <div class="task-card-main">
            <div class="task-title-wrap">
              <span class="task-card-title">${String(o.title || '').replace(/^【草稿】/, '')}</span>
            </div>
            <div class="task-card-desc">${coreLine}</div>
            ${countdownBar}
            <div class="task-card-meta" style="margin-top:6px;">
              <span class="task-meta-item">${roleTag}</span>
              <span class="task-meta-item">${o.counterpart || '平台'}</span>
              <span class="task-meta-item">${o.deadline || ''}</span>
            </div>
          </div>
          <div class="task-card-right-action">
            <div class="task-reward-box">
              ${o.rewardMoney ? `<div class="task-reward-cash">${o.rewardMoney}</div>` : ''}
              <div onclick="event.stopPropagation()" style="display:flex; align-items:center; flex-wrap:wrap; justify-content:flex-end; gap:4px; margin-top:4px;">${actions}</div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },