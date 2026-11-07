param(
  [Parameter(Mandatory=$true)][ValidateSet("mdns","known-hosts","connected","connect")][string]$Mode,
  [Parameter(Mandatory=$true)][ValidateSet("M","S")][string]$Profile
)
$ErrorActionPreference = "Stop"
$MaxPacket = 4096
$MaxPackets = 16
$MaxKnownHostsBytes = 16384

function Emit([hashtable]$value) {
  $value | ConvertTo-Json -Compress -Depth 5
}
function Fail([string]$reason) {
  Emit @{ok=$false; reason=$reason}
  exit 2
}
function Get-Adb {
  $root = $env:LOCALAPPDATA
  if ([string]::IsNullOrWhiteSpace($root)) { Fail "LOCALAPPDATA_MISSING" }
  $adb = Join-Path $root "Android\platform-tools\adb.exe"
  if (!(Test-Path -LiteralPath $adb -PathType Leaf)) { Fail "ADB_MISSING" }
  return $adb
}
function Encode-Name([string]$name) {
  $bytes = New-Object System.Collections.Generic.List[byte]
  foreach ($label in $name.TrimEnd('.').Split('.')) {
    $raw = [System.Text.Encoding]::ASCII.GetBytes($label)
    if ($raw.Length -lt 1 -or $raw.Length -gt 63) { Fail "DNS_LABEL_INVALID" }
    $bytes.Add([byte]$raw.Length)
    foreach ($b in $raw) { $bytes.Add($b) }
  }
  $bytes.Add(0)
  return $bytes.ToArray()
}
function Capture-Mdns {
  $service = "_adb-tls-connect._tcp.local."
  $client = New-Object System.Net.Sockets.UdpClient
  try {
    $client.Client.SetSocketOption([System.Net.Sockets.SocketOptionLevel]::Socket,[System.Net.Sockets.SocketOptionName]::ReuseAddress,$true)
    $client.Client.Bind((New-Object System.Net.IPEndPoint([System.Net.IPAddress]::Any,0)))
    $client.Client.ReceiveTimeout = 300
    $q = New-Object System.Collections.Generic.List[byte]
    foreach ($b in [byte[]](0,0,0,0,0,1,0,0,0,0,0,0)) { $q.Add($b) }
    foreach ($b in (Encode-Name $service)) { $q.Add($b) }
    foreach ($b in [byte[]](0,12,0,1)) { $q.Add($b) }
    $dst = New-Object System.Net.IPEndPoint([System.Net.IPAddress]::Parse("224.0.0.251"),5353)
    [void]$client.Send($q.ToArray(),$q.Count,$dst)
    $deadline = [DateTime]::UtcNow.AddSeconds(3)
    $packets = New-Object System.Collections.Generic.List[string]
    while ([DateTime]::UtcNow -lt $deadline -and $packets.Count -lt $MaxPackets) {
      try {
        $remote = New-Object System.Net.IPEndPoint([System.Net.IPAddress]::Any,0)
        $data = $client.Receive([ref]$remote)
        if ($data.Length -lt 12 -or $data.Length -gt $MaxPacket) { continue }
        if (($data[2] -band 0x80) -eq 0) { continue }
        $packets.Add([Convert]::ToBase64String($data))
      } catch [System.Net.Sockets.SocketException] {
        if ($_.Exception.SocketErrorCode -ne [System.Net.Sockets.SocketError]::TimedOut) { throw }
      }
    }
    Emit @{ok=$true; packets=@($packets)}
  } finally {
    $client.Dispose()
  }
}
function Read-KnownHosts {
  $userHome = $env:USERPROFILE
  if ([string]::IsNullOrWhiteSpace($userHome)) { Fail "USERPROFILE_MISSING" }
  $path = Join-Path $userHome ".android\adb_known_hosts.pb"
  if (!(Test-Path -LiteralPath $path -PathType Leaf)) { Fail "KNOWN_HOSTS_MISSING" }
  $bytes = [IO.File]::ReadAllBytes($path)
  if ($bytes.Length -lt 1 -or $bytes.Length -gt $MaxKnownHostsBytes) { Fail "KNOWN_HOSTS_SIZE" }
  Emit @{ok=$true; data=[Convert]::ToBase64String($bytes)}
}
function Connected {
  $adb = Get-Adb
  $lines = & $adb devices 2>$null
  if ($LASTEXITCODE -ne 0) { Fail "ADB_DEVICES_FAILED" }
  $rows = @()
  foreach ($line in ($lines | Select-Object -Skip 1)) {
    if ($line -notmatch "\sdevice\s*$") { continue }
    $serial = ($line -split "\s+")[0]
    if ([string]::IsNullOrWhiteSpace($serial) -or $serial.Length -gt 255) { Fail "ADB_SERIAL_INVALID" }
    $model = ((& $adb -s $serial shell getprop ro.product.model 2>$null) -join "").Trim()
    if ($LASTEXITCODE -ne 0 -or $model.Length -gt 64) { Fail "ADB_MODEL_FAILED" }
    $rows += [PSCustomObject]@{serial=$serial; model=$model}
  }
  if ($rows.Count -gt 16) { Fail "ADB_ROW_LIMIT" }
  Emit @{ok=$true; rows=@($rows)}
}
function Connect-Exact {
  $adb = Get-Adb
  $endpoint = [Console]::In.ReadToEnd().Trim()
  if ($endpoint.Length -lt 3 -or $endpoint.Length -gt 128) { Fail "ENDPOINT_INVALID" }
  $ipv4 = '^([0-9]{1,3}\.){3}[0-9]{1,3}:[0-9]{1,5}$'
  $ipv6 = '^\[[0-9A-Fa-f:]+\]:[0-9]{1,5}$'
  if ($endpoint -notmatch $ipv4 -and $endpoint -notmatch $ipv6) { Fail "ENDPOINT_INVALID" }
  & $adb connect $endpoint *> $null
  $model = ((& $adb -s $endpoint shell getprop ro.product.model 2>$null) -join "").Trim()
  if ($LASTEXITCODE -ne 0 -or $model.Length -gt 64) { Fail "ADB_MODEL_FAILED" }
  Emit @{ok=$true; model=$model}
}

try {
  switch ($Mode) {
    "mdns" { Capture-Mdns }
    "known-hosts" { Read-KnownHosts }
    "connected" { Connected }
    "connect" { Connect-Exact }
  }
} catch {
  Fail "WINDOWS_TRANSPORT_ERROR"
}
