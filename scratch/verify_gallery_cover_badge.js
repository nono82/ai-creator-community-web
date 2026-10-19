const { chromium } = require('playwright');

async function testGalleryCoverBadge() {
  console.log('🚀 开始验证：展厅标杆/溯源大奖标签统一放置于封面顶部左上角...\n');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://127.0.0.1:8089/index.html', { waitUntil: 'networkidle' });
  await page.click('.nav-item[data-view="tasks"]');
  await page.waitForTimeout(400);

  // 切换到作品展厅
  await page.evaluate(() => App.setTasksMode('gallery'));
  await page.waitForTimeout(500);

  // 检查 GW01 作品（数字生命：意识上传纪元）
  const cardSelector = '.gallery-work-card:has-text("数字生命：意识上传纪元")';
  const hasCard = await page.locator(cardSelector).isVisible();
  console.log(`- 找到作品卡片 [数字生命：意识上传纪元]: ${hasCard ? '✅ 是' : '❌ 否'}`);

  if (!hasCard) {
    console.error('❌ 未找到目标卡片！');
    process.exit(1);
  }

  // 验证标签是否位于封面顶部左上角
  const coverBadgeSelector = `${cardSelector} .gallery-work-cover-wrap .gallery-cover-award-badge`;
  const hasCoverBadge = await page.locator(coverBadgeSelector).isVisible();
  const coverBadgeText = hasCoverBadge ? await page.locator(coverBadgeSelector).innerText() : '';
  console.log(`- 封面内左上角标签存在: ${hasCoverBadge ? '✅ 是' : '❌ 否'}`);
  console.log(`- 封面左上角标签文本: "${coverBadgeText}"`);

  // 验证几何位置（top: 10px, left: 10px）
  const badgeBounds = await page.locator(coverBadgeSelector).evaluate((el) => {
    const style = window.getComputedStyle(el);
    return {
      position: style.position,
      top: style.top,
      left: style.left,
      zIndex: style.zIndex,
      color: style.color
    };
  });
  console.log('- 标签样式与定位:', badgeBounds);

  // 验证卡片正文内部是否已彻底移除旧的独立行
  const hasOldBodyAward = await page.locator('.gallery-work-body .gallery-award-row').count();
  console.log(`- 卡片正文内部是否已移除旧标签行: ${hasOldBodyAward === 0 ? '✅ 已彻底移除 (0个旧标签)' : '❌ 仍残留'}`);

  // 验证点击标签是否能正常联动下钻对应原任务
  console.log('- 测试点击封面左上角标签下钻原商单...');
  await page.locator(coverBadgeSelector).click();
  await page.waitForTimeout(500);

  const isDetailOpen = await page.locator('#tasks-detail-page').isVisible();
  const detailTitle = await page.locator('.tasks-detail-title').innerText();
  console.log(`- 下钻商单二级详情页是否打开: ${isDetailOpen ? '✅ 打开成功' : '❌ 失败'}`);
  console.log(`- 下钻详情商单标题: "${detailTitle}"`);

  const pass = hasCoverBadge && hasOldBodyAward === 0 && isDetailOpen && badgeBounds.top === '10px' && badgeBounds.left === '10px';
  console.log('\n======================================================');
  if (pass) {
    console.log('🎉 展厅封面左上角标杆标签位置与交互 100% 验收通过！');
    await browser.close();
    process.exit(0);
  } else {
    console.error('❌ 验收不合格！');
    await browser.close();
    process.exit(1);
  }
}

testGalleryCoverBadge().catch(err => {
  console.error('测试异常:', err);
  process.exit(1);
});
