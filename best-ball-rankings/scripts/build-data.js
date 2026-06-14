const fs = require("fs");
const https = require("https");
const path = require("path");

const sourceCsv = path.join(__dirname, "..", "data", "BEST_BALL-rankings.csv");
const outFile = path.join(__dirname, "..", "data", "rankings-data.js");

function parseCsv(text) {
  const rows = [];
  let field = "";
  let row = [];
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      if (row.some(value => value.length)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/['.]/g, "")
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, response => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`Request failed ${response.statusCode}: ${url}`));
          response.resume();
          return;
        }

        let body = "";
        response.setEncoding("utf8");
        response.on("data", chunk => {
          body += chunk;
        });
        response.on("end", () => resolve(JSON.parse(body)));
      })
      .on("error", reject);
  });
}

async function main() {
  const csv = fs.readFileSync(sourceCsv, "utf8");
  const [headers, ...records] = parseCsv(csv);
  const headerIndex = Object.fromEntries(headers.map((name, index) => [name, index]));
  let sleeperPlayers = {};

  try {
    sleeperPlayers = await getJson("https://api.sleeper.app/v1/players/nfl");
  } catch (error) {
    console.warn(`Could not fetch Sleeper players. Continuing without photos. ${error.message}`);
  }

  const sleeperByName = new Map();
  for (const player of Object.values(sleeperPlayers)) {
    if (!player || !player.full_name || !player.position) continue;
    const key = `${normalizeName(player.full_name)}|${player.position}`;
    if (!sleeperByName.has(key)) sleeperByName.set(key, player);
  }

  const players = records
    .map(record => {
      const name = record[headerIndex.Name];
      const position = record[headerIndex.Position];
      const match = sleeperByName.get(`${normalizeName(name)}|${position}`);

      return {
        id: record[headerIndex.id],
        name,
        team: record[headerIndex.Team],
        position,
        expertRank: Number(record[headerIndex["Expert Rank"]]),
        photoUrl: match?.player_id ? `https://sleepercdn.com/content/nfl/players/${match.player_id}.jpg` : ""
      };
    })
    .sort((a, b) => a.expertRank - b.expertRank || a.name.localeCompare(b.name));

  const payload = {
    title: "2026 Best Ball RB/WR Rankings",
    sourceDate: "2026-06-14",
    generatedAt: new Date().toISOString(),
    players
  };

  fs.writeFileSync(outFile, `window.RANKINGS_DATA = ${JSON.stringify(payload, null, 2)};\n`);
  console.log(`Wrote ${players.length} players to ${outFile}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
