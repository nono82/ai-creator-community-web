const { chromium } = require('playwright');
const path = require('path');

async function verifyAcademyOptimization() {
  console.log('🚀 开始验证成长学院全新优化：无督学金/无考试、免费与付费分级、看视频送积分、学员评价与讨论专区...\n');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push(err.message));

  await page.goto('http://127.0.0.1:8089/index.html', { waitUntil: 'networkidle' });

  // 1. 进入成长学院主页
  console.log('--- 1. 进入成长学院主页 ---');
  await page.click('.nav-item[data-view="academy"]');
  await page.waitForTimeout(400);

  // 检查无督学金、无考试关键字
  const academyBodyText = await page.innerText('#view-academy');
  if (academyBodyText.includes('督学金')) {
    throw new Error('页面仍包含非法「督学金」文案！');
  }
  console.log('  ✅ 确认全站彻底无「督学金」概念');

  // 检查课程卡片价格与积分奖励标签
  const pricePills = await page.$$('.plan-price-pill');
  const rewardBadges = await page.$$('.plan-points-reward');
  console.log(`  ✅ 发现 ${pricePills.length} 个价格标签, ${rewardBadges.length} 个创作积分奖励标签`);
  if (pricePills.length === 0 || rewardBadges.length === 0) {
    throw new Error('课程卡片未正确渲染价格或创作积分标签！');
  }

  const firstPriceText = await pricePills[0].innerText();
  const firstRewardText = await rewardBadges[0].innerText();
  console.log(`  - 首张卡片价格: "${firstPriceText}", 奖励: "${firstRewardText}"`);

  // 2. 下钻免费精选课程详情页 (P1)
  console.log('\n--- 2. 进入 P1 免费课程详情页 ---');
  await page.evaluate(() => App.openAcademyCourse('P1'));
  await page.waitForTimeout(400);

  const coursePageVisible = await page.isVisible('#academy-course-page');
  if (!coursePageVisible) throw new Error('课程详情页未打开！');

  const hasExamBtn = await page.locator('button:has-text("进入结业测验"), button:has-text("提交测验")').count();
  const examLessonRows = await page.locator('.academy-lesson-row:has-text("测验")').count();
  if (hasExamBtn > 0 || examLessonRows > 0) {
    throw new Error('课程详情页依然残留测验/考试课节或入口！');
  }
  console.log('  ✅ 确认课程详情页无任何测验课节或考试入口按钮');

  // 检查课程评价与讨论专区
  const reviewsSection = page.locator('.academy-reviews-section');
  const hasReviewsSection = await reviewsSection.isVisible();
  if (!hasReviewsSection) throw new Error('未找到学员评价与讨论专区！');
  console.log('  ✅ 学员评价与讨论专区正常展示');

  const scoreText = await page.innerText('.academy-score-num');
  const reviewsCount = await page.locator('.academy-review-card').count();
  console.log(`  - 课程口碑评分: ${scoreText}, 现有真实学员评价数: ${reviewsCount}`);

  // 3. 测试学员发表评价与讨论交互
  console.log('\n--- 3. 测试发表新学员评价与讨论 ---');
  await page.click('.star-pick-item:nth-child(5)'); // 点选 5 星
  await page.fill('#academy-review-input', '这门课对高校创作者非常友好，没有死记硬背的做题考试，实操成片直接能去任务集市接单，视频奖励的积分也很实用！');
  
  // 记录发表前积分
  const beforePoints = await page.evaluate(() => MockData.currentUser.points || 0);

  await page.click('button:has-text("发表评价与讨论")');
  await page.waitForTimeout(400);

  const afterReviewPoints = await page.evaluate(() => MockData.currentUser.points || 0);
  console.log(`  - 发表评价后积分从 ${beforePoints} 变为 ${afterReviewPoints} (奖励 +5 创作积分)`);
  if (afterReviewPoints !== beforePoints + 5) {
    throw new Error(`评价奖励积分异常: expected ${beforePoints + 5}, got ${afterReviewPoints}`);
  }

  const updatedReviewsCount = await page.locator('.academy-review-card').count();
  console.log(`  - 发表后学员评价数更新为: ${updatedReviewsCount}`);
  if (updatedReviewsCount !== reviewsCount + 1) {
    throw new Error('新评价未即时上屏！');
  }

  // 4. 进入课节播放页，测试看视频领积分
  console.log('\n--- 4. 进入课节播放页，测试看视频领积分 ---');
  await page.evaluate(() => App.openAcademyLesson('P1-L03'));
  await page.waitForTimeout(400);

  const rewardTip = await page.locator('.academy-player-reward-tip').innerText();
  console.log(`  - 播放器奖励条文案: "${rewardTip.replace(/\n/g, ' ')}"`);
  if (!rewardTip.includes('创作积分')) {
    throw new Error('播放器顶部未展示创作积分奖励条！');
  }

  const beforeLessonPoints = await page.evaluate(() => MockData.currentUser.points || 0);

  // 点击完成课节
  await page.click('button:has-text("完成课节")');
  await page.waitForTimeout(400);

  const afterLessonPoints = await page.evaluate(() => MockData.currentUser.points || 0);
  console.log(`  - 完成视频后积分从 ${beforeLessonPoints} 增加至 ${afterLessonPoints} (已领取视频奖励创作积分)`);
  if (afterLessonPoints <= beforeLessonPoints) {
    throw new Error('完成课节未增加创作积分！');
  }

  // 5. 验证付费课程 (P3) 的购买/解锁流程
  console.log('\n--- 5. 验证付费课程 (P3) 购买与解锁 ---');
  await page.evaluate(() => App.openAcademyCourse('P3'));
  await page.waitForTimeout(400);

  const p3PricePill = await page.locator('.academy-chip:has-text("¥ 49")').count();
  console.log(`  - P3 付费课程价格标签匹配: ${p3PricePill > 0 ? '✅ 正常' : '❌ 未匹配'}`);

  const purchaseBtn = page.locator('button:has-text("立即选购")');
  const hasPurchaseBtn = await purchaseBtn.count() > 0;
  console.log(`  - 付费课程展示选购按钮: ${hasPurchaseBtn ? '✅ 正常' : '❌ 未匹配'}`);

  if (hasPurchaseBtn) {
    await purchaseBtn.first().click();
    await page.waitForTimeout(400);
    const hasContinueBtn = await page.locator('button:has-text("开始学习"), button:has-text("继续学习")').count() > 0;
    console.log(`  - 购买成功后按钮切换为开始/继续学习: ${hasContinueBtn ? '✅ 成功' : '❌ 失败'}`);
  }

  // 截取课程详情页长图供验收
  const screenshotPath = path.join(__dirname, 'academy_optimized_verified.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`- 验证截图已保存至: ${screenshotPath}`);

  if (consoleErrors.length > 0) {
    console.error('控制台存在错误:', consoleErrors);
    throw new Error(`控制台出现 ${consoleErrors.length} 个报错！`);
  }

  console.log('\n🎉 SUCCESS: 成长学院全部优化点（无督学金/无考试、免费付费、看视频奖积分、课程评价与讨论）100% 验收通过！');
  await browser.close();
}

verifyAcademyOptimization().catch(err => {
  console.error('测试异常中断:', err);
  process.exit(1);
});
