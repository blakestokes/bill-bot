const wellsFargo = require('./wells-fargo.js');
const db = require('../db.js');
const Bill = db.bills;

(async() => {
    var transactions = await wellsFargo.getTransactionHistory();

    var gasTransactions = [];
    var internetTransactions = [];
    var utilitiesTransactions = [];

    transactions.forEach(transaction => {
        if(transaction.description.toUpperCase().includes("QUESTARGAS")) {
            transaction.amount = Math.abs(transaction.amount); // Comes in as a negative value, change to positive
            transaction.type = "gas";
            gasTransactions.push(transaction);
        }

        if(transaction.description.toUpperCase().includes("COMCAST")) {
            transaction.amount = Math.abs(transaction.amount); // Comes in as a negative value, change to positive
            transaction.type = "internet";
            internetTransactions.push(transaction);
        }

        if(transaction.description.toUpperCase().includes("LEHI CITY DEBITS")) {
            transaction.amount = Math.abs(transaction.amount); // Comes in as a negative value, change to positive
            transaction.type = "utilities";
            utilitiesTransactions.push(transaction);
        }
    });

    gasTransactions.forEach(async transaction => {
        console.log(transaction.date);
        Bill.count({
            where: {
                amount: transaction.amount,
                [db.Sequelize.Op.and]: db.sequelize.where(db.sequelize.fn('date', db.sequelize.col('date')), '=', strDateToSqlDateFormat(transaction.date))
            },
        })
        .then(async result => {
            if(result == 0) {
                await Bill.create(transaction);
            }
        })
    })

    internetTransactions.forEach(async transaction => {
        Bill.count({
            where: {
                amount: transaction.amount,
                [db.Sequelize.Op.and]: db.sequelize.where(db.sequelize.fn('date', db.sequelize.col('date')), '=', strDateToSqlDateFormat(transaction.date))
            }
        })
        .then(async result => {
            if(result == 0) {
                await Bill.create(transaction);
            }
        })
    })

    utilitiesTransactions.forEach(async transaction => {
        Bill.count({
            where: {
                amount: transaction.amount,
                [db.Sequelize.Op.and]: db.sequelize.where(db.sequelize.fn('date', db.sequelize.col('date')), '=', strDateToSqlDateFormat(transaction.date))
            }
        })
        .then(async result => {
            if(result == 0) {
                await Bill.create(transaction);
            }
        })
    })
})();

function strDateToSqlDateFormat(date) {
    var [month, day, year] = date.split('/');
    return `${year}-${month}-${day}`;
}