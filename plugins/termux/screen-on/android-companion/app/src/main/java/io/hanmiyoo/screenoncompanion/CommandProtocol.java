package io.hanmiyoo.screenoncompanion;

final class CommandProtocol {
    static final String ACTION_ON = "io.hanmiyoo.screenoncompanion.action.ON";
    static final String ACTION_OFF = "io.hanmiyoo.screenoncompanion.action.OFF";
    static final String ACTION_STATUS = "io.hanmiyoo.screenoncompanion.action.STATUS";
    static final String EXTRA_TOKEN = "token";

    static final int RESULT_ON = 101;
    static final int RESULT_OFF = 102;
    static final int RESULT_STATUS_ON = 103;
    static final int RESULT_STATUS_OFF = 104;
    static final int RESULT_PERMISSION_REQUIRED = 201;
    static final int RESULT_AUTH_REQUIRED = 202;
    static final int RESULT_ERROR = 500;

    private CommandProtocol() {}

    static boolean isKnownAction(String action) {
        return ACTION_ON.equals(action) || ACTION_OFF.equals(action) || ACTION_STATUS.equals(action);
    }
}
