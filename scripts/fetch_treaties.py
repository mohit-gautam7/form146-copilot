"""Download official treaty texts and cut out the articles the copilot may cite.

Run: python scripts/fetch_treaties.py   (needs pymupdf)
Writes data/treaties.json. Re-run when a treaty is amended; diff the output.
"""
import json, re, sys, urllib.request, datetime
from html.parser import HTMLParser

import pymupdf

CBDT = "https://wm.incometaxindia.gov.in/w/{}-comprehensive-agreements-1"
SOURCES = {
    "US": ("pdf", "https://www.irs.gov/pub/irs-trty/india.pdf", "India-USA DTAA (IRS official text)"),
    "UK": ("pdf", "https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/736294/1993_India_-_UK_Double_Taxation_Agreement__as_amended_in_2013_-_in_force.pdf", "India-UK DTAA as amended 2013 (GOV.UK)"),
    "SG": ("html", CBDT.format("singapore"), "India-Singapore DTAA (CBDT)"),
    "DE": ("html", CBDT.format("germany"), "India-Germany DTAA (CBDT)"),
    "NL": ("html", CBDT.format("netherlands"), "India-Netherlands DTAA (CBDT)"),
}
# (country, article id, title, start regex, end regex). UK numbers royalties as Article 13.
CUTS = [
    ("US", "12", "Royalties and fees for included services", r"ARTICLE 12\s*\n?\s*Royalties", r"ARTICLE 13"),
    ("UK", "13", "Royalties and fees for technical services", r"ARTICLE 13\s*\n?\s*Royalties", r"ARTICLE 14"),
    ("SG", "12", "Royalties and fees for technical services", r"ARTICLE 12\s*\n?\s*ROYALTIES", r"ARTICLE 13"),
    ("DE", "12", "Royalties and fees for technical services", r"ARTICLE 12\s*\n?\s*ROYALTIES", r"ARTICLE 13"),
    ("NL", "12", "Royalties and fees for technical services", r"ARTICLE 12\s*\n?\s*ROYALTIES", r"ARTICLE 13"),
    ("NL", "Protocol IV", "Protocol, Ad Articles 10, 11 and 12 (MFN clause)", r"IV\. Ad Articles 10, 11 and 12", r"V\. Ad Article 12"),
]


class Text(HTMLParser):
    def __init__(self):
        super().__init__()
        self.out, self.skip = [], 0

    def handle_starttag(self, tag, attrs):
        self.skip += tag in ("script", "style")
        if tag in ("p", "br", "div", "li", "tr", "h1", "h2", "h3", "h4"):
            self.out.append("\n")

    def handle_endtag(self, tag):
        self.skip -= tag in ("script", "style")

    def handle_data(self, data):
        if not self.skip:
            self.out.append(data)


def fetch(kind, url):
    raw = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=60).read()
    if kind == "pdf":
        return "".join(p.get_text() for p in pymupdf.open(stream=raw, filetype="pdf"))
    p = Text()
    p.feed(raw.decode("utf-8", "ignore"))
    return "".join(p.out)


def main():
    texts = {c: fetch(k, u) for c, (k, u, _) in SOURCES.items()}
    articles = []
    for country, art, title, start, end in CUTS:
        t = texts[country]
        # skip table-of-contents hits: take the first match followed by a real body
        for m in re.finditer(start, t):
            e = re.search(end, t[m.end():])
            body = t[m.start(): m.end() + e.start()] if e else ""
            if len(body) > (300 if "Protocol" in art else 1500):
                break
        else:
            sys.exit(f"could not cut {country} {art}")
        articles.append({
            "id": f"{country}-{art}", "country": country, "article": art, "title": title,
            "text": re.sub(r"\s+", " ", body).strip(),
            "source": SOURCES[country][2], "source_url": SOURCES[country][1],
        })
    out = {"fetched_on": datetime.date.today().isoformat(), "articles": articles}
    json.dump(out, open("data/treaties.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    for a in articles:
        print(a["id"], len(a["text"]))


if __name__ == "__main__":
    main()
