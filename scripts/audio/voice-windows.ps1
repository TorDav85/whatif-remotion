param(
  [string]$Scenario = 'src/videos/paris-tiktok/scenario.json',
  [switch]$ListVoices
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
  if ($ListVoices) {
    $speaker.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo | Select-Object Name, Culture }
    return
  }
  $config = Get-Content -LiteralPath $Scenario -Raw -Encoding UTF8 | ConvertFrom-Json
  $french = @($speaker.GetInstalledVoices() | Where-Object { $_.Enabled -and $_.VoiceInfo.Culture.Name -eq 'fr-FR' })
  if ($french.Count -eq 0) { throw 'Aucune voix francaise Windows disponible.' }
  $speaker.SelectVoice($french[0].VoiceInfo.Name)
  $speaker.Volume = 100
  $target = Join-Path (Get-Location) ('public/' + $config.audio.voiceDir)
  New-Item -ItemType Directory -Path $target -Force | Out-Null
  $metadata = @()
  for ($i = 0; $i -lt $config.beats.Count; $i++) {
    $beat = $config.beats[$i]
    if (-not $beat.voice) { continue }
    $text = $beat.voice -replace '[{}]', ''
    $output = Join-Path $target ('beat-' + $i + '.wav')
    $budget = [double]$beat.end - [double]$beat.t - 0.12
    for ($rate = 1; $rate -le 5; $rate++) {
      $speaker.Rate = $rate
      $format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(44100, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
      $speaker.SetOutputToWaveFile($output, $format)
      $speaker.Speak($text)
      $speaker.SetOutputToNull()
      $reader = New-Object System.IO.BinaryReader([System.IO.File]::OpenRead($output))
      try {
        $reader.BaseStream.Position = 12
        $duration = 0.0
        while ($reader.BaseStream.Position + 8 -le $reader.BaseStream.Length) {
          $chunk = [System.Text.Encoding]::ASCII.GetString($reader.ReadBytes(4))
          $size = $reader.ReadUInt32()
          if ($chunk -eq 'data') { $duration = $size / 88200.0; break }
          $reader.BaseStream.Position += $size + ($size % 2)
        }
      } finally { $reader.Close() }
      if ($duration -le $budget) { break }
    }
    if ($duration -gt $budget) { throw "La phrase $i depasse son plan : $duration > $budget" }
    $metadata += [PSCustomObject]@{beat=$i;start=$beat.t;duration=[Math]::Round($duration,3);rate=$rate;voice=$speaker.Voice.Name;text=$text}
    Write-Output ('Voix {0}: {1:N2}s / {2:N2}s' -f $i,$duration,$budget)
  }
  $metadata | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $target 'timing.json') -Encoding UTF8
  $config.audio.voice = $true
  [System.IO.File]::WriteAllText((Resolve-Path -LiteralPath $Scenario).Path, ($config | ConvertTo-Json -Depth 100) + [Environment]::NewLine, (New-Object System.Text.UTF8Encoding($false)))
} finally { $speaker.Dispose() }
