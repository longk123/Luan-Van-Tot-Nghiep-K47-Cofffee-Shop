/**
 * Phân tích độ phức tạp của database
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'coffee_shop',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD
});

async function analyze() {
  try {
    console.log('📊 PHÂN TÍCH ĐỘ PHỨC TẠP DATABASE\n');
    console.log('='.repeat(80));

    // 1. Đếm số bảng
    const tablesResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
    `);
    const tableCount = parseInt(tablesResult.rows[0].count);

    // 2. Đếm số views
    const viewsResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM information_schema.views
      WHERE table_schema = 'public'
    `);
    const viewCount = parseInt(viewsResult.rows[0].count);

    // 3. Đếm số functions
    const functionsResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_type = 'FUNCTION'
    `);
    const functionCount = parseInt(functionsResult.rows[0].count);

    // 4. Đếm số triggers
    const triggersResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
    `);
    const triggerCount = parseInt(triggersResult.rows[0].count);

    // 5. Đếm số indexes
    const indexesResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM pg_indexes
      WHERE schemaname = 'public'
    `);
    const indexCount = parseInt(indexesResult.rows[0].count);

    // 6. Liệt kê các bảng
    const tablesList = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    // 7. Liệt kê các views
    const viewsList = await pool.query(`
      SELECT table_name as view_name
      FROM information_schema.views
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    // 8. Đếm foreign keys
    const fkResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM information_schema.table_constraints
      WHERE constraint_type = 'FOREIGN KEY'
        AND table_schema = 'public'
    `);
    const fkCount = parseInt(fkResult.rows[0].count);

    console.log('\n📈 TỔNG QUAN:');
    console.log('-'.repeat(80));
    console.log(`📋 Bảng (Tables):        ${tableCount}`);
    console.log(`👁️  Views:                ${viewCount}`);
    console.log(`⚙️  Functions:            ${functionCount}`);
    console.log(`🔔 Triggers:              ${triggerCount}`);
    console.log(`🔍 Indexes:               ${indexCount}`);
    console.log(`🔗 Foreign Keys:          ${fkCount}`);
    console.log(`📊 Tổng số objects:       ${tableCount + viewCount + functionCount + triggerCount}`);

    console.log('\n📋 DANH SÁCH BẢNG:');
    console.log('-'.repeat(80));
    tablesList.rows.forEach((row, index) => {
      console.log(`${(index + 1).toString().padStart(2, ' ')}. ${row.table_name}`);
    });

    console.log('\n👁️  DANH SÁCH VIEWS:');
    console.log('-'.repeat(80));
    if (viewsList.rows.length > 0) {
      viewsList.rows.forEach((row, index) => {
        console.log(`${(index + 1).toString().padStart(2, ' ')}. ${row.view_name}`);
      });
    } else {
      console.log('  (Không có views)');
    }

    // Phân loại bảng theo mục đích
    console.log('\n📊 PHÂN LOẠI BẢNG THEO MỤC ĐÍCH:');
    console.log('-'.repeat(80));
    
    const coreTables = tablesList.rows.filter(t => 
      ['users', 'roles', 'user_roles', 'ban', 'khu_vuc', 'don_hang', 'don_hang_chi_tiet'].includes(t.table_name)
    );
    const menuTables = tablesList.rows.filter(t => 
      t.table_name.includes('mon') || t.table_name.includes('loai') || t.table_name.includes('tuy_chon')
    );
    const inventoryTables = tablesList.rows.filter(t => 
      t.table_name.includes('nguyen_lieu') || t.table_name.includes('kho') || t.table_name.includes('batch')
    );
    const paymentTables = tablesList.rows.filter(t => 
      t.table_name.includes('payment') || t.table_name.includes('hoa_don')
    );
    const reservationTables = tablesList.rows.filter(t => 
      t.table_name.includes('dat_ban') || t.table_name.includes('khach_hang')
    );
    const shiftTables = tablesList.rows.filter(t => 
      t.table_name.includes('ca_lam')
    );
    const customerTables = tablesList.rows.filter(t => 
      t.table_name.includes('customer')
    );
    const systemTables = tablesList.rows.filter(t => 
      t.table_name.includes('system') || t.table_name.includes('notification')
    );
    const otherTables = tablesList.rows.filter(t => 
      !coreTables.includes(t) && !menuTables.includes(t) && 
      !inventoryTables.includes(t) && !paymentTables.includes(t) &&
      !reservationTables.includes(t) && !shiftTables.includes(t) &&
      !customerTables.includes(t) && !systemTables.includes(t)
    );

    console.log(`🔐 Core (Users, Roles, Orders):     ${coreTables.length} bảng`);
    console.log(`🍽️  Menu Management:               ${menuTables.length} bảng`);
    console.log(`📦 Inventory:                       ${inventoryTables.length} bảng`);
    console.log(`💳 Payment & Invoice:              ${paymentTables.length} bảng`);
    console.log(`📅 Reservations:                   ${reservationTables.length} bảng`);
    console.log(`⏰ Shift Management:               ${shiftTables.length} bảng`);
    console.log(`👤 Customer Portal:                ${customerTables.length} bảng`);
    console.log(`⚙️  System (Settings, Logs, Notif): ${systemTables.length} bảng`);
    console.log(`📋 Others:                         ${otherTables.length} bảng`);

    // Đánh giá
    console.log('\n🎯 ĐÁNH GIÁ:');
    console.log('-'.repeat(80));
    
    const totalObjects = tableCount + viewCount + functionCount + triggerCount;
    
    if (tableCount <= 15) {
      console.log('✅ Số lượng bảng: VỪA PHẢI cho luận văn');
    } else if (tableCount <= 25) {
      console.log('⚠️  Số lượng bảng: HƠI NHIỀU nhưng vẫn CHẤP NHẬN ĐƯỢC');
    } else {
      console.log('🔴 Số lượng bảng: QUÁ NHIỀU cho luận văn');
    }

    if (viewCount <= 10) {
      console.log('✅ Số lượng views: VỪA PHẢI');
    } else if (viewCount <= 20) {
      console.log('⚠️  Số lượng views: HƠI NHIỀU');
    } else {
      console.log('🔴 Số lượng views: QUÁ NHIỀU');
    }

    if (functionCount <= 10) {
      console.log('✅ Số lượng functions: VỪA PHẢI');
    } else if (functionCount <= 20) {
      console.log('⚠️  Số lượng functions: HƠI NHIỀU');
    } else {
      console.log('🔴 Số lượng functions: QUÁ NHIỀU');
    }

    console.log('\n💡 KẾT LUẬN:');
    console.log('-'.repeat(80));
    
    if (tableCount <= 20 && viewCount <= 15 && functionCount <= 15) {
      console.log('✅ Database của bạn VỪA PHẢI cho luận văn.');
      console.log('   - Đủ phức tạp để thể hiện kỹ năng');
      console.log('   - Không quá nhiều để bị đánh giá là "quá lớn"');
      console.log('   - Có thể giải thích rõ ràng trong báo cáo');
    } else if (tableCount <= 30 && viewCount <= 25 && functionCount <= 25) {
      console.log('⚠️  Database của bạn HƠI NHIỀU nhưng vẫn CHẤP NHẬN ĐƯỢC.');
      console.log('   - Nên tập trung vào các tính năng CORE trong báo cáo');
      console.log('   - Có thể nhóm các bảng phụ thành "Extended Features"');
      console.log('   - Nhấn mạnh tính thực tế và đầy đủ của hệ thống');
    } else {
      console.log('🔴 Database của bạn QUÁ NHIỀU cho luận văn.');
      console.log('   - Nên tách một số module thành "Future Work"');
      console.log('   - Tập trung báo cáo vào 15-20 bảng CORE');
      console.log('   - Các tính năng mở rộng có thể đề cập ngắn gọn');
    }

    console.log('\n📝 GỢI Ý CHO BÁO CÁO:');
    console.log('-'.repeat(80));
    console.log('1. Nhóm các bảng theo module (Core, Menu, Inventory, Payment, etc.)');
    console.log('2. Vẽ ERD cho các module chính (Core + Menu + Orders)');
    console.log('3. Giải thích rõ business logic trong các triggers/functions');
    console.log('4. Nhấn mạnh tính thực tế: "Hệ thống đầy đủ như một POS thực tế"');
    console.log('5. Nếu quá nhiều, có thể tách Customer Portal thành "Future Enhancement"');

  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    await pool.end();
  }
}

analyze();

