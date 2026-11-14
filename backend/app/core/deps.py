from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.errors import ApiError
from app.core.security import JWTError, decode_access_token
from app.db.session import get_db
from app.models import User
from app.services.db_utils import parse_uuid

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None or not credentials.credentials:
        raise ApiError(401, "UNAUTHORIZED", "Authentication required.")
    try:
        payload = decode_access_token(credentials.credentials)
    except JWTError:
        raise ApiError(401, "UNAUTHORIZED", "Invalid or expired token.")
    if payload.get("type") != "access":
        raise ApiError(401, "UNAUTHORIZED", "Invalid token type.")
    user_id = parse_uuid(payload.get("sub", ""))
    if user_id is None:
        raise ApiError(401, "UNAUTHORIZED", "Invalid token subject.")
    user = db.get(User, user_id)
    if user is None:
        raise ApiError(401, "UNAUTHORIZED", "User no longer exists.")
    if user.role != "manager":
        raise ApiError(403, "FORBIDDEN", "Manager access required.")
    return user
