# The Rent is Due (Y2K Edition)

A Nokia-style browser game about working shifts, paying rent, and surviving the Y2K economy.

## Run locally

Open `index.html` in your browser, or serve the folder:

```bash
python3 -m http.server 8000
```

Then visit [http://localhost:8000](http://localhost:8000).

## Project structure

```
the-rent-is-due/
├── index.html
├── css/
│   └── styles.css
└── js/
    ├── state.js    # Game state and data
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
