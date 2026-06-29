# Code map — where things live

> **Agents:** This file is mandatory reading at the start of every task.  
> Enforced by [`.cursor/rules/read-codemap-first.mdc`](.cursor/rules/read-codemap-first.mdc) (`alwaysApply: true`).

Static browser game. No build step. Global functions via `<script>` tags (order matters).  
Serve with `python3 -m http.server 8000`.

---

## Quick routing — “I need to add/fix X, where does it go?”

| You are working on… | Put it in… |
|---------------------|------------|
| Generic helper (money, HTML escape, shuffle, templates) | [`js/utils.js`](js/utils.js) |
| SFX synthesis, `adjustCash`, money gain/loss sounds | [`js/sfx.js`](js/sfx.js) |
| ASCII load / trim / fit / animated art HTML | [`js/ascii.js`](js/ascii.js) |
| Load JSON or `.txt`, job/skill/Cinder lookups | [`js/data.js`](js/data.js) |
| New global state field or date/rent helpers | [`js/state.js`](js/state.js) |
| New phone app screen, HUD, day tick, view switch | [`js/ui.js`](js/ui.js) + [`index.html`](index.html) view div |
| Messages, contacts, rent pay, app unlocks, boss chat | [`js/messages.js`](js/messages.js) |
| CV skills unlock rules & conditions | [`js/skills.js`](js/skills.js) |
| Job list, interview quiz, CV equip UI | [`js/jobs.js`](js/jobs.js) |
| Shift lifecycle, timing bar, trader keys, executive taps | [`js/work-core.js`](js/work-core.js) |
| Pizza shift art + tip taps | [`js/work-pizza.js`](js/work-pizza.js) |
| Burger shift art + flip bar | [`js/work-burger.js`](js/work-burger.js) |
| Scratch / blackjack | [`js/casino.js`](js/casino.js) |
| Random events (Steve, Mom, scam) | [`js/events.js`](js/events.js) + [`data/events.json`](data/events.json) |
| Happiness & lifetime stats screen | [`js/stats.js`](js/stats.js) |
| Cinder swipe / matches / crash / VIP unlock | [`js/cinder.js`](js/cinder.js) |
| Trophy definitions | [`data/trophies.json`](data/trophies.json) |
| Trophy unlock logic & trophy UI | [`js/trophies.js`](js/trophies.js) |
| Boot splash animation | [`js/boot.js`](js/boot.js) |
| Phone scale, install gate, first boot | [`js/main.js`](js/main.js) |
| VIP jobs stub screen | [`js/vipjobs.js`](js/vipjobs.js) |
| Debug633 menu | [`js/debug.js`](js/debug.js) |
| LCD / layout CSS | [`css/styles.css`](css/styles.css) |
| New job / skill / event / reply **content** | [`data/*.json`](data/) |
| New ASCII art asset | [`data/ascii/`](data/ascii/) |

**Do not** put new features in `state.achievements` — that array is **CV skills only**.  
Use `state.trophyIds` for trophies.

---

## Script load order

Later files may call earlier ones. Do not reorder without checking dependencies.

```
utils.js → sfx.js → ascii.js → data.js → state.js → skills.js → events.js → stats.js
→ debug.js → ui.js → messages.js → trophies.js → jobs.js → vipjobs.js
→ work-pizza.js → work-burger.js → work-core.js → casino.js → cinder.js
→ boot.js → main.js
```

New shared module → insert **after** `utils.js` / `ascii.js`, **before** consumers.  
New work minigame → new `work-*.js` loaded **before** `work-core.js`.

---

## `state` object ([`js/state.js`](js/state.js))

| Field | Purpose |
|-------|---------|
| `cash`, `gameDateMs`, `rentWeek`, `rentPaidThisWeek` | Economy & calendar |
| `shiftsCompleted` | Main progress counter (events, unlocks) |
| `currentJobTitle`, `baseWagePerSec`, `isUnemployed`, `firedFromJob` | Employment |
| `isShiftActive`, `shiftEarned`, `shiftTimeElapsed`, … | Active shift |
| `achievements` | **CV skill IDs owned** (not trophies) |
| `equippedCV`, `maxCVSlots` | CV loadout |
| `unlockedApps` | Home-screen app gates |
| `trophyIds` | Unlocked trophy IDs |
| `messages`, `messagesUnread`, `activeThread` | Messaging |
| `cinder` | Dating deck, matches, crash flags |
| `eventHistory`, `activeEvents`, `eventStats` | Random events |
| `historyStats`, `happiness`, `skillProgress` | Stats & skill unlock progress |
| `interview`, `scratch`, `bj` | Transient minigame state |

Rent formula: `getWeeklyRent()` in `state.js`.

---

## JS modules (functions by file)

### [`js/utils.js`](js/utils.js) — cross-cutting helpers

| Function | Use for |
|----------|---------|
| `escapeHtml` | Any user text in HTML |
| `formatMoney` | Display dollars |
| `shuffleArray` | Random order |
| `getOwnedSkillIds` | All CV skills player owns |
| `computeJobMatch(reqs, 'equipped' \| 'owned')` | Job match % |
| `getShiftPerformanceTier` / `getShiftMoodLabel` | Shift quality |
| `openUnlockedApp(key, renderFn, viewId, lockedMsg?)` | App open guard |
| `fillTemplate(str, vars)` | `{name}`, `${amount}` strings |
| `renderDebugButtonList` | Debug menu lists |

### [`js/sfx.js`](js/sfx.js) — synthesized audio & cash changes

| Function | Use for |
|----------|---------|
| `initSfx` | Unlock `AudioContext` on first user gesture |
| `adjustCash(delta, opts?)` | Change `state.cash`, update HUD, play gain/loss SFX |
| `playMoneyGain` / `playMoneyLoss` | Cash change cascades with HUD floaters |
| `playWompWomp` | One-shot loss sting (e.g. scratch all-lose) |
| `playCardFlipDun` / `playScratchRip` | Casino table SFX |
| `scheduleMoneyGainCascade` / `getMoneyGainDingDuration` | Ding timing; floater duration synced to cascade gaps |
| `playAchievementDing` | CV skill or trophy unlock |

### [`js/ascii.js`](js/ascii.js) — ASCII art pipeline

| Function | Use for |
|----------|---------|
| `normalizeAsciiText` | Load `.txt` consistently |
| `buildAsciiArtHtml` | Animated shift art spans |
| `fitAsciiToContainer` / `scheduleAsciiFit` | Scale art to box |
| `cellMatchesRegionRange` | Region masks for animation |

### [`js/data.js`](js/data.js) — loading & lookups

| Function | Use for |
|----------|---------|
| `loadGameData` | Fetch all JSON + ASCII on boot |
| `fetchData` | Cache-busted fetch |
| `getJobByTitle` / `getJobById` / `getSearchableJobs` | Jobs |
| `getSkill` / `getSkillName` / `hasSkill` / `unlockSkill` | Skills |
| `getCinderProfileById` / `generateCinderBio` / `unlockCinderContact` | Cinder |
| `getEquippedSkillIds` | CV equipped skills |

Loaded globals: `SKILLS_DB`, `JOB_DB`, `EVENTS_DB`, `CINDER_DB`, `TROPHIES_DB`, `*_ASCII`.

### [`js/ui.js`](js/ui.js) — shell

| Function | Use for |
|----------|---------|
| `updateHUD` | Top-bar cash & date |
| `onCashGainDing` / `beginCashGainFxBurst` | `+$$$` fly-in per coin ding (called from `playMoneyGain`) |
| `onCashLossDing` / `beginCashLossFxBurst` | `-$$$` fall per loss ding (called from `playMoneyLoss`) |
| `showToast` | Scrolling alerts in the top ticker strip (`#toast-container`) |
| `advanceDay` | End of shift day tick, rent week, events |
| `switchView(viewId)` | Show one app screen |
| `openCasino` | Casino entry |

### [`js/messages.js`](js/messages.js) — comms & unlocks

| Function | Use for |
|----------|---------|
| `addMessage` | Inject thread message |
| `updateAppMenu` | Show/hide home apps |
| `unlockWorkApp` / `unlockCVApp` / `unlockCinderApp` | App gates |
| `checkIntroUnlock` | Work app after Mom read |
| `payWeeklyRent` | Rent payment |
| `sendPlayerReply` / `getContactReply` | Keyword replies |
| `firePlayer` / `sendBossShiftFeedback` | Employment consequences |
| `notifySkillUnlocked` / `notifyJobHired` | System messages |

**App bundle unlock** (shift 2): `unlockCVApp()` → cv, jobs, casino, stats, **trophies**.

### [`js/work-core.js`](js/work-core.js) — shift engine

| Area | Key functions |
|------|----------------|
| Profiles | `SHIFT_PROFILES`, `getShiftProfile` |
| Lifecycle | `startShift`, `endShift`, `processShiftTick`, `finishShiftSummary` |
| UI | `updateShiftBriefing`, `updateShiftHUD`, `showShiftSummary` |
| Scene | `renderJobScene` (calls pizza/burger mounts) |
| Bonuses | `awardBonus`, `resetCombo`, `getComboMultiplier` |
| Spawn tap | `scheduleSpawnTap`, `spawnTapTask`, `spawnTapTaskGeneric` |
| Timing bar | `initTimingBar`, `handleTimingHit`, `cleanupTimingBar` |
| Key match | `initKeyMatch`, `handleKeyMatch`, `cleanupKeyMatch` |
| Executive | `scheduleExecutiveEvent`, `spawnExecutiveEvent` |
| Fired path | `begForJobBack` |

### [`js/work-pizza.js`](js/work-pizza.js) / [`js/work-burger.js`](js/work-burger.js)

Job-specific ASCII art, animations, and minigame spawns.  
New job with custom art → copy this split pattern; wire from `renderJobScene` in `work-core.js`.

### [`js/jobs.js`](js/jobs.js) — career

| Function | Use for |
|----------|---------|
| `calculateMatch` | Equipped CV vs job reqs |
| `generateJobs` / `renderJobSearcher` | Job board |
| `startInterview` / `endInterview` | Quiz flow |
| `renderCV` / `toggleCV` | CV screen |

### [`js/skills.js`](js/skills.js) — skill unlock rules

| Function | Use for |
|----------|---------|
| `tryUnlockSkill` | Grant skill + notify |
| `checkCasinoSkillUnlocks` | Blackjack skills |
| `checkBossReplySkillUnlocks` | Swear / thanks skills |
| `checkEventSkillUnlocks` | Event choice skills |
| `checkGenerositySkillUnlock` | Money given total |
| `checkInterviewSkillUnlocks` | 10 interviews skill |

### [`js/events.js`](js/events.js) — random events

| Function | Use for |
|----------|---------|
| `tryRollRandomEvents` | Called from `advanceDay` |
| `triggerEvent` / `resolveEventChoice` | Start & resolve |
| `processEventDeadlines` | Escalation / expiry |
| `renderEventActions` | Buttons in message thread |

### [`js/casino.js`](js/casino.js)

`initScratch`, `buyScratch`, `revealScratch` · `initBlackjack`, `setBjWager`, `leaveBlackjack`, `startBjDeal`, `endBj`, `checkCasinoSkillUnlocks` hook.  
Blackjack wager moves to the table on +/- / custom / max (`setBjWager`); bet settles in `endBj` (win: payout; lose: already on table; push: refund).

### [`js/cinder.js`](js/cinder.js)

Deck refill, swipe, matches, face fit, crash easter egg, `unlockVipJobsApp`.

### [`js/trophies.js`](js/trophies.js)

| Function | Use for |
|----------|---------|
| `tryUnlockTrophy(id)` | Award trophy (parent check) |
| `checkTrophyMilestones` | Count-based trophies |
| `tryUnlockJobTierTrophy(title)` | Per-job hire trophies |
| `renderTrophiesView` / `openTrophies` | UI |

**Adding a trophy:** entry in `data/trophies.json` + `tryUnlockTrophy(...)` at the right hook.

### [`js/stats.js`](js/stats.js)

`record*` functions (call from gameplay), `renderStats`, `openStats`.

### [`js/boot.js`](js/boot.js) · [`js/main.js`](js/main.js)

Boot splash · phone scaling, install gate, `bootGame`, `submitPlayerName`.

---

## Data files

| File | Contents |
|------|----------|
| [`data/jobs.json`](data/jobs.json) | Titles, pay, `req` skill IDs, `instructions`, `searchable` |
| [`data/skills.json`](data/skills.json) | CV skill names & descriptions |
| [`data/events.json`](data/events.json) | Event schedules, conditions, choices |
| [`data/replies.json`](data/replies.json) | Mom / Boss / Susan keyword replies |
| [`data/cinder.json`](data/cinder.json) | Dating profiles & per-match replies |
| [`data/trophies.json`](data/trophies.json) | Trophy tree (title, hint, parent, branch) |
| [`data/vipjobs.json`](data/vipjobs.json) | VIP jobs stub (`jobs: []`) |
| [`data/ascii/*.txt`](data/ascii/) | Boot splash, pizza, burger, Cinder faces |

Content-only changes → edit JSON/ASCII, not JS (unless new fields need loaders).

---

## HTML & CSS

| File | Role |
|------|------|
| [`index.html`](index.html) | All views (`#*-view`), `onclick` handlers, script tags |
| [`css/styles.css`](css/styles.css) | Phone shell, LCD, per-scene art, trophies, Cinder, boot |

**Top ticker strip (`#toast-container.ticker-tape`):** Always-visible dark bar at the top of the phone screen (first child inside `.phone-display`). Reserved for scrolling `showToast` messages and future persistent HUD copy — background stays on even when no message is playing.

New app screen: copy a `app-screen` block, add ID to `switchView` list in [`js/ui.js`](js/ui.js), add home button + `updateAppMenu` entry in [`js/messages.js`](js/messages.js).

---

## Common hook points

| When this happens… | Call / edit… |
|--------------------|--------------|
| Player starts shift | `work-core.js` → `startShift` |
| Shift ends | `endShift` → `showShiftSummary` → `finishShiftSummary` |
| Day advances | `ui.js` → `advanceDay` |
| App unlocked | `messages.js` → `unlock*App` + `updateAppMenu` |
| Skill earned | `skills.js` → `tryUnlockSkill` |
| Trophy earned | `trophies.js` → `tryUnlockTrophy` / `checkTrophyMilestones` |
| Money changes | `sfx.js` → `adjustCash` (calls `updateHUD`) |
| New message | `messages.js` → `addMessage` |
| Event fires | `events.js` → `triggerEvent` |
| Hired | `jobs.js` → `endInterview` |
| Rent paid | `messages.js` → `payWeeklyRent` |

---

## Progression reference (for hook placement)

```
Name → Messages → read Mom → Work → shift 1 → shift 2 → CV bundle (stats+trophies apps)
→ rent → Cinder → jobs/casino/skills → events → VIP (crash path)
```

`shiftsCompleted` increments in `work-core.js` → `endShift`.

---

## Branch note

Active work: `refactor/trophies` (deduped modules + trophy system on top of `main`).
