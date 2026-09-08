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
data['productName'] = 'Fortune Golf Probe 10'
data['identifier'] = 'io.hanmiyoo.fortunegolf.probe10'
data['version'] = '0.1.10'
config.write_text(json.dumps(data, indent=2) + '\n')

# Preserve native call context in the visible error after ARM state unwinds.
p = root / 'wie-ktf/src/runtime/wipi_c/context.rs'
s = p.read_text()
needle = '        self.core.run_function(address, args).await'
replacement = """        self.core.run_function(address, args).await.map_err(|error| {
            WieError::FatalError(alloc::format!(
                "Probe 10 native call: target={address:#010x}, args={args:#x?}; {error}"
            ))
        })"""
assert s.count(needle) == 1, 'Pinned native call layout changed'
p.write_text(s.replace(needle, replacement))

p = root / 'wie-wipi-c/src/api/kernel.rs'
s = p.read_text()
needle = '            context.call_function(self.fn_callback, &[self.ptr_timer, self.param]).await?;'
replacement = """            context.call_function(self.fn_callback, &[self.ptr_timer, self.param]).await.map_err(|error| {
                WieError::FatalError(alloc::format!(
                    "Probe 10 timer: timer={:#010x}, callback={:#010x}, param={:#010x}; {error}",
                    self.ptr_timer, self.fn_callback, self.param
                ))
            })?;"""
assert s.count(needle) == 1, 'Pinned timer callback layout changed'
p.write_text(s.replace(needle, replacement))

# First-run cleanup can destroy an offscreen buffer before it was created.
p = root / 'wie-wipi-c/src/api/graphics.rs'
s = p.read_text()
needle = '    context.free(framebuffer)?;'
assert s.count(needle) == 1, 'Pinned framebuffer cleanup changed'
s = s.replace(needle, """    if framebuffer.0 == 0 {
        return Ok(());
    }
    context.free(framebuffer)?;""")
s += """
#[cfg(test)]
mod fortune_image_tests_null_cleanup {
    use super::destroy_offscreen_framebuffer;
    use crate::{WIPICContext, context::test::TestContext};
    use wipi_types::wipic::WIPICIndirectPtr;

    #[futures_test::test]
    async fn uncreated_buffer_cleanup_does_not_free_null() {
        let mut context = TestContext::new();
        assert!(context.free(WIPICIndirectPtr(0)).is_err());
        destroy_offscreen_framebuffer(&mut context, WIPICIndirectPtr(0)).await.unwrap();
        let buffer = context.alloc(32).unwrap();
        destroy_offscreen_framebuffer(&mut context, buffer).await.unwrap();
    }
}
"""
p.write_text(s)
# The test context must expose the invalid null free, as the KTF allocator does.
p = root / 'wie-wipi-c/src/context.rs'
s = p.read_text()
needle = """        fn free(&mut self, _memory: WIPICIndirectPtr) -> Result<()> {
            Ok(())
        }"""
replacement = """        fn free(&mut self, memory: WIPICIndirectPtr) -> Result<()> {
            if memory.0 == 0 {
                return Err(WieError::FatalError(String::from("test: null free")));
            }
            Ok(())
        }"""
assert s.count(needle) == 1, 'Pinned test context changed'
p.write_text(s.replace(needle, replacement))

# Capture engine/SVC context at the error boundary, before later task changes.
p = root / 'wie-core-arm/src/core.rs'
s = p.read_text()
needle = "                inner.engine.run(RUN_FUNCTION_LR, 10_000)?"
replacement = "                inner.engine.run(RUN_FUNCTION_LR, 10_000).map_err(|error| {\n                    let pc = inner.engine.reg_read(ArmRegister::PC);\n                    let lr = inner.engine.reg_read(ArmRegister::LR);\n                    WieError::FatalError(format!(\n                        \"ARM engine failure: entry={address:#010x}, pc={pc:#010x}, lr={lr:#010x}; {error}\"\n                    ))\n                })?"
assert s.count(needle) == 1, 'Pinned ARM failure boundary changed'
s = s.replace(needle, replacement)
needle = "                    function.call(&mut self1).await?;"
replacement = "                    function.call(&mut self1).await.map_err(|error| {\n                        WieError::FatalError(format!(\n                            \"ARM SVC failure: entry={address:#010x}, category={category}, resume={lr:#010x}; {error}; {}\",\n                            self1.dump_regs()\n                        ))\n                    })?;"
assert s.count(needle) == 1, 'Pinned ARM failure boundary changed'
s = s.replace(needle, replacement)
p.write_text(s)

p = root / "wie-core-arm/src/core.rs"
s = p.read_text()
needle = "map_err(|error| {\n                    let pc = inner.engine.reg_read(ArmRegister::PC);"
replacement = "map_err(|error| {\n            if matches!(&error, WieError::JavaException(_) | WieError::JavaExceptionUnwind { .. }) {\n                return error;\n            }\n                    let pc = inner.engine.reg_read(ArmRegister::PC);"
assert s.count(needle) == 1, 'Diagnostic boundary changed'
p.write_text(s.replace(needle, replacement))
p = root / "wie-core-arm/src/core.rs"
s = p.read_text()
needle = "map_err(|error| {\n                        WieError::FatalError(format!(\n                            \"ARM SVC failure:"
replacement = "map_err(|error| {\n            if matches!(&error, WieError::JavaException(_) | WieError::JavaExceptionUnwind { .. }) {\n                return error;\n            }\n                        WieError::FatalError(format!(\n                            \"ARM SVC failure:"
assert s.count(needle) == 1, 'Diagnostic boundary changed'
p.write_text(s.replace(needle, replacement))
p = root / "wie-ktf/src/runtime/wipi_c/context.rs"
s = p.read_text()
needle = "map_err(|error| {\n            WieError::FatalError(alloc::format!(\n                \"Probe 10 native call:"
replacement = "map_err(|error| {\n            if matches!(&error, WieError::JavaException(_) | WieError::JavaExceptionUnwind { .. }) {\n                return error;\n            }\n            WieError::FatalError(alloc::format!(\n                \"Probe 10 native call:"
assert s.count(needle) == 1, 'Diagnostic boundary changed'
p.write_text(s.replace(needle, replacement))
p = root / "wie-wipi-c/src/api/kernel.rs"
s = p.read_text()
needle = "map_err(|error| {\n                WieError::FatalError(alloc::format!(\n                    \"Probe 10 timer:"
replacement = "map_err(|error| {\n            if matches!(&error, WieError::JavaException(_) | WieError::JavaExceptionUnwind { .. }) {\n                return error;\n            }\n                WieError::FatalError(alloc::format!(\n                    \"Probe 10 timer:"
assert s.count(needle) == 1, 'Diagnostic boundary changed'
p.write_text(s.replace(needle, replacement))

p = root / "wie-core-arm/src/core.rs"
s = p.read_text()
needle = "    profile: Option<ProfileState>,"
replacement = "    profile: Option<ProfileState>,\n    resource_trace: Vec<String>,"
assert s.count(needle) == 1, 'Resource trace layout changed'
p.write_text(s.replace(needle, replacement))

p = root / "wie-core-arm/src/core.rs"
s = p.read_text()
needle = "            next_stub_address: FUNCTIONS_BASE,"
replacement = "            next_stub_address: FUNCTIONS_BASE,\n            resource_trace: Vec::new(),"
assert s.count(needle) == 1, 'Resource trace layout changed'
p.write_text(s.replace(needle, replacement))

p = root / "wie-core-arm/src/core.rs"
s = p.read_text()
needle = "impl ArmCore {"
replacement = "impl ArmCore {\n    pub fn record_resource_trace(&self, message: String) {\n        let mut inner = self.inner.lock();\n        if inner.resource_trace.len() == 8 {\n            inner.resource_trace.remove(0);\n        }\n        inner.resource_trace.push(message.chars().take(320).collect());\n    }\n\n    pub fn resource_trace(&self) -> Vec<String> {\n        self.inner.lock().resource_trace.clone()\n    }\n"
assert s.count(needle) == 1, 'Resource trace layout changed'
p.write_text(s.replace(needle, replacement))

p = root / "wie-core-arm/src/core.rs"
s = p.read_text()
needle = "\"ARM engine failure: entry={address:#010x}, pc={pc:#010x}, lr={lr:#010x}; {error}\""
replacement = "\"ARM engine failure: entry={address:#010x}, pc={pc:#010x}, lr={lr:#010x}; resources={:?}; {error}\", inner.resource_trace"
assert s.count(needle) == 1, 'Resource trace layout changed'
p.write_text(s.replace(needle, replacement))

p = root / "wie-ktf/src/runtime/wipi_c/context.rs"
s = p.read_text()
needle = "    async fn get_resource_size(&self, name: &str) -> Result<Option<usize>> {"
replacement = "    async fn get_resource_size(&self, name: &str) -> Result<Option<usize>> {\n        self.core.record_resource_trace(alloc::format!(\"query {name:?}\"));"
assert s.count(needle) == 1, 'Resource trace layout changed'
p.write_text(s.replace(needle, replacement))

p = root / "wie-ktf/src/runtime/wipi_c/context.rs"
s = p.read_text()
needle = "        Ok(result)\n    }\n\n    async fn read_resource"
replacement = "        self.core.record_resource_trace(alloc::format!(\"size {name:?} => {result:?}\"));\n        Ok(result)\n    }\n\n    async fn read_resource"
assert s.count(needle) == 1, 'Resource trace layout changed'
p.write_text(s.replace(needle, replacement))

p = root / "wie-ktf/src/runtime/wipi_c/context.rs"
s = p.read_text()
needle = "    async fn read_resource(&self, name: &str) -> Result<Vec<u8>> {"
replacement = "    async fn read_resource(&self, name: &str) -> Result<Vec<u8>> {\n        self.core.record_resource_trace(alloc::format!(\"read {name:?}\"));"
assert s.count(needle) == 1, 'Resource trace layout changed'
p.write_text(s.replace(needle, replacement))

p = root / 'wie-core-arm/src/core.rs'
p.write_text(p.read_text() + "\n#[cfg(test)]\nmod fortune_resource_trace_tests {\n    use super::ArmCore;\n    #[test]\n    fn shared_bounded_and_isolated() {\n        let core = ArmCore::new(false, None).unwrap();\n        let clone = core.clone();\n        for i in 0..10 { clone.record_resource_trace(alloc::format!(\"resource-{i}\")); }\n        let trace = core.resource_trace();\n        assert_eq!(trace.len(), 8);\n        assert_eq!(trace[0], \"resource-2\");\n        assert_eq!(trace[7], \"resource-9\");\n        assert!(ArmCore::new(false, None).unwrap().resource_trace().is_empty());\n        clone.record_resource_trace(\"한\".repeat(500));\n        assert_eq!(core.resource_trace().last().unwrap().chars().count(), 320);\n    }\n}\n")
