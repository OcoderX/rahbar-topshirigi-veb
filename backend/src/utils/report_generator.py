#!/usr/bin/env python3
"""Rahbar uchun Excel hisobot generatori.

Uch varaq:
  «Umumiy»    — asosiy ko'rsatkichlar kartalari, vazifalar holati va xodimlar darajasi
                (grafiklar bilan), izoh;
  «Xodimlar»  — har bir xodim: nechta vazifa, qanchasi bajarilgan, muddatga rioya, daraja;
  «Vazifalar» — barcha vazifalar batafsil (ustunlar bo'yicha filtrlash mumkin).
"""
import sys
import os
import json
import math
from datetime import datetime, date
from openpyxl import Workbook
from openpyxl.cell.cell import ILLEGAL_CHARACTERS_RE
from openpyxl.chart import BarChart, DoughnutChart, Reference
from openpyxl.chart.label import DataLabelList
from openpyxl.chart.series import DataPoint
from openpyxl.chart.text import RichText
from openpyxl.drawing.text import CharacterProperties, Paragraph, ParagraphProperties
from openpyxl.formatting.rule import DataBarRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.properties import PageSetupProperties
from openpyxl.worksheet.worksheet import Worksheet

DATE_FMT = "DD.MM.YYYY"
DATETIME_FMT = "DD.MM.YYYY HH:MM"
PERCENT_FMT = "0%"
DAYS_FMT = "0.0"
DAYS_UNIT_FMT = '0.0" kun"'

ON_TIME = "Muddatida"
LATE = "Kechikib"
OVERDUE = "Muddati o'tgan"
NOT_DUE_YET = "Muddat kelmagan"
NO_DUE = "Muddatsiz"
NOT_APPLICABLE = "—"
NOT_RATED = "Baholanmagan"
NO_TASKS = "Vazifa yo'q"

LEVELS = ((90, "A'lo", "🏆"), (70, "Yaxshi", "👍"), (50, "Qoniqarli", "🙂"), (0, "Past", "⚠️"))

NAVY, INK, MUTED, LINE, ZEBRA, WHITE = "1F3864", "262626", "7F7F7F", "D9D9D9", "F5F8FC", "FFFFFF"

TONES = {
    "green": ("E2EFDA", "375623"),
    "blue": ("DDEBF7", "1F4E78"),
    "amber": ("FFF2CC", "806000"),
    "red": ("FCE4E4", "9C0006"),
    "grey": ("EDEDED", "595959"),
    "purple": ("EAE4F2", "5B2C83"),
}

SOLID = {
    "green": "70AD47",
    "blue": "5B9BD5",
    "amber": "FFC000",
    "red": "E15759",
    "grey": "A5A5A5",
    "purple": "8E6BBF",
}

LEVEL_TONES = {
    "A'lo": "green",
    "Yaxshi": "blue",
    "Qoniqarli": "amber",
    "Past": "red",
    NOT_RATED: "grey",
    NO_TASKS: "grey",
}

STATUS_LABELS = {
    "pending": "Kutilmoqda",
    "in_progress": "Jarayonda",
    "completed": "Bajarildi",
}

STATUS_TONES = {
    "Bajarildi": "green",
    "Kutilmoqda": "amber",
    "Jarayonda": "blue",
    "Bekor qilingan": "grey",
}

DEADLINE_TONES = {
    ON_TIME: "green",
    LATE: "amber",
    OVERDUE: "red",
    NOT_DUE_YET: "blue",
}

MEDALS = ("FFD966", "D9D9D9", "F4B183")

CENTER = Alignment(horizontal="center", vertical="center", wrap_text=True)
TEXT = Alignment(horizontal="left", vertical="center", wrap_text=True)
HEADER_FONT = Font(size=10, bold=True, color=WHITE)
BODY_FONT = Font(size=10, color=INK)

WIDE, NARROW = 13, 2
GAPS = (4, 7, 10)
CARDS = ((2, 3), (5, 6), (8, 9), (11, 12))
LEFT, RIGHT = (2, 6), (8, 12)
CHART_DATA_COL = 14
ROW_H = 20
MAX_ROW_H = 300
PX_PER_CM, CM_PER_PT = 37.8, 2.54 / 72
TOP_CHART = 10

def _fill(color: str) -> PatternFill:
    return PatternFill("solid", fgColor=color)

def _side(color: str = LINE, style: str = "thin") -> Side:
    return Side(style=style, color=color)

GRID = Border(left=_side(), right=_side(), top=_side(), bottom=_side())
UNDERLINE = Border(bottom=_side())

def _clean(value):
    return ILLEGAL_CHARACTERS_RE.sub("", value) if isinstance(value, str) else value

def _set(ws: Worksheet, row: int, col: int, value, fmt: str | None = None):
    cell = ws.cell(row=row, column=col, value=_clean(value))
    if isinstance(value, str) and value.startswith("="):
        cell.data_type = "s"
    if fmt:
        cell.number_format = fmt
    elif isinstance(value, datetime):
        cell.number_format = DATETIME_FMT
    elif isinstance(value, date):
        cell.number_format = DATE_FMT
    return cell

def _or_dash(value):
    return NOT_APPLICABLE if value is None else value

def _tone(cell, tone: str, bold: bool = False) -> None:
    fill, color = TONES[tone]
    cell.fill = _fill(fill)
    cell.font = Font(size=cell.font.size, bold=bold, color=color)

def _block(ws: Worksheet, row: int, c1: int, c2: int, value, font: Font, fill: PatternFill | None = None,
           align: Alignment = CENTER, border: Border | None = None, fmt: str | None = None):
    if c2 > c1:
        ws.merge_cells(start_row=row, start_column=c1, end_row=row, end_column=c2)
    cell = _set(ws, row, c1, value, fmt)
    cell.font, cell.alignment = font, align
    for col in range(c1, c2 + 1):
        part = ws.cell(row=row, column=col)
        if fill:
            part.fill = fill
        if border:
            part.border = border
    return cell

def _section(ws: Worksheet, row: int, c1: int, c2: int, title: str) -> None:
    _block(ws, row, c1, c2, title.upper(), Font(size=11, bold=True, color=NAVY),
           align=Alignment(horizontal="left", vertical="bottom"), border=Border(bottom=_side(NAVY, "medium")))
    ws.row_dimensions[row].height = 24

def _print_setup(ws: Worksheet, landscape: bool) -> None:
    ws.page_setup.orientation = "landscape" if landscape else "portrait"
    ws.page_setup.paperSize = ws.PAPERSIZE_A4
    ws.page_setup.fitToWidth, ws.page_setup.fitToHeight = 1, 0
    ws.sheet_properties.pageSetUpPr = PageSetupProperties(fitToPage=True)

def _labels(**shown) -> DataLabelList:
    flags = dict(showVal=False, showPercent=False, showCatName=False, showSerName=False,
                 showLegendKey=False, showLeaderLines=False)
    return DataLabelList(**(flags | shown))

def _white_bold() -> RichText:
    props = CharacterProperties(b=True, sz=1000, solidFill=WHITE)
    return RichText(p=[Paragraph(pPr=ParagraphProperties(defRPr=props), endParaRPr=props)])

def _chart_data(ws: Worksheet, chart, parts: list[tuple[str, float, str]], row: int, col: int):
    for i, (label, value, _) in enumerate(parts):
        _set(ws, row + i, col, label)
        _set(ws, row + i, col + 1, value)
    last = row + len(parts) - 1
    chart.add_data(Reference(ws, min_col=col + 1, min_row=row, max_row=last))
    chart.set_categories(Reference(ws, min_col=col, min_row=row, max_row=last))
    chart.visible_cells_only = False
    for c in (col, col + 1):
        ws.column_dimensions[get_column_letter(c)].hidden = True
    series = chart.series[0]
    for i, (_, _, color) in enumerate(parts):
        point = DataPoint(idx=i)
        point.graphicalProperties.solidFill = color
        point.graphicalProperties.line.solidFill = WHITE
        series.dPt.append(point)
    return series

def _place(ws: Worksheet, chart, row: int, rows: int) -> None:
    width_px = sum((NARROW if c in GAPS else WIDE) * 7 + 5 for c in range(RIGHT[0], RIGHT[1] + 1))
    chart.width = width_px / PX_PER_CM - 0.1
    chart.height = rows * ROW_H * CM_PER_PT
    ws.add_chart(chart, f"{get_column_letter(RIGHT[0])}{row}")

def parse_date(val):
    if not val:
        return None
    if isinstance(val, (datetime, date)):
        return val
    try:
        if "T" in str(val):
            return datetime.fromisoformat(str(val).replace("Z", "+00:00")).replace(tzinfo=None)
        return datetime.strptime(str(val)[:10], "%Y-%m-%d")
    except Exception:
        return None

def compute_task_state(task, now):
    status = task.get("status")
    due_date = parse_date(task.get("due_date"))
    updated_at = parse_date(task.get("updated_at"))

    if not due_date:
        return NO_DUE
    
    # If completed
    if status == "completed":
        # check if completed on time
        if updated_at:
            # End of due date comparison
            due_end = datetime(due_date.year, due_date.month, due_date.day, 23, 59, 59)
            return ON_TIME if updated_at <= due_end else LATE
        return ON_TIME

    # If pending or in_progress
    due_end = datetime(due_date.year, due_date.month, due_date.day, 23, 59, 59)
    return OVERDUE if due_end < now else NOT_DUE_YET

class UserStats:
    def __init__(self):
        self.total = 0
        self.completed = 0
        self.on_time = 0
        self.late = 0
        self.review = 0       # pending / kutilmoqda
        self.in_work = 0      # in_progress / jarayonda
        self.overdue = 0
        self.cancelled = 0
        self.days = []

    def add(self, task, now):
        self.total += 1
        st = task.get("status")
        state = compute_task_state(task, now)
        created_at = parse_date(task.get("created_at"))
        updated_at = parse_date(task.get("updated_at"))

        if st == "completed":
            self.completed += 1
            if state == LATE:
                self.late += 1
            else:
                self.on_time += 1
            if updated_at and created_at:
                diff = max(0.0, (updated_at - created_at).total_seconds() / 86400)
                self.days.append(diff)
        elif st == "pending":
            self.review += 1
            if state == OVERDUE:
                self.overdue += 1
        elif st == "in_progress":
            self.in_work += 1
            if state == OVERDUE:
                self.overdue += 1

    @property
    def completion(self):
        base = self.total - self.cancelled
        return self.completed / base if base else None

    @property
    def score(self):
        decided = self.completed + self.overdue
        if not decided:
            return None
        on_time = self.completed - self.late
        return round(100 * (on_time + 0.5 * self.late) / decided)

    @property
    def avg_days(self):
        return round(sum(self.days) / len(self.days), 1) if self.days else None

    @property
    def level(self):
        if self.score is None:
            return NOT_RATED if self.total else NO_TASKS
        for threshold, name, _ in LEVELS:
            if self.score >= threshold:
                return name
        return "Past"

GLOSSARY = (
    ("Jarayonda", "Ijrochi ishlayotgan (hali yakunlanmagan) vazifalar. «Muddati o'tgan» — shular ichida."),
    ("Bajarilish %", "Bajarilgan vazifalar ÷ jami vazifalar. Bekor qilinganlar hisobga olinmaydi."),
    ("Muddatida / kechikib", "Vazifa topshirilgan sana belgilangan muddat bilan solishtiriladi. "
                             "Muddatsiz vazifa muddatida deb hisoblanadi."),
    ("Samaradorlik bali", "0–100 ball. Muddatida bajarilgan vazifa — 1, kechikib bajarilgan — 0,5, "
                          "muddati o'tib hali bajarilmagan — 0; o'rtachasi × 100. "
                          "Muddati hali kelmagan vazifalar baholanmaydi."),
    ("Baholanmagan", "Vazifasi bor, lekin hali baholanadigani yo'q: hammasi muddati kelmagan."),
    ("O'rtacha bajarish vaqti", "Vazifa biriktirilgandan to bajarilgungacha o'tgan o'rtacha vaqt, kunlarda."),
)
GLOSSARY_CHARS = 90

def _cards(ws: Worksheet, total: UserStats, users: list) -> None:
    avg = f"{total.avg_days:.1f}".replace(".", ",") if total.avg_days is not None else None
    cards = (
        ("Jami vazifalar", total.total, None, f"xodimlar: {len(users)}", "blue"),
        ("Bajarilgan", total.completed, None, f"muddatida {total.on_time} · kechikib {total.late}", "green"),
        ("Jarayonda", total.in_work + total.review, None, f"shundan muddati o'tgan: {total.overdue}",
         "red" if total.overdue else "amber"),
        ("Bajarilish %", _or_dash(total.completion), PERCENT_FMT,
         f"o'rtacha bajarish: {avg} kun" if avg else "hali bajarilgani yo'q", "purple"),
    )
    for (c1, c2), (label, value, fmt, note, tone) in zip(CARDS, cards):
        fill, color = _fill(TONES[tone][0]), TONES[tone][1]
        _block(ws, 4, c1, c2, label.upper(), Font(size=9, bold=True, color=color), fill,
               border=Border(top=_side(SOLID[tone], "thick")))
        _block(ws, 5, c1, c2, value, Font(size=24, bold=True, color=color), fill, fmt=fmt)
        _block(ws, 6, c1, c2, note, Font(size=9, color=color), fill)

def _status_section(ws: Worksheet, total: UserStats, row: int) -> int:
    (l1, l2), (r1, r2) = LEFT, RIGHT
    _section(ws, row, l1, l2, "Vazifalar holati")
    lines = (
        ("Jami vazifalar", total.total, NAVY, None, False),
        ("Bajarilgan", total.completed, SOLID["green"], None, False),
        ("muddatida", total.on_time, None, None, False),
        ("kechikib", total.late, None, None, False),
        ("Kutilmoqda", total.review, SOLID["amber"], None, False),
        ("Jarayonda", total.in_work, SOLID["blue"], None, False),
        ("shundan muddati o'tgan", total.overdue, None, None, total.overdue > 0),
        ("Bekor qilingan", total.cancelled, SOLID["grey"], None, False),
        ("Bajarilish %", _or_dash(total.completion), SOLID["purple"], PERCENT_FMT, False),
        ("O'rtacha bajarish vaqti", _or_dash(total.avg_days), SOLID["purple"], DAYS_UNIT_FMT, False),
    )
    for i, (label, value, marker, fmt, alert) in enumerate(lines, row + 1):
        sub = marker is None
        color = MUTED if sub else INK
        ws.row_dimensions[i].height = ROW_H
        _block(ws, i, l1, l2 - 1, label, Font(size=10, bold=not sub, color=color),
               align=Alignment(vertical="center", indent=3 if sub else 1), border=UNDERLINE)
        if marker:
            ws.cell(row=i, column=l1).border = Border(left=_side(marker, "thick"), bottom=_side())
        cell = _block(ws, i, l2, l2, value, Font(size=10 if sub else 11, bold=not sub, color=color),
                      border=UNDERLINE, fmt=fmt)
        if alert:
            _tone(cell, "red", bold=True)

    parts = [(name, value, SOLID[tone]) for name, value, tone in (
        ("Bajarilgan", total.completed, "green"),
        ("Kutilmoqda", total.review, "amber"),
        ("Jarayonda", max(0, total.in_work - total.overdue), "blue"),
        ("Muddati o'tgan", total.overdue, "red"),
        ("Bekor qilingan", total.cancelled, "grey"),
    ) if value]

    if parts:
        _section(ws, row, r1, r2, "Holatlar ulushi")
        chart = DoughnutChart(holeSize=55)
        series = _chart_data(ws, chart, parts, row + 1, CHART_DATA_COL)
        series.dLbls = _labels(showPercent=True)
        series.dLbls.txPr = _white_bold()
        chart.legend.position = "r"
        _place(ws, chart, row + 1, len(lines))
    return row + len(lines) + 1

def _levels_section(ws: Worksheet, ranked: list, row: int) -> int:
    (l1, l2), (r1, r2) = LEFT, RIGHT
    _section(ws, row, l1, l2, "Xodimlar darajasi")
    head = row + 1
    ws.row_dimensions[head].height = ROW_H
    header_font, header_fill = Font(size=9, bold=True, color=MUTED), _fill("F2F2F2")
    for c1, c2, title in ((l1, l1 + 1, "Daraja"), (l1 + 2, l2 - 1, "Samaradorlik bali"), (l2, l2, "Xodimlar")):
        _block(ws, head, c1, c2, title, header_font, header_fill, border=UNDERLINE)

    spans = [f"{level[0]}–{LEVELS[i - 1][0] - 1 if i else 100}" for i, level in enumerate(LEVELS)]
    levels = [(name, span) for (_, name, _), span in zip(LEVELS, spans)]
    levels += [(NOT_RATED, NOT_APPLICABLE), (NO_TASKS, NOT_APPLICABLE)]
    for i, (name, span) in enumerate(levels, head + 1):
        ws.row_dimensions[i].height = ROW_H
        fill, color = TONES[LEVEL_TONES[name]]
        _block(ws, i, l1, l1 + 1, name, Font(size=10, bold=True, color=color), _fill(fill),
               align=Alignment(vertical="center", indent=1), border=UNDERLINE)
        _block(ws, i, l1 + 2, l2 - 1, span, Font(size=10, color=MUTED), border=UNDERLINE)
        count = sum(s.level == name for _, s in ranked)
        _block(ws, i, l2, l2, count, Font(size=11, bold=True, color=INK if count else MUTED), border=UNDERLINE)
    end = head + len(levels)

    rated = [(u, s) for u, s in ranked if s.score is not None]
    if rated:
        title = "Samaradorlik bali" + (f" · eng yaxshi {TOP_CHART}" if len(rated) > TOP_CHART else "")
        rated = rated[:TOP_CHART]
        _section(ws, row, r1, r2, title)
        chart = BarChart()
        chart.type, chart.gapWidth, chart.legend = "bar", 60, None
        parts = [(u.get("name", "Xodim"), s.score, SOLID[LEVEL_TONES[s.level]]) for u, s in rated]
        series = _chart_data(ws, chart, parts, head, CHART_DATA_COL + 3)
        series.dLbls = _labels(showVal=True)
        series.dLbls.dLblPos = "outEnd"
        chart.x_axis.scaling.orientation = "maxMin"
        chart.x_axis.delete = False
        chart.y_axis.delete = True
        chart.y_axis.majorGridlines = None
        chart.y_axis.scaling.min, chart.y_axis.scaling.max = 0, 115
        rows = max(len(levels) + 1, math.ceil((1.2 + 0.75 * len(rated)) / (ROW_H * CM_PER_PT)))
        _place(ws, chart, head, rows)
        end = max(end, head + rows - 1)
    return end + 1

def _glossary(ws: Worksheet, row: int) -> None:
    _section(ws, row, LEFT[0], RIGHT[1], "Izoh")
    for i, (term, text) in enumerate(GLOSSARY, row + 1):
        ws.row_dimensions[i].height = max(ROW_H, 14 * math.ceil(len(text) / GLOSSARY_CHARS) + 6)
        _block(ws, i, LEFT[0], LEFT[0] + 1, term, Font(size=10, bold=True, color=NAVY),
               align=Alignment(vertical="center", wrap_text=True), border=UNDERLINE)
        _block(ws, i, LEFT[0] + 2, RIGHT[1], text, BODY_FONT, align=TEXT, border=UNDERLINE)

def _summary_sheet(ws: Worksheet, total: UserStats, ranked: list, users: list, author: dict, now: datetime) -> None:
    ws.title = "Umumiy"
    ws.sheet_view.showGridLines = False
    ws.sheet_properties.tabColor = NAVY
    ws.column_dimensions["A"].width = NARROW
    for col in range(2, RIGHT[1] + 1):
        ws.column_dimensions[get_column_letter(col)].width = NARROW if col in GAPS else WIDE

    banner = _fill(NAVY)
    _block(ws, 1, 2, RIGHT[1], "Xodimlar faoliyati bo'yicha hisobot", Font(size=18, bold=True, color=WHITE),
           banner, Alignment(vertical="center", indent=1))
    who = author.get("name") if author else NOT_APPLICABLE
    _block(ws, 2, 2, RIGHT[1], f"Tuzilgan: {now:%d.%m.%Y %H:%M}      Tuzuvchi: {who}",
           Font(size=10, color="D6DCE5"), banner, Alignment(vertical="top", indent=1))
    for r, height in ((1, 36), (2, 22), (3, 12), (4, 22), (5, 42), (6, 22), (7, 12)):
        ws.row_dimensions[r].height = height

    _cards(ws, total, users)
    row = _status_section(ws, total, 8)
    row = _levels_section(ws, ranked, row + 1)
    _glossary(ws, row + 1)
    _print_setup(ws, landscape=False)

class Column:
    def __init__(self, title, width, fmt=None, text=False):
        self.title = title
        self.width = width
        self.fmt = fmt
        self.text = text

def _row_height(columns: list, values: list) -> float:
    lines = 1
    for column, value in zip(columns, values):
        if column.text and isinstance(value, str) and value:
            per_line = max(1, int(column.width * 1.1))
            lines = max(lines, sum(math.ceil(max(len(part), 1) / per_line) for part in value.split("\n")))
    return min(MAX_ROW_H, max(ROW_H, 13 * lines + 7))

def _data_sheet(ws: Worksheet, columns: list, rows: list, tab_color: str) -> dict:
    ws.sheet_properties.tabColor = tab_color
    header_fill = _fill(NAVY)
    for col, column in enumerate(columns, 1):
        cell = _set(ws, 1, col, column.title)
        cell.font, cell.fill, cell.alignment, cell.border = HEADER_FONT, header_fill, CENTER, GRID
        ws.column_dimensions[get_column_letter(col)].width = column.width
    ws.row_dimensions[1].height = 36
    zebra = _fill(ZEBRA)
    for r, values in enumerate(rows, 2):
        for col, (column, value) in enumerate(zip(columns, values), 1):
            cell = _set(ws, r, col, value, column.fmt)
            cell.font, cell.border = BODY_FONT, GRID
            cell.alignment = TEXT if column.text else CENTER
            if r % 2:
                cell.fill = zebra
        ws.row_dimensions[r].height = _row_height(columns, values)
    ws.freeze_panes = "C2"
    ws.auto_filter.ref = f"A1:{get_column_letter(len(columns))}{len(rows) + 1}"
    ws.print_title_rows = "1:1"
    _print_setup(ws, landscape=True)
    return {column.title: col for col, column in enumerate(columns, 1)}

def _data_bar(ws: Worksheet, col: int, last_row: int, maximum: float, color: str) -> None:
    letter = get_column_letter(col)
    ws.conditional_formatting.add(f"{letter}2:{letter}{last_row}", DataBarRule(
        start_type="num", start_value=0, end_type="num", end_value=maximum, color=color))

def _employees_sheet(ws: Worksheet, ranked: list) -> None:
    columns = [
        Column("O'rin", 6), Column("Xodim", 26, text=True), Column("Lavozim", 20, text=True), Column("Holat", 15),
        Column("Jami vazifa", 9), Column("Bajarilgan", 11), Column("Muddatida", 10), Column("Kechikib", 9),
        Column("Kutilmoqda", 11), Column("Jarayonda", 10), Column("Muddati o'tgan", 10),
        Column("Bekor qilingan", 10), Column("Bajarilish %", 12, PERCENT_FMT),
        Column("O'rtacha bajarish, kun", 11, DAYS_FMT), Column("Samaradorlik bali", 13), Column("Daraja", 14),
    ]
    rows = [
        [i, u.get("name", ""), u.get("position") or (u.get("role") == "admin" and "Administrator" or "Xodim"),
         "faol", s.total, s.completed, s.on_time, s.late, s.review, s.in_work, s.overdue, s.cancelled,
         s.completion, s.avg_days, s.score, s.level]
        for i, (u, s) in enumerate(ranked, 1)
    ]
    col = _data_sheet(ws, columns, rows, SOLID["green"])
    for r, (u, s) in enumerate(ranked, 2):
        if r - 2 < len(MEDALS) and s.score is not None:
            medal = ws.cell(row=r, column=col["O'rin"])
            medal.fill, medal.font = _fill(MEDALS[r - 2]), Font(size=10, bold=True, color=INK)
        ws.cell(row=r, column=col["Xodim"]).font = Font(size=10, bold=True, color=INK)
        ws.cell(row=r, column=col["Holat"]).font = Font(size=10, color=TONES["green"][1])
        _tone(ws.cell(row=r, column=col["Daraja"]), LEVEL_TONES[s.level], bold=True)
        if s.overdue:
            _tone(ws.cell(row=r, column=col["Muddati o'tgan"]), "red", bold=True)
        if s.late:
            _tone(ws.cell(row=r, column=col["Kechikib"]), "amber")
    if ranked:
        last = len(ranked) + 1
        _data_bar(ws, col["Bajarilish %"], last, 1, SOLID["green"])
        _data_bar(ws, col["Samaradorlik bali"], last, 100, SOLID["blue"])

def _tasks_sheet(ws: Worksheet, tasks: list, author: dict, now: datetime) -> None:
    columns = [
        Column("ID", 6), Column("Vazifa", 32, text=True), Column("Tavsif", 40, text=True),
        Column("Ijrochi", 22, text=True), Column("Lavozim", 18, text=True), Column("Bergan", 20, text=True),
        Column("Holat", 15), Column("Berilgan", 16), Column("Muddat", 12, DATE_FMT),
        Column("Bajarilgan", 16), Column("Muddatga rioya", 16),
    ]
    ordered = sorted(tasks, key=lambda t: (t.get("assignee_name") or "").lower())
    rows = []
    states = []
    author_name = author.get("name", "Administrator") if author else "Administrator"

    for t in ordered:
        state = compute_task_state(t, now)
        states.append(state)
        created_at = parse_date(t.get("created_at"))
        due_date = parse_date(t.get("due_date"))
        updated_at = parse_date(t.get("updated_at"))
        completed_val = updated_at if t.get("status") == "completed" else None
        status_label = STATUS_LABELS.get(t.get("status"), t.get("status"))

        rows.append([
            t.get("id"),
            t.get("title", ""),
            t.get("description") or "",
            t.get("assignee_name") or NOT_APPLICABLE,
            "Xodim",
            author_name,
            status_label,
            created_at,
            due_date,
            completed_val,
            state,
        ])

    col = _data_sheet(ws, columns, rows, SOLID["blue"])
    for r, (t, state) in enumerate(zip(ordered, states), 2):
        ws.cell(row=r, column=col["Vazifa"]).font = Font(size=10, bold=True, color=INK)
        status_label = STATUS_LABELS.get(t.get("status"), t.get("status"))
        if status_label in STATUS_TONES:
            _tone(ws.cell(row=r, column=col["Holat"]), STATUS_TONES[status_label], bold=True)
        deadline = ws.cell(row=r, column=col["Muddatga rioya"])
        if state in DEADLINE_TONES:
            _tone(deadline, DEADLINE_TONES[state], bold=(state == OVERDUE))
        else:
            deadline.font = Font(size=10, italic=True, color=MUTED)

def generate_report(data: dict, output_path: str):
    now = datetime.now()
    author = data.get("author", {})
    users = data.get("users", [])
    tasks = data.get("tasks", [])

    # Calculate statistics
    total = UserStats()
    by_user = {u["id"]: UserStats() for u in users}

    for t in tasks:
        total.add(t, now)
        aid = t.get("assigned_to")
        if aid in by_user:
            by_user[aid].add(t, now)

    ranked = sorted(
        ((u, by_user[u["id"]]) for u in users),
        key=lambda p: (p[1].score is None, -(p[1].score or 0), -p[1].completed, p[0].get("name", "").lower()),
    )

    wb = Workbook()
    _summary_sheet(wb.active, total, ranked, users, author, now)
    _employees_sheet(wb.create_sheet("Xodimlar"), ranked)
    _tasks_sheet(wb.create_sheet("Vazifalar"), tasks, author, now)

    wb.save(output_path)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python report_generator.py <input_json_path> <output_xlsx_path>")
        sys.exit(1)

    input_json = sys.argv[1]
    output_xlsx = sys.argv[2]

    with open(input_json, "r", encoding="utf-8") as f:
        data = json.load(f)

    generate_report(data, output_xlsx)
    print(f"SUCCESS: {output_xlsx}")
