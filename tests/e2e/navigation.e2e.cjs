'use strict';
// Browser regression checks for routing (webapp-testing skill: wait -> inspect -> act -> check console).
// Needs Playwright with Chromium (preinstalled in the cloud dev environment). Usage: npm run e2e
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const server = require('../../server/server.cjs');

(async () => {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = 'http://127.0.0.1:' + server.address().port;
    const browser = await chromium.launch();
    const failures = [];
    const check = async (name, run) => {
        const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        // Offline from providers: the app must fall back to saved snapshots.
        await page.route(url => !url.href.startsWith(base), route => route.abort());
        try { await run(page); assert.deepEqual(errors, [], 'page errors'); console.log('ok   ' + name); }
        catch (error) { failures.push(name); console.log('FAIL ' + name + '\n     ' + error.message.split('\n')[0]); }
        finally { await page.close(); }
    };
    const open = async (page, query) => { await page.goto(base + '/' + query); await page.waitForSelector('.score-row'); };
    const date = require('../../sports-core.js').shiftDate(require('../../sports-core.js').kstDate(), -1);

    await check('PWA shortcut ?view=live opens the live filter', async page => {
        await open(page, '?date=' + date + '&view=live').catch(() => page.waitForSelector('.score-empty'));
        assert.equal(await page.evaluate(() => SportonCenter.status), 'live');
        assert.match(page.url(), /status=live/); assert.doesNotMatch(page.url(), /view=/);
    });
    await check('changing league far down the list does not scroll the page', async page => {
        await open(page, '?date=' + date);
        await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
        const before = await page.evaluate(() => scrollY);
        await page.evaluate(() => SportonCenter.selectLeague('kbo'));
        await page.waitForTimeout(400);
        assert.equal(await page.evaluate(() => scrollY) <= before, true);
        assert.ok(await page.evaluate(() => scrollY) > 300, 'page stayed down the list');
    });
    await check('back from match details restores the list position', async page => {
        await open(page, '?date=' + date);
        const row = page.locator('.score-match-button').nth(5);
        await row.scrollIntoViewIfNeeded();
        const y = await page.evaluate(() => scrollY);
        await row.click(); await page.waitForSelector('#gameDetailSection.active');
        await page.click('#gameDetailBack'); await page.waitForSelector('#homeSection.active');
        await page.waitForTimeout(200);
        assert.ok(Math.abs(await page.evaluate(() => scrollY) - y) < 4, 'scroll restored');
    });
    await check('leaving details by the nav leaves no dead history entry', async page => {
        await open(page, '?date=' + date);
        const length = await page.evaluate(() => history.length);
        await page.locator('.score-match-button').first().click(); await page.waitForSelector('#gameDetailSection.active');
        await page.click('.mobile-nav [data-score-nav="live"]'); await page.waitForSelector('#homeSection.active');
        await page.waitForTimeout(300);
        assert.equal(await page.evaluate(() => history.state?.view), 'home');
        assert.match(page.url(), /status=live/);
        assert.doesNotMatch(page.url(), /match=/);
        assert.equal(await page.evaluate(() => history.length), length + 1, 'only the popped detail entry remains forward');
    });
    await check('device back from details returns to the list and forward reopens it', async page => {
        await open(page, '?date=' + date);
        await page.locator('.score-match-button').first().click(); await page.waitForSelector('#gameDetailSection.active');
        await page.goBack(); await page.waitForSelector('#homeSection.active');
        assert.doesNotMatch(page.url(), /match=/);
    });

    await browser.close();
    await new Promise(resolve => server.close(resolve));
    if (failures.length) { console.error(failures.length + ' failed'); process.exit(1); }
})().catch(error => { console.error(error); process.exit(1); });
