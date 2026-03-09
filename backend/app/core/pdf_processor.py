import base64
import io
import logging
from pathlib import Path

from PIL import Image

logger = logging.getLogger(__name__)

MAX_DIMENSION = 1568


class PDFProcessor:
    """Handles PDF and image processing for document extraction."""

    @staticmethod
    def pdf_to_images(file_path: str) -> list[Image.Image]:
        """Convert a PDF file to a list of PIL Images.

        Args:
            file_path: Path to the PDF file.

        Returns:
            List of PIL Image objects, one per page.
        """
        from pdf2image import convert_from_path

        images = convert_from_path(file_path, dpi=200)
        logger.info("Converted PDF to %d page image(s)", len(images))
        return images

    @staticmethod
    def resize_image(image: Image.Image) -> Image.Image:
        """Resize an image so the longest side is at most MAX_DIMENSION pixels.

        Args:
            image: PIL Image to resize.

        Returns:
            Resized PIL Image (or original if already within bounds).
        """
        width, height = image.size
        longest = max(width, height)
        if longest <= MAX_DIMENSION:
            return image

        scale = MAX_DIMENSION / longest
        new_width = int(width * scale)
        new_height = int(height * scale)
        resized = image.resize((new_width, new_height), Image.LANCZOS)
        logger.info("Resized image from %dx%d to %dx%d", width, height, new_width, new_height)
        return resized

    @staticmethod
    def image_to_base64(image: Image.Image, format: str = "PNG") -> tuple[str, str]:
        """Convert a PIL Image to a base64-encoded string.

        Args:
            image: PIL Image to encode.
            format: Output format (PNG or JPEG).

        Returns:
            Tuple of (base64_data, media_type).
        """
        buffer = io.BytesIO()
        image.save(buffer, format=format)
        b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
        media_type = f"image/{format.lower()}"
        if format.upper() == "JPEG":
            media_type = "image/jpeg"
        return b64, media_type

    @classmethod
    def process_file(cls, file_path: str, mime_type: str) -> list[tuple[str, str]]:
        """Process a file (PDF or image) into base64-encoded images for Claude.

        Args:
            file_path: Path to the file.
            mime_type: MIME type of the file.

        Returns:
            List of (base64_data, media_type) tuples.
        """
        if mime_type == "application/pdf":
            images = cls.pdf_to_images(file_path)
            result = []
            for img in images:
                resized = cls.resize_image(img)
                b64, mt = cls.image_to_base64(resized)
                result.append((b64, mt))
            return result
        elif mime_type in ("image/png", "image/jpeg", "image/jpg", "image/webp"):
            img = Image.open(file_path)
            resized = cls.resize_image(img)
            fmt = "JPEG" if "jpeg" in mime_type or "jpg" in mime_type else "PNG"
            b64, mt = cls.image_to_base64(resized, format=fmt)
            return [(b64, mt)]
        else:
            raise ValueError(f"Unsupported file type: {mime_type}")
