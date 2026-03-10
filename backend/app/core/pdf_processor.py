import base64
import io
import logging
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter, ImageOps

logger = logging.getLogger(__name__)

MAX_DIMENSION = 2048


class PDFProcessor:
    """Handles PDF and image processing for document extraction."""

    @staticmethod
    def pdf_to_images(file_path: str) -> list[Image.Image]:
        """Convert a PDF file to a list of PIL Images.

        Handles password-protected and corrupt PDFs with clear error messages.

        Args:
            file_path: Path to the PDF file.

        Returns:
            List of PIL Image objects, one per page.

        Raises:
            ValueError: If PDF is empty, corrupt, or password-protected.
        """
        from pdf2image import convert_from_path
        from pdf2image.exceptions import PDFPageCountError, PDFSyntaxError

        try:
            images = convert_from_path(file_path, dpi=300)
        except PDFPageCountError:
            raise ValueError(
                "Could not read PDF: the file may be password-protected, "
                "corrupt, or contain no pages."
            )
        except PDFSyntaxError:
            raise ValueError(
                "Invalid PDF structure: the file appears to be corrupt or "
                "is not a valid PDF document."
            )
        except Exception as e:
            error_msg = str(e).lower()
            if "password" in error_msg or "encrypted" in error_msg:
                raise ValueError(
                    "This PDF is password-protected. Please remove the "
                    "password and re-upload."
                )
            raise ValueError(f"Failed to process PDF: {e}")

        if not images:
            raise ValueError(
                "PDF contains no readable pages. The file may be empty or corrupt."
            )

        logger.info("Converted PDF to %d page image(s) at 300 DPI", len(images))
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
    def enhance_image(image: Image.Image) -> Image.Image:
        """Apply contrast and sharpening to improve extraction quality.

        Args:
            image: PIL Image to enhance.

        Returns:
            Enhanced PIL Image.
        """
        enhanced = ImageEnhance.Contrast(image).enhance(1.2)
        enhanced = ImageEnhance.Sharpness(enhanced).enhance(1.5)
        return enhanced

    @staticmethod
    def auto_orient_image(image: Image.Image) -> Image.Image:
        """Auto-rotate image based on EXIF orientation data.

        Many phone/scanner photos have EXIF rotation metadata that
        PIL doesn't apply automatically. This ensures the image is
        displayed in the correct orientation for extraction.

        Args:
            image: PIL Image that may contain EXIF orientation data.

        Returns:
            Correctly oriented PIL Image.
        """
        try:
            return ImageOps.exif_transpose(image)
        except Exception:
            # If EXIF data is missing or corrupt, return as-is
            return image

    @staticmethod
    def image_to_base64(image: Image.Image, format: str = "PNG") -> tuple[str, str]:
        """Convert a PIL Image to a base64-encoded string.

        Args:
            image: PIL Image to encode.
            format: Output format (PNG or JPEG).

        Returns:
            Tuple of (base64_data, media_type).
        """
        # Force RGB to handle RGBA, CMYK, palette mode images
        if image.mode not in ("RGB", "L"):
            image = image.convert("RGB")

        buffer = io.BytesIO()
        if format.upper() == "JPEG":
            image.save(buffer, format=format, quality=95)
        else:
            image.save(buffer, format=format)
        b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
        media_type = f"image/{format.lower()}"
        if format.upper() == "JPEG":
            media_type = "image/jpeg"
        return b64, media_type

    @classmethod
    def process_file(cls, file_path: str, mime_type: str) -> list[tuple[str, str]]:
        """Process a file (PDF or image) into base64-encoded images for Claude.

        Handles edge cases: corrupt files, password-protected PDFs,
        EXIF-rotated images, unusual color modes, and empty documents.

        Args:
            file_path: Path to the file.
            mime_type: MIME type of the file.

        Returns:
            List of (base64_data, media_type) tuples.

        Raises:
            ValueError: If file cannot be processed (corrupt, empty, etc.)
        """
        # Validate file exists and is not empty
        path = Path(file_path)
        if not path.exists():
            raise ValueError(f"File not found: {file_path}")
        if path.stat().st_size == 0:
            raise ValueError("File is empty (0 bytes).")

        if mime_type == "application/pdf":
            images = cls.pdf_to_images(file_path)
            result = []
            for img in images:
                resized = cls.resize_image(img)
                enhanced = cls.enhance_image(resized)
                b64, mt = cls.image_to_base64(enhanced)
                result.append((b64, mt))
            return result
        elif mime_type in ("image/png", "image/jpeg", "image/jpg", "image/webp", "image/tiff"):
            try:
                img = Image.open(file_path)
                img.load()  # Force full load to catch truncated/corrupt images
            except Exception as e:
                raise ValueError(
                    f"Cannot open image file: {e}. The file may be corrupt "
                    "or not a valid image."
                )

            # Auto-rotate based on EXIF (common with phone photos/scans)
            img = cls.auto_orient_image(img)
            resized = cls.resize_image(img)
            enhanced = cls.enhance_image(resized)
            fmt = "JPEG" if "jpeg" in mime_type or "jpg" in mime_type else "PNG"
            b64, mt = cls.image_to_base64(enhanced, format=fmt)
            return [(b64, mt)]
        else:
            raise ValueError(f"Unsupported file type: {mime_type}")
