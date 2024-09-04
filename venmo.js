import puppeteer from 'puppeteer-extra';
import userAgent from 'user-agents';
import stealth from 'puppeteer-extra-plugin-stealth';

puppeteer.use(stealth());

/*
	Obsolete implementation of the Venmo bot circa 2019.
*/

export async function request(req) {
	const amount = req.amount;
	const users = req.users;
	const note = req.note;
	console.log("amount = " + amount);
	const attempts = 4;
	var attemptCount = 0;
	while(attemptCount < attempts) {
		try {
			const browser = await puppeteer.launch({
				headless: false,
				slowMo: 10,
				defaultViewport: {
						width: 1920,
						height: 1080
				},
				args: [`--window-size=${1920},${1080}`],
			});
			const [page] = await browser.pages();
			await page.setViewport({ width: 1920, height: 1080 })
			var randomUserAgent = new userAgent({ deviceCategory: 'desktop' });
			await page.setUserAgent(randomUserAgent.toString());
			await page.goto('https://venmo.com');
			await page.waitForSelector('#gatsby-focus-wrapper > div > div > div > nav > div > div > div > div > div.organisms-navbar-desktopWrapper > div.organisms-navbar-secondContainer > a');
			await page.click('#gatsby-focus-wrapper > div > div > div > nav > div > div > div > div > div.organisms-navbar-desktopWrapper > div.organisms-navbar-secondContainer > a');
			await page.waitForSelector('#content > div > div > form > fieldset > label > input');
			await page.waitForTimeout(2000);

			console.log("Entering Account Info");
			await page.type('#content > div > div > form > fieldset > label > input', process.env.venmo_id);
			await page.waitForSelector('#content > div > div > form > fieldset > div > label > input');
			await page.type('#content > div > div > form > fieldset > div > label > input', process.env.venmo_pass);
			await page.click('#content > div > div > form > div > button > span.ladda-label');
			await page.waitForNavigation({waitUntil: 'networkidle0'});

			console.log("Working on next step.");
			const [checkingSpan] = await page.$x('//span[contains(., "Confirm another way")]');
			if (checkingSpan) {
				await checkingSpan.click();
			}
			else {
				await browser.close();
				throw('attempt failed');
			}
			await page.waitForNavigation({waitUntil: 'networkidle0'});
			await page.waitForSelector('#confirm-input');
			await page.type('#confirm-input', process.env.wells_fargo_acc);

			const [confirmSpan] = await page.$x('//span[contains(., "Confirm it")]');
			if (confirmSpan) {
				await page.waitForTimeout(1000);
				await confirmSpan.click();
			}
			else {
				await browser.close();
				throw('attempt failed');
			}

			await page.waitForNavigation({waitUntil: 'networkidle0'});
			const [notNowSpan] = await page.$x('//span[contains(., "Not now")]');
			if (notNowSpan) {
				await notNowSpan.click();
			}
			else {
				await browser.close();
				throw('attempt failed');
			}

			await page.waitForNavigation({waitUntil: 'networkidle0'});
			await page.waitForTimeout(1000);

			await page.goto("https://account.venmo.com/pay", {
				waitUntil: 'networkidle0',
			});

			await page.evaluate((amount) => {
				let elements = document.getElementsByTagName('input');
				for (i = 0; i < elements.length; i++) {
					if(elements[i].ariaLabel === "Amount" && elements[i].value === "0") {
						elements[i].value = String(parseFloat(amount).toFixed(2));
						elements[i].id = "amount-input";
						console.log("amount id  set");
					}
				}
			}, amount);

			await page.waitForSelector('#amount-input'); 
			await page.type('#amount-input', String(parseFloat(amount).toFixed(2)));

			await page.waitForSelector('#search-input');
			await page.click('#search-input');

			for(var i = 0; i < users.length; i++) {
				await page.keyboard.type(users[i]);
				await page.waitForTimeout(5000);
				await page.keyboard.press('ArrowDown');
				await page.keyboard.press('Enter');
			}
			await page.waitForTimeout(1000);

			var noteArr;
			if(Array.isArray(note)) {
				noteArr = note;
			}
			else {
				noteArr = note.split("\n");
			}
			if(noteArr.length > 1) {
				for (const [i, line] of noteArr.entries()) {
					await page.type('#payment-note', line);
					if(i < noteArr.length - 1) {
						await page.keyboard.down('Shift');
						await page.keyboard.press('Enter');
						await page.keyboard.up('Shift');
					}
				}
			}
			else {
				var text = noteArr[0];
				await page.type('#payment-note', text);
			}

			// Send request
			const [requestSpan] = await page.$x('//span[contains(., "Request")]');
			if (requestSpan) {
				await requestSpan.click();
			}
			else {
				await browser.close();
				throw('attempt failed');
			}

			const [finalRequestSpan] = await page.$x('//span[contains(., "Request $")]');
			if (finalRequestSpan) {
				await finalRequestSpan.click();
			}
			else {
				await browser.close();
				throw('attempt failed');
			}

			await page.waitForTimeout(8000);

			await browser.close();
			return true;
		}
		catch(error) {
			console.log(error);
			attemptCount++;
		}
	}
}

export default {request};