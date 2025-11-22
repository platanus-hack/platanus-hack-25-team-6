import boto3
from botocore.client import Config
from .config import get_settings
from typing import BinaryIO

settings = get_settings()


class MinioClient:
    def __init__(self):
        self.client = boto3.client(
            's3',
            endpoint_url=f"http://{settings.minio_endpoint}" if not settings.minio_use_ssl else f"https://{settings.minio_endpoint}",
            aws_access_key_id=settings.minio_access_key,
            aws_secret_access_key=settings.minio_secret_key,
            config=Config(signature_version='s3v4'),
            region_name='us-east-1'
        )
        self.bucket = settings.minio_bucket
        self._ensure_bucket()

    def _ensure_bucket(self):
        """Ensure bucket exists"""
        try:
            self.client.head_bucket(Bucket=self.bucket)
        except:
            self.client.create_bucket(Bucket=self.bucket)
            print(f"Created bucket: {self.bucket}")

    async def upload_file(self, file_obj: BinaryIO, object_name: str, content_type: str = "audio/webm") -> str:
        """Upload file to MinIO"""
        self.client.upload_fileobj(
            file_obj,
            self.bucket,
            object_name,
            ExtraArgs={'ContentType': content_type}
        )
        return f"{settings.minio_endpoint}/{self.bucket}/{object_name}"

    def get_file_url(self, object_name: str, expiration: int = 3600) -> str:
        """Generate presigned URL for file"""
        return self.client.generate_presigned_url(
            'get_object',
            Params={'Bucket': self.bucket, 'Key': object_name},
            ExpiresIn=expiration
        )

    async def delete_file(self, object_name: str):
        """Delete file from MinIO"""
        self.client.delete_object(Bucket=self.bucket, Key=object_name)


minio_client = MinioClient()
