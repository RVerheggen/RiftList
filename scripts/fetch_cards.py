#!/usr/bin/env python3
"""Build cards.json and cards.csv from Riot's official Riftbound card gallery.

The gallery is a Next.js page that ships its entire card list inside the HTML,
in a <script id="__NEXT_DATA__"> tag. No API key, no browser, no scraping of
rendered DOM - just fetch the page and read the JSON out of it.

Standard library only.  Usage:  python fetch_cards.py
"""

import csv, html, io, json, os, re, sys, urllib.request

GALLERY = "https://playriftbound.com/en-us/card-gallery/"
UA = "riftbound-card-data/1.0 (+https://github.com/)"
ROOT = os.path.dirname(os.path.abspath(__file__))

SYMBOLS = {
    ":rb_might:": "{might}",
    ":rb_exhaust:": "{exhaust}",
    ":rb_rune_rainbow:": "{power:any}",
    ":rb_rune_fury:": "{power:fury}",
    ":rb_rune_calm:": "{power:calm}",
    ":rb_rune_mind:": "{power:mind}",
    ":rb_rune_body:": "{power:body}",
    ":rb_rune_chaos:": "{power:chaos}",
    ":rb_rune_order:": "{power:order}",
}


def fetch_next_data(url=GALLERY):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=90) as r:
        page = r.read().decode("utf-8", "replace")
    m = re.search(
        r'<script id="__NEXT_DATA__" type="application/json"[^>]*>(.*?)</script>',
        page, re.S)
    if not m:
        raise SystemExit("__NEXT_DATA__ not found - the gallery's markup changed.")
    return json.loads(m.group(1))


def find_cards(node, depth=0):
    """Walk the page props and return the first list that looks like cards."""
    if depth > 12:
        return None
    if isinstance(node, list):
        if node and isinstance(node[0], dict) and "publicCode" in node[0]:
            return node
        for v in node:
            got = find_cards(v, depth + 1)
            if got:
                return got
    elif isinstance(node, dict):
        for v in node.values():
            got = find_cards(v, depth + 1)
            if got:
                return got
    return None


def val(d, *path):
    for p in path:
        if not isinstance(d, dict):
            return None
        d = d.get(p)
    return d


def to_text(body):
    if not body:
        return ""
    t = re.sub(r"<br\s*/?>", "\n", body)
    t = re.sub(r"</p>\s*<p>", "\n", t)
    t = re.sub(r"</?[a-zA-Z][^>]*>", "", t)
    t = html.unescape(t)
    for k, v in SYMBOLS.items():
        t = t.replace(k, v)
    t = re.sub(r":rb_energy_(\d+):", lambda m: "{energy:%s}" % m.group(1), t)
    return "\n".join(l.strip() for l in t.split("\n") if l.strip())


def flatten(c):
    code = c.get("publicCode") or ""
    head = code.split("/")[0]
    suffix = head.split("-", 1)[1] if "-" in head else ""
    signed = "*" in code
    alt = bool(re.match(r"^\d+[a-z]$", suffix))
    body = val(c, "text", "richText", "body") or ""
    name = c.get("name") or ""
    subtitle = c.get("subtitle") or ""
    full_name = ", ".join(part for part in (name, subtitle) if part)
    return {
        "id": c.get("id"),
        "code": head.replace("*", ""),
        "publicCode": code,
        "set": val(c, "set", "value", "id"),
        "setName": val(c, "set", "value", "label"),
        "collectorNumber": c.get("collectorNumber"),
        "name": full_name,
        "type": " / ".join(t["label"] for t in (val(c, "cardType", "type") or [])),
        "rarity": val(c, "rarity", "value", "label"),
        "domains": [d["label"] for d in (val(c, "domain", "values") or [])],
        "energy": val(c, "energy", "value", "label"),
        "might": val(c, "might", "value", "label"),
        "power": val(c, "power", "value", "label"),
        "illustrator": ", ".join(
            a["label"] for a in (val(c, "illustrator", "values") or []) if a.get("label")),
        "orientation": c.get("orientation"),
        "isAltArt": alt,
        "isSigned": signed,
        "isVariant": alt or signed,
        "text": to_text(body),
        "textHtml": body,
        "imageUrl": val(c, "cardImage", "url") or "",
    }


CSV_COLS = ["code", "publicCode", "set", "setName", "collectorNumber", "name",
            "type", "rarity", "domains", "energy", "might", "power",
            "illustrator", "isAltArt", "isSigned", "isVariant", "text",
            "imageUrl"]


def main():
    print("fetching", GALLERY)
    data = fetch_next_data()
    raw = find_cards(data.get("props", data))
    if not raw:
        raise SystemExit("card list not found inside __NEXT_DATA__.")
    print("cards found:", len(raw))

    cards = sorted((flatten(c) for c in raw),
                   key=lambda c: (c["set"] or "", c["collectorNumber"] or 0, c["publicCode"]))

    with io.open(os.path.join(ROOT, "cards.json"), "w", encoding="utf-8") as f:
        json.dump(cards, f, indent=2, ensure_ascii=False)

    with io.open(os.path.join(ROOT, "cards.csv"), "w", encoding="utf-8-sig",
                 newline="") as f:
        w = csv.DictWriter(f, fieldnames=CSV_COLS, extrasaction="ignore")
        w.writeheader()
        for c in cards:
            row = dict(c)
            row["domains"] = "|".join(c["domains"])
            w.writerow(row)

    sets = {}
    for c in cards:
        sets[c["set"]] = sets.get(c["set"], 0) + 1
    print("wrote cards.json and cards.csv")
    print("by set:", sets)
    print("variants:", sum(1 for c in cards if c["isVariant"]))


if __name__ == "__main__":
    main()
