    // 4. 已完成：双方双向真实互评卡片 + 成果归档与展厅收录态
    if (status === '已完成') {
      const acceptedCreator = (task.applicants || []).find(a => a.status === 'accepted') || {
        name: '小宇同学',
        avatar: 'assets/avatars/user_profile_large.png'
      };

      return `
        <!-- 合作双方双向真实互评与版权归档卡片 -->
        <div class="detail-state-card">
          <div class="detail-state-card-head">
            <h3 class="detail-state-card-title">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              合作双方真实履约评价 (5.0 满分沉淀)
            </h3>
            <span class="detail-state-card-badge" style="background:#DCFCE7; color:#15803D;">双方互评已归档入个人信誉链</span>
          </div>

          <div class="detail-reviews-grid" style="margin-bottom:14px;">
            <!-- 雇主评价 -->
            <div class="detail-review-item">
              <div class="detail-review-user-row">
                <div class="detail-review-user-info">
                  <img src="${task.publisher && task.publisher.avatar ? task.publisher.avatar : 'assets/avatars/avatar_business.png'}" alt="" class="detail-review-avatar">
                  <div>
                    <strong style="font-size:13px; color:var(--text-primary);">${task.publisherRole || '企业雇主 / 蔚来科技'}</strong>
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
                  <img src="${acceptedCreator.avatar || 'assets/avatars/user_profile_large.png'}" alt="" class="detail-review-avatar">
                  <div>
                    <strong style="font-size:13px; color:var(--text-primary);">${acceptedCreator.name}</strong>
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

          <!-- 商业成果归档与展厅收录情况 -->
          <div style="display:flex; align-items:center; justify-content:space-between; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:10px; padding:12px 16px;">
            <div>
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                <strong style="font-size:13.5px; color:var(--text-primary);">商业版权归档与展厅精选收录</strong>
                <span class="detail-state-card-badge" style="background:#EEF2FF; color:var(--primary);">存证号：OPC-CERT-202609-088</span>
              </div>
              <div style="font-size:12.5px; color:var(--text-secondary);">该任务优秀成果已正式入选【作品展厅 · 精选馆】，全平台创作者可前往观摩学习。</div>
            </div>
            <button type="button" class="hero-btn-primary" style="white-space:nowrap; padding:6px 14px; font-size:12px;" onclick="App.setTasksMode('gallery'); App.closeTaskDetailPage();">逛展厅查看</button>
          </div>
        </div>`;
    }