/**
 * Script Backup Database và Upload Lên Google Drive (Dùng API)
 * 
 * YÊU CẦU:
 * 1. Cài đặt: npm install googleapis
 * 2. Tạo Google Cloud Project và bật Google Drive API
 * 3. Tạo OAuth credentials và đặt vào: google-drive-credentials.json
 * 4. Chạy lần đầu để authorize (sẽ mở browser)
 * 
 * Cách sử dụng:
 *   node backup-to-google-drive-api.cjs
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const { google } = require('googleapis');
const readline = require('readline');
const execAsync = promisify(exec);

// Load environment variables
require('dotenv').config();

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const TOKEN_PATH = path.join(__dirname, 'google-drive-token.json');
const CREDENTIALS_PATH = path.join(__dirname, 'google-drive-credentials.json');

// Tạo readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

/**
 * Load hoặc request authorization
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({ scopes: SCOPES });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

/**
 * Load credentials đã lưu
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Lưu credentials
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Authenticate và request authorization
 */
async function authenticate({ scopes }) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const credentials = JSON.parse(content);
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
  });

  console.log('🔐 Cần authorize để upload lên Google Drive:');
  console.log('👉 Mở link này trong browser:', authUrl);
  console.log('');
  
  const code = await question('Nhập code từ browser: ');
  
  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);
  
  return oAuth2Client;
}

/**
 * Upload file lên Google Drive
 */
async function uploadFile(authClient, filePath, fileName) {
  const drive = google.drive({ version: 'v3', auth: authClient });

  // Tìm hoặc tạo thư mục "Database Backups"
  let folderId = null;
  try {
    const response = await drive.files.list({
      q: "name='Database Backups' and mimeType='application/vnd.google-apps.folder' and trashed=false",
      fields: 'files(id, name)',
    });

    if (response.data.files.length > 0) {
      folderId = response.data.files[0].id;
    } else {
      // Tạo thư mục mới
      const folderResponse = await drive.files.create({
        requestBody: {
          name: 'Database Backups',
          mimeType: 'application/vnd.google-apps.folder',
        },
        fields: 'id',
      });
      folderId = folderResponse.data.id;
      console.log('✅ Đã tạo thư mục "Database Backups" trên Google Drive');
    }
  } catch (error) {
    console.error('❌ Lỗi khi tìm/tạo thư mục:', error.message);
    throw error;
  }

  // Upload file
  const fileMetadata = {
    name: fileName,
    parents: [folderId],
  };

  const media = {
    mimeType: 'application/octet-stream',
    body: require('fs').createReadStream(filePath),
  };

  try {
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, size',
    });

    const fileSizeMB = (parseInt(response.data.size) / (1024 * 1024)).toFixed(2);
    console.log(`✅ Đã upload lên Google Drive:`);
    console.log(`   📁 File: ${response.data.name}`);
    console.log(`   📊 Kích thước: ${fileSizeMB} MB`);
    console.log(`   🔗 ID: ${response.data.id}`);
    
    return response.data;
  } catch (error) {
    console.error('❌ Lỗi khi upload file:', error.message);
    throw error;
  }
}

/**
 * Main function
 */
async function backupToGoogleDrive() {
  try {
    // Kiểm tra credentials
    try {
      await fs.access(CREDENTIALS_PATH);
    } catch {
      console.error('❌ Không tìm thấy file credentials!');
      console.error('');
      console.error('💡 Cần tạo OAuth credentials:');
      console.error('   1. Truy cập: https://console.cloud.google.com/');
      console.error('   2. Tạo project và bật Google Drive API');
      console.error('   3. Tạo OAuth client ID (Desktop app)');
      console.error('   4. Tải file JSON và đặt vào: backend/google-drive-credentials.json');
      process.exit(1);
    }

    // Kiểm tra package googleapis
    try {
      require('googleapis');
    } catch {
      console.error('❌ Package googleapis chưa được cài đặt!');
      console.error('');
      console.error('💡 Cài đặt:');
      console.error('   cd backend');
      console.error('   npm install googleapis');
      process.exit(1);
    }

    console.log('🔄 Bắt đầu backup database và upload lên Google Drive...');
    console.log('');

    // Bước 1: Backup database
    console.log('📦 Bước 1: Backup database...');
    const { stdout: backupOutput } = await execAsync('node backup-db.cjs --format=custom', {
      cwd: __dirname
    });
    console.log(backupOutput);

    // Tìm file backup mới nhất
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
      const stats = await fs.stat(file.path);
      file.time = stats.mtimeMs;
    }

    backupFiles.sort((a, b) => b.time - a.time);
    const latestBackup = backupFiles[0];

    if (!latestBackup) {
      throw new Error('Không tìm thấy file backup!');
    }

    console.log(`✅ Đã tạo backup: ${latestBackup.name}`);
    console.log('');

    // Bước 2: Authorize
    console.log('🔐 Bước 2: Authorize Google Drive...');
    const authClient = await authorize();
    console.log('✅ Đã authorize');
    console.log('');

    // Bước 3: Upload lên Google Drive
    console.log('☁️  Bước 3: Upload lên Google Drive...');
    await uploadFile(authClient, latestBackup.path, latestBackup.name);

    console.log('');
    console.log('✅ Hoàn tất! Backup đã được upload lên Google Drive.');
    console.log('💡 Truy cập: https://drive.google.com/drive/folders/...');

  } catch (error) {
    console.error('');
    console.error('❌ Lỗi:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Chạy backup
backupToGoogleDrive();

