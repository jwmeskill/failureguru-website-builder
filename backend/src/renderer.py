from typing import Dict, Any


def render_page_to_html(editor_state: Dict[str, Any], site_settings: Dict[str, Any]) -> str:
    """
    Placeholder renderer to prove Phase 1 publishing.
    Phase 2 will evolve editor_state and renderer together.
    """
    title = editor_state.get("title", "Failure Guru Site")
    body_content = editor_state.get("raw_html")

    if not body_content:
        # minimal render from sections/blocks
        sections = editor_state.get("sections", [])
        parts = []
        for sec in sections:
            blocks = sec.get("blocks", [])
            for blk in blocks:
                if blk.get("type") == "hero":
                    props = blk.get("props", {})
                    headline = props.get("headline", "")
                    sub = props.get("subheadline", "")
                    parts.append(f"<h1>{headline}</h1>")
                    parts.append(f"<p>{sub}</p>")
                elif blk.get("type") == "text":
                    props = blk.get("props", {})
                    parts.append(f"<p>{props.get('text','')}</p>")
        body_content = "\n".join(parts) if parts else "<p>Empty page (no blocks yet)</p>"

    return f"""<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>{title}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    {body_content}
  </body>
</html>
"""
