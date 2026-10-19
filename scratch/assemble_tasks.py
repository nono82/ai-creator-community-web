import re
import sys

# 1. Read app.js
with open('ai-creator-community/js/app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

# 2. Read all extracted snippets
with open('ai-creator-community/scratch/clean_step23.js') as f:
    clean_s23 = f.read()

with open('ai-creator-community/scratch/clean_step25.js') as f:
    clean_s25 = f.read()

with open('ai-creator-community/scratch/clean_step107.js') as f:
    clean_s107 = f.read()

with open('ai-creator-community/scratch/step811_renderTaskDetailPage.js') as f:
    s811_raw = f.read()

with open('ai-creator-community/scratch/step842_replacement.js') as f:
    s842 = f.read()

with open('ai-creator-community/scratch/step860_replacement.js') as f:
    s860 = f.read()

with open('ai-creator-community/scratch/step114_replacement.js') as f:
    s114 = f.read()

with open('ai-creator-community/scratch/step130_replacement.js') as f:
    s130 = f.read()

# Patch s842 with s860
completed_marker = "// 4. 已完成：双方双向真实互评卡片 + 成果归档与展厅收录态"
idx1 = s842.find(completed_marker)
idx2 = s842.find("// 5. 未成交 / 已截止", idx1)
if idx1 != -1 and idx2 != -1:
    s842 = s842[:idx1] + s860.strip() + '\n\n    ' + s842[idx2:]
    print("Patched s842 with s860 completed section.")

# Clean s811
s811_clean_lines = []
for line in s811_raw.split('\n'):
    m = re.match(r'^\d+:\s*(.*)$', line)
    if m:
        s811_clean_lines.append(m.group(1))
s811_clean = '\n'.join(s811_clean_lines)

# Apply Step 697 card clamp into s114 (renderMyTasks)
old_s114_desc = """      // 精简核心信息，防止文字过长变形
      const rawCore = o.coreInfo || o.desc || '';
      const cleanCore = rawCore.length > 40 ? rawCore.slice(0, 40) + '…' : rawCore;

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
            <div class="task-card-desc">${cleanCore}</div>
            ${countdownBar}"""

new_s114_desc = """      const rawCore = String(o.coreInfo || o.desc || '').replace(/\\s+/g, ' ').trim();

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
            <div class="task-card-desc" title="${rawCore}">${rawCore}</div>
            ${countdownBar}"""

if old_s114_desc in s114:
    s114 = s114.replace(old_s114_desc, new_s114_desc)
    print("Applied Step 697 2-line desc to renderMyTasks (s114).")

part1_header = """  // =========================================================================
  // 5. 任务广场 (Tasks) 渲染与交互
  // =========================================================================
  renderTasks: function() {
    // 1. 一级模式 Tab 点击 (任务大厅 hall / 作品展厅 gallery / 我的任务 mine)
    const modeTabs = document.querySelectorAll('#tasks-mode-tabs .underline-tab');
    modeTabs.forEach(tab => {
      tab.onclick = () => {
        const mode = tab.getAttribute('data-mode');
        this.setTasksMode(mode);
      };
    });

    // 2. 任务大厅生命周期 Tab 点击 (可报名 open / 履约中 active / 已结束 ended)
    const lifeTabs = document.querySelectorAll('#tasks-lifecycle-tabs .tasks-mine-role-btn');
    lifeTabs.forEach(btn => {
      btn.onclick = () => {
        const life = btn.getAttribute('data-life') || 'open';
        this.setHallLifecycleTab(life);
      };
    });

    // 3. 任务大厅分类 Tab 点击
    const tTabs = document.querySelectorAll('#tasks-filter-tabs .pill-tab');
    tTabs.forEach(tab => {
      tab.onclick = () => {
        tTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.activeTasksPlazaCategory = tab.getAttribute('data-tcat') || '全部任务';
        this.renderTasksPlaza();
      };
    });

    // 4. 任务搜索输入
    const searchInput = document.getElementById('tasks-title-search');
    if (searchInput) {
      searchInput.oninput = (e) => {
        this.activeTasksPlazaQuery = (e.target.value || '').trim();
        this.renderTasksPlaza();
      };
    }

    // 5. 任务排序下拉
    const sortBtn = document.getElementById('tasks-sort-btn');
    const sortDropdown = document.getElementById('tasks-sort-dropdown');
    if (sortBtn && sortDropdown) {
      sortBtn.onclick = (e) => {
        e.stopPropagation();
        this.toggleTasksSortMenu();
      };
      sortDropdown.querySelectorAll('.tasks-sort-option').forEach(opt => {
        opt.onclick = (e) => {
          e.stopPropagation();
          const s = opt.getAttribute('data-tsort');
          this.setTasksPlazaSort(s);
          this.toggleTasksSortMenu(false);
        };
      });
      document.addEventListener('click', () => {
        this.toggleTasksSortMenu(false);
      });
    }

    // 6. 作品展厅分类 Tab
    const gTabs = document.querySelectorAll('#gallery-filter-tabs .pill-tab');
    gTabs.forEach(tab => {
      tab.onclick = () => {
        gTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.activeGalleryCategory = tab.getAttribute('data-gcat') || '全部';
        this.renderGalleryPlaza();
      };
    });

    // 7. 作品展厅排序下拉
    const galleryDropdown = document.getElementById('gallery-dropdown-filter');
    if (galleryDropdown) {
      galleryDropdown.onchange = (e) => {
        this.activeGallerySort = e.target.value || 'featured';
        this.renderGalleryPlaza();
      };
    }

    // 8. 我的任务角色 Tab 点击 (承接任务 taken / 发布任务 published)
    const myRoleBtns = document.querySelectorAll('#my-tasks-role-tabs .tasks-mine-role-btn');
    myRoleBtns.forEach(btn => {
      btn.onclick = () => {
        const role = btn.getAttribute('data-myrole') || 'taken';
        this.setMyTasksRole(role);
      };
    });

    this.renderMyTasksStatusTabs();
    this.syncTaskStats();
    this.applyTasksMode();
    this.renderTasksRight();
  },

  setTasksMode: function(mode, silent) {
    if (!mode || !['hall', 'gallery', 'mine'].includes(mode)) return;
    this.activeTasksMode = mode;
    this.applyTasksMode();
    this.renderTasksRight();
    if (!silent) {
      const tip = mode === 'gallery' ? '已进入作品展厅 · 精选馆'
        : mode === 'mine' ? '已打开「我的任务」台账'
        : '已切换回任务大厅';
      this.showToast(tip);
    }
  },

  applyTasksMode: function() {
    const mode = this.activeTasksMode || 'hall';
    const isGallery = mode === 'gallery';
    const isMine = mode === 'mine';
    const isHall = mode === 'hall';

    document.querySelectorAll('#tasks-mode-tabs .underline-tab').forEach(tab => {
      tab.classList.toggle('active', tab.getAttribute('data-mode') === mode);
    });

    const hall = document.getElementById('tasks-hall-block');
    const gallery = document.getElementById('tasks-gallery-block');
    const mine = document.getElementById('tasks-mine-block');
    if (hall) {
      hall.hidden = !isHall;
      hall.style.display = isHall ? 'block' : 'none';
    }
    if (gallery) {
      gallery.hidden = !isGallery;
      gallery.style.display = isGallery ? 'block' : 'none';
    }
    if (mine) {
      mine.hidden = !isMine;
      mine.style.display = isMine ? 'block' : 'none';
    }

    const desc = document.getElementById('tasks-hero-desc');
    const actions = document.getElementById('tasks-hero-actions');
    if (desc) {
      desc.textContent = isGallery
        ? '沉淀高校认证创作者真实商单交付成果与高分样片，支持在线观摩与一键定制。'
        : isMine
          ? '跟踪接单与定向定制进度，验收通过后收益进入我的资产'
          : '参与任务挑战，赢取奖励与成长；或逛作品展厅，找校园制作方定制';
    }
    if (actions) {
      if (isGallery) {
        actions.innerHTML = `<button type="button" class="hero-btn-primary" onclick="App.setTasksMode('hall')">去接任务</button>
          <button type="button" class="hero-btn-secondary" onclick="App.setTasksMode('mine')">我的任务</button>`;
      } else if (isMine) {
        actions.innerHTML = `<button type="button" class="hero-btn-primary" onclick="App.setTasksMode('hall')">去接新任务</button>
          <button type="button" class="hero-btn-secondary" onclick="App.setTasksMode('gallery')">逛作品展厅</button>`;
      } else {
        actions.innerHTML = `<button type="button" class="hero-btn-primary" onclick="App.openPublishTaskModal()">发布任务</button>
          <button type="button" class="hero-btn-secondary" onclick="App.setTasksMode('gallery')">逛作品展厅</button>`;
      }
    }

    if (isGallery) this.renderGalleryPlaza();
    else if (isMine) this.renderMyTasks();
    else this.renderTasksPlaza();
  },

  setHallLifecycleTab: function(life) {
    if (!life || !['open', 'active', 'ended'].includes(life)) life = 'open';
    this.activeTasksPlazaLifecycle = life;
    const btns = document.querySelectorAll('#tasks-lifecycle-tabs .tasks-mine-role-btn');
    btns.forEach(btn => {
      const active = btn.getAttribute('data-life') === life;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    this.renderTasksPlaza();
  },

  setMyTasksRole: function(role) {
    if (!role || !['taken', 'published'].includes(role)) role = 'taken';
    this.activeMyTasksRole = role;
    const btns = document.querySelectorAll('#my-tasks-role-tabs .tasks-mine-role-btn');
    btns.forEach(btn => {
      const active = btn.getAttribute('data-myrole') === role;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    this.activeMyTasksStatus = '全部';
    this.renderMyTasksStatusTabs();
    this.renderMyTasks();
  },

  getMyTasksStatusOptions: function(role) {
    if (role === 'published') {
      return ['全部', '草稿', '招募中', '进行中', '待验收', '已完成', '未成交'];
    }
    return ['全部', '待选定', '进行中', '待验收', '已完成', '未入选', '未成交'];
  },

  renderMyTasksStatusTabs: function() {
    const container = document.getElementById('my-tasks-status-tabs');
    if (!container) return;
    const role = this.activeMyTasksRole || 'taken';
    const options = this.getMyTasksStatusOptions(role);
    if (!options.includes(this.activeMyTasksStatus)) {
      this.activeMyTasksStatus = '全部';
    }
    container.innerHTML = options.map(status => `
      <button type="button" class="pill-tab ${status === this.activeMyTasksStatus ? 'active' : ''}" data-mystatus="${status}">${status}</button>
    `).join('');
    container.querySelectorAll('.pill-tab').forEach(tab => {
      tab.onclick = () => {
        container.querySelectorAll('.pill-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.activeMyTasksStatus = tab.getAttribute('data-mystatus') || '全部';
        this.renderMyTasks();
      };
    });
  },

  toggleTasksSortMenu: function(forceOpen) {
    const menu = document.getElementById('tasks-sort-menu');
    const btn = document.getElementById('tasks-sort-btn');
    const dd = document.getElementById('tasks-sort-dropdown');
    if (!menu || !btn || !dd) return;
    const open = typeof forceOpen === 'boolean' ? forceOpen : dd.hidden;
    dd.hidden = !open;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  },

  setTasksPlazaSort: function(sort) {
    this.activeTasksPlazaSort = sort || 'high-reward';
    this.syncTasksSortMenuUI();
    this.renderTasksPlaza();
  },

  syncTasksSortMenuUI: function() {
    const labelEl = document.getElementById('tasks-sort-btn-label');
    const sort = this.activeTasksPlazaSort || 'high-reward';
    const map = {
      'high-reward': '赏金从高到低',
      'deadline-soon': '即将截止',
      'most-applied': '报名人数最多'
    };
    if (labelEl) labelEl.textContent = map[sort] || '赏金从高到低';
    document.querySelectorAll('#tasks-sort-dropdown .tasks-sort-option').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tsort') === sort);
    });
  },

  syncTaskStats: function() {
    const orders = MockData.tasks.myOrders || [];
    const active = orders.filter(o => o.status === '进行中' || o.status === '待验收' || o.status === '返修中' || o.status === '待选定').length;
    const finishedInLedger = orders.filter(o => o.status === '已完成').length;
    const finished = (MockData.currentUser.finishedTasksBase || 11) + finishedInLedger;
    MockData.currentUser.activeTasks = active;
    MockData.currentUser.finishedTasks = finished;

    const activeEl = document.getElementById('my-active-tasks-count');
    const finishedEl = document.getElementById('my-finished-tasks-count');
    if (activeEl) activeEl.innerText = active;
    if (finishedEl) finishedEl.innerText = finished;
  },

  syncTaskApplicantMeta: function(task) {
    if (!task) return;
    if (!Array.isArray(task.applicants)) task.applicants = [];
    task.applicantCount = task.applicants.length;
    if (typeof task.participants !== 'number') {
      task.participants = task.applicantCount;
    }
  },

  syncExpiredCreatorApplications: function() {
    // 检查是否有超期未选定商单
  },

  getTaskHallLifecycle: function(task) {
    if (!task) return 'open';
    const s = task.status || '';
    if (s === '招募中' || s === '待参与' || s === '待选定' || s === '草稿') return 'open';
    if (s === '进行中' || s === '待验收' || s === '返修中' || s === '仲裁中') return 'active';
    return 'ended';
  },

  getTaskAcceptMode: function(task) {
    if (!task) return 'manual';
    return task.acceptMode === 'auto' ? 'auto' : 'manual';
  },

  getAcceptModeLabel: function(mode, compact) {
    if (compact) return mode === 'auto' ? '即接' : '选拔';
    return mode === 'auto' ? '名额即接' : '方案选拔';
  },

  getHallCoverBadge: function(task) {
    const life = this.getTaskHallLifecycle(task);
    if (life === 'open') {
      return this.isApplyDeadlineSoon(task, 3) ? '即将截止' : '可报名';
    }
    if (life === 'active') return '履约中';
    if (task && (task.status === '未成交' || task.status === '已截止')) return '未成交';
    if (task && task.status === '已关闭') return '已关闭';
    return '已完成';
  },

  getTaskDisplayStatus: function(task) {
    if (!task) return '';
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

  isApplyDeadlineSoon: function(task, withinDays) {
    const dStr = (task && (task.applyDeadline || task.deadlineDate)) || '';
    if (!dStr) return false;
    const ts = Date.parse(dStr.replace(/-/g, '/'));
    if (!Number.isFinite(ts)) return false;
    const diff = ts - Date.now();
    return diff > 0 && diff <= (withinDays || 3) * 86400000;
  },

  formatTaskParticipants: function(task) {
    if (!task) return '0人报名';
    const count = typeof task.applicantCount === 'number'
      ? task.applicantCount
      : (task.applicants || []).length;
    const mode = this.getTaskAcceptMode(task);
    if (mode === 'auto') {
      const q = task.quota || 1;
      return `${count}/${quota} 人接单`;
    }
    return `${count} 人竞标`;
  },

  getMyCreatorOrderForTask: function(taskId, opts) {
    const orders = MockData.tasks.myOrders || [];
    return orders.find(o => o.role === 'creator' && (o.sourceId === taskId || o.id === taskId));
  },

  isPublisherOfTask: function(task) {
    if (!task) return false;
    return task.publisherRole && (task.publisherRole.includes('企业') || task.publisherRole.includes('品牌') || task.publisherRole.includes('发布方'));
  },

  isMyPublishedOrder: function(o) {
    return !!(o && (o.role === 'publisher' || o.role === 'buyer'));
  },

  findPlazaTask: function(taskId) {
    return (MockData.tasks.list || []).find(t => t.id === taskId);
  },
"""

# Fix quota variable in formatTaskParticipants
part1_header = part1_header.replace("${count}/${quota} 人接单", "${count}/${task.quota || 1} 人接单")

part2_plaza = """  renderTasksPlaza: function() {
    const container = document.getElementById('tasks-plaza-list-container');
    if (!container) return;

    (MockData.tasks.list || []).forEach(t => this.syncTaskApplicantMeta(t));
    this.syncExpiredCreatorApplications();

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
      list.sort((a, b) => (parseInt(String(b.rewardMoney || '').replace(/[^\\d]/g, ''), 10) || 0) - (parseInt(String(a.rewardMoney || '').replace(/[^\\d]/g, ''), 10) || 0));
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
        : (parseInt(String(t.participants || '').replace(/[^\\d]/g, ''), 10) || 0);
      list.sort((a, b) => toCount(b) - toCount(a));
    }

    const usersIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
    const clockIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
    const coinIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8"/><path d="M12 8v8M9.5 10.5c.5-.8 1.4-1.3 2.5-1.3 1.7 0 3 1 3 2.3s-1.3 2.3-3 2.3c-1.1 0-2-.5-2.5-1.3"/></svg>`;

    container.innerHTML = list.map(t => {
      const mode = this.getTaskAcceptMode(t);
      const taskLife = life;
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
      const coreDesc = String(t.desc || t.deliverables || '').replace(/\\s+/g, ' ').trim();
      const rewardHint = t.escrow ? '托管赏金' : '赏金面议';
      const timeLabel = taskLife === 'ended'
        ? (t.deadlineDate || t.deadline || '已结束')
        : (taskLife === 'active'
          ? (t.deadlineDate ? ('交付 ' + t.deadlineDate) : (t.deadline || '履约中'))
          : (t.applyDeadline ? ('报名 ' + t.applyDeadline) : (t.deadline || '待定')));
      const acceptedApplicant = t.applicants && t.applicants.find(a => a.status === 'accepted');
      const winnerName = acceptedApplicant ? acceptedApplicant.name : '优质创作者';
      return `
      <div class="task-plaza-card" onclick="App.openTaskDetailPage('${t.id}')">
        <div class="task-card-cover-wrap">
          <img src="${t.cover}" alt="${t.title}" class="task-card-cover-img">
          <span class="task-cover-badge ${statusTone}">${hallBadge}</span>
        </div>
        <div class="task-card-main">
          <div class="task-title-wrap">
            <span class="task-card-title" title="${t.title}">${t.title}</span>
            <span class="task-score-chip" title="商单信誉评分 4.9">
              <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              <span>评分 4.9</span>
            </span>
          </div>
          <div class="task-card-desc" title="${coreDesc}">${coreDesc}</div>
          <div class="task-card-meta">
            <span class="task-meta-item">${t.category || '任务'}</span>
            <span class="task-meta-item">${usersIcon} ${this.formatTaskParticipants(t)}</span>
            <span class="task-meta-item">${clockIcon} ${timeLabel}</span>
          </div>
          <div class="task-card-meta is-sub">
            ${taskLife === 'ended' && t.status === '已完成'
              ? `<span class="task-winner-pill" title="中标合作 · ${winnerName}">
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 6L9 17l-5-5"/></svg>
                  <span>中标 · ${winnerName}</span>
                </span>`
              : ''}
            <span class="task-meta-item" title="${t.publisherRole || '平台任务'}">${t.publisherRole || '平台任务'}</span>
            <span class="task-secure-pill">资金全额托管</span>
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
  },
"""

part3_gallery = """  renderGalleryPlaza: function() {
    const grid = document.getElementById('gallery-works-grid');
    const intro = document.getElementById('gallery-intro-text');
    const gallery = MockData.tasks.gallery;
    if (!grid || !gallery) return;

    if (intro) intro.textContent = gallery.intro || '沉淀高校认证创作者真实商单交付成果与高分样片，支持在线观摩与一键定制。';

    let list = [...(gallery.works || [])];
    const cat = this.activeGalleryCategory;
    if (cat === '可接单') {
      list = list.filter(w => w.available);
    } else if (cat && cat !== '全部') {
      list = list.filter(w => w.category === cat || (w.tags || []).includes(cat));
    }

    const parseViews = (v) => {
      if (!v) return 0;
      if (String(v).includes('万')) return parseFloat(v) * 10000;
      return parseInt(String(v).replace(/[^\\d]/g, ''), 10) || 0;
    };
    const parsePrice = (p) => parseInt(String(p || '').replace(/[^\\d]/g, ''), 10) || 0;

    if (this.activeGallerySort === 'hot') {
      list.sort((a, b) => parseViews(b.views) - parseViews(a.views));
    } else if (this.activeGallerySort === 'price-asc') {
      list.sort((a, b) => parsePrice(a.priceRange) - parsePrice(b.priceRange));
    } else if (this.activeGallerySort === 'latest') {
      list = list.slice().reverse();
    } else {
      const creatorLv = (w) => parseInt(String((w.creator && w.creator.level) || '').replace(/[^\\d]/g, ''), 10) || 0;
      const rank = (w) => {
        if (w.weightBoost || creatorLv(w) >= 4) return -1;
        if (w.badge === '精选' || w.badge === '榜单入选') return 0;
        if (w.badge === '学院认证') return 1;
        if (w.available) return 2;
        return 3;
      };
      list.sort((a, b) => rank(a) - rank(b) || parseViews(b.views) - parseViews(a.views));
    }

    if (list.length === 0) {
      grid.innerHTML = '<div class="gallery-empty">暂无该分类的精选作品</div>';
      return;
    }

    const playIcon = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
    const heartIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;

    grid.innerHTML = list.map(w => {
      const c = w.creator || {
        name: w.author || '创作者',
        school: '高校认证',
        level: 'Lv.4 商业创作者',
        avatar: 'assets/avatars/user_header.png'
      };
      const priceText = w.priceRange || '¥1,500-3,000';
      const categoryTag = w.category || 'AI短视频';
      const sceneTag = w.scene || '商业样片';
      return `
        <article class="gallery-work-card" onclick="App.openWorkDetailModal('${w.id}')">
          <div class="gallery-work-cover-wrap">
            <img src="${w.cover}" alt="${w.title}" class="gallery-work-cover" loading="lazy">
            <span class="gallery-source-pill-top">精选作品</span>
            ${w.sourceTask ? `
              <span class="gallery-source-award" onclick="event.stopPropagation(); App.openTaskDetailPage('${w.sourceTask.id}')">
                <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                <span>${w.sourceTask.award || '精选任务成果'} · ${w.sourceTask.title}</span>
              </span>
            ` : (w.badge ? `<span class="gallery-work-badge">${w.badge}</span>` : '')}
            <button type="button" class="gallery-play-btn" aria-label="播放作品">${playIcon}</button>
            <div class="gallery-work-stats">
              <span>${w.views || '5.8万'} 播放</span>
              <span class="gallery-like-btn ${w.isLiked ? 'liked' : ''}" onclick="event.stopPropagation(); App.toggleGalleryWorkLike('${w.id}')">
                ${heartIcon} ${w.likes || 480}
              </span>
            </div>
          </div>
          <div class="gallery-work-body">
            <div class="gallery-title-row">
              <h3 class="gallery-work-title" title="${w.title}">${w.title}</h3>
              <div class="gallery-work-tags">
                <span class="gallery-tag">${categoryTag}</span>
                <span class="gallery-tag is-muted">${sceneTag}</span>
              </div>
            </div>
            <div class="gallery-work-footer">
              <div class="gallery-footer-top">
                <div class="gallery-creator-row">
                  <img src="${c.avatar || 'assets/avatars/user_header.png'}" alt="${c.name}" class="gallery-creator-avatar">
                  <div class="gallery-creator-meta">
                    <div class="gallery-creator-name">
                      <span class="gallery-creator-name-text">${c.name}</span>
                      <span class="gallery-creator-lv">${c.level || ''}</span>
                    </div>
                    <div class="gallery-creator-chips">
                      ${c.school ? `<span>${c.school}</span>` : ''}
                      <span>交付 ${w.delivered || w.ordersCount || 10} 单</span>
                      <div class="gallery-schedule-badge-wrap">
                        ${w.scheduleStatus === 'busy'
                          ? '<span class="gallery-schedule-tag is-busy"><span class="status-dot dot-busy"></span>档期紧张</span>'
                          : (w.scheduleStatus === 'closed' || !w.available
                            ? '<span class="gallery-schedule-tag is-closed"><span class="status-dot dot-closed"></span>暂停接单</span>'
                            : '<span class="gallery-schedule-tag is-available"><span class="status-dot dot-available"></span>可接单</span>')}
                      </div>
                    </div>
                  </div>
                </div>
                <div class="gallery-price">
                  <span class="gallery-price-label">参考报价</span>
                  <strong>${priceText}</strong>
                </div>
              </div>
              <div class="gallery-work-actions">
                <button type="button" class="gallery-btn-secondary" onclick="event.stopPropagation(); App.openCreatorProfile('${c.name}')">看创作者</button>
                <button type="button" class="gallery-btn-primary ${w.available && w.scheduleStatus !== 'closed' ? '' : 'is-disabled'}"
                  onclick="event.stopPropagation(); ${w.available && w.scheduleStatus !== 'closed'
                    ? (w.scheduleStatus === 'busy' ? `App.showToast('提示：该创作者当前档期紧张，制作周期可能需顺延'); App.openGalleryCustomModal('${w.id}');` : `App.openGalleryCustomModal('${w.id}')`)
                    : `App.showToast('该同学当前暂停接单，可关注主页等待档期开放')`}">
                  ${w.available && w.scheduleStatus !== 'closed' ? '找 TA 定制' : '暂不可约'}
                </button>
              </div>
            </div>
          </div>
        </article>
      `;
    }).join('');
  },

  toggleGalleryWorkLike: function(workId) {
    const works = (MockData.tasks.gallery && MockData.tasks.gallery.works) || [];
    const work = works.find(w => w.id === workId);
    if (!work) return;
    work.isLiked = !work.isLiked;
    const cur = parseInt(String(work.likes || '0').replace(/,/g, ''), 10) || 0;
    work.likes = work.isLiked ? cur + 1 : Math.max(0, cur - 1);
    this.renderGalleryPlaza();
    this.showToast(work.isLiked ? '已点赞该展厅精选作品' : '已取消点赞');
  },

  renderTasksRight: function() {
    const todayRec = document.getElementById('tasks-today-rec-container');
    const recTitle = document.getElementById('tasks-side-rec-title');
    const recMore = document.getElementById('tasks-side-rec-more');
    const isGallery = this.activeTasksMode === 'gallery';

    if (recTitle) recTitle.textContent = isGallery ? '展厅热门' : '今日推荐任务';
    if (recMore) {
      recMore.onclick = () => {
        if (isGallery) {
          this.setTasksMode('gallery');
          this.showToast('已定位至作品展厅精选列表');
        } else {
          this.showToast('已刷新今日算法推荐任务');
        }
      };
    }

    if (todayRec) {
      if (isGallery) {
        const works = (MockData.tasks.gallery && MockData.tasks.gallery.works || []).slice(0, 3);
        todayRec.innerHTML = works.map(w => {
          const price = w.priceRange || w.basePrice || '¥ 2,800 起';
          const authorName = (w.creator && w.creator.name) || w.author || '创作者';
          const isAvail = w.scheduleStatus === 'available' || w.available === true;
          return `
            <div class="task-side-rec-card" onclick="App.openWorkDetailModal('${w.id}')">
              <img src="${w.cover}" alt="" class="task-side-rec-cover">
              <div class="task-side-rec-body">
                <div class="task-side-rec-title" title="${w.title}">${w.title}</div>
                <div class="task-side-rec-meta">
                  <span>${authorName}</span>
                  <span class="task-side-rec-reward">${price}</span>
                </div>
              </div>
              <button type="button" class="task-side-rec-btn" onclick="event.stopPropagation(); App.openGalleryCustomModal('${w.id}')">定制</button>
            </div>`;
        }).join('');
      } else {
        const list = (MockData.tasks.list || []).filter(t => this.getTaskHallLifecycle(t) === 'open').slice(0, 3);
        todayRec.innerHTML = list.map(t => `
          <div class="task-side-rec-card" onclick="App.openTaskDetailPage('${t.id}')">
            <img src="${t.cover}" alt="" class="task-side-rec-cover">
            <div class="task-side-rec-body">
              <div class="task-side-rec-title" title="${t.title}">${t.title}</div>
              <div class="task-side-rec-meta">
                <span>${t.category}</span>
                <span class="task-side-rec-reward">${t.rewardMoney || '¥ 5,000'}</span>
              </div>
            </div>
            <button type="button" class="task-side-rec-btn" onclick="event.stopPropagation(); App.openTaskApplyModal('${t.id}')">报名</button>
          </div>
        `).join('');
      }
    }
  },

  // 任务全页二级详情页
  openTaskDetailPage: function(taskId, focus) {
    const task = (MockData.tasks.list || []).find(t => t.id === taskId);
    if (!task) {
      this.showToast('未找到该任务');
      return;
    }
    if (this.currentView !== 'tasks') this.navigateTo('tasks');
    this.closePublishTaskPage(true);
    this.syncTaskApplicantMeta(task);
    this._taskDetailManageMode = this.activeTasksMode === 'mine';
    if (this.activeTasksMode === 'hall') {
      this.setHallLifecycleTab(this.getTaskHallLifecycle(task));
    }
    this.currentDetailTaskId = taskId;
    this._detailFocusApplicants = this._taskDetailManageMode && focus === 'applicants';
    this._detailFocusFulfillment = this._taskDetailManageMode && focus === 'fulfillment';
    this.renderTaskDetailPage();
    this.showTasksSubPage('detail');
  },

  closeTaskDetailPage: function() {
    this.showTasksSubPage('main');
    this.currentDetailTaskId = null;
    this._detailFocusApplicants = false;
    this._detailFocusFulfillment = false;
  },

  showTasksSubPage: function(which) {
    const shell = document.getElementById('tasks-main-shell');
    const pub = document.getElementById('tasks-publish-page');
    const detail = document.getElementById('tasks-detail-page');
    if (shell) shell.hidden = which !== 'main';
    if (pub) pub.hidden = which !== 'publish';
    if (detail) detail.hidden = which !== 'detail';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },
"""

part4_modals = """  // 资金托管与创作者结算
  freezeEscrow: function(amount, label) {
    amount = Number(amount) || 0;
    if (amount <= 0) return true;
    let bal = parseFloat(String(MockData.assets.cards.balance).replace(/,/g, '')) || 0;
    if (amount > bal) {
      this.showToast('账户余额不足，无法完成平台托管冻结');
      return false;
    }
    bal -= amount;
    MockData.assets.cards.balance = bal.toLocaleString('zh-CN', { minimumFractionDigits: 2 });
    const wd = Math.max(0, (parseFloat(String(MockData.assets.cards.withdrawable).replace(/,/g, '')) || 0) - amount);
    MockData.assets.cards.withdrawable = wd.toLocaleString('zh-CN', { minimumFractionDigits: 2 });

    const freezeItem = (MockData.assets.breakdown.items || []).find(it => it.label === '冻结金额');
    if (freezeItem) {
      freezeItem.value = (freezeItem.value || 0) + amount;
      freezeItem.amount = '¥ ' + freezeItem.value.toLocaleString('zh-CN', { minimumFractionDigits: 2 });
    }
    const availItem = (MockData.assets.breakdown.items || []).find(it => it.label === '可提现余额');
    if (availItem) {
      availItem.value = Math.max(0, (availItem.value || 0) - amount);
      availItem.amount = '¥ ' + availItem.value.toLocaleString('zh-CN', { minimumFractionDigits: 2 });
    }

    MockData.assets.transactions.unshift({
      id: 'TX' + Date.now(),
      type: '支出',
      name: label || '定制商单资金托管冻结',
      amount: `- ¥ ${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`,
      rawAmount: -amount,
      status: '托管中',
      statusType: 'done',
      time: '刚刚',
      category: '支出'
    });

    this.refreshAssetDisplays();
    return true;
  },

  releaseEscrow: function(amount, label) {
    amount = Number(amount) || 0;
    if (amount <= 0) return;
    const freezeItem = (MockData.assets.breakdown.items || []).find(it => it.label === '冻结金额');
    if (freezeItem) {
      freezeItem.value = Math.max(0, (freezeItem.value || 0) - amount);
      freezeItem.amount = '¥ ' + freezeItem.value.toLocaleString('zh-CN', { minimumFractionDigits: 2 });
    }
    MockData.assets.transactions.unshift({
      id: 'TX' + Date.now(),
      type: '支出',
      name: label || '定制托管解冻并结算给创作者',
      amount: `托管划转 ¥ ${amount.toLocaleString('zh-CN')}`,
      rawAmount: 0,
      status: '已结算',
      statusType: 'done',
      time: '刚刚',
      category: '支出'
    });
    this.refreshAssetDisplays();
  },

  creditCreatorIncome: function(amount, label) {
    amount = Number(amount) || 0;
    if (amount <= 0) return;
    let bal = parseFloat(String(MockData.assets.cards.balance).replace(/,/g, '')) || 0;
    bal += amount;
    MockData.assets.cards.balance = bal.toLocaleString('zh-CN', { minimumFractionDigits: 2 });
    const wd = (parseFloat(String(MockData.assets.cards.withdrawable).replace(/,/g, '')) || 0) + amount;
    MockData.assets.cards.withdrawable = wd.toLocaleString('zh-CN', { minimumFractionDigits: 2 });

    const incomeItem = (MockData.assets.breakdown.items || []).find(it => it.label === '创作收益');
    if (incomeItem) {
      incomeItem.value = (incomeItem.value || 0) + amount;
      incomeItem.amount = '¥ ' + incomeItem.value.toLocaleString('zh-CN', { minimumFractionDigits: 2 });
    }
    const availItem = (MockData.assets.breakdown.items || []).find(it => it.label === '可提现余额');
    if (availItem) {
      availItem.value = (availItem.value || 0) + amount;
      availItem.amount = '¥ ' + availItem.value.toLocaleString('zh-CN', { minimumFractionDigits: 2 });
    }

    MockData.assets.transactions.unshift({
      id: 'TX' + Date.now(),
      type: '收入',
      name: label || '任务验收入账',
      amount: `+ ¥ ${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`,
      rawAmount: amount,
      status: '已到账',
      statusType: 'success',
      time: '刚刚',
      category: '收入'
    });

    this.bumpOverviewStats({ income: amount, fans: 30 });
    this.refreshAssetDisplays();
  },

  refreshAssetDisplays: function() {
    const balEl = document.getElementById('asset-display-balance');
    if (balEl) balEl.innerText = '¥ ' + MockData.assets.cards.balance;
    const wdEl = document.getElementById('asset-display-withdrawable');
    if (wdEl) wdEl.innerText = '¥ ' + MockData.assets.cards.withdrawable;
    if (typeof this.renderTransactionsTable === 'function') this.renderTransactionsTable();
    if (typeof this.renderAssetsCharts === 'function') this.renderAssetsCharts();
  },

  openTaskApplyModal: function(taskId) {
    this.currentApplyingTaskId = taskId;
    const task = (MockData.tasks.list || []).find(t => t.id === taskId);
    if (!task) return;
    this.syncTaskApplicantMeta(task);
    if (this.getTaskHallLifecycle(task) !== 'open') {
      this.showToast(this.getTaskHallLifecycle(task) === 'active'
        ? '该任务已在履约中，无法报名'
        : '该任务已结束，无法报名');
      this.openTaskDetailPage(taskId);
      return;
    }

    const titleEl = document.getElementById('modal-task-title');
    const subEl = document.getElementById('modal-task-sub');
    const rewEl = document.getElementById('modal-task-reward');
    const modeEl = document.getElementById('modal-task-accept-mode');
    const dlEl = document.getElementById('modal-task-deadline');
    const pledgeEl = document.getElementById('modal-task-pledge');

    if (titleEl) titleEl.innerText = task.title || '任务详情与报名';
    if (subEl) subEl.innerText = `${task.category || '商业创作'} · ${task.publisherRole || '官方品牌方'} · 平台资金全额托管`;
    if (rewEl) rewEl.innerText = task.rewardMoney || '¥ 5,000';
    if (modeEl) modeEl.innerText = this.getAcceptModeLabel(this.getTaskAcceptMode(task));
    if (dlEl) dlEl.innerText = task.applyDeadline ? `报名截止：${task.applyDeadline}` : (task.deadline || '待定');
    if (pledgeEl) {
      pledgeEl.innerHTML = `<strong>履约保障：</strong>本人承诺按时保质交付，严格遵守商用版权移交规范，同意若违约或超时漏报将扣减相应托管赏金与信用分。`;
    }

    this.openModal('modal-task-apply');
  },

  confirmTaskApply: function() {
    const taskId = this.currentApplyingTaskId;
    const task = (MockData.tasks.list || []).find(t => t.id === taskId);
    if (!task) {
      this.closeModal('modal-task-apply');
      return;
    }
    const propInput = document.getElementById('task-apply-proposal');
    const proposal = (propInput && propInput.value.trim()) || '具备完整交付经验，已搭建成熟AI工作流，严格按时保质交付。';

    if (!Array.isArray(task.applicants)) task.applicants = [];
    const myExisting = task.applicants.find(a => a.name === MockData.currentUser.name || a.id === 'AP_CURRENT');
    if (!myExisting) {
      task.applicants.unshift({
        id: 'AP_' + Date.now(),
        name: MockData.currentUser.name,
        level: 'Lv.' + this.getUserLevel(),
        school: MockData.currentUser.school,
        avatar: MockData.currentUser.avatarLarge || MockData.currentUser.avatar,
        credit: MockData.currentUser.creditScore || 98,
        proposal: proposal,
        portfolio: '个人展厅精选',
        appliedAt: '刚刚',
        status: 'pending'
      });
      task.applicantCount = task.applicants.length;
    }

    if (!MockData.tasks.myOrders) MockData.tasks.myOrders = [];
    let myOrd = MockData.tasks.myOrders.find(o => o.sourceId === taskId && o.role === 'creator');
    if (!myOrd) {
      myOrd = {
        id: 'MO_' + Date.now(),
        sourceId: taskId,
        role: 'creator',
        title: task.title,
        cover: task.cover,
        rewardMoney: task.rewardMoney,
        rewardAmount: task.rewardAmount || 5000,
        rewardPoints: task.rewardPoints,
        status: '待选定',
        acceptMode: this.getTaskAcceptMode(task),
        applicationStatus: 'pending',
        tags: task.tags || [],
        deadline: task.deadline || '',
        counterpart: task.publisherRole || '发布方',
        createdAt: '刚刚',
        coreInfo: proposal
      };
      MockData.tasks.myOrders.unshift(myOrd);
    }

    this.syncTaskStats();
    this.closeModal('modal-task-apply');
    this.renderTasksPlaza();
    this.renderMyTasks();
    if (this.currentDetailTaskId === taskId) {
      this.renderTaskDetailPage();
    }
    this.showToast('报名方案提交成功，等待发布方选定！');
  },

  openGalleryCustomModal: function(workId) {
    const works = (MockData.tasks.gallery && MockData.tasks.gallery.works) || [];
    const work = works.find(w => w.id === workId);
    if (!work) return;

    this.currentCustomWorkId = workId;
    const titleEl = document.getElementById('modal-gallery-title');
    const subEl = document.getElementById('modal-gallery-sub');
    const creatorBox = document.getElementById('modal-gallery-creator');
    const budgetInput = document.getElementById('custom-budget-input');

    if (titleEl) titleEl.innerText = `找 TA 定制 · ${work.title}`;
    if (subEl) subEl.innerText = `参考精选作品发起定向商单邀请 · 平台资金全额托管`;
    if (creatorBox) {
      const c = work.creator || { name: work.author || '创作者', level: 'Lv.4', school: '高校认证' };
      creatorBox.innerHTML = `
        <img src="${c.avatar || 'assets/avatars/user_header.png'}" alt="${c.name}" class="gallery-creator-avatar" style="width:42px;height:42px;border-radius:50%;">
        <div>
          <div style="font-weight:700; font-size:13.5px; color:var(--text-primary);">${c.name} <span class="gallery-creator-lv">${c.level || ''}</span></div>
          <div style="font-size:11.5px; color:var(--text-secondary);">${c.school || '高校认证'} · 历史交付 ${work.delivered || 10} 单</div>
        </div>
      `;
    }
    if (budgetInput && work.priceRange) {
      const m = work.priceRange.match(/\\d+/);
      if (m) budgetInput.value = m[0];
    }
    this.openModal('modal-gallery-custom');
  },

  confirmGalleryCustom: function() {
    const workId = this.currentCustomWorkId;
    const works = (MockData.tasks.gallery && MockData.tasks.gallery.works) || [];
    const work = works.find(w => w.id === workId) || { title: '定制商单', creator: { name: '创作者' } };

    const titleInput = document.getElementById('custom-title-input');
    const budgetInput = document.getElementById('custom-budget-input');
    const daysInput = document.getElementById('custom-days-input');
    const reqInput = document.getElementById('custom-requirement-input');

    const title = (titleInput && titleInput.value.trim()) || `定制：${work.title}`;
    const budget = (budgetInput && parseFloat(budgetInput.value)) || 2000;
    const days = (daysInput && daysInput.value) || '5';
    const req = (reqInput && reqInput.value.trim()) || '参考该展厅样片质感与运镜，制作同款商业视频。';

    const frozen = this.freezeEscrow(budget, `发起定制托管 · ${title}`);
    if (!frozen) return;

    if (!MockData.tasks.myOrders) MockData.tasks.myOrders = [];
    MockData.tasks.myOrders.unshift({
      id: 'CUST_' + Date.now(),
      role: 'buyer',
      type: 'custom',
      title: `定向定制 · ${title}`,
      cover: work.cover || 'assets/covers/work_1.png',
      rewardMoney: `¥ ${budget.toLocaleString('zh-CN')}`,
      rewardAmount: budget,
      escrowFrozen: true,
      status: '待接单',
      counterpart: (work.creator && work.creator.name) || work.author || '创作者',
      deadline: `${days}天内交付`,
      createdAt: '刚刚',
      coreInfo: req
    });

    this.closeModal('modal-gallery-custom');
    this.syncTaskStats();
    this.renderMyTasks();
    this.showToast(`定制邀请已成功发送并托管资金 ¥ ${budget.toLocaleString('zh-CN')}！`);
  },

  openPublishTaskModal: function() {
    this.openPublishTaskPage();
  },

  closePublishTaskModal: function() {
    this.closePublishTaskPage();
  },

  openPublishTaskPage: function() {
    this.showTasksSubPage('publish');
  },

  closePublishTaskPage: function(silent) {
    this.showTasksSubPage('main');
    if (!silent) this.showToast('已返回任务大厅');
  },

  submitPublishTask: function() {
    const title = (document.getElementById('task-pub-title') || {}).value || '新发布的创意商单';
    const budget = parseFloat((document.getElementById('task-pub-budget') || {}).value) || 3000;
    const desc = (document.getElementById('task-pub-desc') || {}).value || '需求描述';

    const frozen = this.freezeEscrow(budget, `发布商单全额托管 · ${title}`);
    if (!frozen) return;

    const newTask = {
      id: 'TK_' + Date.now(),
      title: title,
      desc: desc,
      rewardMoney: `¥ ${budget.toLocaleString('zh-CN')}`,
      rewardAmount: budget,
      rewardPoints: '500',
      category: 'AI短视频',
      tags: ['新发布', '商业定制'],
      status: '招募中',
      acceptMode: 'manual',
      publisherRole: '企业雇主 / ' + MockData.currentUser.name,
      escrow: true,
      deadlineDate: '2026-10-01',
      cover: 'assets/covers/task_main_1.png',
      applicants: []
    };
    MockData.tasks.list.unshift(newTask);

    if (!MockData.tasks.myOrders) MockData.tasks.myOrders = [];
    MockData.tasks.myOrders.unshift({
      id: 'MO_' + Date.now(),
      sourceId: newTask.id,
      role: 'publisher',
      title: newTask.title,
      cover: newTask.cover,
      rewardMoney: newTask.rewardMoney,
      rewardAmount: budget,
      status: '招募中',
      counterpart: '平台待选定',
      deadline: '2026-10-01',
      createdAt: '刚刚',
      coreInfo: desc
    });

    this.closePublishTaskPage(true);
    this.syncTaskStats();
    this.renderTasksPlaza();
    this.renderMyTasks();
    this.showToast('商单已成功发布并托管资金至监管账户！');
  },

  clearPublishTaskCover: function() {
    const preview = document.getElementById('task-pub-cover-preview');
    if (preview) preview.innerHTML = '';
  },

  openTasksLeaderboardModal: function() {
    this.showToast('已打开商单创作者龙虎榜');
  },

  filterTasks: function(status) {
    this.setTasksMode('mine', true);
    this.activeMyTasksStatus = status === '进行中' || status === '待验收' || status === '已完成' ? status : '全部';
    this.renderMyTasksStatusTabs();
    this.renderMyTasks();
    this.showToast(`已打开「我的任务」· ${this.activeMyTasksStatus}`);
  },

  openTaskModal: function(taskId) {
    this.navigateTo('tasks');
    setTimeout(() => this.openTaskDetailPage(taskId), 50);
  },
"""

# Combine all components into full Section 5
full_section5 = '\n\n'.join([
    part1_header.strip(),
    part2_plaza.strip(),
    s114.strip(),
    part3_gallery.strip(),
    s811_clean.strip(),
    s842.strip(),
    s130.strip(),
    part4_modals.strip()
])

s_start = '// 5. 任务广场 (Tasks) 渲染与交互'
s_end = '// 6. 数据中心 (Analytics) 渲染与图表交互'

idx1 = app_js.find(s_start)
idx2 = app_js.find(s_end)

if idx1 == -1 or idx2 == -1:
    print("Could not locate Section 5 bounds!")
    sys.exit(1)

new_app_js = app_js[:idx1] + full_section5 + '\n\n  ' + app_js[idx2:]

with open('ai-creator-community/js/app.js', 'w', encoding='utf-8') as f:
    f.write(new_app_js)

print("Successfully replaced Section 5 in js/app.js!")
print("New app.js length:", len(new_app_js))
