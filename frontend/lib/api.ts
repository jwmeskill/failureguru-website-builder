export type Site = {
  id: string;
  owner_account_id: string;
  name: string;
  slug: string;
  primary_domain?: string | null;
  dealer_account_id?: string | null;
  publish_status: string;
  published_at?: string | null;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
};

export type Page = {
  id: string;
  site_id: string;
  name: string;
  slug: string;
  type: string;
  editor_state: any;
  published_html_url?: string | null;
  created_at: string;
  updated_at: string;
};

const BASE = process.env.NEXT_PUBLIC_BUILDER_API_BASE!;
const ACCOUNT_ID = process.env.NEXT_PUBLIC_ACCOUNT_ID!;

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-account-id": ACCOUNT_ID,
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  const text = await res.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg = typeof data === "object" && data?.error ? data.error : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

// Sites
export const listSites = () => apiFetch<Site[]>("/api/sites");
export const createSite = (body: { name: string; slug?: string }) =>
  apiFetch<Site>("/api/sites", { method: "POST", body: JSON.stringify(body) });
export const getSite = (siteId: string) => apiFetch<Site>(`/api/sites/${siteId}`);

// Pages
export const listPages = (siteId: string) => apiFetch<Page[]>(`/api/sites/${siteId}/pages`);
export const createPage = (siteId: string, body: { name: string; slug: string; editor_state?: any }) =>
  apiFetch<Page>(`/api/sites/${siteId}/pages`, { method: "POST", body: JSON.stringify(body) });

export const getPage = (pageId: string) => apiFetch<Page>(`/api/pages/${pageId}`);
export const updatePage = (pageId: string, patch: Partial<Page>) =>
  apiFetch<Page>(`/api/pages/${pageId}`, { method: "PATCH", body: JSON.stringify(patch) });

export const publishPage = (pageId: string) =>
  apiFetch<{ published_html_url: string; page: Page }>(`/api/pages/${pageId}/publish`, { method: "POST" });
