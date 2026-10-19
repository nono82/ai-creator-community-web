const { chromium } = require('playwright');

async function testStateDrivenDetailPages() {
  console.log('🚀 开始全量下钻核验不同状态商单二级详情页底部展示的差异化业务内容...\n');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://127.0.0.1:8089/index.html', { waitUntil: 'networkidle' });
  await page.click('.nav-item[data-view="tasks"]');
  await page.waitForTimeout(500);

  // 定义待测试的各种典型状态任务
  const testCases = [
    {
      taskId: 'TK13',
      expectedState: '招募中 / 开放报名',
      mustInclude: ['参与竞标创作者与方案池', '需求咨询与发布方答疑'],
      category: 'open'
    },
    {
      taskId: 'TK02',
      expectedState: '进行中 / 履约中',
      mustInclude: ['签约执行创作者', '项目里程碑全周期跟踪看板'],
      category: 'active'
    },
    {
      taskId: 'TK06',
      expectedState: '待验收',
      mustInclude: ['成果交付核验凭据', '72小时自动打款倒计时', '网盘下载地址'],
      category: 'pending_acceptance'
    },
    {
      taskId: 'TK07',
      expectedState: '返修中',
      mustInclude: ['买家驳回返修工单', '历史版本留存链条'],
      category: 'revision'
    },
    {
      taskId: 'TK09',
      expectedState: '仲裁中',
      mustInclude: ['平台纠纷仲裁专席工单', '官方调处时间线'],
      category: 'arbitration'
    },
    {
      taskId: 'TK04',
      expectedState: '已完成 / 已结案',
      mustInclude: ['合作双方真实履约评价', '商业版权归档与展厅精选收录'],
      category: 'completed'
    },
    {
      taskId: 'TK10',
      expectedState: '未成交 / 已截止',
      mustInclude: ['商单结案审计与安全善后报告', '资金退回凭证'],
      category: 'closed'
    }
  ];

  let allPass = true;

  for (const tc of testCases) {
    console.log(`\n================ 测试商单 [${tc.taskId}] · 状态: ${tc.expectedState} ================`);
    
    // 下钻进入该任务详情页
    await page.evaluate((id) => App.openTaskDetailPage(id), tc.taskId);
    await page.waitForTimeout(400);

    const isDetailVisible = await page.locator('#tasks-detail-page').isVisible();
    const detailText = await page.locator('#tasks-detail-body').innerText();

    // 检查是否包含该状态专属的业务关键字
    const matched = [];
    const missing = [];
    for (const phrase of tc.mustInclude) {
      if (detailText.includes(phrase)) {
        matched.push(phrase);
      } else {
        missing.push(phrase);
      }
    }

    // 检查是否有 undefined / NaN
    const hasUndefined = detailText.includes('undefined') || detailText.includes('NaN');

    const pass = isDetailVisible && missing.length === 0 && !hasUndefined;
    if (!pass) allPass = false;

    const mark = pass ? '✅ PASS' : '❌ FAIL';
    console.log(`${mark} 下钻详情页可见: ${isDetailVisible} | 状态专属模块命中: ${matched.join('、')}`);
    if (missing.length > 0) {
      console.log(`   ❌ 缺失模块关键字: ${missing.join('、')}`);
    }
    if (hasUndefined) {
      console.log(`   ❌ 详情页存在 undefined 或 NaN 异常文本！`);
    }

    // 平滑返回
    await page.evaluate(() => App.closeTaskDetailPage());
    await page.waitForTimeout(200);
  }

  await browser.close();

  console.log('\n======================================================');
  if (allPass) {
    console.log('🎉 恭喜！所有状态按钮下钻后的详情页底部差异化展示 100% 验证通过！');
  } else {
    console.log('❌ 存在未通过的详情页测试项，请检查。');
    process.exit(1);
  }
}

testStateDrivenDetailPages();
