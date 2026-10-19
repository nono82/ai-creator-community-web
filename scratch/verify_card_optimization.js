const { chromium } = require('playwright');

async function testCardOptimizations() {
  console.log('🔍 开始验证卡片3大项优化细节...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://127.0.0.1:8089/index.html', { waitUntil: 'networkidle' });
  await page.click('.nav-item[data-view="tasks"]');
  await page.waitForTimeout(500);

  // 1. 验证任务大厅“可报名”卡片
  await page.click('#tasks-lifecycle-tabs button[data-life="open"]');
  await page.waitForTimeout(300);

  const checkPlazaCard = await page.evaluate(() => {
    const card = document.querySelector('.task-plaza-card');
    if (!card) return { found: false };

    // 检查右上角是否有评分胶囊
    const scoreChip = card.querySelector('.task-score-chip');
    const oldModeChip = card.querySelector('.task-mode-chip');
    
    // 检查底部是否有旧的评分药丸
    const oldScorePill = card.querySelector('.task-score-pill');

    // 检查描述容器高度与行数
    const desc = card.querySelector('.task-card-desc');
    const descRect = desc ? desc.getBoundingClientRect() : null;
    const descStyle = desc ? window.getComputedStyle(desc) : null;

    return {
      found: true,
      hasScoreChip: !!scoreChip,
      scoreChipText: scoreChip ? scoreChip.innerText.trim() : null,
      hasOldModeChip: !!oldModeChip,
      hasOldScorePill: !!oldScorePill,
      descHeight: descRect ? descRect.height : null,
      descLineClamp: descStyle ? descStyle.webkitLineClamp : null,
      descLineHeight: descStyle ? descStyle.lineHeight : null
    };
  });

  console.log('\n[验证1 & 2: 任务大厅卡片结构与两行描述]');
  console.log('- 找到卡片:', checkPlazaCard.found);
  console.log('- 右上角评分胶囊存在:', checkPlazaCard.hasScoreChip, `(内容: "${checkPlazaCard.scoreChipText}")`);
  console.log('- 旧的模式胶囊(方案选拔/名额即接)已移除:', !checkPlazaCard.hasOldModeChip);
  console.log('- 底部评分胶囊已移除:', !checkPlazaCard.hasOldScorePill);
  console.log('- 描述区域固定高度:', checkPlazaCard.descHeight, 'px (两行严格占位)');

  // 2. 验证任务大厅“已结束”卡片的中标合作与溢出检测
  await page.click('#tasks-lifecycle-tabs button[data-life="ended"]');
  await page.waitForTimeout(400);

  const checkEndedCard = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.task-plaza-card'));
    const results = [];

    cards.forEach((card, idx) => {
      const winnerPill = card.querySelector('.task-winner-pill');
      const isSub = card.querySelector('.task-card-meta.is-sub');
      const mainCol = card.querySelector('.task-card-main');
      
      // 检测是否存在横向溢出
      const hasOverflow = isSub ? isSub.scrollWidth > (isSub.clientWidth + 2) : false;
      const mainOverflow = mainCol ? mainCol.scrollWidth > (mainCol.clientWidth + 2) : false;

      results.push({
        index: idx,
        hasWinnerPill: !!winnerPill,
        winnerText: winnerPill ? winnerPill.innerText.trim() : null,
        hasOverflow,
        mainOverflow,
        isSubClientWidth: isSub ? isSub.clientWidth : 0,
        isSubScrollWidth: isSub ? isSub.scrollWidth : 0
      });
    });

    return results;
  });

  console.log('\n[验证3: 已结束卡片中标合作与溢出检测]');
  checkEndedCard.forEach(r => {
    console.log(`- 卡片 #${r.index}: ${r.hasWinnerPill ? '中标合作标签: "' + r.winnerText + '"' : '未成交/无中标'} | is-sub是否向右溢出: ${r.hasOverflow ? '❌ 溢出' : '✅ 正常无溢出'} | 主体容器是否溢出: ${r.mainOverflow ? '❌ 溢出' : '✅ 正常'}`);
  });

  // 3. 验证“我的任务”卡片描述
  await page.click('#tasks-mode-tabs .underline-tab[data-mode="mine"]');
  await page.waitForTimeout(400);

  const checkMineCard = await page.evaluate(() => {
    const card = document.querySelector('.tasks-mine-card');
    if (!card) return { found: false };

    const desc = card.querySelector('.task-card-desc');
    const descRect = desc ? desc.getBoundingClientRect() : null;
    const descStyle = desc ? window.getComputedStyle(desc) : null;

    return {
      found: true,
      descHeight: descRect ? descRect.height : null,
      descLineClamp: descStyle ? descStyle.webkitLineClamp : null
    };
  });

  console.log('\n[验证4: 我的任务卡片两行描述]');
  console.log('- 我的任务描述区域固定高度:', checkMineCard.descHeight, 'px (两行严格占位)');

  await browser.close();
  console.log('\n🎉 所有新优化项逐一核验完成！');
}

testCardOptimizations();
