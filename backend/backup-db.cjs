/**
 * Script Backup Database PostgreSQL
 * 
 * Sử dụng pg_dump để backup toàn bộ database
 * 
 * Cách sử dụng:
 *   node backup-db.cjs
 *   node backup-db.cjs --output=backup-2024-11-04.sql
 *   node backup-db.cjs --format=custom
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
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
const outputArg = args.find(arg => arg.startsWith('--output='));
const formatArg = args.find(arg => arg.startsWith('--format='));

const outputFile = outputArg 
  ? outputArg.split('=')[1] 
  : `backup-${DB_NAME}-${new Date().toISOString().split('T')[0]}-${Date.now()}.sql`;

const format = formatArg 
  ? formatArg.split('=')[1] 
  : 'plain'; // plain, custom, tar, directory

async function backupDatabase() {
  try {
    console.log('🔄 Bắt đầu backup database...');
    console.log(`📊 Database: ${DB_NAME}`);
    console.log(`🖥️  Host: ${DB_HOST}:${DB_PORT}`);
    console.log(`👤 User: ${DB_USER}`);
    console.log(`📁 Output: ${outputFile}`);
    console.log(`📦 Format: ${format}`);
    console.log('');

    // Tạo thư mục backup nếu chưa có
    const backupDir = path.join(__dirname, 'backups');
    await fs.mkdir(backupDir, { recursive: true });
    
    const outputPath = path.isAbsolute(outputFile) 
      ? outputFile 
      : path.join(backupDir, outputFile);

    // Xây dựng lệnh pg_dump
    // Escape đường dẫn để xử lý khoảng trắng và ký tự đặc biệt
    const escapePath = (p) => `"${p.replace(/"/g, '\\"')}"`;
    
    let command;
    let finalPath = outputPath;
    
    if (format === 'custom') {
      // Format custom (binary, nén tốt hơn, restore nhanh hơn)
      finalPath = `${outputPath}.backup`;
      command = `pg_dump -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -F c -f ${escapePath(finalPath)}`;
    } else if (format === 'tar') {
      // Format tar
      finalPath = `${outputPath}.tar`;
      command = `pg_dump -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -F t -f ${escapePath(finalPath)}`;
    } else if (format === 'directory') {
      // Format directory
      finalPath = `${outputPath}.dir`;
      await fs.mkdir(finalPath, { recursive: true });
      command = `pg_dump -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -F d -f ${escapePath(finalPath)}`;
    } else {
      // Format plain SQL (mặc định)
      command = `pg_dump -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -F p -f ${escapePath(finalPath)}`;
    }

    // Set password trong environment variable
    const env = {
      ...process.env,
      PGPASSWORD: DB_PASSWORD
    };

    console.log('⏳ Đang backup...');
    let stdout, stderr;
    try {
      const result = await execAsync(command, { env });
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (error) {
      // pg_dump có thể trả về lỗi trong stderr nhưng vẫn thành công
      stdout = error.stdout || '';
      stderr = error.stderr || error.message || '';
      
      // Kiểm tra xem file có được tạo không
      try {
        await fs.access(finalPath);
        // File đã được tạo, có thể là warning thôi
        if (stderr && !stderr.includes('Password:')) {
          console.warn('⚠️  Warning:', stderr);
        }
      } catch {
        // File chưa được tạo, đây là lỗi thật
        throw new Error(`pg_dump failed: ${stderr || error.message}`);
      }
    }

    if (stderr && !stderr.includes('Password:') && !stderr.includes('pg_dump:')) {
      // Chỉ hiển thị warning nếu không phải lỗi nghiêm trọng
      const lowerStderr = stderr.toLowerCase();
      if (!lowerStderr.includes('error') && !lowerStderr.includes('fatal')) {
        console.warn('⚠️  Warning:', stderr);
      }
    }

    // Kiểm tra file đã được tạo
    try {
      await fs.access(finalPath);
    } catch {
      throw new Error(`File backup không được tạo: ${finalPath}`);
    }

    const stats = await fs.stat(finalPath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log('');
    console.log('✅ Backup thành công!');
    console.log(`📁 File: ${finalPath}`);
    console.log(`📊 Kích thước: ${fileSizeMB} MB`);
    console.log('');
    console.log('💡 Để restore, sử dụng:');
    // Tạo relative path để dễ sử dụng hơn
    const relativePath = path.relative(process.cwd(), finalPath);
    const restorePath = relativePath.startsWith('..') ? finalPath : relativePath;
    console.log(`   node restore-db.cjs --input="${restorePath}"`);

    // Tạo file metadata
    const metadata = {
      database: DB_NAME,
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      backupDate: new Date().toISOString(),
      format: format,
      fileSize: stats.size,
      filePath: finalPath
    };

    const metadataPath = `${finalPath}.meta.json`;
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    console.log(`📋 Metadata: ${metadataPath}`);

  } catch (error) {
    console.error('❌ Lỗi khi backup database:');
    console.error(error.message);
    
    if (error.message.includes('pg_dump')) {
      console.error('');
      console.error('💡 Kiểm tra:');
      console.error('   1. PostgreSQL đã được cài đặt và pg_dump có trong PATH');
      console.error('   2. Thông tin kết nối database trong .env đúng');
      console.error('   3. User có quyền truy cập database');
    }
    
    process.exit(1);
  }
}

// Chạy backup
backupDatabase();

