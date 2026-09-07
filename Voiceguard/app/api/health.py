from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health_check():
    return {
        "status": "operational",
        "database": "not_configured",
        "model_status": "baseline-cnn-v1",
        "version": "1.0.0"
    }


@router.get("/system/health")
async def system_health():
    return {
        "status": "operational",
        "database": "not_configured",
        "model_status": "baseline-cnn-v1",
        "version": "1.0.0"
    }