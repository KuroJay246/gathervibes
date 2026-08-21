import json
import sys
from pathlib import Path

from pypdf import PdfReader, PdfWriter


def _reader(pdf_path: str) -> PdfReader:
    return PdfReader(pdf_path)


def _page_texts(reader: PdfReader):
    return [(page.extract_text() or "") for page in reader.pages]


def _normalize_text(value: str) -> str:
    return "".join(ch.lower() for ch in value if ch.isalnum())


def inspect(pdf_path: str):
    reader = _reader(pdf_path)
    texts = _page_texts(reader)
    outlines = []
    try:
        outlines = list(reader.outline) if reader.outline else []
    except Exception:
        outlines = []

    internal_links = 0
    for page in reader.pages:
      annots = page.get("/Annots") or []
      for annot_ref in annots:
        annot = annot_ref.get_object()
        if annot.get("/Subtype") == "/Link":
          action = annot.get("/A")
          dest = annot.get("/Dest")
          if dest or (action and action.get("/S") == "/GoTo"):
            internal_links += 1

    raw_comment_hits = []
    raw_table_hits = []
    raw_mermaid_hits = []
    near_empty_pages = []
    for index, text in enumerate(texts, start=1):
        compact = " ".join(text.split())
        if "<!-- Source:" in text:
            raw_comment_hits.append(index)
        if "| --- |" in text or "| Field | Type |" in text or "| Command | Purpose |" in text:
            raw_table_hits.append(index)
        if "flowchart TD" in text or "sequenceDiagram" in text or "graph LR" in text:
            raw_mermaid_hits.append(index)
        if len(compact) < 40:
            near_empty_pages.append(index)

    print(
        json.dumps(
            {
                "page_count": len(reader.pages),
                "bookmark_count": len(outlines),
                "internal_link_count": internal_links,
                "text_char_count": sum(len(text) for text in texts),
                "raw_comment_hits": raw_comment_hits,
                "raw_table_hits": raw_table_hits,
                "raw_mermaid_hits": raw_mermaid_hits,
                "near_empty_pages": near_empty_pages,
            }
        )
    )


def section_map(pdf_path: str, titles_path: str):
    reader = _reader(pdf_path)
    texts = _page_texts(reader)
    normalized_pages = [_normalize_text(text) for text in texts]
    titles = json.loads(Path(titles_path).read_text(encoding="utf-8"))
    results = []
    last_page = 0
    for item in titles:
        title = item["title"]
        normalized_title = _normalize_text(title)
        prefix_matches = [
            index + 1
            for index, text in enumerate(normalized_pages)
            if text.startswith(normalized_title)
        ]
        early_matches = [
            index + 1
            for index, text in enumerate(normalized_pages)
            if normalized_title in text[:800]
        ]
        ordered_matches = prefix_matches or early_matches
        page = next((candidate for candidate in ordered_matches if candidate > last_page), None)
        if page is None and ordered_matches:
            page = ordered_matches[-1]
        if page is not None:
            last_page = page
        results.append({**item, "page": page})
    print(json.dumps(results))


def add_bookmarks(pdf_path: str, map_path: str, output_path: str):
    reader = _reader(pdf_path)
    writer = PdfWriter()
    writer.clone_document_from_reader(reader)
    items = json.loads(Path(map_path).read_text(encoding="utf-8"))
    for item in items:
        page = item.get("page")
        if not page:
            continue
        writer.add_outline_item(item["title"], page - 1)
    with open(output_path, "wb") as stream:
        writer.write(stream)


def render(pdf_path: str, out_dir: str):
    from PIL import Image, ImageDraw
    import pypdfium2 as pdfium

    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    pdf = pdfium.PdfDocument(pdf_path)
    thumbs = []
    cols = 3
    margin = 24
    label_height = 28
    for index in range(len(pdf)):
        page = pdf[index]
        bitmap = page.render(scale=2.0)
        image = bitmap.to_pil()
        page_path = out / f"page-{index + 1:02d}.png"
        image.save(page_path)
        thumb = image.copy()
        thumb.thumbnail((360, 500))
        card = Image.new("RGB", (thumb.width, thumb.height + label_height), "white")
        card.paste(thumb, (0, label_height))
        draw = ImageDraw.Draw(card)
        draw.text((8, 6), f"Page {index + 1}", fill="black")
        thumbs.append(card)
    rows = (len(thumbs) + cols - 1) // cols
    cell_w = max(item.width for item in thumbs)
    cell_h = max(item.height for item in thumbs)
    sheet = Image.new("RGB", (cols * cell_w + (cols + 1) * margin, rows * cell_h + (rows + 1) * margin), "#d9d9d9")
    for idx, thumb in enumerate(thumbs):
        x = margin + (idx % cols) * (cell_w + margin)
        y = margin + (idx // cols) * (cell_h + margin)
        sheet.paste(thumb, (x, y))
    sheet.save(out / "contact-sheet.png")


def main():
    command = sys.argv[1]
    if command == "inspect":
        inspect(sys.argv[2])
    elif command == "section-map":
        section_map(sys.argv[2], sys.argv[3])
    elif command == "add-bookmarks":
        add_bookmarks(sys.argv[2], sys.argv[3], sys.argv[4])
    elif command == "render":
        render(sys.argv[2], sys.argv[3])
    else:
        raise SystemExit(f"Unknown command: {command}")


if __name__ == "__main__":
    main()
