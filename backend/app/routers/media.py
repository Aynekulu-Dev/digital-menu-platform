import uuid

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import APIRouter, Depends

from app import models
from app.config import settings
from app.dependencies import require_compliant_tenant
from app.exceptions import validation_failed, APIError
from app.schemas import PresignedUrlRequest, PresignedUrlResponse

router = APIRouter(prefix="/api/v1/media", tags=["media"])

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png"}
UPLOAD_TTL_SECONDS = 300


@router.post("/presigned-url/", response_model=PresignedUrlResponse)
def request_presigned_url(
    payload: PresignedUrlRequest,
    restaurant: models.Restaurant = Depends(require_compliant_tenant),
):
    """
    POST /api/v1/media/presigned-url/ — Section 4.2.6.

    Requires AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / S3_BUCKET_NAME to be
    set as environment variables. If they are not configured, this returns a
    clear 422 rather than silently failing (Section 4.4.2, Media Stream
    Handling Errors).
    """
    if payload.content_type not in ALLOWED_CONTENT_TYPES:
        raise validation_failed({"content_type": ["Unsupported file type. Only image/jpeg and image/png are permitted."]})

    if not (settings.aws_access_key_id and settings.aws_secret_access_key and settings.s3_bucket_name):
        raise APIError(422, "MEDIA_CONFIG_MISSING",
                        "S3 media storage is not configured on this deployment.")

    key = f"uploads/{restaurant.id}/{uuid.uuid4()}-{payload.file_name}"

    try:
        s3_client = boto3.client(
            "s3",
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
            region_name=settings.aws_region,
        )
        upload_url = s3_client.generate_presigned_url(
            ClientMethod="put_object",
            Params={"Bucket": settings.s3_bucket_name, "Key": key, "ContentType": payload.content_type},
            ExpiresIn=UPLOAD_TTL_SECONDS,
        )
    except (BotoCoreError, ClientError):
        raise APIError(422, "MEDIA_CONFIG_MISSING", "Unable to generate a presigned S3 upload URL.")

    public_file_url = f"https://{settings.s3_bucket_name}.s3.amazonaws.com/{key}"

    return PresignedUrlResponse(
        upload_url=upload_url,
        expires_in_seconds=UPLOAD_TTL_SECONDS,
        public_file_url=public_file_url,
    )
