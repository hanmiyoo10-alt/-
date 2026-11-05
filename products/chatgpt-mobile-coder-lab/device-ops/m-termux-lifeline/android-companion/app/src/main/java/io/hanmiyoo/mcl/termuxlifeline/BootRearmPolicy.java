package io.hanmiyoo.mcl.termuxlifeline;

final class BootRearmPolicy {
    private BootRearmPolicy() {}

    static boolean shouldStart(
            boolean bootCompleted,
            boolean autoRearmEnabled,
            LifelinePolicy.PackageState termuxPackageState,
            boolean runCommandPermissionGranted,
            boolean notificationPermissionGranted,
            boolean policyAcknowledged) {
        return bootCompleted
            && autoRearmEnabled
            && termuxPackageState == LifelinePolicy.PackageState.INSTALLED_NOT_STOPPED
            && runCommandPermissionGranted
            && notificationPermissionGranted
            && policyAcknowledged;
    }
}
