Created At: 2026-09-17T17:34:18+08:00
Completed At: 2026-09-17T17:34:18+08:00
File Path: `file:///Users/huangjianbin/Desktop/AI%E5%88%9B%E4%BD%9C%E8%80%85%E7%A4%BE%E5%8C%BA/ai-creator-community/js/app.js`
Total Lines: 7991
Total Bytes: 357891
Showing lines 3560 to 3720
The following code has been modified to include a line number before every line, in the format: <line_number>: <original_line>. Please note that any changes targeting the original code should remove the line number, colon, and leading space.
3560:   renderTaskDetailPage: function() {
3561:     const body = document.getElementById('tasks-detail-body');
3562:     const topActions = document.getElementById('task-detail-top-actions');
3563:     const task = (MockData.tasks.list || []).find(t => t.id === this.currentDetailTaskId);
3564:     if (!body || !task) return;
3565: 
3566:     this.syncTaskApplicantMeta(task);
3567:     const mode = this.getTaskAcceptMode(task);
3568:     const modeLabel = this.getAcceptModeLabel(mode);
3569:     const life = this.getTaskHallLifecycle(task);
3570:     const hallBadge = this.getHallCoverBadge(task);
3571:     const manage = !!this._taskDetailManageMode;
3572:     const displayStatus = manage
3573:       ? (life === 'open' ? this.getTaskDisplayStatus(task) : hallBadge)
3574:       : hallBadge;
3575:     const isPublisher = this.isPublisherOfTask(task);
3576:     const myOrder = this.getMyCreatorOrderForTask(task.id);
3577:     const myOrderAny = this.getMyCreatorOrderForTask(task.id, { includeDone: true });
3578:     // 大厅公开详情：未报名可报名；本人已报名则显示「已报名」
3579:     const canApplyPublic = life === 'open' && (task.status === '招募中' || task.status === '待参与')
3580:       && !isPublisher && !myOrderAny;
3581:     const iAppliedPublic = !manage && life === 'open' && !!(myOrderAny && ['待选定', '进行中', '待验收'].includes(myOrderAny.status));
3582:     const canApplyManage = manage && !isPublisher && !myOrderAny && life === 'open'
3583:       && (task.status === '招募中' || task.status === '待参与');
3584:     const canApply = manage ? canApplyManage : canApplyPublic;
3585:     const attachments = task.attachments || [];
3586: 
3587:     if (topActions) {
3588:       if (!manage) {
3589:         if (canApply) {
3590:           topActions.innerHTML = `<button type="button" class="hero-btn-primary" onclick="App.openTaskApplyModal('${task.id}')">${mode === 'manual' ? '去报名' : '立即接单'}</button>`;
3591:         } else if (iAppliedPublic) {
3592:           topActions.innerHTML = `<button type="button" class="hero-btn-secondary" disabled>已报名</button>`;
3593:         } else {
3594:           topActions.innerHTML = `<button type="button" class="hero-btn-secondary" disabled>${displayStatus}</button>`;
3595:         }
3596:       } else if (isPublisher && life === 'open') {
3597:         topActions.innerHTML = `<button type="button" class="hero-btn-primary" onclick="document.getElementById('task-detail-applicants')?.scrollIntoView({behavior:'smooth'})">${mode === 'manual' ? '选定创作者' : '查看名额'}</button>`;
3598:       } else if (isPublisher && task.status === '待验收') {
3599:         const pubOrder = (MockData.tasks.myOrders || []).find(o => o.role === 'publisher' && o.sourceId === task.id);
3600:         topActions.innerHTML = pubOrder
3601:           ? `<button type="button" class="hero-btn-primary" onclick="App.acceptMyTaskDelivery('${pubOrder.id}')">确认验收通过</button>
3602:              <button type="button" class="hero-btn-secondary" style="margin-left:6px; color:#D97706; border-color:#D97706;" onclick="App.openRejectTaskModal('${pubOrder.id}')">驳回返修</button>`
3603:           : `<button type="button" class="hero-btn-secondary" disabled>待验收</button>`;
3604:       } else if (isPublisher && life === 'active') {
3605:         topActions.innerHTML = `<button type="button" class="hero-btn-secondary" onclick="document.getElementById('task-detail-fulfillment')?.scrollIntoView({behavior:'smooth'})">查看履约进度</button>`;
3606:       } else if (isPublisher && life === 'ended') {
3607:         topActions.innerHTML = `<button type="button" class="hero-btn-secondary" onclick="App.switchMyTasksView('published', '${task.status === '未成交' || task.status === '已截止' ? '未成交' : '已完成'}'); App.closeTaskDetailPage();">回发布台账</button>`;
3608:       } else if (canApply) {
3609:         topActions.innerHTML = `<button type="button" class="hero-btn-primary" onclick="App.openTaskApplyModal('${task.id}')">${mode === 'manual' ? '提交报名' : '立即接单'}</button>`;
3610:       } else if (myOrder && myOrder.status === '返修中') {
3611:         topActions.innerHTML = `<button type="button" class="hero-btn-primary" style="background:#D97706; border-color:#D97706;" onclick="App.openSubmitDeliveryModal('${myOrder.id}')">重新提交交付物</button>`;
3612:       } else if (myOrder && myOrder.status === '进行中') {
3613:         topActions.innerHTML = `<button type="button" class="hero-btn-secondary" onclick="document.getElementById('task-detail-fulfillment')?.scrollIntoView({behavior:'smooth'})">今日汇报</button>
3614:           <button type="button" class="hero-btn-primary" onclick="App.openSubmitDeliveryModal('${myOrder.id}')">提交交付</button>`;
3615:       } else if (myOrder && myOrder.status === '待验收') {
3616:         topActions.innerHTML = `<button type="button" class="hero-btn-secondary" onclick="App.remindTaskAcceptance('${myOrder.id}')">催促验收</button>
3617:           <button type="button" class="hero-btn-primary" style="margin-left:6px;" onclick="App.simulateAutoAccept('${myOrder.id}')">模拟超时自动打款</button>`;
3618:       } else if (myOrderAny && myOrderAny.status === '已完成') {
3619:         let evalBtn = myOrderAny.evaluation
3620:           ? `<button type="button" class="hero-btn-secondary" onclick="App.openTaskEvaluateModal('${myOrderAny.id}')">查看评价</button>`
3621:           : `<button type="button" class="hero-btn-primary" style="background:linear-gradient(135deg,#F59E0B,#D97706); border-color:#D97706;" onclick="App.openTaskEvaluateModal('${myOrderAny.id}')">评价对方</button>`;
3622: 
3623:         let gallBtn = myOrderAny.listedToGallery
3624:           ? `<button type="button" class="hero-btn-secondary" style="margin-left:6px;" onclick="App.setTasksMode('gallery'); App.closeTaskDetailPage();">已上架展厅</button>`
3625:           : (myOrderAny.galleryApplyPending
3626:             ? `<button type="button" class="hero-btn-secondary" style="margin-left:6px;" disabled>展厅审核中</button>`
3627:             : `<button type="button" class="hero-btn-secondary" style="margin-left:6px;" onclick="App.requestGalleryListing('${myOrderAny.id}')">申请上架展厅</button>`);
3628:         topActions.innerHTML = `${evalBtn}${gallBtn}`;
3629:       } else if (myOrderAny) {
3630:         topActions.innerHTML = `<button type="button" class="hero-btn-secondary" onclick="App.closeTaskDetailPage();">我的任务 · ${this.normalizeOrderStatusLabel(myOrderAny.status)}</button>`;
3631:       } else if (life === 'active' || life === 'ended') {
3632:         topActions.innerHTML = `<button type="button" class="hero-btn-secondary" disabled>${displayStatus}</button>`;
3633:       } else {
3634:         topActions.innerHTML = `<button type="button" class="hero-btn-secondary" disabled>${displayStatus}</button>`;
3635:       }
3636:     }
3637: 
3638:     const canSeeProgress = manage && (isPublisher || !!(myOrderAny && ['进行中', '待验收', '已完成'].includes(myOrderAny.status)));
3639:     const applicantsHtml = this.renderTaskApplicantsSection(task, isPublisher, manage);
3640:     const fulfillmentHtml = canSeeProgress ? this.renderTaskFulfillmentSection(task, isPublisher) : '';
3641:     const selected = (task.applicants || []).find(a => a.status === 'accepted' || a.id === task.selectedCreatorId);
3642: 
3643:     let ctaBar = '';
3644:     if (!manage) {
3645:       if (canApply) {
3646:         ctaBar = `<button type="button" class="hero-btn-primary" onclick="App.openTaskApplyModal('${task.id}')">${mode === 'manual' ? '提交报名材料' : '确认报名接单'}</button>`;
3647:       } else if (iAppliedPublic) {
3648:         ctaBar = `<span class="tasks-detail-cta-hint">你已报名该任务 · 可在「我的任务」查看进度</span>`;
3649:       } else if (life === 'active') {
3650:         ctaBar = `<span class="tasks-detail-cta-hint">履约中 · 大厅仅展示公开基本信息</span>`;
3651:       } else if (life === 'ended') {
3652:         ctaBar = `<span class="tasks-detail-cta-hint">已结束 · ${displayStatus}</span>`;
3653:       }
3654:     } else if (canApply) {
3655:       ctaBar = `<button type="button" class="hero-btn-primary" onclick="App.openTaskApplyModal('${task.id}')">${mode === 'manual' ? '提交报名材料' : '确认报名接单'}</button>`;
3656:     } else if (isPublisher && life === 'open') {
3657:       ctaBar = `<span class="tasks-detail-cta-hint">${mode === 'manual' ? '请从上方候选人中选定一位合作创作者' : '创作者报名后将自动占名额'}</span>`;
3658:     } else if (isPublisher && task.status === '待验收') {
3659:       ctaBar = `<span class="tasks-detail-cta-hint">创作者已提交交付，确认后赏金将结算到对方账户</span>`;
3660:     } else if (canSeeProgress && life === 'active') {
3661:       ctaBar = `<span class="tasks-detail-cta-hint">任务履约中 · 创作者须每日汇报进度；漏报将从托管赏金扣费</span>`;
3662:     } else if (life === 'ended') {
3663:       ctaBar = `<span class="tasks-detail-cta-hint">任务已结束 · ${displayStatus}</span>`;
3664:     } else if (myOrderAny) {
3665:       ctaBar = `<span class="tasks-detail-cta-hint">你的状态：${this.normalizeOrderStatusLabel(myOrderAny.status)}</span>`;
3666:     }
3667: 
3668:     body.innerHTML = `
3669:       <div class="tasks-detail-hero">
3670:         <img src="${task.cover}" alt="" class="tasks-detail-cover">
3671:         <div class="tasks-detail-hero-copy">
3672:           <div class="tasks-detail-badges">
3673:             <span class="task-cover-badge ${life === 'active' || displayStatus === '已完成' ? 'badge-green' : (displayStatus === '未成交' || displayStatus === '已截止' || life === 'ended' ? 'badge-muted' : (displayStatus === '即将截止' ? 'badge-urgent' : ''))}">${displayStatus}</span>
3674:             <span class="task-detail-chip">${modeLabel}</span>
3675:             ${task.escrow ? '<span class="task-detail-chip">资金托管</span>' : ''}
3676:             ${task.invoice ? '<span class="task-detail-chip">可开专票</span>' : ''}
3677:             ${manage && selected ? `<span class="task-detail-chip">合作 · ${selected.name}</span>` : ''}
3678:           </div>
3679:           <h1 class="tasks-detail-title">${task.title}</h1>
3680:           <div class="tasks-detail-reward-row">
3681:             <strong>${task.rewardMoney || '面议'}</strong>
3682:             ${task.rewardPoints ? `<span>${task.rewardPoints} 创作积分</span>` : ''}
3683:           </div>
3684:           <div class="tasks-detail-meta-grid">
3685:             <div><label>发布方</label><span>${task.publisherRole || '平台'}</span></div>
3686:             <div><label>报名情况</label><span>${this.formatTaskParticipants(task)}</span></div>
3687:             <div><label>报名截止</label><span>${task.applyDeadline || task.deadline || '待定'}</span></div>
3688:             <div><label>交付截止</label><span>${task.deadlineDate || '待定'}</span></div>
3689:           </div>
3690:         </div>
3691:       </div>
3692: 
3693:       <div class="tasks-detail-grid">
3694:         <section class="tasks-detail-card">
3695:           <h3>任务需求</h3>
3696:           <p class="tasks-detail-text">${(task.desc || '').replace(/\n/g, '<br>')}</p>
3697:         </section>
3698:         <section class="tasks-detail-card">
3699:           <h3>交付物要求</h3>
3700:           <p class="tasks-detail-text">${(task.deliverables || '详见需求描述').replace(/\n/g, '<br>')}</p>
3701:         </section>
3702:         <section class="tasks-detail-card">
3703:           <h3>技能标签</h3>
3704:           <div class="task-tags-row">${(task.tags || []).map(tag => `<span class="task-tag-pill">${tag}</span>`).join('') || '—'}</div>
3705:         </section>
3706:         <section class="tasks-detail-card">
3707:           <h3>需求附件</h3>
3708:           ${attachments.length
3709:             ? `<ul class="tasks-detail-attach-list">${attachments.map(a => `<li>${a.name} <em>${this.formatFileSize ? this.formatFileSize(a.size) : ''}</em></li>`).join('')}</ul>`
3710:             : '<p class="tasks-detail-text is-muted">暂无附件</p>'}
3711:         </section>
3712:       </div>
3713: 
3714:       ${this.renderTaskStateSpecificBottomSection(task, isPublisher, manage, myOrderAny)}
3715: 
3716:       <div class="tasks-detail-cta-bar">
3717:         ${ctaBar}
3718:       </div>
3719:     `;
3720:   },
The above content does NOT show the entire file contents. If you need to view any lines of the file which were not shown to complete your task, call this tool again to view those lines.
