//! Experimental standard KTF MC_DB (vector 4), separate from vector 6 streams.
//! ABI: libwipi 1.2.1 catalog. Guest memory owns all live handle state.
//! The record transfer conventions still require on-device confirmation.
use alloc::{borrow::ToOwned, boxed::Box, format, string::String, vec};
use core::mem::size_of;

use bytemuck::{Pod, Zeroable};
use wie_backend::Database;
use wie_util::{Result, WieError, read_generic, read_null_terminated_string_bytes, write_generic};
use crate::WIPICContext;

const MAGIC: u32 = 0x52444232;
const MAX_RECORD: i32 = 65536;
const BAD_HANDLE: i32 = -25;
const BAD_RECORD: i32 = -22;
const NOENT: i32 = -12;

#[repr(C)]
#[derive(Clone, Copy, Pod, Zeroable)]
struct Handle {
    magic: u32,
    record_size: u32,
    mode: i32,
    name_len: u32,
    name: [u8; 96],
}

fn storage_name(name: &[u8]) -> String {
    // Collision-free encoding also supports Korean/non-UTF8 legacy names.
    let mut key = String::from("wipi-record-v1-");
    for b in name { key.push_str(&format!("{b:02x}")); }
    key
}

fn load(context: &mut dyn WIPICContext, id: i32) -> Result<Option<Handle>> {
    if id <= 0 { return Ok(None); }
    let Ok(h) = read_generic::<Handle, _>(context, id as u32) else { return Ok(None); };
    Ok((h.magic == MAGIC && h.name_len > 0 && h.name_len <= 96 && h.record_size > 0 && h.record_size <= MAX_RECORD as u32).then_some(h))
}

async fn database(context: &mut dyn WIPICContext, h: &Handle) -> Option<Box<dyn Database>> {
    let key = storage_name(&h.name[..h.name_len as usize]);
    let system = context.system();
    let pid = system.pid().to_owned();
    let repo = system.platform().database_repository();
    if !repo.exists(&key, &pid).await { return None; }
    Some(repo.open(&key, &pid).await)
}

pub async fn open(context: &mut dyn WIPICContext, name_ptr: u32, record_size: i32, create: u32, mode: i32) -> Result<i32> {
    let name = read_null_terminated_string_bytes(context, name_ptr)?;
    if name.is_empty() || name.len() > 96 || !(1..=MAX_RECORD).contains(&record_size) || create > 1 || mode != 1 {
        return Err(WieError::Unimplemented(format!("MC_DB.open unsupported parameters: name_len={}, size={record_size}, create={create}, mode={mode}", name.len())));
    }
    let key = storage_name(&name);
    let system = context.system();
    let pid = system.pid().to_owned();
    let repo = system.platform().database_repository();
    let exists = repo.exists(&key, &pid).await;
    if !exists && create == 0 { return Ok(NOENT); }
    let mut db = repo.open(&key, &pid).await;
    // Record 0 is private adapter metadata; game-visible IDs start at 1.
    let mut metadata = [0u8; 12];
    metadata[..4].copy_from_slice(&MAGIC.to_le_bytes());
    metadata[4..8].copy_from_slice(&record_size.to_le_bytes());
    metadata[8..].copy_from_slice(&mode.to_le_bytes());
    if exists {
        if db.get(0).await.as_deref() != Some(metadata.as_slice()) {
            return Err(WieError::Unimplemented("MC_DB.open: existing metadata/record size mismatch; data preserved".into()));
        }
    } else if !db.set(0, &metadata).await {
        return Err(WieError::FatalError("MC_DB: could not persist database metadata".into()));
    }
    let mut h = Handle { magic: MAGIC, record_size: record_size as u32, mode, name_len: name.len() as u32, name: [0; 96] };
    h.name[..name.len()].copy_from_slice(&name);
    let id = context.alloc_raw(size_of::<Handle>() as u32)?;
    write_generic(context, id, h)?;
    tracing::info!("MC_DB.open: handle={id:#x}, size={record_size}, create={create}, existed={exists}");
    Ok(id as i32)
}

pub async fn close(context: &mut dyn WIPICContext, id: i32) -> Result<i32> {
    let Some(mut h) = load(context, id)? else { return Ok(BAD_HANDLE); };
    h.magic = 0;
    write_generic(context, id as u32, h)?;
    context.free_raw(id as u32, size_of::<Handle>() as u32)?;
    Ok(0)
}

fn input(context: &mut dyn WIPICContext, h: &Handle, ptr: u32, len: i32) -> Result<Option<alloc::vec::Vec<u8>>> {
    if len < 0 || len as u32 > h.record_size { return Ok(None); }
    let mut bytes = vec![0; h.record_size as usize];
    context.read_bytes(ptr, &mut bytes[..len as usize])?;
    Ok(Some(bytes))
}

pub async fn insert(context: &mut dyn WIPICContext, id: i32, ptr: u32, len: i32) -> Result<i32> {
    let Some(h) = load(context, id)? else { return Ok(BAD_HANDLE); };
    let Some(bytes) = input(context, &h, ptr, len)? else { return Ok(BAD_RECORD); };
    let Some(mut db) = database(context, &h).await else { return Ok(BAD_HANDLE); };
    let record_id = db.add(&bytes).await;
    tracing::info!("MC_DB.insert: handle={id:#x}, record={record_id}, len={len}");
    Ok(record_id as i32)
}

pub async fn select(context: &mut dyn WIPICContext, id: i32, record: i32, ptr: u32, len: i32) -> Result<i32> {
    let Some(h) = load(context, id)? else { return Ok(BAD_HANDLE); };
    if record <= 0 || len < 0 || len as u32 > h.record_size { return Ok(BAD_RECORD); }
    let Some(db) = database(context, &h).await else { return Ok(BAD_HANDLE); };
    let Some(bytes) = db.get(record as u32).await else { return Ok(BAD_RECORD); };
    if bytes.len() != h.record_size as usize { return Err(WieError::FatalError("MC_DB: stored record has unexpected length".into())); }
    context.write_bytes(ptr, &bytes[..len as usize])?;
    Ok(len)
}

pub async fn update(context: &mut dyn WIPICContext, id: i32, record: i32, ptr: u32, len: i32) -> Result<i32> {
    let Some(h) = load(context, id)? else { return Ok(BAD_HANDLE); };
    if record <= 0 { return Ok(BAD_RECORD); }
    let Some(bytes) = input(context, &h, ptr, len)? else { return Ok(BAD_RECORD); };
    let Some(mut db) = database(context, &h).await else { return Ok(BAD_HANDLE); };
    if db.get(record as u32).await.is_none() { return Ok(BAD_RECORD); }
    if !db.set(record as u32, &bytes).await { return Err(WieError::FatalError("MC_DB: record write failed".into())); }
    Ok(len)
}

pub async fn delete_record(context: &mut dyn WIPICContext, id: i32, record: i32) -> Result<i32> {
    let Some(h) = load(context, id)? else { return Ok(BAD_HANDLE); };
    if record <= 0 { return Ok(BAD_RECORD); }
    let Some(mut db) = database(context, &h).await else { return Ok(BAD_HANDLE); };
    Ok(if db.delete(record as u32).await { 0 } else { BAD_RECORD })
}

pub async fn count(context: &mut dyn WIPICContext, id: i32) -> Result<i32> {
    let Some(h) = load(context, id)? else { return Ok(BAD_HANDLE); };
    let Some(db) = database(context, &h).await else { return Ok(BAD_HANDLE); };
    Ok(db.get_record_ids().await.iter().filter(|&&r| r != 0).count() as i32)
}

pub async fn record_size(context: &mut dyn WIPICContext, id: i32) -> Result<i32> {
    Ok(load(context, id)?.map_or(BAD_HANDLE, |h| h.record_size as i32))
}

#[cfg(test)]
mod tests {
    use super::*;
    use test_utils::TestPlatform;
    use wie_backend::{DefaultTaskRunner, System};
    use wie_util::{ByteRead, ByteWrite};
    use crate::context::test::TestContext;

    fn context() -> TestContext {
        let system = System::new(Box::new(TestPlatform::new()), "probe-pid", "probe-aid", DefaultTaskRunner);
        let mut ctx = TestContext::with_system(system);
        ctx.write_bytes(0x1000, b"save\0").unwrap();
        ctx.write_bytes(0x2000, &[7; 128]).unwrap();
        ctx
    }

    #[futures_test::test]
    async fn missing_database_is_not_created_by_read_open() {
        let mut ctx = context();
        assert_eq!(open(&mut ctx, 0x1000, 128, 0, 1).await.unwrap(), NOENT);
        assert!(!ctx.system().platform().database_repository().exists(&storage_name(b"save"), "probe-pid").await);
    }

    #[futures_test::test]
    async fn create_write_close_reopen_read_preserves_records() {
        let mut ctx = context();
        let id = open(&mut ctx, 0x1000, 128, 1, 1).await.unwrap();
        assert!(id > 0);
        assert_eq!(count(&mut ctx, id).await.unwrap(), 0);
        assert_eq!(record_size(&mut ctx, id).await.unwrap(), 128);
        let record = insert(&mut ctx, id, 0x2000, 128).await.unwrap();
        assert_eq!(record, 1);
        assert_eq!(count(&mut ctx, id).await.unwrap(), 1);
        assert_eq!(close(&mut ctx, id).await.unwrap(), 0);
        assert_eq!(count(&mut ctx, id).await.unwrap(), BAD_HANDLE);
        let reopened = open(&mut ctx, 0x1000, 128, 0, 1).await.unwrap();
        assert_eq!(select(&mut ctx, reopened, record, 0x3000, 128).await.unwrap(), 128);
        let mut result = [0; 128];
        ctx.read_bytes(0x3000, &mut result).unwrap();
        assert_eq!(result, [7; 128]);
        let again = open(&mut ctx, 0x1000, 128, 1, 1).await.unwrap();
        assert_eq!(count(&mut ctx, again).await.unwrap(), 1);
    }

    #[futures_test::test]
    async fn update_and_delete_do_not_touch_other_records_or_metadata() {
        let mut ctx = context();
        let id = open(&mut ctx, 0x1000, 128, 1, 1).await.unwrap();
        let first = insert(&mut ctx, id, 0x2000, 128).await.unwrap();
        let second = insert(&mut ctx, id, 0x2000, 128).await.unwrap();
        ctx.write_bytes(0x2000, &[9; 128]).unwrap();
        assert_eq!(update(&mut ctx, id, first, 0x2000, 128).await.unwrap(), 128);
        assert_eq!(select(&mut ctx, id, first, 0x3000, 128).await.unwrap(), 128);
        let mut bytes = [0; 128];
        ctx.read_bytes(0x3000, &mut bytes).unwrap();
        assert_eq!(bytes, [9; 128]);
        assert_eq!(select(&mut ctx, id, second, 0x3000, 128).await.unwrap(), 128);
        ctx.read_bytes(0x3000, &mut bytes).unwrap();
        assert_eq!(bytes, [7; 128]);
        assert_eq!(delete_record(&mut ctx, id, 0).await.unwrap(), BAD_RECORD);
        assert_eq!(delete_record(&mut ctx, id, first).await.unwrap(), 0);
        assert_eq!(count(&mut ctx, id).await.unwrap(), 1);
    }

    #[futures_test::test]
    async fn invalid_lengths_and_size_mismatch_preserve_existing_data() {
        let mut ctx = context();
        let id = open(&mut ctx, 0x1000, 128, 1, 1).await.unwrap();
        insert(&mut ctx, id, 0x2000, 128).await.unwrap();
        assert_eq!(insert(&mut ctx, id, 0x2000, -1).await.unwrap(), BAD_RECORD);
        assert_eq!(update(&mut ctx, id, 1, 0x2000, 129).await.unwrap(), BAD_RECORD);
        assert_eq!(select(&mut ctx, id, 0, 0x3000, 128).await.unwrap(), BAD_RECORD);
        assert!(open(&mut ctx, 0x1000, 64, 1, 1).await.is_err());
        assert_eq!(count(&mut ctx, id).await.unwrap(), 1);
        assert_eq!(select(&mut ctx, id, 1, 0x3000, 128).await.unwrap(), 128);
        let mut bytes = [0; 128];
        ctx.read_bytes(0x3000, &mut bytes).unwrap();
        assert_eq!(bytes, [7; 128]);
    }

    #[futures_test::test]
    async fn short_record_is_zero_padded_and_select_respects_buffer_length() {
        let mut ctx = context();
        let id = open(&mut ctx, 0x1000, 128, 1, 1).await.unwrap();
        insert(&mut ctx, id, 0x2000, 2).await.unwrap();
        ctx.write_bytes(0x3000, &[99; 129]).unwrap();
        select(&mut ctx, id, 1, 0x3000, 128).await.unwrap();
        let mut bytes = [0; 129];
        ctx.read_bytes(0x3000, &mut bytes).unwrap();
        assert_eq!(&bytes[..2], &[7; 2]);
        assert_eq!(&bytes[2..128], &[0; 126]);
        assert_eq!(bytes[128], 99);
    }
}
