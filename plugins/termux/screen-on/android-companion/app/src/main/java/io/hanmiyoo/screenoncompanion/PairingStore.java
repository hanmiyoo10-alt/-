package io.hanmiyoo.screenoncompanion;

import android.content.Context;
import android.content.SharedPreferences;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Locale;

final class PairingStore {
    private static final String PREFS = "screen_on_pairing";
    private static final String KEY_TOKEN = "controller_token";
    private static final String KEY_PAIR_CODE = "pair_code";
    private static final String KEY_PAIR_EXPIRES_AT = "pair_expires_at";
    private static final long PAIR_TTL_MS = 120_000L;
    private static final SecureRandom RNG = new SecureRandom();

    private PairingStore() {}

    static boolean isValidToken(String token) {
        return token != null && token.matches("[0-9a-f]{64}");
    }

    static boolean isValidPairingCode(String code) {
        return code != null && code.matches("[0-9]{8}");
    }

    static boolean isReusablePairingCode(String code, long expiresAt, long now) {
        return isValidPairingCode(code) && expiresAt >= now;
    }

    static String getOrArmPairing(Context context) {
        SharedPreferences preferences = prefs(context);
        String storedCode = preferences.getString(KEY_PAIR_CODE, null);
        long expiresAt = preferences.getLong(KEY_PAIR_EXPIRES_AT, 0L);
        long now = System.currentTimeMillis();
        if (isReusablePairingCode(storedCode, expiresAt, now)) {
            return storedCode;
        }

        String code = String.format(Locale.US, "%08d", RNG.nextInt(100_000_000));
        preferences.edit()
                .putString(KEY_PAIR_CODE, code)
                .putLong(KEY_PAIR_EXPIRES_AT, now + PAIR_TTL_MS)
                .apply();
        return code;
    }

    static boolean approveWithPairingCode(Context context, String code, String token) {
        SharedPreferences preferences = prefs(context);
        String storedCode = preferences.getString(KEY_PAIR_CODE, null);
        long expiresAt = preferences.getLong(KEY_PAIR_EXPIRES_AT, 0L);
        preferences.edit().remove(KEY_PAIR_CODE).remove(KEY_PAIR_EXPIRES_AT).commit();

        if (!isValidPairingCode(code) || !isValidPairingCode(storedCode) || !isValidToken(token)) {
            return false;
        }
        if (System.currentTimeMillis() > expiresAt) {
            return false;
        }
        if (!MessageDigest.isEqual(
                storedCode.getBytes(StandardCharsets.US_ASCII),
                code.getBytes(StandardCharsets.US_ASCII))) {
            return false;
        }
        preferences.edit().putString(KEY_TOKEN, token).apply();
        return true;
    }

    static void revoke(Context context) {
        prefs(context).edit()
                .remove(KEY_TOKEN)
                .remove(KEY_PAIR_CODE)
                .remove(KEY_PAIR_EXPIRES_AT)
                .apply();
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
