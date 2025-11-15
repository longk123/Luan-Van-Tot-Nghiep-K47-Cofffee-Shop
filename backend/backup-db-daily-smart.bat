@echo off
REM Script backup database thông minh
REM Chỉ backup nếu chưa có backup hôm nay
REM Kiểm tra internet trước khi backup

cd /d D:\my-thesis\backend

REM Kiểm tra xem đã có backup hôm nay chưa bằng PowerShell
powershell -Command "$backupDir = 'backups'; $today = Get-Date -Format 'yyyy-MM-dd'; $files = Get-ChildItem -Path $backupDir -Filter '*.backup' -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime.ToString('yyyy-MM-dd') -eq $today }; if ($files) { Write-Host '[INFO] Đã có backup hôm nay, bỏ qua.'; exit 0 } else { Write-Host '[INFO] Chưa có backup hôm nay, đang backup...'; exit 1 }"

if %ERRORLEVEL% EQU 0 (
    echo [INFO] Đã có backup hôm nay, bỏ qua. >> backup-log.txt
    exit /b 0
)

REM Kiểm tra internet trước khi backup
echo [INFO] Đang kiểm tra kết nối internet...
powershell -Command "$result = Test-Connection -ComputerName '8.8.8.8' -Count 2 -Quiet; if ($result) { Write-Host '[INFO] Có kết nối internet'; exit 0 } else { Write-Host '[WARNING] Không có kết nối internet'; exit 1 }"

if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Không có kết nối internet tại %date% %time% >> backup-log.txt
    echo [WARNING] Backup sẽ được thực hiện khi có internet (lần chạy tiếp theo)
    echo.
    echo ⚠️  KHÔNG CÓ INTERNET - Backup sẽ được thực hiện khi có internet
    echo 💡 Backup local vẫn được tạo, nhưng chưa upload lên cloud
    echo.
    
    REM Vẫn tạo backup local (không upload lên cloud)
    echo [INFO] Đang tạo backup local (không upload lên cloud)... >> backup-log.txt
    node backup-db.cjs --format=custom
    
    if %ERRORLEVEL% EQU 0 (
        echo [INFO] Backup local đã được tạo (chưa upload lên cloud) tại %date% %time% >> backup-log.txt
        echo ✅ Backup local đã được tạo
        echo 💡 Sẽ upload lên cloud khi có internet (lần chạy tiếp theo)
    ) else (
        echo [ERROR] Backup local failed at %date% %time% >> backup-log.txt
    )
    exit /b 0
)

REM Có internet, thực hiện backup và upload lên cloud
echo [INFO] Có kết nối internet, đang backup và upload lên cloud... >> backup-log.txt
echo [INFO] Chưa có backup hôm nay, đang backup... >> backup-log.txt

REM Backup lên cả Google Drive VÀ OneDrive
node backup-to-both-clouds.cjs

REM Log kết quả
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Backup completed at %date% %time% >> backup-log.txt
) else (
    echo [ERROR] Backup failed at %date% %time% >> backup-log.txt
)

