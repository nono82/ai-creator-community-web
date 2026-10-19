const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push(err.message));

  console.log('Navigating to app...');
  await page.goto('http://127.0.0.1:8089/index.html', { waitUntil: 'networkidle' });

  // Switch to tasks page and then gallery mode
  await page.click('.nav-item[data-view="tasks"]');
  await page.waitForTimeout(300);
  await page.evaluate(() => App.setTasksMode('gallery'));
  await page.waitForTimeout(600);

  // Check gallery cards
  const likeButtons = await page.$$('.gallery-like-btn');
  console.log(`Found ${likeButtons.length} gallery like buttons`);
  if (likeButtons.length === 0) {
    throw new Error('No .gallery-like-btn found in gallery!');
  }

  // Check first card initial state
  const firstBtn = likeButtons[0];
  const initialText = await firstBtn.innerText();
  const isLikedInitial = await firstBtn.evaluate(el => el.classList.contains('is-liked'));
  console.log(`Initial button state: text="${initialText.replace(/\n/g, ' ')}", isLiked=${isLikedInitial}`);

  const initialNum = parseInt(initialText.replace(/[^\d]/g, ''), 10);

  // Click like button
  console.log('Clicking like button...');
  await firstBtn.click();
  await page.waitForTimeout(400);

  // Verify updated state
  const updatedBtn = (await page.$$('.gallery-like-btn'))[0];
  const updatedText = await updatedBtn.innerText();
  const isLikedAfter = await updatedBtn.evaluate(el => el.classList.contains('is-liked'));
  const updatedNum = parseInt(updatedText.replace(/[^\d]/g, ''), 10);
  console.log(`After click: text="${updatedText.replace(/\n/g, ' ')}", isLiked=${isLikedAfter}, count=${updatedNum}`);

  if (!isLikedAfter) {
    throw new Error('Expected button to have class "is-liked" after click');
  }
  if (updatedNum !== initialNum + 1) {
    throw new Error(`Expected like count to be ${initialNum + 1}, got ${updatedNum}`);
  }

  // Check lightbox didn't open
  const lightboxVisible = await page.evaluate(() => {
    const lb = document.getElementById('preview-lightbox');
    return lb && lb.style.display !== 'none' && lb.classList.contains('is-active');
  });
  console.log(`Lightbox open check: ${lightboxVisible} (expected false)`);
  if (lightboxVisible) {
    throw new Error('Lightbox opened despite stopPropagation!');
  }

  // Check toast
  const toastText = await page.evaluate(() => {
    const t = document.querySelector('.toast, .custom-toast, [id*="toast"]');
    return t ? t.textContent : '';
  });
  console.log(`Toast message: "${toastText.trim()}"`);

  // Take screenshot of liked card in gallery
  const screenshotPath = path.join(__dirname, 'gallery_like_verified.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`Screenshot saved to ${screenshotPath}`);

  // Click again to unlike
  console.log('Clicking again to cancel like...');
  await updatedBtn.click();
  await page.waitForTimeout(400);

  const unlikedBtn = (await page.$$('.gallery-like-btn'))[0];
  const unlikedText = await unlikedBtn.innerText();
  const isLikedFinal = await unlikedBtn.evaluate(el => el.classList.contains('is-liked'));
  const finalNum = parseInt(unlikedText.replace(/[^\d]/g, ''), 10);
  console.log(`After unlike: text="${unlikedText.replace(/\n/g, ' ')}", isLiked=${isLikedFinal}, count=${finalNum}`);

  if (isLikedFinal) {
    throw new Error('Expected button to NOT have class "is-liked" after cancel');
  }
  if (finalNum !== initialNum) {
    throw new Error(`Expected like count to revert to ${initialNum}, got ${finalNum}`);
  }

  // Re-like it so the UI has an active liked sample demonstration
  await unlikedBtn.click();
  await page.waitForTimeout(300);

  if (consoleErrors.length > 0) {
    console.error('Console errors:', consoleErrors);
    throw new Error(`Found ${consoleErrors.length} console errors`);
  }

  console.log('🎉 SUCCESS: All gallery like button tests passed perfectly with 0 errors!');
  await browser.close();
})();
