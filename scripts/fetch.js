// scripts/fetch.js
// Fetch DLTC result pages and try to extract embedded JSON (Next.js __NEXT_DATA__).
// First run is "debug": it stores a summary so we can see the structure,
// then we tighten it into a proper matches parser.

const fs = require("fs");
const path = require("path");

const OUT_PATH = path.join(__dirname, "..", "data", "results.json");

// Put your DLTC result URLs here:
const SOURCES = [
  "https://www.dltcdirectory.net/result/6908e46ec0192a8ab45480f5/693ffbaa4b2dded509dcc64e",
];

// polite-ish headers
const FETCH_OPTS = {
  headers: {
    "user-agent":
      "Mozilla/5.0 (compatible; TennisResultsBot/1.0; +https://github.com/)",
    accept: "text/html,application/xhtml+xml",
  },
};

function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function extractNextData(html) {
  // Next.js often embeds a JSON blob like:
  // <script id="__NEXT_DATA__" type="application/json">{...}</script>
  const m = html.match(
    /<script[^>]*id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s
  );
  if (!m) return null;
  return safeJsonParse(m[1]);
}

function summarize(obj, maxKeys = 80) {
  if (!obj || typeof obj !== "object") return obj;
  const out = {};
  const keys = Object.keys(obj).slice(0, maxKeys);
  for (const k of keys) {
    const v = obj[k];
    out[k] =
      v && typeof v === "object"
        ? Array.isArray(v)
          ? `[array len=${v.length}]`
          : `{object keys=${Object.keys(v).slice(0, 12).join(", ")}${
              Object.keys(v).length > 12 ? ", …" : ""
            }}`
        : v;
  }
  if (Object.keys(obj).length > maxKeys) out.__truncated__ = true;
  return out;
}

async function main() {
  // Load existing file (so your site never breaks if something changes)
  let data = { lastUpdated: null, sources: [], matches: [] };
  if (fs.existsSync(OUT_PATH)) {
    const raw = fs.readFileSync(OUT_PATH, "utf8");
    const parsed = safeJsonParse(raw);
    if (parsed) data = parsed;
  }

  const debug = [];
  for (const url of SOURCES) {
    try {
      const res = await fetch(url, FETCH_OPTS);
      const html = await res.text();

      const nextData = extractNextData(html);

      debug.push({
        url,
        httpStatus: res.status,
        hasNextData: !!nextData,
        nextDataTopLevel: nextData ? summarize(nextData) : null,
        // Helpful if not Next.js or if the script tag is absent:
        htmlHints: {
          length: html.length,
          hasNextDataTag: html.includes("__NEXT_DATA__"),
          hasNuxt: html.includes("__NUXT__"),
          title: (html.match(/<title>(.*?)<\/title>/i) || [])[1] || null,
        },
      });
    } catch (e) {
      debug.push({ url, error: String(e) });
    }
  }

  data.lastUpdated = new Date().toISOString();
  data.sources = SOURCES;
  data.debug = debug;

  // Leave matches alone for now; we’ll fill it once we see the structure.
  if (!Array.isArray(data.matches)) data.matches = [];

  fs.writeFileSync(OUT_PATH, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log("Wrote", OUT_PATH);
}

main();
