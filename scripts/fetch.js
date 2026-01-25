// scripts/fetch.js
// Minimal updater: updates data/results.json with a timestamp.
// No dependencies required.

const fs = require("fs");
const path = require("path");

const OUT_PATH = path.join(__dirname, "..", "data", "results.json");

function main() {
  let data = { lastUpdated: null, sources: [], matches: [] };

  if (fs.existsSync(OUT_PATH)) {
    const raw = fs.readFileSync(OUT_PATH, "utf8");
    try {
      data = JSON.parse(raw);
    } catch (e) {
      // If JSON is invalid, keep defaults but don't crash
      data = { lastUpdated: null, sources: [], matches: [] };
    }
  }

  data.lastUpdated = new Date().toISOString();

  fs.writeFileSync(OUT_PATH, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log("Updated:", OUT_PATH, "->", data.lastUpdated);
}

main();
