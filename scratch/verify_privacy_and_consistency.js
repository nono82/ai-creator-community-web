const { chromium } = require('playwright');

async function testPrivacyAndConsistency() {
  console.log('🚀 开始核验：1.大厅公开详情隐私脱敏保护  2.同状态/跨状态三段式模版标准化一致性...\n');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://127.0.0.1:8089/index.html', { waitUntil: 'networkidle' });
  await page.click('.nav-item[data-view="tasks"]');
  await page.waitForTimeout(500);

  // 1. 验证公开大厅视角下，待验收任务(TK06)绝不向公众暴露网盘明文和密钥
  console.log('--- 验证项 1: 公开任务大厅（待验收商单 TK06）保密与脱敏检测 ---');
  await page.evaluate(() => App.openTaskDetailPage('TK06'));
  await page.waitForTimeout(400);

  const publicDetailText = await page.locator('#tasks-detail-body').innerText();
  const hasPlainPan = publicDetailText.includes('master-delivery-v2');
  const hasPlainPwd = publicDetailText.includes('AI2026');
  const hasMaskedPan = publicDetailText.includes('••••••••••••');
  const hasMaskedPwd = publicDetailText.includes('•••• (商业双方专享)');
  const hasShieldBanner = await page.locator('.detail-delivery-shield-banner').isVisible();

  console.log(`- 公开大厅是否泄露明文网盘链接: ${hasPlainPan ? '❌ 泄露!' : '✅ 严密隐藏 (0泄露)'}`);
  console.log(`- 公开大厅是否泄露明文密钥密码: ${hasPlainPwd ? '❌ 泄露!' : '✅ 严密隐藏 (0泄露)'}`);
  console.log(`- 公开大厅是否展示脱敏占位符: ${hasMaskedPan ? '✅ 是' : '❌ 否'}`);
  console.log(`- 公开大厅是否展示密钥保密占位: ${hasMaskedPwd ? '✅ 是' : '❌ 否'}`);
  console.log(`- 商业保密安全盾牌提示是否展示: ${hasShieldBanner ? '✅ 是' : '❌ 否'}`);

  if (hasPlainPan || hasPlainPwd || !hasMaskedPan || !hasMaskedPwd || !hasShieldBanner) {
    console.error('❌ 公开大厅隐私脱敏校验失败！');
    process.exit(1);
  }

  // 2. 验证同一个状态下的模版结构统一性 (例如 TK13 与 TK01，均为招募中)
  console.log('\n--- 验证项 2: 同一状态下模版结构完全统一性检测 (TK13 与 TK01) ---');
  const checkStructure = async (taskId) => {
    await page.evaluate((id) => App.openTaskDetailPage(id), taskId);
    await page.waitForTimeout(300);
    const cardTitles = await page.evaluate(() => {
      const cards = document.querySelectorAll('.detail-state-section .detail-state-card');
      return Array.from(cards).map(c => {
        const titleEl = c.querySelector('.detail-state-card-title');
        return titleEl ? titleEl.innerText.trim().replace(/\s+/g, ' ') : '';
      });
    });
    return cardTitles;
  };

  const tk13Titles = await checkStructure('TK13');
  const tk01Titles = await checkStructure('TK01');
  console.log('TK13 卡片架构:', tk13Titles);
  console.log('TK01 卡片架构:', tk01Titles);

  const isSameStructure = JSON.stringify(tk13Titles) === JSON.stringify(tk01Titles);
  console.log(`- 同状态下模版组件架构完全一致: ${isSameStructure ? '✅ 100% 一致' : '❌ 不一致'}`);
  if (!isSameStructure) {
    console.error('❌ 同一状态下模版结构不一致！');
    process.exit(1);
  }

  // 3. 验证跨所有状态，每一个商单均严格具备：1.参与人员 2.阶段看板 3.交流评论 三大标准组件
  console.log('\n--- 验证项 3: 全状态标准化三段式组件闭环覆盖率检测 ---');
  const allTestTasks = ['TK13', 'TK02', 'TK06', 'TK07', 'TK09', 'TK04', 'TK10'];
  for (const tid of allTestTasks) {
    const titles = await checkStructure(tid);
    const hasParticipants = titles.some(t => t.includes('参与人员'));
    const hasBoard = titles.length >= 2;
    const hasComments = titles.some(t => t.includes('咨询') || t.includes('交流') || t.includes('答疑'));
    const isStandard3Cards = titles.length === 3 && hasParticipants && hasBoard && hasComments;
    console.log(`- 商单 [${tid}] 三段式标准化模版检测: ${isStandard3Cards ? '✅ 合规通过 (参与人员 + 业务看板 + 评论互动)' : '❌ 不合规'} -> [${titles.join(' | ')}]`);
    if (!isStandard3Cards) {
      console.error(`❌ 商单 [${tid}] 未能严格呈现三段式标准化模版！`);
      process.exit(1);
    }
  }

  console.log('\n======================================================');
  console.log('🎉 隐私保护与全状态三段式模版一致性检测 100% 验收通过！');
  await browser.close();
}

testPrivacyAndConsistency().catch(err => {
  console.error('测试异常:', err);
  process.exit(1);
});
