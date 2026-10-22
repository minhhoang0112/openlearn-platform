param([switch]$OnlyMissing)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$projectRoot = Split-Path -Parent $PSScriptRoot
$contentRoot = Join-Path $projectRoot 'server/content/learning-v2'
$audioRoot = Join-Path $contentRoot 'media/sentences'
New-Item -ItemType Directory -Path $audioRoot -Force | Out-Null
$speechEngine = New-Object System.Speech.Synthesis.SpeechSynthesizer
$rendered = 0
try {
    $speechEngine.SelectVoice('Microsoft David Desktop')
    $speechEngine.Rate = -2
    $speechEngine.Volume = 100
    $tracks = Get-Content -LiteralPath (Join-Path $contentRoot 'sentence-manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
    foreach ($track in $tracks) {
        if ($track.lesson_id -notmatch '^[a-z0-9-]+$' -or $track.content_version -lt 1) { throw 'Invalid track.' }
        foreach ($sentence in $track.sentences) {
            if ($sentence.id -notmatch '^s\d{2}$') { throw 'Invalid sentence.' }
            $name = '{0}-v{1}-{2}.wav' -f $track.lesson_id, $track.content_version, $sentence.id
            $audioPath = Join-Path $audioRoot $name
            if ($OnlyMissing -and (Test-Path -LiteralPath $audioPath)) { continue }
            $speechEngine.SetOutputToWaveFile($audioPath)
            $speechEngine.Speak($sentence.text)
            $speechEngine.SetOutputToNull()
            $rendered++
        }
    }
    Write-Output ('Rendered {0} saved sentence clips; existing clips preserved when OnlyMissing is set.' -f $rendered)
} finally { $speechEngine.Dispose() }
