# 2026 NFL Rankings

Personal fantasy football rankings app for the QB/RB/WR/TE rankings CSV snapshot dated June 14, 2026.

## Local Use

```sh
npm install
npm run build:data
python3 -m http.server 4173
```

Open `http://localhost:4173`.

## GitHub Pages

Live URL:

```text
https://biscocho-droid.github.io/codex-apps/best-ball-rankings/
```

Open that URL on your phone and add it to your home screen.

## Updating Rankings

Replace `data/BEST_BALL-rankings.csv` with a new export, then run:

```sh
npm run build:data
```

Commit the updated CSV and `data/rankings-data.js`.
