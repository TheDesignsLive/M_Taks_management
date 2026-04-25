import mysql from 'mysql2';

// Hostinger par ye saari values tum Environment Variables (env) se set kar dena
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "task_management",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Connection check logic
pool.getConnection((err, conn) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
  } else {
    console.log("✅ MySQL Connected Successfully");
    conn.release();
  }
});

// Promise wrapper taaki async/await use kar sako
export default pool.promise();