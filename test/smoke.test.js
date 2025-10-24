const { chromium } = require('playwright');

// Stability improvements for dev-mode:
// - wait for the server to respond before starting the browser
// - prefer waitForSelector + waitUntil: 'load' instead of networkidle which
//   can be flaky during Next.js dev compilation
// - increase several timeouts to tolerate slower machines / dev compile

async function waitForServer(url, timeout = 60000, interval = 500) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res.status === 200) return true;
    } catch (e) {
      // ignore
    }
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error(`Server did not respond at ${url} within ${timeout}ms`);
}

(async () => {
  const base = process.env.BASE_URL || 'http://localhost:9002';

  // Wait for the dev server to be ready (login page)
  console.log('Waiting for dev server to be ready...', base);
  await waitForServer(`${base}/login`, 60000, 500);

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--single-process',
      '--disable-extensions',
    ],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  try {
    console.log('Opening login page...');
    await page.goto(`${base}/login`, { waitUntil: 'load', timeout: 60000 });

    // Wait for the login form to be present before filling
    await page.waitForSelector('button[type="submit"]', { timeout: 30000 });

    // Login as admin
    await page.fill('input#username, input[placeholder="Enter your username"], input[aria-label="username"]', 'admin');
    await page.fill('input#password, input[placeholder="Enter your password"], input[aria-label="password"]', 'password');
    // Click login and wait for dashboard URL. The app uses an internal delay
    // during login, so wait for the URL rather than strict networkidle.
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 30000 });

    console.log('Logged in, navigating to new customer page...');
    await page.goto(`${base}/dashboard/customers/new`, { waitUntil: 'load', timeout: 60000 });

    const unique = Date.now();
    const fullName = `Automated Test ${unique}`;

    // Wait for the form controls to be visible
    await page.waitForSelector('input[placeholder="Enter full name"]', { timeout: 30000 });

    // Fill the KYC form using placeholders/locators. Use locator().nth() for
    // duplicated placeholders (two phone inputs).
    await page.locator('input[placeholder="Enter full name"]').fill(fullName);
    await page.locator('input[placeholder="DDMMYYYY"]').fill('01011990').catch(() => {});
    await page.locator('input[placeholder="example@email.com"]').fill(`test${unique}@example.com`).catch(() => {});
    // Two phone inputs share the same placeholder; fill first and second explicitly.
    const phones = page.locator('input[placeholder="10-digit mobile number"]');
    if (await phones.count() >= 1) await phones.nth(0).fill('9999999999');
    if (await phones.count() >= 2) await phones.nth(1).fill('8888888888');
    await page.locator('input[placeholder="Enter full address"]').fill('123 Test Street, Testville').catch(() => {});
    await page.locator('input[placeholder="Enter ID number"]').fill('123412341234').catch(() => {});
    await page.locator('input[placeholder="Enter secondary ID number"]').fill('PAN12345').catch(() => {});
    // Monthly income input may be type=number; try both selectors.
    const incomeLocator = page.locator('input[placeholder="Enter monthly income"]').first();
    if (await incomeLocator.count()) {
      await incomeLocator.fill('10000').catch(() => {});
    } else {
      await page.locator('input[type="number"]').fill('10000').catch(() => {});
    }

    // Submit
    await Promise.all([
      page.waitForNavigation({ url: '**/dashboard/customers', timeout: 30000 }).catch(() => {}),
      page.click('button[type="submit"]'),
    ]);

    // After submitting the new customer form the app navigates back to the
    // customers list. Wait for the list page and the created name to appear.
    await page.waitForURL('**/dashboard/customers', { timeout: 30000 });

    console.log('Submitted new customer, verifying it appears in list...');

    // Ensure customers list contains the created name
    await page.waitForSelector('text=' + fullName, { timeout: 20000 });

    console.log('Smoke test passed: customer found in list:', fullName);
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('Smoke test failed:', err);
    await browser.close();
    process.exit(1);
  }
})();
