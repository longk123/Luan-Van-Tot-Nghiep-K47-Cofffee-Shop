const {Pool}=require('pg');
require('dotenv').config({path:require('path').join(__dirname,'.env')});
const p=new Pool({
  host:process.env.DB_HOST,
  port:process.env.DB_PORT,
  database:process.env.DB_NAME,
  user:process.env.DB_USER,
  password:String(process.env.DB_PASSWORD)
});

async function check() {
  // Kiểm tra trigger
  console.log('🔍 Triggers on don_hang_chi_tiet:');
  const triggers = await p.query(`
    SELECT trigger_name, event_manipulation, action_statement
    FROM information_schema.triggers
    WHERE event_object_table = 'don_hang_chi_tiet'
  `);
  
  if (triggers.rows.length > 0) {
    triggers.rows.forEach(t => {
      console.log(`  - ${t.trigger_name} (${t.event_manipulation})`);
      console.log(`    ${t.action_statement}\n`);
    });
  } else {
    console.log('  ❌ Không có trigger nào!\n');
  }
  
  // Kiểm tra function
  console.log('🔍 Functions liên quan đến giá vốn:');
  const functions = await p.query(`
    SELECT proname, prosrc
    FROM pg_proc
    WHERE proname LIKE '%gia_von%' OR proname LIKE '%cost%'
  `);
  
  if (functions.rows.length > 0) {
    functions.rows.forEach(f => {
      console.log(`\n📌 Function: ${f.proname}`);
      console.log('-'.repeat(70));
      console.log(f.prosrc.substring(0, 500));
      if (f.prosrc.length > 500) console.log('...(truncated)');
    });
  } else {
    console.log('  ❌ Không có function nào!\n');
  }
  
  await p.end();
}

check();
