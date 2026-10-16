import re

base = "/mnt/c/Users/Montgomery/.claude/projects/C--mc/ad5290be-24f1-4efe-b437-421eda182cbd/scratchpad/globo-de-radio"

with open(base + "/index.html", "r", encoding="utf-8") as f:
    html = f.read()

with open(base + "/london_stations.txt", "r", encoding="utf-8") as f:
    lines = [l.strip() for l in f if l.strip()]

stations_js = []
for line in lines:
    title, sid = line.rsplit(":", 1)
    title = title.strip().replace("\\", "\\\\").replace('"', '\\"')
    sid = sid.strip()
    stations_js.append('{title:"%s", id:"%s"}' % (title, sid))

stations_block = ",".join(stations_js)

pattern = re.compile(
    r'(\{city:"Londres", country:"Reino Unido", lat:51\.5, lon:-0\.12, stations:\[)(.*?)(\]\})',
    re.DOTALL
)

m = pattern.search(html)
if not m:
    print("PATTERN NOT FOUND")
else:
    new_html = html[:m.start()] + m.group(1) + stations_block + m.group(3) + html[m.end():]
    with open(base + "/index.html", "w", encoding="utf-8") as f:
        f.write(new_html)
    print("OK, replaced. Station count:", len(stations_js))
