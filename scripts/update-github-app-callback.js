/**
 * Playwright script to automate updating GitHub App callback URL.
 * Run from workspace root: node scripts/update-github-app-callback.js
 * 
 * This script opens a browser, pre-fills the GitHub username, 
 * and then waits for you to complete the login. After you log in,
 * it automatically finds and updates the callback URL field.
 */

const { chromium } = require('C:/Users/Mrityunjoy/aiDevOps/apps/web/node_modules/@playwright/test');

const GITHUB_APP_SLUG = 'devintel-ai';
const CALLBACK_URL = 'http://localhost:3000/api/auth/callback/github';
const GITHUB_SETTINGS_URL = `https://github.com/settings/apps/${GITHUB_APP_SLUG}`;
const GITHUB_USERNAME = 'Pikxul';

async function updateCallbackURL(page) {
  console.log('\n✅ On GitHub App settings page!');
  await page.waitForTimeout(2000);
  
  // Scroll to see the full page
  await page.evaluate(() => window.scrollTo(0, 0));
  
  // Take screenshot
  await page.screenshot({ path: 'C:/Users/Mrityunjoy/aiDevOps/scripts/github-app-settings.png', fullPage: false });
  console.log('📸 Settings screenshot saved: scripts/github-app-settings.png');
  
  // List all input fields on the page
  const allInputs = await page.locator('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"])').all();
  console.log(`\n📋 Found ${allInputs.length} input fields:`);
  for (const inp of allInputs) {
    const name = await inp.getAttribute('name').catch(() => '');
    const id = await inp.getAttribute('id').catch(() => '');
    const placeholder = await inp.getAttribute('placeholder').catch(() => '');
    const val = await inp.inputValue().catch(() => '');
    console.log(`  name="${name}" id="${id}" placeholder="${placeholder}" value="${val.substring(0, 80)}"`);
  }
  
  // GitHub App settings - look for callback URL input
  // The actual field name may be "hook_attributes[url]", "redirect_url", "callback_url", or similar
  const callbackSelectors = [
    'input[name="redirect_url"]',
    'input[name="callback_url"]',
    'input[name="hook_attributes[url]"]',
    'input[id="github-app-callback-url"]',
    'input[id*="callback"]',
    'input[id*="redirect"]',
  ];
  
  let found = false;
  for (const sel of callbackSelectors) {
    const el = page.locator(sel).first();
    if (await el.count() > 0) {
      const currentVal = await el.inputValue();
      console.log(`\n✅ Found callback field (${sel}): "${currentVal}"`);
      
      if (currentVal !== CALLBACK_URL) {
        await el.click({ clickCount: 3 });
        await el.fill(CALLBACK_URL);
        console.log(`✅ Set to: ${CALLBACK_URL}`);
        
        // Find and click save button
        const saveBtn = page.locator('button[type="submit"], input[type="submit"]').first();
        if (await saveBtn.count() > 0) {
          const text = await saveBtn.textContent().catch(() => 'Save');
          await saveBtn.click();
          console.log(`✅ Clicked: "${text.trim()}"`);
          await page.waitForTimeout(3000);
          await page.screenshot({ path: 'C:/Users/Mrityunjoy/aiDevOps/scripts/github-app-after.png', fullPage: false });
          console.log('📸 After screenshot: scripts/github-app-after.png');
          console.log('\n🎉 SUCCESS! GitHub App callback URL updated to:');
          console.log(`   ${CALLBACK_URL}`);
          console.log('\n   GitHub OAuth login should now work.');
        }
      } else {
        console.log('✅ Callback URL already correctly set!');
      }
      found = true;
      break;
    }
  }
  
  if (!found) {
    console.log('\n⚠️  Could not find the callback URL field automatically.');
    console.log('   The browser window is open. Please manually:');
    console.log(`   1. Go to: ${GITHUB_SETTINGS_URL}`);
    console.log('   2. Find the "Callback URL" field');
    console.log(`   3. Set it to: ${CALLBACK_URL}`);
    console.log('   4. Click "Save changes"');
    
    // Take a full-page screenshot for debugging
    await page.screenshot({ path: 'C:/Users/Mrityunjoy/aiDevOps/scripts/github-app-fullpage.png', fullPage: true });
    console.log('📸 Full page screenshot: scripts/github-app-fullpage.png');
  }
}

async function main() {
  console.log('🚀 Launching browser...');
  console.log('   You may need to log in to GitHub in the browser window.\n');
  
  const browser = await chromium.launch({ 
    headless: false, 
    slowMo: 100,
  });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });
  const page = await context.newPage();

  try {
    // Navigate to GitHub App settings
    console.log(`📍 Opening: ${GITHUB_SETTINGS_URL}`);
    await page.goto(GITHUB_SETTINGS_URL, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(1500);
    
    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);
    
    // Check if redirected to login page
    if (currentUrl.includes('/login')) {
      console.log('\n🔐 Need to log in to GitHub...');
      
      // Pre-fill the username
      const usernameField = page.locator('#login_field').first();
      if (await usernameField.count() > 0) {
        await usernameField.fill(GITHUB_USERNAME);
        console.log(`✅ Pre-filled username: ${GITHUB_USERNAME}`);
        console.log('\n⌨️  Please enter your password in the browser window and click "Sign in".');
        console.log('   (You have 3 minutes to complete the login)\n');
        
        // Focus the password field to make it easier
        await page.locator('#password').first().click().catch(() => {});
      }
      
      // Wait for navigation to app settings after login
      console.log('⏳ Waiting for you to log in...');
      try {
        await page.waitForURL(`**/settings/apps/${GITHUB_APP_SLUG}**`, { timeout: 180000 });
        await updateCallbackURL(page);
      } catch (e) {
        // Maybe they went to a 2FA page or the settings page URL has changed
        const newUrl = page.url();
        console.log(`\n⚠️  Timeout or URL mismatch. Current URL: ${newUrl}`);
        if (newUrl.includes('settings/apps')) {
          await updateCallbackURL(page);
        } else {
          console.log('   Could not navigate to GitHub App settings after login.');
        }
      }
    } else if (currentUrl.includes('/settings/apps')) {
      // Already logged in
      await updateCallbackURL(page);
    } else {
      console.log(`\n⚠️  Unexpected URL: ${currentUrl}`);
    }
    
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    await page.screenshot({ path: 'C:/Users/Mrityunjoy/aiDevOps/scripts/github-app-error.png' }).catch(() => {});
    console.log('📸 Error screenshot saved: scripts/github-app-error.png');
  } finally {
    console.log('\n🔚 Keeping browser open for 60 seconds so you can verify...');
    console.log('   Press Ctrl+C to close immediately.');
    await page.waitForTimeout(60000).catch(() => {});
    await browser.close();
    console.log('Browser closed.');
  }
}

main().catch(console.error);
