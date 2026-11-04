$ErrorActionPreference = "Stop"
$utf8 = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = $utf8
$OutputEncoding = $utf8

function Write-BridgeJson($payload) {
  $json = $payload | ConvertTo-Json -Depth 6 -Compress
  [Console]::Out.Write($json)
}

try {
  Add-Type -AssemblyName System.Runtime.WindowsRuntime

  $asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq "AsTask" -and
    $_.GetParameters().Count -eq 1 -and
    $_.GetParameters()[0].ParameterType.Name -eq "IAsyncOperation``1"
  })[0]

  function Await-WinRt($operation, $resultType) {
    $asTask = $asTaskGeneric.MakeGenericMethod($resultType)
    $netTask = $asTask.Invoke($null, @($operation))
    $netTask.Wait(-1) | Out-Null
    $netTask.Result
  }

  $managerType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]
  $manager = Await-WinRt ($managerType::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])

  $sessions = @()

  foreach ($session in $manager.GetSessions()) {
    try {
      $properties = Await-WinRt ($session.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
      $playback = $session.GetPlaybackInfo()
      $timeline = $session.GetTimelineProperties()
      $duration = ($timeline.EndTime - $timeline.StartTime).TotalSeconds
      if ($duration -lt 0) { $duration = 0 }

      $sessions += [pscustomobject]@{
        appId         = [string]$session.SourceAppUserModelId
        title         = [string]$properties.Title
        artist        = [string]$properties.Artist
        album         = [string]$properties.AlbumTitle
        status        = [string]$playback.PlaybackStatus
        position      = [math]::Round([math]::Max(0, $timeline.Position.TotalSeconds), 3)
        duration      = [math]::Round($duration, 3)
        lastUpdatedAt = $timeline.LastUpdatedTime.ToUnixTimeMilliseconds()
      }
    } catch {
      # A session can disappear mid-query; skip it.
    }
  }

  Write-BridgeJson ([pscustomobject]@{
    supported = $true
    fetchedAt = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    sessions  = @($sessions)
  })
} catch {
  Write-BridgeJson ([pscustomobject]@{
    supported = $false
    fetchedAt = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    sessions  = @()
    error     = [string]$_.Exception.Message
  })
}
