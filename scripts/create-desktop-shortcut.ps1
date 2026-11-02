$wsh = New-Object -ComObject WScript.Shell
$desktopPaths = @(
    [Environment]::GetFolderPath('Desktop'),
    'C:\Users\HP VICTUS\Desktop',
    'C:\Users\HP VICTUS\OneDrive\Máy tính',
    'C:\Users\HP VICTUS\OneDrive\Desktop'
) | Select-Object -Unique

$workspace = 'D:\Project\openquiz'
$batTarget = Join-Path $workspace 'OpenLearn.bat'

# Copy to fresh icon filename to bust Windows IconCache.db
$icoSource = Join-Path $workspace 'public\openlearn.ico'
$freshIco = Join-Path $workspace 'public\openlearn-app.ico'
Copy-Item $icoSource $freshIco -Force

foreach ($desk in $desktopPaths) {
    if (Test-Path $desk) {
        # 1. Remove old OpenQuiz / OpenLearn shortcuts
        $oldLnk = Join-Path $desk 'OpenQuiz.lnk'
        if (Test-Path $oldLnk) { Remove-Item -LiteralPath $oldLnk -Force -ErrorAction SilentlyContinue }

        # 2. Create new OpenLearn shortcut pointing to the new icon
        $shortcutPath = Join-Path $desk 'OpenLearn.lnk'
        if (Test-Path $shortcutPath) {
            Remove-Item -LiteralPath $shortcutPath -Force -ErrorAction SilentlyContinue
        }

        $shortcut = $wsh.CreateShortcut($shortcutPath)
        $shortcut.TargetPath = $batTarget
        $shortcut.WorkingDirectory = $workspace
        $shortcut.Description = 'Khoi dong OpenLearn Platform'
        $shortcut.IconLocation = "$freshIco,0"
        $shortcut.Save()
        Write-Host "Created OpenLearn shortcut with new OL icon at $desk" -ForegroundColor Green
    }
}

# Tell Windows Explorer to refresh desktop icon cache
try {
    Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class ShellNotifyRefresher {
    [DllImport("shell32.dll")]
    public static extern void SHChangeNotify(int wEventId, uint uFlags, IntPtr dwItem1, IntPtr dwItem2);
}
"@
    # SHCNE_ASSOCCHANGED = 0x08000000, SHCNF_FLUSH = 0x1000
    [ShellNotifyRefresher]::SHChangeNotify(0x08000000, 0x1000, [IntPtr]::Zero, [IntPtr]::Zero)
    Write-Host "Windows Shell icon cache refreshed successfully." -ForegroundColor Cyan
} catch {
    # Handled
}
