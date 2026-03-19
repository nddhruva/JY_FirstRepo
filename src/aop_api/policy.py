from __future__ import annotations

from collections.abc import Callable
from uuid import UUID

from fastapi import Depends, HTTPException, status

from .security import Principal, get_current_principal


ROLE_PERMISSIONS: dict[str, set[str]] = {
    "platform_admin": {"*"},
    "tenant_admin": {
        "tenant:read",
        "tenant:write",
        "application:read",
        "application:write",
        "integration:read",
        "integration:write",
        "workflow:read",
        "workflow:write",
        "compliance:read",
        "compliance:write",
        "consent:read",
        "consent:write",
        "branding:read",
        "branding:write",
        "dashboard:read",
        "dashboard:write",
        "report:read",
        "report:write",
    },
    "app_owner": {
        "application:read",
        "application:write",
        "onboarding:plan",
        "onboarding:execute",
        "dashboard:read",
        "dashboard:write",
        "report:read",
    },
    "integration_admin": {"integration:read", "integration:write", "onboarding:plan", "onboarding:execute"},
    "compliance_admin": {"compliance:read", "compliance:write", "application:read", "report:read", "report:write"},
    "auditor": {"application:read", "compliance:read", "consent:read", "integration:read", "report:read"},
}


def principal_permissions(principal: Principal) -> set[str]:
    permissions: set[str] = set()
    for role in principal.roles:
        permissions.update(ROLE_PERMISSIONS.get(role, set()))
    return permissions


def require_permissions(*required: str) -> Callable[[Principal], Principal]:
    def dependency(principal: Principal = Depends(get_current_principal)) -> Principal:
        permissions = principal_permissions(principal)
        if "*" in permissions:
            return principal
        missing = [perm for perm in required if perm not in permissions]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing permissions: {', '.join(missing)}",
            )
        return principal

    return dependency


def enforce_tenant_scope(principal: Principal, tenant_id: UUID) -> None:
    if "platform_admin" in principal.roles:
        return
    if principal.tenant_id != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant scope violation",
        )
