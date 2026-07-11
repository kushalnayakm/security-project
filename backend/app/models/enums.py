from enum import StrEnum


class UserRole(StrEnum):
    ADMIN = "ADMIN"
    ENTITY_STAFF = "ENTITY_STAFF"


class UserStatus(StrEnum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    SUSPENDED = "SUSPENDED"


class EntityStatus(StrEnum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    REMOVED = "REMOVED"


class EntityType(StrEnum):
    MAIN = "MAIN"
    BRANCH = "BRANCH"


class EntityUserRole(StrEnum):
    OWNER = "OWNER"
    MANAGER = "MANAGER"
    STAFF = "STAFF"


class FieldType(StrEnum):
    TEXT = "TEXT"
    NUMBER = "NUMBER"
    DATE = "DATE"
    EMAIL = "EMAIL"
    PHONE = "PHONE"
    SELECT = "SELECT"
    RADIO = "RADIO"
    CHECKBOX = "CHECKBOX"


class CustomerStatus(StrEnum):
    ACTIVE = "ACTIVE"
    REMOVED = "REMOVED"


class CertificateStatus(StrEnum):
    ISSUED = "ISSUED"
    REVOKED = "REVOKED"
