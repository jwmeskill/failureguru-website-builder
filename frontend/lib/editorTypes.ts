export type BlockType = "hero" | "text";

export type HeroProps = {
  headline: string;
  subheadline: string;
  ctaText: string;
  ctaHref: string;
};

export type TextProps = {
  text: string;
};

export type Block =
  | { id: string; type: "hero"; props: HeroProps }
  | { id: string; type: "text"; props: TextProps };

export type Section = {
  id: string;
  layout: "full";
  blocks: Block[];
};

export type EditorStateV1 = {
  version: 1;
  title: string;
  sections: Section[];
};

export function makeBlock(type: BlockType): Block {
  const id = `blk_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  if (type === "hero") {
    return {
      id,
      type,
      props: {
        headline: "Welcome",
        subheadline: "Edit this hero block",
        ctaText: "Get Started",
        ctaHref: "#",
      },
    };
  }
  return {
    id,
    type: "text",
    props: { text: "New text block" },
  };
}
