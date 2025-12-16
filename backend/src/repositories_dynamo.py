import os
import boto3
from boto3.dynamodb.conditions import Key
from typing import List, Optional, Dict, Any

from models import Site, Page, generate_id, now_iso


dynamodb = boto3.resource("dynamodb")


def _sites_table():
    name = os.environ.get("SITES_TABLE", "fg_sites")
    return dynamodb.Table(name)


def _pages_table():
    name = os.environ.get("PAGES_TABLE", "fg_pages")
    return dynamodb.Table(name)


def _site_from_item(item: Dict[str, Any]) -> Site:
    return Site(
        id=item["site_id"],
        owner_account_id=item["owner_account_id"],
        name=item.get("name", "New Site"),
        slug=item.get("slug", item["site_id"][:8]),
        primary_domain=item.get("primary_domain"),
        dealer_account_id=item.get("dealer_account_id"),
        publish_status=item.get("publish_status", "draft"),
        published_at=item.get("published_at"),
        settings=item.get("settings", {}) or {},
        created_at=item.get("created_at", now_iso()),
        updated_at=item.get("updated_at", now_iso()),
    )


def _page_from_item(item: Dict[str, Any]) -> Page:
    return Page(
        id=item["page_id"],
        site_id=item["site_id"],
        name=item.get("name", "New Page"),
        slug=item.get("slug", ""),
        type=item.get("type", "page"),
        editor_state=item.get("editor_state", {}) or {},
        published_state=item.get("published_state"),
        published_html_url=item.get("published_html_url"),
        last_editor_account_id=item.get("last_editor_account_id"),
        created_at=item.get("created_at", now_iso()),
        updated_at=item.get("updated_at", now_iso()),
    )


class DynamoSiteRepository:
    """
    Stores Sites in fg_sites table.

    PK/SK:
      pk = SITE#{site_id}
      sk = META

    GSI1:
      gsi1pk = OWNER#{owner_account_id}
      gsi1sk = SITE#{site_id}
    """
    def list_by_owner(self, owner_account_id: str) -> List[Site]:
        t = _sites_table()
        resp = t.query(
            IndexName="gsi1",
            KeyConditionExpression=Key("gsi1pk").eq(f"OWNER#{owner_account_id}"),
        )
        items = resp.get("Items", [])
        return [_site_from_item(i) for i in items]

    def get_by_id(self, site_id: str) -> Optional[Site]:
        t = _sites_table()
        resp = t.get_item(Key={"pk": f"SITE#{site_id}", "sk": "META"})
        item = resp.get("Item")
        return _site_from_item(item) if item else None

    def create(self, owner_account_id: str, data: Dict[str, Any]) -> Site:
        site_id = generate_id()
        slug = data.get("slug") or site_id.split("-")[0]
        now = now_iso()

        item = {
            "pk": f"SITE#{site_id}",
            "sk": "META",
            "gsi1pk": f"OWNER#{owner_account_id}",
            "gsi1sk": f"SITE#{site_id}",
            "site_id": site_id,
            "owner_account_id": owner_account_id,
            "dealer_account_id": data.get("dealer_account_id"),
            "name": data.get("name", "New Site"),
            "slug": slug,
            "primary_domain": data.get("primary_domain"),
            "publish_status": "draft",
            "published_at": None,
            "settings": data.get("settings", {}) or {},
            "created_at": now,
            "updated_at": now,
        }
        _sites_table().put_item(Item=item)
        return _site_from_item(item)

    def update(self, site_id: str, patch: Dict[str, Any]) -> Optional[Site]:
        # Read-modify-write for simplicity (fine for now).
        existing = self.get_by_id(site_id)
        if not existing:
            return None

        # Apply patch to dataclass
        for k, v in patch.items():
            if v is None:
                continue
            if hasattr(existing, k):
                setattr(existing, k, v)
        existing.updated_at = now_iso()

        item = {
            "pk": f"SITE#{existing.id}",
            "sk": "META",
            "gsi1pk": f"OWNER#{existing.owner_account_id}",
            "gsi1sk": f"SITE#{existing.id}",
            "site_id": existing.id,
            "owner_account_id": existing.owner_account_id,
            "dealer_account_id": existing.dealer_account_id,
            "name": existing.name,
            "slug": existing.slug,
            "primary_domain": existing.primary_domain,
            "publish_status": existing.publish_status,
            "published_at": existing.published_at,
            "settings": existing.settings or {},
            "created_at": existing.created_at,
            "updated_at": existing.updated_at,
        }

        _sites_table().put_item(Item=item)
        return existing


class DynamoPageRepository:
    """
    Stores Pages in fg_pages table.

    PK/SK:
      pk = SITE#{site_id}
      sk = PAGE#{page_id}

    GSI1:
      gsi1pk = PAGE#{page_id}
      gsi1sk = META
    """
    def list_by_site(self, site_id: str) -> List[Page]:
        t = _pages_table()
        resp = t.query(
            KeyConditionExpression=Key("pk").eq(f"SITE#{site_id}") & Key("sk").begins_with("PAGE#")
        )
        items = resp.get("Items", [])
        return [_page_from_item(i) for i in items]

    def get_by_id(self, page_id: str) -> Optional[Page]:
        # Use GSI to lookup by page_id without knowing site_id
        t = _pages_table()
        resp = t.query(
            IndexName="gsi1",
            KeyConditionExpression=Key("gsi1pk").eq(f"PAGE#{page_id}") & Key("gsi1sk").eq("META")
        )
        items = resp.get("Items", [])
        if not items:
            return None
        return _page_from_item(items[0])

    def create(self, site_id: str, data: Dict[str, Any]) -> Page:
        page_id = generate_id()
        now = now_iso()

        item = {
            "pk": f"SITE#{site_id}",
            "sk": f"PAGE#{page_id}",
            "gsi1pk": f"PAGE#{page_id}",
            "gsi1sk": "META",
            "page_id": page_id,
            "site_id": site_id,
            "name": data.get("name", "New Page"),
            "slug": data.get("slug", ""),
            "type": data.get("type", "page"),
            "editor_state": data.get("editor_state", {}) or {},
            "published_state": None,
            "published_html_url": None,
            "last_editor_account_id": data.get("last_editor_account_id"),
            "created_at": now,
            "updated_at": now,
        }
        _pages_table().put_item(Item=item)
        return _page_from_item(item)

    def update(self, page_id: str, patch: Dict[str, Any]) -> Optional[Page]:
        existing = self.get_by_id(page_id)
        if not existing:
            return None

        for k, v in patch.items():
            if v is None:
                continue
            if hasattr(existing, k):
                setattr(existing, k, v)
        existing.updated_at = now_iso()

        item = {
            "pk": f"SITE#{existing.site_id}",
            "sk": f"PAGE#{existing.id}",
            "gsi1pk": f"PAGE#{existing.id}",
            "gsi1sk": "META",
            "page_id": existing.id,
            "site_id": existing.site_id,
            "name": existing.name,
            "slug": existing.slug,
            "type": existing.type,
            "editor_state": existing.editor_state or {},
            "published_state": existing.published_state,
            "published_html_url": existing.published_html_url,
            "last_editor_account_id": existing.last_editor_account_id,
            "created_at": existing.created_at,
            "updated_at": existing.updated_at,
        }

        _pages_table().put_item(Item=item)
        return existing
