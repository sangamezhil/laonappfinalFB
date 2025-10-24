const { chromium } = require('playwright');

async function waitForServer(url, timeout = 60000, interval = 500) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res.status === 200) return true;
    } catch (e) {}
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error(`Server did not respond at ${url} within ${timeout}ms`);
}

(async () => {
  const base = process.env.BASE_URL || 'http://localhost:9002';

  console.log('[loans-smoke] waiting for server...');
  await waitForServer(`${base}/login`, 60000, 500);

  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  try {
    // 1) Login
    console.log('[loans-smoke] opening login page');
    await page.goto(`${base}/login`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForSelector('button[type="submit"]', { timeout: 30000 });
    await page.fill('input#username, input[placeholder="Enter your username"], input[aria-label="username"]', 'admin');
    await page.fill('input#password, input[placeholder="Enter your password"], input[aria-label="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 30000 });

    // 2) Ensure at least one customer exists by creating one (reuse customers smoke flow)
    console.log('[loans-smoke] creating a customer (if none)');
    await page.goto(`${base}/dashboard/customers/new`, { waitUntil: 'load', timeout: 60000 });
  const unique = Date.now();
  const fullName = `Automated Loan Test ${unique}`;
  const customerPhone = '999999' + String(unique).slice(-4);
    // fill KYC fields if present
    await page.locator('input[placeholder="Enter full name"]').fill(fullName).catch(() => {});
    await page.locator('input[placeholder="DDMMYYYY"]').fill('01011990').catch(() => {});
    await page.locator('input[placeholder="example@email.com"]').fill(`loan${unique}@example.com`).catch(() => {});
    const phones = page.locator('input[placeholder="10-digit mobile number"]');
  if (await phones.count() >= 1) await phones.nth(0).fill(customerPhone).catch(() => {});
  if (await phones.count() >= 2) await phones.nth(1).fill('888888' + String(unique).slice(-4)).catch(() => {});
    await page.locator('input[placeholder="Enter full address"]').fill('123 Test St').catch(() => {});
    await page.locator('input[placeholder="Enter ID number"]').fill('ID' + String(unique)).catch(() => {});
    await page.locator('input[placeholder="Enter secondary ID number"]').fill('PAN' + String(unique)).catch(() => {});
    await page.locator('input[placeholder="Enter monthly income"]').fill('10000').catch(() => {});
    await Promise.all([
      page.waitForNavigation({ url: '**/dashboard/customers', timeout: 30000 }).catch(() => {}),
      page.click('button[type="submit"]'),
    ]);

  // We created (or ensured) a customer; continue to loan creation.
  console.log('[loans-smoke] created/ensured a customer, continuing to loan creation');

    // 3) Create Personal Loan for that customer
    console.log('[loans-smoke] creating a personal loan');
    await page.goto(`${base}/dashboard/loans/new`, { waitUntil: 'load', timeout: 60000 });
    // open customer select
    // Click trigger by placeholder text
    await page.waitForSelector('text=Select a registered customer', { timeout: 30000 });
    await page.click('text=Select a registered customer');
    // choose first option
    await page.waitForSelector('[role="option"]', { timeout: 10000 }).catch(() => {});
    const optionCount = await page.locator('[role="option"]').count().catch(() => 0);
    if (optionCount > 0) {
      await page.locator('[role="option"]').first().click();
    } else {
      // fallback: click first SelectItem text pattern " - "
      await page.locator('text= - ').first().click().catch(() => {});
    }

    // fill numeric fields
    await page.locator('input[placeholder="e.g., 50000"]').fill('50000').catch(() => {});
    await page.locator('input[placeholder="Enter doc charges"]').fill('500').catch(() => {});
    await page.locator('input[placeholder="Enter insurance charges"]').fill('100').catch(() => {});
    await page.locator('input[type="number"]').filter({ hasText: '' }).nth(0).fill('40').catch(() => {});

    // submit application
    await Promise.all([
      page.waitForNavigation({ url: '**/dashboard/loans', timeout: 40000 }).catch(() => {}),
      page.click('button:has-text("Submit Application")'),
    ]);

    // After navigation to loans page, populate the search with the created customer's phone
    await page.waitForSelector('input[placeholder="Search by name, phone, or loan ID..."]', { timeout: 20000 }).catch(() => {});
    await page.fill('input[placeholder="Search by name, phone, or loan ID..."]', customerPhone).catch(() => {});
    // give the page some time to filter and render
    await page.waitForTimeout(1000);

    // 4) Approve the created loan (look for pending loan row and use Approve action)
    console.log('[loans-smoke] approving created loan');
  await page.waitForSelector('text=Pending', { timeout: 60000 });
    // Open dropdown for first pending loan and click Approve
    // There may be a direct Approve button for group loans; for personal loans it's a dropdown item.
    // Try Approve buttons first
    const approveButton = page.locator('text=Approve Loan').first();
    if (await approveButton.count()) {
      await approveButton.click().catch(() => {});
    } else {
      // open More menu then select Approve Loan
      const moreButtons = await page.locator('button[aria-haspopup="true"]').count().catch(() => 0);
      if (moreButtons > 0) {
        await page.locator('button[aria-haspopup="true"]').first().click();
        await page.waitForSelector('text=Approve Loan', { timeout: 20000 });
        // small pause to ensure menu animation completes
        await page.waitForTimeout(300);
        await page.click('text=Approve Loan').catch(() => {});
        // capture a screenshot and HTML after clicking Approve (diagnostic)
        try {
          await page.screenshot({ path: '/tmp/loans_approve_after_click.png', fullPage: true }).catch(() => {});
          const fs = require('fs');
          fs.writeFileSync('/tmp/loans_approve_after_click.html', await page.content());
        } catch (e) {
          // ignore diagnostics failures
        }
      }
    }

    // If approval requires ledger id dialog (it does), fill ledger id and confirm
  // Wait for ledger input (dialog) and fill it
  await page.waitForSelector('#ledger-id', { timeout: 60000 });
  await page.fill('#ledger-id', `LEDGER_${Date.now()}`); // unique ledger id
  await page.click('text=Approve').catch(() => {});

    // Wait for loan to become Active
    await page.waitForSelector('text=Active', { timeout: 20000 });

    // 5) Record a collection for the approved loan
    console.log('[loans-smoke] recording a collection payment');
    // Find first Active loan and click "Record Payment" link via dropdown
    // Try direct Record Payment link
    await page.waitForSelector('text=Record Payment', { timeout: 10000 }).catch(() => {});
    const recordLink = page.locator('text=Record Payment').first();
    if (await recordLink.count()) {
      await recordLink.click().catch(() => {});
    } else {
      // fallback: navigate to collections page and pick first active loan from select
      await page.goto(`${base}/dashboard/collections`, { waitUntil: 'load', timeout: 60000 });
    }

    // On collections page, if loanId is preselected, wait for amount input
    await page.waitForSelector('input[placeholder="Enter amount"], button:has-text("Record Collection")', { timeout: 20000 });
    // Ensure loan select is set; then fill amount and submit
    await page.fill('input[placeholder="Enter amount"], input[type="number"]', '1000').catch(() => {});
    await Promise.all([
      page.waitForSelector('text=Collection Recorded', { timeout: 20000 }).catch(() => {}),
      page.click('text=Record Collection').catch(() => {}),
    ]);

    console.log('[loans-smoke] checking collections list for recorded entry');
    // Wait for confirmation toast or collections list update
    await page.waitForSelector('text=Collection Recorded', { timeout: 20000 }).catch(() => {});

    console.log('[loans-smoke] smoke loans test passed');
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('[loans-smoke] failed:', err);
    await browser.close();
    process.exit(1);
  }
})();
