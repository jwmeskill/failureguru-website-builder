from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, Dict, Any
import uuid


def generate_id() -> str:
    return str(uuid.uuid4())


def now_iso() -> str:
    return datetime.utcnow().isoformat(timespec="seconds") + "Z"


@dataclass
class Site:
    id: str
    owner_account_id: str
    name: str
    slug: str
    primary_domain: Optional[str] = None
    dealer_account_id: Optional[str] = None
    publish_status: str = "draft"  # draft | published | error
    published_at: Optional[str] = None
    settings: Dict[str, Any] = field(default_factory=dict)
    created_at: str = field(default_factory=now_iso)
    updated_at: str = field(default_factory=now_iso)


@dataclass
class Page:
    id: str
    site_id: str
    name: str
    slug: str
    type: str = "page"  # page | funnel_step | blog | system
    editor_state: Dict[str, Any] = field(default_factory=dict)
    published_state: Optional[Dict[str, Any]] = None
    published_html_url: Optional[str] = None
    last_editor_account_id: Optional[str] = None
    created_at: str = field(default_factory=now_iso)
    updated_at: str = field(default_factory=now_iso)
