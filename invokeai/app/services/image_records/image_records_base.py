from abc import ABC, abstractmethod
from datetime import datetime
from typing import Literal, Optional

from invokeai.app.invocations.fields import MetadataField
from invokeai.app.services.image_records.image_records_common import (
    ImageCategory,
    ImageRecord,
    ImageRecordChanges,
    ResourceOrigin,
)
from invokeai.app.services.shared.pagination import OffsetPaginatedResults
from invokeai.app.services.shared.sqlite.sqlite_common import SQLiteDirection


class ImageRecordStorageBase(ABC):
    """Low-level service responsible for interfacing with the image record store."""

    # TODO: Implement an `update()` method

    @abstractmethod
    def get(self, image_name: str) -> ImageRecord:
        """Gets an image record."""
        pass

    @abstractmethod
    def get_metadata(self, image_name: str) -> Optional[MetadataField]:
        """Gets an image's metadata'."""
        pass

    @abstractmethod
    def update(
        self,
        image_name: str,
        changes: ImageRecordChanges,
    ) -> None:
        """Updates an image record."""
        pass

    @abstractmethod
    def get_many(
        self,
        offset: int = 0,
        limit: int = 10,
        starred_first: bool = True,
        order_dir: SQLiteDirection = SQLiteDirection.Descending,
        image_origin: Optional[ResourceOrigin] = None,
        categories: Optional[list[ImageCategory]] = None,
        is_intermediate: Optional[bool] = None,
        board_id: Optional[str] = None,
        search_term: Optional[str] = None,
    ) -> OffsetPaginatedResults[ImageRecord]:
        """Gets a page of image records."""
        pass

    # TODO: The database has a nullable `deleted_at` column, currently unused.
    # Should we implement soft deletes? Would need coordination with ImageFileStorage.
    @abstractmethod
    def delete(self, image_name: str) -> None:
        """Deletes an image record."""
        pass

    @abstractmethod
    def delete_many(self, image_names: list[str]) -> None:
        """Deletes many image records."""
        pass

    @abstractmethod
    def delete_intermediates(self) -> list[str]:
        """Deletes all intermediate image records, returning a list of deleted image names."""
        pass

    @abstractmethod
    def get_intermediates_count(self) -> int:
        """Gets a count of all intermediate images."""
        pass

    @abstractmethod
    def save(
        self,
        image_name: str,
        image_origin: ResourceOrigin,
        image_category: ImageCategory,
        width: int,
        height: int,
        has_workflow: bool,
        is_intermediate: Optional[bool] = False,
        starred: Optional[bool] = False,
        session_id: Optional[str] = None,
        node_id: Optional[str] = None,
        metadata: Optional[str] = None,
    ) -> datetime:
        """Saves an image record."""
        pass

    @abstractmethod
    def get_most_recent_image_for_board(self, board_id: str) -> Optional[ImageRecord]:
        """Gets the most recent image for a board."""
        pass

    @abstractmethod
    def get_image_names(
        self,
        board_id: str | None,
        category: Literal["images", "assets"],
        starred_first: bool = True,
        order_dir: SQLiteDirection = SQLiteDirection.Descending,
        search_term: Optional[str] = None,
    ) -> list[str]:
        """Gets image names."""
        pass

    @abstractmethod
    def get_images_by_name(self, image_names: list[str]) -> list[ImageRecord]:
        pass

    @abstractmethod
    def get_images(
        self,
        board_id: str | None = None,
        category: Literal["images", "assets"] = "images",
        starred_first: bool = True,
        order_dir: SQLiteDirection = SQLiteDirection.Descending,
        search_term: str | None = None,
        from_image_name: str | None = None,  # omit for first page
        count: int = 10,
    ) -> list[ImageRecord]:
        pass
