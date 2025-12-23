export type PaletteBlockType = "hero" | "text";

export function newBlockFromType(type: PaletteBlockType) {
  const id = `blk_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

  if (type === "hero") {
    return {
      id,
      type: "hero",
      props: {
        headline: "New Hero",
        subheadline: "Edit me",
        ctaText: "CTA",
        ctaHref: "#",
      },
    };
  }

  // text
  return {
    id,
    type: "text",
    props: { text: "New text block" },
  };
}
