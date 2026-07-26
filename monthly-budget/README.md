# Big Boys Budget

A static personal finance dashboard built with plain HTML, CSS, and JavaScript.

## Files

- `index.html` - app shell and page structure
- `styles.css` - visual design and responsive layout
- `app.js` - budget data, charts, planner behavior, and browser-saved edits

## Local Preview

From this folder, run:

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:8765/
```

## GitHub Pages Deploy

1. Create a new GitHub repository.
2. Upload or push these files to the repository root.
3. In GitHub, open `Settings` > `Pages`.
4. Set `Source` to `Deploy from a branch`.
5. Choose the `main` branch and `/root`.
6. Save. GitHub will publish the site after the Pages build completes.

## Data Notes

The app is static. It does not connect to a backend or database.

Edits made inside the app are saved in the browser with `localStorage`, so they are specific to the device and browser being used.

## Themes

The dashboard includes five browser-saved visual themes:

- Calm Money (default)
- Midnight
- Editorial
- Ocean Glass
- Plum & Gold

Changing the theme does not change or reset budget data.
