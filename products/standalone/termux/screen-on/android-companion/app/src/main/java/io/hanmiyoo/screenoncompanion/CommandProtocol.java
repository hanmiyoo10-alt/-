package io.hanmiyoo.screenoncompanion;

final class CommandProtocol {
    static final String ACTION_PAIR = "io.hanmiyoo.screenoncompanion.action.PAIR";
    static final String ACTION_ON = "io.hanmiyoo.screenoncompanion.action.ON";
    static final String ACTION_OFF = "io.hanmiyoo.screenoncompanion.action.OFF";
    static final String ACTION_STATUS = "io.hanmiyoo.screenoncompanion.action.STATUS";
    static final String ACTION_DIAGNOSTIC = "io.hanmiyoo.screenoncompanion.action.DIAGNOSTIC";
    static final String EXTRA_TOKEN = "token";
    static final String EXTRA_PAIR_CODE = "pair_code";

    static final int RESULT_ON = 101;
    static final int RESULT_OFF = 102;
    static final int RESULT_STATUS_ON = 103;
    static final int RESULT_STATUS_OFF = 104;
    static final int RESULT_PAIRED = 105;
    static final int RESULT_DIAGNOSTIC = 106;
    static final int RESULT_PERMISSION_REQUIRED = 201;
    static final int RESULT_AUTH_REQUIRED = 202;
    static final int RESULT_PAIR_CODE_REJECTED = 203;
    static final int RESULT_ERROR = 500;

    private CommandProtocol() {}

    static boolean isKnownAction(String action) {
        return ACTION_PAIR.equals(action)
                || ACTION_ON.equals(action)
                || ACTION_OFF.equals(action)
                || ACTION_STATUS.equals(action)
                || ACTION_DIAGNOSTIC.equals(action);
    }
}
