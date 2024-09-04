const venmo = require('./venmo.js');
const db = require('./db.js');
const Roommates = db.roommates;
const Bills = db.bills;

var noteLines = [];
var venmoNamesToRequest = [];

(async () => {
	var roomateCount = 1; // Including me
	const roommates = await Roommates.findAll();
	for(var i = 0; i < roommates.length; i++) {
		roomateCount++;
		venmoNamesToRequest.push(roommates[i].venmo);
	}
	
	const bills = await Bills.findAll({
		where: {
			requested: 0
		}
	});

	var totalEach = 0;
	var charCount = 0;
	var venmoCharLimit = 250;
	var venmoCharLimitReached = false;

	for(var i = 0; i < bills.length; i++) {
		var bill = bills[i];
		var dateObj = new Date(bill.date);
		var month = dateObj.getUTCMonth() + 1;
		var day = dateObj.getUTCDate();
		var year = dateObj.getUTCFullYear();

		var formatatedAmount = parseFloat(Math.abs(bill.amount)/roomateCount).toFixed(2);

		var displayDate = month + "/" + day + "/" + year;
		var textLine = `$${formatatedAmount} - ` + capitalize(bill.type) + ` - ${displayDate}`;
		charCount += textLine.length;

		if(!venmoCharLimitReached && charCount <= (venmoCharLimit - 3)) {
			noteLines.push(textLine);
		}
		else {
			venmoCharLimitReached = true;
		}

		totalEach += parseFloat(formatatedAmount);
	}

	if(venmoCharLimitReached) {
		noteLines.push("...");
	}

	console.log(noteLines.join("\r\n"));

	// Meant to make use of the Venmo bot to generate requests
	var requestsSent = await venmo.request(String(totalEach), venmoNamesToRequest, noteLines);

	if(requestsSent) {
		console.log(`Venmo requests sent for ${bills.length} bills`);
		for(var i = 0; i < bills.length; i++) {
			var bill = bills[i];
			bill.requested = 1;
			await bill.save();
		}
	}
	else {
		console.log("No Venmo requests sent.")
	}

	process.exit();
})();

const capitalize = (s) => {
	if (typeof s !== 'string') return ''
	return s.charAt(0).toUpperCase() + s.slice(1)
}