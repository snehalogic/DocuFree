"""
DocuFree File Converter — Python Backend
Run: python app.py  →  http://localhost:5001
"""

import sys, subprocess, importlib, os, io, uuid, re, tempfile, traceback
from pathlib import Path

_REQUIRED = {
    # import-name   : pip-package-name
    "pdfminer"    : "pdfminer.six",
    "pdfplumber"  : "pdfplumber",
    "pypdf"       : "pypdf",
    "bs4"         : "beautifulsoup4",
    "lxml"        : "lxml",
    "markdown"    : "markdown",
    "docx"        : "python-docx",
    "reportlab"   : "reportlab",
    "PIL"         : "Pillow",
    "pandas"      : "pandas",
    "openpyxl"    : "openpyxl",
    "flask"       : "flask",
}

_missing = []
for _mod, _pkg in _REQUIRED.items():
    try:
        importlib.import_module(_mod)
    except ImportError:
        _missing.append(_pkg)

if _missing:
    print(f"\n[DocuFree] Auto-installing {len(_missing)} missing package(s) "
          f"into {sys.executable} …")
    for _pkg in _missing:
        print(f"  pip install {_pkg} ...", end=" ", flush=True)
        _r = subprocess.run(
            [sys.executable, "-m", "pip", "install", _pkg, "--quiet",
             "--break-system-packages"],
            capture_output=True, text=True
        )
        if _r.returncode != 0:
            _r = subprocess.run(
                [sys.executable, "-m", "pip", "install", _pkg, "--quiet"],
                capture_output=True, text=True
            )
        print("OK" if _r.returncode == 0 else f"FAILED ({_r.stderr.strip()[:80]})")
    print()

from flask import Flask, request, jsonify, send_file


app = Flask(__name__)

@app.after_request
def _cors(r):
    r.headers["Access-Control-Allow-Origin"]  = "*"
    r.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
    r.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    return r

@app.route("/convert", methods=["OPTIONS"])
@app.route("/formats",  methods=["OPTIONS"])
def _opt():
    return "", 204

TMP = tempfile.mkdtemp()

CONVERSION_MAP = {
    "jpg":  ["png","webp","gif","bmp","tiff","pdf"],
    "jpeg": ["png","webp","gif","bmp","tiff","pdf"],
    "png":  ["jpg","webp","gif","bmp","tiff","pdf"],
    "webp": ["jpg","png","gif","bmp","tiff","pdf"],
    "gif":  ["jpg","png","webp","bmp","tiff","pdf"],
    "bmp":  ["jpg","png","webp","gif","tiff","pdf"],
    "tiff": ["jpg","png","webp","gif","bmp","pdf"],
    "pdf":  ["jpg","png","txt","docx"],
    "docx": ["pdf","txt"],
    "doc":  ["pdf","txt"],
    "txt":  ["pdf","docx"],
    "csv":  ["xlsx","pdf"],
    "xlsx": ["csv","pdf"],
    "md":   ["pdf","txt","html"],
    "html": ["pdf","txt"],
}

MIME = {
    "pdf" :"application/pdf",
    "docx":"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "xlsx":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "csv" :"text/csv",
    "txt" :"text/plain",
    "html":"text/html",
    "jpg" :"image/jpeg",
    "png" :"image/png",
    "gif" :"image/gif",
    "webp":"image/webp",
    "bmp" :"image/bmp",
    "tiff":"image/tiff",
}

@app.route("/formats", methods=["GET"])
def get_formats():
    return jsonify(CONVERSION_MAP)

@app.route("/convert", methods=["POST"])
def convert():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file   = request.files["file"]
    target = request.form.get("target", "").lower().strip().lstrip(".")

    if not file.filename:
        return jsonify({"error": "Empty filename"}), 400
    if not target:
        return jsonify({"error": "No target format specified"}), 400

    src_ext = Path(file.filename).suffix.lower().strip(".")
    if src_ext == "jpeg":
        src_ext = "jpg"

    if src_ext not in CONVERSION_MAP:
        return jsonify({"error": f"Source format '.{src_ext}' not supported"}), 400
    if target not in CONVERSION_MAP.get(src_ext, []):
        return jsonify({"error": f"Cannot convert .{src_ext} → .{target}"}), 400

    uid      = str(uuid.uuid4())
    src_path = os.path.join(TMP, f"{uid}.{src_ext}")
    out_path = os.path.join(TMP, f"{uid}_out.{target}")
    file.save(src_path)

    try:
        _dispatch(src_ext, target, src_path, out_path)

        if not os.path.exists(out_path) or os.path.getsize(out_path) == 0:
            return jsonify({"error": "Conversion produced no output"}), 500

        with open(out_path, "rb") as fh:
            buf = io.BytesIO(fh.read())
        buf.seek(0)

        stem = Path(file.filename).stem
        return send_file(buf,
                         mimetype=MIME.get(target, "application/octet-stream"),
                         as_attachment=True,
                         download_name=f"{stem}.{target}")

    except Exception as exc:
        traceback.print_exc()
        return jsonify({"error": str(exc)}), 500

    finally:
        for p in [src_path, out_path]:
            try:
                if os.path.exists(p): os.remove(p)
            except Exception:
                pass


def _dispatch(src_ext: str, target: str, src: str, out: str):
    if src_ext in ("jpg","jpeg","png","webp","gif","bmp","tiff"):
        image_to_pdf(src, out) if target == "pdf" else image_to_image(src, out, target)
    elif src_ext == "pdf":
        if target in ("jpg","png"):  pdf_to_image(src, out, target)
        elif target == "txt":        pdf_to_txt(src, out)
        elif target == "docx":       pdf_to_docx(src, out)
    elif src_ext in ("docx","doc"):
        docx_to_pdf(src, out) if target == "pdf" else docx_to_txt(src, out)
    elif src_ext == "txt":
        txt_to_pdf(src, out) if target == "pdf" else txt_to_docx(src, out)
    elif src_ext == "csv":
        csv_to_xlsx(src, out) if target == "xlsx" else csv_to_pdf(src, out)
    elif src_ext == "xlsx":
        xlsx_to_csv(src, out) if target == "csv" else xlsx_to_pdf(src, out)
    elif src_ext == "md":
        {"html": md_to_html, "pdf": md_to_pdf, "txt": md_to_txt}[target](src, out)
    elif src_ext == "html":
        html_to_pdf(src, out) if target == "pdf" else html_to_txt(src, out)
    else:
        raise ValueError(f"Conversion .{src_ext}→.{target} not implemented")


def _safe(t: str) -> str:
    """Escape XML special chars for reportlab."""
    return t.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;")

def _flatten(img):
    """Flatten alpha channel onto white background."""
    from PIL import Image
    if img.mode == "P":
        img = img.convert("RGBA")
    if img.mode in ("RGBA","LA"):
        bg = Image.new("RGB", img.size, (255,255,255))
        bg.paste(img.convert("RGBA"), mask=img.split()[-1])
        return bg
    return img if img.mode == "RGB" else img.convert("RGB")

def _rl_doc(out: str):
    """Return a configured reportlab SimpleDocTemplate."""
    from reportlab.lib.pagesizes import A4
    from reportlab.platypus import SimpleDocTemplate
    from reportlab.lib.units import cm
    return SimpleDocTemplate(out, pagesize=A4,
                             leftMargin=2.5*cm, rightMargin=2.5*cm,
                             topMargin=2.5*cm,  bottomMargin=2.5*cm)

def _styles():
    from reportlab.lib.styles import getSampleStyleSheet
    return getSampleStyleSheet()

def _blank_docx():
    """python-docx Document with no default empty paragraph."""
    from docx import Document
    doc = Document()
    for p in list(doc.paragraphs):
        p._element.getparent().remove(p._element)
    return doc

def _add_para(doc, text: str, size: float):
    """Add paragraph to python-docx doc with heading style based on font size."""
    from docx.shared import Pt
    text = text.strip()
    if not text:
        return
    para = doc.add_paragraph()
    if   size >= 20: para.style = doc.styles["Heading 1"]; para.add_run(text)
    elif size >= 15: para.style = doc.styles["Heading 2"]; para.add_run(text)
    elif size >= 13: para.style = doc.styles["Heading 3"]; para.add_run(text)
    else:
        run = para.add_run(text)
        run.font.size = Pt(max(round(size), 8))


def image_to_image(src: str, out: str, target: str):
    from PIL import Image
    img = Image.open(src)
    if target in ("jpg","jpeg","bmp","tiff"):
        img = _flatten(img)
    fmt = {"jpg":"JPEG","jpeg":"JPEG","tiff":"TIFF","webp":"WEBP",
           "png":"PNG","gif":"GIF","bmp":"BMP"}.get(target, target.upper())
    img.save(out, fmt, **( {"quality":92} if fmt=="JPEG" else {} ))

def image_to_pdf(src: str, out: str):
    from PIL import Image
    _flatten(Image.open(src)).save(out, "PDF", resolution=150)

def pdf_to_image(src: str, out: str, target: str):
    from PIL import Image
    fmt = "JPEG" if target == "jpg" else "PNG"

    try:
        import pypdfium2 as pdfium
        doc  = pdfium.PdfDocument(src)
        bmp  = doc[0].render(scale=2.0)
        img  = bmp.to_pil()
        doc.close()
        if target == "jpg": img = _flatten(img)
        img.save(out, fmt, **({"quality":92} if fmt=="JPEG" else {}))
        return
    except ImportError:
        pass

    try:
        from pdf2image import convert_from_path
        pages = convert_from_path(src, dpi=150)
        if pages:
            img = _flatten(pages[0]) if target == "jpg" else pages[0]
            img.save(out, fmt)
            return
    except Exception:
        pass

    raise RuntimeError(
        "PDF→Image needs pypdfium2.\n"
        f"Install: {sys.executable} -m pip install pypdfium2"
    )



def _pdf_text(src: str) -> str:
    """Extract text from PDF. Tries pdfminer → pdfplumber → pypdf."""

    try:
        from pdfminer.high_level import extract_text as _pdfminer_extract
        text = (_pdfminer_extract(src) or "").strip()
        if text:
            return text
    except ImportError:
        pass
    except Exception:
        pass

    try:
        import pdfplumber
        parts = []
        with pdfplumber.open(src) as pdf:
            for pg in pdf.pages:
                t = pg.extract_text(x_tolerance=3, y_tolerance=3)
                if t: parts.append(t.strip())
        text = "\n\n".join(parts).strip()
        if text:
            return text
    except ImportError:
        pass
    except Exception:
        pass

    try:
        import pypdf
        parts = []
        for pg in pypdf.PdfReader(src).pages:
            t = pg.extract_text()
            if t: parts.append(t.strip())
        text = "\n\n".join(parts).strip()
        if text:
            return text
    except ImportError:
        pass
    except Exception:
        pass

    raise RuntimeError(
        "No PDF text library found.\n"
        f"Run: {sys.executable} -m pip install pdfminer.six"
    )

def pdf_to_txt(src: str, out: str):
    with open(out, "w", encoding="utf-8") as f:
        f.write(_pdf_text(src))


def pdf_to_docx(src: str, out: str):
    errors = []

    try:
        from pdfminer.high_level import extract_pages as _ep
        from pdfminer.layout import LTTextBox, LTTextLine, LTChar, LTAnno
        doc   = _blank_docx()
        found = False
        for pg_num, page in enumerate(_ep(src)):
            if pg_num > 0: doc.add_page_break()
            for el in page:
                if not isinstance(el, LTTextBox): continue
                for line in el:
                    if not isinstance(line, LTTextLine): continue
                    chars = [c for c in line if isinstance(c, LTChar)]
                    if not chars: continue
                    txt = "".join(
                        c.get_text() for c in line
                        if isinstance(c, (LTChar, LTAnno))
                    ).strip()
                    if not txt: continue
                    _add_para(doc, txt, max(c.size for c in chars))
                    found = True
        if not found:
            doc.add_paragraph("(No extractable text found in this PDF)")
        doc.save(out)
        return
    except ImportError as e:
        errors.append(f"pdfminer not installed: {e}")
    except Exception as e:
        errors.append(f"pdfminer error: {e}")

    try:
        import pdfplumber
        doc   = _blank_docx()
        found = False
        with pdfplumber.open(src) as pdf:
            for pg_num, pg in enumerate(pdf.pages):
                if pg_num > 0: doc.add_page_break()
                try:
                    words = pg.extract_words(
                        x_tolerance=3, y_tolerance=3,
                        keep_blank_chars=False, use_text_flow=True,
                        extra_attrs=["size"]
                    )
                except Exception:
                    words = pg.extract_words(x_tolerance=3, y_tolerance=3)

                if not words:
                    raw = pg.extract_text(x_tolerance=3, y_tolerance=3) or ""
                    for ln in raw.split("\n"):
                        if ln.strip():
                            doc.add_paragraph(ln.strip()); found = True
                    continue

                buckets: dict = {}
                for w in words:
                    b = round(float(w.get("top", 0)) / 5) * 5
                    buckets.setdefault(b, []).append(w)

                for b in sorted(buckets):
                    line_words = sorted(buckets[b], key=lambda w: float(w.get("x0",0)))
                    txt = " ".join(w["text"] for w in line_words).strip()
                    if not txt: continue
                    first = line_words[0]
                    sz = first.get("size") or first.get("height") or 11
                    try: sz = float(sz)
                    except Exception: sz = 11
                    _add_para(doc, txt, max(sz, 0.1))
                    found = True

        if not found:
            doc.add_paragraph("(No extractable text found in this PDF)")
        doc.save(out)
        return
    except ImportError as e:
        errors.append(f"pdfplumber not installed: {e}")
    except Exception as e:
        errors.append(f"pdfplumber error: {e}")


    try:
        import pypdf
        doc   = _blank_docx()
        found = False
        reader = pypdf.PdfReader(src)
        for i, pg in enumerate(reader.pages):
            if i > 0: doc.add_page_break()
            txt = pg.extract_text() or ""
            for ln in txt.split("\n"):
                if ln.strip():
                    doc.add_paragraph(ln.strip()); found = True
        if not found:
            doc.add_paragraph("(No extractable text found in this PDF)")
        doc.save(out)
        return
    except ImportError as e:
        errors.append(f"pypdf not installed: {e}")
    except Exception as e:
        errors.append(f"pypdf error: {e}")

    raise RuntimeError(
        "PDF→DOCX failed. Run this to fix:\n"
        f"  {sys.executable} -m pip install pdfminer.six\n"
        "Errors: " + " | ".join(errors)
    )


def docx_to_pdf(src: str, out: str):
    from docx import Document
    from reportlab.platypus import Paragraph, Spacer
    from reportlab.lib.units import cm
    doc = Document(src); styles = _styles(); story = []
    for p in doc.paragraphs:
        if not p.text.strip(): story.append(Spacer(1,10)); continue
        s = _safe(p.text); n = p.style.name
        if   "Heading 1" in n: story.append(Paragraph(s, styles["Heading1"]))
        elif "Heading 2" in n: story.append(Paragraph(s, styles["Heading2"]))
        elif "Heading 3" in n: story.append(Paragraph(s, styles["Heading3"]))
        elif "Heading 4" in n: story.append(Paragraph(s, styles["Heading4"]))
        else:                  story.append(Paragraph(s, styles["Normal"]))
        story.append(Spacer(1,5))
    if not story: story.append(Paragraph("(Empty document)", styles["Normal"]))
    _rl_doc(out).build(story)

def docx_to_txt(src: str, out: str):
    from docx import Document
    with open(out, "w", encoding="utf-8") as f:
        f.write("\n".join(p.text for p in Document(src).paragraphs))

def txt_to_pdf(src: str, out: str):
    from reportlab.platypus import Paragraph, Spacer
    styles = _styles(); story = []
    with open(src, "r", encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.rstrip()
            story.append(Paragraph(_safe(line), styles["Normal"]) if line else Spacer(1,10))
    if not story: story.append(Paragraph("(Empty file)", styles["Normal"]))
    _rl_doc(out).build(story)

def txt_to_docx(src: str, out: str):
    from docx import Document
    doc = Document()
    with open(src, "r", encoding="utf-8", errors="replace") as f:
        for line in f: doc.add_paragraph(line.rstrip())
    doc.save(out)


def csv_to_xlsx(src: str, out: str):
    import pandas as pd
    pd.read_csv(src).to_excel(out, index=False, engine="openpyxl")

def csv_to_pdf(src: str, out: str):
    import pandas as pd
    from reportlab.lib.pagesizes import landscape, A4
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle
    from reportlab.lib import colors
    from reportlab.lib.units import cm
    df = pd.read_csv(src).fillna("").astype(str)
    data = [list(df.columns)] + df.values.tolist()
    doc = SimpleDocTemplate(out, pagesize=landscape(A4),
                            leftMargin=1.5*cm, rightMargin=1.5*cm,
                            topMargin=1.5*cm,  bottomMargin=1.5*cm)
    tbl = Table(data, repeatRows=1)
    tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1, 0), colors.HexColor("#1e293b")),
        ("TEXTCOLOR",     (0,0),(-1, 0), colors.white),
        ("FONTNAME",      (0,0),(-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",      (0,0),(-1,-1), 8),
        ("ROWBACKGROUNDS",(0,1),(-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ("GRID",          (0,0),(-1,-1), 0.4, colors.HexColor("#e2e8f0")),
        ("PADDING",       (0,0),(-1,-1), 5),
        ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
    ]))
    doc.build([tbl])

def xlsx_to_csv(src: str, out: str):
    import pandas as pd
    pd.read_excel(src, engine="openpyxl").to_csv(out, index=False)

def xlsx_to_pdf(src: str, out: str):
    import pandas as pd
    tmp = out + "_tmp.csv"
    try:
        pd.read_excel(src, engine="openpyxl").to_csv(tmp, index=False)
        csv_to_pdf(tmp, out)
    finally:
        if os.path.exists(tmp): os.remove(tmp)


def _md_body(src: str) -> str:
    """Markdown file → HTML body string. markdown → mistune → regex."""
    text = open(src, "r", encoding="utf-8").read()

    try:
        import markdown as _md
        return _md.markdown(text, extensions=["tables","fenced_code"])
    except ImportError:
        pass
    except Exception:
        try:
            import markdown as _md
            return _md.markdown(text)
        except Exception:
            pass

    try:
        import mistune
        return mistune.html(text)
    except ImportError:
        pass
    except Exception:
        pass

    lines, out_lines, in_code = text.split("\n"), [], False
    for ln in lines:
        if ln.startswith("```"):
            in_code = not in_code
            out_lines.append("<pre><code>" if in_code else "</code></pre>")
            continue
        if in_code:
            out_lines.append(ln.replace("&","&amp;").replace("<","&lt;")); continue
        if   ln.startswith("# "):    out_lines.append(f"<h1>{ln[2:]}</h1>")
        elif ln.startswith("## "):   out_lines.append(f"<h2>{ln[3:]}</h2>")
        elif ln.startswith("### "):  out_lines.append(f"<h3>{ln[4:]}</h3>")
        elif ln.startswith("#### "): out_lines.append(f"<h4>{ln[5:]}</h4>")
        elif re.match(r"^[-*+] ", ln): out_lines.append(f"<li>{ln[2:]}</li>")
        elif ln.strip():
            ln = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", ln)
            ln = re.sub(r"\*(.+?)\*",      r"<em>\1</em>",         ln)
            ln = re.sub(r"`(.+?)`",         r"<code>\1</code>",     ln)
            out_lines.append(f"<p>{ln}</p>")
        else:
            out_lines.append("")
    return "\n".join(out_lines)


def md_to_html(src: str, out: str):
    body = _md_body(src)
    with open(out, "w", encoding="utf-8") as f:
        f.write(f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
body{{font-family:Georgia,serif;max-width:800px;margin:40px auto;line-height:1.75;color:#1a1a1a;padding:0 20px}}
h1,h2,h3{{font-family:'Helvetica Neue',sans-serif;color:#111}}
code{{background:#f4f4f4;padding:2px 6px;border-radius:3px;font-size:.9em}}
pre{{background:#f4f4f4;padding:16px;border-radius:6px;overflow-x:auto}}
pre code{{background:none;padding:0}}
table{{border-collapse:collapse;width:100%;margin:1em 0}}
td,th{{border:1px solid #ddd;padding:8px 12px}}th{{background:#f0f0f0;font-weight:600}}
blockquote{{border-left:4px solid #ccc;margin:0;padding-left:16px;color:#555}}
a{{color:#2563eb}}
</style></head><body>{body}</body></html>""")

def md_to_txt(src: str, out: str):
    text = open(src, "r", encoding="utf-8").read()
    text = re.sub(r"^#{1,6}\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
    text = re.sub(r"\*(.+?)\*",     r"\1", text)
    text = re.sub(r"__(.+?)__",     r"\1", text)
    text = re.sub(r"_(.+?)_",       r"\1", text)
    text = re.sub(r"`{3}.*?`{3}",   "",   text, flags=re.DOTALL)
    text = re.sub(r"`(.+?)`",       r"\1", text)
    text = re.sub(r"\[(.+?)\]\(.+?\)", r"\1", text)
    text = re.sub(r"!\[.*?\]\(.+?\)",  "",    text)
    text = re.sub(r"^\s*[-*+]\s+", "• ", text, flags=re.MULTILINE)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    with open(out, "w", encoding="utf-8") as f:
        f.write(text)

def md_to_pdf(src: str, out: str):
    tmp = out + "_tmp.html"
    try:
        md_to_html(src, tmp)
        html_to_pdf(tmp, out)
    finally:
        if os.path.exists(tmp): os.remove(tmp)



def _html_story(html_text: str) -> list:
    """Parse HTML → reportlab story. bs4 → lxml → regex."""
    from reportlab.platypus import Paragraph, Spacer
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib import colors
    styles = _styles()
    code_st = ParagraphStyle("Code", parent=styles["Normal"],
                             fontName="Courier", fontSize=9,
                             backColor=colors.HexColor("#f4f4f4"),
                             leftIndent=12, rightIndent=12)
    story = []

    def add(tag: str, text: str):
        text = text.strip()
        if not text: return
        s = _safe(text)
        if   tag == "h1": story.append(Paragraph(s, styles["Heading1"]))
        elif tag == "h2": story.append(Paragraph(s, styles["Heading2"]))
        elif tag == "h3": story.append(Paragraph(s, styles["Heading3"]))
        elif tag in ("h4","h5","h6"): story.append(Paragraph(s, styles["Heading4"]))
        elif tag == "li": story.append(Paragraph(f"• {s}", styles["Normal"]))
        elif tag in ("pre","code"): story.append(Paragraph(s, code_st))
        else: story.append(Paragraph(s, styles["Normal"]))
        story.append(Spacer(1,4))

    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html_text, "html.parser")
        for t in soup(["script","style","head"]): t.decompose()
        for el in soup.find_all(["h1","h2","h3","h4","h5","h6","p","li","pre","td","th"]):
            add(el.name, el.get_text(separator=" "))
        if story: return story
    except ImportError:
        pass
    except Exception:
        pass

  
    try:
        from lxml import html as lh
        tree = lh.fromstring(html_text)
        root = tree.find(".//body") or tree
        for el in root.iter("h1","h2","h3","h4","h5","h6","p","li","pre","td","th"):
            tag = el.tag if isinstance(el.tag, str) else ""
            add(tag, el.text_content() if hasattr(el,"text_content") else (el.text or ""))
        if story: return story
    except ImportError:
        pass
    except Exception:
        pass


    clean = re.sub(r"<(style|script)[^>]*>.*?</\1>", "", html_text, flags=re.DOTALL|re.I)
    for m in re.finditer(r"<(h[1-6]|p|li|pre)([^>]*)>(.*?)</\1>",
                         clean, re.DOTALL|re.I):
        add(m.group(1).lower(), re.sub(r"<[^>]+>","",m.group(3)))

    if not story:
        raw = re.sub(r"<[^>]+>","", clean)
        for ln in raw.split("\n"):
            if ln.strip():
                story.append(Paragraph(_safe(ln.strip()), styles["Normal"]))
                story.append(Spacer(1,4))

    return story or [Paragraph("(Empty document)", _styles()["Normal"])]

def html_to_pdf(src: str, out: str):
    html_text = open(src, "r", encoding="utf-8", errors="replace").read()
    _rl_doc(out).build(_html_story(html_text))

def html_to_txt(src: str, out: str):
    html_text = open(src, "r", encoding="utf-8", errors="replace").read()

    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html_text, "html.parser")
        for t in soup(["script","style","head"]): t.decompose()
        text = re.sub(r"\n{3,}", "\n\n", soup.get_text("\n")).strip()
        with open(out,"w",encoding="utf-8") as f: f.write(text); return
    except ImportError: pass
    except Exception: pass

    try:
        from lxml import html as lh
        text = re.sub(r"\n{3,}","\n\n", lh.fromstring(html_text).text_content()).strip()
        with open(out,"w",encoding="utf-8") as f: f.write(text); return
    except ImportError: pass
    except Exception: pass

    text = re.sub(r"<(style|script)[^>]*>.*?</\1>","",html_text,flags=re.DOTALL|re.I)
    text = re.sub(r"<[^>]+>","",text)
    text = re.sub(r"\n{3,}","\n\n",text).strip()
    with open(out,"w",encoding="utf-8") as f: f.write(text)


if __name__ == "__main__":
    print(f"\n{'='*60}")
    print(f"  🚀  DocuFree Converter  →  http://localhost:5001")
    print(f"  Python: {sys.executable}")
    print(f"{'='*60}")
    for src, targets in CONVERSION_MAP.items():
        print(f"   .{src:<6} → {', '.join('.'+t for t in targets)}")
    print(f"{'='*60}\n")
    app.run(host="0.0.0.0", port=5001, debug=False)