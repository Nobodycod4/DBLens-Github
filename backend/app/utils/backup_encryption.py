"""Fernet-based backup file encryption/decryption."""
import os

from cryptography.fernet import Fernet

from app.core.config import settings


def _get_fernet() -> Fernet:
    key = settings.ENCRYPTION_KEY.encode() if isinstance(settings.ENCRYPTION_KEY, str) else settings.ENCRYPTION_KEY
    return Fernet(key)


def is_encrypted_path(path: str) -> bool:
    """Return True if path or filename indicates an encrypted backup (.enc)."""
    return path.endswith(".enc") or os.path.basename(path).endswith(".enc")


def encrypt_backup_file(source_path: str) -> str:
    """
    Encrypt the file at source_path; write to source_path + '.enc'.
    Remove the original file. Return the path to the .enc file.
    """
    enc_path = source_path + ".enc"
    with open(source_path, "rb") as f:
        data = f.read()
    fernet = _get_fernet()
    encrypted = fernet.encrypt(data)
    with open(enc_path, "wb") as f:
        f.write(encrypted)
    os.remove(source_path)
    return enc_path


def decrypt_backup_bytes(enc_path: str) -> bytes:
    """Read encrypted file and return decrypted bytes."""
    with open(enc_path, "rb") as f:
        data = f.read()
    fernet = _get_fernet()
    return fernet.decrypt(data)


def decrypt_backup_to_file(enc_path: str, out_path: str) -> None:
    """Decrypt encrypted file to out_path."""
    decrypted = decrypt_backup_bytes(enc_path)
    with open(out_path, "wb") as f:
        f.write(decrypted)
