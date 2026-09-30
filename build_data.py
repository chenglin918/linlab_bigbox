"""
build_data.py — reads directly from the chart cached data embedded in the
Excel workbook, so whatever the Excel charts display is what gets exported.
Cells are NOT read; only the chart series caches are used.

Run:  python build_data.py
"""
import json, zipfile, xml.etree.ElementTree as ET
from collections import OrderedDict

EXCEL = 'results/NS-CS-FT1/Website_Result compilation_thawing.xlsx'
C     = 'http://schemas.openxmlformats.org/drawingml/2006/chart'

# ── Display names (order = column order of the JSON rows) ────────────────────
TEMP_NAMES = [
    'Bottom right (1300 mm)', 'Bottom left (1300 mm)',
    'Subgrade 1st lift (1100 mm)', 'Subgrade 3rd lift (800 mm)',
    'Base middle (150 mm)', 'Top front', 'Top back', 'Ambient',
    'DFOS 400 mm', 'DFOS base middle',
]
TEMP_CHART_NAMES = [
    'Bottom_right', 'Bottom_left', 'Subgrade_1st lift', 'Subgrade_3rd lift',
    'Base_middle', 'Top_front', 'Top_back', 'Ambient',
    'DFOS_400mm', 'DFOS_base middle',
]

FH_NAMES = [
    'LVDT 1 \u2013 Back Right', 'LVDT 2 \u2013 Front Right',
    'LVDT 3 \u2013 Front Left',  'LVDT 4 \u2013 Back Left',
]
FH_CHART_NAMES = ['LVDT_1', 'LVDT_2', 'LVDT_3', 'LVDT_4']

# Known event-marker day values → descriptive labels
# Add new entries here as the experiment progresses.
MARKER_LABELS = {
    3.75:   'Freezing 150 mm',
    6.667:  'Freezing 300 mm (base layer)',
    11.667: 'Freezing 400 mm',
    32.5:   'Freezing 800 mm',
    43.0:   'Fully frozen',
    60.0:   'Begin thawing',
    63.0:   'Thawing 150 mm',
    66.0:   'Thawing 300 mm (base)',
}

# Chronological sort order for profile snapshots (oldest first).
# Unknown labels are appended in their original chart order.
TP_ORDER = [
    'Start of freezing', 'Freezing base layer', '300 hrs',
    'Fully frozen', 'Thawing 2 days', 'Thawing 5 days', 'Thawing 9 days',
]
WC_ORDER = [
    'Start', '24 hrs', 'Freezing base layer', '780 hrs',
    'Fully frozen', 'Thawing 2 days', 'Thawing 5 days', 'Thawing 9 days',
]

# ── Helpers ──────────────────────────────────────────────────────────────────
def load_chart(z, num):
    return ET.fromstring(z.read(f'xl/charts/chart{num}.xml'))

def series_name(ser):
    tx = ser.find(f'{{{C}}}tx')
    if tx is None: return None
    v = tx.find(f'.//{{{C}}}v')
    return v.text if v is not None else None

def get_cached(ser, which):
    """Return list[float|None] from the series' numCache, length = ptCount."""
    elem = ser.find(f'{{{C}}}{which}')
    if elem is None: return []
    cache = elem.find(f'.//{{{C}}}numCache')
    if cache is None: return []
    cnt_el = cache.find(f'{{{C}}}ptCount')
    n = int(cnt_el.get('val')) if cnt_el is not None else 0
    out = [None] * n
    for pt in cache.findall(f'{{{C}}}pt'):
        idx = int(pt.get('idx', 0))
        v = pt.find(f'{{{C}}}v')
        if v is not None and v.text:
            try: out[idx] = round(float(v.text), 4)
            except: pass
    return out

def x_pt_count(ser):
    xv = ser.find(f'{{{C}}}xVal')
    return len(xv.findall(f'.//{{{C}}}pt')) if xv is not None else 0

def best_series(all_sers, chart_names):
    """For each chart name pick the series with the most cached x-points."""
    result = []
    for cname in chart_names:
        cands = [s for s in all_sers if series_name(s) == cname]
        if cands:
            result.append(max(cands, key=x_pt_count))
        else:
            result.append(None)
            print(f'  WARNING: series "{cname}" not found')
    return result

def best_positioning(all_sers):
    cands = [s for s in all_sers if series_name(s) == 'Positioning']
    return max(cands, key=x_pt_count) if cands else None

def build_rows(series_list):
    """Combine to [[day, y0, y1, ...], ...], skipping None x-values."""
    x_days  = get_cached(series_list[0], 'xVal')
    channels = [get_cached(s, 'yVal') if s is not None else [] for s in series_list]
    rows = []
    for i, day in enumerate(x_days):
        if day is None: continue
        row = [day] + [ch[i] if i < len(ch) else None for ch in channels]
        rows.append(row)
    return rows

def sort_snaps(snaps, order):
    """Sort snapshot list by predefined order; unknowns append at the end."""
    def key(s):
        try: return order.index(s['l'])
        except: return len(order)
    return sorted(snaps, key=key)

# ── Extraction ───────────────────────────────────────────────────────────────
with zipfile.ZipFile(EXCEL) as z:

    # Temperature time series (chart3) ────────────────────────────────────────
    sers3      = load_chart(z, 3).findall(f'.//{{{C}}}ser')
    temp_sers  = best_series(sers3, TEMP_CHART_NAMES)
    temp_pos   = best_positioning(sers3)
    temp_rows  = build_rows(temp_sers)

    # Frost Heave time series (chart6) ────────────────────────────────────────
    sers6    = load_chart(z, 6).findall(f'.//{{{C}}}ser')
    fh_sers  = best_series(sers6, FH_CHART_NAMES)
    fh_pos   = best_positioning(sers6)
    fh_rows  = build_rows(fh_sers)

    # Temperature Profile (chart4) ────────────────────────────────────────────
    sers4  = load_chart(z, 4).findall(f'.//{{{C}}}ser')
    tp_pos = [int(v) for v in get_cached(sers4[0], 'yVal') if v is not None]
    tp_snaps = sort_snaps(
        [{'l': series_name(s), 't': get_cached(s, 'xVal')} for s in sers4],
        TP_ORDER,
    )

    # Water Content Profile (chart2) – de-duplicate by last occurrence ─────────
    sers2   = load_chart(z, 2).findall(f'.//{{{C}}}ser')
    seen_wc = OrderedDict()
    for s in sers2:
        seen_wc[series_name(s)] = s          # last occurrence wins
    first_wc = list(seen_wc.values())[0]
    wc_pos   = [int(v) for v in get_cached(first_wc, 'yVal') if v is not None]
    wc_snaps = sort_snaps(
        [{'l': name, 'v': get_cached(s, 'xVal')} for name, s in seen_wc.items()],
        WC_ORDER,
    )

    # Event markers from Positioning series ───────────────────────────────────
    pos_x       = get_cached(temp_pos, 'xVal')
    marker_days = sorted(set(round(d, 3) for d in pos_x if d is not None))

    pos_y  = get_cached(temp_pos, 'yVal')
    t_ymin = min(v for v in pos_y if v is not None)
    t_ymax = max(v for v in pos_y if v is not None)

    fh_py  = get_cached(fh_pos, 'yVal')
    fh_ymin = min(v for v in fh_py if v is not None)
    fh_ymax = max(v for v in fh_py if v is not None)

    markers = [
        {'day': d, 'label': MARKER_LABELS.get(d, f'Day {d:.3f}')}
        for d in marker_days
    ]

# ── Write JSON ────────────────────────────────────────────────────────────────
out = {
    'markers':      markers,
    'markerYRange': {
        'temperature': [t_ymin, t_ymax],
        'frostHeave':  [fh_ymin, fh_ymax],
    },
    'temperature':  {'names': TEMP_NAMES, 'rows': temp_rows},
    'frostHeave':   {'names': FH_NAMES,   'rows': fh_rows},
    'tempProfile':  {'pos': tp_pos,  'snapshots': tp_snaps},
    'waterContent': {'pos': wc_pos,  'snapshots': wc_snaps},
}

with open('results/NS-CS-FT1/results_data.json', 'w') as f:
    json.dump(out, f, separators=(',', ':'))

print('results/NS-CS-FT1/results_data.json written from chart cache.')
print(f'  Temperature  : {len(temp_rows)} rows  (day 0 \u2013 {temp_rows[-1][0]:.2f})')
print(f'  Frost Heave  : {len(fh_rows)} rows  (day 0 \u2013 {fh_rows[-1][0]:.2f})')
print(f'  Temp Profile : {len(tp_snaps)} snapshots  pos={tp_pos}')
print(f'  Water Content: {len(wc_snaps)} snapshots  pos={wc_pos}')
print(f'  Markers ({len(markers)}): {[m["day"] for m in markers]}')
