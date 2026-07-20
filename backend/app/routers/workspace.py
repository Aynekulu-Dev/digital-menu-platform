from fastapi import APIRouter, Depends

from app import models
from app.dependencies import get_current_restaurant
from app.schemas import RestaurantOut, ActiveQuotaOut

router = APIRouter(prefix="/api/v1/workspace", tags=["workspace"])


@router.get("/me/")
def get_my_workspace(restaurant: models.Restaurant = Depends(get_current_restaurant)):
    """
    Referenced by the frontend dashboard (DashboardHome.jsx -> api.getMyWorkspace)
    but was missing from the backend — added so the manager's own quota/usage
    overview actually loads instead of 404ing.
    """
    return {
        "status": "success",
        "data": {
            "restaurant": RestaurantOut.model_validate(restaurant).model_dump(mode="json"),
            "active_quota": ActiveQuotaOut.model_validate(restaurant.active_quota).model_dump(mode="json")
            if restaurant.active_quota else None,
        },
    }
