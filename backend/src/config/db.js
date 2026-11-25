const mysql = require("mysql2/promise");

// Create MySQL connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Check database connection
(async () => {
    try {
        const connection = await pool.getConnection();

        console.log("MySQL Database Connected Successfully!");

        connection.release();
    } catch (error) {
        console.error("MySQL Database Connection Failed!");
        console.error(error);
    }
})();

// Export connection pool
module.exports = pool;
