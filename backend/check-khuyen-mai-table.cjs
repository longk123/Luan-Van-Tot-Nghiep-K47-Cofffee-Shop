// Check khuyen_mai table structure
const { pool } = require('./src/db.js');

async function checkTable() {
  try {
    const { rows } = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'khuyen_mai' 
      ORDER BY ordinal_position
    `);
    console.log('✅ khuyen_mai table structure:');
    console.log(JSON.stringify(rows, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTable();
