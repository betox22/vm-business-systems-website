import asyncio
import hashlib
import hmac
import io
import json
import unittest
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException
from PIL import Image
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from starlette.requests import Request

from app import commerce, main
from app.db import Base
from app.db_models import GeneratedLogo, GeneratedSite, Store
from app.models import LogoGenerateRequest, LogoSelectRequest


def _png_bytes() -> bytes:
    image = Image.new("RGB", (900, 900), color=(40, 90, 130))
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


class LogoApiTests(unittest.TestCase):
    def setUp(self) -> None:
        engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
        Base.metadata.create_all(bind=engine)
        self.session = sessionmaker(bind=engine)()
        self.user = {"id": "owner_1", "email": "owner@example.com"}
        self.session.add(Store(
            id="store_1", owner_user_id="owner_1", owner_email="owner@example.com",
            name="Bath All Day", business_type="beauty", public_url="bath.vmstores.com",
        ))
        self.session.add(GeneratedSite(
            id="site_1", store_id="store_1", owner_user_id="owner_1", owner_email="owner@example.com",
            business_name="Bath All Day", business_type="beauty", template_id="mega-retail-store",
            template_name="Retail", template_mode="retail", domain_slug="bath-all-day",
            public_url="bath.vmstores.com", generated_config=json.dumps({
                "business": {"name": "Bath All Day", "industry": "beauty"},
                "brand": {"preferredColors": "sage and white"},
                "theme": {"primary": "#87A96B", "accent": "#FFFFFF"},
            }),
        ))
        self.session.commit()

    def tearDown(self) -> None:
        self.session.close()

    def test_generate_select_and_paid_download_never_leak_private_path_early(self) -> None:
        original = _png_bytes()
        with (
            patch.object(main, "authenticated_client_user", return_value=self.user),
            patch.object(main, "supabase_storage_configured", return_value=True),
            patch.object(main, "generate_logo_images", new=AsyncMock(return_value=([(0, original), (1, original), (2, original)], []))),
            patch.object(main, "upload_private_asset_to_supabase", side_effect=lambda **kwargs: f"private/{kwargs['file_name']}"),
            patch.object(main, "upload_asset_to_supabase", side_effect=lambda **kwargs: f"https://public.test/{kwargs['file_name']}"),
        ):
            generated = asyncio.run(main.generate_logo(LogoGenerateRequest(siteId="site_1"), session=self.session))

        self.assertEqual(len(generated["variants"]), 3)
        self.assertNotIn("cleanAssetPath", generated["variants"][0])
        logo_id = generated["logoId"]
        with patch.object(main, "authenticated_client_user", return_value=self.user):
            selected = asyncio.run(main.select_logo_variant(logo_id, LogoSelectRequest(variantIndex=1), session=self.session))
        self.assertEqual(selected["status"], "pending_payment")

        with patch.object(main, "authenticated_client_user", return_value=self.user):
            with self.assertRaises(HTTPException) as blocked:
                asyncio.run(main.download_logo(logo_id, session=self.session))
        self.assertEqual(blocked.exception.status_code, 402)

        logo = self.session.get(GeneratedLogo, logo_id)
        logo.status = "paid"
        self.session.commit()
        with (
            patch.object(main, "authenticated_client_user", return_value=self.user),
            patch.object(main, "download_private_asset_from_supabase", return_value=original),
            patch.object(main, "upload_asset_to_supabase", return_value="https://public.test/final-logo.png"),
            patch.object(main, "create_signed_url", return_value="https://private.test/signed-logo"),
        ):
            released = asyncio.run(main.download_logo(logo_id, session=self.session))
        self.assertEqual(released["logoUrl"], "https://public.test/final-logo.png")
        self.assertEqual(released["downloadUrl"], "https://private.test/signed-logo")

    def test_stripe_webhook_marks_logo_paid_without_touching_order_logic(self) -> None:
        logo = GeneratedLogo(
            id="logo_webhook", site_id="site_1", store_id="store_1", owner_user_id="owner_1",
            owner_email="owner@example.com", business_name="Bath All Day", selected_variant_index=0,
            status="pending_payment",
        )
        self.session.add(logo)
        self.session.commit()
        raw = json.dumps({
            "type": "checkout.session.completed",
            "data": {"object": {"id": "cs_logo_1", "metadata": {"logo_id": logo.id}}},
        }).encode("utf-8")
        secret = "whsec_test"
        timestamp = "123456"
        digest = hmac.new(secret.encode("utf-8"), f"{timestamp}.".encode("utf-8") + raw, hashlib.sha256).hexdigest()

        async def receive():
            return {"type": "http.request", "body": raw, "more_body": False}

        request = Request({"type": "http", "method": "POST", "path": "/api/v1/payments/stripe/webhook", "headers": []}, receive)
        with patch.dict("os.environ", {"STRIPE_WEBHOOK_SECRET": secret}):
            result = asyncio.run(commerce.stripe_webhook(request, stripe_signature=f"t={timestamp},v1={digest}", session=self.session))
        self.assertEqual(result, {"received": True})
        self.assertEqual(self.session.get(GeneratedLogo, logo.id).status, "paid")


if __name__ == "__main__":
    unittest.main()
