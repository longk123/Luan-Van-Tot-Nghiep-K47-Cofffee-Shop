/**
 * Script Backup Database và Upload Lên CẢ Google Drive VÀ OneDrive
 * 
 * Backup lên nhiều nơi để đảm bảo an toàn tối đa (Best Practice: 3-2-1 Rule)
 * 
 * Cách sử dụng:
 *   node backup-to-both-clouds.cjs
 *   node backup-to-both-clouds.cjs --google-dir="H:\My Drive\database-backups" --onedrive-dir="C:\Users\...\OneDrive\database-backups"
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
const googleDirArg = args.find(arg => arg.startsWith('--google-dir='));
const onedriveDirArg = args.find(arg => arg.startsWith('--onedrive-dir='));

// Thư mục Google Drive mặc định
const GOOGLE_DRIVE_DIRS = [
  'H:\\My Drive\\database-backups',
  'H:\\database-backups',
  'G:\\My Drive\\database-backups',
  'G:\\database-backups',
  'D:\\GoogleDrive\\backups',
  'C:\\Users\\' + process.env.USERNAME + '\\Google Drive\\backups',
];

// Thư mục OneDrive mặc định
const ONEDRIVE_DIRS = [
  process.env.USERPROFILE + '\\OneDrive\\database-backups',
  process.env.USERPROFILE + '\\OneDrive - Personal\\database-backups',
  'C:\\Users\\' + process.env.USERNAME + '\\OneDrive\\database-backups',
  'D:\\OneDrive\\backups',
];

const googleDir = googleDirArg ? googleDirArg.split('=')[1] : null;
const onedriveDir = onedriveDirArg ? onedriveDirArg.split('=')[1] : null;

async function findGoogleDriveDirectory() {
  if (googleDir) {
    try {
      await fs.access(googleDir);
      return googleDir;
    } catch {
      console.warn(`⚠️  Thư mục Google Drive không tồn tại: ${googleDir}`);
    }
  }

  for (const dir of GOOGLE_DRIVE_DIRS) {
    try {
      await fs.access(dir);
      console.log(`✅ Tìm thấy Google Drive: ${dir}`);
      return dir;
    } catch {
      // Bỏ qua
    }
  }

  return null;
}

async function findOneDriveDirectory() {
  if (onedriveDir) {
    try {
      await fs.access(onedriveDir);
      return onedriveDir;
    } catch {
      console.warn(`⚠️  Thư mục OneDrive không tồn tại: ${onedriveDir}`);
    }
  }

  for (const dir of ONEDRIVE_DIRS) {
    try {
      await fs.access(dir);
      console.log(`✅ Tìm thấy OneDrive: ${dir}`);
      return dir;
    } catch {
      // Bỏ qua
    }
  }

  return null;
}

async function copyToCloud(latestBackup, cloudDirectory, cloudName) {
  try {
    // Tạo thư mục nếu chưa có
    try {
      await fs.mkdir(cloudDirectory, { recursive: true });
    } catch (error) {
      if (error.code === 'EINVAL' || error.message.includes('invalid argument')) {
        throw new Error(`Không thể tạo thư mục: ${cloudDirectory}. Vui lòng tạo thủ công.`);
      }
      throw error;
    }

    // Copy file backup
    const cloudBackupPath = path.join(cloudDirectory, latestBackup.name);
    await fs.copyFile(latestBackup.path, cloudBackupPath);

    // Copy metadata
    const metaPath = latestBackup.path + '.meta.json';
    try {
      await fs.access(metaPath);
      const cloudMetaPath = cloudBackupPath + '.meta.json';
      await fs.copyFile(metaPath, cloudMetaPath);
    } catch {
      // Không có metadata, bỏ qua
    }

    const stats = await fs.stat(cloudBackupPath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log(`   ✅ ${cloudName}: ${cloudBackupPath} (${fileSizeMB} MB)`);
    return { success: true, path: cloudBackupPath, size: fileSizeMB };
  } catch (error) {
    console.error(`   ❌ ${cloudName}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function cleanupOldBackups(cloudDirectory, cloudName) {
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
      try {
        const stats = await fs.stat(file.path);
        file.time = stats.mtimeMs;
      } catch {
        file.time = 0;
      }
    }

    cloudBackupFiles.sort((a, b) => b.time - a.time);

    // Xóa file cũ (giữ lại 10 bản mới nhất)
    if (cloudBackupFiles.length > 10) {
      const filesToDelete = cloudBackupFiles.slice(10);
      for (const file of filesToDelete) {
        try {
          await fs.unlink(file.path);
          await fs.unlink(file.path + '.meta.json').catch(() => {});
        } catch {}
      }
    }
  } catch (error) {
    // Bỏ qua lỗi cleanup
  }
}

async function cleanupOldLocalBackups() {
  try {
    const backupDir = path.join(__dirname, 'backups');
    const files = await fs.readdir(backupDir);
    const backupFiles = files
      .filter(f => f.endsWith('.backup') || f.endsWith('.sql'))
      .map(f => ({
        name: f,
        path: path.join(backupDir, f),
        time: 0
      }));

    for (const file of backupFiles) {
      try {
        const stats = await fs.stat(file.path);
        file.time = stats.mtimeMs;
      } catch {
        file.time = 0;
      }
    }

    backupFiles.sort((a, b) => b.time - a.time);

    // Xóa file cũ trên local (giữ lại 30 bản mới nhất)
    if (backupFiles.length > 30) {
      const filesToDelete = backupFiles.slice(30);
      let deletedCount = 0;
      for (const file of filesToDelete) {
        try {
          await fs.unlink(file.path);
          await fs.unlink(file.path + '.meta.json').catch(() => {});
          deletedCount++;
        } catch {}
      }
      if (deletedCount > 0) {
        console.log(`🗑️  Đã xóa ${deletedCount} file backup local cũ (giữ lại 30 bản mới nhất)`);
      }
    }
  } catch (error) {
    // Bỏ qua lỗi cleanup
  }
}

async function backupToBothClouds() {
  try {
    console.log('🔄 Bắt đầu backup database và upload lên CẢ Google Drive VÀ OneDrive...');
    console.log('💡 Best Practice: Backup nhiều nơi để đảm bảo an toàn tối đa!');
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
        throw new Error(`Backup failed: ${error.message}. ${checkError.message}`);
      }
    }

    // Tìm file backup mới nhất
    const backupDir = path.join(__dirname, 'backups');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const files = await fs.readdir(backupDir);
    const backupFiles = files
      .filter(f => f.endsWith('.backup') || f.endsWith('.sql'))
      .map(f => ({
        name: f,
        path: path.join(backupDir, f),
        time: 0
      }));

    if (backupFiles.length === 0) {
      throw new Error('Không tìm thấy file backup!');
    }

    for (const file of backupFiles) {
      try {
        const stats = await fs.stat(file.path);
        file.time = stats.mtimeMs;
      } catch {
        file.time = 0;
      }
    }

    backupFiles.sort((a, b) => b.time - a.time);
    const latestBackup = backupFiles[0];

    if (!latestBackup || latestBackup.time === 0) {
      throw new Error('Không tìm thấy file backup hợp lệ!');
    }

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

    // Xóa file backup cũ trên local (giữ 30 bản mới nhất)
    await cleanupOldLocalBackups();

    // Bước 2: Tìm thư mục cloud
    console.log('☁️  Bước 2: Tìm thư mục cloud...');
    const googleDriveDir = await findGoogleDriveDirectory();
    const oneDriveDir = await findOneDriveDirectory();

    if (!googleDriveDir && !oneDriveDir) {
      console.error('❌ Không tìm thấy thư mục cloud nào!');
      console.error('');
      console.error('💡 Giải pháp:');
      console.error('   1. Cài đặt Google Drive Desktop hoặc OneDrive');
      console.error('   2. Hoặc chỉ định thư mục: --google-dir="..." --onedrive-dir="..."');
      console.error('');
      console.error(`📁 File backup: ${latestBackup.path}`);
      console.error('   Hãy copy file này lên cloud thủ công!');
      return;
    }

    // Bước 3: Copy lên cả 2 cloud
    console.log('📤 Bước 3: Copy lên cloud...');
    console.log('');

    const results = [];

    // Copy lên Google Drive
    if (googleDriveDir) {
      console.log('📁 Google Drive:');
      const result = await copyToCloud(latestBackup, googleDriveDir, 'Google Drive');
      results.push({ name: 'Google Drive', ...result });
      if (result.success) {
        await cleanupOldBackups(googleDriveDir, 'Google Drive');
      }
    } else {
      console.log('⚠️  Google Drive: Không tìm thấy');
      results.push({ name: 'Google Drive', success: false, error: 'Không tìm thấy thư mục' });
    }

    // Copy lên OneDrive
    if (oneDriveDir) {
      console.log('📁 OneDrive:');
      const result = await copyToCloud(latestBackup, oneDriveDir, 'OneDrive');
      results.push({ name: 'OneDrive', ...result });
      if (result.success) {
        await cleanupOldBackups(oneDriveDir, 'OneDrive');
      }
    } else {
      console.log('⚠️  OneDrive: Không tìm thấy');
      results.push({ name: 'OneDrive', success: false, error: 'Không tìm thấy thư mục' });
    }

    console.log('');
    console.log('📊 Kết quả:');
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    if (successCount > 0) {
      console.log(`✅ Đã upload thành công lên ${successCount}/${totalCount} cloud:`);
      results.forEach(r => {
        if (r.success) {
          console.log(`   ✅ ${r.name}: ${r.path} (${r.size} MB)`);
        } else {
          console.log(`   ⚠️  ${r.name}: ${r.error}`);
        }
      });
      console.log('');
      console.log('💡 File sẽ tự động sync lên cloud');
      console.log('💡 Bạn có thể truy cập từ bất kỳ đâu!');
    } else {
      console.error('❌ Không upload được lên cloud nào!');
      console.error(`📁 File backup: ${latestBackup.path}`);
      console.error('   Hãy copy file này lên cloud thủ công!');
    }

  } catch (error) {
    console.error('');
    console.error('❌ Lỗi khi backup và upload lên cloud:');
    console.error(error.message);
    process.exit(1);
  }
}

// Chạy backup
backupToBothClouds();

