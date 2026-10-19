      } else if (isPublisher && task.status === '待验收') {
        const pubOrder = (MockData.tasks.myOrders || []).find(o => o.role === 'publisher' && o.sourceId === task.id);
        topActions.innerHTML = pubOrder
          ? `<button type="button" class="hero-btn-primary" onclick="App.acceptMyTaskDelivery('${pubOrder.id}')">确认验收通过</button>
             <button type="button" class="hero-btn-secondary" style="margin-left:6px; color:#D97706; border-color:#D97706;" onclick="App.openRejectTaskModal('${pubOrder.id}')">驳回返修</button>`
          : `<button type="button" class="hero-btn-secondary" disabled>待验收</button>`;
      } else if (isPublisher && life === 'active') {
        topActions.innerHTML = `<button type="button" class="hero-btn-secondary" onclick="document.getElementById('task-detail-fulfillment')?.scrollIntoView({behavior:'smooth'})">查看履约进度</button>`;
      } else if (isPublisher && life === 'ended') {
        topActions.innerHTML = `<button type="button" class="hero-btn-secondary" onclick="App.switchMyTasksView('published', '${task.status === '未成交' || task.status === '已截止' ? '未成交' : '已完成'}'); App.closeTaskDetailPage();">回发布台账</button>`;
      } else if (canApply) {
        topActions.innerHTML = `<button type="button" class="hero-btn-primary" onclick="App.openTaskApplyModal('${task.id}')">${mode === 'manual' ? '提交报名' : '立即接单'}</button>`;
      } else if (myOrder && myOrder.status === '返修中') {
        topActions.innerHTML = `<button type="button" class="hero-btn-primary" style="background:#D97706; border-color:#D97706;" onclick="App.openSubmitDeliveryModal('${myOrder.id}')">重新提交交付物</button>`;
      } else if (myOrder && myOrder.status === '进行中') {
        topActions.innerHTML = `<button type="button" class="hero-btn-secondary" onclick="document.getElementById('task-detail-fulfillment')?.scrollIntoView({behavior:'smooth'})">今日汇报</button>
          <button type="button" class="hero-btn-primary" onclick="App.openSubmitDeliveryModal('${myOrder.id}')">提交交付</button>`;
      } else if (myOrder && myOrder.status === '待验收') {
        topActions.innerHTML = `<button type="button" class="hero-btn-secondary" onclick="App.remindTaskAcceptance('${myOrder.id}')">催促验收</button>
          <button type="button" class="hero-btn-primary" style="margin-left:6px;" onclick="App.simulateAutoAccept('${myOrder.id}')">模拟超时自动打款</button>`;
      } else if (myOrderAny && myOrderAny.status === '已完成') {
        let evalBtn = myOrderAny.evaluation
          ? `<button type="button" class="hero-btn-secondary" onclick="App.openTaskEvaluateModal('${myOrderAny.id}')">查看评价</button>`
          : `<button type="button" class="hero-btn-primary" style="background:linear-gradient(135deg,#F59E0B,#D97706); border-color:#D97706;" onclick="App.openTaskEvaluateModal('${myOrderAny.id}')">评价对方</button>`;

        let gallBtn = myOrderAny.listedToGallery
          ? `<button type="button" class="hero-btn-secondary" style="margin-left:6px;" onclick="App.setTasksMode('gallery'); App.closeTaskDetailPage();">已上架展厅</button>`
          : (myOrderAny.galleryApplyPending
            ? `<button type="button" class="hero-btn-secondary" style="margin-left:6px;" disabled>展厅审核中</button>`
            : `<button type="button" class="hero-btn-secondary" style="margin-left:6px;" onclick="App.requestGalleryListing('${myOrderAny.id}')">申请上架展厅</button>`);
        topActions.innerHTML = `${evalBtn}${gallBtn}`;