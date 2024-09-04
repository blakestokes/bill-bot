const puppeteer = require('puppeteer-extra');
const stealth=require("puppeteer-extra-plugin-stealth");
var firebase = require('./firebase.js');

puppeteer.use(stealth());

const RecaptchaPlugin = require('puppeteer-extra-plugin-recaptcha');
puppeteer.use(
  	RecaptchaPlugin({
    	provider: {
      		id: '2captcha',
      		token: process.env.recaptcha_provider_token // REPLACE THIS WITH YOUR OWN 2CAPTCHA API KEY ⚡
    	},
    	visualFeedback: true // colorize reCAPTCHAs (violet = detected, green = solved)
  	})
);

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
		await page.goto('https://www.xpressbillpay.com/');
		await page.waitForSelector('#Id_LoginEmail');
		await page.type('#Id_LoginEmail', process.env.utilities_id);
		await page.waitForSelector('#Id_Password');
		await page.type('#Id_Password', process.env.utilities_pass);

		// console.log("solving recaptcha");
		await page.solveRecaptchas();
		// console.log("SOLVED!");
		page.click('#home > div.xpress-user > div.primary > div > div > div > div.welcome.login > div > div.welcome-action > div > div > form > div:nth-child(4) > div.col-xs-5 > button');

		await page.waitForSelector('#detail > div.content > div.secondary-content > div > div.detail-data > div:nth-child(4) > div.col-xs-7.text-right.text-nowrap > span');
		let dateElement = await page.$('#detail > div.content > div.secondary-content > div > div.detail-data > div:nth-child(4) > div.col-xs-7.text-right.text-nowrap > span');
		var billDate = await page.evaluate(el => el.textContent, dateElement);
		var date = billDate.trim();

		await page.waitForSelector('#due > div.due-amount > div.due-amount-value.ng-scope > span > span > span.dollars.ng-binding');
		let dollarAmountElement = await page.$('#due > div.due-amount > div.due-amount-value.ng-scope > span > span > span.dollars.ng-binding');
		var billDollarAmt = await page.evaluate(el => el.textContent, dollarAmountElement)

		await page.waitForSelector('#due > div.due-amount > div.due-amount-value.ng-scope > span > span > span.cents.ng-binding');
		let centsAmountElement = await page.$('#due > div.due-amount > div.due-amount-value.ng-scope > span > span > span.cents.ng-binding');
		var billCentsAmt = await page.evaluate(el => el.textContent, centsAmountElement)
		var amount = billDollarAmt+billCentsAmt;

		if(parseFloat(amount) == 0) {
			console.log("No new utilities bill.");
			await browser.close();
			process.exit();
		}

		var billType = "Billed Charges";

		var id = "Utilities - " + date;

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
				amount: amount,
				type: 'Utilities',
				note: billType,
				timestamp: firebase.firebase.firestore.FieldValue.serverTimestamp(),
				requestsSent: false,
			}).then(function(docRef) {
				newBills.push({
					"amount": amount,
					"billType": billType
				})
				console.log("Utilities bill added: $" + amount);
			});
		}
		else {
			console.log("No new utilities bill.");
		}

		await browser.close();
		process.exit();
	}
	catch(error) {
		console.error(error);
	}
})();