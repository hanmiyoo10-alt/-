package io.hanmiyoo.mcl.guibridge;

final class PeerPolicy {
    private PeerPolicy() {}

    static boolean authorized(int peerUid, int termuxUid) {
        return peerUid >= 0 && termuxUid >= 0 && peerUid == termuxUid;
    }
}
