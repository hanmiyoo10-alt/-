from pathlib import Path
p = Path('plugins/simcore/latest.js')
s = p.read_text(encoding='utf-8')
old = """      probe.chatLoadMs = Number(detail.chatLoadMs || 0);\n      probe.prepareMs = Number(detail.prepareMs || 0);\n      probe.setChatMs = Number(detail.setChatMs || 0);\n"""
new = old + """      probe.canonicalFingerprint = detail.canonicalFingerprint ?? probe.canonicalFingerprint;\n      probe.hostRawFingerprint = detail.hostRawFingerprint ?? probe.hostRawFingerprint;\n      probe.freshFingerprint = detail.freshFingerprint ?? probe.freshFingerprint;\n      probe.fingerprintMatch = detail.fingerprintMatch ?? probe.fingerprintMatch;\n"""
assert s.count(old) == 1, s.count(old)
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')
Path('plugins/simcore/install.js').write_text(s, encoding='utf-8')
print('wired deferred provenance detail into diagnostic probe')
