const Sequelize = require('sequelize');
// initiate tunnel
const tunnel = require('tunnel-ssh');
require('dotenv').config();

const sequelize = new Sequelize(process.env.db_database, process.env.db_id, process.env.db_pass, {
    host: process.env.db_host,
    dialect: 'mysql',
    port: process.env.db_port,
    pool: {
        max: 5,
        min: 0,
        idle: 10000
    },
});

// tunnel config
  
var config = {
    username:process.env.ssh_user,
    password:process.env.ssh_password,
    host:process.env.ssh_host,
    port:process.env.ssh_port,
    dstHost:'localhost',
    dstPort:3306
};

tunnel(config, function (error, server) {
if(error) {  
    console.error(error);
} else {
    // test sequelize connection  
    sequelize.authenticate().then(function(err) {
        console.log('connection established');
    }).catch(function(err) {
        console.error('unable establish connection', err);
    })
} 
}) 

var Bills = sequelize.define('bill', {
    amount: {
        field: 'amount',
        type: Sequelize.DECIMAL,
        primaryKey: true,
    },
    date: {
        field: 'date',
        type: Sequelize.DATE,
        primaryKey: true
    },
    description: {
        field: 'description',
        type: Sequelize.STRING,
        primaryKey: true
    },
    requested: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
    },
    recdate: {
        type: 'TIMESTAMP',
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    },
    type: {
        field: 'type',
        type: Sequelize.STRING
    },
}, {
    tableName: "bills",
    timestamps: false
});

var Roomates = sequelize.define('roommate', {
    firstName: {
        field: 'first_name',
        type: Sequelize.STRING,
        primaryKey: true
    },
    lastName: {
        field: 'last_name',
        type: Sequelize.STRING,
        primaryKey: true
    },
    email: {
        field: 'email',
        type: Sequelize.STRING
    },
    phone: {
        field: 'phone',
        type: Sequelize.STRING
    },
    venmo: {
        field: 'venmo',
        type: Sequelize.STRING
    },
}, {
    tableName: "roommates",
    timestamps: false
});

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.bills = Bills;
db.roommates = Roomates;

module.exports = db;