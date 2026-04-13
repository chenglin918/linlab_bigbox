"""
build_data.py  –  Run this script whenever you update the Excel file.
It reads Website_Result compilation_thawing.xlsx and writes results_data.json,
which the website loads automatically at runtime.

Usage:
    python build_data.py
"""
import json, openpyxl

EXCEL = 'results/Website_Result compilation_thawing.xlsx'

def r(v, n=4):
    return round(v, n) if isinstance(v, (int, float)) else None

wb = openpyxl.load_workbook(EXCEL, data_only=True)

# ── Temperature time series ─────────────────────────────────────────────────
# Sheet: Temprature  |  col C=days, cols D-M = 10 TC channels
ws = wb['Temprature']
temp_rows = []
for row in ws.iter_rows(min_row=6, values_only=True):
    day = row[2]          # col C
    if not isinstance(day, (int, float)): continue
    vals = [r(row[i]) for i in range(3, 13)]   # cols D-M
    temp_rows.append([r(day)] + vals)

# ── Frost Heave time series ────────────────────────────────────────────────
# Sheet: Frost heave  |  col G=days, cols H-K = LVDT 1-4
ws = wb['Frost heave']
fh_rows = []
for row in ws.iter_rows(min_row=6, values_only=True):
    day = row[6]          # col G
    if not isinstance(day, (int, float)): continue
    vals = [r(row[i]) for i in range(7, 11)]   # cols H-K
    fh_rows.append([r(day)] + vals)

# ── Temperature Profile (Temp_profile_DFOS) ────────────────────────────────
# Positions: row 7, cols F-K  →  [-1000, -900, -500, -100, 150, 300]
# Snapshots: rows 12,14,16,18,23  →  cols F-K
ws = wb['Temp_profile_DFOS']
tp_pos   = [-1000, -900, -500, -100, 150, 300]
tp_snaps = []
snap_rows = {12: 'Start of freezing', 14: 'Freezing base layer',
             16: '300 hrs', 18: 'Fully frozen', 23: 'Thawing 2 days'}
for i, row in enumerate(ws.iter_rows(values_only=True), 1):
    if i in snap_rows:
        temps = [r(row[j]) for j in range(5, 11)]  # cols F-K
        tp_snaps.append({'l': snap_rows[i], 't': temps})

# ── Water Content Profile (VMC_profile) ───────────────────────────────────
# Positions: row 7, cols F-K  →  [-900, -500, -100, 75, 150, 275]
# Snapshots: rows 11-17
ws = wb['VMC_profile']
wc_pos   = [-900, -500, -100, 75, 150, 275]
wc_snaps = []
wc_snap_rows = {11: 'Start', 12: '24 hrs', 13: 'Freezing base layer',
                15: '780 hrs', 16: 'Fully frozen', 17: 'Thawing 2 days'}
for i, row in enumerate(ws.iter_rows(values_only=True), 1):
    if i in wc_snap_rows:
        vals = [r(row[j]) for j in range(5, 11)]  # cols F-K
        wc_snaps.append({'l': wc_snap_rows[i], 'v': vals})

# ── Write JSON ─────────────────────────────────────────────────────────────
out = {
    'temperature':  {'rows': temp_rows},
    'frostHeave':   {'rows': fh_rows},
    'tempProfile':  {'pos': tp_pos, 'snapshots': tp_snaps},
    'waterContent': {'pos': wc_pos, 'snapshots': wc_snaps},
}

with open('results_data.json', 'w') as f:
    json.dump(out, f, separators=(',', ':'))

print('results_data.json written.')
print(f'  Temperature : {len(temp_rows)} rows')
print(f'  Frost Heave : {len(fh_rows)} rows')
print(f'  Temp Profile: {len(tp_snaps)} snapshots at positions {tp_pos}')
print(f'  Water Content:{len(wc_snaps)} snapshots at positions {wc_pos}')
