/**
 * Script Test - Kiểm tra kết nối với Google Drive
 */

const fs = require('fs').promises;
const path = require('path');

async function testGoogleDrive() {
  try {
    console.log('🔍 Kiểm tra Google Drive...');
    console.log('');

    // Kiểm tra thư mục H:\
    const hDrive = 'H:\\';
    try {
      await fs.access(hDrive);
      console.log('✅ Thư mục H:\\ tồn tại');
    } catch {
      console.error('❌ Thư mục H:\\ không tồn tại');
      return;
    }

    // Tạo thư mục backup
    const backupDir = 'H:\\database-backups';
    try {
      await fs.mkdir(backupDir, { recursive: true });
      console.log('✅ Đã tạo thư mục: H:\\database-backups');
    } catch (error) {
      console.error('❌ Không thể tạo thư mục:', error.message);
      return;
    }

    // Kiểm tra có thể ghi file không
    const testFile = path.join(backupDir, 'test.txt');
    try {
      await fs.writeFile(testFile, 'Test file from backup script');
      console.log('✅ Có thể ghi file vào H:\\database-backups');
      
      // Xóa file test
      await fs.unlink(testFile);
      console.log('✅ Đã xóa file test');
    } catch (error) {
      console.error('❌ Không thể ghi file:', error.message);
      return;
    }

    console.log('');
    console.log('✅ Google Drive sẵn sàng!');
    console.log('💡 Thư mục backup: H:\\database-backups');
    console.log('');
    console.log('🚀 Bạn có thể chạy:');
    console.log('   node backup-to-cloud.cjs --cloud-dir="H:\\database-backups"');
    console.log('   hoặc');
    console.log('   node backup-to-cloud.cjs  (sẽ tự động tìm H:\\backups)');

  } catch (error) {
    console.error('❌ Lỗi:', error.message);
  }
}

testGoogleDrive();

