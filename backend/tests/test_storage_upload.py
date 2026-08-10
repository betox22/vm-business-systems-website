import base64
import unittest

from app.storage import StorageError, validate_upload


def _data_of(size: int) -> bytes:
    return b"\x00" * size


class ValidateUploadTests(unittest.TestCase):
    def test_rejects_empty_payload(self) -> None:
        with self.assertRaises(StorageError):
            validate_upload(asset_type="photo", content_type="image/png", data=b"")

    def test_accepts_allowed_image_type_under_size_cap(self) -> None:
        validate_upload(asset_type="photo", content_type="image/png", data=_data_of(1024))
        validate_upload(asset_type="logo", content_type="image/webp", data=_data_of(1024))

    def test_rejects_disallowed_image_mime_type(self) -> None:
        with self.assertRaises(StorageError):
            validate_upload(asset_type="photo", content_type="application/octet-stream", data=_data_of(1024))

    def test_rejects_svg_to_avoid_stored_script_risk(self) -> None:
        with self.assertRaises(StorageError):
            validate_upload(asset_type="logo", content_type="image/svg+xml", data=_data_of(1024))

    def test_rejects_oversized_image(self) -> None:
        with self.assertRaises(StorageError):
            validate_upload(asset_type="photo", content_type="image/png", data=_data_of(11 * 1024 * 1024))

    def test_accepts_allowed_video_type_under_its_own_higher_cap(self) -> None:
        validate_upload(asset_type="video", content_type="video/mp4", data=_data_of(15 * 1024 * 1024))

    def test_rejects_video_mime_type_for_photo_asset_type(self) -> None:
        # A "photo" upload claiming a video MIME type should be judged against
        # the image whitelist, not silently treated as a video.
        with self.assertRaises(StorageError):
            validate_upload(asset_type="photo", content_type="video/mp4", data=_data_of(1024))

    def test_rejects_oversized_video(self) -> None:
        with self.assertRaises(StorageError):
            validate_upload(asset_type="video", content_type="video/mp4", data=_data_of(21 * 1024 * 1024))

    def test_content_type_with_charset_suffix_is_normalized(self) -> None:
        validate_upload(asset_type="photo", content_type="image/png; charset=binary", data=_data_of(1024))


if __name__ == "__main__":
    unittest.main()
