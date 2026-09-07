from pathlib import Path
import json
import shutil
import sys

root = Path(sys.argv[1])
source = Path(__file__).parent
api = root / 'wie-wipi-c/src/api.rs'
api.write_text(api.read_text() + '\npub mod startup_database;\n')
shutil.copyfile(source / 'startup_database.rs', root / 'wie-wipi-c/src/api/startup_database.rs')
p = root / 'wie-ktf/src/runtime/wipi_c/method_table.rs'
s = p.read_text()
needle = 'WIPICTableId::Interface4 => {\n            if function_id < 64 {'
replacement = '''WIPICTableId::Interface4 => {
            if function_id == 0 {
                Some(wie_wipi_c::api::startup_database::open.into_body())
            } else if function_id < 64 {'''
assert s.count(needle) == 1, 'Pinned engine layout changed'
p.write_text(s.replace(needle, replacement))
config = root / 'wie-app/tauri.conf.json'
data = json.loads(config.read_text())
data['productName'] = 'Fortune Golf Probe'
data['identifier'] = 'io.hanmiyoo.fortunegolf.probe'
data['version'] = '0.1.1'
config.write_text(json.dumps(data, indent=2) + '\n')
