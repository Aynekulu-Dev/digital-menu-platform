from fastapi import HTTPException


class APIError(HTTPException):
    """
    A thin wrapper so every error response in the API follows the same
    {"status": "error", "code": ..., "message": ..., "details": ...} shape
    used throughout Chapter 4 of the spec.
    """

    def __init__(self, status_code: int, code: str, message: str, details: dict | None = None):
        body = {"status": "error", "code": code, "message": message}
        if details is not None:
            body["details"] = details
        super().__init__(status_code=status_code, detail=body)


def invalid_credentials():
    return APIError(401, "INVALID_CREDENTIALS", "The provided email or password combination is incorrect.")


def subscription_locked():
    return APIError(
        403,
        "SUBSCRIPTION_LOCKED",
        "Administrative modifications are suspended. Your multi-tenant workspace is "
        "currently marked as delinquent due to an unsettled balance.",
    )


def quota_exceeded():
    return APIError(
        403,
        "QUOTA_EXCEEDED",
        "Your workspace has reached its maximum allocated menu item limit for the "
        "current subscription tier. Upgrade your plan to add more items.",
    )


def item_not_found():
    return APIError(404, "ITEM_NOT_FOUND", "The requested menu item does not exist within your tenant workspace.")


def category_not_found():
    return APIError(404, "CATEGORY_NOT_FOUND", "The requested category does not exist within your tenant workspace.")


def restaurant_not_found():
    return APIError(
        404,
        "RESTAURANT_NOT_FOUND",
        "The requested dynamic menu routing slug does not correspond to an active establishment.",
    )


def validation_failed(details: dict):
    return APIError(400, "VALIDATION_FAILED", "Invalid input schema provided.", details)


def not_super_admin():
    return APIError(403, "FORBIDDEN", "This action requires a super-admin session.")
