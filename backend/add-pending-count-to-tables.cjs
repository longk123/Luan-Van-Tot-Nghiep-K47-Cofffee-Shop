// Thêm pending_count vào query tables
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'coffee_shop',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function update() {
  try {
    console.log('🚀 Updating tables query to include pending_count...\n');
    
    // Không cần tạo view riêng, chỉ cần thêm COUNT PENDING vào CTE summary
    // Code sẽ được sửa trực tiếp trong posRepository.js
    
    console.log('✅ Ready to update posRepository.js');
    console.log('📝 Add this line to summary CTE:');
    console.log(`   COUNT(*) FILTER (WHERE items.trang_thai_che_bien='PENDING') AS pending_count,`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

update();

