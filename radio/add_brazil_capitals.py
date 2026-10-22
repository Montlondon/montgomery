#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Busca rádios das 26 capitais estaduais + Distrito Federal via radio-browser.info
e injeta cada uma como uma nova entrada no array PLACES do index.html,
no mesmo formato já usado pelas cidades existentes (São Paulo, Lima, etc.).

Uso:
    python3 add_brazil_capitals.py            # roda tudo e aplica no index.html
    python3 add_brazil_capitals.py --dry-run  # só mostra quantas rádios achou por capital
"""
import json
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.request

INDEX_PATH = "index.html"
API_BASE = "https://de1.api.radio-browser.info/json/stations/search"
MAX_PER_CAPITAL = 45
MIN_BEFORE_FALLBACK = 15

# (capital, estado por extenso, lat, lon)
CAPITALS = [
    ("Rio Branco", "Acre", -9.97, -67.81),
    ("Maceió", "Alagoas", -9.65, -35.70),
    ("Macapá", "Amapá", 0.03, -51.05),
    ("Manaus", "Amazonas", -3.10, -60.02),
    ("Salvador", "Bahia", -12.97, -38.51),
    ("Fortaleza", "Ceará", -3.72, -38.54),
    ("Brasília", "Distrito Federal", -15.78, -47.93),
    ("Vitória", "Espírito Santo", -20.32, -40.34),
    ("Goiânia", "Goiás", -16.68, -49.25),
    ("São Luís", "Maranhão", -2.53, -44.30),
    ("Cuiabá", "Mato Grosso", -15.60, -56.10),
    ("Campo Grande", "Mato Grosso do Sul", -20.46, -54.62),
    ("Belo Horizonte", "Minas Gerais", -19.92, -43.94),
    ("Belém", "Pará", -1.46, -48.50),
    ("João Pessoa", "Paraíba", -7.12, -34.86),
    ("Curitiba", "Paraná", -25.43, -49.27),
    ("Recife", "Pernambuco", -8.05, -34.90),
    ("Teresina", "Piauí", -5.09, -42.80),
    ("Rio de Janeiro", "Rio de Janeiro", -22.91, -43.17),
    ("Natal", "Rio Grande do Norte", -5.79, -35.21),
    ("Porto Alegre", "Rio Grande do Sul", -30.03, -51.23),
    ("Porto Velho", "Rondônia", -8.76, -63.90),
    ("Boa Vista", "Roraima", 2.82, -60.67),
    ("Florianópolis", "Santa Catarina", -27.60, -48.55),
    ("Aracaju", "Sergipe", -10.95, -37.07),
    ("Palmas", "Tocantins", -10.18, -48.33),
]


def strip_accents(s):
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def api_search(**params):
    params.setdefault("hidebroken", "true")
    params.setdefault("order", "clickcount")
    params.setdefault("reverse", "true")
    params.setdefault("limit", "100")
    url = API_BASE + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": "MontgomeryRadio/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return json.loads(r.read().decode("utf-8"))
    except Exception as e:
        print("  ! erro buscando", params, "->", e, file=sys.stderr)
        return []


def fetch_for_capital(capital, estado):
    seen = {}
    # 1) tenta pelo nome da cidade no campo "state" (muita rádio cadastra assim)
    for q in {capital, strip_accents(capital)}:
        for st in api_search(country="Brazil", state=q):
            seen[st["stationuuid"]] = st
    # 2) completa com o nome do estado por extenso, se ainda faltar volume
    if len(seen) < MIN_BEFORE_FALLBACK:
        for q in {estado, strip_accents(estado)}:
            for st in api_search(country="Brazil", state=q):
                seen[st["stationuuid"]] = st
    # 3) último recurso: nome da cidade no nome da rádio
    if len(seen) < MIN_BEFORE_FALLBACK:
        for st in api_search(country="Brazil", name=capital):
            seen[st["stationuuid"]] = st
    stations = sorted(seen.values(), key=lambda s: -(s.get("clickcount") or 0))
    return stations[:MAX_PER_CAPITAL]


def js_escape(s):
    return s.replace("\\", "\\\\").replace('"', '\\"').replace("\n", " ").strip()


def to_station_obj(st):
    title = js_escape(st["name"]) or "Rádio"
    url = st.get("url_resolved") or st.get("url") or ""
    sid = st["stationuuid"]
    return '{title:"%s", id:"%s", url:"%s"}' % (title, sid, js_escape(url))


def build_place_js(capital, estado, lat, lon, stations):
    stations_js = ",".join(to_station_obj(s) for s in stations)
    return '{city:"%s", country:"%s, Brasil", lat:%s, lon:%s, stations:[%s]}' % (
        capital, estado, lat, lon, stations_js
    )


def main():
    dry_run = "--dry-run" in sys.argv

    with open(INDEX_PATH, "r", encoding="utf-8") as f:
        html = f.read()

    # não duplica cidade que já exista no PLACES
    existing_cities = set(re.findall(r'\{city:"([^"]+)"', html))

    new_entries = []
    total = 0
    for capital, estado, lat, lon in CAPITALS:
        if capital in existing_cities:
            print(f"- {capital}: já existe no app, pulando")
            continue
        stations = fetch_for_capital(capital, estado)
        total += len(stations)
        print(f"- {capital} ({estado}): {len(stations)} rádios")
        if not dry_run and stations:
            new_entries.append(build_place_js(capital, estado, lat, lon, stations))
        time.sleep(0.3)  # gentil com a API pública

    print(f"\nTotal de rádios novas: {total}")

    if dry_run:
        print("(dry-run: nada foi escrito no index.html)")
        return

    if not new_entries:
        print("Nada para adicionar.")
        return

    marker = "\nconst PLACES = ["
    idx = html.find(marker)
    if idx == -1:
        print("PLACES array não encontrado!", file=sys.stderr)
        sys.exit(1)
    insert_at = idx + len(marker)
    insertion = "\n  " + ",\n  ".join(new_entries) + ","
    new_html = html[:insert_at] + insertion + html[insert_at:]

    with open(INDEX_PATH, "w", encoding="utf-8") as f:
        f.write(new_html)
    print(f"OK: {len(new_entries)} capitais adicionadas ao PLACES em {INDEX_PATH}")


if __name__ == "__main__":
    main()
