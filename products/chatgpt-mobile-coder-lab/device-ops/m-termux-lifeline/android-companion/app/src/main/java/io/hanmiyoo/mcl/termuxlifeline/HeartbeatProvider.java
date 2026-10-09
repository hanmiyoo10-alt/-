package io.hanmiyoo.mcl.termuxlifeline;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Binder;
import android.os.Bundle;

public final class HeartbeatProvider extends ContentProvider {
    static final String AUTHORITY = "io.hanmiyoo.mcl.termuxlifeline.heartbeat";

    @Override
    public boolean onCreate() {
        return true;
    }

    @Override
    public Bundle call(String method, String arg, Bundle extras) {
        Context context = getContext();
        if (context == null) {
            throw new SecurityException("provider context unavailable");
        }
        if (arg != null || (extras != null && !extras.isEmpty())) {
            throw new SecurityException("caller payload forbidden");
        }
        HeartbeatProtocol.Kind kind = HeartbeatProtocol.classifyAction(method);
        if (kind == HeartbeatProtocol.Kind.INVALID) {
            throw new SecurityException("method forbidden");
        }

        final int termuxUid;
        try {
            ApplicationInfo app = context.getPackageManager().getApplicationInfo(
                LifelineService.TERMUX_PACKAGE,
                0
            );
            termuxUid = app.uid;
        } catch (PackageManager.NameNotFoundException error) {
            throw new SecurityException("Termux package unavailable", error);
        }
        if (!HeartbeatProtocol.senderUidMatchesTermux(Binder.getCallingUid(), termuxUid)) {
            throw new SecurityException("caller uid forbidden");
        }

        LifelineService.acceptVerifiedIngress(kind);
        return Bundle.EMPTY;
    }

    @Override
    public Cursor query(
            Uri uri,
            String[] projection,
            String selection,
            String[] selectionArgs,
            String sortOrder) {
        throw new UnsupportedOperationException("query unsupported");
    }

    @Override
    public String getType(Uri uri) {
        throw new UnsupportedOperationException("type unsupported");
    }

    @Override
    public Uri insert(Uri uri, ContentValues values) {
        throw new UnsupportedOperationException("insert unsupported");
    }

    @Override
    public int delete(Uri uri, String selection, String[] selectionArgs) {
        throw new UnsupportedOperationException("delete unsupported");
    }

    @Override
    public int update(
            Uri uri,
            ContentValues values,
            String selection,
            String[] selectionArgs) {
        throw new UnsupportedOperationException("update unsupported");
    }
}
