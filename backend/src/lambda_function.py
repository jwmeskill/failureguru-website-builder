import json
from typing import Any, Dict

from repositories_dynamo import DynamoSiteRepository, DynamoPageRepository
from renderer import render_page_to_html
from storage import upload_html_to_s3

site_repo = DynamoSiteRepository()
page_repo = DynamoPageRepository()

def get_current_account_id(event: Dict[str, Any]) -> str:
    """
    Seam: Later this should come from Cognito/JWT authorizer.
    For now we allow passing account via header for testing.
    """
    headers = event.get("headers") or {}
    test_account = headers.get("x-account-id") or headers.get("X-Account-Id")
    if test_account:
        return test_account

    claims = event.get("requestContext", {}).get("authorizer", {}).get("claims", {})
    return claims.get("sub") or "dev-account-1"


def response(status: int, body: Any):
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
        },
        "body": json.dumps(body),
    }


def lambda_handler(event, context):
    # Preflight
    if event.get("httpMethod") == "OPTIONS":
        return response(200, {"ok": True})

    method = event.get("httpMethod", "")
    path = event.get("path", "")
    account_id = get_current_account_id(event)

    try:
        # /api/sites
        if path == "/api/sites" and method == "GET":
            return list_sites(account_id)

        if path == "/api/sites" and method == "POST":
            body = json.loads(event.get("body") or "{}")
            return create_site(account_id, body)

        # /api/sites/{siteId}
        if path.startswith("/api/sites/") and "/pages" not in path:
            site_id = path.split("/")[3]
            if method == "GET":
                return get_site(account_id, site_id)
            if method == "PATCH":
                body = json.loads(event.get("body") or "{}")
                return update_site(account_id, site_id, body)

        # /api/sites/{siteId}/pages
        if path.startswith("/api/sites/") and path.endswith("/pages"):
            site_id = path.split("/")[3]
            if method == "GET":
                return list_pages(account_id, site_id)
            if method == "POST":
                body = json.loads(event.get("body") or "{}")
                return create_page(account_id, site_id, body)

        # /api/pages/{pageId}
        if path.startswith("/api/pages/") and not path.endswith("/publish"):
            page_id = path.split("/")[3]
            if method == "GET":
                return get_page(account_id, page_id)
            if method == "PATCH":
                body = json.loads(event.get("body") or "{}")
                return update_page(account_id, page_id, body)

        # /api/pages/{pageId}/publish
        if path.startswith("/api/pages/") and path.endswith("/publish") and method == "POST":
            page_id = path.split("/")[3]
            return publish_page(account_id, page_id)

        return response(404, {"error": "Not found", "path": path, "method": method})
    except Exception as e:
        return response(500, {"error": str(e)})


def list_sites(account_id: str):
    sites = site_repo.list_by_owner(account_id)
    return response(200, [s.__dict__ for s in sites])


def create_site(account_id: str, data: Dict[str, Any]):
    site = site_repo.create(account_id, data)
    return response(201, site.__dict__)


def get_site(account_id: str, site_id: str):
    site = site_repo.get_by_id(site_id)
    if not site or site.owner_account_id != account_id:
        return response(404, {"error": "Site not found"})
    return response(200, site.__dict__)


def update_site(account_id: str, site_id: str, patch: Dict[str, Any]):
    site = site_repo.get_by_id(site_id)
    if not site or site.owner_account_id != account_id:
        return response(404, {"error": "Site not found"})
    site = site_repo.update(site_id, patch)
    return response(200, site.__dict__)


def list_pages(account_id: str, site_id: str):
    site = site_repo.get_by_id(site_id)
    if not site or site.owner_account_id != account_id:
        return response(404, {"error": "Site not found"})
    pages = page_repo.list_by_site(site_id)
    return response(200, [p.__dict__ for p in pages])


def create_page(account_id: str, site_id: str, data: Dict[str, Any]):
    site = site_repo.get_by_id(site_id)
    if not site or site.owner_account_id != account_id:
        return response(404, {"error": "Site not found"})
    page = page_repo.create(site_id, data)
    return response(201, page.__dict__)


def get_page(account_id: str, page_id: str):
    page = page_repo.get_by_id(page_id)
    if not page:
        return response(404, {"error": "Page not found"})
    site = site_repo.get_by_id(page.site_id)
    if not site or site.owner_account_id != account_id:
        return response(404, {"error": "Page not found"})
    return response(200, page.__dict__)


def update_page(account_id: str, page_id: str, patch: Dict[str, Any]):
    page = page_repo.get_by_id(page_id)
    if not page:
        return response(404, {"error": "Page not found"})
    site = site_repo.get_by_id(page.site_id)
    if not site or site.owner_account_id != account_id:
        return response(404, {"error": "Page not found"})

    # (Optional) track last editor
    patch["last_editor_account_id"] = account_id

    page = page_repo.update(page_id, patch)
    return response(200, page.__dict__)


def publish_page(account_id: str, page_id: str):
    page = page_repo.get_by_id(page_id)
    if not page:
        return response(404, {"error": "Page not found"})
    site = site_repo.get_by_id(page.site_id)
    if not site or site.owner_account_id != account_id:
        return response(404, {"error": "Page not found"})

    html = render_page_to_html(page.editor_state, site.settings)

    # "" slug = homepage => index.html
    file_slug = page.slug.strip("/") if page.slug else "index"
    key = f"sites/{site.slug}/{file_slug}.html"
    url = upload_html_to_s3(key, html)

    page = page_repo.update(page.id, {
        "published_state": page.editor_state,
        "published_html_url": url,
    })

    return response(200, {"published_html_url": url, "page": page.__dict__})
