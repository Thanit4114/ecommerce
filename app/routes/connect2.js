const mysql = require('mysql2');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    passwoord: '',
    database: 'db_ecommerce'
});

module.exports = pool.promise();