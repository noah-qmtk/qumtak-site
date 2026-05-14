#!/usr/bin/env python3
"""
Generate weekly Coach Playbook PowerPoint decks from public/training-plans.json.

One .pptx per week, written to public/plans/<weekOf>.pptx.
Each deck has:
  - Cover slide
  - 8 drill slides (4 Pre-K/K + 4 Grades 1-5), each with a field diagram.

Run from repo root:  python3 scripts/generate_pptx.py
"""

import json
import os
import sys
from datetime import datetime

from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.enum.shapes import MSO_SHAPE
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JSON_PATH = os.path.join(ROOT, "public", "training-plans.json")
OUT_DIR = os.path.join(ROOT, "public", "plans")

# qmtk brand
GREEN = RGBColor(0x22, 0xA2, 0x4D)
GREEN_DARK = RGBColor(0x1A, 0x5C, 0x2A)
FIELD_GREEN = RGBColor(0x2D, 0x7A, 0x3A)
BG_DARK = RGBColor(0x0A, 0x0F, 0x0C)
BG_CARD = RGBColor(0x16, 0x1D, 0x13)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
TEXT_MID = RGBColor(0xB8, 0xC4, 0xBC)
TEXT_DIM = RGBColor(0x7A, 0x8C, 0x80)
GOLD = RGBColor(0xF5, 0xA6, 0x23)
BLUE = RGBColor(0x4A, 0x90, 0xE2)
PURPLE = RGBColor(0x7C, 0x5D, 0xFA)
RED = RGBColor(0xE2, 0x4A, 0x4A)

TAG_COLOR = {
    "Opening Game": GOLD,
    "Lesson 1": BLUE,
    "Lesson 2": PURPLE,
    "Scrimmage": GREEN,
}

MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"]


def set_fill(shape, color):
    shape.fill.solid()
    shape.fill.fore_color.rgb = color


def no_line(shape):
    shape.line.fill.background()


def add_rect(slide, x, y, w, h, fill=None, line=None, line_width=None):
    s = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, y, w, h)
    if fill is not None:
        set_fill(s, fill)
    if line is None:
        no_line(s)
    else:
        s.line.color.rgb = line
        if line_width is not None:
            s.line.width = line_width
    return s


def add_oval(slide, x, y, w, h, fill, line=None, line_width=None):
    s = slide.shapes.add_shape(MSO_SHAPE.OVAL, x, y, w, h)
    set_fill(s, fill)
    if line is None:
        no_line(s)
    else:
        s.line.color.rgb = line
        if line_width is not None:
            s.line.width = line_width
    return s


def add_text(slide, x, y, w, h, text, *, font_size=14, bold=False, color=WHITE,
             align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, font="Calibri"):
    tb = slide.shapes.add_textbox(x, y, w, h)
    tf = tb.text_frame
    tf.margin_left = tf.margin_right = Emu(0)
    tf.margin_top = tf.margin_bottom = Emu(0)
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    lines = text.split("\n") if isinstance(text, str) else text
    for i, line in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        r = p.add_run()
        r.text = line
        r.font.name = font
        r.font.size = Pt(font_size)
        r.font.bold = bold
        r.font.color.rgb = color
    return tb


def add_line(slide, x1, y1, x2, y2, color=WHITE, width=1.5, dashed=False):
    line = slide.shapes.add_connector(1, x1, y1, x2, y2)
    line.line.color.rgb = color
    line.line.width = Pt(width)
    if dashed:
        try:
            from pptx.enum.dml import MSO_LINE_DASH_STYLE
            line.line.dash_style = MSO_LINE_DASH_STYLE.DASH
        except Exception:
            pass
    return line


def player_dot(slide, cx, cy, color, label="P", radius_in=0.14):
    r = Inches(radius_in)
    add_oval(slide, cx - r, cy - r, r * 2, r * 2, color, line=WHITE, line_width=Pt(1.0))
    add_text(slide, cx - r, cy - Inches(0.1), r * 2, Inches(0.2), label,
             font_size=9, bold=True, color=WHITE, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)


def ball(slide, cx, cy, radius_in=0.07):
    r = Inches(radius_in)
    add_oval(slide, cx - r, cy - r, r * 2, r * 2, WHITE, line=BG_DARK, line_width=Pt(0.75))


def cone(slide, cx, cy):
    r = Inches(0.08)
    add_oval(slide, cx - r, cy - r, r * 2, r * 2, GOLD, line=WHITE, line_width=Pt(0.75))


def small_goal(slide, x, y, w_in=0.55, vertical=False):
    if vertical:
        s = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, y, Inches(0.08), Inches(w_in))
    else:
        s = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, y, Inches(w_in), Inches(0.08))
    s.fill.background()
    s.line.color.rgb = WHITE
    s.line.width = Pt(2.5)


# ── Diagram drawers ───────────────────────────────────────────────────────────

def diagram_field(slide, x, y, w, h):
    """Base field rect."""
    add_rect(slide, x, y, w, h, fill=FIELD_GREEN)
    inset = Inches(0.1)
    add_rect(slide, x + inset, y + inset, w - inset * 2, h - inset * 2,
             fill=None, line=RGBColor(0xFF, 0xFF, 0xFF), line_width=Pt(1.5))
    # Make the border-only rect transparent fill
    # (we'll just rely on the line; remove fill)
    # python-pptx requires fill to be solid or none; set background
    # Re-add border rect with no fill instead:
    # (Hack: previous call had fill=None which we treat as background)


def draw_box_with_label(slide, x, y, w, h, label, fill=FIELD_GREEN):
    add_rect(slide, x, y, w, h, fill=fill)
    add_rect(slide, x + Inches(0.06), y + Inches(0.06), w - Inches(0.12), h - Inches(0.12),
             fill=fill, line=WHITE, line_width=Pt(1.5))
    # Title pill
    pill_w = Inches(2.0)
    pill_h = Inches(0.28)
    px = x + (w - pill_w) / 2
    py = y + Inches(0.1)
    pill = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, px, py, pill_w, pill_h)
    set_fill(pill, RGBColor(0, 0, 0))
    pill.fill.transparency = 0.4 if False else None  # python-pptx doesn't support transparency cleanly
    no_line(pill)
    add_text(slide, px, py + Inches(0.02), pill_w, pill_h, label,
             font_size=10, bold=True, color=WHITE, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)


def draw_diagram(slide, dx, dy, dw, dh, tag, title):
    """Draw an appropriate field diagram based on drill title/tag."""
    t = (title or "").lower()
    draw_box_with_label(slide, dx, dy, dw, dh, tag.upper())

    cx = dx + dw / 2
    cy = dy + dh / 2

    if "red light" in t or "follow the coach" in t:
        # Players spread across grid, coach in center
        for px, py in [(0.18, 0.25), (0.35, 0.55), (0.55, 0.3), (0.72, 0.6), (0.85, 0.35), (0.25, 0.75), (0.6, 0.75)]:
            cxp = dx + dw * px
            cyp = dy + dh * py
            player_dot(slide, cxp, cyp, GOLD, "P")
            ball(slide, cxp + Inches(0.18), cyp)
        # Coach
        player_dot(slide, cx, cy, RED, "C", radius_in=0.18)

    elif "sharks" in t or "pass tag" in t or "3-team" in t or "king of the hill" in t:
        # Grid with sharks and minnows
        for px, py in [(0.18, 0.3), (0.35, 0.55), (0.55, 0.35), (0.72, 0.62), (0.85, 0.4), (0.28, 0.75)]:
            cxp = dx + dw * px
            cyp = dy + dh * py
            player_dot(slide, cxp, cyp, BLUE, "M")
            ball(slide, cxp + Inches(0.18), cyp)
        # Sharks
        for px, py in [(0.45, 0.5), (0.7, 0.4)]:
            player_dot(slide, dx + dw * px, dy + dh * py, RED, "S", radius_in=0.16)

    elif "cone path" in t or "friendly foot" in t or "cone" in t and "slalom" in t or "close-control" in t or "beat the cone" in t:
        # Cones in a slalom line
        cone_count = 6
        for i in range(cone_count):
            px = 0.18 + (0.62 / (cone_count - 1)) * i
            py = 0.45 + (0.1 if i % 2 == 0 else -0.1)
            cone(slide, dx + dw * px, dy + dh * py)
        # Player with ball at start
        player_dot(slide, dx + dw * 0.1, dy + dh * 0.5, GOLD, "P")
        ball(slide, dx + dw * 0.12, dy + dh * 0.55)
        # Arrow showing path
        add_line(slide, dx + dw * 0.12, dy + dh * 0.55, dx + dw * 0.85, dy + dh * 0.5,
                 color=GOLD, width=2.0, dashed=True)

    elif "toe tap" in t or "skills showcase" in t:
        # Each player has their own ball
        for col in range(4):
            for row in range(2):
                px = 0.2 + col * 0.18
                py = 0.35 + row * 0.3
                player_dot(slide, dx + dw * px, dy + dh * py, GOLD, "P")
                ball(slide, dx + dw * px, dy + dh * (py + 0.08))

    elif "everyone scores" in t or "mini game" in t:
        # Tiny field with two small goals
        small_goal(slide, dx + Inches(0.2), cy - Inches(0.27), w_in=0.55, vertical=True)
        small_goal(slide, dx + dw - Inches(0.28), cy - Inches(0.27), w_in=0.55, vertical=True)
        # Players two teams
        for px, py in [(0.25, 0.35), (0.32, 0.65)]:
            player_dot(slide, dx + dw * px, dy + dh * py, GOLD, "A")
        for px, py in [(0.7, 0.35), (0.77, 0.65)]:
            player_dot(slide, dx + dw * px, dy + dh * py, BLUE, "B")
        ball(slide, cx, cy)

    elif "small-sided scrimmage" in t or "season finale" in t or "world cup knockout" in t:
        # Two real goals, midline, players spread
        small_goal(slide, dx + Inches(0.2), cy - Inches(0.35), w_in=0.7, vertical=True)
        small_goal(slide, dx + dw - Inches(0.28), cy - Inches(0.35), w_in=0.7, vertical=True)
        add_line(slide, cx, dy + Inches(0.2), cx, dy + dh - Inches(0.2), color=WHITE, width=1.0, dashed=True)
        for px, py in [(0.22, 0.35), (0.3, 0.6), (0.4, 0.45), (0.45, 0.75)]:
            player_dot(slide, dx + dw * px, dy + dh * py, GOLD, "A")
        for px, py in [(0.78, 0.35), (0.7, 0.6), (0.6, 0.45), (0.55, 0.25)]:
            player_dot(slide, dx + dw * px, dy + dh * py, BLUE, "B")
        ball(slide, cx, cy)

    elif "pass" in t and ("coach" in t or "circle" in t):
        # Players in circle around coach
        import math
        r_in = min(dw, dh) / 3
        for i in range(7):
            ang = (2 * math.pi / 7) * i - math.pi / 2
            px = cx + r_in * math.cos(ang)
            py = cy + r_in * math.sin(ang)
            player_dot(slide, px, py, GOLD, "P")
        # Coach center
        player_dot(slide, cx, cy, RED, "C", radius_in=0.18)
        ball(slide, cx + Inches(0.25), cy)

    elif "stop & pass" in t or "stop and pass" in t or "pass through the gate" in t or "2-touch" in t or "partner passing" in t:
        # Pairs facing each other with a cone gate
        for row in range(2):
            yrow = dy + dh * (0.3 + row * 0.4)
            player_dot(slide, dx + dw * 0.2, yrow, GOLD, "A")
            player_dot(slide, dx + dw * 0.8, yrow, BLUE, "B")
            cone(slide, dx + dw * 0.48, yrow - Inches(0.12))
            cone(slide, dx + dw * 0.48, yrow + Inches(0.12))
            ball(slide, dx + dw * 0.35, yrow)
            add_line(slide, dx + dw * 0.25, yrow, dx + dw * 0.75, yrow,
                     color=WHITE, width=1.5, dashed=True)

    elif "pass & move" in t or "pass and move" in t or "triangles" in t or "give-and-go" in t or "wall pass" in t or "combination" in t:
        # Triangle of players
        positions = [(0.25, 0.7), (0.5, 0.25), (0.75, 0.7)]
        labels = ["A", "B", "C"]
        colors = [GOLD, BLUE, PURPLE]
        for (px, py), lab, col in zip(positions, labels, colors):
            player_dot(slide, dx + dw * px, dy + dh * py, col, lab)
        # Arrows
        for i in range(3):
            x1 = dx + dw * positions[i][0]
            y1 = dy + dh * positions[i][1]
            x2 = dx + dw * positions[(i + 1) % 3][0]
            y2 = dy + dh * positions[(i + 1) % 3][1]
            add_line(slide, x1, y1, x2, y2, color=WHITE, width=1.5, dashed=True)
        ball(slide, dx + dw * 0.32, dy + dh * 0.55)

    elif "push & chase" in t or "push and chase" in t or "race to the cone" in t or "first touch & drive" in t or "drive" in t and "finish" not in t:
        # Straight lane with player and a far cone
        player_dot(slide, dx + dw * 0.15, cy, GOLD, "P")
        ball(slide, dx + dw * 0.2, cy)
        cone(slide, dx + dw * 0.85, cy)
        add_line(slide, dx + dw * 0.2, cy, dx + dw * 0.82, cy, color=GOLD, width=2.5, dashed=True)

    elif "knock down" in t or "shoot the ball" in t or "score 5" in t or "hot potato" in t or "finishing" in t or "drive & finish" in t or "2v1" in t or "1v1 to goal" in t:
        # Goal at top, player with ball at bottom, defender optional
        small_goal(slide, cx - Inches(0.4), dy + Inches(0.25), w_in=0.8)
        player_dot(slide, cx, dy + dh - Inches(0.6), GOLD, "P")
        ball(slide, cx, dy + dh - Inches(0.45))
        add_line(slide, cx, dy + dh - Inches(0.45), cx, dy + Inches(0.45),
                 color=GOLD, width=2.5, dashed=True)
        if "2v1" in t or "1v1" in t:
            player_dot(slide, cx + Inches(0.6), dy + dh * 0.55, RED, "D")
        if "2v1" in t:
            player_dot(slide, cx - Inches(0.7), dy + dh - Inches(0.6), BLUE, "A2")

    elif "go around" in t or "beat the cone" in t or "two moves" in t or "1v1" in t:
        # 1v1 box
        player_dot(slide, dx + dw * 0.25, cy, GOLD, "A")
        ball(slide, dx + dw * 0.3, cy)
        player_dot(slide, dx + dw * 0.6, cy, RED, "D")
        add_line(slide, dx + dw * 0.3, cy, dx + dw * 0.85, dy + dh * 0.3,
                 color=GOLD, width=2.0, dashed=True)
        add_line(slide, dx + dw * 0.3, cy, dx + dw * 0.85, dy + dh * 0.7,
                 color=GOLD, width=2.0, dashed=True)

    elif "free play" in t or "position" in t:
        # Half-field with positions marked
        small_goal(slide, dx + Inches(0.2), cy - Inches(0.35), w_in=0.7, vertical=True)
        small_goal(slide, dx + dw - Inches(0.28), cy - Inches(0.35), w_in=0.7, vertical=True)
        for px, py, lab in [(0.25, 0.5, "GK"), (0.4, 0.3, "D"), (0.4, 0.7, "D"), (0.55, 0.5, "M"), (0.75, 0.5, "F")]:
            player_dot(slide, dx + dw * px, dy + dh * py, GOLD, lab)

    else:
        # Generic: a few players + a ball in middle
        for px, py in [(0.25, 0.5), (0.5, 0.3), (0.75, 0.5), (0.5, 0.75)]:
            player_dot(slide, dx + dw * px, dy + dh * py, GOLD, "P")
        ball(slide, cx, cy)


# ── Slide builders ────────────────────────────────────────────────────────────

def add_cover_slide(prs, week_meta, plan_meta):
    slide = prs.slides.add_slide(prs.slide_layouts[6])  # blank
    sw = prs.slide_width
    sh = prs.slide_height
    add_rect(slide, 0, 0, sw, sh, fill=BG_DARK)

    # Top green accent bar
    add_rect(slide, 0, 0, sw, Inches(0.15), fill=GREEN)

    # Brand
    add_text(slide, Inches(0.6), Inches(0.45), Inches(6), Inches(0.5),
             "qmtk Soccer", font_size=24, bold=True, color=GREEN, font="Calibri")
    add_text(slide, Inches(0.6), Inches(0.85), Inches(6), Inches(0.35),
             "Coach Playbook", font_size=14, color=TEXT_MID)

    # Week title
    d = datetime.strptime(week_meta["weekOf"], "%Y-%m-%d")
    week_str = f"Week of {MONTHS[d.month - 1]} {d.day}, {d.year}"
    add_text(slide, Inches(0.6), Inches(2.0), Inches(sw / Inches(1) - 1.2), Inches(0.8),
             week_str, font_size=40, bold=True, color=WHITE)
    add_text(slide, Inches(0.6), Inches(2.85), Inches(sw / Inches(1) - 1.2), Inches(0.5),
             week_meta.get("label", ""), font_size=22, color=GREEN)

    # Location/time
    add_text(slide, Inches(0.6), Inches(3.9), Inches(sw / Inches(1) - 1.2), Inches(0.35),
             plan_meta.get("location", ""), font_size=14, color=TEXT_MID)
    add_text(slide, Inches(0.6), Inches(4.25), Inches(sw / Inches(1) - 1.2), Inches(0.35),
             plan_meta.get("time", ""), font_size=14, color=TEXT_MID)

    # Footer line
    add_rect(slide, Inches(0.6), Inches(sh / Inches(1) - 0.9), Inches(sw / Inches(1) - 1.2), Inches(0.02), fill=GREEN)
    add_text(slide, Inches(0.6), Inches(sh / Inches(1) - 0.75), Inches(sw / Inches(1) - 1.2), Inches(0.3),
             "qmtk.org · Train Smart. Play Smart.", font_size=11, color=TEXT_DIM)


def add_section_divider(prs, title, subtitle):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    sw = prs.slide_width
    sh = prs.slide_height
    add_rect(slide, 0, 0, sw, sh, fill=GREEN_DARK)
    add_text(slide, Inches(0.6), Inches(sh / Inches(1) / 2 - 0.8), Inches(sw / Inches(1) - 1.2), Inches(0.8),
             title, font_size=44, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    add_text(slide, Inches(0.6), Inches(sh / Inches(1) / 2 + 0.1), Inches(sw / Inches(1) - 1.2), Inches(0.5),
             subtitle, font_size=18, color=RGBColor(0xCF, 0xE8, 0xD5), align=PP_ALIGN.CENTER)


def add_drill_slide(prs, age_label, step):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    sw = prs.slide_width
    sh = prs.slide_height
    add_rect(slide, 0, 0, sw, sh, fill=BG_DARK)

    # Top color band based on tag
    band_color = TAG_COLOR.get(step["tag"], GREEN)
    add_rect(slide, 0, 0, sw, Inches(0.12), fill=band_color)

    # Header row: tag + time + space
    add_text(slide, Inches(0.6), Inches(0.35), Inches(2.4), Inches(0.35),
             step["tag"].upper(), font_size=12, bold=True, color=band_color)
    add_text(slide, Inches(0.6), Inches(0.65), Inches(8), Inches(0.45),
             step["title"], font_size=28, bold=True, color=WHITE)
    add_text(slide, Inches(0.6), Inches(1.15), Inches(8), Inches(0.3),
             f"{age_label}  ·  {step['time']}  ·  📏 {step['space']}",
             font_size=12, color=TEXT_MID)

    # Left column: description + focus
    left_x = Inches(0.6)
    left_y = Inches(1.7)
    left_w = Inches(5.0)

    add_text(slide, left_x, left_y, left_w, Inches(0.35),
             "DRILL", font_size=10, bold=True, color=GREEN)
    add_text(slide, left_x, left_y + Inches(0.3), left_w, Inches(2.3),
             step["desc"], font_size=13, color=WHITE)

    add_text(slide, left_x, left_y + Inches(2.7), left_w, Inches(0.35),
             "KEY COACHING CUES", font_size=10, bold=True, color=GREEN)
    cue_y = left_y + Inches(3.0)
    for cue in step.get("focus", []):
        add_text(slide, left_x, cue_y, left_w, Inches(0.35),
                 "•  " + cue, font_size=12, color=TEXT_MID)
        cue_y += Inches(0.32)

    # Right column: diagram
    diag_x = Inches(5.9)
    diag_y = Inches(1.7)
    diag_w = Inches(3.8)
    diag_h = Inches(4.2)

    draw_diagram(slide, diag_x, diag_y, diag_w, diag_h, step["tag"], step["title"])

    # Caption under diagram
    add_text(slide, diag_x, diag_y + diag_h + Inches(0.1), diag_w, Inches(0.35),
             "Setup: " + step["space"], font_size=10, color=TEXT_DIM, align=PP_ALIGN.CENTER)

    # Bottom brand bar
    add_rect(slide, 0, sh - Inches(0.18), sw, Inches(0.18), fill=BG_CARD)
    add_text(slide, Inches(0.6), sh - Inches(0.16), Inches(sw / Inches(1) - 1.2), Inches(0.16),
             "qmtk Soccer · Coach Playbook", font_size=9, color=TEXT_DIM)
    add_text(slide, sw - Inches(2.0), sh - Inches(0.16), Inches(1.4), Inches(0.16),
             "qmtk.org", font_size=9, color=TEXT_DIM, align=PP_ALIGN.RIGHT)


# ── Main ──────────────────────────────────────────────────────────────────────

def build_week(plan_meta, week):
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    add_cover_slide(prs, week, plan_meta)

    add_section_divider(prs, "Pre-K & Kindergarten", "Ages 3–5  ·  45 minutes")
    for step in week.get("prek", []):
        add_drill_slide(prs, "Pre-K & K", step)

    add_section_divider(prs, "Grades 1–5", "Ages 6–11  ·  60 minutes")
    for step in week.get("elem", []):
        add_drill_slide(prs, "Grades 1–5", step)

    return prs


def main():
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    os.makedirs(OUT_DIR, exist_ok=True)
    plan_meta = {"location": data.get("location", ""), "time": data.get("time", "")}

    for week in data.get("weeks", []):
        prs = build_week(plan_meta, week)
        out = os.path.join(OUT_DIR, f"{week['weekOf']}.pptx")
        prs.save(out)
        print(f"wrote {out}")


if __name__ == "__main__":
    main()
