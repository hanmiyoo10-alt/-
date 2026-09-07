//! KTF fixed-record database startup probe; not the stream API at table 6.
//! This implements only the verified absent-database/no-create path.
use alloc::{borrow::ToOwned, format, string::String};

use wie_util::{Result, WieError, read_null_terminated_string_bytes};

use crate::WIPICContext;

pub async fn open(context: &mut dyn WIPICContext, name_ptr: u32, record_size: i32, create: u32, mode: i32) -> Result<i32> {
    let name = String::from_utf8(read_null_terminated_string_bytes(context, name_ptr)?)
        .map_err(|_| WieError::Unimplemented("KTF record database: non-UTF8 name".into()))?;
    let system = context.system();
    let pid = system.pid().to_owned();
    let exists = system.platform().database_repository().exists(&name, &pid).await;
    tracing::info!("KTF record open: name={name:?}, record_size={record_size}, create={create}, mode={mode}, exists={exists}");
    if !exists && create == 0 {
        // M_E_NOENT: caller decides whether to initialize a fresh save.
        return Ok(-12);
    }
    // Never invent a handle or overwrite an existing database.
    Err(WieError::Unimplemented(format!(
        "KTF record database open: size={record_size}, create={create}, mode={mode}, exists={exists}; fixed-record handle support pending"
    )))
}

#[cfg(test)]
mod tests {
    use alloc::boxed::Box;
    use test_utils::TestPlatform;
    use wie_backend::{DefaultTaskRunner, System};
    use wie_util::ByteWrite;
    use crate::{WIPICContext, context::test::TestContext};
    use super::open;

    fn context() -> TestContext {
        let system = System::new(Box::new(TestPlatform::new()), "probe-pid", "probe-aid", DefaultTaskRunner);
        let mut ctx = TestContext::with_system(system);
        ctx.write_bytes(0x1000, b"probe-save\0").unwrap();
        ctx
    }

    #[futures_test::test]
    async fn absent_without_create_returns_noent_without_creating_storage() {
        let mut ctx = context();
        assert_eq!(open(&mut ctx, 0x1000, 128, 0, 1).await.unwrap(), -12);
        assert!(!ctx.system().platform().database_repository().exists("probe-save", "probe-pid").await);
    }

    #[futures_test::test]
    async fn unsupported_create_does_not_mutate_storage() {
        let mut ctx = context();
        assert!(open(&mut ctx, 0x1000, 128, 1, 1).await.is_err());
        assert!(!ctx.system().platform().database_repository().exists("probe-save", "probe-pid").await);
    }

    #[futures_test::test]
    async fn existing_database_is_preserved_and_not_reported_missing() {
        let mut ctx = context();
        let mut db = ctx.system().platform().database_repository().open("probe-save", "probe-pid").await;
        db.set(1, b"keep-me").await;
        assert!(open(&mut ctx, 0x1000, 128, 0, 1).await.is_err());
        assert_eq!(db.get(1).await.unwrap(), b"keep-me");
    }
}
