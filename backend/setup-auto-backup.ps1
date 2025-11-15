# Script Setup Tu Dong Backup Database
# Chay script nay de tao Task Scheduler tu dong backup moi ngay

$taskName = "CoffeeShop-Database-Backup"
$scriptPath = "D:\my-thesis\backend\backup-db-daily-smart.bat"
$workingDir = "D:\my-thesis\backend"

Write-Host "Dang setup tu dong backup database..." -ForegroundColor Cyan
Write-Host ""

# Kiem tra xem task da ton tai chua
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue

if ($existingTask) {
    Write-Host "Task da ton tai: $taskName" -ForegroundColor Yellow
    $response = Read-Host "Ban co muon cap nhat task? (y/n)"
    if ($response -ne "y") {
        Write-Host "Huy bo." -ForegroundColor Red
        exit
    }
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "Da xoa task cu" -ForegroundColor Green
}

# Tao action (chay script)
$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$scriptPath`"" -WorkingDirectory $workingDir

# Tao trigger 1: Moi ngay luc 6:00 PM
$trigger1 = New-ScheduledTaskTrigger -Daily -At "6:00PM"
$trigger1.Enabled = $true

# Tao trigger 2: Khi may khoi dong (de backup ngay neu bi bo lo luc 6:00 PM)
$trigger2 = New-ScheduledTaskTrigger -AtStartup
$trigger2.Delay = "PT2M"  # Doi 2 phut sau khi khoi dong de he thong san sang
$trigger2.Enabled = $true

# Tao mang triggers
$triggers = @($trigger1, $trigger2)

# Tao settings
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Hours 1) `
    -WakeToRun  # Wake up tu sleep de chay task

# Tao principal (chay voi quyen user hien tai)
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Highest

# Dang ky task
try {
    Register-ScheduledTask `
        -TaskName $taskName `
        -Action $action `
        -Trigger $triggers `
        -Settings $settings `
        -Principal $principal `
        -Description "Tu dong backup database coffee_shop len Google Drive va OneDrive moi ngay luc 6:00 PM. Neu may tat luc 6:00 PM, se backup ngay khi mo may." `
        | Out-Null
    
    Write-Host "Da tao task tu dong backup!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Thong tin task:" -ForegroundColor Cyan
    Write-Host "   Ten: $taskName"
    Write-Host "   Thoi gian chinh: Moi ngay luc 6:00 PM"
    Write-Host "   Backup khi mo may: Co (neu bi bo lo luc 6:00 PM)"
    Write-Host "   Script: $scriptPath"
    Write-Host ""
    Write-Host "De xem task:" -ForegroundColor Yellow
    Write-Host "   Get-ScheduledTask -TaskName '$taskName'"
    Write-Host ""
    Write-Host "De xoa task:" -ForegroundColor Yellow
    Write-Host "   Unregister-ScheduledTask -TaskName '$taskName' -Confirm:`$false"
    Write-Host ""
    Write-Host "De chay ngay:" -ForegroundColor Yellow
    Write-Host "   Start-ScheduledTask -TaskName '$taskName'"
    Write-Host ""
    Write-Host "Setup hoan tat!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Lich backup:" -ForegroundColor Cyan
    Write-Host "   - Moi ngay luc 6:00 PM (neu may dang bat/sleep)" -ForegroundColor Green
    Write-Host "   - Ngay khi mo may (neu bi bo lo luc 6:00 PM)" -ForegroundColor Green
    Write-Host ""
    Write-Host "LUU Y:" -ForegroundColor Yellow
    Write-Host "   - Task se chay neu laptop dang BAT hoac SLEEP luc 6:00 PM" -ForegroundColor Green
    Write-Host "   - Neu laptop TAT luc 6:00 PM, se backup ngay khi mo may" -ForegroundColor Green
    Write-Host "   - Backup khi mo may chi chay neu chua co backup hom nay" -ForegroundColor Yellow
    
} catch {
    Write-Host "Loi khi tao task: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Thu chay PowerShell voi quyen Administrator" -ForegroundColor Yellow
    exit 1
}
