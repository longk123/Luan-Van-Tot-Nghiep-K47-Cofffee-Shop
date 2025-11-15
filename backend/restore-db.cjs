/**
 * Script Restore Database PostgreSQL
 * 
 * Sử dụng pg_restore hoặc psql để restore database từ backup
 * 
 * Cách sử dụng:
 *   node restore-db.cjs --input=backup.sql
 *   node restore-db.cjs --input=backup.backup --format=custom
 *   node restore-db.cjs --input=backup.sql --drop-existing
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');
const execAsync = promisify(exec);

// Load environment variables
require('dotenv').config();

// Database configuration từ .env
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 5432;
const DB_NAME = process.env.DB_NAME || 'coffee_shop';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || '123456';

// Parse command line arguments
const args = process.argv.slice(2);
const inputArg = args.find(arg => arg.startsWith('--input='));
const formatArg = args.find(arg => arg.startsWith('--format='));
const dropArg = args.includes('--drop-existing');
const createArg = args.includes('--create-db');

const inputFile = inputArg ? inputArg.split('=')[1] : null;

if (!inputFile) {
  console.error('❌ Lỗi: Cần chỉ định file backup với --input=path/to/backup');
  console.error('');
  console.error('Cách sử dụng:');
  console.error('  node restore-db.cjs --input=backup.sql');
  console.error('  node restore-db.cjs --input=backup.backup --format=custom');
  console.error('  node restore-db.cjs --input=backup.sql --drop-existing');
  process.exit(1);
}

// Xác định format từ extension
function detectFormat(filePath) {
  if (filePath.endsWith('.backup')) return 'custom';
  if (filePath.endsWith('.tar')) return 'tar';
  if (filePath.endsWith('.dir')) return 'directory';
  if (filePath.endsWith('.sql')) return 'plain';
  return formatArg ? formatArg.split('=')[1] : 'plain';
}

const format = detectFormat(inputFile);

// Tạo readline interface để hỏi xác nhận
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function restoreDatabase() {
  try {
    // Kiểm tra file tồn tại
    let inputPath = path.isAbsolute(inputFile) 
      ? inputFile 
      : path.join(__dirname, inputFile);

    try {
      await fs.access(inputPath);
    } catch {
      // Thử tìm trong thư mục backups
      const backupPath = path.join(__dirname, 'backups', path.basename(inputFile));
      try {
        await fs.access(backupPath);
        inputPath = backupPath;
      } catch {
        throw new Error(`File backup không tồn tại: ${inputFile}`);
      }
    }

    const stats = await fs.stat(inputPath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log('🔄 Chuẩn bị restore database...');
    console.log(`📊 Database: ${DB_NAME}`);
    console.log(`🖥️  Host: ${DB_HOST}:${DB_PORT}`);
    console.log(`👤 User: ${DB_USER}`);
    console.log(`📁 File backup: ${inputPath}`);
    console.log(`📊 Kích thước: ${fileSizeMB} MB`);
    console.log(`📦 Format: ${format}`);
    console.log('');

    // Cảnh báo
    console.log('⚠️  CẢNH BÁO: Restore sẽ GHI ĐÈ toàn bộ dữ liệu hiện tại!');
    console.log('');

    // Hỏi xác nhận
    const answer = await question('Bạn có chắc chắn muốn restore? (yes/no): ');
    if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
      console.log('❌ Đã hủy restore.');
      rl.close();
      return;
    }

    // Drop database nếu được yêu cầu
    if (dropArg) {
      console.log('🗑️  Đang xóa database cũ...');
      const dropCommand = `psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};"`;
      const env = { ...process.env, PGPASSWORD: DB_PASSWORD };
      try {
        const { stderr } = await execAsync(dropCommand, { env });
        if (stderr && !stderr.includes('Password:') && !stderr.toLowerCase().includes('notice')) {
          console.warn('⚠️  Warning:', stderr);
        }
        console.log('✅ Đã xóa database cũ.');
      } catch (error) {
        // Kiểm tra xem có phải lỗi "database does not exist" không
        if (error.message.includes('does not exist') || error.stderr?.includes('does not exist')) {
          console.log('ℹ️  Database không tồn tại, bỏ qua bước xóa.');
        } else {
          console.warn('⚠️  Không thể xóa database:', error.message);
        }
      }
    }

    // Tạo database mới nếu được yêu cầu
    if (createArg || dropArg) {
      console.log('📝 Đang tạo database mới...');
      const createCommand = `psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d postgres -c "CREATE DATABASE ${DB_NAME};"`;
      const env = { ...process.env, PGPASSWORD: DB_PASSWORD };
      try {
        const { stderr } = await execAsync(createCommand, { env });
        if (stderr && !stderr.includes('Password:') && !stderr.toLowerCase().includes('notice')) {
          console.warn('⚠️  Warning:', stderr);
        }
        console.log('✅ Đã tạo database mới.');
      } catch (error) {
        if (error.message.includes('already exists') || error.stderr?.includes('already exists')) {
          console.log('ℹ️  Database đã tồn tại, tiếp tục restore...');
        } else {
          throw error;
        }
      }
    }

    console.log('');
    console.log('⏳ Đang restore...');

    // Xây dựng lệnh restore
    let command;
    const env = { ...process.env, PGPASSWORD: DB_PASSWORD };

    // Escape đường dẫn để xử lý khoảng trắng và ký tự đặc biệt
    const escapePath = (p) => `"${p.replace(/"/g, '\\"')}"`;
    
    if (format === 'custom' || format === 'tar' || format === 'directory') {
      // Sử dụng pg_restore cho format binary
      const formatFlag = format === 'custom' ? '-F c' : format === 'tar' ? '-F t' : '-F d';
      command = `pg_restore -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} ${formatFlag} ${escapePath(inputPath)} --verbose --no-owner --no-acl`;
    } else {
      // Sử dụng psql cho format plain SQL
      command = `psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -f ${escapePath(inputPath)}`;
    }

    let stdout, stderr;
    try {
      const result = await execAsync(command, { env });
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (error) {
      // pg_restore/psql có thể trả về lỗi trong stderr nhưng vẫn thành công một phần
      stdout = error.stdout || '';
      stderr = error.stderr || error.message || '';
      
      // Kiểm tra xem có phải lỗi nghiêm trọng không
      const lowerStderr = stderr.toLowerCase();
      if (lowerStderr.includes('fatal') || lowerStderr.includes('error:') || lowerStderr.includes('could not')) {
        throw new Error(`Restore failed: ${stderr || error.message}`);
      }
      // Nếu không phải lỗi nghiêm trọng, tiếp tục và hiển thị warning
    }

    if (stdout) {
      console.log(stdout);
    }

    if (stderr && !stderr.includes('Password:')) {
      // Một số warning có thể bỏ qua
      const ignoreWarnings = [
        'WARNING:',
        'NOTICE:',
        'already exists',
        'does not exist'
      ];
      
      const lines = stderr.split('\n');
      const importantErrors = lines.filter(line => 
        line && !ignoreWarnings.some(w => line.toLowerCase().includes(w.toLowerCase()))
      );

      if (importantErrors.length > 0) {
        console.warn('⚠️  Warnings:', stderr);
      }
    }

    console.log('');
    console.log('✅ Restore thành công!');
    console.log('');
    console.log('💡 Kiểm tra database:');
    console.log(`   psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME}`);

  } catch (error) {
    console.error('');
    console.error('❌ Lỗi khi restore database:');
    console.error(error.message);
    
    if (error.message.includes('pg_restore') || error.message.includes('psql')) {
      console.error('');
      console.error('💡 Kiểm tra:');
      console.error('   1. PostgreSQL đã được cài đặt và pg_restore/psql có trong PATH');
      console.error('   2. Thông tin kết nối database trong .env đúng');
      console.error('   3. User có quyền truy cập database');
      console.error('   4. File backup không bị hỏng');
    }
    
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Chạy restore
restoreDatabase();

