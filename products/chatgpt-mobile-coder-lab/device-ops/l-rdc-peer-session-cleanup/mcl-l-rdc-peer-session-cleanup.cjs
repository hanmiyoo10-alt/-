#!/usr/bin/env node
'use strict';

const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sessionEvidence = require('../l-rdc-session-evidence/mcl-l-rdc-session-evidence.cjs');

const SCHEMA = 'mcl-l-rdc-peer-session-cleanup.v1';
const OWNER = 'mcl-l-rdc-peer-session-cleanup';
const POWERSHELL = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
const CONFIRM_FLAG = '--confirm-no-other-intentional-l-rdc-work';
const MAX_ANCESTOR_DEPTH = 16;
const MAX_EFFECT_TARGETS = 32;
const MAX_EFFECT_HANDLES = 64;
const EFFECT_WAIT_PER_TARGET_MS = 2000;
const EFFECT_EVENT_DRAIN_MS = 2000;
const EFFECT_STARTUP_MARGIN_MS = 15000;
const EFFECT_RESULT_MARGIN_MS = 3000;
const PROCESS_READ_TIMEOUT_MS = 7000;
const EFFECT_MAX_BUFFER = 128 * 1024;
const EFFECT_TEMP_PREFIX = 'mcl-rdc-peer-cleanup-';
const WINDOWS_EPOCH_FILETIME = 116444736000000000n;
const FILETIME_TICKS_PER_MS = 10000n;
const WSL_PYTHON = '/usr/bin/python3';
const WSL_PROC_ROOT = '/proc';
const WSL_HELPER_TIMEOUT_MS = 7000;
const WSL_HELPER_MAX_BUFFER = 64 * 1024;

const PRIVATE_OBSERVER_SOURCE = [
  "$ErrorActionPreference='Stop'",
  "$utf8=New-Object System.Text.UTF8Encoding($false)",
  "[Console]::OutputEncoding=$utf8",
  "$OutputEncoding=$utf8",
  "$rows=@(Get-CimInstance Win32_Process | Where-Object {$_.ProcessId -gt 0} | ForEach-Object {$created=[DateTimeOffset]$_.CreationDate; [pscustomobject]@{ProcessId=$_.ProcessId;ParentProcessId=$_.ParentProcessId;Name=$_.Name;CommandLine=$_.CommandLine;CreationTimeMs=$created.ToUnixTimeMilliseconds();CreationFileTime=([string]$created.UtcDateTime.ToFileTimeUtc())}})",
  "$rows | ConvertTo-Json -Compress -Depth 3",
].join(';');
const PRIVATE_OBSERVER_ARGS = Object.freeze([
  '-NoLogo',
  '-NoProfile',
  '-NonInteractive',
  '-EncodedCommand',
  Buffer.from(PRIVATE_OBSERVER_SOURCE, 'utf16le').toString('base64'),
]);

const HANDLE_HELPER_CSHARP = String.raw`
using System;
using System.ComponentModel;
using System.Globalization;
using System.Runtime.InteropServices;

public static class MclPeerCleanupNative {
  [StructLayout(LayoutKind.Sequential)]
  public struct FILETIME {
    public uint dwLowDateTime;
    public uint dwHighDateTime;
  }

  [DllImport("kernel32.dll", SetLastError=true)]
  public static extern IntPtr OpenProcess(uint desiredAccess, bool inheritHandle, int processId);

  [DllImport("kernel32.dll", SetLastError=true)]
  public static extern bool GetProcessTimes(
    IntPtr process,
    out FILETIME creation,
    out FILETIME exit,
    out FILETIME kernel,
    out FILETIME user);

  [DllImport("kernel32.dll", SetLastError=true)]
  public static extern bool TerminateProcess(IntPtr process, uint exitCode);

  [DllImport("kernel32.dll", SetLastError=true)]
  public static extern uint WaitForSingleObject(IntPtr handle, uint milliseconds);

  [DllImport("kernel32.dll", SetLastError=true)]
  public static extern bool CloseHandle(IntPtr handle);

  public static string CreationFileTime(IntPtr handle) {
    FILETIME creation, exit, kernel, user;
    if (!GetProcessTimes(handle, out creation, out exit, out kernel, out user)) {
      throw new Win32Exception(Marshal.GetLastWin32Error());
    }
    ulong value = ((ulong)creation.dwHighDateTime << 32) | creation.dwLowDateTime;
    value = (value / 10UL) * 10UL;
    return value.ToString(CultureInfo.InvariantCulture);
  }

  public static bool IsAlive(IntPtr handle) {
    const uint WAIT_TIMEOUT = 0x00000102;
    if (WaitForSingleObject(handle, 0) != WAIT_TIMEOUT) return false;
    FILETIME creation, exit, kernel, user;
    if (!GetProcessTimes(handle, out creation, out exit, out kernel, out user)) {
      throw new Win32Exception(Marshal.GetLastWin32Error());
    }
    return exit.dwLowDateTime == 0 && exit.dwHighDateTime == 0;
  }
}
`;
const HANDLE_HELPER_CSHARP_B64 = Buffer.from(HANDLE_HELPER_CSHARP, 'utf8').toString('base64');
const HANDLE_HELPER_SOURCE = [
  "$ErrorActionPreference='Stop'",
  "$utf8=New-Object System.Text.UTF8Encoding($false)",
  "[Console]::OutputEncoding=$utf8",
  "$OutputEncoding=$utf8",
  "$sourceId='mclPeerCleanup_'+[guid]::NewGuid().ToString('N')",
  "$opened=New-Object System.Collections.ArrayList",
  "$result=$null",
  "$subscribed=$false",
  "$attempted=0",
  "$terminated=0",
  "$monitoringComplete=$false",
  "try {",
  "  Register-WmiEvent -Class Win32_ProcessStartTrace -SourceIdentifier $sourceId -ErrorAction Stop | Out-Null",
  "  $subscribed=$true",
  "$src=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('" + HANDLE_HELPER_CSHARP_B64 + "'))",
  "  Add-Type -TypeDefinition $src -Language CSharp -ErrorAction Stop",
  "  $payload=([Console]::In.ReadToEnd() | ConvertFrom-Json)",
  "  $anchors=@($payload.anchors)",
  "  $targets=@($payload.targets)",
  "  if($targets.Count -lt 1 -or $targets.Count -gt " + String(MAX_EFFECT_TARGETS) + " -or ($anchors.Count+$targets.Count) -gt " + String(MAX_EFFECT_HANDLES) + "){$result=[ordered]@{status='BLOCKED';reasonCode='HANDLE_HELPER_INPUT_INVALID';attemptedCount=0;terminatedCount=0}}",
  "  if($null -eq $result){",
  "    $snap=@(Get-CimInstance Win32_Process | Where-Object {$_.ProcessId -gt 0} | ForEach-Object {$created=[DateTimeOffset]$_.CreationDate;$ft=[int64]$created.UtcDateTime.ToFileTimeUtc();[pscustomobject]@{ProcessId=[int]$_.ProcessId;ParentProcessId=[int]$_.ParentProcessId;Name=([string]$_.Name).ToLowerInvariant();CreationFileTime=[string]($ft-($ft%10))}})",
  "    $byPid=@{}",
  "    foreach($row in $snap){if($byPid.ContainsKey([int]$row.ProcessId)){$result=[ordered]@{status='UNKNOWN';reasonCode='TARGET_TREE_SNAPSHOT_AMBIGUOUS';attemptedCount=0;terminatedCount=0};break};$byPid[[int]$row.ProcessId]=$row}",
  "  }",
  "  if($null -eq $result){",
  "    $targetByPid=@{}",
  "    foreach($g in $targets){$targetByPid[[int]$g.pid]=$g}",
  "    foreach($g in $targets){",
  "      $targetProcessId=[int]$g.pid",
  "      if(-not $byPid.ContainsKey($targetProcessId)){$result=[ordered]@{status='BLOCKED';reasonCode='TARGET_GUARD_DRIFT_BEFORE_EFFECT';attemptedCount=0;terminatedCount=0};break}",
  "      $row=$byPid[$targetProcessId]",
  "      if([int]$row.ParentProcessId -ne [int]$g.ppid -or ([string]$row.Name).ToLowerInvariant() -ne ([string]$g.name).ToLowerInvariant() -or [string]$row.CreationFileTime -ne [string]$g.creationFileTime){$result=[ordered]@{status='BLOCKED';reasonCode='TARGET_GUARD_DRIFT_BEFORE_EFFECT';attemptedCount=0;terminatedCount=0};break}",
  "    }",
  "  }",
  "  if($null -eq $result){",
  "    $lineage=New-Object 'System.Collections.Generic.HashSet[int]'",
  "    $queue=New-Object 'System.Collections.Generic.Queue[int]'",
  "    foreach($g in $targets){if([int]$g.depth -eq 0){[void]$lineage.Add([int]$g.pid);$queue.Enqueue([int]$g.pid)}}",
  "    while($queue.Count -gt 0 -and $null -eq $result){",
  "      $parentPid=$queue.Dequeue()",
  "      $parent=$byPid[$parentPid]",
  "      foreach($child in @($snap | Where-Object {[int]$_.ParentProcessId -eq $parentPid})){",
  "        if([int64]$child.CreationFileTime -lt [int64]$parent.CreationFileTime){$result=[ordered]@{status='BLOCKED';reasonCode='TARGET_DESCENDANT_RELATION_INVALID';attemptedCount=0;terminatedCount=0};break}",
  "        $childPid=[int]$child.ProcessId",
  "        if($lineage.Add($childPid)){",
  "          if(-not $targetByPid.ContainsKey($childPid)){$result=[ordered]@{status='BLOCKED';reasonCode='TARGET_TREE_EXPANDED_BEFORE_EFFECT';attemptedCount=0;terminatedCount=0};break}",
  "          $queue.Enqueue($childPid)",
  "        }",
  "      }",
  "    }",
  "    if($null -eq $result){foreach($g in $targets){if(-not $lineage.Contains([int]$g.pid)){$result=[ordered]@{status='BLOCKED';reasonCode='TARGET_TREE_DISCONNECTED_BEFORE_EFFECT';attemptedCount=0;terminatedCount=0};break}}}",
  "  }",
  "  if($null -eq $result){",
  "    $items=@()",
  "    foreach($g in $anchors){$items += [pscustomobject]@{Guard=$g;Target=$false}}",
  "    foreach($g in $targets){$items += [pscustomobject]@{Guard=$g;Target=$true}}",
  "    foreach($item in $items){",
  "      $access=[uint32](0x00100000 -bor 0x00001000)",
  "      if($item.Target){$access=[uint32]($access -bor 0x00000001)}",
  "      $h=[MclPeerCleanupNative]::OpenProcess($access,$false,[int]$item.Guard.pid)",
  "      if($h -eq [IntPtr]::Zero){$result=[ordered]@{status='BLOCKED';reasonCode='HANDLE_OPEN_FAILED';attemptedCount=0;terminatedCount=0};break}",
  "      $actual=[MclPeerCleanupNative]::CreationFileTime($h)",
  "      if($actual -ne [string]$item.Guard.creationFileTime){[void][MclPeerCleanupNative]::CloseHandle($h);$result=[ordered]@{status='BLOCKED';reasonCode='HANDLE_IDENTITY_MISMATCH';attemptedCount=0;terminatedCount=0};break}",
  "      [void]$opened.Add([pscustomobject]@{Handle=$h;Target=$item.Target;Depth=[int]$item.Guard.depth})",
  "    }",
  "  }",
  "  if($null -eq $result){",
  "    foreach($entry in @($opened | Where-Object {-not $_.Target})){if(-not [MclPeerCleanupNative]::IsAlive($entry.Handle)){$result=[ordered]@{status='BLOCKED';reasonCode='ANCHOR_NOT_LIVE';attemptedCount=0;terminatedCount=0};break}}",
  "  }",
  "  if($null -eq $result){",
  "    foreach($entry in @($opened | Where-Object {$_.Target} | Sort-Object Depth -Descending)){",
  "      $attempted++",
  "      if(-not [MclPeerCleanupNative]::TerminateProcess($entry.Handle,1)){$result=[ordered]@{status='PARTIAL';reasonCode='HANDLE_TERMINATE_FAILED';attemptedCount=$attempted;terminatedCount=$terminated};break}",
  "      $terminated++",
  "      $wait=[MclPeerCleanupNative]::WaitForSingleObject($entry.Handle," + String(EFFECT_WAIT_PER_TARGET_MS) + ")",
  "      if($wait -ne 0){$result=[ordered]@{status='PARTIAL';reasonCode='HANDLE_TERMINATION_WAIT_TIMEOUT';attemptedCount=$attempted;terminatedCount=$terminated};break}",
  "    }",
  "  }",
  "  if($attempted -gt 0){",
  "    try {",
  "      Start-Sleep -Milliseconds " + String(EFFECT_EVENT_DRAIN_MS),
  "      $events=@(Get-Event -ErrorAction Stop | Where-Object {$_.SourceIdentifier -eq $sourceId})",
  "      $lineage=New-Object 'System.Collections.Generic.HashSet[int]'",
  "      foreach($g in $targets){[void]$lineage.Add([int]$g.pid)}",
  "      $late=New-Object 'System.Collections.Generic.HashSet[int]'",
  "      $changed=$true",
  "      while($changed){$changed=$false;foreach($ev in $events){$eventProcessId=[int]$ev.SourceEventArgs.NewEvent.ProcessID;$eventParentProcessId=[int]$ev.SourceEventArgs.NewEvent.ParentProcessID;if($lineage.Contains($eventParentProcessId) -and $lineage.Add($eventProcessId)){[void]$late.Add($eventProcessId);$changed=$true}}}",
  "      $monitoringComplete=$true",
  "      if($late.Count -gt 0){$result=[ordered]@{status='PARTIAL';reasonCode='LATE_DESCENDANT_OBSERVED';attemptedCount=$attempted;terminatedCount=$terminated}}",
  "    } catch {",
  "      $result=[ordered]@{status='UNKNOWN';reasonCode='DESCENDANT_MONITORING_INCOMPLETE';attemptedCount=$attempted;terminatedCount=$terminated}",
  "    }",
  "  }",
  "  if($null -eq $result){$result=[ordered]@{status='COMPLETE';reasonCode='HANDLE_TREE_TERMINATION_COMPLETE';attemptedCount=$attempted;terminatedCount=$terminated}}",
  "} catch {",
  "  if($null -eq $result){$result=[ordered]@{status='UNKNOWN';reasonCode='HANDLE_HELPER_FAILED';attemptedCount=$attempted;terminatedCount=$terminated}}",
  "} finally {",
  "  foreach($entry in $opened){[void][MclPeerCleanupNative]::CloseHandle($entry.Handle)}",
  "  if($subscribed){Unregister-Event -SourceIdentifier $sourceId -ErrorAction SilentlyContinue;Get-Event -SourceIdentifier $sourceId -ErrorAction SilentlyContinue | Remove-Event -ErrorAction SilentlyContinue}",
  "}",
  "if($null -ne $result){$result['monitoringComplete']=[bool]$monitoringComplete}",
  "$result | ConvertTo-Json -Compress -Depth 3",
].join(';');
const HANDLE_HELPER_ARGS = Object.freeze([
  '-NoLogo',
  '-NoProfile',
  '-NonInteractive',
  '-EncodedCommand',
  Buffer.from(HANDLE_HELPER_SOURCE, 'utf16le').toString('base64'),
]);
const WSL_PIDFD_HELPER_SOURCE = [
  'import json',
  'import os',
  'import select',
  'import signal',
  'import sys',
  'import time',
  '',
  'PROC = "/proc"',
  'STOP_WAIT_SECONDS = 1.5',
  'EXIT_WAIT_MS = 2000',
  '',
  'def emit(status, reason, attempted=0, terminated=0, monitoring=False, resumed=False):',
  '    print(json.dumps({"status": status, "reasonCode": reason, "attemptedCount": attempted, "terminatedCount": terminated, "monitoringComplete": bool(monitoring), "resumed": bool(resumed)}, separators=(",", ":")))',
  '    raise SystemExit(0)',
  '',
  'def read_stat(pid):',
  '    with open(PROC + "/" + str(pid) + "/stat", "r", encoding="utf-8") as handle:',
  '        value = handle.read()',
  '    end = value.rfind(")")',
  '    if end < 0:',
  '        raise ValueError("STAT_INVALID")',
  '    fields = value[end + 2:].strip().split()',
  '    if len(fields) < 20:',
  '        raise ValueError("STAT_INVALID")',
  '    return {"state": fields[0], "ppid": int(fields[1]), "startTicks": fields[19]}',
  '',
  'def valid_guard(value):',
  '    return isinstance(value, dict) and set(value) == {"pid", "ppid", "startTicks"} and isinstance(value["pid"], int) and value["pid"] > 0 and isinstance(value["ppid"], int) and value["ppid"] >= 0 and isinstance(value["startTicks"], str) and value["startTicks"].isdigit()',
  '',
  'def guard_matches(value):',
  '    observed = read_stat(value["pid"])',
  '    return observed["ppid"] == value["ppid"] and observed["startTicks"] == value["startTicks"]',
  '',
  'def direct_children(parent_pid):',
  '    found = []',
  '    for name in os.listdir(PROC):',
  '        if not name.isdigit():',
  '            continue',
  '        pid = int(name)',
  '        if pid <= 0:',
  '            continue',
  '        try:',
  '            observed = read_stat(pid)',
  '        except FileNotFoundError:',
  '            continue',
  '        if observed["ppid"] == parent_pid:',
  '            found.append(pid)',
  '    return sorted(found)',
  '',
  'try:',
  '    payload = json.load(sys.stdin)',
  'except Exception:',
  '    emit("UNKNOWN", "WSL_PIDFD_HELPER_INPUT_INVALID")',
  '',
  'if not isinstance(payload, dict) or set(payload) != {"agent", "currentRoot", "peer"} or not all(valid_guard(payload.get(key)) for key in ("agent", "currentRoot", "peer")):',
  '    emit("BLOCKED", "WSL_PIDFD_HELPER_INPUT_INVALID")',
  '',
  'agent = payload["agent"]',
  'root = payload["currentRoot"]',
  'peer = payload["peer"]',
  'fds = {}',
  'peer_stopped = False',
  'kill_sent = False',
  '',
  'try:',
  '    for key in ("agent", "currentRoot", "peer"):',
  '        try:',
  '            fds[key] = os.pidfd_open(payload[key]["pid"], 0)',
  '        except Exception:',
  '            emit("BLOCKED", "WSL_PIDFD_OPEN_FAILED")',
  '',
  '    try:',
  '        if not all(guard_matches(payload[key]) for key in ("agent", "currentRoot", "peer")):',
  '            emit("BLOCKED", "WSL_GUARD_DRIFT_BEFORE_STOP")',
  '        if direct_children(agent["pid"]) != sorted([root["pid"], peer["pid"]]):',
  '            emit("BLOCKED", "WSL_TOPOLOGY_DRIFT_BEFORE_STOP")',
  '        if direct_children(peer["pid"]):',
  '            emit("BLOCKED", "WSL_PEER_DESCENDANT_PRESENT")',
  '    except Exception:',
  '        emit("UNKNOWN", "WSL_GUARD_READ_FAILED")',
  '',
  '    try:',
  '        signal.pidfd_send_signal(fds["peer"], signal.SIGSTOP, None, 0)',
  '        peer_stopped = True',
  '    except Exception:',
  '        emit("UNKNOWN", "WSL_STOP_FAILED")',
  '',
  '    deadline = time.monotonic() + STOP_WAIT_SECONDS',
  '    stopped = False',
  '    while time.monotonic() < deadline:',
  '        try:',
  '            if read_stat(peer["pid"])["state"] in ("T", "t"):',
  '                stopped = True',
  '                break',
  '        except FileNotFoundError:',
  '            break',
  '        except Exception:',
  '            break',
  '        time.sleep(0.02)',
  '',
  '    if not stopped:',
  '        try:',
  '            signal.pidfd_send_signal(fds["peer"], signal.SIGCONT, None, 0)',
  '            peer_stopped = False',
  '            emit("UNKNOWN", "WSL_STOP_NOT_OBSERVED", resumed=True)',
  '        except Exception:',
  '            emit("UNKNOWN", "WSL_CONTINUE_FAILED")',
  '',
  '    frozen_ok = False',
  '    try:',
  '        frozen_ok = all(guard_matches(payload[key]) for key in ("agent", "currentRoot", "peer")) and direct_children(agent["pid"]) == sorted([root["pid"], peer["pid"]]) and direct_children(peer["pid"]) == []',
  '    except Exception:',
  '        frozen_ok = False',
  '',
  '    if not frozen_ok:',
  '        try:',
  '            signal.pidfd_send_signal(fds["peer"], signal.SIGCONT, None, 0)',
  '            peer_stopped = False',
  '            emit("BLOCKED", "WSL_FROZEN_TOPOLOGY_DRIFT", resumed=True)',
  '        except Exception:',
  '            emit("UNKNOWN", "WSL_CONTINUE_FAILED")',
  '',
  '    try:',
  '        signal.pidfd_send_signal(fds["peer"], signal.SIGKILL, None, 0)',
  '        kill_sent = True',
  '    except Exception:',
  '        try:',
  '            signal.pidfd_send_signal(fds["peer"], signal.SIGCONT, None, 0)',
  '            peer_stopped = False',
  '            emit("UNKNOWN", "WSL_KILL_FAILED", attempted=1, monitoring=True, resumed=True)',
  '        except Exception:',
  '            emit("UNKNOWN", "WSL_CONTINUE_FAILED", attempted=1, monitoring=True)',
  '',
  '    poller = select.poll()',
  '    poller.register(fds["peer"], select.POLLIN)',
  '    if not poller.poll(EXIT_WAIT_MS):',
  '        emit("UNKNOWN", "WSL_PIDFD_EXIT_TIMEOUT", attempted=1, monitoring=True)',
  '',
  '    emit("COMPLETE", "WSL_PIDFD_PEER_TERMINATION_COMPLETE", attempted=1, terminated=1, monitoring=True)',
  'except SystemExit:',
  '    raise',
  'except Exception:',
  '    emit("UNKNOWN", "WSL_PIDFD_HELPER_FAILED")',
  'finally:',
  '    if peer_stopped and not kill_sent and "peer" in fds:',
  '        try:',
  '            signal.pidfd_send_signal(fds["peer"], signal.SIGCONT, None, 0)',
  '        except Exception:',
  '            pass',
  '    for fd in fds.values():',
  '        try:',
  '            os.close(fd)',
  '        except Exception:',
  '            pass',
].join('\n');
const WSL_PIDFD_HELPER_ARGS = Object.freeze(['-c', WSL_PIDFD_HELPER_SOURCE]);

const WSL_PIDFD_RESUME_SOURCE = [
  'import json',
  'import os',
  'import signal',
  'import sys',
  '',
  'def read_stat(pid):',
  '    with open("/proc/" + str(pid) + "/stat", "r", encoding="utf-8") as handle:',
  '        value = handle.read()',
  '    end = value.rfind(")")',
  '    if end < 0:',
  '        raise ValueError("STAT_INVALID")',
  '    fields = value[end + 2:].strip().split()',
  '    if len(fields) < 20:',
  '        raise ValueError("STAT_INVALID")',
  '    return {"ppid": int(fields[1]), "startTicks": fields[19]}',
  '',
  'try:',
  '    peer = json.load(sys.stdin)',
  '    if not isinstance(peer, dict) or set(peer) != {"pid", "ppid", "startTicks"}:',
  '        print(json.dumps({"status":"FAILED"}, separators=(",", ":")))',
  '        raise SystemExit(0)',
  '    fd = os.pidfd_open(peer["pid"], 0)',
  'except ProcessLookupError:',
  '    print(json.dumps({"status":"NOT_PRESENT"}, separators=(",", ":")))',
  '    raise SystemExit(0)',
  'except Exception:',
  '    print(json.dumps({"status":"FAILED"}, separators=(",", ":")))',
  '    raise SystemExit(0)',
  '',
  'try:',
  '    observed = read_stat(peer["pid"])',
  '    if observed["ppid"] != peer["ppid"] or observed["startTicks"] != peer["startTicks"]:',
  '        print(json.dumps({"status":"DRIFT"}, separators=(",", ":")))',
  '    else:',
  '        signal.pidfd_send_signal(fd, signal.SIGCONT, None, 0)',
  '        print(json.dumps({"status":"RESUMED"}, separators=(",", ":")))',
  'except ProcessLookupError:',
  '    print(json.dumps({"status":"NOT_PRESENT"}, separators=(",", ":")))',
  'except Exception:',
  '    print(json.dumps({"status":"FAILED"}, separators=(",", ":")))',
  'finally:',
  '    try:',
  '        os.close(fd)',
  '    except Exception:',
  '        pass',
].join('\n');
const WSL_PIDFD_RESUME_ARGS = Object.freeze(['-c', WSL_PIDFD_RESUME_SOURCE]);

const FALSE_AUTHORITY = Object.freeze({
  repositoryMutationAuthorized: false,
  deviceMutationAuthorized: false,
  mergeAuthorized: false,
  releaseAuthorized: false,
  productionAuthorized: false,
});

function publicReceipt({
  status = 'UNKNOWN',
  operation = 'inspect',
  effectEligibility = 'UNKNOWN',
  effectDisposition = 'NOT_RUN',
  peerShellCount = 0,
  cleanupCandidateCount = 0,
  blockedCandidateCount = 0,
  effectCount = 0,
  remainingPeerShellCount = 0,
  reasonCode = 'RDC_PEER_CLEANUP_TOPOLOGY_UNKNOWN',
} = {}) {
  return {
    schema: SCHEMA,
    status,
    executor: 'L',
    operation,
    effectEligibility,
    effectDisposition,
    peerShellCount,
    cleanupCandidateCount,
    blockedCandidateCount,
    effectCount,
    remainingPeerShellCount,
    reasonCode,
    owner: OWNER,
    details: 'withheld',
    authority: {...FALSE_AUTHORITY},
  };
}

function unknown(reasonCode, counts = {}) {
  return {
    status: 'UNKNOWN',
    effectEligibility: 'UNKNOWN',
    reasonCode,
    peerShellCount: counts.peerShellCount || 0,
    cleanupCandidateCount: counts.cleanupCandidateCount || 0,
    blockedCandidateCount: counts.blockedCandidateCount || 0,
    context: null,
  };
}

function blocked(reasonCode, counts = {}) {
  return {
    status: 'BLOCKED',
    effectEligibility: 'BLOCKED',
    reasonCode,
    peerShellCount: counts.peerShellCount || 0,
    cleanupCandidateCount: counts.cleanupCandidateCount || 0,
    blockedCandidateCount: counts.blockedCandidateCount || 0,
    context: null,
  };
}

function hasAmbiguousAncestorStructure(byPid, self) {
  const seen = new Set([self.pid]);
  let current = self;
  for (let depth = 0; depth < MAX_ANCESTOR_DEPTH; depth += 1) {
    if (current.ppid <= 0) return false;
    const parent = byPid.get(current.ppid);
    if (!parent) return false;
    if (seen.has(parent.pid)) return true;
    seen.add(parent.pid);
    current = parent;
  }
  return current.ppid > 0 && byPid.has(current.ppid);
}

function buildCurrentContext(rows, selfPid) {
  if (!Array.isArray(rows) || !Number.isSafeInteger(selfPid) || selfPid <= 0) {
    return {error: 'CURRENT_CONTEXT_INVALID'};
  }
  const byPid = new Map();
  for (const row of rows) {
    if (!row || !Number.isSafeInteger(row.pid) || byPid.has(row.pid)) {
      return {error: 'CURRENT_CONTEXT_INVALID'};
    }
    byPid.set(row.pid, row);
  }
  const self = byPid.get(selfPid);
  if (!self || hasAmbiguousAncestorStructure(byPid, self)) {
    return {error: 'CURRENT_CONTEXT_AMBIGUOUS'};
  }

  const chain = [self];
  const seen = new Set([self.pid]);
  let current = self;
  for (let depth = 1; depth < MAX_ANCESTOR_DEPTH && current.ppid > 0; depth += 1) {
    const parent = byPid.get(current.ppid);
    if (!parent) break;
    if (seen.has(parent.pid)) return {error: 'CURRENT_CONTEXT_AMBIGUOUS'};
    if (!sessionEvidence.validParentLink(parent, current)) break;
    seen.add(parent.pid);
    chain.push(parent);
    current = parent;
  }

  const candidates = [];
  for (let index = 1; index < chain.length; index += 1) {
    const agent = chain[index];
    const directChild = chain[index - 1];
    if (sessionEvidence.hasAgentMarker(agent)
        && sessionEvidence.SHELL_NAMES.has(directChild.name)
        && sessionEvidence.validParentLink(agent, directChild)) {
      candidates.push({agent, currentRoot: directChild});
    }
  }
  if (candidates.length !== 1) return {error: 'CURRENT_AGENT_AMBIGUOUS'};
  return {
    error: null,
    byPid,
    chain,
    chainPids: new Set(chain.map((row) => row.pid)),
    agent: candidates[0].agent,
    currentRoot: candidates[0].currentRoot,
  };
}

function sameLineageAgentPids(rows, chain, currentAgent) {
  const currentIndex = chain.findIndex((row) => row.pid === currentAgent.pid);
  if (currentIndex < 0) return {state: 'UNKNOWN', reasonCode: 'CURRENT_LINEAGE_AMBIGUOUS'};

  const agentPids = new Set([currentAgent.pid]);
  let expectedChild = currentAgent;
  for (let index = currentIndex + 1; index < chain.length; index += 1) {
    const ancestor = chain[index];
    if (!sessionEvidence.hasAgentMarker(ancestor)) break;
    if (!sessionEvidence.validParentLink(ancestor, expectedChild)) {
      return {state: 'UNKNOWN', reasonCode: 'CURRENT_LINEAGE_AMBIGUOUS'};
    }
    const direct = sessionEvidence.directChildrenForAgent(rows, ancestor);
    if (direct.state !== 'EXACT'
        || direct.children.filter((child) => child.pid === expectedChild.pid).length !== 1) {
      return {state: 'UNKNOWN', reasonCode: 'CURRENT_LINEAGE_AMBIGUOUS'};
    }
    for (const child of direct.children) {
      if (child.pid === expectedChild.pid) continue;
      if (sessionEvidence.SHELL_NAMES.has(child.name)) {
        return {state: 'BLOCKED', reasonCode: 'WRAPPER_PEER_SESSION_PRESENT'};
      }
      if (sessionEvidence.BENIGN_DIRECT_CHILDREN.has(child.name)) continue;
      return {state: 'UNKNOWN', reasonCode: 'CURRENT_LINEAGE_AMBIGUOUS'};
    }
    agentPids.add(ancestor.pid);
    expectedChild = ancestor;
  }
  return {state: 'PASS', agentPids};
}

function descendantRows(rows, rootPid) {
  const byPid = new Map(rows.map((row) => [row.pid, row]));
  const childrenByParent = new Map();
  for (const row of rows) {
    if (!childrenByParent.has(row.ppid)) childrenByParent.set(row.ppid, []);
    childrenByParent.get(row.ppid).push(row);
  }
  const root = byPid.get(rootPid);
  if (!root) return {state: 'UNKNOWN', rows: []};
  const seen = new Set([rootPid]);
  const queue = [root];
  const out = [];
  while (queue.length) {
    const parent = queue.shift();
    for (const child of childrenByParent.get(parent.pid) || []) {
      if (!sessionEvidence.validParentLink(parent, child)
          || seen.has(child.pid)
          || out.length >= MAX_EFFECT_TARGETS - 1) {
        return {state: 'UNKNOWN', rows: []};
      }
      seen.add(child.pid);
      out.push(child);
      queue.push(child);
    }
  }
  return {state: 'EXACT', rows: out};
}

function candidateShape(rows, agent, chainPids, peer) {
  if (!sessionEvidence.SHELL_NAMES.has(peer.name)
      || !sessionEvidence.validParentLink(agent, peer)
      || chainPids.has(peer.pid)) {
    return {eligible: false, reasonCode: 'PEER_TARGET_RELATION_BLOCKED'};
  }

  const direct = rows.filter((row) => row.ppid === peer.pid);
  if (direct.some((row) => !sessionEvidence.validParentLink(peer, row))) {
    return {eligible: false, reasonCode: 'PEER_CHILD_RELATION_BLOCKED'};
  }
  const names = direct.map((row) => row.name).sort();
  if (names.length !== 2 || names[0] !== 'conhost.exe' || names[1] !== 'wsl.exe') {
    return {eligible: false, reasonCode: 'PEER_TREE_SHAPE_BLOCKED'};
  }

  const descendants = descendantRows(rows, peer.pid);
  if (descendants.state !== 'EXACT') {
    return {eligible: false, reasonCode: 'PEER_DESCENDANT_TOPOLOGY_AMBIGUOUS'};
  }
  const markerDescendant = descendants.rows.some((row) => sessionEvidence.hasAgentMarker(row));
  const unreadableAgentLike = descendants.rows.some((row) => (
    row.name === agent.name && row.commandLineReadable === false
  ));
  if (markerDescendant || unreadableAgentLike) {
    return {eligible: false, reasonCode: 'PEER_DESCENDANT_AGENT_AMBIGUOUS'};
  }
  return {eligible: true, reasonCode: 'PEER_ELIGIBLE'};
}

function fileTimeToUnixMs(value) {
  if (typeof value !== 'string' || !/^[0-9]{15,20}$/.test(value)) {
    throw new Error('CREATION_FILETIME_INVALID');
  }
  const raw = BigInt(value);
  if (raw < WINDOWS_EPOCH_FILETIME) throw new Error('CREATION_FILETIME_INVALID');
  const unixMs = (raw - WINDOWS_EPOCH_FILETIME) / FILETIME_TICKS_PER_MS;
  if (unixMs > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('CREATION_FILETIME_INVALID');
  return Number(unixMs);
}

function parsePrivateProcessTable(text) {
  const rows = sessionEvidence.parseProcessTable(text);
  const body = String(text || '').replace(/^\uFEFF/, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error('PRIVATE_PROCESS_TABLE_JSON_INVALID');
  }
  const rawRows = Array.isArray(parsed) ? parsed : [parsed];
  if (rawRows.length !== rows.length) throw new Error('PRIVATE_PROCESS_TABLE_SIZE_INVALID');
  const rawByPid = new Map();
  for (const raw of rawRows) {
    const pid = Number(raw?.ProcessId);
    if (!Number.isSafeInteger(pid) || rawByPid.has(pid)) {
      throw new Error('PRIVATE_PROCESS_TABLE_PID_INVALID');
    }
    rawByPid.set(pid, raw);
  }
  return rows.map((row) => {
    const raw = rawByPid.get(row.pid);
    const creationFileTime = typeof raw?.CreationFileTime === 'string'
      ? raw.CreationFileTime
      : String(raw?.CreationFileTime || '');
    if (fileTimeToUnixMs(creationFileTime) !== row.creationTimeMs) {
      throw new Error('PRIVATE_CREATION_IDENTITY_MISMATCH');
    }
    const normalizedCreationFileTime = String((BigInt(creationFileTime) / 10n) * 10n);
    return {...row, creationFileTime: normalizedCreationFileTime};
  });
}

function defaultRunner() {
  const result = childProcess.spawnSync(POWERSHELL, PRIVATE_OBSERVER_ARGS, {
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
    timeout: PROCESS_READ_TIMEOUT_MS,
    maxBuffer: 4 * 1024 * 1024,
    env: {},
  });
  return {
    code: Number.isInteger(result.status) ? result.status : 127,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    signal: result.signal || null,
    error: result.error || null,
  };
}

function guardFor(row, depth = 0) {
  if (typeof row?.creationFileTime !== 'string') {
    throw new Error('PRIVATE_CREATION_IDENTITY_REQUIRED');
  }
  return Object.freeze({
    pid: row.pid,
    ppid: row.ppid,
    name: row.name,
    creationTimeMs: row.creationTimeMs,
    creationFileTime: row.creationFileTime,
    depth,
  });
}

function sameGuard(row, guard) {
  return Boolean(row
    && row.pid === guard.pid
    && row.ppid === guard.ppid
    && row.name === guard.name
    && row.creationTimeMs === guard.creationTimeMs
    && row.creationFileTime === guard.creationFileTime);
}

function guardKey(guard) {
  return [
    guard.pid,
    guard.ppid,
    guard.name,
    guard.creationTimeMs,
    guard.creationFileTime,
  ].join(':');
}

function sameGuardSet(rows, guards) {
  const left = rows.map((row) => guardFor(row)).map(guardKey).sort();
  const right = guards.map(guardKey).sort();
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function candidateTree(rows, root) {
  const byParent = new Map();
  for (const row of rows) {
    if (!byParent.has(row.ppid)) byParent.set(row.ppid, []);
    byParent.get(row.ppid).push(row);
  }
  const queue = [{row: root, depth: 0}];
  const seen = new Set();
  const entries = [];
  while (queue.length) {
    const current = queue.shift();
    if (seen.has(current.row.pid) || entries.length >= MAX_EFFECT_TARGETS) {
      return {state: 'UNKNOWN', entries: []};
    }
    seen.add(current.row.pid);
    entries.push(current);
    for (const child of byParent.get(current.row.pid) || []) {
      if (!sessionEvidence.validParentLink(current.row, child)) {
        return {state: 'UNKNOWN', entries: []};
      }
      queue.push({row: child, depth: current.depth + 1});
    }
  }
  return {state: 'EXACT', entries};
}

function treeGuards(tree) {
  return tree.entries.map(({row, depth}) => guardFor(row, depth));
}

function flattenTreeGuards(trees) {
  return trees.flatMap((tree) => tree.guards);
}

function sameTreeSet(observedTrees, expectedTrees) {
  const observed = observedTrees.flatMap((tree) => treeGuards(tree)).map(guardKey).sort();
  const expected = flattenTreeGuards(expectedTrees).map(guardKey).sort();
  return observed.length === expected.length
    && observed.every((value, index) => value === expected[index]);
}

function classifyCleanupRows(rows, selfPid) {
  const sessionTopology = sessionEvidence.classifyProcessTable(rows, selfPid);
  if (sessionTopology.sessionState === 'UNKNOWN') {
    return unknown(sessionTopology.reasonCode || 'RDC_SESSION_EVIDENCE_UNKNOWN');
  }

  const current = buildCurrentContext(rows, selfPid);
  if (current.error) return unknown(current.error);

  const direct = sessionEvidence.directChildrenForAgent(rows, current.agent);
  if (direct.state !== 'EXACT'
      || direct.children.filter((row) => row.pid === current.currentRoot.pid).length !== 1) {
    return unknown('CURRENT_AGENT_DIRECT_TOPOLOGY_AMBIGUOUS');
  }

  const peers = [];
  for (const child of direct.children) {
    if (child.pid === current.currentRoot.pid) continue;
    if (sessionEvidence.SHELL_NAMES.has(child.name)) {
      peers.push(child);
      continue;
    }
    if (sessionEvidence.BENIGN_DIRECT_CHILDREN.has(child.name)) continue;
    return unknown('CURRENT_AGENT_DIRECT_TOPOLOGY_AMBIGUOUS');
  }

  const lineage = sameLineageAgentPids(rows, current.chain, current.agent);
  if (lineage.state === 'UNKNOWN') return unknown(lineage.reasonCode, {peerShellCount: peers.length});
  if (lineage.state === 'BLOCKED') return blocked(lineage.reasonCode, {peerShellCount: peers.length});

  const alternate = sessionEvidence.classifyAlternateAgents(rows, current.agent, lineage.agentPids);
  if (alternate.sessionState === 'UNKNOWN') {
    return unknown(alternate.reasonCode || 'ALTERNATE_AGENT_AMBIGUOUS', {peerShellCount: peers.length});
  }
  if (alternate.sessionState === 'PRESENT') {
    return blocked('ALTERNATE_RDC_SESSION_PRESENT', {peerShellCount: peers.length});
  }

  const anchorRows = [
    current.currentRoot,
    ...rows.filter((row) => lineage.agentPids.has(row.pid)),
  ].filter((row, index, values) => values.findIndex((item) => item.pid === row.pid) === index);

  if (peers.length === 0) {
    if (sessionTopology.sessionState !== 'ABSENT'
        || sessionTopology.reasonCode !== 'SOLE_RDC_COMMAND_SESSION') {
      return unknown('SESSION_EVIDENCE_CLEAN_CONTRADICTION');
    }
    return {
      status: 'PASS',
      effectEligibility: 'ALREADY_CLEAN',
      reasonCode: 'SOLE_RDC_COMMAND_SESSION',
      peerShellCount: 0,
      cleanupCandidateCount: 0,
      blockedCandidateCount: 0,
      context: {
        rows,
        agent: current.agent,
        currentRoot: current.currentRoot,
        anchors: anchorRows,
        candidates: [],
        candidateTrees: [],
      },
    };
  }

  if (sessionTopology.sessionState !== 'PRESENT'
      || sessionTopology.reasonCode !== 'OTHER_RDC_COMMAND_SESSION_PRESENT') {
    return unknown('SESSION_EVIDENCE_PRESENT_CONTRADICTION', {peerShellCount: peers.length});
  }

  const eligible = [];
  const eligibleTrees = [];
  let blockedCount = 0;
  let firstBlockedReason = null;
  for (const peer of peers) {
    const shape = candidateShape(rows, current.agent, current.chainPids, peer);
    const tree = candidateTree(rows, peer);
    if (shape.eligible && tree.state === 'EXACT') {
      eligible.push(peer);
      eligibleTrees.push(tree);
    } else {
      blockedCount += 1;
      if (!firstBlockedReason) {
        firstBlockedReason = shape.eligible
          ? 'PEER_DESCENDANT_TOPOLOGY_AMBIGUOUS'
          : shape.reasonCode;
      }
    }
  }
  if (blockedCount > 0) {
    return blocked(firstBlockedReason || 'PEER_TREE_SHAPE_BLOCKED', {
      peerShellCount: peers.length,
      cleanupCandidateCount: eligible.length,
      blockedCandidateCount: blockedCount,
    });
  }

  const order = eligible
    .map((row, index) => ({row, tree: eligibleTrees[index]}))
    .sort((left, right) => left.row.pid - right.row.pid);

  return {
    status: 'PASS',
    effectEligibility: 'ELIGIBLE',
    reasonCode: 'DIRECT_PEER_SHELLS_ELIGIBLE',
    peerShellCount: peers.length,
    cleanupCandidateCount: eligible.length,
    blockedCandidateCount: 0,
    context: {
      rows,
      agent: current.agent,
      currentRoot: current.currentRoot,
      anchors: anchorRows,
      candidates: order.map((item) => item.row),
      candidateTrees: order.map((item) => item.tree),
    },
  };
}

function parseWslStatText(text) {
  const value = String(text || '');
  const end = value.lastIndexOf(')');
  if (end < 0) throw new Error('WSL_STAT_INVALID');
  const fields = value.slice(end + 2).trim().split(/\s+/);
  const ppid = Number(fields[1]);
  const startTicks = fields[19];
  const state = fields[0];
  if (!Number.isSafeInteger(ppid) || ppid < 0
      || typeof startTicks !== 'string' || !/^[0-9]+$/.test(startTicks)
      || typeof state !== 'string' || state.length !== 1) {
    throw new Error('WSL_STAT_INVALID');
  }
  return {ppid, startTicks, state};
}

function defaultWslStatReader(procRoot, pid) {
  if (procRoot !== WSL_PROC_ROOT || !Number.isSafeInteger(pid) || pid <= 0) {
    throw new Error('WSL_STAT_INPUT_INVALID');
  }
  return parseWslStatText(fs.readFileSync(path.join(procRoot, String(pid), 'stat'), 'utf8'));
}

function wslGuardFor(row, {
  procRoot = WSL_PROC_ROOT,
  statReader = defaultWslStatReader,
} = {}) {
  if (!row || !Number.isSafeInteger(row.pid) || row.pid <= 0
      || !Number.isSafeInteger(row.ppid) || row.ppid < 0) {
    throw new Error('WSL_GUARD_ROW_INVALID');
  }
  const observed = statReader(procRoot, row.pid);
  if (!observed || observed.ppid !== row.ppid
      || typeof observed.startTicks !== 'string'
      || !/^[0-9]+$/.test(observed.startTicks)) {
    throw new Error('WSL_GUARD_IDENTITY_MISMATCH');
  }
  return Object.freeze({
    pid: row.pid,
    ppid: row.ppid,
    startTicks: observed.startTicks,
  });
}

function sameWslGuard(left, right) {
  return Boolean(left && right
    && left.pid === right.pid
    && left.ppid === right.ppid
    && left.startTicks === right.startTicks);
}

function buildWslCurrentContext(rows, selfPid) {
  const byPid = new Map();
  for (const row of rows) {
    if (!row || !Number.isSafeInteger(row.pid) || row.pid <= 0 || byPid.has(row.pid)) {
      return {error: 'WSL_CURRENT_CONTEXT_INVALID'};
    }
    byPid.set(row.pid, row);
  }
  const self = byPid.get(selfPid);
  if (!self) return {error: 'WSL_CURRENT_CONTEXT_AMBIGUOUS'};

  const chain = [self];
  const seen = new Set([self.pid]);
  let current = self;
  for (let depth = 1; depth < MAX_ANCESTOR_DEPTH && current.ppid > 0; depth += 1) {
    const parent = byPid.get(current.ppid);
    if (!parent) break;
    if (seen.has(parent.pid)) return {error: 'WSL_CURRENT_CONTEXT_AMBIGUOUS'};
    seen.add(parent.pid);
    chain.push(parent);
    current = parent;
  }
  if (current.ppid > 0 && byPid.has(current.ppid)) {
    return {error: 'WSL_CURRENT_CONTEXT_AMBIGUOUS'};
  }

  const candidates = [];
  for (let index = 1; index < chain.length; index += 1) {
    const identity = sessionEvidence.wslAgentIdentity(chain[index], byPid);
    if (identity) {
      candidates.push({agent: chain[index], currentRoot: chain[index - 1]});
    }
  }
  if (candidates.length !== 1) return {error: 'WSL_CURRENT_AGENT_AMBIGUOUS'};
  return {
    error: null,
    byPid,
    chain,
    agent: candidates[0].agent,
    currentRoot: candidates[0].currentRoot,
  };
}

function classifyWslCleanupRows(rows, selfPid, {
  procRoot = WSL_PROC_ROOT,
  statReader = defaultWslStatReader,
} = {}) {
  let normalizedRows;
  try {
    normalizedRows = rows.map((row) => sessionEvidence.normalizeWslRecord(row));
  } catch {
    return unknown('RDC_AGENT_TOPOLOGY_AMBIGUOUS');
  }
  const topology = sessionEvidence.classifyWslProcessTable(normalizedRows, selfPid);
  if (topology.sessionState === 'UNKNOWN') {
    return unknown(topology.reasonCode || 'RDC_AGENT_TOPOLOGY_AMBIGUOUS');
  }

  const current = buildWslCurrentContext(normalizedRows, selfPid);
  if (current.error) return unknown(current.error);

  const direct = normalizedRows.filter((row) => row.ppid === current.agent.pid);
  if (direct.filter((row) => row.pid === current.currentRoot.pid).length !== 1) {
    return unknown('WSL_CURRENT_ROOT_AMBIGUOUS');
  }
  const peers = direct.filter((row) => (
    row.pid !== current.currentRoot.pid
    && !sessionEvidence.isWslBenignDirectChild(row)
  ));

  let agentGuard;
  let currentRootGuard;
  try {
    agentGuard = wslGuardFor(current.agent, {procRoot, statReader});
    currentRootGuard = wslGuardFor(current.currentRoot, {procRoot, statReader});
  } catch {
    return unknown('WSL_GUARD_EVIDENCE_UNKNOWN', {peerShellCount: peers.length});
  }

  if (topology.sessionState === 'ABSENT') {
    if (peers.length !== 0 || topology.reasonCode !== 'SOLE_RDC_COMMAND_SESSION') {
      return unknown('WSL_SESSION_EVIDENCE_CLEAN_CONTRADICTION');
    }
    return {
      status: 'PASS',
      effectEligibility: 'ALREADY_CLEAN',
      reasonCode: 'SOLE_RDC_COMMAND_SESSION',
      peerShellCount: 0,
      cleanupCandidateCount: 0,
      blockedCandidateCount: 0,
      context: {
        rows,
        agent: current.agent,
        currentRoot: current.currentRoot,
        peer: null,
        agentGuard,
        currentRootGuard,
        peerGuard: null,
      },
    };
  }

  if (topology.sessionState !== 'PRESENT'
      || topology.reasonCode !== 'OTHER_RDC_COMMAND_SESSION_PRESENT') {
    return unknown('WSL_SESSION_EVIDENCE_PRESENT_CONTRADICTION', {
      peerShellCount: peers.length,
    });
  }
  if (peers.length !== 1) {
    return blocked('WSL_PEER_CARDINALITY_BLOCKED', {
      peerShellCount: peers.length,
      blockedCandidateCount: peers.length,
    });
  }
  if (direct.length !== 2) {
    return blocked('WSL_DIRECT_CHILD_SET_BLOCKED', {
      peerShellCount: peers.length,
      blockedCandidateCount: 1,
    });
  }
  const peer = peers[0];
  if (normalizedRows.some((row) => row.ppid === peer.pid)) {
    return blocked('WSL_PEER_DESCENDANT_PRESENT', {
      peerShellCount: 1,
      blockedCandidateCount: 1,
    });
  }

  let peerGuard;
  try {
    peerGuard = wslGuardFor(peer, {procRoot, statReader});
  } catch {
    return unknown('WSL_GUARD_EVIDENCE_UNKNOWN', {peerShellCount: 1});
  }

  return {
    status: 'PASS',
    effectEligibility: 'ELIGIBLE',
    reasonCode: 'WSL_SINGLE_PEER_LEAF_ELIGIBLE',
    peerShellCount: 1,
    cleanupCandidateCount: 1,
    blockedCandidateCount: 0,
    context: {
      rows: normalizedRows,
      agent: current.agent,
      currentRoot: current.currentRoot,
      peer,
      agentGuard,
      currentRootGuard,
      peerGuard,
    },
  };
}

function observeWsl({
  selfPid,
  cwd,
  osRelease,
  procRoot,
  wslReader,
  wslStatReader,
}) {
  if (!sessionEvidence.isLWorkspaceCwd(cwd) || !sessionEvidence.isWslRelease(osRelease)) {
    return {...unknown('EXECUTION_PROFILE_UNKNOWN'), rows: []};
  }
  let rows;
  try {
    rows = wslReader(procRoot);
  } catch {
    return {...unknown('RDC_PROCESS_READ_FAILED'), rows: []};
  }
  const classified = classifyWslCleanupRows(rows, selfPid, {
    procRoot,
    statReader: wslStatReader,
  });
  return {...classified, rows};
}

function validateWslGuard(value) {
  return Boolean(value
    && Number.isSafeInteger(value.pid) && value.pid > 0
    && Number.isSafeInteger(value.ppid) && value.ppid >= 0
    && typeof value.startTicks === 'string'
    && /^[0-9]+$/.test(value.startTicks));
}

function resumeWslPeerGuard(peer, {
  spawnSync = childProcess.spawnSync,
} = {}) {
  if (!validateWslGuard(peer)) return {status:'FAILED'};
  const result = spawnSync(WSL_PYTHON, WSL_PIDFD_RESUME_ARGS, {
    input: JSON.stringify(peer),
    encoding: 'utf8',
    shell: false,
    timeout: 2000,
    maxBuffer: 16 * 1024,
    env: {},
  });
  if (result?.error || result?.signal || (result?.status ?? 1) !== 0) {
    return {status:'FAILED'};
  }
  let parsed;
  try {
    parsed = JSON.parse(String(result.stdout || '').trim());
  } catch {
    return {status:'FAILED'};
  }
  if (!parsed || Object.keys(parsed).length !== 1
      || !['RESUMED','NOT_PRESENT','DRIFT','FAILED'].includes(parsed.status)) {
    return {status:'FAILED'};
  }
  return {status:parsed.status};
}

function defaultWslEffectRunner({agent, currentRoot, peer}, {
  spawnSync = childProcess.spawnSync,
} = {}) {
  if (![agent, currentRoot, peer].every(validateWslGuard)) {
    return {
      status: 'BLOCKED',
      reasonCode: 'WSL_PIDFD_HELPER_INPUT_INVALID',
      attemptedCount: 0,
      terminatedCount: 0,
      monitoringComplete: false,
      resumed: false,
      error: null,
      signal: null,
    };
  }

  const result = spawnSync(WSL_PYTHON, WSL_PIDFD_HELPER_ARGS, {
    input: JSON.stringify({agent, currentRoot, peer}),
    encoding: 'utf8',
    shell: false,
    timeout: WSL_HELPER_TIMEOUT_MS,
    maxBuffer: WSL_HELPER_MAX_BUFFER,
    env: {},
  });

  const timedOut = result?.error?.code === 'ETIMEDOUT' || result?.signal === 'SIGTERM';
  if (timedOut) {
    const recovery = resumeWslPeerGuard(peer, {spawnSync});
    const resumed = recovery.status === 'RESUMED';
    return {
      status: 'UNKNOWN',
      reasonCode: resumed
        ? 'WSL_PIDFD_HELPER_TIMEOUT_RESUMED'
        : 'WSL_PIDFD_HELPER_TIMEOUT_RECOVERY_UNPROVEN',
      attemptedCount: 0,
      terminatedCount: 0,
      monitoringComplete: false,
      resumed,
      error: result?.error || null,
      signal: result?.signal || null,
    };
  }
  if (result?.error || result?.signal) {
    const recovery = resumeWslPeerGuard(peer, {spawnSync});
    const resumed = recovery.status === 'RESUMED';
    return {
      status: 'UNKNOWN',
      reasonCode: resumed
        ? 'WSL_PIDFD_HELPER_FAILED_RESUMED'
        : 'WSL_PIDFD_HELPER_FAILED_RECOVERY_UNPROVEN',
      attemptedCount: 0,
      terminatedCount: 0,
      monitoringComplete: false,
      resumed,
      error: result?.error || null,
      signal: result?.signal || null,
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(String(result?.stdout || '').trim());
  } catch {
    parsed = null;
  }
  const expectedKeys = [
    'attemptedCount', 'monitoringComplete', 'reasonCode',
    'resumed', 'status', 'terminatedCount',
  ];
  const keys = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? Object.keys(parsed).sort()
    : [];
  const valid = parsed
    && JSON.stringify(keys) === JSON.stringify(expectedKeys)
    && ['COMPLETE', 'BLOCKED', 'UNKNOWN'].includes(parsed.status)
    && typeof parsed.reasonCode === 'string'
    && /^WSL_[A-Z0-9_]+$/.test(parsed.reasonCode)
    && Number.isSafeInteger(parsed.attemptedCount)
    && parsed.attemptedCount >= 0 && parsed.attemptedCount <= 1
    && Number.isSafeInteger(parsed.terminatedCount)
    && parsed.terminatedCount >= 0 && parsed.terminatedCount <= 1
    && typeof parsed.monitoringComplete === 'boolean'
    && typeof parsed.resumed === 'boolean';
  if (!valid) {
    return {
      status: 'UNKNOWN',
      reasonCode: 'WSL_PIDFD_HELPER_OUTPUT_INVALID',
      attemptedCount: 0,
      terminatedCount: 0,
      monitoringComplete: false,
      resumed: false,
      error: null,
      signal: null,
    };
  }
  return {...parsed, error: null, signal: null};
}

function sameWslAnchors(left, right) {
  return Boolean(left && right
    && sameWslGuard(left.agentGuard, right.agentGuard)
    && sameWslGuard(left.currentRootGuard, right.currentRootGuard));
}

function cleanupWslLocal({
  confirm = false,
  platform = process.platform,
  arch = process.arch,
  selfPid = process.pid,
  cwd = process.cwd(),
  osRelease = os.release(),
  procRoot = WSL_PROC_ROOT,
  wslReader = sessionEvidence.defaultWslReader,
  wslStatReader = defaultWslStatReader,
  wslEffectRunner = defaultWslEffectRunner,
} = {}) {
  if (!confirm) {
    return publicReceipt({
      status: 'BLOCKED',
      operation: 'cleanup',
      effectEligibility: 'BLOCKED',
      effectDisposition: 'BLOCKED',
      reasonCode: 'OPERATOR_IDLE_CONFIRMATION_REQUIRED',
    });
  }

  const observeNow = () => observe({
    platform, arch, selfPid, cwd, osRelease, procRoot,
    wslReader, wslStatReader,
  });
  const initial = observeNow();
  if (initial.effectEligibility === 'ALREADY_CLEAN') {
    return publicReceipt({
      status: 'PASS',
      operation: 'cleanup',
      effectEligibility: 'ALREADY_CLEAN',
      effectDisposition: 'NO_EFFECT',
      reasonCode: 'SOLE_RDC_COMMAND_SESSION',
    });
  }
  if (initial.effectEligibility !== 'ELIGIBLE' || !initial.context) {
    return publicReceipt({
      status: initial.status,
      operation: 'cleanup',
      effectEligibility: initial.effectEligibility,
      effectDisposition: initial.status === 'UNKNOWN' ? 'UNKNOWN' : 'BLOCKED',
      peerShellCount: initial.peerShellCount,
      cleanupCandidateCount: initial.cleanupCandidateCount,
      blockedCandidateCount: initial.blockedCandidateCount,
      remainingPeerShellCount: initial.peerShellCount,
      reasonCode: initial.reasonCode,
    });
  }

  const expected = initial.context;
  const pre = observeNow();
  if (pre.effectEligibility !== 'ELIGIBLE' || !pre.context
      || !sameWslAnchors(pre.context, expected)
      || !sameWslGuard(pre.context.peerGuard, expected.peerGuard)) {
    return publicReceipt({
      status: pre.status === 'UNKNOWN' ? 'UNKNOWN' : 'BLOCKED',
      operation: 'cleanup',
      effectEligibility: pre.status === 'UNKNOWN' ? 'UNKNOWN' : 'BLOCKED',
      effectDisposition: pre.status === 'UNKNOWN' ? 'UNKNOWN' : 'BLOCKED',
      peerShellCount: initial.peerShellCount,
      cleanupCandidateCount: initial.cleanupCandidateCount,
      remainingPeerShellCount: pre.peerShellCount,
      reasonCode: pre.status === 'UNKNOWN'
        ? pre.reasonCode
        : 'TARGET_GUARD_DRIFT_BEFORE_EFFECT',
    });
  }

  let effectResult;
  try {
    effectResult = wslEffectRunner({
      agent: pre.context.agentGuard,
      currentRoot: pre.context.currentRootGuard,
      peer: pre.context.peerGuard,
    });
  } catch {
    effectResult = {
      status: 'UNKNOWN',
      reasonCode: 'WSL_PIDFD_HELPER_FAILED',
      attemptedCount: 0,
      terminatedCount: 0,
      monitoringComplete: false,
      resumed: false,
    };
  }

  const post = observeNow();
  const completeEffect = effectResult?.status === 'COMPLETE'
    && effectResult?.attemptedCount === 1
    && effectResult?.terminatedCount === 1
    && effectResult?.monitoringComplete === true;

  if (!completeEffect) {
    return publicReceipt({
      status: effectResult?.status === 'BLOCKED' ? 'BLOCKED' : 'UNKNOWN',
      operation: 'cleanup',
      effectEligibility: effectResult?.status === 'BLOCKED' ? 'BLOCKED' : 'UNKNOWN',
      effectDisposition: effectResult?.attemptedCount > 0 ? 'PARTIAL'
        : effectResult?.status === 'BLOCKED' ? 'BLOCKED' : 'UNKNOWN',
      peerShellCount: initial.peerShellCount,
      cleanupCandidateCount: initial.cleanupCandidateCount,
      effectCount: 0,
      remainingPeerShellCount: post.peerShellCount,
      reasonCode: effectResult?.reasonCode || 'WSL_PIDFD_HELPER_FAILED',
    });
  }

  if (post.status === 'UNKNOWN') {
    return publicReceipt({
      status: 'UNKNOWN',
      operation: 'cleanup',
      effectEligibility: 'UNKNOWN',
      effectDisposition: 'PARTIAL',
      peerShellCount: initial.peerShellCount,
      cleanupCandidateCount: initial.cleanupCandidateCount,
      effectCount: 1,
      remainingPeerShellCount: post.peerShellCount,
      reasonCode: post.reasonCode,
    });
  }
  if (post.effectEligibility !== 'ALREADY_CLEAN' || !post.context
      || !sameWslAnchors(post.context, expected)) {
    return publicReceipt({
      status: 'BLOCKED',
      operation: 'cleanup',
      effectEligibility: 'BLOCKED',
      effectDisposition: 'PARTIAL',
      peerShellCount: initial.peerShellCount,
      cleanupCandidateCount: initial.cleanupCandidateCount,
      effectCount: 1,
      remainingPeerShellCount: post.peerShellCount,
      reasonCode: 'FINAL_SESSION_EVIDENCE_NOT_ABSENT',
    });
  }

  return publicReceipt({
    status: 'PASS',
    operation: 'cleanup',
    effectEligibility: 'ELIGIBLE',
    effectDisposition: 'COMPLETE',
    peerShellCount: initial.peerShellCount,
    cleanupCandidateCount: initial.cleanupCandidateCount,
    effectCount: 1,
    remainingPeerShellCount: 0,
    reasonCode: 'PEER_SESSION_CLEANUP_COMPLETE',
  });
}

function observe({
  platform,
  arch,
  selfPid,
  runner,
  cwd = process.cwd(),
  osRelease = os.release(),
  procRoot = WSL_PROC_ROOT,
  wslReader = sessionEvidence.defaultWslReader,
  wslStatReader = defaultWslStatReader,
}) {
  if (platform === 'linux' && arch === 'x64') {
    return observeWsl({
      selfPid, cwd, osRelease, procRoot, wslReader, wslStatReader,
    });
  }
  if (platform !== 'win32' || arch !== 'x64') {
    return {...unknown('EXECUTION_PROFILE_UNKNOWN'), rows: []};
  }
  let result;
  try {
    result = runner();
  } catch {
    return {...unknown('RDC_PROCESS_READ_FAILED'), rows: []};
  }
  if (!result || result.error || result.signal || result.code !== 0) {
    return {...unknown('RDC_PROCESS_READ_FAILED'), rows: []};
  }
  try {
    const rows = parsePrivateProcessTable(result.stdout);
    return {...classifyCleanupRows(rows, selfPid), rows};
  } catch {
    return {...unknown('RDC_PEER_CLEANUP_TOPOLOGY_UNKNOWN'), rows: []};
  }
}

function inspectLocal({
  platform = process.platform,
  arch = process.arch,
  selfPid = process.pid,
  runner = defaultRunner,
  cwd = process.cwd(),
  osRelease = os.release(),
  procRoot = WSL_PROC_ROOT,
  wslReader = sessionEvidence.defaultWslReader,
  wslStatReader = defaultWslStatReader,
} = {}) {
  const observed = observe({
    platform, arch, selfPid, runner, cwd, osRelease,
    procRoot, wslReader, wslStatReader,
  });
  return publicReceipt({
    status: observed.status,
    operation: 'inspect',
    effectEligibility: observed.effectEligibility,
    effectDisposition: 'NOT_RUN',
    peerShellCount: observed.peerShellCount,
    cleanupCandidateCount: observed.cleanupCandidateCount,
    blockedCandidateCount: observed.blockedCandidateCount,
    remainingPeerShellCount: observed.peerShellCount,
    reasonCode: observed.reasonCode,
  });
}

function validateHelperGuard(value) {
  return Boolean(value
    && Number.isSafeInteger(value.pid) && value.pid > 0
    && typeof value.creationFileTime === 'string'
    && /^[0-9]{15,20}$/.test(value.creationFileTime)
    && Number.isSafeInteger(value.depth) && value.depth >= 0);
}

function effectTimeoutMsForTargetCount(targetCount) {
  if (!Number.isSafeInteger(targetCount) || targetCount < 1 || targetCount > MAX_EFFECT_TARGETS) {
    throw new Error('EFFECT_TARGET_COUNT_INVALID');
  }
  return EFFECT_STARTUP_MARGIN_MS
    + EFFECT_EVENT_DRAIN_MS
    + EFFECT_RESULT_MARGIN_MS
    + (targetCount * EFFECT_WAIT_PER_TARGET_MS);
}

function effectTempDir({mkdtempSync = fs.mkdtempSync, tmpdir = os.tmpdir} = {}) {
  const root = tmpdir();
  if (typeof root !== 'string' || !path.isAbsolute(root)) {
    throw new Error('TEMP_ROOT_INVALID');
  }
  return mkdtempSync(path.join(root, EFFECT_TEMP_PREFIX));
}

const ZERO_EFFECT_HELPER_REASONS = new Set([
  'HANDLE_HELPER_INPUT_INVALID',
  'PROCESS_START_MONITOR_FAILED',
  'TARGET_TREE_SNAPSHOT_AMBIGUOUS',
  'TARGET_GUARD_DRIFT_BEFORE_EFFECT',
  'TARGET_DESCENDANT_RELATION_INVALID',
  'TARGET_TREE_EXPANDED_BEFORE_EFFECT',
  'TARGET_TREE_DISCONNECTED_BEFORE_EFFECT',
  'HANDLE_OPEN_FAILED',
  'HANDLE_IDENTITY_MISMATCH',
  'ANCHOR_NOT_LIVE',
  'TEMP_ENV_PREP_FAILED',
]);

const NONRECOVERABLE_PARTIAL_HELPER_REASONS = new Set([
  'LATE_DESCENDANT_OBSERVED',
  'DESCENDANT_MONITORING_INCOMPLETE',
  'HANDLE_HELPER_TIMEOUT',
  'TEMP_ENV_CLEANUP_FAILED',
]);

function defaultEffectRunner({anchors, targets}, {
  spawnSync = childProcess.spawnSync,
  mkdtempSync = fs.mkdtempSync,
  rmSync = fs.rmSync,
  tmpdir = os.tmpdir,
} = {}) {
  if (!Array.isArray(anchors) || !Array.isArray(targets)
      || targets.length < 1
      || targets.length > MAX_EFFECT_TARGETS
      || anchors.length + targets.length > MAX_EFFECT_HANDLES
      || anchors.some((guard) => !validateHelperGuard(guard))
      || targets.some((guard) => !validateHelperGuard(guard))) {
    return {
      code: 127,
      status: 'UNKNOWN',
      reasonCode: 'HANDLE_HELPER_INPUT_INVALID',
      attemptedCount: 0,
      terminatedCount: 0,
      error: new Error('HANDLE_HELPER_INPUT_INVALID'),
      signal: null,
    };
  }
  const payload = JSON.stringify({
    anchors: anchors.map((guard) => ({
      pid: guard.pid,
      ppid: guard.ppid,
      name: guard.name,
      creationFileTime: guard.creationFileTime,
      depth: guard.depth,
    })),
    targets: targets.map((guard) => ({
      pid: guard.pid,
      ppid: guard.ppid,
      name: guard.name,
      creationFileTime: guard.creationFileTime,
      depth: guard.depth,
    })),
  });
  let tempDir = null;
  let result = null;
  let cleanupError = null;
  try {
    tempDir = effectTempDir({mkdtempSync, tmpdir});
    result = spawnSync(POWERSHELL, HANDLE_HELPER_ARGS, {
      input: payload,
      encoding: 'utf8',
      shell: false,
      windowsHide: true,
      timeout: effectTimeoutMsForTargetCount(targets.length),
      maxBuffer: EFFECT_MAX_BUFFER,
      env: {TEMP: tempDir, TMP: tempDir},
    });
  } catch (error) {
    return {
      code: 127,
      status: 'UNKNOWN',
      reasonCode: 'TEMP_ENV_PREP_FAILED',
      attemptedCount: 0,
      terminatedCount: 0,
      monitoringComplete: false,
      error,
      signal: null,
    };
  } finally {
    if (tempDir) {
      try {
        rmSync(tempDir, {recursive: true, force: true});
      } catch (error) {
        cleanupError = error;
      }
    }
  }
  let parsed = null;
  try {
    parsed = JSON.parse(String(result?.stdout || '').trim());
  } catch {}
  const timedOut = result?.error?.code === 'ETIMEDOUT' || result?.signal === 'SIGTERM';
  const attemptedCount = Number.isSafeInteger(Number(parsed?.attemptedCount))
    ? Number(parsed.attemptedCount)
    : 0;
  const terminatedCount = Number.isSafeInteger(Number(parsed?.terminatedCount))
    ? Number(parsed.terminatedCount)
    : 0;
  const monitoringComplete = parsed?.monitoringComplete === true;
  if (cleanupError) {
    return {
      code: Number.isInteger(result?.status) ? result.status : 127,
      status: 'UNKNOWN',
      reasonCode: 'TEMP_ENV_CLEANUP_FAILED',
      attemptedCount,
      terminatedCount,
      monitoringComplete: false,
      error: cleanupError,
      signal: result?.signal || null,
    };
  }
  if (timedOut) {
    return {
      code: 127,
      status: 'UNKNOWN',
      reasonCode: 'HANDLE_HELPER_TIMEOUT',
      attemptedCount,
      terminatedCount,
      monitoringComplete: false,
      error: result?.error || null,
      signal: result?.signal || null,
    };
  }
  return {
    code: Number.isInteger(result?.status) ? result.status : 127,
    status: typeof parsed?.status === 'string' ? parsed.status : 'UNKNOWN',
    reasonCode: typeof parsed?.reasonCode === 'string'
      ? parsed.reasonCode
      : 'HANDLE_HELPER_OUTPUT_INVALID',
    attemptedCount,
    terminatedCount,
    monitoringComplete,
    error: result?.error || null,
    signal: result?.signal || null,
  };
}

function currentIdentityMatches(observed, anchorGuards) {
  return Boolean(observed.context
    && sameGuardSet(observed.context.anchors, anchorGuards));
}

function unknownEffectReceipt({
  observed,
  initialPeerCount,
  initialCandidateCount,
  effectCount,
}) {
  return publicReceipt({
    status: 'UNKNOWN',
    operation: 'cleanup',
    effectEligibility: 'UNKNOWN',
    effectDisposition: effectCount > 0 ? 'PARTIAL' : 'UNKNOWN',
    peerShellCount: initialPeerCount,
    cleanupCandidateCount: initialCandidateCount,
    effectCount,
    remainingPeerShellCount: observed.peerShellCount,
    reasonCode: observed.reasonCode,
  });
}

function cleanupWindowsLocal({
  confirm = false,
  platform = process.platform,
  arch = process.arch,
  selfPid = process.pid,
  runner = defaultRunner,
  effectRunner = defaultEffectRunner,
} = {}) {
  if (!confirm) {
    return publicReceipt({
      status: 'BLOCKED',
      operation: 'cleanup',
      effectEligibility: 'BLOCKED',
      effectDisposition: 'BLOCKED',
      reasonCode: 'OPERATOR_IDLE_CONFIRMATION_REQUIRED',
    });
  }

  const initial = observe({platform, arch, selfPid, runner});
  if (initial.effectEligibility === 'ALREADY_CLEAN') {
    return publicReceipt({
      status: 'PASS',
      operation: 'cleanup',
      effectEligibility: 'ALREADY_CLEAN',
      effectDisposition: 'NO_EFFECT',
      reasonCode: 'SOLE_RDC_COMMAND_SESSION',
    });
  }
  if (initial.effectEligibility !== 'ELIGIBLE' || !initial.context) {
    return publicReceipt({
      status: initial.status,
      operation: 'cleanup',
      effectEligibility: initial.effectEligibility,
      effectDisposition: initial.status === 'UNKNOWN' ? 'UNKNOWN' : 'BLOCKED',
      peerShellCount: initial.peerShellCount,
      cleanupCandidateCount: initial.cleanupCandidateCount,
      blockedCandidateCount: initial.blockedCandidateCount,
      remainingPeerShellCount: initial.peerShellCount,
      reasonCode: initial.reasonCode,
    });
  }

  const initialPeerCount = initial.peerShellCount;
  const initialCandidateCount = initial.cleanupCandidateCount;
  const anchorGuards = initial.context.anchors.map((row) => guardFor(row));
  const candidateTrees = initial.context.candidateTrees.map((tree) => ({
    guards: treeGuards(tree),
  }));
  let effectCount = 0;

  for (let index = 0; index < candidateTrees.length; index += 1) {
    const expectedBefore = candidateTrees.slice(index);
    const targetTree = expectedBefore[0];
    const pre = observe({platform, arch, selfPid, runner});
    if (pre.status === 'UNKNOWN') {
      return unknownEffectReceipt({
        observed: pre,
        initialPeerCount,
        initialCandidateCount,
        effectCount,
      });
    }
    if (pre.effectEligibility !== 'ELIGIBLE' || !pre.context
        || !currentIdentityMatches(pre, anchorGuards)
        || !sameTreeSet(pre.context.candidateTrees, expectedBefore)) {
      return publicReceipt({
        status: 'BLOCKED',
        operation: 'cleanup',
        effectEligibility: 'BLOCKED',
        effectDisposition: effectCount > 0 ? 'PARTIAL' : 'BLOCKED',
        peerShellCount: initialPeerCount,
        cleanupCandidateCount: initialCandidateCount,
        effectCount,
        remainingPeerShellCount: pre.peerShellCount,
        reasonCode: 'TARGET_GUARD_DRIFT_BEFORE_EFFECT',
      });
    }

    const helperAnchors = [
      ...anchorGuards,
      ...flattenTreeGuards(expectedBefore.slice(1)),
    ];
    let effectResult;
    try {
      effectResult = effectRunner({
        anchors: helperAnchors,
        targets: targetTree.guards,
      });
    } catch (error) {
      effectResult = {
        code: 127,
        status: 'UNKNOWN',
        reasonCode: 'HANDLE_HELPER_FAILED',
        attemptedCount: 0,
        terminatedCount: 0,
        error,
        signal: null,
      };
    }

    if (ZERO_EFFECT_HELPER_REASONS.has(effectResult?.reasonCode)) {
      return publicReceipt({
        status: effectResult.status === 'UNKNOWN' ? 'UNKNOWN' : 'BLOCKED',
        operation: 'cleanup',
        effectEligibility: effectResult.status === 'UNKNOWN' ? 'UNKNOWN' : 'BLOCKED',
        effectDisposition: effectResult.status === 'UNKNOWN' ? 'UNKNOWN' : 'BLOCKED',
        peerShellCount: initialPeerCount,
        cleanupCandidateCount: initialCandidateCount,
        effectCount,
        remainingPeerShellCount: pre.peerShellCount,
        reasonCode: effectResult.reasonCode,
      });
    }

    const post = observe({platform, arch, selfPid, runner});
    if (post.status === 'UNKNOWN') {
      return unknownEffectReceipt({
        observed: post,
        initialPeerCount,
        initialCandidateCount,
        effectCount,
      });
    }

    if (NONRECOVERABLE_PARTIAL_HELPER_REASONS.has(effectResult?.reasonCode)) {
      return publicReceipt({
        status: effectResult.status === 'UNKNOWN' ? 'UNKNOWN' : 'BLOCKED',
        operation: 'cleanup',
        effectEligibility: 'BLOCKED',
        effectDisposition: 'PARTIAL',
        peerShellCount: initialPeerCount,
        cleanupCandidateCount: initialCandidateCount,
        effectCount,
        remainingPeerShellCount: post.peerShellCount,
        reasonCode: effectResult.reasonCode,
      });
    }

    const guardedSurvivors = targetTree.guards.filter((guard) =>
      post.rows.some((row) => sameGuard(row, guard)));
    if (guardedSurvivors.length > 0) {
      return publicReceipt({
        status: 'BLOCKED',
        operation: 'cleanup',
        effectEligibility: 'BLOCKED',
        effectDisposition: effectResult?.attemptedCount > 0 || effectCount > 0
          ? 'PARTIAL'
          : 'BLOCKED',
        peerShellCount: initialPeerCount,
        cleanupCandidateCount: initialCandidateCount,
        effectCount,
        remainingPeerShellCount: post.peerShellCount,
        reasonCode: 'GUARDED_TREE_STILL_PRESENT',
      });
    }

    if (effectResult?.monitoringComplete !== true) {
      return publicReceipt({
        status: 'UNKNOWN',
        operation: 'cleanup',
        effectEligibility: 'UNKNOWN',
        effectDisposition: 'PARTIAL',
        peerShellCount: initialPeerCount,
        cleanupCandidateCount: initialCandidateCount,
        effectCount,
        remainingPeerShellCount: post.peerShellCount,
        reasonCode: 'DESCENDANT_MONITORING_NOT_PROVEN',
      });
    }

    effectCount += 1;
    const expectedAfter = candidateTrees.slice(index + 1);
    if (expectedAfter.length === 0) {
      if (post.effectEligibility !== 'ALREADY_CLEAN' || !post.context
          || !currentIdentityMatches(post, anchorGuards)) {
        return publicReceipt({
          status: 'BLOCKED',
          operation: 'cleanup',
          effectEligibility: 'BLOCKED',
          effectDisposition: 'PARTIAL',
          peerShellCount: initialPeerCount,
          cleanupCandidateCount: initialCandidateCount,
          effectCount,
          remainingPeerShellCount: post.peerShellCount,
          reasonCode: 'FINAL_SESSION_EVIDENCE_NOT_ABSENT',
        });
      }
    } else if (post.effectEligibility !== 'ELIGIBLE' || !post.context
        || !currentIdentityMatches(post, anchorGuards)
        || !sameTreeSet(post.context.candidateTrees, expectedAfter)) {
      return publicReceipt({
        status: 'BLOCKED',
        operation: 'cleanup',
        effectEligibility: 'BLOCKED',
        effectDisposition: 'PARTIAL',
        peerShellCount: initialPeerCount,
        cleanupCandidateCount: initialCandidateCount,
        effectCount,
        remainingPeerShellCount: post.peerShellCount,
        reasonCode: 'TOPOLOGY_DRIFT_AFTER_EFFECT',
      });
    }
  }

  const final = observe({platform, arch, selfPid, runner});
  if (final.status === 'UNKNOWN') {
    return unknownEffectReceipt({
      observed: final,
      initialPeerCount,
      initialCandidateCount,
      effectCount,
    });
  }
  if (final.effectEligibility !== 'ALREADY_CLEAN' || !final.context
      || !currentIdentityMatches(final, anchorGuards)) {
    return publicReceipt({
      status: 'BLOCKED',
      operation: 'cleanup',
      effectEligibility: 'BLOCKED',
      effectDisposition: 'PARTIAL',
      peerShellCount: initialPeerCount,
      cleanupCandidateCount: initialCandidateCount,
      effectCount,
      remainingPeerShellCount: final.peerShellCount,
      reasonCode: 'FINAL_SESSION_EVIDENCE_NOT_ABSENT',
    });
  }

  const finalSession = sessionEvidence.classifyProcessTable(final.rows, selfPid);
  if (finalSession.sessionState !== 'ABSENT'
      || finalSession.reasonCode !== 'SOLE_RDC_COMMAND_SESSION') {
    return publicReceipt({
      status: 'BLOCKED',
      operation: 'cleanup',
      effectEligibility: 'BLOCKED',
      effectDisposition: 'PARTIAL',
      peerShellCount: initialPeerCount,
      cleanupCandidateCount: initialCandidateCount,
      effectCount,
      remainingPeerShellCount: final.peerShellCount,
      reasonCode: 'FINAL_SESSION_EVIDENCE_NOT_ABSENT',
    });
  }

  return publicReceipt({
    status: 'PASS',
    operation: 'cleanup',
    effectEligibility: 'ELIGIBLE',
    effectDisposition: 'COMPLETE',
    peerShellCount: initialPeerCount,
    cleanupCandidateCount: initialCandidateCount,
    effectCount,
    remainingPeerShellCount: 0,
    reasonCode: 'PEER_SESSION_CLEANUP_COMPLETE',
  });
}

function cleanupLocal(options = {}) {
  const platform = options.platform ?? process.platform;
  const arch = options.arch ?? process.arch;
  if (platform === 'linux') {
    return cleanupWslLocal({...options, platform, arch});
  }
  return cleanupWindowsLocal({...options, platform, arch});
}

function parseArgs(argv = process.argv.slice(2)) {
  if (argv.length === 1 && argv[0] === 'inspect') {
    return {operation: 'inspect', confirm: false};
  }
  if (argv.length === 1 && argv[0] === 'cleanup') {
    return {operation: 'cleanup', confirm: false};
  }
  if (argv.length === 2 && argv[0] === 'cleanup' && argv[1] === CONFIRM_FLAG) {
    return {operation: 'cleanup', confirm: true};
  }
  throw new Error('ARGUMENT_UNSUPPORTED');
}

function runCli(argv = process.argv.slice(2), options = {}) {
  const parsed = parseArgs(argv);
  const value = parsed.operation === 'inspect'
    ? inspectLocal(options)
    : cleanupLocal({...options, confirm: parsed.confirm});
  process.stdout.write(JSON.stringify(value) + '\n');
  if (value.status === 'PASS') return 0;
  if (value.status === 'BLOCKED') return 2;
  return 3;
}

if (require.main === module) {
  try {
    process.exitCode = runCli();
  } catch {
    process.stdout.write(JSON.stringify(publicReceipt({
      status: 'UNKNOWN',
      operation: 'UNKNOWN',
      effectEligibility: 'UNKNOWN',
      effectDisposition: 'UNKNOWN',
      reasonCode: 'ARGUMENT_UNSUPPORTED',
    })) + '\n');
    process.exitCode = 64;
  }
}

module.exports = {
  CONFIRM_FLAG,
  FALSE_AUTHORITY,
  MAX_EFFECT_TARGETS,
  OWNER,
  SCHEMA,
  buildCurrentContext,
  buildWslCurrentContext,
  candidateShape,
  candidateTree,
  classifyCleanupRows,
  classifyWslCleanupRows,
  cleanupLocal,
  cleanupWslLocal,
  defaultEffectRunner,
  defaultRunner,
  defaultWslEffectRunner,
  defaultWslStatReader,
  descendantRows,
  effectTempDir,
  effectTimeoutMsForTargetCount,
  fileTimeToUnixMs,
  guardFor,
  inspectLocal,
  parseArgs,
  parsePrivateProcessTable,
  parseWslStatText,
  publicReceipt,
  runCli,
  sameGuard,
  sameGuardSet,
  sameLineageAgentPids,
  sameTreeSet,
  sameWslGuard,
  treeGuards,
  wslGuardFor,
};
