from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog


class AdminService:
    async def list_audit_logs(self, session: AsyncSession, target_type: str | None, target_id: str | None) -> list[AuditLog]:
        stmt = select(AuditLog).order_by(AuditLog.created_at.desc())
        if target_type:
            stmt = stmt.where(AuditLog.target_type == target_type)
        if target_id:
            stmt = stmt.where(AuditLog.target_id == target_id)
        return (await session.execute(stmt)).scalars().all()

    async def write_audit_log(
        self,
        session: AsyncSession,
        user_id: str | None,
        action: str,
        target_type: str,
        target_id: str | None,
        ip_address: str | None,
    ) -> None:
        session.add(
            AuditLog(
                user_id=user_id,
                action=action,
                target_type=target_type,
                target_id=target_id,
                ip_address=ip_address,
            )
        )
        await session.commit()
