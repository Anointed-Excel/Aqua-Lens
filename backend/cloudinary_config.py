import os
import logging
import cloudinary
import cloudinary.uploader
from io import BytesIO

logger = logging.getLogger(__name__)

cloudinary.config(
    cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME'),
    api_key=os.environ.get('CLOUDINARY_API_KEY'),
    api_secret=os.environ.get('CLOUDINARY_API_SECRET'),
    secure=True
)

if not cloudinary.config().cloud_name:
    logger.warning(
        'Cloudinary credentials not configured. Image uploads will fail. '
        'Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.'
    )


def upload_base64_image(base64_str: str, folder: str = 'fishid/scans') -> str | None:
    """Upload a base64 image string to Cloudinary. Returns the secure URL or None."""
    try:
        data_uri = f'data:image/jpeg;base64,{base64_str}'
        result = cloudinary.uploader.upload(
            data_uri,
            folder=folder,
            resource_type='image',
            format='jpg',
            quality='auto:good',
            fetch_format='auto',
        )
        return result.get('secure_url')
    except Exception as e:
        print(f'Cloudinary upload error: {e}')
        return None


def upload_file_object(file_obj, folder: str = 'fishid/scans') -> str | None:
    """Upload a file object to Cloudinary. Returns the secure URL or None."""
    try:
        result = cloudinary.uploader.upload(
            file_obj,
            folder=folder,
            resource_type='image',
            format='jpg',
            quality='auto:good',
            fetch_format='auto',
        )
        return result.get('secure_url')
    except Exception as e:
        print(f'Cloudinary upload error: {e}')
        return None


def delete_image(public_id: str) -> bool:
    """Delete an image from Cloudinary by public_id."""
    try:
        cloudinary.uploader.destroy(public_id)
        return True
    except Exception as e:
        print(f'Cloudinary delete error: {e}')
        return False
