# Just Be Yourself

A browser style game documenting the difficulties and the honesties of getting a job the modern world. Navigate tricky situations to fill your CV with experiance and become the ultimate millionare.

## For developers & AI agents

**Start every task by reading [`CODEMAP.md`](CODEMAP.md)** — module map, where to add code, script order, state fields, and hook points.

Cursor loads `.cursor/rules/read-codemap-first.mdc` so new sessions are directed there automatically.

## Run locally

```bash
python3 -m http.server 8000
# http://localhost:8000
```

## Project structure (summary)

See **`CODEMAP.md`** for the full file-by-file reference. Brief layout:

```
the-rent-is-due/
├── CODEMAP.md          # ← read this first
├── index.html
├── data/               # JSON + ASCII (jobs, skills, events, trophies, cinder, replies)
├── css/styles.css
└── js/
    ├── utils.js, ascii.js, data.js, state.js   # shared / load
    ├── ui.js, messages.js, trophies.js         # shell & apps
    ├── jobs.js, skills.js, stats.js, events.js
    ├── work-pizza.js, work-burger.js, work-core.js
    ├── casino.js, cinder.js, boot.js, main.js
    └── debug.js, vipjobs.js
```
