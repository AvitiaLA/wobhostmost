# login_script.py
import asyncio
from playwright.async_api import async_playwright
from datetime import datetime
import os

EMAIL = os.getenv("LOGIN_EMAIL", "your@email.com")
PASSWORD = os.getenv("LOGIN_PASSWORD", "yourpassword")

async def main():
    print("启动浏览器...")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        try:
            print("访问登录页面...")
            await page.goto("https://betadash.lunes.host", timeout=60000)

            print("等待 Cloudflare Turnstile 验证器...")
            checkbox = page.frame_locator("iframe[title*='security challenge']").locator("input[type='checkbox']")
            await checkbox.wait_for(timeout=15000)
            await checkbox.check()
            print("已通过 Cloudflare 人机验证")

            print("填写邮箱和密码...")
            email_input = page.locator("input[type='email']")
            password_input = page.locator("input[type='password']")

            await email_input.fill(EMAIL)
            await password_input.fill(PASSWORD)

            print("点击提交按钮...")
            await page.get_by_role("button", name="Submit").click()

            print("等待登录结果...")
            await page.wait_for_url("https://betadash.lunes.host/", timeout=20000)

            print("[✅] 登录成功！")

        except Exception as e:
            print(f"[错误] 登录过程出错：{e}")
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            screenshot_path = f"error_{timestamp}.png"
            try:
                await page.screenshot(path=screenshot_path)
                print(f"截图保存到 {screenshot_path} 以便排查...")
            except:
                print("截图失败")

        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
