from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from cryptography.fernet import Fernet
import secrets
import re

from app.core.config import settings


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

try:
    cipher_suite = Fernet(settings.ENCRYPTION_KEY.encode())
except Exception:
    key = Fernet.generate_key()
    cipher_suite = Fernet(key)
    print(f"⚠️  Generated new encryption key. Add this to your config:")
    print(f"ENCRYPTION_KEY = {key.decode()}")



def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt
    
    Args:
        password: Plain text password
        
    Returns:
        Hashed password
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against a hash
    
    Args:
        plain_password: Plain text password to verify
        hashed_password: Hashed password to compare against
        
    Returns:
        True if password matches, False otherwise
    """
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False



def validate_password(password: str) -> tuple[bool, str]:
    """
    Validate password against policy requirements
    
    Args:
        password: Password to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if len(password) < settings.MIN_PASSWORD_LENGTH:
        return False, f"Password must be at least {settings.MIN_PASSWORD_LENGTH} characters long"
    
    if settings.REQUIRE_UPPERCASE and not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    
    if settings.REQUIRE_LOWERCASE and not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    
    if settings.REQUIRE_DIGIT and not re.search(r'\d', password):
        return False, "Password must contain at least one digit"
    
    if settings.REQUIRE_SPECIAL_CHAR and not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Password must contain at least one special character"
    
    return True, ""



def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token
    
    Args:
        data: Payload data to encode in the token
        expires_delta: Optional custom expiration time
        
    Returns:
        Encoded JWT token
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "jti": secrets.token_urlsafe(16)  # Unique token ID
    })
    
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: Dict[str, Any]) -> str:
    """
    Create a JWT refresh token (longer expiration)
    
    Args:
        data: Payload data to encode in the token
        
    Returns:
        Encoded JWT refresh token
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "jti": secrets.token_urlsafe(16),
        "type": "refresh"
    })
    
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decode and verify a JWT token
    
    Args:
        token: JWT token to decode
        
    Returns:
        Decoded token payload or None if invalid
    """
    try:
        payload = jwt.decode(
            token, 
            settings.JWT_SECRET_KEY, 
            algorithms=[settings.JWT_ALGORITHM],
            options={"verify_exp": False}  # Don't verify expiration during decode for session creation
        )
        return payload
    except JWTError as e:
        print(f"❌ JWT decode error: {e}")
        return None
    
def decode_token_unsafe(token: str) -> Optional[Dict[str, Any]]:
    """
    Decode a JWT token WITHOUT verification (for reading payload only)
    Use this when you just created the token and need to read the JTI
    
    Args:
        token: JWT token to decode
        
    Returns:
        Decoded token payload or None if invalid
    """
    try:
        payload = jwt.decode(
            token, 
            settings.JWT_SECRET_KEY, 
            algorithms=[settings.JWT_ALGORITHM],
            options={"verify_exp": False, "verify_signature": False}
        )
        return payload
    except JWTError as e:
        print(f"❌ JWT decode error: {e}")
        return None



def encrypt_password(password: str) -> str:
    """
    Encrypt a database password using Fernet encryption
    
    Args:
        password: Plain text password
        
    Returns:
        Encrypted password (base64 encoded)
    """
    encrypted = cipher_suite.encrypt(password.encode())
    return encrypted.decode()


def decrypt_password(encrypted_password: str) -> str:
    """
    Decrypt an encrypted database password
    
    Args:
        encrypted_password: Encrypted password (base64 encoded)
        
    Returns:
        Decrypted plain text password
    """
    try:
        decrypted = cipher_suite.decrypt(encrypted_password.encode())
        return decrypted.decode()
    except Exception:
        return encrypted_password



def generate_api_key() -> tuple[str, str]:
    """
    Generate a new API key
    
    Returns:
        Tuple of (full_key, key_prefix)
        full_key: Complete API key (e.g., "dbl_abc123xyz...")
        key_prefix: First 8-12 chars for display (e.g., "dbl_abc1...")
    """
    random_part = secrets.token_urlsafe(settings.API_KEY_LENGTH)
    
    full_key = f"dbl_{random_part}"
    
    key_prefix = full_key[:settings.API_KEY_PREFIX_LENGTH + 4]
    
    return full_key, key_prefix


def hash_api_key(api_key: str) -> str:
    """
    Hash an API key for secure storage
    
    Args:
        api_key: Plain API key
        
    Returns:
        Hashed API key
    """
    return hash_password(api_key)


def verify_api_key(plain_key: str, hashed_key: str) -> bool:
    """
    Verify an API key against a hash
    
    Args:
        plain_key: Plain API key to verify
        hashed_key: Hashed API key to compare against
        
    Returns:
        True if key matches, False otherwise
    """
    return verify_password(plain_key, hashed_key)