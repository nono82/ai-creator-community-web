  listOrderToGallery: function(orderId) {
    // 兼容旧调用：改为申请上架
    this.requestGalleryListing(orderId);
  },

  // ====== 1. 驳回修改 / 申请返修 ======
  openRejectTaskModal: function(orderId) {
    const order = (MockData.tasks.myOrders || []).find(o => o.id === orderId);
    if (!order) return;
    const revCount = order.revisionCount || 0;
    if (revCount >= 3) {
      this.showToast('该任务已达到最大返修次数(3次)，建议申请平台仲裁');
      return;
    }
    const idInput = document.getElementById('reject-order-id');
    const roundEl = document.getElementById('reject-round-label');
    const noteInput = document.getElementById('reject-note-input');
    const dlInput = document.getElementById('reject-deadline-input');
    if (idInput) idInput.value = orderId;
    if (roundEl) roundEl.textContent = `第 ${revCount + 1} / 3 次返修`;
    if (noteInput) noteInput.value = '';
    if (dlInput) {
      const d = new Date();
      d.setDate(d.getDate() + 2);
      dlInput.value = d.toISOString().split('T')[0];
    }
    this.openModal('modal-task-reject');
  },

  submitTaskRejection: function() {
    const id = document.getElementById('reject-order-id')?.value;
    const note = document.getElementById('reject-note-input')?.value.trim();
    const deadline = document.getElementById('reject-deadline-input')?.value;
    if (!note) {
      this.showToast('请填写具体的修改要求与说明');
      return;
    }
    const order = (MockData.tasks.myOrders || []).find(o => o.id === id);
    if (!order) return;

    const related = (MockData.tasks.myOrders || []).filter(o =>
      o.sourceId && order.sourceId && o.sourceId === order.sourceId
    );
    const targets = related.length ? related : [order];
    const nextRound = (order.revisionCount || 0) + 1;

    targets.forEach(o => {
      o.status = '返修中';
      o.revisionCount = nextRound;
      if (!Array.isArray(o.revisions)) o.revisions = [];
      o.revisions.unshift({
        round: nextRound,
        note: note,
        deadline: deadline || '2天内',
        requestedAt: this.getDemoToday(),
        status: 'pending'
      });
      o.coreInfo = `返修中 (第${nextRound}/3次) · ${note.slice(0, 24)}…`;
    });

    this.closeModal('modal-task-reject');
    this.refreshTaskViews();
    this.showToast(`已向创作者发出第 ${nextRound} 次返修要求`);
  },

  // ====== 2. 提交交付成果 ======
  openSubmitDeliveryModal: function(orderId) {
    const idInput = document.getElementById('delivery-order-id');
    if (idInput) idInput.value = orderId;
    this.openModal('modal-submit-delivery');
  },

  doSubmitDelivery: function() {
    const id = document.getElementById('delivery-order-id')?.value;
    const url = document.getElementById('delivery-url-input')?.value.trim();
    const pwd = document.getElementById('delivery-pwd-input')?.value.trim();
    const fname = document.getElementById('delivery-filename-input')?.value.trim();
    const note = document.getElementById('delivery-note-input')?.value.trim();
    if (!url) {
      this.showToast('请填写交付网盘或在线预览链接');
      return;
    }
    const order = (MockData.tasks.myOrders || []).find(o => o.id === id);
    if (!order) return;

    const related = (MockData.tasks.myOrders || []).filter(o =>
      o.sourceId && order.sourceId && o.sourceId === order.sourceId
    );
    const targets = related.length ? related : [order];

    targets.forEach(o => {
      o.status = '待验收';
      o.autoAcceptHoursRemain = 72;
      o.deliveryFile = {
        name: fname || '交付成片及工程文件.zip',
        url: url,
        pwd: pwd,
        note: note,
        submittedAt: this.getDemoToday() + ' 12:00'
      };
      o.coreInfo = '已提交交付 · 发布方验收倒计时 72:00:00 · 超期自动结算';
    });

    this.closeModal('modal-submit-delivery');
    this.refreshTaskViews();
    this.showToast('🎉 成片与交付物提交成功！发布方已进入 72 小时验收倒计时');
  },

  // ====== 3. 催促验收与超时模拟 ======
  remindTaskAcceptance: function(orderId) {
    this.showToast('🔔 加急催促通知已发送给发布方！若 72 小时内未验收，系统将自动确认并全额结算打款');
  },

  simulateAutoAccept: function(orderId) {
    this.acceptMyTaskDelivery(orderId);
    this.showToast('⏰ 模拟触发：发布方 72 小时验收倒计时超期，系统已自动确认验收并将赏金打款至你的账户！');
  },

  // ====== 4. 双向互评体系 ======
  openTaskEvaluateModal: function(orderId) {
    const order = (MockData.tasks.myOrders || []).find(o => o.id === orderId);
    if (!order) return;
    const idInput = document.getElementById('evaluate-order-id');
    const roleInput = document.getElementById('evaluate-role');
    const targetBar = document.getElementById('evaluate-target-bar');
    const starsGroup = document.getElementById('evaluate-stars-group');
    const tagsGroup = document.getElementById('evaluate-quick-tags');
    const commentInput = document.getElementById('evaluate-comment-input');

    if (idInput) idInput.value = orderId;
    if (roleInput) roleInput.value = order.role;

    const isCreator = order.role === 'creator';
    if (targetBar) {
      targetBar.innerHTML = `
        <img src="${isCreator ? 'assets/avatars/user_profile_large.png' : (order.cover || 'assets/avatars/nearby_1.jpg')}" class="evaluate-target-avatar" alt="">
        <div>
          <div style="font-weight:700; color:var(--text-primary); font-size:14px;">评价对象：${order.counterpart || (isCreator ? '发布方' : '创作者')}</div>
          <div style="font-size:12px; color:var(--text-secondary); margin-top:2px;">所属任务：${order.title} · ${order.rewardMoney}</div>
        </div>
      `;
    }

    const dims = isCreator
      ? [
          { key: 'clarity', label: '需求明确清晰度' },
          { key: 'communication', label: '沟通响应速度' },
          { key: 'settlement', label: '结款验收爽快度' }
        ]
      : [
          { key: 'quality', label: 'AI交付制作质量' },
          { key: 'punctuality', label: '按时交付准时率' },
          { key: 'attitude', label: '沟通与配合态度' }
        ];

    this._currentEvaluationRatings = { dim1: 5, dim2: 5, dim3: 5 };

    if (starsGroup) {
      starsGroup.innerHTML = dims.map((d, idx) => `
        <div class="evaluate-dimension-row">
          <span style="font-size:13px; font-weight:600; color:var(--text-primary);">${d.label}</span>
          <div class="evaluate-stars" data-dim="dim${idx + 1}">
            ${[1, 2, 3, 4, 5].map(star => `
              <button type="button" class="star-btn active" data-star="${star}" onclick="App.setEvalStar('dim${idx + 1}', ${star})">★</button>
            `).join('')}
          </div>
        </div>
      `).join('');
    }

    const quickTags = isCreator
      ? ['合作非常爽快', '需求沟通明确', '结算神速', '值得长期合作']
      : ['AI画面超惊艳', '交付准时高效', '专业技能扎实', '沟通顺畅细心'];

    if (tagsGroup) {
      tagsGroup.innerHTML = quickTags.map(t => `
        <span class="quick-tag-chip" onclick="this.classList.toggle('active')">${t}</span>
      `).join('');
    }

    if (commentInput) {
      commentInput.value = order.evaluation ? (order.evaluation.comment || '') : '';
    }

    this.openModal('modal-task-evaluate');
  },

  setEvalStar: function(dimKey, star) {
    if (!this._currentEvaluationRatings) this._currentEvaluationRatings = {};
    this._currentEvaluationRatings[dimKey] = star;
    const container = document.querySelector(`.evaluate-stars[data-dim="${dimKey}"]`);
    if (container) {
      container.querySelectorAll('.star-btn').forEach((btn, idx) => {
        btn.classList.toggle('active', idx < star);
      });
    }
  },

  submitTaskEvaluation: function() {
    const id = document.getElementById('evaluate-order-id')?.value;
    const order = (MockData.tasks.myOrders || []).find(o => o.id === id);
    if (!order) return;

    const comment = document.getElementById('evaluate-comment-input')?.value.trim() || '合作非常顺畅愉快，5星好评！';
    const selectedTags = Array.from(document.querySelectorAll('#evaluate-quick-tags .quick-tag-chip.active')).map(el => el.textContent);

    const evalObj = {
      evaluatedAt: this.getDemoToday(),
      ratings: this._currentEvaluationRatings || { dim1: 5, dim2: 5, dim3: 5 },
      averageScore: 5.0,
      comment: comment,
      tags: selectedTags
    };

    const related = (MockData.tasks.myOrders || []).filter(o =>
      o.sourceId && order.sourceId && o.sourceId === order.sourceId
    );
    const targets = related.length ? related : [order];
    targets.forEach(o => {
      o.evaluation = evalObj;
      o.needEvaluation = false;
      o.coreInfo = '已完成结算 · 双方已互评 · 信用沉淀完成';
    });

    this.closeModal('modal-task-evaluate');
    this.refreshTaskViews();
    this.showToast('🌟 评价提交成功！信用积分已沉淀到双方主页与创作者评级');
  },

  // ====== 5. 平台争议仲裁 ======
  openDisputeModal: function(orderId) {
    const order = (MockData.tasks.myOrders || []).find(o => o.id === orderId);
    if (!order) return;
    const idInput = document.getElementById('dispute-order-id');
    if (idInput) idInput.value = orderId;
    this.openModal('modal-task-dispute');
  },

  submitTaskDispute: function() {
    const id = document.getElementById('dispute-order-id')?.value;
    const type = document.getElementById('dispute-type-select')?.value;
    const reason = document.getElementById('dispute-reason-input')?.value.trim();
    if (!reason) {
      this.showToast('请填写详细的争议事实说明');
      return;
    }
    const order = (MockData.tasks.myOrders || []).find(o => o.id === id);
    if (!order) return;

    const related = (MockData.tasks.myOrders || []).filter(o =>
      o.sourceId && order.sourceId && o.sourceId === order.sourceId
    );
    const targets = related.length ? related : [order];

    targets.forEach(o => {
      o.status = '仲裁中';
      o.dispute = {
        initiator: order.role,
        type: type,
        reason: reason,
        initiatedAt: this.getDemoToday() + ' 14:20',
        agentName: '官方履约纠纷调解员01号',
        status: '审核调查中'
      };
      o.coreInfo = `平台仲裁介入中 · ${type} · 24小时内出具调解方案`;
    });

    this.closeModal('modal-task-dispute');
    this.refreshTaskViews();
    this.showToast('⚖️ 仲裁申请已正式受理！平台已冻结资金并由专员接入调解');
  },

  // ====== 6. 展位管理与档期切换 ======
  openMyGalleryManageModal: function() {
    const status = MockData.tasks.gallery.myScheduleStatus || 'available';
    document.querySelectorAll('.schedule-switch-group .schedule-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-sch') === status);
    });

    const listEl = document.getElementById('my-booth-works-list');
    if (listEl) {
      const myWorks = (MockData.tasks.gallery.works || []).filter(w => (w.creator && w.creator.name === '小宇同学') || w.id === 'GW00');
      const approvedOrPending = (MockData.tasks.myOrders || []).filter(o => o.role === 'creator' && (o.listedToGallery || o.galleryApplyPending || o.galleryStatus === 'approved' || o.galleryStatus === 'pending'));

      let itemsHtml = myWorks.map(w => `
        <div class="booth-work-item">
          <div class="booth-work-left">
            <img src="${w.cover}" class="booth-work-cover" alt="">
            <div>
              <div style="font-weight:600; font-size:13.5px; color:var(--text-primary);">${w.title}</div>
              <div style="font-size:11.5px; color:var(--text-secondary); margin-top:2px;">参考报价：${w.priceRange} · 已交付 ${w.delivered || 0} 单</div>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="booth-status-pill is-active">展厅在售</span>
            <button type="button" class="hero-btn-secondary" style="padding:3px 8px; font-size:11px;" onclick="App.setTasksMode('gallery'); App.closeModal('modal-my-gallery-manage');">前往展厅</button>
          </div>
        </div>
      `).join('');

      approvedOrPending.forEach(o => {
        if (!myWorks.some(w => w.title.includes(o.title.slice(0, 8)))) {
          const isApp = o.galleryStatus === 'approved' || o.listedToGallery;
          itemsHtml += `
            <div class="booth-work-item">
              <div class="booth-work-left">
                <img src="${o.cover}" class="booth-work-cover" alt="">
                <div>
                  <div style="font-weight:600; font-size:13.5px; color:var(--text-primary);">${o.title}</div>
                  <div style="font-size:11.5px; color:var(--text-secondary); margin-top:2px;">源自任务交付 · ${o.rewardMoney}</div>
                </div>
              </div>
              <div style="display:flex; align-items:center; gap:8px;">
                <span class="booth-status-pill ${isApp ? 'is-active' : 'is-audit'}">${isApp ? '展厅在售' : '平台审核中'}</span>
              </div>
            </div>
          `;
        }
      });

      listEl.innerHTML = itemsHtml || '<div class="gallery-empty">暂无展厅上架作品，完成任务后可申请入驻</div>';
    }

    this.openModal('modal-my-gallery-manage');
  },

  setCreatorSchedule: function(status) {
    MockData.tasks.gallery.myScheduleStatus = status;
    document.querySelectorAll('.schedule-switch-group .schedule-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-sch') === status);
    });
    // 更新小宇同学的作品档期
    (MockData.tasks.gallery.works || []).forEach(w => {
      if ((w.creator && w.creator.name === '小宇同学') || w.id === 'GW00') {
        w.scheduleStatus = status;
        w.available = status !== 'closed';
      }
    });
    this.renderGalleryPlaza();
    const map = { available: '可接单', busy: '档期紧张', closed: '暂停接单' };
    this.showToast(`接单档期已切换为：【${map[status] || status}】`);
  },

  simulateApproveGalleryListing: function(orderId) {
    const order = (MockData.tasks.myOrders || []).find(o => o.id === orderId);
    if (!order) return;
    order.galleryStatus = 'approved';
    order.listedToGallery = true;
    order.galleryApplyPending = false;
    order.coreInfo = '已结算 · 作品已审核通过并入驻展厅！';

    // 动态添加一个展品到展厅
    const newWork = {
      id: 'GW-NEW-' + Date.now().toString().slice(-4),
      title: order.title,
      cover: order.cover,
      category: order.tags && order.tags[0] ? order.tags[0] : 'AI短视频',
      scene: '优质任务成果',
      badge: '我的展品',
      views: '1.2万',
      likes: '1,520',
      priceRange: order.rewardMoney || '¥1,500-3,000',
      cycle: '3-5 天',
      delivered: 1,
      tags: order.tags || ['精选交付'],
      source: '任务优质交付',
      available: true,
      scheduleStatus: MockData.tasks.gallery.myScheduleStatus || 'available',
      sourceTask: {
        id: order.sourceId || 'TK01',
        title: order.title,
        award: '任务精选交付'
      },
      creator: {
        name: '小宇同学',
        school: '南京大学',
        level: 'Lv.4',
        avatar: 'assets/avatars/user_profile_large.png'
      }
    };
    MockData.tasks.gallery.works.unshift(newWork);
    this.renderMyTasks();
    this.renderGalleryPlaza();
    this.showToast('🎉 审核通过！作品已正式在作品展厅上架，支持买家找你定制！');
  },

  // ====== 7. 展厅定向定制接单/婉拒 ======
  openCustomConfirmModal: function(orderId) {
    const order = (MockData.tasks.myOrders || []).find(o => o.id === orderId);
    if (!order) return;
    const idInput = document.getElementById('custom-confirm-order-id');
    const cardEl = document.getElementById('custom-invite-card');
    if (idInput) idInput.value = orderId;
    if (cardEl) {
      cardEl.innerHTML = `
        <div style="display:flex; gap:12px; align-items:center; padding:12px; background:var(--bg-hover,#F8FAFC); border-radius:8px;">
          <img src="${order.cover}" style="width:64px; height:48px; border-radius:4px; object-fit:cover;" alt="">
          <div>
            <div style="font-weight:700; font-size:14px; color:var(--text-primary);">${order.title}</div>
            <div style="font-size:12px; color:var(--text-secondary); margin-top:2px;">来自客户：${order.counterpart || '买家'} · 托管赏金：<strong style="color:#EF4444;">${order.rewardMoney}</strong></div>
          </div>
        </div>
        <p style="font-size:12.5px; color:var(--text-secondary); line-height:1.6; margin-top:12px;">
          ${order.desc || '客户参考你在展厅的作品发起同款风格定制需求，赏金已100%全额托管至平台。接单后将进入履约制作流程。'}
        </p>
      `;
    }
    this.openModal('modal-custom-confirm');
  },

  confirmCustomOrder: function() {
    const id = document.getElementById('custom-confirm-order-id')?.value;
    const order = (MockData.tasks.myOrders || []).find(o => o.id === id);
    if (!order) return;
    order.status = '进行中';
    order.coreInfo = '履约中 · 定制商单制作中 · 待交付';
    this.closeModal('modal-custom-confirm');
    this.refreshTaskViews();
    this.showToast('🤝 已成功接单！请按期推进制作，可在履约中提交每日进度');
  },

  declineCustomOrder: function() {
    const id = document.getElementById('custom-confirm-order-id')?.value;
    const order = (MockData.tasks.myOrders || []).find(o => o.id === id);
    if (!order) return;
    order.status = '未成交';
    order.coreInfo = '未成交 · 创作者档期冲突已婉拒 · 赏金已全额退还客户';
    this.closeModal('modal-custom-confirm');
    this.refreshTaskViews();
    this.showToast('已婉拒该定制邀请，客户托管赏金已全额退还');
  },

  republishTask: function(orderId) {
    this.openPublishTaskPage();
    this.showToast('已载入未成交任务需求，请调整预算或交付时间后重新上架');
  },