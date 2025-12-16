import json
import os
from lambda_function import lambda_handler

# For local tests, you can set BUILDER_BUCKET if you want publish to actually work.
# os.environ["BUILDER_BUCKET"] = "your-bucket-name"

def invoke(method: str, path: str, body=None, headers=None):
    event = {
        "httpMethod": method,
        "path": path,
        "headers": headers or {"x-account-id": "dev-account-1"},
        "body": json.dumps(body) if body is not None else None,
        "requestContext": {},
    }
    resp = lambda_handler(event, None)
    print(method, path, resp["statusCode"])
    print(resp["body"])
    return resp

if __name__ == "__main__":
    # Create a site
    r = invoke("POST", "/api/sites", {"name": "Test Site", "slug": "testsite"})
    site = json.loads(r["body"])
    site_id = site["id"]

    # Create a page
    r = invoke("POST", f"/api/sites/{site_id}/pages", {
        "name": "Home",
        "slug": "",
        "editor_state": {
            "title": "Hello World",
            "raw_html": "<h1>It works!</h1><p>Failure Guru builder API is alive.</p>"
        }
    })
    page = json.loads(r["body"])
    page_id = page["id"]

    # List pages
    invoke("GET", f"/api/sites/{site_id}/pages")

    # Publish (requires BUILDER_BUCKET set + AWS creds)
    # invoke("POST", f"/api/pages/{page_id}/publish")
