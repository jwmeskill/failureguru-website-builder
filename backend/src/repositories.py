from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from models import Site, Page, generate_id, now_iso


class SiteRepository(ABC):
    @abstractmethod
    def list_by_owner(self, owner_account_id: str) -> List[Site]:
        ...

    @abstractmethod
    def get_by_id(self, site_id: str) -> Optional[Site]:
        ...

    @abstractmethod
    def create(self, owner_account_id: str, data: Dict[str, Any]) -> Site:
        ...

    @abstractmethod
    def update(self, site_id: str, patch: Dict[str, Any]) -> Optional[Site]:
        ...


class PageRepository(ABC):
    @abstractmethod
    def list_by_site(self, site_id: str) -> List[Page]:
        ...

    @abstractmethod
    def get_by_id(self, page_id: str) -> Optional[Page]:
        ...

    @abstractmethod
    def create(self, site_id: str, data: Dict[str, Any]) -> Page:
        ...

    @abstractmethod
    def update(self, page_id: str, patch: Dict[str, Any]) -> Optional[Page]:
        ...


class InMemorySiteRepository(SiteRepository):
    """
    Dev-only repository. NOT persistent in AWS Lambda.
    Swap this later for DynamoDB / Postgres / Airtable without changing handlers.
    """
    def __init__(self):
        self.sites: Dict[str, Site] = {}

    def list_by_owner(self, owner_account_id: str) -> List[Site]:
        return [s for s in self.sites.values() if s.owner_account_id == owner_account_id]

    def get_by_id(self, site_id: str) -> Optional[Site]:
        return self.sites.get(site_id)

    def create(self, owner_account_id: str, data: Dict[str, Any]) -> Site:
        site_id = generate_id()
        slug = data.get("slug") or site_id.split("-")[0]
        site = Site(
            id=site_id,
            owner_account_id=owner_account_id,
            name=data.get("name", "New Site"),
            slug=slug,
            primary_domain=data.get("primary_domain"),
            dealer_account_id=data.get("dealer_account_id"),
            settings=data.get("settings", {}),
        )
        self.sites[site_id] = site
        return site

    def update(self, site_id: str, patch: Dict[str, Any]) -> Optional[Site]:
        site = self.sites.get(site_id)
        if not site:
            return None
        for k, v in patch.items():
            if v is None:
                continue
            if hasattr(site, k):
                setattr(site, k, v)
        site.updated_at = now_iso()
        return site


class InMemoryPageRepository(PageRepository):
    """
    Dev-only repository. NOT persistent in AWS Lambda.
    """
    def __init__(self):
        self.pages: Dict[str, Page] = {}

    def list_by_site(self, site_id: str) -> List[Page]:
        return [p for p in self.pages.values() if p.site_id == site_id]

    def get_by_id(self, page_id: str) -> Optional[Page]:
        return self.pages.get(page_id)

    def create(self, site_id: str, data: Dict[str, Any]) -> Page:
        page_id = generate_id()
        page = Page(
            id=page_id,
            site_id=site_id,
            name=data.get("name", "New Page"),
            slug=data.get("slug", ""),  # "" = homepage
            type=data.get("type", "page"),
            editor_state=data.get("editor_state", {}),
        )
        self.pages[page_id] = page
        return page

    def update(self, page_id: str, patch: Dict[str, Any]) -> Optional[Page]:
        page = self.pages.get(page_id)
        if not page:
            return None
        for k, v in patch.items():
            if v is None:
                continue
            if hasattr(page, k):
                setattr(page, k, v)
        page.updated_at = now_iso()
        return page
