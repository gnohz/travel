"""Build the downloadable, font-embedded guide from the website's exact JSON data."""
import json
from pathlib import Path
from xml.sax.saxutils import escape
from urllib.parse import quote
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, PageBreak
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab import rl_config

rl_config.invariant = 1

ROOT = Path(__file__).resolve().parents[1]
data = json.loads((ROOT / 'src/data/travel.json').read_text())
places = {p['id']: p for p in data['places']}
font = ROOT / 'scripts/fonts/NotoSansSC-Regular.ttf'
if not font.exists():
    raise SystemExit('Missing bundled Chinese font: scripts/fonts/NotoSansSC-Regular.ttf')
pdfmetrics.registerFont(TTFont('NotoSC', str(font)))
styles = {
    'title': ParagraphStyle('title', fontName='NotoSC', fontSize=25, leading=36, textColor=HexColor('#a44c34'), spaceAfter=16),
    'h1': ParagraphStyle('h1', fontName='NotoSC', fontSize=19, leading=29, textColor=HexColor('#a44c34'), spaceBefore=12, spaceAfter=12, keepWithNext=True),
    'h2': ParagraphStyle('h2', fontName='NotoSC', fontSize=14, leading=23, textColor=HexColor('#3c4b37'), spaceBefore=12, spaceAfter=7, keepWithNext=True),
    'option': ParagraphStyle('option', fontName='NotoSC', fontSize=12, leading=21, textColor=HexColor('#a44c34'), spaceBefore=9, spaceAfter=5, keepWithNext=True),
    'body': ParagraphStyle('body', fontName='NotoSC', fontSize=11, leading=19, textColor=HexColor('#353b31'), spaceAfter=6, wordWrap='CJK'),
    'small': ParagraphStyle('small', fontName='NotoSC', fontSize=9, leading=15, textColor=HexColor('#626a5a'), spaceAfter=6, wordWrap='CJK'),
}
story = []
def para(text, style='body'):
    story.append(Paragraph(escape(str(text)), styles[style]))
def link(label, url):
    story.append(Paragraph(f'<link href="{escape(url, {chr(34): "&quot;"})}" color="#a44c34">{escape(label)}</link>', styles['small']))
def address(place):
    if place.get('address'): return place['address']
    c = place.get('coordinates')
    return f"{c['latitude']}, {c['longitude']}" if c else ''
def location(place):
    target = places.get(place.get('navigationId'), place)
    para('车辆目的地：' + target['name'], 'small')
    if address(target): para(address(target), 'small')
    if target.get('parkingNotes'): para('停车：' + target['parkingNotes'], 'small')
    if target['id'] in ['vespa', 'wildflower', 'blue-mcdonalds', 'hideaway', 'civic-parking', 'sugar-bowl']:
        query = quote(address(target), safe='')
        link('Apple Maps 导航到 ' + target['name'], f'https://maps.apple.com/?daddr={query}&dirflg=d')
        link('Google Maps 导航到 ' + target['name'], f'https://www.google.com/maps/dir/?api=1&destination={query}&travelmode=driving')
def newpage(): story.append(PageBreak())
def chapter(text, label, key):
    heading = Paragraph(escape(text), styles['h1'])
    heading.toc_entry = (label, key)
    story.append(heading)

class GuideDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'toc_entry'):
            label, key = flowable.toc_entry
            self.canv.bookmarkPage(key)
            self.canv.addOutlineEntry(label, key, level=0, closed=False)
            self.notify('TOCEntry', (0, label, self.page, key))

def activity_details(activity, seen_places):
    para(activity['description'])
    if activity.get('condition'): para('此项仅适用于首选 Soldier Pass 方案。', 'small')
    if activity.get('duration'): para('预留：' + activity['duration'], 'small')
    place_id = activity.get('placeId')
    if place_id:
        if place_id not in seen_places:
            location(places[place_id])
            seen_places.add(place_id)
    for note in activity['notes']: para('注意：' + note, 'small')

para('SEDONA 2026', 'title')
para('感恩节红岩之旅', 'h1')
para(data['dates'])
para(data['party'])
para('目录 | TABLE OF CONTENTS', 'h2')
toc = TableOfContents()
toc.levelStyles = [ParagraphStyle('toc', fontName='NotoSC', fontSize=11, leading=19, leftIndent=0, firstLineIndent=0, rightIndent=22, spaceBefore=6, textColor=HexColor('#353b31'))]
toc.dotsMinLevel = 0
story.append(toc)
para('点击目录跳转；首选与备选只选其一。行程更新：' + data['updatedAt'] + '。', 'small')
for index, day in enumerate(data['days']):
    newpage()
    para(f"DAY {index+1} | {day['date'][5:].replace('-', '/')} {day['weekday']}", 'small')
    chapter(day['title'], f"Day {index+1} · {day['date'][5:].replace('-', '/')} · {day['title']}", f'day-{index+1}')
    para(day['subtitle'])
    para('未标为已确认的内容为计划；备选只选其一。', 'small')
    seen_places = set()
    emitted_groups = set()
    for a in day['activities']:
        zone = 'California' if a.get('timeZone') == 'America/Los_Angeles' else 'Arizona'
        group = a.get('optionGroup')
        if group:
            if group in emitted_groups: continue
            emitted_groups.add(group)
            group_title = '午餐（二选一）' if group.startswith('lunch') else '徒步方案（二选一）'
            para(f"{a.get('timeLabel', a['time'])} {zone} | {group_title}", 'h2')
            options = [option for option in day['activities'] if option.get('optionGroup') == group]
            for option in sorted(options, key=lambda item: item['option']):
                label = '首选' if option['option'] == 'A' else '备选'
                name = places[option['placeId']]['name'] if option.get('placeId') else option['title']
                para(f'{label}：{name}', 'option')
                activity_details(option, seen_places)
            continue
        suffix = ' [用户已确认]' if a['status'] == 'confirmed' else ''
        para(f"{a.get('timeLabel', a['time'])} {zone} | {a['title']}{suffix}", 'h2')
        activity_details(a, seen_places)
newpage()
chapter('航班、住宿与租车', '航班、住宿与租车', 'bookings')
para('Arizona 活动使用当地时间；California 出发和抵达项单独标明。本次旅行 Arizona 比 California 快 1 小时。', 'small')
for f in data['flights']:
    para(f"{f['label']} | Southwest {f['number']}", 'h2')
    para(f"{f['from']} {f['departure']} → {f['to']} {f['arrival']}")
    para(f['notes'], 'small')
for s in data['stays']:
    p=places[s['placeId']]
    para(p['name'], 'h2'); para(address(p))
    para(f"入住 {s['checkIn']} | 退房 {s['checkOut']} | {s['nights']} 晚")
    if s.get('url'): link('住宿房源链接', s['url'])
para(data['rental']['company'] + ' | ' + data['rental']['vehicle'], 'h2')
for n in data['rental']['details']: para(n)
location(places['rental'])
newpage()
chapter('徒步、停车与接驳', '徒步、停车与接驳', 'trails')
for p in data['places']:
    if not p.get('trail'): continue
    t=p['trail']
    para(p['name'] + ' | ' + p.get('chineseName', ''), 'h2')
    para(f"{t['distance']} | {t['duration']} | 爬升 {t['elevation']} | {t['difficulty']}")
    para(t['route'])
    location(p)
    target=places.get(p.get('navigationId'), p)
    for n in target.get('notes', []): para(n, 'small')
    if t.get('shuttle'): para(t['shuttle'])
    for n in p['notes']: para('注意：' + n, 'small')
    if p.get('officialUrl'): link('官方路线资料', p['officialUrl'])
newpage()
chapter('餐厅、购物与重要地点', '餐厅、购物与重要地点', 'places')
for p in data['places']:
    if p['category'] in ['hiking','parking','hotel']: continue
    para(p['name'] + ' | ' + p.get('chineseName', ''), 'h2')
    para(p['description']); location(p)
    if p.get('openingHours'): para(p['openingHours'], 'small')
    for n in p['notes']: para(n, 'small')
    if p.get('officialUrl'): link('官方资料', p['officialUrl'])
newpage()
chapter('采购清单与出发前核实', '采购清单与出发前核实', 'checklist')
para('到 Sedona 后采购', 'h2')
for n in data['shopping']: para('□ ' + n)
para('出发前逐项核实', 'h2')
for n in data['checklist']: para('□ ' + n)
para('信息可靠性说明', 'h2')
for n in data['verification']: para(n, 'small')
for s in data['sources']: link(s['title'], s['url'])

def page_footer(canvas, doc):
    canvas.setStrokeColor(HexColor('#deded5')); canvas.line(24, 33, 396, 33)
    canvas.setFont('NotoSC', 8); canvas.setFillColor(HexColor('#717469'))
    canvas.drawString(24, 20, 'SEDONA 2026 | 中文离线指南')
    canvas.drawRightString(396, 20, str(doc.page))

out = ROOT / 'public/sedona-2026-guide.pdf'
doc = GuideDocTemplate(str(out), pagesize=(420, 680), topMargin=28, bottomMargin=48, leftMargin=24, rightMargin=24, title=data['title'], author='Sedona 2026 Family Guide')
doc.multiBuild(story, onFirstPage=page_footer, onLaterPages=page_footer)
print(f'PDF generated: {out.name} ({out.stat().st_size // 1024} KB)')
