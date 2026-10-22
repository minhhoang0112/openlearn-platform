$wsh = New-Object -ComObject WScript.Shell
$desktopPaths = @(
    [Environment]::GetFolderPath('Desktop'),
    'C:\Users\HP VICTUS\Desktop'
) | Select-Object -Unique

$workspace = 'D:\Project\openquiz'
$batTarget = Join-Path $workspace 'OpenLearn.bat'
$iconPath = Join-Path $workspace 'public\openlearn.ico'

foreach ($desk in $desktopPaths) {
    if (Test-Path $desk) {
        # 1. Remove old OpenQuiz shortcut
        $oldLnk = Join-Path $desk 'OpenQuiz.lnk'
        if (Test-Path $oldLnk) { Remove-Item -LiteralPath $oldLnk -Force -ErrorAction SilentlyContinue }

        # 2. Create new OpenLearn shortcut
        $shortcutPath = Join-Path $desk 'OpenLearn.lnk'
        $shortcut = $wsh.CreateShortcut($shortcutPath)
        $shortcut.TargetPath = $batTarget
        $shortcut.WorkingDirectory = $workspace
        $shortcut.Description = 'Khoi dong OpenLearn Platform'
        $shortcut.IconLocation = "$iconPath,0"
        $shortcut.Save()
        Write-Host "Created OpenLearn shortcut at $desk" -ForegroundColor Green
    }
}

# Tell Windows Explorer to refresh desktop cache
try {
    Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class ShellNotify2 {
    [DllImport("shell32.dll")]
    public static extern void SHChangeNotify(int wEventId, uint uFlags, IntPtr dwItem1, IntPtr dwItem2);
}
"@
    [ShellNotify2]::SHChangeNotify(0x08000000, 0, [IntPtr]::Zero, [IntPtr]::Zero)
} catch {
    # Handled
}
