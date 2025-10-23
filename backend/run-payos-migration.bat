@echo off
echo ========================================
echo Running PayOS Migration
echo ========================================
echo.

set PGPASSWORD=123456
psql -U postgres -d coffee_shop -f migrate-add-payment-gateway.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Migration completed successfully!
    echo ========================================
) else (
    echo.
    echo ========================================
    echo Migration failed! Check errors above.
    echo ========================================
)

pause

