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
replacement = """WIPICTableId::Interface4 => {
            if function_id == 0 {
                Some(wie_wipi_c::api::startup_database::open.into_body())
            } else if function_id == 1 {
                Some(wie_wipi_c::api::startup_database::close.into_body())
            } else if function_id == 2 {
                Some(wie_wipi_c::api::startup_database::delete_database.into_body())
            } else if function_id == 3 {
                Some(wie_wipi_c::api::startup_database::insert.into_body())
            } else if function_id == 4 {
                Some(wie_wipi_c::api::startup_database::select.into_body())
            } else if function_id == 5 {
                Some(wie_wipi_c::api::startup_database::update.into_body())
            } else if function_id == 6 {
                Some(wie_wipi_c::api::startup_database::delete_record.into_body())
            } else if function_id == 7 {
                Some(wie_wipi_c::api::startup_database::list_records.into_body())
            } else if function_id == 10 {
                Some(wie_wipi_c::api::startup_database::count.into_body())
            } else if function_id == 11 {
                Some(wie_wipi_c::api::startup_database::record_size.into_body())
            } else if function_id < 64 {"""
assert s.count(needle) == 1, 'Pinned engine layout changed'
p.write_text(s.replace(needle, replacement))
shutil.copyfile(source / 'image.rs', root / 'wie-wipi-c/src/api/graphics/image.rs')
config = root / 'wie-app/tauri.conf.json'
data = json.loads(config.read_text())
data['productName'] = 'Fortune Golf Probe 6'
data['identifier'] = 'io.hanmiyoo.fortunegolf.probe6'
data['version'] = '0.1.6'
config.write_text(json.dumps(data, indent=2) + '\n')

# Preserve native call context in the visible error after ARM state unwinds.
p = root / 'wie-ktf/src/runtime/wipi_c/context.rs'
s = p.read_text()
needle = '        self.core.run_function(address, args).await'
replacement = """        self.core.run_function(address, args).await.map_err(|error| {
            WieError::FatalError(alloc::format!(
                "Probe 6 native call: target={address:#010x}, args={args:#x?}; {error}"
            ))
        })"""
assert s.count(needle) == 1, 'Pinned native call layout changed'
p.write_text(s.replace(needle, replacement))

p = root / 'wie-wipi-c/src/api/kernel.rs'
s = p.read_text()
needle = '            context.call_function(self.fn_callback, &[self.ptr_timer, self.param]).await?;'
replacement = """            context.call_function(self.fn_callback, &[self.ptr_timer, self.param]).await.map_err(|error| {
                WieError::FatalError(alloc::format!(
                    "Probe 6 timer: timer={:#010x}, callback={:#010x}, param={:#010x}; {error}",
                    self.ptr_timer, self.fn_callback, self.param
                ))
            })?;"""
assert s.count(needle) == 1, 'Pinned timer callback layout changed'
p.write_text(s.replace(needle, replacement))
