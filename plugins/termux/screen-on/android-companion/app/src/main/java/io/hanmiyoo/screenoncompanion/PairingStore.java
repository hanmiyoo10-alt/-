package io.hanmiyoo.screenoncompanion;

import android.content.Context;
import android.content.SharedPreferences;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

final class PairingStore {
    private static final String PREFS = "screen_on_pairing";
    private static final String KEY_TOKEN = "controller_token";

    private PairingStore() {}

    static boolean isValidToken(String token) {
        return token != null && token.matches("[0-9a-f]{64}");
    }

    static void approve(Context context, String token) {
        if (!isValidToken(token)) {
            throw new IllegalArgumentException("Invalid controller token");
        }
        prefs(context).edit().putString(KEY_TOKEN, token).apply();
    }

    static void revoke(Context context) {
        prefs(context).edit().remove(KEY_TOKEN).apply();
    }

    static boolean isAuthorized(Context context, String candidate) {
        if (!isValidToken(candidate)) {
            return false;
        }
        String stored = prefs(context).getString(KEY_TOKEN, null);
        if (!isValidToken(stored)) {
            return false;
        }
        return MessageDigest.isEqual(
                stored.getBytes(StandardCharsets.US_ASCII),
                candidate.getBytes(StandardCharsets.US_ASCII));
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }
}
