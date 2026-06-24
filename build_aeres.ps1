Write-Host "========================================="
Write-Host " Building Aeres IDE Standalone Executable"
Write-Host "========================================="

$rootDir = Get-Location

Write-Host "`n[1/4] Activating Python Virtual Environment..."
cd apps\python-backend
if (-Not (Test-Path "venv")) {
    Write-Host "Creating new virtual environment..."
    python -m venv venv
}
.\venv\Scripts\Activate.ps1

Write-Host "`n[2/4] Installing dependencies & Building Python Sidecar..."
pip install -r requirements.txt
pip install pyinstaller
python -m PyInstaller -y --onedir --name backend --hidden-import uvicorn --hidden-import fastapi --hidden-import tree_sitter --hidden-import tree_sitter_python --hidden-import tree_sitter_javascript --hidden-import pydantic --hidden-import pydantic_settings main.py

Write-Host "`n[3/4] Moving backend directory to Tauri resources folder..."
cd $rootDir
if (Test-Path "apps\desktop-client\src-tauri\resources\backend") {
    Remove-Item -Recurse -Force -Path "apps\desktop-client\src-tauri\resources\backend"
}
if (-Not (Test-Path "apps\desktop-client\src-tauri\resources")) {
    New-Item -ItemType Directory -Force -Path "apps\desktop-client\src-tauri\resources" | Out-Null
}
Copy-Item -Recurse -Force -Path "apps\python-backend\dist\backend" -Destination "apps\desktop-client\src-tauri\resources\backend"

if (Test-Path "apps\python-backend\.env") {
    Write-Host "Copying .env file to resources (stripping personal user keys)..."
    Get-Content "apps\python-backend\.env" | Where-Object { 
        $_ -notmatch "^GROQ_API_KEY" -and 
        $_ -notmatch "^GOOGLE_API_KEY" -and 
        $_ -notmatch "^GITHUB_TOKEN" 
    } | Set-Content "apps\desktop-client\src-tauri\resources\backend\.env"
}

Write-Host "`n[4/4] Building final Tauri MSI & EXE Installers..."
cd apps\desktop-client
npm run build

Write-Host "`n========================================="
Write-Host " BUILD COMPLETE! 🎉"
Write-Host " Your setup files are located in:"
Write-Host " C:\Project\Aether_IDE\AERES-IDE\apps\desktop-client\src-tauri\target\release\bundle\nsis\"
Write-Host "========================================="
