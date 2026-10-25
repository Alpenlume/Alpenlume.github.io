#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""The day an app is on the App Store its "Coming to the App Store" pill becomes Apple's official badge.

Every pill that waits for the store carries the app's App Store id (data-asc). This asks Apple's public lookup
which of them are on sale and swaps those, in every language page. Run every six hours by .github/workflows/store-badges.yml;
the site generator (Landing/Alpen) does the same at every build. Nothing else on a page is touched.

    python3 tools/store_badges.py            swap what is on sale now
    STORE_FORCE_LIVE=6818439179 python3 tools/store_badges.py     pretend that id is on sale (for a test on a copy)

(c) 2026 Alpenlume. All rights reserved.
"""
import json
import os
import pathlib
import re
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
LANGS = ("en", "de", "pl", "fr", "it", "es", "ru", "el", "ja", "zh")
ALT = {
    "en": "Download on the App Store",
    "de": "Laden im App Store",
    "pl": "Pobierz z App Store",
    "fr": "Télécharger dans l’App Store",
    "it": "Scarica su App Store",
    "es": "Descargar en App Store",
    "ru": "Загрузите в App Store",
    "el": "Λήψη από το App Store",
    "ja": "App Storeからダウンロード",
    "zh": "在 App Store 下载"
}
COUNTRIES = ("us", "ch", "de", "gb", "pl")
PILL = re.compile(r'<span class="(?:sbtn|btn) soon" data-asc="(\d+)">.*?</span>', re.S)
FORCED = set(filter(None, os.environ.get("STORE_FORCE_LIVE", "").split(",")))
_cache = {}


def on_sale(app_id):
    if app_id in FORCED:
        return True
    if app_id not in _cache:
        _cache[app_id] = False
        for country in COUNTRIES:
            try:
                with urllib.request.urlopen(f"https://itunes.apple.com/lookup?id={app_id}&country={country}", timeout=20) as r:
                    if json.load(r).get("resultCount"):
                        _cache[app_id] = True
                        break
            except Exception:
                continue
    return _cache[app_id]


def main():
    swapped = {}
    for page in sorted(ROOT.rglob("*.html")):
        rel = page.relative_to(ROOT).parts
        if rel[0] in ("tools", "legal", "dc", "img", "fonts"):
            continue
        lang = rel[0] if len(rel) > 1 and rel[0] in LANGS else "en"
        prefix = "../" if len(rel) > 1 else ""
        text = page.read_text(encoding="utf-8")

        def swap(m):
            app_id = m.group(1)
            if not app_id or not on_sale(app_id):
                return m.group(0)
            swapped[app_id] = swapped.get(app_id, 0) + 1
            return (f'<a class="badge" href="https://apps.apple.com/app/id{app_id}" target="_blank" rel="noopener">'
                    f'<img src="{prefix}dc/media/badges/{lang}.svg" alt="{ALT[lang]}" width="156" height="52"></a>')

        fresh = PILL.sub(swap, text)
        if fresh != text:
            page.write_text(fresh, encoding="utf-8")
    for app_id, n in swapped.items():
        print(f"id{app_id}: {n} buttons now show the App Store badge")
    if not swapped:
        print("nothing new on the App Store")


if __name__ == "__main__":
    main()
