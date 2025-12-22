"use client";

import { useEffect, useState } from "react";
import { listSites, createSite, Site } from "@/lib/api";

export default function Home() {
  const [sites, setSites] = useState<Site[]>([]);
  const [name, setName] = useState("My Site");
  const [slug, setSlug] = useState("my-site");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    setErr(null);
    const data = await listSites();
    setSites(data);
  }

  useEffect(() => {
    refresh().catch((e) => setErr(e.message));
  }, []);

  async function onCreate() {
    setLoading(true);
    setErr(null);
    try {
      await createSite({ name, slug });
      await refresh();
    } catch (e: any) {
      setErr(e.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Website Builder</h1>
          <p className="text-sm text-gray-600">Sites</p>
        </header>

        <section className="rounded-2xl border p-4 space-y-3">
          <div className="text-sm font-medium">Create a site</div>
          <div className="grid gap-3 md:grid-cols-3">
            <input
              className="rounded-lg border px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Site name"
            />
            <input
              className="rounded-lg border px-3 py-2 text-sm"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="slug (e.g. my-site)"
            />
            <button
              onClick={onCreate}
              disabled={loading}
              className="rounded-lg border bg-black px-3 py-2 text-sm text-white disabled:opacity-60"
            >
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
          {err && <div className="text-sm text-red-600">{err}</div>}
        </section>

        <section className="rounded-2xl border">
          <div className="border-b p-4 text-sm font-medium">Your sites</div>
          <ul className="divide-y">
            {sites.map((s) => (
              <li key={s.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-gray-600">
                    slug: {s.slug} • id: {s.id}
                  </div>
                </div>
                <a
                  className="text-sm underline"
                  href={`/sites/${s.id}`}
                >
                  Open →
                </a>
              </li>
            ))}
            {sites.length === 0 && (
              <li className="p-4 text-sm text-gray-600">No sites yet.</li>
            )}
          </ul>
        </section>
      </div>
    </main>
  );
}
