[CmdletBinding()]
param(
    [ValidateSet('Check', 'Plan', 'Install', 'Verify')]
    [string]$Mode = 'Check'
)

$ErrorActionPreference = 'Stop'
$TargetDistro = 'Ubuntu'
$MinimumSupportedBuild = 19041

function Test-RepoWindowsHost {
    return ($env:OS -eq 'Windows_NT')
}

function Get-RepoWindowsBuild {
    try {
        return [Environment]::OSVersion.Version.Build
    } catch {
        return 0
    }
}

function Test-RepoAdministrator {
    if (-not (Test-RepoWindowsHost)) {
        return $false
    }
    try {
        $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
        $principal = New-Object Security.Principal.WindowsPrincipal($identity)
        return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    } catch {
        return $false
    }
}

function Get-RepoWslPath {
    $command = Get-Command wsl.exe -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }
    return $null
}

function Convert-RepoWslLine([object]$Value) {
    return (($Value.ToString()) -replace "`0", '').TrimEnd()
}

function Invoke-RepoWsl([string]$Path, [string[]]$Arguments) {
    $raw = @(& $Path @Arguments 2>&1)
    $code = $LASTEXITCODE
    $lines = @($raw | ForEach-Object { Convert-RepoWslLine $_ })
    return [pscustomobject]@{
        ExitCode = $code
        Lines = $lines
    }
}

function Get-RepoWslInventory([string]$Path) {
    $quiet = Invoke-RepoWsl $Path @('--list', '--quiet')
    if ($quiet.ExitCode -ne 0) {
        return [pscustomobject]@{
            Available = $false
            Reason = 'WSL_LIST_FAILED'
            Distros = @()
        }
    }

    $names = @($quiet.Lines | ForEach-Object { $_.Trim() } | Where-Object { $_ })
    if ($names.Count -eq 0) {
        return [pscustomobject]@{
            Available = $true
            Reason = 'NO_DISTRO'
            Distros = @()
        }
    }

    $verbose = Invoke-RepoWsl $Path @('--list', '--verbose')
    if ($verbose.ExitCode -ne 0) {
        return [pscustomobject]@{
            Available = $false
            Reason = 'WSL_VERBOSE_LIST_FAILED'
            Distros = @()
        }
    }

    $distros = @()
    foreach ($name in $names) {
        $version = $null
        $escaped = [regex]::Escape($name)
        foreach ($line in $verbose.Lines) {
            if ($line -match ("^\s*\*?\s*" + $escaped + "\s+.*\s+(?<Version>[12])\s*$")) {
                $version = [int]$Matches['Version']
                break
            }
        }
        $distros += [pscustomobject]@{
            Name = $name
            Version = $version
        }
    }

    return [pscustomobject]@{
        Available = $true
        Reason = 'OK'
        Distros = $distros
    }
}

function Select-RepoUbuntuDistro([object[]]$Distros) {
    $candidates = @(
        $Distros |
            Where-Object { $_.Name -eq 'Ubuntu' -or $_.Name -like 'Ubuntu-*' } |
            Sort-Object @{ Expression = { if ($_.Name -eq 'Ubuntu') { 0 } else { 1 } } }, Name
    )
    if ($candidates.Count -eq 0) {
        return $null
    }
    return $candidates[0]
}

function Test-RepoUbuntuRunnable([string]$Path, [string]$DistroName) {
    $probe = Invoke-RepoWsl $Path @(
        '--distribution', $DistroName,
        '--exec', '/bin/sh', '-c', 'id -u'
    )
    if ($probe.ExitCode -ne 0) {
        return $false
    }
    $value = ($probe.Lines -join "`n").Trim()
    $uid = 0
    if (-not [int]::TryParse($value, [ref]$uid)) {
        return $false
    }
    return ($uid -gt 0)
}

function Get-RepoWslState {
    if (-not (Test-RepoWindowsHost)) {
        return [pscustomobject]@{ Status = 'UNSUPPORTED'; Reason = 'NON_WINDOWS'; Build = 0; WslPath = $null; Distro = $null }
    }

    $build = Get-RepoWindowsBuild
    if ($build -lt $MinimumSupportedBuild) {
        return [pscustomobject]@{ Status = 'UNSUPPORTED'; Reason = 'WINDOWS_BUILD_TOO_OLD'; Build = $build; WslPath = $null; Distro = $null }
    }

    $wsl = Get-RepoWslPath
    if (-not $wsl) {
        return [pscustomobject]@{ Status = 'UNSUPPORTED'; Reason = 'WSL_COMMAND_MISSING'; Build = $build; WslPath = $null; Distro = $null }
    }

    $inventory = Get-RepoWslInventory $wsl
    if (-not $inventory.Available) {
        return [pscustomobject]@{ Status = 'UNKNOWN'; Reason = $inventory.Reason; Build = $build; WslPath = $wsl; Distro = $null }
    }

    $ubuntu = Select-RepoUbuntuDistro $inventory.Distros
    if (-not $ubuntu) {
        return [pscustomobject]@{ Status = 'MISSING'; Reason = 'UBUNTU_NOT_REGISTERED'; Build = $build; WslPath = $wsl; Distro = $null }
    }
    if ($null -eq $ubuntu.Version) {
        return [pscustomobject]@{ Status = 'UNKNOWN'; Reason = 'DISTRO_VERSION_UNKNOWN'; Build = $build; WslPath = $wsl; Distro = $ubuntu }
    }
    if ($ubuntu.Version -eq 1) {
        return [pscustomobject]@{ Status = 'MANUAL_BOUNDARY'; Reason = 'UBUNTU_WSL1'; Build = $build; WslPath = $wsl; Distro = $ubuntu }
    }

    return [pscustomobject]@{ Status = 'REGISTERED'; Reason = 'UBUNTU_WSL2_REGISTERED'; Build = $build; WslPath = $wsl; Distro = $ubuntu }
}

function Write-RepoWslState([object]$State) {
    Write-Output "status=$($State.Status)"
    Write-Output "reason=$($State.Reason)"
    if ($State.Build) {
        Write-Output "windows_build=$($State.Build)"
    }
    if ($State.Distro) {
        Write-Output "distro=$($State.Distro.Name)"
        if ($null -ne $State.Distro.Version) {
            Write-Output "wsl_version=$($State.Distro.Version)"
        }
    }
}

$state = Get-RepoWslState

switch ($Mode) {
    'Check' {
        Write-RepoWslState $state
        exit 0
    }
    'Plan' {
        switch ($state.Status) {
            'REGISTERED' {
                Write-Output 'action=NOOP'
                Write-Output 'reason=UBUNTU_WSL2_REGISTERED'
                Write-Output "distro=$($state.Distro.Name)"
                Write-Output 'next=VERIFY'
                exit 0
            }
            'MANUAL_BOUNDARY' {
                Write-Output 'action=MANUAL_BOUNDARY'
                Write-Output "reason=$($state.Reason)"
                if ($state.Distro) { Write-Output "distro=$($state.Distro.Name)" }
                exit 0
            }
            'UNSUPPORTED' {
                Write-Output 'action=UNAVAILABLE'
                Write-Output "reason=$($state.Reason)"
                exit 4
            }
            'UNKNOWN' {
                Write-Output 'action=UNKNOWN'
                Write-Output "reason=$($state.Reason)"
                exit 4
            }
            default {
                Write-Output 'action=INSTALL'
                Write-Output 'route=official-wsl-install'
                Write-Output "distro=$TargetDistro"
                if (-not (Test-RepoAdministrator)) {
                    Write-Output 'requires_admin=true'
                }
                exit 0
            }
        }
    }
    'Verify' {
        if ($state.Status -eq 'REGISTERED') {
            if (Test-RepoUbuntuRunnable $state.WslPath $state.Distro.Name) {
                Write-Output 'status=SATISFIED'
                Write-Output 'reason=READY'
                Write-Output "distro=$($state.Distro.Name)"
                Write-Output 'wsl_version=2'
                Write-Output 'shell_probe=PASS'
                exit 0
            }
            Write-Output 'status=MANUAL_BOUNDARY'
            Write-Output 'reason=UBUNTU_NOT_INITIALIZED_OR_NOT_RUNNABLE'
            Write-Output "distro=$($state.Distro.Name)"
            exit 3
        }
        Write-RepoWslState $state
        if ($state.Status -eq 'MANUAL_BOUNDARY') { exit 3 }
        exit 4
    }
    'Install' {
        if ($state.Status -eq 'REGISTERED') {
            Write-Output 'action=NOOP'
            Write-Output 'reason=UBUNTU_WSL2_REGISTERED'
            Write-Output "distro=$($state.Distro.Name)"
            Write-Output 'next=VERIFY'
            exit 0
        }
        if ($state.Status -eq 'MANUAL_BOUNDARY') {
            Write-Output 'action=MANUAL_BOUNDARY'
            Write-Output "reason=$($state.Reason)"
            if ($state.Distro) { Write-Output "distro=$($state.Distro.Name)" }
            exit 3
        }
        if ($state.Status -eq 'UNSUPPORTED' -or $state.Status -eq 'UNKNOWN') {
            Write-RepoWslState $state
            exit 4
        }
        if (-not (Test-RepoAdministrator)) {
            [Console]::Error.WriteLine('WSL installation requires an elevated PowerShell according to the supported Microsoft installation path.')
            exit 4
        }

        $wsl = Get-RepoWslPath
        if (-not $wsl) {
            [Console]::Error.WriteLine('wsl.exe is unavailable. This bootstrap does not enable Windows features or use legacy/manual installers as a hidden fallback.')
            exit 4
        }

        & $wsl --install --distribution $TargetDistro --no-launch
        $installCode = $LASTEXITCODE
        if ($installCode -ne 0) {
            [Console]::Error.WriteLine("Official WSL installation failed with exit code $installCode. No fallback was attempted.")
            exit 5
        }

        Write-Output 'action=INSTALL_REQUESTED'
        Write-Output "distro=$TargetDistro"
        Write-Output 'next=RESTART_OR_INITIALIZE_IF_REQUIRED_THEN_VERIFY'
        exit 0
    }
}
