"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getPage, updatePage, publishPage, Page } from "@/lib/api";

export default function EditorPage() {
  const params = useParams<{ pageId: string }>();
  const pageId = params.pageId;

  const [page, setPage] = useState<Page | null>(null);
  const [draft, setDraft] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setErr(null);
    const p = await getPage(pageId);
    setPage(p);
    setDraft(p.editor_state || { version: 1, title: p.name, sections: [] });
  }

  useEffect(() => {
    load().catch((e) => setErr(e.message));
  }, [pageId]);

  const selectedSummary = useMemo(() => {
    const blocks = (draft?.sections?.[0]?.blocks || []) as any[];
    return `${blocks.length} block(s) in first section`;
  }, [draft]);

  async function onSave() {
    if (!draft) return;
    setSaving(true);
    setErr(null);
    try {
      const updated = await updatePage(pageId, { editor_state: draft });
      setPage(updated);
    } catch (e: any) {
      setErr(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onPublish() {
    setPublishing(true);
    setErr(null);
    try {
      const res = await publishPage(pageId);
      setPage(res.page);
      window.open(res.published_html_url, "_blank");
    } catch (e: any) {
      setErr(e.message || "Publish failed");
    } finally {
      setPublishing(false);
    }
  }

  if (!page || !draft) {
    return (
      <main className="min-h-screen p-8">
        <div className="mx-auto max-w-5xl text-sm text-gray-600">
          Loading editor…
          {err && <div className="mt-2 text-red-600">{err}</div>}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      {/* Top bar */}
      <div className="sticky top-0 z-10 border-b bg-white px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">{page.name}</div>
          <div className="text-xs text-gray-600">pageId: {pageId}</div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onSave}
            disabled={saving}
            className="rounded-lg border px-3 py-2 text-sm disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            onClick={onPublish}
            disabled={publishing}
            className="rounded-lg border bg-black px-3 py-2 text-sm text-white disabled:opacity-60"
          >
            {publishing ? "Publishing…" : "Publish"}
          </button>
          {page.published_html_url && (
            <a
              href={page.published_html_url}
              target="_blank"
              className="rounded-lg border px-3 py-2 text-sm"
            >
              Open published
            </a>
          )}
        </div>
      </div>

      {/* 3-panel layout */}
      <div className="grid grid-cols-12 gap-0">
        {/* Left: Palette */}
        <aside className="col-span-3 border-r p-4">
          <div className="text-sm font-medium mb-2">Blocks</div>
          <div className="text-xs text-gray-600">
            (Drag/drop coming next) <br />
            For now, you can edit the JSON directly.
          </div>

          <div className="mt-4 space-y-2">
            <button
              className="w-full rounded-lg border px-3 py-2 text-sm"
              onClick={() => {
                const next = structuredClone(draft);
                next.sections = next.sections?.length ? next.sections : [{ id: "sec_1", layout: "full", blocks: [] }];
                next.sections[0].blocks.push({
                  id: `blk_${Date.now()}`,
                  type: "text",
                  props: { text: "New text block" },
                });
                setDraft(next);
              }}
            >
              + Add Text Block
            </button>
            <button
              className="w-full rounded-lg border px-3 py-2 text-sm"
              onClick={() => {
                const next = structuredClone(draft);
                next.sections = next.sections?.length ? next.sections : [{ id: "sec_1", layout: "full", blocks: [] }];
                next.sections[0].blocks.push({
                  id: `blk_${Date.now()}`,
                  type: "hero",
                  props: { headline: "New Hero", subheadline: "Edit me", ctaText: "CTA", ctaHref: "#" },
                });
                setDraft(next);
              }}
            >
              + Add Hero Block
            </button>
          </div>
        </aside>

        {/* Center: Canvas preview */}
        <section className="col-span-6 p-6 bg-gray-50 min-h-[calc(100vh-57px)]">
          <div className="mx-auto max-w-2xl rounded-2xl border bg-white p-6 space-y-4">
            <div className="text-xs text-gray-600">Preview (simple renderer for now)</div>
            {(draft.sections?.[0]?.blocks || []).map((b: any) => {
              if (b.type === "hero") {
                return (
                  <div key={b.id} className="rounded-xl border p-4">
                    <div className="text-2xl font-semibold">{b.props?.headline}</div>
                    <div className="text-sm text-gray-600 mt-1">{b.props?.subheadline}</div>
                    <div className="mt-3">
                      <a className="inline-block rounded-lg border bg-black px-3 py-2 text-sm text-white" href={b.props?.ctaHref || "#"}>
                        {b.props?.ctaText || "CTA"}
                      </a>
                    </div>
                  </div>
                );
              }
              if (b.type === "text") {
                return (
                  <div key={b.id} className="rounded-xl border p-4 text-sm">
                    {b.props?.text}
                  </div>
                );
              }
              return (
                <div key={b.id} className="rounded-xl border p-4 text-sm text-gray-600">
                  Unknown block type: {b.type}
                </div>
              );
            })}
          </div>
        </section>

        {/* Right: Inspector / JSON */}
        <aside className="col-span-3 border-l p-4">
          <div className="text-sm font-medium mb-2">Inspector</div>
          <div className="text-xs text-gray-600 mb-3">{selectedSummary}</div>

          <div className="text-xs font-medium mb-2">Raw editor_state (v1)</div>
          <textarea
            className="w-full h-[60vh] rounded-lg border p-2 text-xs font-mono"
            value={JSON.stringify(draft, null, 2)}
            onChange={(e) => {
              try {
                setDraft(JSON.parse(e.target.value));
                setErr(null);
              } catch {
                setErr("JSON invalid (fix to enable save)");
              }
            }}
          />
          {err && <div className="mt-2 text-sm text-red-600">{err}</div>}
        </aside>
      </div>
    </main>
  );
}
