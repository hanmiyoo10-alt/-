[CmdletBinding()]
param(
    [ValidateSet('Check', 'Plan', 'Install', 'Verify')]
    [string]$Mode = 'Check',

    [ValidateSet('Auto', 'Wix')]
    [string]$InstallerType = 'Auto',

    [int]$MinimumMajor = 7
)

$ErrorActionPreference = 'Stop'
$PrefixTag = '[repo-pwsh]'

function Write-RepoPwshLog([string]$Message) {
    Write-Host "$PrefixTag $Message"
}

function Refresh-ProcessPath {
    $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $user = [Environment]::GetEnvironmentVariable('Path', 'User')
    $env:Path = @($machine, $user) -join ';'
}

function Get-RepoPwshInfo {
    $candidate = Get-Command pwsh.exe -ErrorAction SilentlyContinue
    if (-not $candidate) {
        $known = Join-Path $env:ProgramFiles 'PowerShell\7\pwsh.exe'
        if (Test-Path -LiteralPath $known) {
            $candidate = Get-Item -LiteralPath $known
        }
    }
    if (-not $candidate) {
        return $null
    }

    $path = if ($candidate.Source) { $candidate.Source } else { $candidate.FullName }
    try {
        $versionText = (& $path -NoLogo -NoProfile -Command '$PSVersionTable.PSVersion.ToString()' 2>$null | Select-Object -First 1)
        $version = [Version]$versionText
    } catch {
        return $null
    }

    [pscustomobject]@{
        Path = $path
        Version = $version
        Satisfied = ($version.Major -ge $MinimumMajor)
    }
}

function Write-RepoPwshStatus {
    $info = Get-RepoPwshInfo
    if ($info -and $info.Satisfied) {
        Write-Output 'status=SATISFIED'
        Write-Output 'support=SUPPORTED'
        Write-Output 'route=windows-winget'
        Write-Output "path=$($info.Path)"
        Write-Output "version=$($info.Version)"
    } else {
        Write-Output 'status=MISSING'
        Write-Output 'support=SUPPORTED'
        Write-Output 'route=windows-winget'
    }
}

$info = Get-RepoPwshInfo

switch ($Mode) {
    'Check' {
        Write-RepoPwshStatus
        exit 0
    }
    'Plan' {
        if ($info -and $info.Satisfied) {
            Write-Output 'action=NOOP'
            Write-Output 'reason=ALREADY_SATISFIED'
            Write-Output "path=$($info.Path)"
            Write-Output "version=$($info.Version)"
        } else {
            Write-Output 'action=INSTALL'
            Write-Output 'support=SUPPORTED'
            Write-Output 'route=windows-winget'
            Write-Output "installer_type=$InstallerType"
        }
        exit 0
    }
    'Verify' {
        if ($info -and $info.Satisfied) {
            Write-Output 'status=SATISFIED'
            Write-Output "path=$($info.Path)"
            Write-Output "version=$($info.Version)"
            exit 0
        }
        Write-Error "PowerShell $MinimumMajor+ is not available."
        exit 3
    }
    'Install' {
        # Idempotence barrier: never call WinGet when an adequate pwsh already exists.
        if ($info -and $info.Satisfied) {
            Write-Output 'action=NOOP'
            Write-Output 'reason=ALREADY_SATISFIED'
            Write-Output "path=$($info.Path)"
            Write-Output "version=$($info.Version)"
            exit 0
        }

        $winget = Get-Command winget.exe -ErrorAction SilentlyContinue
        if (-not $winget) {
            Write-Error 'winget.exe is unavailable. Use the official Microsoft MSI/MSIX package manually for this host.'
            exit 4
        }

        $arguments = @(
            'install',
            '--id', 'Microsoft.PowerShell',
            '--source', 'winget',
            '--accept-package-agreements',
            '--accept-source-agreements',
            '--disable-interactivity'
        )
        if ($InstallerType -eq 'Wix') {
            $arguments += @('--installer-type', 'wix')
        }

        & $winget.Source @arguments
        if ($LASTEXITCODE -ne 0) {
            Write-Error "WinGet PowerShell installation failed with exit code $LASTEXITCODE."
            exit 5
        }

        Refresh-ProcessPath
        $installed = Get-RepoPwshInfo
        if ($installed -and $installed.Satisfied) {
            Write-Output 'action=INSTALLED'
            Write-Output "path=$($installed.Path)"
            Write-Output "version=$($installed.Version)"
            exit 0
        }

        Write-Error 'Installation returned success, but pwsh could not be verified in the current process. Restart the shell and run Verify.'
        exit 5
    }
}
