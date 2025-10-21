import pkg from 'pg';
const { Pool } = pkg;

// Debug environment variables
console.log('DB Config:', {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD ? '***' : 'undefined',
  database: process.env.DB_NAME
});

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'coffee_shop',
});

export { pool };
