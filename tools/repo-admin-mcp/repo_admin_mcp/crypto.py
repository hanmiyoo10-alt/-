from __future__ import annotations

import base64
from dataclasses import dataclass

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from nacl.public import PublicKey, SealedBox


@dataclass
class KeyMaterial:
    public_key: str
    private_key: bytearray

    def destroy(self) -> None:
        for index in range(len(self.private_key)):
            self.private_key[index] = 0


def generate_ed25519_keypair(comment: str) -> KeyMaterial:
    key = Ed25519PrivateKey.generate()
    private_bytes = key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.OpenSSH,
        encryption_algorithm=serialization.NoEncryption(),
    )
    public_bytes = key.public_key().public_bytes(
        encoding=serialization.Encoding.OpenSSH,
        format=serialization.PublicFormat.OpenSSH,
    )
    del key
    return KeyMaterial(
        public_key=f"{public_bytes.decode('ascii')} {comment}",
        private_key=bytearray(private_bytes),
    )


def seal_for_github(public_key_b64: str, secret: bytearray) -> str:
    public_key = PublicKey(base64.b64decode(public_key_b64, validate=True))
    sealed = SealedBox(public_key).encrypt(bytes(secret))
    return base64.b64encode(sealed).decode("ascii")
