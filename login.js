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

  console.log('⏳ 等待验证区域加载...');
  await page.waitForTimeout(10000);  // 等待10秒，确保验证区域渲染

  // 保存页面源码调试
  const html = await page.content();
  fs.writeFileSync('page-content.html', html);
  console.log('📝 页面源码已保存');

  // 截图验证区域
  await page.screenshot({ path: 'verify-area.png' });
  console.log('📝 验证区域截图已保存');

  // 优先找到复选框（input[type=checkbox]）
  const checkbox = await page.$('input[type="checkbox"]');

  if (!checkbox) {
    console.error('❌ 未找到复选框');
    await browser.close();
    return;
  }

  // 点击复选框
  await checkbox.click();
  console.log('✅ 已点击复选框');

  // 等待文字从“Verify you are human”变为“Success”，最多等待10秒
  try {
    await page.waitForFunction(() => {
      const el = document.querySelector('label');
      return el && el.innerText.includes('Success');
    }, { timeout: 10000 });
    console.log('🎉 验证通过');
  } catch {
    console.error('❌ 验证未通过');
    await page.screenshot({ path: 'verify-failed.png' });
    await browser.close();
    return;
  }

  // 继续登录流程
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

  console.log('⏳ 等待页面加载完成...');
  await page.waitForTimeout(7000);  // 等待7秒确保页面加载完成

  await page.screenshot({ path: 'login-success.png' });
  console.log('✅ 登录成功，截图已保存');

  await browser.close();
})();
