const puppeteer = require('puppeteer-extra');
const stealth=require("puppeteer-extra-plugin-stealth");
puppeteer.use(stealth());

var firebase = require('./firebase.js');

var db = firebase.db();

(async () => {
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
		await page.setViewport({ width: 1920, height: 1080 });
		await page.setUserAgent(
			"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4182.0 Safari/537.36"
		  );
		await page.goto('https://my.xfinity.com/?cid=cust');
		await page.waitForSelector('body > xc-header > div.xc-header--container > div.xc-header--signin-container.xc-unrecognized > a');
		await page.click('body > xc-header > div.xc-header--container > div.xc-header--signin-container.xc-unrecognized > a');
		await page.waitForSelector('#user');
		await page.type('#user', process.env.internet_id);
        await page.evaluate(async () => {
            let el = document.querySelector("#sign_in");
            if(el.innerText !== undefined) {
                await page.click('#sign_in');
            }
        })
		await page.waitForSelector('#passwd');
		await page.type('#passwd', process.env.internet_pass);
		await page.click('#sign_in');

		await page.waitForNavigation({waitUntil: 'networkidle0'});
		await page.goto('https://customer.xfinity.com/#/billing');

		await page.waitForSelector('#page-view > section.page-section.ui-grey > div > div > div.hero-flex-wrap.hero-flex-wrap--at-850 > div.hero-flex-wrap__main.overview-section.overview-section--bill > div > div.card-group.mb12 > div:nth-child(1) > div > div > table > tbody > tr:nth-child(1) > td.ledger-table__name.body2');
		let dateElement = await page.$('#page-view > section.page-section.ui-grey > div > div > div.hero-flex-wrap.hero-flex-wrap--at-850 > div.hero-flex-wrap__main.overview-section.overview-section--bill > div > div.card-group.mb12 > div:nth-child(1) > div > div > table > tbody > tr:nth-child(1) > td.ledger-table__name.body2');
		var date = await page.evaluate(el => el.textContent, dateElement)
		date = date.slice(date.indexOf('due ')+4, date.length-1).trim();

		await page.waitForSelector('#page-view > section.page-section.ui-grey > div > div > div.hero-flex-wrap.hero-flex-wrap--at-850 > div.hero-flex-wrap__main.overview-section.overview-section--bill > div > div.card-group.mb12 > div:nth-child(1) > div > div > table > tbody > tr:nth-child(1) > td.ledger-table__value.body2');
		let amountElement = await page.$('#page-view > section.page-section.ui-grey > div > div > div.hero-flex-wrap.hero-flex-wrap--at-850 > div.hero-flex-wrap__main.overview-section.overview-section--bill > div > div.card-group.mb12 > div:nth-child(1) > div > div > table > tbody > tr:nth-child(1) > td.ledger-table__value.body2');
		var billAmt = await page.evaluate(el => el.textContent, amountElement)
		billAmt = billAmt.slice(billAmt.indexOf('$')+1, billAmt.length-1).trim();

		if(parseFloat(billAmt) == 0) {
			console.log("No new internet bill.");
			await browser.close();
			process.exit();
		}

		var id = "Internet - " + date;

		var billFound = false;

		var docRef = db.collection("bills").doc(id);
		await docRef.get().then((doc) => {
			if (doc.exists) {
				billFound = true;
			}
		}).catch((error) => {
			console.log("Error getting document:", error);
		});

		docRef = db.collection("billHistory").doc(id);
		await docRef.get().then((doc) => {
			if (doc.exists) {
				billFound = true;
			}
		}).catch((error) => {
			console.log("Error getting document:", error);
		});

		if(!billFound) {
			await db.collection('bills').doc(id).set({
				dateBilled: firebase.firebase.firestore.Timestamp.fromDate(new Date(date)),
				amount: billAmt,
				type: 'Internet',
				note: billType,
				timestamp: firebase.firebase.firestore.FieldValue.serverTimestamp(),
				requestsSent: false,
			}).then(function(docRef) {
				console.log("Internet bill added: $" + billAmt);
			});
		}
		else {
			console.log("No new internet bill.");
		}

		await browser.close();
		process.exit();
	}
	catch(error) {
		console.error(error);
	}
})();