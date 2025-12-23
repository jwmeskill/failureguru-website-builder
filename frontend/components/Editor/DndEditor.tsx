"use client";

import { useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Block, BlockType, EditorStateV1 } from "@/lib/editorTypes";
import { makeBlock } from "@/lib/editorTypes";

type Props = {
  draft: EditorStateV1;
  setDraft: (next: EditorStateV1) => void;
  selectedBlockId: string | null;
  setSelectedBlockId: (id: string | null) => void;
};

const PALETTE_PREFIX = "palette:";
const BLOCK_PREFIX = "block:";

function getBlocks(draft: EditorStateV1): Block[] {
  const sec = draft.sections?.[0];
  if (!sec) return [];
  return sec.blocks || [];
}

function ensureSection(draft: EditorStateV1): EditorStateV1 {
  const next = structuredClone(draft) as EditorStateV1;
  if (!next.sections || next.sections.length === 0) {
    next.sections = [{ id: "sec_1", layout: "full", blocks: [] }];
  }
  if (!next.sections[0].blocks) next.sections[0].blocks = [];
  return next;
}

function SortableBlock({
  block,
  selected,
  onSelect,
}: {
  block: Block;
  selected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `${BLOCK_PREFIX}${block.id}` });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border p-4 cursor-pointer select-none ${
        selected ? "ring-2 ring-black" : ""
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase text-gray-500">
            {block.type}
          </div>
          {block.type === "hero" ? (
            <div className="mt-2">
              <div className="text-xl font-semibold">{block.props.headline}</div>
              <div className="text-sm text-gray-600">{block.props.subheadline}</div>
            </div>
          ) : (
            <div className="mt-2 text-sm">{block.props.text}</div>
          )}
        </div>

        {/* drag handle */}
        <button
          className="rounded-lg border px-2 py-1 text-xs text-gray-700"
          title="Drag"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          ⇅
        </button>
      </div>
    </div>
  );
}

export default function DndEditor({
  draft,
  setDraft,
  selectedBlockId,
  setSelectedBlockId,
}: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const blocks = useMemo(() => getBlocks(draft), [draft]);
  const sortableIds = useMemo(() => blocks.map((b) => `${BLOCK_PREFIX}${b.id}`), [blocks]);

  function onDragStart(_e: DragStartEvent) {
    // no-op for now (could show overlay later)
  }

  function onDragOver(_e: DragOverEvent) {
    // no-op
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Drag from palette into canvas
    if (activeId.startsWith(PALETTE_PREFIX)) {
      const type = activeId.replace(PALETTE_PREFIX, "") as BlockType;
      const newBlock = makeBlock(type);

      const next = ensureSection(draft);
      const list = next.sections[0].blocks;

      // If dropping over a block, insert before it; otherwise append
      if (overId.startsWith(BLOCK_PREFIX)) {
        const overBlockId = overId.replace(BLOCK_PREFIX, "");
        const idx = list.findIndex((b) => b.id === overBlockId);
        const insertAt = idx >= 0 ? idx : list.length;
        list.splice(insertAt, 0, newBlock);
      } else {
        list.push(newBlock);
      }

      setDraft(next);
      setSelectedBlockId(newBlock.id);
      return;
    }

    // Reorder within canvas
    if (activeId.startsWith(BLOCK_PREFIX) && overId.startsWith(BLOCK_PREFIX)) {
      const a = activeId.replace(BLOCK_PREFIX, "");
      const o = overId.replace(BLOCK_PREFIX, "");

      if (a === o) return;

      const next = ensureSection(draft);
      const list = next.sections[0].blocks;
      const oldIndex = list.findIndex((b) => b.id === a);
      const newIndex = list.findIndex((b) => b.id === o);

      if (oldIndex === -1 || newIndex === -1) return;

      next.sections[0].blocks = arrayMove(list, oldIndex, newIndex);
      setDraft(next);
      return;
    }
  }

  return (
    <div className="grid grid-cols-12 gap-0">
      {/* Palette */}
      <aside className="col-span-3 border-r p-4">
        <div className="text-sm font-medium mb-2">Blocks</div>
        <div className="text-xs text-gray-600 mb-4">Drag a block into the canvas.</div>

        <DndContext sensors={sensors} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
          <div className="space-y-2">
            <PaletteItem type="hero" />
            <PaletteItem type="text" />
          </div>

          {/* Canvas */}
          <section className="col-span-6 p-6 bg-gray-50 min-h-[calc(100vh-57px)]">
            <div className="mx-auto max-w-2xl rounded-2xl border bg-white p-6 space-y-4">
              <div className="text-xs text-gray-600">Canvas</div>

              <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {blocks.length === 0 && (
                    <div className="rounded-xl border border-dashed p-6 text-sm text-gray-600">
                      Drop blocks here
                    </div>
                  )}

                  {blocks.map((b) => (
                    <SortableBlock
                      key={b.id}
                      block={b}
                      selected={selectedBlockId === b.id}
                      onSelect={() => setSelectedBlockId(b.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </div>
          </section>
        </DndContext>
      </aside>

      {/* Inspector */}
      <aside className="col-span-3 border-l p-4">
        <Inspector
          draft={draft}
          setDraft={setDraft}
          selectedBlockId={selectedBlockId}
          setSelectedBlockId={setSelectedBlockId}
        />
      </aside>
    </div>
  );
}

function PaletteItem({ type }: { type: BlockType }) {
  return (
    <DraggablePaletteCard id={`${PALETTE_PREFIX}${type}`} label={type} />
  );
}

function DraggablePaletteCard({ id, label }: { id: string; label: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  // NOTE: We use useSortable here as a quick draggable; it's fine for MVP.
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-xl border p-3 bg-white cursor-grab active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <div className="text-sm font-medium capitalize">{label}</div>
      <div className="text-xs text-gray-600">Drag into canvas</div>
    </div>
  );
}

function Inspector({
  draft,
  setDraft,
  selectedBlockId,
  setSelectedBlockId,
}: {
  draft: EditorStateV1;
  setDraft: (next: EditorStateV1) => void;
  selectedBlockId: string | null;
  setSelectedBlockId: (id: string | null) => void;
}) {
  const blocks = getBlocks(draft);
  const block = blocks.find((b) => b.id === selectedBlockId) || null;

  function patchBlockProps(patch: Record<string, any>) {
    if (!block) return;
    const next = ensureSection(draft);
    const list = next.sections[0].blocks;
    const idx = list.findIndex((b) => b.id === block.id);
    if (idx === -1) return;

    list[idx] = {
      ...list[idx],
      props: { ...(list[idx] as any).props, ...patch },
    } as any;

    setDraft(next);
  }

  function deleteBlock() {
    if (!block) return;
    const next = ensureSection(draft);
    next.sections[0].blocks = next.sections[0].blocks.filter((b) => b.id !== block.id);
    setDraft(next);
    setSelectedBlockId(null);
  }

  return (
    <div>
      <div className="text-sm font-medium mb-2">Inspector</div>

      {!block ? (
        <div className="text-sm text-gray-600">Select a block to edit.</div>
      ) : (
        <div className="space-y-3">
          <div className="text-xs uppercase text-gray-500 font-medium">
            {block.type} • {block.id}
          </div>

          {block.type === "hero" && (
            <>
              <LabeledInput
                label="Headline"
                value={block.props.headline}
                onChange={(v) => patchBlockProps({ headline: v })}
              />
              <LabeledInput
                label="Subheadline"
                value={block.props.subheadline}
                onChange={(v) => patchBlockProps({ subheadline: v })}
              />
              <LabeledInput
                label="CTA Text"
                value={block.props.ctaText}
                onChange={(v) => patchBlockProps({ ctaText: v })}
              />
              <LabeledInput
                label="CTA Href"
                value={block.props.ctaHref}
                onChange={(v) => patchBlockProps({ ctaHref: v })}
              />
            </>
          )}

          {block.type === "text" && (
            <LabeledTextarea
              label="Text"
              value={block.props.text}
              onChange={(v) => patchBlockProps({ text: v })}
            />
          )}

          <button
            onClick={deleteBlock}
            className="w-full rounded-lg border px-3 py-2 text-sm text-red-700"
          >
            Delete block
          </button>
        </div>
      )}
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <div className="text-xs text-gray-600 mb-1">{label}</div>
      <input
        className="w-full rounded-lg border px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function LabeledTextarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <div className="text-xs text-gray-600 mb-1">{label}</div>
      <textarea
        className="w-full h-40 rounded-lg border px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
