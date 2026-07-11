from fastapi import APIRouter

from app.api.v1 import admin, auth, customer, entity, public, staff


api_router = APIRouter()
api_router.include_router(auth.router, tags=["auth"])
api_router.include_router(admin.router, tags=["admin"])
api_router.include_router(entity.router, tags=["entity"])
api_router.include_router(public.router, tags=["public"])
api_router.include_router(customer.router, tags=["customer"])
api_router.include_router(staff.router, tags=["staff"])
