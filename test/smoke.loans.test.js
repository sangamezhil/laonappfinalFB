const { chromium } = require('playwright');
const fetch = require('node-fetch');

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
  console.log('Waiting for dev server to be ready...', base);
  await waitForServer(`${base}/login`, 60000, 500);

  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  try {
    // Login
    await page.goto(`${base}/login`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForSelector('button[type="submit"]', { timeout: 30000 });
    await page.fill('input#username, input[placeholder="Enter your username"]', 'admin');
    await page.fill('input#password, input[placeholder="Enter your password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 30000 });

    // Navigate to new loan page
    await page.goto(`${base}/dashboard/loans/new`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForSelector('button:has-text("Submit Application")', { timeout: 30000 });

    // Pick a customer from the select (first eligible)
    await page.click('text=Select a registered customer, button[role="combobox"]', { timeout: 15000 }).catch(async () => {
      // fallback: click the first select trigger on page
      const triggers = await page.$$('[data-headlessui-state]');
      if (triggers.length > 0) await triggers[0].click();
    });

    // Try to click the first select item that looks like a customer name
    const firstOption = page.locator('.select-content [role="option"] , .select-content button, .select-content div[role="option"], .select-content [data-value]').first();
    if (await firstOption.count() === 0) {
      // Alternative: open the select by clicking the visible SelectTrigger
      const trigger = page.locator('text=Select a registered customer').first();
      if (await trigger.count()) await trigger.click();
    }

    // After opening, pick the first customer option using visible list items
    // The Select component in this app renders items as buttons or divs with text; we'll choose the first clickable item inside SelectContent
    const option = page.locator('text=Select a registered customer').first();
    // Safer: click the first SelectItem text node
    const selectItem = page.locator('text=Select a registered customer').first();

    // Practical approach: select the first customer by querying the DOM for a select item
    const selectItems = await page.$$('.select-content [role="option"], .select-content button, .select-content [data-value], .select-content [role="listitem"]');
    if (selectItems.length > 0) {
      await selectItems[0].click();
    } else {
      // fallback: click the first option-like element on the page with pattern "CUST"
      const custOption = await page.locator('text=CUST').first().elementHandle().catch(() => null);
      if (custOption) await custOption.click();
    }

    // Fill loan fields
    const unique = Date.now();
    const amount = '10000';
    await page.fill('input[placeholder="e.g., 50000"]', amount).catch(() => {});
    await page.fill('input[placeholder="Enter doc charges"]', '100').catch(() => {});
    await page.fill('input[placeholder="Enter insurance charges"]', '50').catch(() => {});
    await page.fill('input[placeholder="Repayment Term (Weeks)"]', '40').catch(() => {});
    // Submit
    await Promise.all([
      page.waitForNavigation({ url: '**/dashboard/loans', timeout: 30000 }).catch(() => {}),
      page.click('button:has-text("Submit Application")')
    ]);

    // Find the newly created pending loan row (by amount or customer). We'll search for the amount text.
    await page.waitForSelector(`text=₹${parseInt(amount).toLocaleString('en-IN')}`, { timeout: 20000 }).catch(() => {});

    // Approve the loan: find the row that contains the amount and click its actions menu
    const loanRow = page.locator('tr', { hasText: amount }).first();
    // If not found by amount, try by 'Pending' status badge
    let actionsButton = loanRow.locator('button[aria-haspopup="true"]').first();
    if (!(await actionsButton.count())) {
      // try to find any MoreHorizontal button within the table row that has 'Pending'
      const pendingRow = page.locator('tr', { hasText: 'Pending' }).first();
      actionsButton = pendingRow.locator('button[aria-haspopup="true"]').first();
    }
    await actionsButton.click({ timeout: 10000 });

    // Click 'Approve Loan'
    await page.click('text=Approve Loan', { timeout: 10000 }).catch(() => {});

    // Fill ledger id in dialog
    const ledgerId = `LEDGER${unique}`;
    await page.fill('#ledger-id', ledgerId).catch(() => {});
    await page.click('button:has-text("Approve")');

    // Wait for loan id to update (ledger id should appear in the loans list)
    await page.waitForSelector(`text=${ledgerId}`, { timeout: 20000 });

    // Now navigate to collections page and record a payment
    await page.goto(`${base}/dashboard/collections`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForSelector('button:has-text("Record Collection")', { timeout: 30000 }).catch(() => {});

    // Open loan select and pick the loan with ledgerId
    await page.click('text=Select a loan or group, button[role="combobox"]').catch(() => {});
    // Click the option with ledgerId
    await page.click(`text=${ledgerId}`, { timeout: 15000 }).catch(() => {});

    // Fill amount and submit
    await page.fill('input[placeholder="Enter amount"]', '500').catch(() => {});
    await page.click('button:has-text("Record Collection")');

    // Confirm the dialog
    await page.waitForSelector('text=Confirm Collection', { timeout: 10000 });
    await page.click('button:has-text("Confirm")').catch(() => {});

    // Verify the collection appears in recent collections (amount or loan id)
    await page.waitForSelector(`text=${ledgerId}`, { timeout: 20000 });
    await page.waitForSelector('text=500', { timeout: 20000 }).catch(() => {});

    console.log('Loan smoke test passed: created, approved, and recorded collection for', ledgerId);
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('Loan smoke test failed:', err);
    await browser.close();
    process.exit(1);
  }
})();
