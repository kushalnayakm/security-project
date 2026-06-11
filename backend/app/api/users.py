"""
User profile and dashboard routes.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.user_schema import DashboardEnvelope
from app.services.auth_service import AuthSessionError, get_dashboard_user
from app.services.user_service import serialize_user

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get(
    "/dashboard/{session_token}",
    response_model=DashboardEnvelope,
    summary="Fetch dashboard data for an authenticated session",
)
def get_dashboard(session_token: str, db: Session = Depends(get_db)) -> DashboardEnvelope:
    try:
        _, user = get_dashboard_user(db, session_token)
    except AuthSessionError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return DashboardEnvelope(message="Dashboard loaded successfully", user=serialize_user(user))
