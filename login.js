const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  console.log('🌐 打开登录页面...');
  await page.goto('https://betadash.lunes.host/login', { waitUntil: 'networkidle2' });

  // 等待 Turnstile 验证 iframe 加载
  console.log('⏳ 等待验证区域加载...');
  try {
    await page.waitForSelector('iframe[src*="challenges.cloudflare.com"]', { visible: true, timeout: 10000 });
    console.log('✅ 验证 iframe 已加载');
  } catch (e) {
    console.error('❌ 未找到验证 iframe');
    await browser.close();
    return;
  }

  // 保存页面源码方便调试
  const html = await page.content();
  fs.writeFileSync('page-content.html', html);
  console.log('📝 页面源码已保存为 page-content.html');

  // 截图验证区域
  await page.screenshot({ path: 'verify-area.png' });
  console.log('📝 验证区域截图已保存 verify-area.png');

  // 获取 iframe 元素并切换上下文
  const frameHandle = await page.$('iframe[src*="challenges.cloudflare.com"]');
  const frame = await frameHandle.contentFrame();

  // 尝试点击复选框
  try {
    const checkbox = await frame.$('input[type="checkbox"]');
    if (checkbox) {
      await checkbox.click();
      console.log('✅ 已点击验证复选框');
    } else {
      console.error('❌ 未找到验证复选框');
      await browser.close();
      return;
    }
  } catch (e) {
    console.error('❌ 点击验证复选框时出错:', e);
    await browser.close();
    return;
  }

  // 等待验证通过
  try {
    await page.waitForFunction(() => {
      const input = document.querySelector('input[name="cf-turnstile-response"]');
      return input && input.value.length > 0;
    }, { timeout: 10000 });
    console.log('🎉 验证通过');
  } catch (e) {
    console.error('❌ 验证未通过');
    await page.screenshot({ path: 'verify-failed.png' });
    await browser.close();
    return;
  }

  // 下面是登录流程
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

  const submitBtn = await page.$('button[type="submit"]');
  if (submitBtn) {
    await submitBtn.click();
    console.log('🚀 已点击登录按钮');
  } else {
    console.error('❌ 未找到登录按钮');
    await browser.close();
    return;
  }

  await page.waitForTimeout(5000);
  console.log('⏳ 等待页面加载完成...');
  await page.screenshot({ path: 'login-success.png' });
  console.log('✅ 登录成功，截图已保存');

  await browser.close();
})();
