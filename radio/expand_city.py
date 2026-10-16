import re, sys

base = "/mnt/c/Users/Montgomery/.claude/projects/C--mc/ad5290be-24f1-4efe-b437-421eda182cbd/scratchpad/globo-de-radio"

city_prefix = sys.argv[1]   # e.g. '{city:"Nova York", country:"Estados Unidos", lat:40.7, lon:-74.0, stations:['
stations_file = sys.argv[2]

with open(base + "/index.html", "r", encoding="utf-8") as f:
    html = f.read()

with open(base + "/" + stations_file, "r", encoding="utf-8") as f:
    lines = [l.strip() for l in f if l.strip()]

stations_js = []
for line in lines:
    title, sid = line.rsplit(":", 1)
    title = title.strip().replace("\\", "\\\\").replace('"', '\\"')
    sid = sid.strip()
    stations_js.append('{title:"%s", id:"%s"}' % (title, sid))

stations_block = ",".join(stations_js)

idx = html.find(city_prefix)
if idx == -1:
    print("PREFIX NOT FOUND:", city_prefix)
    sys.exit(1)

start = idx + len(city_prefix)
end = html.find("]}", start)
if end == -1:
    print("CLOSING NOT FOUND")
    sys.exit(1)

new_html = html[:start] + stations_block + html[end:]
with open(base + "/index.html", "w", encoding="utf-8") as f:
    f.write(new_html)
print("OK, replaced. Station count:", len(stations_js))
