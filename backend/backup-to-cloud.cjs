/**
 * Script Backup Database và Upload Lên Cloud
 * 
 * Tự động backup database và copy lên thư mục cloud (Google Drive/OneDrive)
 * 
 * Cách sử dụng:
 *   node backup-to-cloud.cjs                    # Tự động tìm Google Drive hoặc OneDrive
 *   node backup-to-cloud.cjs --cloud-dir="D:\GoogleDrive\backups"
 * 
 * 💡 Khuyến nghị: Dùng backup-to-both-clouds.cjs để backup lên CẢ Google Drive VÀ OneDrive
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const execAsync = promisify(exec);

// Load environment variables
require('dotenv').config();

// Parse command line arguments
const args = process.argv.slice(2);
const cloudDirArg = args.find(arg => arg.startsWith('--cloud-dir='));

// Thư mục cloud mặc định (có thể thay đổi)
const DEFAULT_CLOUD_DIRS = [
  'H:\\My Drive\\database-backups',  // Google Drive Desktop (H:\My Drive\)
  'H:\\database-backups',            // Google Drive Desktop (H:\)
  'H:\\My Drive\\backups',           // Google Drive Desktop (H:\My Drive\ alternative)
  'H:\\backups',                     // Google Drive Desktop (H:\ alternative)
  'G:\\My Drive\\database-backups',  // Google Drive Desktop (G:\ alternative)
  'G:\\database-backups',            // Google Drive Desktop (G:\ alternative)
  'D:\\GoogleDrive\\backups',
  'D:\\OneDrive\\backups',
  'C:\\Users\\' + process.env.USERNAME + '\\Google Drive\\backups',
  'C:\\Users\\' + process.env.USERNAME + '\\OneDrive\\backups',
];

const cloudDir = cloudDirArg 
  ? cloudDirArg.split('=')[1] 
  : null;

async function findCloudDirectory() {
  // Nếu đã chỉ định, dùng luôn
  if (cloudDir) {
    try {
      await fs.access(cloudDir);
      return cloudDir;
    } catch {
      console.warn(`⚠️  Thư mục cloud không tồn tại: ${cloudDir}`);
    }
  }

  // Tìm thư mục cloud có sẵn
  for (const dir of DEFAULT_CLOUD_DIRS) {
    try {
      await fs.access(dir);
      console.log(`✅ Tìm thấy thư mục cloud: ${dir}`);
      return dir;
    } catch {
      // Thư mục không tồn tại, bỏ qua
    }
  }

  return null;
}

async function backupToCloud() {
  try {
    console.log('🔄 Bắt đầu backup database và upload lên cloud...');
    console.log('');

    // Bước 1: Backup database
    console.log('📦 Bước 1: Backup database...');
    try {
      const { stdout: backupOutput, stderr: backupError } = await execAsync('node backup-db.cjs --format=custom', {
        cwd: __dirname
      });
      if (backupOutput) {
        console.log(backupOutput);
      }
      if (backupError && !backupError.includes('Password:')) {
        console.warn('⚠️  Warning từ backup:', backupError);
      }
    } catch (error) {
      // Kiểm tra xem backup có thành công không (có thể có warning nhưng vẫn tạo file)
      const backupDir = path.join(__dirname, 'backups');
      try {
        await fs.access(backupDir);
        const files = await fs.readdir(backupDir);
        const hasBackup = files.some(f => f.endsWith('.backup') || f.endsWith('.sql'));
        if (!hasBackup) {
          throw new Error(`Backup failed: ${error.message}`);
        }
        console.warn('⚠️  Backup có warning nhưng file đã được tạo');
      } catch (checkError) {
        // Nếu không thể kiểm tra thư mục hoặc không có file, đây là lỗi thật
        throw new Error(`Backup failed: ${error.message}. ${checkError.message}`);
      }
    }

    // Tìm file backup mới nhất
    const backupDir = path.join(__dirname, 'backups');
    
    // Đợi một chút để đảm bảo file đã được ghi xong
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    let files;
    try {
      files = await fs.readdir(backupDir);
    } catch (error) {
      throw new Error(`Không thể đọc thư mục backups: ${error.message}`);
    }
    
    const backupFiles = files
      .filter(f => f.endsWith('.backup') || f.endsWith('.sql'))
      .map(f => ({
        name: f,
        path: path.join(backupDir, f),
        time: 0
      }));

    if (backupFiles.length === 0) {
      throw new Error('Không tìm thấy file backup trong thư mục backups!');
    }

    // Lấy thông tin thời gian
    for (const file of backupFiles) {
      try {
        const stats = await fs.stat(file.path);
        file.time = stats.mtimeMs;
      } catch (error) {
        console.warn(`⚠️  Không thể đọc file: ${file.name}`, error.message);
        file.time = 0; // Đặt thời gian = 0 để bỏ qua file lỗi
      }
    }

    // Sắp xếp theo thời gian, lấy file mới nhất
    backupFiles.sort((a, b) => b.time - a.time);
    const latestBackup = backupFiles[0];

    if (!latestBackup || latestBackup.time === 0) {
      throw new Error('Không tìm thấy file backup hợp lệ!');
    }
    
    // Kiểm tra file có tồn tại và có kích thước > 0
    try {
      const stats = await fs.stat(latestBackup.path);
      if (stats.size === 0) {
        throw new Error(`File backup rỗng: ${latestBackup.name}`);
      }
    } catch (error) {
      throw new Error(`File backup không hợp lệ: ${error.message}`);
    }

    console.log(`✅ Đã tạo backup: ${latestBackup.name}`);
    console.log('');

    // Bước 2: Tìm thư mục cloud
    console.log('☁️  Bước 2: Tìm thư mục cloud...');
    const cloudDirectory = await findCloudDirectory();

    if (!cloudDirectory) {
      console.error('❌ Không tìm thấy thư mục cloud!');
      console.error('');
      console.error('💡 Giải pháp:');
      console.error('   1. Cài đặt Google Drive Desktop hoặc OneDrive');
      console.error('   2. Hoặc chỉ định thư mục: --cloud-dir="D:\\GoogleDrive\\backups"');
      console.error('   3. Hoặc copy thủ công file backup lên cloud');
      console.error('');
      console.error(`📁 File backup: ${latestBackup.path}`);
      console.error('   Hãy copy file này lên cloud thủ công!');
      return;
    }

    // Tạo thư mục cloud nếu chưa có
    try {
      await fs.mkdir(cloudDirectory, { recursive: true });
    } catch (error) {
      // Nếu không thể tạo thư mục, thử tạo với quyền khác hoặc báo lỗi
      if (error.code === 'EINVAL' || error.message.includes('invalid argument')) {
        console.error('');
        console.error('⚠️  Không thể tạo thư mục tự động trong H:\\');
        console.error('💡 Vui lòng tạo thư mục thủ công:');
        console.error(`   1. Mở File Explorer`);
        console.error(`   2. Vào thư mục H:\\`);
        console.error(`   3. Tạo thư mục mới: "database-backups"`);
        console.error(`   4. Chạy lại script`);
        console.error('');
        throw new Error(`Không thể tạo thư mục: ${cloudDirectory}. Vui lòng tạo thủ công.`);
      }
      throw error;
    }

    // Bước 3: Copy lên cloud
    console.log(`📤 Bước 3: Copy lên cloud: ${cloudDirectory}...`);
    
    const cloudBackupPath = path.join(cloudDirectory, latestBackup.name);
    await fs.copyFile(latestBackup.path, cloudBackupPath);

    // Copy cả file metadata nếu có
    const metaPath = latestBackup.path + '.meta.json';
    try {
      await fs.access(metaPath);
      const cloudMetaPath = cloudBackupPath + '.meta.json';
      await fs.copyFile(metaPath, cloudMetaPath);
      console.log(`✅ Đã copy metadata`);
    } catch {
      // Không có metadata, bỏ qua
    }

    const stats = await fs.stat(cloudBackupPath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log('');
    console.log('✅ Backup và upload lên cloud thành công!');
    console.log(`📁 File trên cloud: ${cloudBackupPath}`);
    console.log(`📊 Kích thước: ${fileSizeMB} MB`);
    console.log('');
    console.log('💡 File sẽ tự động sync lên Google Drive/OneDrive');
    console.log('💡 Bạn có thể truy cập từ bất kỳ đâu!');

    // Xóa backup cũ trên cloud (giữ lại 10 bản mới nhất)
    try {
      const cloudFiles = await fs.readdir(cloudDirectory);
      const cloudBackupFiles = cloudFiles
        .filter(f => f.endsWith('.backup') || f.endsWith('.sql'))
        .map(f => ({
          name: f,
          path: path.join(cloudDirectory, f),
          time: 0
        }));

      for (const file of cloudBackupFiles) {
        const stats = await fs.stat(file.path);
        file.time = stats.mtimeMs;
      }

      cloudBackupFiles.sort((a, b) => b.time - a.time);

      // Xóa file cũ (giữ lại 10 bản mới nhất)
      if (cloudBackupFiles.length > 10) {
        const filesToDelete = cloudBackupFiles.slice(10);
        for (const file of filesToDelete) {
          await fs.unlink(file.path);
          // Xóa metadata nếu có
          try {
            await fs.unlink(file.path + '.meta.json');
          } catch {}
          console.log(`🗑️  Đã xóa backup cũ: ${file.name}`);
        }
      }
    } catch (error) {
      console.warn('⚠️  Không thể xóa backup cũ:', error.message);
    }

  } catch (error) {
    console.error('');
    console.error('❌ Lỗi khi backup và upload lên cloud:');
    console.error(error.message);
    process.exit(1);
  }
}

// Chạy backup
backupToCloud();

