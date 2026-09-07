# -*- coding: utf-8 -*-
"""
把 DEPLOY.md 转成带排版的 Word 文档 部署方案.docx。
一次性脚本，用 python-docx。
运行: python docs/make_deploy_docx.py
"""
import re
import sys
from pathlib import Path

from docx import Document
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement


ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "DEPLOY.md"
OUT = ROOT / "部署方案.docx"


def set_run_font(run, name="Times New Roman", east="宋体", size=11, bold=False, color=None):
    run.font.name = name
    run.font.size = Pt(size)
    run.font.bold = bold
    r = run._element
    rPr = r.get_or_add_rPr()
    rFonts = rPr.find(qn("w:rFonts"))
    if rFonts is None:
        rFonts = OxmlElement("w:rFonts")
        rPr.append(rFonts)
    rFonts.set(qn("w:ascii"), name)
    rFonts.set(qn("w:hAnsi"), name)
    rFonts.set(qn("w:eastAsia"), east)
    if color is not None:
        run.font.color.rgb = RGBColor(*color)


def shade_paragraph(paragraph, fill="F2F2F2"):
    """给整段加底纹（用于代码块）。"""
    pPr = paragraph._p.get_or_add_pPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), fill)
    pPr.append(shd)


def add_inline_bold(doc_or_cell, text, base_size=11):
    """解析 **加粗** 和 `行内代码`，加到段落。"""
    # 先按 `code` 拆，再按 **bold** 拆
    pattern = re.compile(r"(\*\*[^*]+\*\*|`[^`]+`)")
    pos = 0
    para = doc_or_cell.add_paragraph() if hasattr(doc_or_cell, "add_paragraph") else doc_or_cell
    for m in pattern.finditer(text):
        if m.start() > pos:
            run = para.add_run(text[pos:m.start()])
            set_run_font(run, size=base_size)
        token = m.group(0)
        if token.startswith("**"):
            run = para.add_run(token[2:-2])
            set_run_font(run, size=base_size, bold=True)
        elif token.startswith("`"):
            run = para.add_run(token[1:-1])
            set_run_font(run, name="Consolas", east="Consolas", size=base_size)
        pos = m.end()
    if pos < len(text):
        run = para.add_run(text[pos:])
        set_run_font(run, size=base_size)
    return para


def add_paragraph_with_inline(container, text, size=11):
    """container 是 document；返回新段落。"""
    para = container.add_paragraph()
    pattern = re.compile(r"(\*\*[^*]+\*\*|`[^`]+`)")
    pos = 0
    for m in pattern.finditer(text):
        if m.start() > pos:
            run = para.add_run(text[pos:m.start()])
            set_run_font(run, size=size)
        token = m.group(0)
        if token.startswith("**"):
            run = para.add_run(token[2:-2])
            set_run_font(run, size=size, bold=True)
        elif token.startswith("`"):
            run = para.add_run(token[1:-1])
            set_run_font(run, name="Consolas", east="Consolas", size=size)
        pos = m.end()
    if pos < len(text):
        run = para.add_run(text[pos:])
        set_run_font(run, size=size)
    return para


def set_cell_text(cell, text, bold=False, size=10):
    cell.text = ""
    para = cell.paragraphs[0]
    run = para.add_run(text)
    set_run_font(run, size=size, bold=bold)


def set_table_borders(table):
    tbl = table._tbl
    tblPr = tbl.tblPr
    borders = OxmlElement("w:tblBorders")
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        el = OxmlElement(f"w:{edge}")
        el.set(qn("w:val"), "single")
        el.set(qn("w:sz"), "4")
        el.set(qn("w:space"), "0")
        el.set(qn("w:color"), "808080")
        borders.append(el)
    tblPr.append(borders)


def parse_table_rows(lines, idx):
    """从 idx 开始解析 markdown 表格，返回 (rows, next_idx)。"""
    rows = []
    while idx < len(lines) and lines[idx].strip().startswith("|"):
        line = lines[idx].strip()
        cells = [c.strip() for c in line.split("|")[1:-1]]
        rows.append(cells)
        idx += 1
    return rows, idx


def build():
    if not SRC.exists():
        print(f"找不到 {SRC}", file=sys.stderr)
        sys.exit(1)

    md = SRC.read_text(encoding="utf-8")
    lines = md.splitlines()

    doc = Document()

    # 默认正文样式
    style = doc.styles["Normal"]
    style.font.name = "Times New Roman"
    style.font.size = Pt(11)
    rPr = style.element.get_or_add_rPr()
    rFonts = rPr.find(qn("w:rFonts"))
    if rFonts is None:
        rFonts = OxmlElement("w:rFonts")
        rPr.append(rFonts)
    rFonts.set(qn("w:eastAsia"), "宋体")

    i = 0
    in_code = False
    code_buf = []

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        # 代码块围栏
        if stripped.startswith("```"):
            if not in_code:
                in_code = True
                code_buf = []
                i += 1
                continue
            else:
                # 输出累积的代码块
                in_code = False
                code_text = "\n".join(code_buf)
                if code_text:
                    para = doc.add_paragraph()
                    para.paragraph_format.left_indent = Inches(0.3)
                    para.paragraph_format.space_before = Pt(4)
                    para.paragraph_format.space_after = Pt(4)
                    run = para.add_run(code_text)
                    set_run_font(run, name="Consolas", east="Consolas", size=9)
                    shade_paragraph(para, "F2F2F2")
                code_buf = []
                i += 1
                continue

        if in_code:
            code_buf.append(line)
            i += 1
            continue

        # 空行
        if not stripped:
            i += 1
            continue

        # 标题
        if stripped.startswith("### "):
            h = doc.add_heading(level=3)
            run = h.add_run(stripped[4:])
            set_run_font(run, size=13, bold=True)
            i += 1
            continue
        if stripped.startswith("## "):
            h = doc.add_heading(level=2)
            run = h.add_run(stripped[3:])
            set_run_font(run, size=15, bold=True)
            i += 1
            continue
        if stripped.startswith("# "):
            h = doc.add_heading(level=1)
            run = h.add_run(stripped[2:])
            set_run_font(run, size=18, bold=True)
            i += 1
            continue

        # 分隔线
        if stripped in ("---", "***"):
            p = doc.add_paragraph()
            pPr = p._p.get_or_add_pPr()
            pBdr = OxmlElement("w:pBdr")
            bottom = OxmlElement("w:bottom")
            bottom.set(qn("w:val"), "single")
            bottom.set(qn("w:sz"), "6")
            bottom.set(qn("w:space"), "1")
            bottom.set(qn("w:color"), "BFBFBF")
            pBdr.append(bottom)
            pPr.append(pBdr)
            i += 1
            continue

        # 表格
        if stripped.startswith("|"):
            rows, next_i = parse_table_rows(lines, i)
            # 去掉分隔行（含 ---）
            data_rows = [r for r in rows if not all(set(c) <= set("-: ") for c in r)]
            if data_rows:
                n_cols = max(len(r) for r in data_rows)
                table = doc.add_table(rows=len(data_rows), cols=n_cols)
                set_table_borders(table)
                for ri, row in enumerate(data_rows):
                    for ci in range(n_cols):
                        cell_text = row[ci] if ci < len(row) else ""
                        # 去掉 markdown 加粗标记
                        clean = re.sub(r"\*\*([^*]+)\*\*", r"\1", cell_text)
                        clean = re.sub(r"`([^`]+)`", r"\1", clean)
                        set_cell_text(table.cell(ri, ci), clean, bold=(ri == 0), size=10)
                doc.add_paragraph()
            i = next_i
            continue

        # 项目符号（- 或 *）
        if re.match(r"^[-*] ", stripped):
            text = stripped[2:]
            para = doc.add_paragraph(style="List Bullet")
            # 解析行内加粗/代码
            pattern = re.compile(r"(\*\*[^*]+\*\*|`[^`]+`)")
            pos = 0
            for m in pattern.finditer(text):
                if m.start() > pos:
                    run = para.add_run(text[pos:m.start()])
                    set_run_font(run, size=11)
                token = m.group(0)
                if token.startswith("**"):
                    run = para.add_run(token[2:-2])
                    set_run_font(run, size=11, bold=True)
                elif token.startswith("`"):
                    run = para.add_run(token[1:-1])
                    set_run_font(run, name="Consolas", east="Consolas", size=11)
                pos = m.end()
            if pos < len(text):
                run = para.add_run(text[pos:])
                set_run_font(run, size=11)
            i += 1
            continue

        # 引用块 >
        if stripped.startswith("> "):
            para = add_paragraph_with_inline(doc, stripped[2:], size=10)
            shade_paragraph(para, "FFF2CC")
            para.paragraph_format.left_indent = Inches(0.2)
            i += 1
            continue

        # 普通段落
        add_paragraph_with_inline(doc, stripped, size=11)
        i += 1

    # 如果文档结尾还在代码块里
    if in_code and code_buf:
        code_text = "\n".join(code_buf)
        para = doc.add_paragraph()
        para.paragraph_format.left_indent = Inches(0.3)
        run = para.add_run(code_text)
        set_run_font(run, name="Consolas", east="Consolas", size=9)
        shade_paragraph(para, "F2F2F2")

    doc.save(str(OUT))
    print(f"OK: {OUT}")


if __name__ == "__main__":
    build()
