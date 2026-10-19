isMyPublishedOrder: function(o) {
return !!(o && (o.role === 'publisher' || o.role === 'buyer'));
},

setTasksMode: function(mode) {
if (!mode || !['hall', 'gallery', 'mine'].includes(mode)) return;
this.activeTasksMode = mode;
this.applyTasksMode();
this.renderTasksRight();
},

applyTasksMode: function() {
const mode = this.activeTasksMode;
const isGallery = mode === 'gallery';
const isMine = mode === 'mine';
const isHall = mode === 'hall';

document.querySelectorAll('#tasks-mode-tabs .underline-tab').forEach(tab => {
tab.classList.toggle('active', tab.getAttribute('data-mode') === mode);
});

const hall = document.getElementById('tasks-hall-block');
const gallery = document.getElementById('tasks-gallery-block');
const mine = document.getElementById('tasks-mine-block');
if (hall) hall.hidden = !isHall;
if (gallery) gallery.hidden = !isGallery;
if (mine) mine.hidden = !isMine;

const desc = document.getElementById('tasks-hero-desc');
const actions = document.getElementById('tasks-hero-actions');
if (desc) {
desc.textContent = isGallery
? '浏览学生优秀作品，联系制作方同学发起定向定制'
: isMine
? '承接与发布任务进度一目了然；验收通过后收益进入我的资产'
: '参与任务挑战，赢取奖励与成长；或逛作品展厅，找校园制作方定制';
}
if (actions) {
if (isGallery) {
actions.innerHTML = `<button type="button" class="hero-btn-primary" onclick="App.openPublishTaskModal()">发布任务</button>
<button type="button" class="hero-btn-secondary" onclick="App.setTasksMode('hall')">去接任务</button>`;
} else if (isMine) {
actions.innerHTML = `<button type="button" class="hero-btn-primary" onclick="App.openPublishTaskModal()">发布任务</button>
<button type="button" class="hero-btn-secondary" onclick="App.setTasksMode('hall')">去接新任务</button>`;
} else {
actions.innerHTML = `<button type="button" class="hero-btn-primary" onclick="App.openPublishTaskModal()">发布任务</button>
<button type="button" class="hero-btn-secondary" onclick="App.setTasksMode('gallery')">逛作品展厅</button>`;
}
}

if (isGallery) this.renderGalleryPlaza();
else if (isMine) this.renderMyTasks();
else this.renderTasksPlaza();
},

toggleTasksSortMenu: function(forceOpen) {
const dropdown = document.getElementById('tasks-sort-dropdown');
const btn = document.getElementById('tasks-sort-btn');
if (!dropdown || !btn) return;
const next = typeof forceOpen === 'boolean' ? forceOpen : !this.tasksSortMenuOpen;
this.tasksSortMenuOpen = next;
dropdown.hidden = !next;
btn.setAttribute('aria-expanded', next ? 'true' : 'false');
btn.classList.toggle('is-open', next);
},

setTasksPlazaSort: function(sort) {
this.activeTasksPlazaSort = sort || 'high-reward';
this.syncTasksSortMenuUI();
this.toggleTasksSortMenu(false);
this.renderTasksPlaza();
},

syncTasksSortMenuUI: function() {
const sort = this.activeTasksPlazaSort || 'high-reward';
const labels = {
'high-reward': '赏金从高到低',
'deadline-soon': '即将截止',
'most-applied': '报名人数最多'
};
const labelEl = document.getElementById('tasks-sort-btn-label');
if (labelEl) labelEl.textContent = labels[sort] || labels['high-reward'];
const dropdown = document.getElementById('tasks-sort-dropdown');
if (dropdown) {
dropdown.querySelectorAll('.tasks-sort-option').forEach(opt => {
opt.classList.toggle('active', opt.getAttribute('data-tsort') === sort);
});
}
},

getTaskAcceptMode: function(task) {
return (task && task.acceptMode) === 'manual' ? 'manual' : 'auto';
},

getAcceptModeLabel: function(mode, compact) {
if (mode === 'manual') return compact ? '需选定' : '发布方选定';
return compact ? '即接单' : '报名即接';
},

/** 大厅生命周期：open 可报名 / active 进行中 / ended 已结束 */
getTaskHallLifecycle: function(task) {
if (!task) return 'ended';
const status = task.status || '';
if (['已完成', '未成交', '已截止', '已关闭'].includes(status)) return 'ended';
if (['待验收', '进行中'].includes(status)) return 'active';
if (status === '招募中' || status === '待参与') {
const mode = this.getTaskAcceptMode(task);
const accepted = (task.applicants || []).filter(a => a.status === 'accepted').length;
const quota = task.quota || 1;
if (mode === 'auto' && accepted >= quota) return 'active';
return 'open';
}
return 'ended';
},

isApplyDeadlineSoon: function(task, withinDays) {
const days = typeof withinDays === 'number' ? withinDays : 3;
const raw = task && (task.applyDeadline || task.deadlineDate);
if (!raw) return false;
const ts = Date.parse(String(raw).replace(/-/g, '/'));
if (!Number.isFinite(ts)) return false;
const diff = ts - Date.now();
return diff >= 0 && diff <= days * 86400000;
},

/** 大厅封面角标：按生命周期简化，不暴露「待验收」等履约细节 */
getHallCoverBadge: function(task) {
const life = this.getTaskHallLifecycle(task);
if (life === 'open') {
return this.isApplyDeadlineSoon(task, 3) ? '即将截止' : '可报名';
}