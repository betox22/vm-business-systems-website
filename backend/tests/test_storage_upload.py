import base64
import unittest
from unittest.mock import Mock, patch

from app.storage import StorageError, delete_site_assets_from_supabase, validate_upload


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

    def test_delete_site_assets_uses_exact_business_and_site_prefix(self) -> None:
        list_response = Mock(status_code=200)
        list_response.json.return_value = [{"id": "asset-1", "name": "photo/soap.jpg", "metadata": {"size": 10}}]
        delete_response = Mock(status_code=200)
        with (
            patch.dict(
                "os.environ",
                {"SUPABASE_URL": "https://project.supabase.co", "SUPABASE_SERVICE_ROLE_KEY": "service-key"},
                clear=False,
            ),
            patch("app.storage.httpx.post", return_value=list_response) as list_objects,
            patch("app.storage.httpx.request", return_value=delete_response) as delete_objects,
        ):
            deleted = delete_site_assets_from_supabase(business_id="store_1", site_id="site_2")

        self.assertEqual(deleted, 1)
        self.assertEqual(list_objects.call_args.kwargs["json"]["prefix"], "store_1/site_2")
        self.assertEqual(
            delete_objects.call_args.kwargs["json"],
            {"prefixes": ["store_1/site_2/photo/soap.jpg"]},
        )


if __name__ == "__main__":
    unittest.main()
