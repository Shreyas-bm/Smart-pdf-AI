import os
import logging
from typing import BinaryIO, Optional
import boto3
from botocore.client import Config
from botocore.exceptions import ClientError
from dotenv import load_dotenv

# Load env variables in case this service is imported independently
load_dotenv()

logger = logging.getLogger(__name__)

class StorageService:
    """
    StorageService handles S3-compatible file operations (Cloudflare R2, MinIO, AWS S3)
    including uploading, downloading, deleting files, and generating pre-signed URLs.
    """
    def __init__(self):
        self.endpoint_url = os.getenv("S3_ENDPOINT_URL")
        self.access_key = os.getenv("S3_ACCESS_KEY_ID")
        self.secret_key = os.getenv("S3_SECRET_ACCESS_KEY")
        self.bucket_name = os.getenv("S3_BUCKET_NAME", "smart-pdf-bucket")
        self.region_name = os.getenv("S3_REGION_NAME", "us-east-1")

        # Configure boto3 client with s3v4 signature version for compatibility
        self.client = boto3.client(
            "s3",
            endpoint_url=self.endpoint_url,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            region_name=self.region_name,
            config=Config(signature_version="s3v4"),
        )

    def ensure_bucket_exists(self) -> None:
        """
        Helper method to check if the target bucket exists, and create it if not.
        Mainly useful for local development with MinIO.
        """
        try:
            self.client.head_bucket(Bucket=self.bucket_name)
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code")
            if error_code in ["404", "NoSuchBucket"]:
                logger.info(f"Bucket '{self.bucket_name}' not found. Attempting to create it...")
                try:
                    if self.region_name == "us-east-1":
                        self.client.create_bucket(Bucket=self.bucket_name)
                    else:
                        self.client.create_bucket(
                            Bucket=self.bucket_name,
                            CreateBucketConfiguration={"LocationConstraint": self.region_name}
                        )
                    logger.info(f"Successfully created bucket '{self.bucket_name}'.")
                except Exception as create_err:
                    logger.error(f"Failed to create bucket '{self.bucket_name}': {create_err}")
                    raise create_err
            else:
                logger.error(f"Error checking bucket existence: {e}")
                raise e

    def upload_file(self, file_path: str, object_name: Optional[str] = None) -> str:
        """
        Upload a file from a local path to the S3 bucket.
        
        Args:
            file_path: Absolute or relative path to the local file.
            object_name: The name (key) the file will have in the bucket. If None, file_path base name is used.
            
        Returns:
            The object_name key in the bucket if successful.
        """
        if object_name is None:
            object_name = os.path.basename(file_path)

        try:
            self.client.upload_file(file_path, self.bucket_name, object_name)
            logger.info(f"Successfully uploaded {file_path} as {object_name} to bucket {self.bucket_name}.")
            return object_name
        except ClientError as e:
            logger.error(f"Failed to upload {file_path} to {object_name}: {e}")
            raise e

    def upload_fileobj(self, file_obj: BinaryIO, object_name: str) -> str:
        """
        Upload a file-like object to the S3 bucket.
        
        Args:
            file_obj: A binary file-like object (e.g. from FastAPI's UploadFile.file).
            object_name: The name (key) the file will have in the bucket.
            
        Returns:
            The object_name key in the bucket if successful.
        """
        try:
            self.client.upload_fileobj(file_obj, self.bucket_name, object_name)
            logger.info(f"Successfully uploaded file object as {object_name} to bucket {self.bucket_name}.")
            return object_name
        except ClientError as e:
            logger.error(f"Failed to upload file object to {object_name}: {e}")
            raise e

    def download_file(self, object_name: str, file_path: str) -> None:
        """
        Download a file from the S3 bucket to a local file path.
        
        Args:
            object_name: The name (key) of the file in the bucket.
            file_path: The local destination file path.
        """
        try:
            self.client.download_file(self.bucket_name, object_name, file_path)
            logger.info(f"Successfully downloaded {object_name} to {file_path}.")
        except ClientError as e:
            logger.error(f"Failed to download {object_name} to {file_path}: {e}")
            raise e

    def generate_presigned_url(self, object_name: str, expiration: int = 3600) -> str:
        """
        Generate a pre-signed URL to share/download the private S3 object.
        
        Args:
            object_name: The name (key) of the file in the bucket.
            expiration: Time in seconds for the pre-signed URL to remain valid.
            
        Returns:
            The pre-signed URL string.
        """
        try:
            response = self.client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket_name, "Key": object_name},
                ExpiresIn=expiration,
            )
            return response
        except ClientError as e:
            logger.error(f"Failed to generate pre-signed URL for {object_name}: {e}")
            raise e

    def delete_file(self, object_name: str) -> bool:
        """
        Delete an object from the S3 bucket.
        
        Args:
            object_name: The name (key) of the file in the bucket.
            
        Returns:
            True if deletion was successful, False otherwise.
        """
        try:
            self.client.delete_object(Bucket=self.bucket_name, Key=object_name)
            logger.info(f"Successfully deleted {object_name} from bucket {self.bucket_name}.")
            return True
        except ClientError as e:
            logger.error(f"Failed to delete {object_name} from bucket {self.bucket_name}: {e}")
            return False
