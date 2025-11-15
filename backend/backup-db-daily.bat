@echo off
REM Script backup database tự động hàng ngày
REM Chạy script này với Task Scheduler để backup tự động

cd /d D:\my-thesis\backend

REM Backup lên cả Google Drive VÀ OneDrive
node backup-to-both-clouds.cjs

REM Log kết quả
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Backup completed at %date% %time% >> backup-log.txt
) else (
    echo [ERROR] Backup failed at %date% %time% >> backup-log.txt
)

