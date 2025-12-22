"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getSite, listPages, createPage, Site, Page } from "@/lib/api";

export default function SitePage() {
  const params = useParams<{ siteId: string }>();
  const siteId = params.siteId;

  const [site, setSite] = useState<Site | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [name, setName] = useState("Home");
  const [slug, setSlug] = useState(""); // "" = homepage
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    setErr(null);
    const [s, p] = await Promise.all([getSite(siteId), listPages(siteId)]);
    setSite(s);
    setPages(p);
  }

  useEffect(() => {
    refresh().catch((e) => setErr(e.message));
  }, [siteId]);

  async function onCreatePage() {
    setErr(null);
    try {
      const page = await createPage(siteId, {
        name,
        slug,
        editor_state: {
          version: 1,
          title: name,
          sections: [
            {
              id: "sec_1",
              layout: "full",
              blocks: [
                {
                  id: "blk_1",
                  type: "hero",
                  props: {
                    headline: "Welcome",
                    subheadline: "This is your new page.",
                    ctaText: "Get Started",
                    ctaHref: "#",
                  },
                },
              ],
            },
          ],
        },
      });
      window.location.href = `/pages/${page.id}`;
    } catch (e: any) {
      setErr(e.message || "Failed");
    }
  }

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="space-y-1">
          <a className="text-sm underline" href="/">← Back</a>
          <h1 className="text-2xl font-semibold">{site?.name ?? "Site"}</h1>
          <p className="text-xs text-gray-600">siteId: {siteId}</p>
        </header>

        <section className="rounded-2xl border p-4 space-y-3">
          <div className="text-sm font-medium">Create a page</div>
          <div className="grid gap-3 md:grid-cols-3">
            <input
              className="rounded-lg border px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Page name"
            />
            <input
              className="rounded-lg border px-3 py-2 text-sm"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder='slug ("" for home)'
            />
            <button
              onClick={onCreatePage}
              className="rounded-lg border bg-black px-3 py-2 text-sm text-white"
            >
              Create & open editor →
            </button>
          </div>
          {err && <div className="text-sm text-red-600">{err}</div>}
        </section>

        <section className="rounded-2xl border">
          <div className="border-b p-4 text-sm font-medium">Pages</div>
          <ul className="divide-y">
            {pages.map((p) => (
              <li key={p.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-gray-600">
                    slug: {p.slug || "(home)"} • id: {p.id}
                  </div>
                </div>
                <a className="text-sm underline" href={`/pages/${p.id}`}>
                  Edit →
                </a>
              </li>
            ))}
            {pages.length === 0 && (
              <li className="p-4 text-sm text-gray-600">No pages yet.</li>
            )}
          </ul>
        </section>
      </div>
    </main>
  );
}
