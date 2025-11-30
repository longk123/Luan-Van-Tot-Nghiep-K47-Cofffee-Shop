// check-admin-user.mjs
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost', database: 'coffee_shop', user: 'postgres', password: '123456', port: 5432
});

async function main() {
  // Check admin user
  const { rows: users } = await pool.query(`
    SELECT u.user_id, u.username, u.password_hash, u.is_active,
           array_agg(r.role_name) as roles
    FROM users u
    LEFT JOIN user_roles ur ON ur.user_id = u.user_id
    LEFT JOIN roles r ON r.role_id = ur.role_id
    WHERE u.username = 'admin'
    GROUP BY u.user_id
  `);
  
  console.log('Admin user:', users.length > 0 ? users[0] : 'NOT FOUND');
  
  // List all users with admin role
  const { rows: admins } = await pool.query(`
    SELECT u.user_id, u.username, u.full_name, u.is_active
    FROM users u
    JOIN user_roles ur ON ur.user_id = u.user_id
    JOIN roles r ON r.role_id = ur.role_id
    WHERE r.role_name = 'admin'
  `);
  
  console.log('\nUsers with admin role:', admins);
  
  // Show roles table
  const { rows: roles } = await pool.query('SELECT * FROM roles');
  console.log('\nAll roles:', roles);

  await pool.end();
}

main();
