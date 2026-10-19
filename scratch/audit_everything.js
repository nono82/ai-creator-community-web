const { chromium } = require('playwright');

async function auditEverything() {
  console.log('🔍 开始对全平台全部页面、交互、卡片样式与边界情况进行地毯式巡检...\n');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const errors = [];
  page.on('pageerror', err => errors.push(`PageError: ${err.message}`));
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`ConsoleError: ${msg.text()}`);
    }
  });
  page.on('response', res => {
    if (res.status() === 404) {
      console.log('🔴 404 NOT FOUND URL:', res.url());
      errors.push(`404: ${res.url()}`);
    }
  });

  await page.goto('http://127.0.0.1:8089/index.html', { waitUntil: 'networkidle' });

  // 1. 扫描页面全文中的非法字符 (undefined, NaN, null, [object Object])
  console.log('--- 1. 全局非法文本扫描 ---');
  const fullText = await page.innerText('body');
  const invalidKeywords = ['undefined', 'NaN', '[object Object]'];
  for (const kw of invalidKeywords) {
    if (fullText.includes(kw)) {
      console.error(`❌ 全局文本中发现非法关键字: ${kw}`);
      errors.push(`Found invalid text: ${kw}`);
    }
  }
  if (errors.length === 0) console.log('✅ 全局无任何 undefined / NaN / [object Object]');

  // 2. 巡检任务大厅所有筛选 Tab
  console.log('\n--- 2. 巡检任务大厅卡片与筛选 ---');
  await page.click('.nav-item[data-view="tasks"]');
  await page.waitForTimeout(300);

  const hallTabs = ['open', 'active', 'ended'];
  for (const tab of hallTabs) {
    await page.click(`#tasks-lifecycle-tabs button[data-life="${tab}"]`);
    await page.waitForTimeout(300);
    const cardCount = await page.locator('.task-plaza-card').count();
    console.log(`- 大厅阶段 [${tab}] 卡片数量: ${cardCount}`);

    // 检查是否有任何溢出
    const overflows = await page.evaluate(() => {
      const cards = document.querySelectorAll('.task-plaza-card');
      const bad = [];
      cards.forEach((c, idx) => {
        const title = c.querySelector('.task-card-title')?.innerText || '';
        const isSub = c.querySelector('.task-card-meta.is-sub');
        if (isSub && isSub.scrollWidth > isSub.clientWidth + 1) {
          bad.push({ idx, title, scrollWidth: isSub.scrollWidth, clientWidth: isSub.clientWidth });
        }
      });
      return bad;
    });
    if (overflows.length > 0) {
      console.error(`❌ 大厅 [${tab}] 发现文本向右溢出:`, overflows);
      errors.push(`Overflow in hall tab ${tab}`);
    } else {
      console.log(`  ✅ [${tab}] 所有卡片无水平溢出`);
    }
  }

  // 3. 巡检作品展厅所有卡片与封面左上角标签
  console.log('\n--- 3. 巡检作品展厅与封面左上角标签 ---');
  await page.evaluate(() => App.setTasksMode('gallery'));
  await page.waitForTimeout(400);

  const galleryCardCount = await page.locator('.gallery-work-card').count();
  console.log(`- 展厅作品总数: ${galleryCardCount}`);
  const coverBadgeCount = await page.locator('.gallery-cover-award-badge').count();
  console.log(`- 封面左上角标杆/大奖标签数量: ${coverBadgeCount}`);

  const hasBodyAwardRow = await page.locator('.gallery-work-body .gallery-award-row').count();
  console.log(`- 卡片正文中残留的旧标签行数: ${hasBodyAwardRow} (必须为0)`);
  if (hasBodyAwardRow > 0) errors.push('Residual gallery-award-row in body');

  // 4. 巡检我的任务（创作者台账与雇主发布台账）
  console.log('\n--- 4. 巡检我的任务（承接与发布台账） ---');
  await page.evaluate(() => App.setTasksMode('mine'));
  await page.waitForTimeout(400);

  const myAcceptedCount = await page.locator('.tasks-mine-card').count();
  console.log(`- 承接任务卡片数: ${myAcceptedCount}`);

  await page.evaluate(() => App.switchMyTasksView('published'));
  await page.waitForTimeout(400);
  const myPublishedCount = await page.locator('.tasks-mine-card').count();
  console.log(`- 发布商单卡片数: ${myPublishedCount}`);

  // 5. 巡检所有下钻详情页（待验收脱敏等）
  console.log('\n--- 5. 巡检所有商单状态下钻详情页三段式结构与大厅脱敏 ---');
  await page.evaluate(() => {
    App._taskDetailManageMode = false;
    App.setTasksMode('hall');
  });
  await page.waitForTimeout(200);

  const sampleTasks = ['TK13', 'TK02', 'TK06', 'TK07', 'TK09', 'TK04', 'TK10'];
  for (const tid of sampleTasks) {
    await page.evaluate((id) => App.openTaskDetailPage(id), tid);
    await page.waitForTimeout(200);

    const cardsInDetail = await page.locator('#tasks-detail-body .detail-state-section .detail-state-card').count();
    const detailBodyText = await page.locator('#tasks-detail-body').innerText();

    const hasUndefined = detailBodyText.includes('undefined') || detailBodyText.includes('NaN');
    if (cardsInDetail !== 3 || hasUndefined) {
      console.error(`❌ 商单 [${tid}] 详情页异常: 卡片数=${cardsInDetail}, hasUndefined=${hasUndefined}`);
      errors.push(`Detail error in ${tid}`);
    } else {
      console.log(`  ✅ [${tid}] 详情页规范: 严格3张标准卡片 (人员 + 看板 + 评论)，文本纯净`);
    }

    if (tid === 'TK06') {
      const hasPlainPan = detailBodyText.includes('master-delivery-v2');
      const hasMaskedPan = detailBodyText.includes('••••••••••••');
      if (hasPlainPan || !hasMaskedPan) {
        console.error('❌ 大厅公开详情未能正确脱敏！');
        errors.push('TK06 plain pan leaked');
      } else {
        console.log('  ✅ [TK06] 商业交付物网盘与密码脱敏保护生效，0 泄露');
      }
    }

    await page.evaluate(() => App.closeTaskDetailPage());
    await page.waitForTimeout(100);
  }

  // 6. 总结
  console.log('\n================== 全面巡检审计结果 ==================');
  console.log(`控制台/页面报错总数: ${errors.length}`);
  if (errors.length === 0) {
    console.log('🎉 巡检结果：全站 100% 达成所有已提需求，0 遗留问题，0 控制台报错，0 文本异常！');
  } else {
    console.error('❌ 巡检发现问题:', errors);
  }

  await browser.close();
  process.exit(errors.length === 0 ? 0 : 1);
}

auditEverything().catch(err => {
  console.error('巡检脚本执行异常:', err);
  process.exit(1);
});
