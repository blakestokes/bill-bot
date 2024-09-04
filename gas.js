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
		await page.goto('https://www.dominionenergy.com/');
		await page.waitForSelector('#header-top__cta > div > ul > li:nth-child(2) > a');
		await page.click('#header-top__cta > div > ul > li:nth-child(2) > a');
		await page.waitForSelector('#desktop-location-selector > div > div.state-content > div > a:nth-child(6) > div.img-container > img');
		await page.waitForTimeout(2000);
		await page.click('#desktop-location-selector > div > div.state-content > div > a:nth-child(6) > div.img-container > img');
		await page.waitForSelector('body > div > table:nth-child(3) > tbody > tr > td:nth-child(2) > table > tbody > tr > td > form > table > tbody > tr:nth-child(10) > td > table > tbody > tr:nth-child(2) > td:nth-child(2) > input');
		await page.waitForTimeout(2000);
		await page.type('body > div > table:nth-child(3) > tbody > tr > td:nth-child(2) > table > tbody > tr > td > form > table > tbody > tr:nth-child(10) > td > table > tbody > tr:nth-child(2) > td:nth-child(2) > input', process.env.gas_id);
		await page.type('#Password', process.env.gas_pass);
		await page.click('#submit');

        var newBills = [];

        var amountSelector = 'body > div > table:nth-child(4) > tbody > tr > td:nth-child(2) > table > tbody > tr > td > table:nth-child(3) > tbody > tr:nth-child(3) > td:nth-child(1) > table > tbody > tr:nth-child(2) > td > font > strong';
        await page.waitForSelector(amountSelector);
        element = await page.$(amountSelector);
        var amount = await page.evaluate(el => el.textContent, element);
        amount = amount.substring(1, amount.length);

        if(parseFloat(amount) > 0) {
            var dateSelector = 'body > div > table:nth-child(4) > tbody > tr > td:nth-child(2) > table > tbody > tr > td > table:nth-child(3) > tbody > tr:nth-child(3) > td:nth-child(1) > table > tbody > tr:nth-child(1) > td > font';
            await page.waitForSelector(dateSelector);
            let dateElement = await page.$(dateSelector);
            var date = await page.evaluate(el => el.textContent, dateElement);
            date = date.split(':')[1];
            date = date.trim();

            var billType = "Billed Charges";

            var id = "Gas - " + date;

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
                    type: 'Gas',
                    note: billType,
                    timestamp: firebase.firebase.firestore.FieldValue.serverTimestamp(),
                    requestsSent: false,
                }).then(function(docRef) {
                    newBills.push({
                        "amount": amount,
                        "billType": billType
                    })
                    console.log("Gas bill added: $" + amount);
                });
            }
        }

        if(newBills.length > 0) {
            for (var i = 0; i < newBills.length; i++) {
                console.log(`New Gas Bill: ${newBills[i].billType} - $${newBills[i].amount}`);
            }
        }
        else {
            console.log("No new gas bill.");
        }

		await browser.close();
		process.exit();
	}
	catch(error) {
		console.error(error);
	}
})();