"""API Key 加解密工具（用 Fernet 对称加密）"""

from cryptography.fernet import Fernet
from src.config import settings

_fernet: Fernet | None = None


def _get_fernet() -> Fernet:
    global _fernet
    if _fernet is None:
        if settings.encryption_key:
            key = settings.encryption_key.encode()
        else:
            import sys
            print("WARNING: ENCRYPTION_KEY is not set. API keys will not persist across restarts.", file=sys.stderr)
            key = Fernet.generate_key()
        _fernet = Fernet(key)
    return _fernet


def encrypt(plaintext: str) -> str:
    """加密明文，返回密文字符串"""
    if not plaintext:
        return ""
    return _get_fernet().encrypt(plaintext.encode()).decode()


def decrypt(ciphertext: str) -> str:
    """解密密文，返回明文字符串"""
    if not ciphertext:
        return ""
    try:
        return _get_fernet().decrypt(ciphertext.encode()).decode()
    except Exception:
        return ""
