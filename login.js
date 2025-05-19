const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  console.log('🌐 打开登录页面...');
  await page.goto('https://betadash.lunes.host/login', { waitUntil: 'networkidle2' });

  console.log('⏳ 等待验证区域加载...');
  await page.waitForTimeout(10000); // 等待 Cloudflare 验证区域出现

  // 获取 iframe 中的 Cloudflare 验证框
  const frames = await page.frames();
  const cfFrame = frames.find(frame => frame.url().includes('challenges.cloudflare.com'));

  if (!cfFrame) {
    console.error('❌ 未找到 Cloudflare 验证 iframe');
    await browser.close();
    return;
  }

  // 防止点击 Cloudflare logo 区域
  await cfFrame.evaluate(() => {
    document.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', e => e.preventDefault());
    });
  });

  // 点击验证文字区域，避开 logo
  const verifyText = await cfFrame.$('span[class*="label"]');
  if (verifyText) {
    await verifyText.click();
    console.log('✅ 已点击验证区域');
  } else {
    console.error('❌ 未找到验证点击区域');
    await browser.close();
    return;
  }

  // 等待验证成功文字出现（Success）
  try {
    await cfFrame.waitForFunction(() => {
      return document.body?.innerText?.includes('Success');
    }, { timeout: 10000 });
    console.log('🎉 验证通过');
  } catch (e) {
    console.error('❌ 验证未通过');
    await browser.close();
    return;
  }

  // 输入账号密码（从环境变量读取）
  const email = process.env.EMAIL;
  const password = process.env.PASSWORD;

  if (!email || !password) {
    console.error('❌ 缺少 EMAIL 或 PASSWORD 环境变量');
    await browser.close();
    return;
  }

  console.log('📝 填写账号密码...');
  await page.type('input[type="email"]', email, { delay: 100 });
  await page.type('input[type="password"]', password, { delay: 100 });

  // 点击登录按钮
  const submitBtn = await page.$('button[type="submit"]');
  if (submitBtn) {
    await submitBtn.click();
    console.log('🚀 已点击登录按钮');
  } else {
    console.error('❌ 未找到登录按钮');
    await browser.close();
    return;
  }

  // 等待 5 秒，确保登录完成
  await page.waitForTimeout(5000);
  console.log('⏳ 等待页面加载完成...');

  // 截图保存登录后的页面
  await page.screenshot({ path: 'login-success.png' });
  console.log('✅ 登录成功，截图已保存');

  await browser.close();
})();
