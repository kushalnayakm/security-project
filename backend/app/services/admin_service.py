from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog


class AdminService:
    async def list_audit_logs(self, session: AsyncSession, target_type: str | None, target_id: str | None) -> list[dict]:
        stmt = select(AuditLog).order_by(AuditLog.created_at.desc())
        if target_type:
            stmt = stmt.where(AuditLog.target_type == target_type)
        if target_id:
            stmt = stmt.where(AuditLog.target_id == target_id)
        rows = (await session.execute(stmt)).scalars().all()
        return [
            {
                "audit_id": str(row.log_id),
                "log_id": str(row.log_id),
                "user_id": str(row.user_id) if row.user_id else None,
                "action": row.action,
                "target_type": row.target_type,
                "target_id": str(row.target_id) if row.target_id else None,
                "ip_address": row.ip_address,
                "created_at": row.created_at.isoformat() if row.created_at else None,
            }
            for row in rows
        ]

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
