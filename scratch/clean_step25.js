}
if (life === 'active') return '履约中';
if (task && (task.status === '未成交' || task.status === '已截止')) return '未成交';
if (task && task.status === '已关闭') return '已关闭';
return '已完成';
},

getTaskDisplayStatus: function(task) {
if (!task) return '';
// 详情/台账仍用完整状态；大厅封面请用 getHallCoverBadge
if (task.status === '已截止') return '未成交';
if (task.status === '已完成' || task.status === '未成交' || task.status === '已关闭' || task.status === '草稿' || task.status === '待验收') {
return task.status;
}
if (task.status === '进行中') return '进行中';
const mode = this.getTaskAcceptMode(task);
const accepted = (task.applicants || []).filter(a => a.status === 'accepted').length;
const quota = task.quota || 1;
if (mode === 'auto' && accepted >= quota) return '已满额';
if (mode === 'manual' && task.status === '招募中') return '招募中';
if (task.status === '招募中' || task.status === '待参与') return '招募中';
return task.status || '招募中';
},

formatTaskParticipants: function(task) {
if (!task) return '0人报名';
const count = typeof task.applicantCount === 'number'
? task.applicantCount
: (task.applicants || []).length;
const mode = this.getTaskAcceptMode(task);
const quota = task.quota || 1;
if (mode === 'auto') return `名额 ${count}/${quota}`;
return `${count} 人报名`;
},

syncTaskApplicantMeta: function(task) {
if (!task) return;
const list = task.applicants || [];
task.applicantCount = list.length;
task.participants = this.formatTaskParticipants(task);
const mode = this.getTaskAcceptMode(task);
const accepted = list.filter(a => a.status === 'accepted').length;
const quota = task.quota || 1;
if (['已完成', '未成交', '已截止', '已关闭', '草稿', '待验收'].includes(task.status)) {
task.badge = task.status === '已截止' ? '未成交' : task.status;
task.badgeColor = task.status === '已完成' ? 'green' : '';
return;
}
if (task.status === '进行中') {
task.badge = (mode === 'auto' && accepted >= quota) ? '已满额' : '进行中';
task.badgeColor = 'green';
return;
}
if (mode === 'auto' && accepted >= quota) {
task.status = '进行中';
task.badge = '已满额';
task.badgeColor = 'green';
} else {
task.badge = task.isHot ? '热门' : '招募中';
task.badgeColor = '';
}
},

findPlazaTask: function(taskId) {
return (MockData.tasks.list || []).find(t => t.id === taskId)
|| (MockData.tasks.todayRec || []).find(t => t.id === taskId);
},

syncTaskStats: function() {
const orders = MockData.tasks.myOrders || [];
const active = orders.filter(o =>
o.status === '进行中' || o.status === '待验收' || o.status === '招募中' || o.status === '待选定'
).length;
const finishedInLedger = orders.filter(o => o.status === '已完成').length;
const finished = (MockData.currentUser.finishedTasksBase || 11) + finishedInLedger;
MockData.currentUser.activeTasks = active;
MockData.currentUser.finishedTasks = finished;

const activeEl = document.getElementById('my-active-tasks-count');
const finishedEl = document.getElementById('my-finished-tasks-count');
if (activeEl) activeEl.innerText = active;
if (finishedEl) finishedEl.innerText = finished;
},

/** 广场任务未成交时：仍「待选定」的承接报名 → 未成交 */
syncExpiredCreatorApplications: function() {
const tasks = MockData.tasks.list || [];
const orders = MockData.tasks.myOrders || [];
orders.forEach(o => {
if (o.role !== 'creator') return;
if (!(o.status === '待选定' || o.applicationStatus === 'pending')) return;
const task = tasks.find(t => t.id === o.sourceId);
if (!task) return;
if (task.status === '未成交' || task.status === '已截止' || task.status === '已关闭') {
o.status = '未成交';
o.applicationStatus = 'expired';
o.coreInfo = '未成交 · 招募结束未产生合作';
}
});
},

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
const coreLine = o.coreInfo
|| (o.role === 'publisher' && o.status === '招募中'
? `${(o.applicantCount != null ? o.applicantCount : '—')} 人报名 · 待选定`
: (o.status === '未成交' || o.status === '已截止'
? (o.role === 'publisher' ? '未成交 · 报名结束未选定合作方' : '未成交 · 招募结束未产生合作')
: (o.deadline || o.desc || '')));
let actions = '';
if (o.status === '草稿' || o.isDraft) {
actions = `<button type="button" class="btn-apply-task" onclick="App.resumePublishTaskDraft('${o.id}')">继续编辑</button>`;
} else if (o.status === '未成交' || o.status === '已截止') {
actions = `<button type="button" class="btn-apply-task" onclick="App.openTaskDetailPage('${o.sourceId}')">查看详情</button>`;
} else if ((o.status === '招募中' || o.status === '待选定') && o.role === 'publisher') {
const pickLabel = o.acceptMode === 'auto' ? '查看名额' : '选定创作者';
actions = `<button type="button" class="btn-apply-task" onclick="App.openTaskDetailPage('${o.sourceId}', 'applicants')">${pickLabel}</button>`;
} else if (o.status === '待选定' && o.role === 'creator') {
actions = `<button type="button" class="btn-apply-task" onclick="App.openTaskDetailPage('${o.sourceId}')">查看进度</button>`;
} else if (o.status === '未中标' || o.status === '未入选') {
actions = `<button type="button" class="btn-apply-task" onclick="App.openTaskDetailPage('${o.sourceId}')">查看详情</button>`;
} else if (o.status === '进行中') {
if (o.role === 'buyer') {
actions = `<button type="button" class="btn-apply-task" onclick="App.submitMyTaskDelivery('${o.id}')">标记已交付</button>`;
} else if (o.role === 'publisher') {
actions = `<button type="button" class="btn-apply-task" onclick="App.openTaskDetailPage('${o.sourceId}', 'fulfillment')">查看履约</button>`;
} else {
// 承接方进行中：先看进度日报，详情内可提交交付
actions = `<button type="button" class="btn-apply-task" onclick="App.openTaskDetailPage('${o.sourceId}', 'fulfillment')">查看进度</button>`;
}
} else if (o.status === '待验收') {
if (o.role === 'creator') {
actions = `<button type="button" class="btn-apply-task applied" disabled>等待验收</button>`;
} else {
actions = `<button type="button" class="btn-apply-task" onclick="App.acceptMyTaskDelivery('${o.id}')">确认验收</button>`;
}
} else {
if (o.role === 'creator' && o.listedToGallery) {
actions = `<button type="button" class="btn-apply-task applied" disabled>已上架</button>`;
} else if (o.role === 'creator' && o.galleryApplyPending) {
actions = `<button type="button" class="btn-apply-task applied" disabled>已申请上架</button>`;
} else if (o.role === 'creator') {
actions = `<button type="button" class="btn-apply-task" onclick="App.requestGalleryListing('${o.id}')">申请上架</button>`;
} else {
actions = `<button type="button" class="btn-apply-task applied" disabled>已完成</button>`;
}
}

const cardClick = (o.status === '草稿' || o.isDraft)
? `App.resumePublishTaskDraft('${o.id}')`
: `App.openTaskDetailPage('${o.sourceId || o.id}')`;

return `
<div class="task-plaza-card tasks-mine-card" onclick="${cardClick}">
<div class="task-card-cover-wrap">
<img src="${o.cover}" alt="${o.title}" class="task-card-cover-img">
<span class="task-cover-badge ${o.status === '已完成' ? 'badge-green' : (o.status === '草稿' || o.status === '未成交' || o.status === '已截止' || o.status === '未入选' || o.status === '未中标' ? 'badge-muted' : '')}">${displayStatus}</span>
</div>
<div class="task-card-main">
<div class="task-title-wrap">
<span class="task-card-title">${String(o.title || '').replace(/^【草稿】/, '')}</span>
</div>
<div class="task-card-desc">${coreLine}</div>
<div class="task-card-meta">
<span class="task-meta-item">${roleTag}</span>
<span class="task-meta-item">${o.counterpart || '平台'}</span>
<span class="task-meta-item">${o.deadline || ''}</span>