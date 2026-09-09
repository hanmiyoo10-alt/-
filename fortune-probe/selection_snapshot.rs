
// Probe-only snapshot. Called while ArmCore's lock is already held.
fn fortune_selection_snapshot(engine: &mut dyn ArmEngine, pc: u32) -> String {
    if !(0x10af86..=0x10af8a).contains(&pc) {
        return String::new();
    }
    fn bytes<const N: usize>(engine: &mut dyn ArmEngine, address: Option<u32>) -> Option<[u8; N]> {
        let mut data = [0; N];
        let address = address?;
        if !engine.is_mapped(address, N) || engine.mem_read(address, N, &mut data).ok()? != N {
            return None;
        }
        Some(data)
    }
    let base = engine.reg_read(ArmRegister::R7);
    let sp = engine.reg_read(ArmRegister::SP);
    let r0 = engine.reg_read(ArmRegister::R0);
    let selector = bytes::<1>(engine, base.checked_add(33)).map(|v| v[0]);
    let index = bytes::<4>(engine, sp.checked_add(28)).map(u32::from_le_bytes);
    let selected_address = index.and_then(|i| i.checked_mul(32))
        .and_then(|i| i.checked_add(1600)).and_then(|i| base.checked_add(i));
    let selected = bytes::<32>(engine, selected_address);
    let first = bytes::<32>(engine, base.checked_add(1600));
    fn name(value: Option<[u8; 32]>) -> String {
        match value {
            Some(v) => {
                let end = v.iter().position(|&x| x == 0).unwrap_or(v.len());
                String::from_utf8_lossy(&v[..end]).into_owned()
            }
            None => "<unreadable>".into(),
        }
    }
    format!(" selection: r0={r0:#x}, base={base:#x}, byte33={selector:?}, index={index:?}, first={:?}, selected={:?};",
        name(first), name(selected))
}

#[cfg(test)]
mod fortune_selection_tests {
    use super::*;
    #[test]
    fn snapshot_reads_saved_index_and_handles_unmapped_memory() {
        let core = ArmCore::new(false, None).unwrap();
        let mut inner = core.inner.lock();
        let engine = &mut *inner.engine;
        engine.mem_map(0x2000, 0x4000, MemoryPermission::ReadWrite);
        engine.reg_write(ArmRegister::R7, 0x2000);
        engine.reg_write(ArmRegister::SP, 0x5000);
        engine.mem_write(0x2021, &[2]).unwrap();
        engine.mem_write(0x501c, &1u32.to_le_bytes()).unwrap();
        engine.mem_write(0x2640, b"first.mtra\0").unwrap();
        engine.mem_write(0x2660, b"second.mtra\0").unwrap();
        let result = fortune_selection_snapshot(engine, 0x10af88);
        assert!(result.contains("byte33=Some(2), index=Some(1)"));
        assert!(result.contains("selected=\"second.mtra\""));
        assert_eq!(fortune_selection_snapshot(engine, 0x100000), "");
        engine.reg_write(ArmRegister::R7, 0xfffffff0);
        engine.reg_write(ArmRegister::SP, 0xfffffff0);
        let result = fortune_selection_snapshot(engine, 0x10af88);
        assert!(result.contains("byte33=None, index=None"));
        assert!(result.contains("<unreadable>"));
        assert_eq!(engine.reg_read(ArmRegister::R7), 0xfffffff0);
    }
}
