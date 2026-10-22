#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Simplifica o GeoJSON dos estados do Brasil (Douglas-Peucker, sem dependências)
pra um arquivo bem mais leve, só com o que o globo precisa pra desenhar as
divisas: nome, sigla e os anéis de coordenadas [lon, lat] já reduzidos.

Uso: python3 simplify_states_geojson.py entrada.geojson saida.json [tolerancia_graus]
"""
import json
import sys


def perp_distance(pt, a, b):
    (x, y), (ax, ay), (bx, by) = pt, a, b
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return ((x - ax) ** 2 + (y - ay) ** 2) ** 0.5
    t = ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)
    t = max(0, min(1, t))
    px, py = ax + t * dx, ay + t * dy
    return ((x - px) ** 2 + (y - py) ** 2) ** 0.5


def douglas_peucker(points, tolerance):
    if len(points) < 3:
        return points
    dmax, idx = 0, 0
    for i in range(1, len(points) - 1):
        d = perp_distance(points[i], points[0], points[-1])
        if d > dmax:
            dmax, idx = d, i
    if dmax > tolerance:
        left = douglas_peucker(points[: idx + 1], tolerance)
        right = douglas_peucker(points[idx:], tolerance)
        return left[:-1] + right
    return [points[0], points[-1]]


def simplify_ring(ring, tolerance):
    pts = [tuple(p[:2]) for p in ring]
    out = douglas_peucker(pts, tolerance)
    if out[0] != out[-1]:
        out.append(out[0])
    return [[round(x, 3), round(y, 3)] for x, y in out]


def simplify_geom(geom, tolerance):
    if geom["type"] == "Polygon":
        return {"type": "Polygon", "coordinates": [simplify_ring(r, tolerance) for r in geom["coordinates"]]}
    if geom["type"] == "MultiPolygon":
        return {
            "type": "MultiPolygon",
            "coordinates": [[simplify_ring(r, tolerance) for r in poly] for poly in geom["coordinates"]],
        }
    raise ValueError("geometry type not supported: " + geom["type"])


def main():
    src, dst = sys.argv[1], sys.argv[2]
    tolerance = float(sys.argv[3]) if len(sys.argv) > 3 else 0.03

    with open(src, "r", encoding="utf-8") as f:
        data = json.load(f)

    out_features = []
    before_pts = 0
    after_pts = 0
    for feat in data["features"]:
        props = feat["properties"]
        geom = feat["geometry"]
        before_pts += sum(
            len(r) for poly in (geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]])
            for r in poly
        )
        simplified = simplify_geom(geom, tolerance)
        after_pts += sum(
            len(r) for poly in (simplified["coordinates"] if simplified["type"] == "MultiPolygon" else [simplified["coordinates"]])
            for r in poly
        )
        out_features.append({
            "type": "Feature",
            "properties": {"name": props.get("name"), "sigla": props.get("sigla")},
            "geometry": simplified,
        })

    out = {"type": "FeatureCollection", "features": out_features}
    with open(dst, "w", encoding="utf-8") as f:
        json.dump(out, f, separators=(",", ":"), ensure_ascii=False)

    print(f"pontos: {before_pts} -> {after_pts} ({100*after_pts/before_pts:.1f}%)")
    import os
    print(f"tamanho: {os.path.getsize(dst)/1024:.1f} KB")


if __name__ == "__main__":
    main()
