# PowerShell script to help set up credentials securely
# This runs locally on your machine - credentials are NOT sent anywhere

Write-Host "`n🔐 Playwright Automation Tool - Credential Setup`n" -ForegroundColor Cyan
Write-Host "This script will help you create a .env file with your credentials." -ForegroundColor Yellow
Write-Host "Your credentials are typed locally and NEVER sent anywhere." -ForegroundColor Yellow
Write-Host "`nPress any key to continue..." -NoNewline
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Check if .env already exists
if (Test-Path ".env") {
    Write-Host "`n⚠️  .env file already exists!" -ForegroundColor Red
    $overwrite = Read-Host "Do you want to overwrite it? (yes/no)"
    if ($overwrite -ne "yes") {
        Write-Host "Setup cancelled. Your existing .env file was kept." -ForegroundColor Green
        exit
    }
}

Write-Host "`n" + "="*50 -ForegroundColor Cyan
Write-Host "OUTLOOK CONFIGURATION" -ForegroundColor Cyan
Write-Host "="*50 -ForegroundColor Cyan

$outlookUrl = Read-Host "`nOutlook URL [press Enter for default: https://outlook.office.com/mail/]"
if ([string]::IsNullOrWhiteSpace($outlookUrl)) {
    $outlookUrl = "https://outlook.office.com/mail/"
}

$outlookEmail = Read-Host "Your Outlook email address"
$outlookPassword = Read-Host "Your Outlook password" -AsSecureString

Write-Host "`n" + "="*50 -ForegroundColor Cyan
Write-Host "PORTAL CONFIGURATION" -ForegroundColor Cyan
Write-Host "="*50 -ForegroundColor Cyan

$portalUrl = Read-Host "`nPortal URL (the website you want to search)"
$portalUsername = Read-Host "Portal username [press Enter to skip]"
$portalPassword = Read-Host "Portal password [press Enter to skip]" -AsSecureString

Write-Host "`n" + "="*50 -ForegroundColor Cyan
Write-Host "SEARCH CONFIGURATION (Optional - press Enter to skip)" -ForegroundColor Cyan
Write-Host "="*50 -ForegroundColor Cyan

Write-Host "`nThese are CSS selectors for the search form on your portal."
Write-Host "Examples: #searchInput, .search-box, input[name='q']"

$searchInput = Read-Host "Search input selector [default: #searchInput]"
if ([string]::IsNullOrWhiteSpace($searchInput)) {
    $searchInput = "#searchInput"
}

$searchButton = Read-Host "Search button selector [default: #searchBtn]"
if ([string]::IsNullOrWhiteSpace($searchButton)) {
    $searchButton = "#searchBtn"
}

Write-Host "`n" + "="*50 -ForegroundColor Cyan
Write-Host "AUTOMATION SETTINGS" -ForegroundColor Cyan
Write-Host "="*50 -ForegroundColor Cyan

$maxEmails = Read-Host "`nMax emails to process per run [default: 10]"
if ([string]::IsNullOrWhiteSpace($maxEmails)) {
    $maxEmails = "10"
}

$processedFolder = Read-Host "Folder name for processed emails [default: Processed]"
if ([string]::IsNullOrWhiteSpace($processedFolder)) {
    $processedFolder = "Processed"
}

# Convert secure strings to plain text for file writing
$outlookPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($outlookPassword))
$portalPasswordPlain = ""
if ($portalPassword.Length -gt 0) {
    $portalPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($portalPassword))
}

# Create .env file
$envContent = @"
# =============================================
# Playwright Automation Tool - Configuration
# =============================================
# ⚠️  NEVER COMMIT THIS FILE TO GIT!
# This file contains sensitive credentials.
# =============================================

# =============================================
# OUTLOOK CONFIGURATION
# =============================================
OUTLOOK_URL=$outlookUrl
OUTLOOK_EMAIL=$outlookEmail
OUTLOOK_PASSWORD=$outlookPasswordPlain

# =============================================
# PORTAL CONFIGURATION
# =============================================
PORTAL_URL=$portalUrl
PORTAL_USERNAME=$portalUsername
PORTAL_PASSWORD=$portalPasswordPlain

# =============================================
# SEARCH CONFIGURATION
# Customize these based on your portal's HTML structure
# =============================================
SEARCH_INPUT_SELECTOR=$searchInput
SEARCH_BUTTON_SELECTOR=$searchButton
RESULTS_SELECTOR=.search-results

# =============================================
# AUTOMATION SETTINGS
# =============================================
HEADLESS=false
SLOW_MO=100
MAX_EMAILS_TO_PROCESS=$maxEmails
PROCESSED_FOLDER_NAME=$processedFolder

# =============================================
# LOGGING
# =============================================
LOG_LEVEL=info
"@

# Write to file
$envContent | Out-File -FilePath ".env" -Encoding UTF8

# Clear variables from memory
$outlookPasswordPlain = $null
$portalPasswordPlain = $null
[GC]::Collect()

Write-Host "`n" + "="*50 -ForegroundColor Green
Write-Host "✅ SUCCESS! .env file created!" -ForegroundColor Green
Write-Host "="*50 -ForegroundColor Green
Write-Host "`nYour credentials have been saved to .env" -ForegroundColor Green
Write-Host "This file is ignored by Git for security." -ForegroundColor Yellow
Write-Host "`nNext steps:"
Write-Host "  1. Review .env file if needed (optional)" -ForegroundColor Cyan
Write-Host "  2. Customize extraction patterns in src/config.ts" -ForegroundColor Cyan
Write-Host "  3. Run: npm run dev" -ForegroundColor Cyan
Write-Host "`n"

# Verify file was created
if (Test-Path ".env") {
    Write-Host "✓ .env file exists at: $(Resolve-Path .env)" -ForegroundColor Green
    Write-Host "`nFile contents (passwords hidden):" -ForegroundColor Gray
    Get-Content .env | ForEach-Object { 
        if ($_ -match "PASSWORD=") {
            Write-Host "  $($_.Split('=')[0])=********" -ForegroundColor Gray
        } else {
            Write-Host "  $_" -ForegroundColor Gray
        }
    }
}

Write-Host "`nPress any key to exit..." -NoNewline
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
