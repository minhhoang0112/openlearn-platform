param([switch]$OnlyMissing)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$projectRoot = Split-Path -Parent $PSScriptRoot
$contentRoot = Join-Path $projectRoot 'server/content/learning-v2'
$audioRoot = Join-Path $contentRoot 'media'
New-Item -ItemType Directory -Path $audioRoot -Force | Out-Null
$speechEngine = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
    $englishVoice = $speechEngine.GetInstalledVoices() | Where-Object { $_.Enabled -and $_.VoiceInfo.Culture.Name -eq 'en-US' } | Select-Object -First 1
    if (-not $englishVoice) { throw 'No installed English US speech voice. No placeholder audio will be created.' }
    $speechEngine.SelectVoice($englishVoice.VoiceInfo.Name)
    $speechEngine.Rate = -2
    $speechEngine.Volume = 100
    $scripts = Get-Content -LiteralPath (Join-Path $contentRoot 'audio-scripts.json') -Raw -Encoding UTF8 | ConvertFrom-Json
    foreach ($script in $scripts) {
        if ($script.id -notmatch '^[a-z0-9-]+$') { throw 'Invalid media identifier.' }
        $audioPath = Join-Path $audioRoot ($script.id + '.wav')
        if ($OnlyMissing -and (Test-Path -LiteralPath $audioPath)) { continue }
        $speechEngine.SetOutputToWaveFile($audioPath)
        $speechEngine.Speak($script.transcript)
        $speechEngine.SetOutputToNull()
        Write-Output ('Rendered {0} using {1}' -f $script.id, $englishVoice.VoiceInfo.Name)
    }
} finally { $speechEngine.Dispose() }
