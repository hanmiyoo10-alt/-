from pathlib import Path

p = Path('plugins/usage-dashboard/runtime/bridge-manager.cjs')
s = p.read_text()
old = "  const run = `#!/data/data/com.termux/files/usr/bin/sh\\ncd ${shellQuote(candidate.cwd)}\\nexec ${command}\\n`;\n"
new = """  const run = `#!/data/data/com.termux/files/usr/bin/sh
cd ${shellQuote(candidate.cwd)}
exec ${command}
`;
"""
if old not in s:
    raise SystemExit('manager run-template anchor missing')
p.write_text(s.replace(old, new, 1))
print('5.3 manager patch anchor normalized')
