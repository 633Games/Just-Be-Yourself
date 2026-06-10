# The Rent is Due (Y2K Edition)

A Nokia-style browser game about working shifts, paying rent, and surviving the Y2K economy.

## Run locally

Serve the folder (required — game data is loaded from JSON via `fetch`, which does not work when opening `index.html` directly as `file://`):

```bash
python3 -m http.server 8000
```

Then visit [http://localhost:8000](http://localhost:8000).

## Project structure

```
the-rent-is-due/
├── index.html
├── data/
│   ├── jobs.json   # Job pay, bonuses, CV requirements (editable)
│   └── skills.json # Skill names and award descriptions (editable)
├── css/
│   └── styles.css
└── js/
    ├── data.js     # Loads JSON and lookup helpers
    ├── state.js    # Game state
    ├── ui.js       # HUD, views, toasts
    ├── messages.js # Messages app and notifications
    ├── jobs.js     # Job search, interviews, CV
    ├── work.js     # Work shifts
    ├── casino.js   # Scratch cards and blackjack
    └── main.js     # Entry point
```

## Stack

- HTML, CSS, and JavaScript
- [Tailwind CSS](https://tailwindcss.com/) (CDN)
- [Silkscreen](https://fonts.google.com/specimen/Silkscreen) font (Google Fonts)
