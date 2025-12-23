"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getPage, updatePage, publishPage, Page } from "@/lib/api";

import DndEditor from "@/components/Editor/DndEditor";
import type { EditorStateV1 } from "@/lib/editorTypes";

export default function EditorPage() {
  const params = useParams<{ pageId: string }>();
  const pageId = params.pageId;

  const [page, setPage] = useState<Page | null>(null);
  const [draft, setDraft] = useState<EditorStateV1 | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setErr(null);
    const p = await getPage(pageId);
    setPage(p);

    const nextDraft =
      (p.editor_state as EditorStateV1) || ({ version: 1, title: p.name, sections: [] } as EditorStateV1);

    setDraft(nextDraft);

    // auto-select first block if any
    const first = nextDraft.sections?.[0]?.blocks?.[0];
    setSelectedBlockId(first?.id ?? null);
  }

  useEffect(() => {
    load().catch((e) => setErr(e.message));
  }, [pageId]);

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

  useEffect(() => {
    if (!draft) return;
    const blocks = draft.sections?.[0]?.blocks || [];
    const exists = blocks.some((b) => b.id === selectedBlockId);

    if (selectedBlockId && !exists) {
      setSelectedBlockId(blocks[0]?.id ?? null);
    }
  }, [draft, selectedBlockId]);

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
        <div className="flex items-center gap-2">
          {err && <div className="text-sm text-red-600 mr-2">{err}</div>}

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
            <a href={page.published_html_url} target="_blank" className="rounded-lg border px-3 py-2 text-sm">
              Open published
            </a>
          )}
        </div>
      </div>

      {/* Drag & Drop editor */}
      <DndEditor
        draft={draft}
        setDraft={(next) => setDraft(next)}
        selectedBlockId={selectedBlockId}
        setSelectedBlockId={setSelectedBlockId}
      />
    </main>
  );
}
