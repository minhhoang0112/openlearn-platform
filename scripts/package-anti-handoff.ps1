$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$handoffPaths = @(
    'docs/BE-NEXT.md',
    'docs/BE-WORKLOG.md',
    'docs/RELEASE-CLOSEOUT.md',
    'docs/release-browser-validation.json',
    'docs/UPGRADE-V2-MATERIALS.md',
    'docs/UPGRADE-V2-MATERIAL-CUES.md',
    'docs/UPGRADE-V2-SUBTITLES.md',
    'docs/material-cues-ui-validation.json',
    'docs/material-audio-validation.json',
    'docs/UPGRADE-V2-PLAN.md',
    'docs/UPGRADE-V2-HANDOFF.md',
    'docs/UPGRADE-V2-STATUS.md',
    'docs/UPGRADE-V2-API.md',
    'docs/UPGRADE-V2-MISTAKES.md',
    'docs/UPGRADE-V2-PROGRESS.md',
    'docs/UPGRADE-V2-CHECKPOINT.md',
    'docs/UPGRADE-V2-AI-FEEDBACK.md',
    'docs/UPGRADE-V2-LISTENING.md',
    'docs/UPGRADE-V2-CONTENT-03.md',
    'docs/UPGRADE-V2-CONTENT-04.md',
    'docs/UPGRADE-V2-CONTENT-05.md',
    'docs/UPGRADE-V2-CONTENT-06.md',
    'docs/UPGRADE-V2-CONTENT-07.md',
    'docs/UPGRADE-V2-AUDIO-REVIEWS.md',
    'docs/UPGRADE-V2-PHRASES.md',
    'docs/learning-audio-live-validation.json',
    'docs/LEARNING-CURRICULUM.md',
    'docs/learning-curriculum-inventory.json',
    'docs/UPGRADE-V2-LISTENING-AUDIT.md',
    'docs/v2-browser-listening-audit.json',
    'docs/learning-feedback-live-validation.json',
    'docs/learning-v2-validation.json',
    'docs/v2-browser-integration.json',
    'docs/ANTI-BE-HANDOFF.md',
    'docs/ANTI-FUNCTIONAL-HANDOFF.md',
    'docs/STUDY-LOGIC-CONTRACT.md',
    'docs/EXERCISE-FE-HANDOFF.md',
    'docs/CONVERSATION-SPEAKING-CONTRACT.md',
    'docs/PERSONAL-APP-HANDOFF.md',
    'docs/AI-SETUP.md',
    'docs/API-CONTRACT.md',
    'docs/API-ROUTES.md',
    'docs/openapi.json',
    'docs/backend-validation-2026-10-21.json',
    'docs/current-ai-connection.json',
    'docs/live-functional-validation.json',
    'docs/live-ai-validation.json',
    'docs/study-browser-qa.json',
    'docs/functional-browser-qa.json',
    'docs/flashcard-details-validation.json',
    'docs/verified-content-inventory.json',
    'docs/anti-reference'
)
# Only explicit documents, screenshots and sanitized reports. Never env, DB or profile.
Compress-Archive -Path $handoffPaths -DestinationPath 'docs/ANTI-HANDOFF.zip' -Force
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::OpenRead((Join-Path $projectRoot 'docs/ANTI-HANDOFF.zip'))
try {
    $entries = @($archive.Entries | ForEach-Object { $_.FullName })
    if ($entries | Where-Object { $_ -match '(^|[/\\])(\.env|openquiz\.sqlite|\.rea-browser-profile)([/\\]|$)' }) {
        throw 'Unexpected sensitive path in handoff archive.'
    }
    if (-not ($entries -contains 'ANTI-BE-HANDOFF.md')) { throw 'Missing primary handoff.' }
    Write-Output ('Packaged {0} entries; start with BE-NEXT.md, then the referenced feature contract.' -f $entries.Count)
} finally { $archive.Dispose() }
