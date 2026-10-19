
const life = this.activeTasksPlazaLifecycle || 'open';
if (this.activeTasksPlazaCategory === '长期任务') {
this.activeTasksPlazaCategory = '全部任务';
document.querySelectorAll('#tasks-filter-tabs .pill-tab').forEach(tab => {
tab.classList.toggle('active', tab.getAttribute('data-tcat') === '全部任务');
});
}
let list = [...MockData.tasks.list].filter(t => this.getTaskHallLifecycle(t) === life);

if (this.activeTasksPlazaCategory !== '全部任务') {
if (this.activeTasksPlazaCategory === '热门任务') {
list = list.filter(t => t.isHot || t.badge === '热门' || (t.tags || []).includes('热门'));
} else {
list = list.filter(t => t.category === this.activeTasksPlazaCategory || (t.tags || []).includes(this.activeTasksPlazaCategory));
}
}

const q = String(this.activeTasksPlazaQuery || '').trim().toLowerCase();
if (q) {
list = list.filter(t => String(t.title || '').toLowerCase().includes(q));
}

if (list.length === 0) {
const emptyByLife = {
open: '暂无可报名任务，试试切换品类或稍后再来',
active: '暂无履约中的任务',
ended: '暂无已结束任务'
};
container.innerHTML = `<div class="gallery-empty">${q ? '未找到标题匹配的任务，试试其他关键词' : (emptyByLife[life] || '该筛选下暂无任务')}</div>`;
return;
}

if (this.activeTasksPlazaSort === 'high-reward') {
list.sort((a, b) => (parseInt(String(b.rewardMoney || '').replace(/[^\d]/g, ''), 10) || 0) - (parseInt(String(a.rewardMoney || '').replace(/[^\d]/g, ''), 10) || 0));
} else if (this.activeTasksPlazaSort === 'deadline-soon') {
const toTime = (t) => {
const d = (life === 'ended' ? t.deadlineDate : (t.applyDeadline || t.deadlineDate)) || '';
const ts = Date.parse(d.replace(/-/g, '/'));
return Number.isFinite(ts) ? ts : Number.MAX_SAFE_INTEGER;
};
list.sort((a, b) => toTime(a) - toTime(b));
} else if (this.activeTasksPlazaSort === 'most-applied') {
const toCount = (t) => typeof t.applicantCount === 'number'
? t.applicantCount
: (parseInt(String(t.participants || '').replace(/[^\d]/g, ''), 10) || 0);
list.sort((a, b) => toCount(b) - toCount(a));
}

const usersIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
const clockIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
const coinIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8"/><path d="M12 8v8M9.5 10.5c.5-.8 1.4-1.3 2.5-1.3 1.7 0 3 1 3 2.3s-1.3 2.3-3 2.3c-1.1 0-2-.5-2.5-1.3"/></svg>`;

container.innerHTML = list.map(t => {
const mode = this.getTaskAcceptMode(t);
const taskLife = life; // 与当前 Tab 一致
const hallBadge = taskLife === 'open'
? (this.isApplyDeadlineSoon(t, 3) ? '即将截止' : '可报名')
: (taskLife === 'active' ? '履约中' : this.getHallCoverBadge(t));
const myOrd = this.getMyCreatorOrderForTask(t.id, { includeDone: true });
const iApplied = !!(myOrd && ['待选定', '进行中', '待验收'].includes(myOrd.status));
let ctaLabel = '查看详情';
let ctaPrimary = false;
let ctaClick = `App.openTaskDetailPage('${t.id}')`;
if (taskLife === 'open') {
if (iApplied) {
ctaLabel = '已报名';
ctaPrimary = false;
ctaClick = `App.openTaskDetailPage('${t.id}')`;
} else {
ctaLabel = mode === 'manual' ? '去报名' : '立即接单';
ctaPrimary = true;
ctaClick = `App.openTaskApplyModal('${t.id}')`;
}
}
const statusTone = hallBadge === '履约中' || hallBadge === '已完成'
? 'badge-green'
: (hallBadge === '未成交' || hallBadge === '已截止' || hallBadge === '已关闭' ? 'badge-muted'
: (hallBadge === '即将截止' ? 'badge-urgent' : ''));
const coreLine = String(t.deliverables || t.desc || '').replace(/\s+/g, ' ').slice(0, 48);
const rewardHint = t.escrow ? '托管赏金' : '赏金面议';
const timeLabel = taskLife === 'ended'
? (t.deadlineDate || t.deadline || '已结束')
: (taskLife === 'active'
? (t.deadlineDate ? ('交付 ' + t.deadlineDate) : (t.deadline || '履约中'))
: (t.applyDeadline ? ('报名 ' + t.applyDeadline) : (t.deadline || '待定')));
return `
<div class="task-plaza-card" onclick="App.openTaskDetailPage('${t.id}')">
<div class="task-card-cover-wrap">
<img src="${t.cover}" alt="${t.title}" class="task-card-cover-img">
<span class="task-cover-badge ${statusTone}">${hallBadge}</span>
</div>
<div class="task-card-main">
<div class="task-title-wrap">
<span class="task-card-title">${t.title}</span>
</div>
<div class="task-card-desc">${coreLine}${coreLine.length >= 48 ? '…' : ''}</div>
<div class="task-card-meta">
<span class="task-meta-item">${t.category || '任务'}</span>
<span class="task-meta-item">${usersIcon} ${this.formatTaskParticipants(t)}</span>
<span class="task-meta-item">${clockIcon} ${timeLabel}</span>
</div>
<div class="task-card-meta is-sub">
<span class="task-meta-item">${t.publisherRole || '平台任务'}</span>
<span class="task-meta-item">${rewardHint}</span>
${t.invoice ? '<span class="task-meta-item">可开专票</span>' : ''}
</div>
</div>

<div class="task-card-right-action" onclick="event.stopPropagation()">
<div class="task-reward-box">
${t.rewardMoney ? `<div class="task-reward-cash">${t.rewardMoney}</div>` : ''}
${t.rewardPoints ? `<div class="task-reward-points">${coinIcon} ${t.rewardPoints} 创作积分</div>` : '<div class="task-reward-points is-empty">无创作积分</div>'}
<button type="button" class="btn-apply-task ${ctaPrimary ? '' : 'applied'}"
onclick="${ctaClick}">
${ctaLabel}
</button>
</div>
</div>
</div>`;
}).join('');