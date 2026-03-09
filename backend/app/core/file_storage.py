import hashlib
import logging
import os
import uuid
from pathlib import Path

from app.config import Settings

logger = logging.getLogger(__name__)

settings = Settings()


class FileStorage:
    """Simple local file storage for uploaded documents."""

    def __init__(self, upload_dir: str | None = None):
        self.upload_dir = Path(upload_dir or settings.upload_dir)
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    def save_file(self, file_name: str, content: bytes) -> str:
        """Save a file to the upload directory.

        Generates a unique subdirectory to avoid name collisions.

        Args:
            file_name: Original file name.
            content: Raw file bytes.

        Returns:
            Relative file path from the upload directory.
        """
        unique_dir = str(uuid.uuid4())
        dir_path = self.upload_dir / unique_dir
        dir_path.mkdir(parents=True, exist_ok=True)

        file_path = dir_path / file_name
        file_path.write_bytes(content)
        logger.info("Saved file: %s (%d bytes)", file_path, len(content))

        return str(file_path)

    def get_file(self, file_path: str) -> bytes:
        """Read a file from storage.

        Args:
            file_path: Path to the file (absolute or relative to upload dir).

        Returns:
            Raw file bytes.

        Raises:
            FileNotFoundError: If the file does not exist.
        """
        path = Path(file_path)
        if not path.is_absolute():
            path = self.upload_dir / path

        if not path.exists():
            raise FileNotFoundError(f"File not found: {path}")

        return path.read_bytes()

    def delete_file(self, file_path: str) -> bool:
        """Delete a file from storage.

        Args:
            file_path: Path to the file.

        Returns:
            True if file was deleted, False if it didn't exist.
        """
        path = Path(file_path)
        if not path.is_absolute():
            path = self.upload_dir / path

        if path.exists():
            path.unlink()
            logger.info("Deleted file: %s", path)
            # Clean up empty parent directory
            try:
                path.parent.rmdir()
            except OSError:
                pass
            return True
        return False

    @staticmethod
    def compute_hash(content: bytes) -> str:
        """Compute the SHA-256 hex digest of file content.

        Args:
            content: Raw file bytes.

        Returns:
            Hex-encoded SHA-256 hash string.
        """
        return hashlib.sha256(content).hexdigest()
