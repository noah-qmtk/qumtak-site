#!/usr/bin/env python3
"""
Set up Square catalog + checkout links for qmtk Soccer.

Usage:
    SQUARE_ENV=sandbox SQUARE_ACCESS_TOKEN=EAAA... python3 scripts/setup_square.py

Creates catalog items (private session, 5-pack, 10-pack, gift cards) and
generates Square Checkout URLs. Writes results to public/square-products.json
so the site can render Buy Now buttons that point at the live URLs.

Idempotent for the catalog (uses upsert by client-side ID prefixed with `#`).
Re-running will create *new* payment links each time — that's fine; old ones
keep working but the JSON points to the freshest URLs.
"""

import json
import os
import sys
import uuid
import requests

ENV = os.environ.get("SQUARE_ENV", "sandbox").lower()
TOKEN = os.environ.get("SQUARE_ACCESS_TOKEN")

if not TOKEN:
    sys.exit("error: set SQUARE_ACCESS_TOKEN environment variable")

BASE_URL = {
    "sandbox": "https://connect.squareupsandbox.com",
    "production": "https://connect.squareup.com",
}[ENV]

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json",
    "Square-Version": "2024-12-19",
}

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_PATH = os.path.join(ROOT, "public", "square-products.json")
LOGO_PATH = os.path.join(ROOT, "public", "logo.png")

REDIRECT_URL = "https://qmtk.org/?purchase=success"
SUPPORT_EMAIL = "noah@qmtk.org"

PRODUCTS = [
    {
        "key": "intro_call",
        "name": "Intro Call — $20 Deposit",
        "description": "Reserve a 20-minute intro call with Coach Shaya. Deposit applies in full to your first session — no charge if we're not a fit.",
        "price_cents": 2000,
    },
    {
        "key": "private_1",
        "name": "Private Training — 1 Session",
        "description": "60-minute one-on-one session with Coach Shaya. All ages, K through high school.",
        "price_cents": 8500,
    },
    {
        "key": "private_5",
        "name": "Private Training — 5-Pack",
        "description": "Five 60-minute private training sessions. $80 per session — save $25.",
        "price_cents": 40000,
    },
    {
        "key": "private_10",
        "name": "Private Training — 10-Pack",
        "description": "Ten 60-minute private training sessions. $75 per session — save $100.",
        "price_cents": 75000,
    },
    {
        "key": "gift_50",
        "name": "qmtk Gift Card — $50",
        "description": "Redeemable for any qmtk Soccer service. Perfect for birthdays or holidays.",
        "price_cents": 5000,
    },
    {
        "key": "gift_100",
        "name": "qmtk Gift Card — $100",
        "description": "Redeemable for any qmtk Soccer service.",
        "price_cents": 10000,
    },
    {
        "key": "gift_200",
        "name": "qmtk Gift Card — $200",
        "description": "Redeemable for any qmtk Soccer service.",
        "price_cents": 20000,
    },
]


def req(method, path, body=None):
    url = f"{BASE_URL}{path}"
    r = requests.request(method, url, headers=HEADERS, json=body, timeout=20)
    if not r.ok:
        print(f"\n{method} {path} → {r.status_code}", file=sys.stderr)
        print(r.text, file=sys.stderr)
        r.raise_for_status()
    return r.json()


def get_main_location():
    data = req("GET", "/v2/locations")
    locs = data.get("locations", [])
    if not locs:
        sys.exit("error: no locations on this Square account")
    active = [l for l in locs if l.get("status") == "ACTIVE"]
    return (active or locs)[0]


def upload_logo_image():
    """Upload the qmtk logo as a standalone catalog image. Returns the image_id."""
    if not os.path.exists(LOGO_PATH):
        print(f"warn: {LOGO_PATH} not found — skipping logo upload")
        return None
    request_json = {
        "idempotency_key": f"qmtk-logo-{uuid.uuid4()}",
        "image": {
            "type": "IMAGE",
            "id": "#qmtk-logo",
            "image_data": {
                "caption": "qmtk Soccer",
                "name": "qmtk-logo",
            },
        },
    }
    url = f"{BASE_URL}/v2/catalog/images"
    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Square-Version": "2024-12-19",
        # Content-Type is set automatically by requests for multipart
    }
    with open(LOGO_PATH, "rb") as f:
        files = {
            "request": (None, json.dumps(request_json), "application/json"),
            "image_file": ("logo.png", f, "image/png"),
        }
        r = requests.post(url, headers=headers, files=files, timeout=30)
    if not r.ok:
        print(f"\nPOST /v2/catalog/images → {r.status_code}", file=sys.stderr)
        print(r.text, file=sys.stderr)
        r.raise_for_status()
    data = r.json()
    image_id = data["image"]["id"]
    print(f"uploaded logo → image_id: {image_id}")
    return image_id


def upsert_catalog_item(product, image_id=None):
    item_id = f"#{product['key']}"
    var_id = f"#{product['key']}_var"
    body = {
        "idempotency_key": f"qmtk-cat-{product['key']}-{uuid.uuid4()}",
        "object": {
            "type": "ITEM",
            "id": item_id,
            "present_at_all_locations": True,
            "item_data": {
                "name": product["name"],
                "description": product["description"],
                **({"image_ids": [image_id]} if image_id else {}),
                "variations": [
                    {
                        "type": "ITEM_VARIATION",
                        "id": var_id,
                        "present_at_all_locations": True,
                        "item_variation_data": {
                            "name": "Standard",
                            "pricing_type": "FIXED_PRICING",
                            "price_money": {
                                "amount": product["price_cents"],
                                "currency": "USD",
                            },
                        },
                    }
                ],
            },
        },
    }
    data = req("POST", "/v2/catalog/object", body)
    obj = data["catalog_object"]
    id_map = {m["client_object_id"]: m["object_id"] for m in data.get("id_mappings", [])}
    real_item_id = id_map.get(item_id, obj["id"])
    real_var_id = id_map.get(var_id) or obj["item_data"]["variations"][0]["id"]
    return real_item_id, real_var_id


def create_payment_link(product, variation_id, location_id):
    body = {
        "idempotency_key": f"qmtk-link-{product['key']}-{uuid.uuid4()}",
        "order": {
            "location_id": location_id,
            "line_items": [
                {
                    "quantity": "1",
                    "catalog_object_id": variation_id,
                }
            ],
        },
        "checkout_options": {
            "redirect_url": REDIRECT_URL,
            "ask_for_shipping_address": False,
            "merchant_support_email": SUPPORT_EMAIL,
            "allow_tipping": False,
        },
    }
    data = req("POST", "/v2/online-checkout/payment-links", body)
    return data["payment_link"]["url"]


def main():
    print(f"env: {ENV}")
    loc = get_main_location()
    location_id = loc["id"]
    print(f"location: {loc.get('name', '<unnamed>')} ({location_id})\n")

    logo_image_id = upload_logo_image()

    results = []
    for p in PRODUCTS:
        print(f"creating: {p['name']}")
        item_id, var_id = upsert_catalog_item(p, image_id=logo_image_id)
        url = create_payment_link(p, var_id, location_id)
        print(f"   → {url}")
        results.append({
            "key": p["key"],
            "name": p["name"],
            "price_cents": p["price_cents"],
            "catalog_item_id": item_id,
            "catalog_variation_id": var_id,
            "checkout_url": url,
        })

    output = {
        "env": ENV,
        "location_id": location_id,
        "products": results,
    }
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\nwrote {OUT_PATH}")


if __name__ == "__main__":
    main()
