const { chromium } = require('playwright');
const path = require('path');

async function testGalleryIntroText() {
  console.log('🚀 开始验证作品展厅顶部精简单行文案与紧凑布局...\n');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://127.0.0.1:8089/index.html', { waitUntil: 'networkidle' });
  await page.click('.nav-item[data-view="tasks"]');
  await page.waitForTimeout(300);

  // 切换至作品展厅
  await page.evaluate(() => App.setTasksMode('gallery'));
  await page.waitForTimeout(400);

  const introBar = page.locator('.gallery-intro-bar');
  const introTextEl = page.locator('#gallery-intro-text');
  const isVisible = await introTextEl.isVisible();
  const text = (await introTextEl.innerText()).trim();
  console.log(`- 展厅顶部引导文案区域可见: ${isVisible ? '✅ 是' : '❌ 否'}`);
  console.log(`- 展厅顶部单行文案内容: "${text}"`);

  const barBox = await introBar.boundingBox();
  console.log(`- 展厅顶部 bar 尺寸: 宽度 ${barBox.width.toFixed(1)}px, 高度 ${barBox.height.toFixed(1)}px`);

  // 检查是否高度紧凑（单行应在 40-52px 之间，之前多行是 75-90px）
  const isCompact = barBox.height <= 56;
  console.log(`- 顶部 bar 高度紧凑（不超过56px）: ${isCompact ? '✅ 是 (' + barBox.height + 'px)' : '❌ 否 (' + barBox.height + 'px)'}`);

  // 检查右侧按钮是否完好
  const hasBoothBtn = await page.locator('.gallery-my-booth-btn').isVisible();
  const hasTag = await page.locator('.gallery-intro-tag').isVisible();
  console.log(`- 右侧「我的展位与档期」按钮存在: ${hasBoothBtn ? '✅ 是' : '❌ 否'}`);
  console.log(`- 右侧「精选馆」标签存在: ${hasTag ? '✅ 是' : '❌ 否'}`);

  // 截取顶部条特写
  const screenshotPath = path.join(__dirname, 'gallery_intro_single_line.png');
  await introBar.screenshot({ path: screenshotPath });
  console.log(`- 紧凑单行条截图已保存至: ${screenshotPath}`);

  const pass = isVisible && text.includes('沉淀高校认证创作者真实商单交付成果与高分样片') && isCompact && hasBoothBtn && hasTag;
  console.log('\n======================================================');
  if (pass) {
    console.log('🎉 展厅顶部文案精简为单行优雅布局 100% 验收通过！');
    await browser.close();
    process.exit(0);
  } else {
    console.error('❌ 验收未通过！');
    await browser.close();
    process.exit(1);
  }
}

testGalleryIntroText().catch(err => {
  console.error('测试异常:', err);
  process.exit(1);
});
