// === Shift profiles: per-job theme + archetype config ===
const SHIFT_PROFILES = {
    'PIZZA SHIFT': {
        archetype: 'spawn_tap',
        verb: 'DELIVERING',
        sceneClass: 'scene-pizza',
        glyph: '',
        taskLabel: 'TIP',
        spawnMin: 1200,
        spawnMax: 3500,
        taskTimeout: 2500,
    },
    'DISHWASHER': {
        archetype: 'spawn_tap',
        verb: 'SCRUBBING',
        sceneClass: 'scene-sink',
        glyph: '[=]',
        taskLabel: 'PLATE',
        spawnMin: 2200,
        spawnMax: 5000,
        taskTimeout: 1400,
    },
    'CASHIER': {
        archetype: 'spawn_tap',
        verb: 'SCANNING',
        sceneClass: 'scene-register',
        glyph: '[$]',
        taskLabel: 'SALE',
        spawnMin: 2400,
        spawnMax: 5200,
        taskTimeout: 1600,
    },
    'BURGER FLIP': {
        archetype: 'timing_bar',
        verb: 'FLIPPING',
        sceneClass: 'scene-grill',
        glyph: '[#]',
        zoneWidth: 0.18,
        sweepMs: 1200,
    },
    'SIGN SPINNER': {
        archetype: 'timing_bar',
        verb: 'SPINNING',
        sceneClass: 'scene-sign',
        glyph: '[/]',
        zoneWidth: 0.22,
        sweepMs: 1000,
    },
    'DATA ENTRY': {
        archetype: 'key_match',
        verb: 'TYPING',
        sceneClass: 'scene-desk',
        glyph: '[A]',
        roundMs: 2500,
    },
    'DAY TRADER': {
        archetype: 'key_match',
        verb: 'TRADING',
        sceneClass: 'scene-ticker',
        glyph: '[%]',
        roundMs: 2000,
    },
    'MANAGER': {
        archetype: 'executive',
        verb: 'MANAGING',
        sceneClass: 'scene-office',
        glyph: '[M]',
        eventMin: 4000,
        eventMax: 9000,
        eventLabel: 'MEETING',
    },
    'CEO': {
        archetype: 'executive',
        verb: 'EXECUTING',
        sceneClass: 'scene-corner',
        glyph: '[C]',
        eventMin: 5000,
        eventMax: 12000,
        eventLabel: 'GOLF',
    },
};

const DEFAULT_SHIFT_PROFILE = SHIFT_PROFILES['PIZZA SHIFT'];

const PIZZA_TIP_RING = [
    { id: 'N', top: 8, left: 50 },
    { id: 'NE', top: 14, left: 78 },
    { id: 'E', top: 44, left: 84 },
    { id: 'SE', top: 70, left: 78 },
    { id: 'S', top: 76, left: 50 },
    { id: 'SW', top: 70, left: 22 },
    { id: 'W', top: 44, left: 16 },
    { id: 'NW', top: 14, left: 22 },
];

let pizzaTipBusySlots = new Set();
let pizzaArtAnimTimer = null;

const PIZZA_ASCII_REGIONS = [
    {
        id: 'exhaust',
        ranges: [
            { rows: [0, 1], minCol: 75, maxCol: 79 },
            { rows: [2], minCol: 72, maxCol: 78 },
            { rows: [3], minCol: 71, maxCol: 74 },
        ],
        interval: 180,
        chars: ['~', '^', '`', "'", 'J', 'U', 'X', 'Y', 'c', 'y', 'z', 'v', '^', '"'],
    },
    {
        id: 'smoke',
        ranges: [
            { rows: [4], minCol: 71, maxCol: 76 },
            { rows: [5], minCol: 72, maxCol: 78 },
            { rows: [6], minCol: 77, maxCol: 79 },
            { rows: [7], minCol: 76, maxCol: 79 },
            { rows: [8], minCol: 75, maxCol: 77 },
            { rows: [9], minCol: 77, maxCol: 79 },
            { rows: [10], minCol: 76, maxCol: 79 },
            { rows: [11], minCol: 76, maxCol: 76 },
        ],
        interval: 340,
        chars: ['~', '^', '`', "'", '"', 'Y', 'U', 'v', 'z', 'J', 'f', 'u', 'L', '|'],
    },
    {
        id: 'road',
        rows: [17, 18, 19, 20, 21, 22, 23],
        minCol: 0,
        maxCol: 85,
        match: 'oO0QdDpPmM',
        interval: 880,
        chars: ['o', 'O', '0', 'Q', 'd', 'D', 'p', 'P', 'm', 'M'],
    },
];

function cellMatchesRegionRange(row, col, region) {
    if (region.ranges) {
        return region.ranges.some(range =>
            range.rows.includes(row) && col >= range.minCol && col <= range.maxCol
        );
    }
    if (!region.rows.includes(row)) return false;
    if (col < (region.minCol ?? 0)) return false;
    if (region.maxCol != null && col > region.maxCol) return false;
    return true;
}

function escapeAsciiHtml(ch) {
    if (ch === '&') return '&amp;';
    if (ch === '<') return '&lt;';
    if (ch === '>') return '&gt;';
    return ch;
}

function getPizzaAnimRegion(row, col, ch) {
    if (ch === ' ') return null;
    for (const region of PIZZA_ASCII_REGIONS) {
        if (!cellMatchesRegionRange(row, col, region)) continue;
        if (region.match && !region.match.includes(ch)) continue;
        return region;
    }
    return null;
}

function buildPizzaArtHtml() {
    const lines = (PIZZA_PLAYER_ASCII || '').split('\n');
    return lines.map((line, row) => {
        let html = '';
        for (let col = 0; col < line.length; col++) {
            const ch = line[col];
            const region = getPizzaAnimRegion(row, col, ch);
            if (region) {
                html += `<span class="ascii-ch ascii-ch--${region.id}" data-r="${row}" data-c="${col}" data-region="${region.id}">${escapeAsciiHtml(ch)}</span>`;
            } else {
                html += escapeAsciiHtml(ch);
            }
        }
        return html;
    }).join('\n');
}

function stopPizzaArtAnimation() {
    if (pizzaArtAnimTimer) {
        clearInterval(pizzaArtAnimTimer);
        pizzaArtAnimTimer = null;
    }
}

function startPizzaArtAnimation(pre) {
    stopPizzaArtAnimation();
    if (!pre) return;

    const cells = pre.querySelectorAll('.ascii-ch');
    if (!cells.length) return;

    const cellState = new Map();
    cells.forEach((el) => {
        const region = PIZZA_ASCII_REGIONS.find(r => r.id === el.dataset.region);
        if (!region) return;
        cellState.set(el, {
            region,
            idx: Math.floor(Math.random() * region.chars.length),
            nextAt: performance.now() + Math.random() * region.interval,
        });
    });

    pizzaArtAnimTimer = setInterval(() => {
        const now = performance.now();
        cellState.forEach((state, el) => {
            if (now < state.nextAt) return;
            state.idx = (state.idx + 1) % state.region.chars.length;
            el.textContent = state.region.chars[state.idx];
            state.nextAt = now + state.region.interval + Math.random() * 120;
        });
    }, 80);
}

function resetPizzaTipRing() {
    pizzaTipBusySlots.clear();
    const ring = document.getElementById('shift-tip-ring');
    if (ring) ring.innerHTML = '';
}

function getPizzaPlayerSceneShell(variant) {
    const previewCls = variant === 'preview' ? ' pizza-player-scene--preview' : '';
    return `<div class="pizza-player-scene${previewCls}">
        <div class="pizza-scene-frame">
            <div class="pizza-player-art-wrap">
                <div class="pizza-player-art-inner">
                    <pre class="shift-ascii-player" aria-hidden="true"></pre>
                </div>
            </div>
        </div>
    </div>`;
}

function mountPizzaPlayerArt(container, animate = true) {
    const pre = container?.querySelector('.shift-ascii-player');
    if (!pre) return;

    stopPizzaArtAnimation();
    pre.innerHTML = buildPizzaArtHtml();

    requestAnimationFrame(() => {
        fitPizzaPlayerArt(container);
        requestAnimationFrame(() => {
            fitPizzaPlayerArt(container);
            if (animate) startPizzaArtAnimation(pre);
        });
    });
    setTimeout(() => fitPizzaPlayerArt(container), 50);
}

function fitPizzaPlayerArt(container) {
    const wrap = container?.querySelector('.pizza-player-art-wrap');
    const pre = container?.querySelector('.shift-ascii-player');
    if (!wrap || !pre || !pre.innerHTML) return;

    pre.style.setProperty('--pizza-scale', '1');
    const maxW = wrap.clientWidth * 0.95;
    const maxH = wrap.clientHeight * 0.88;
    if (maxW <= 0 || maxH <= 0) return;

    const scale = Math.min(maxW / pre.scrollWidth, maxH / pre.scrollHeight, 1.15);
    pre.style.setProperty('--pizza-scale', String(scale));
}

function pickPizzaTipSlot() {
    const free = PIZZA_TIP_RING.filter(slot => !pizzaTipBusySlots.has(slot.id));
    const pool = free.length ? free : PIZZA_TIP_RING;
    return pool[Math.floor(Math.random() * pool.length)];
}

function releasePizzaTipSlot(slotId) {
    pizzaTipBusySlots.delete(slotId);
}

function rollPizzaTipAmount() {
    const roll = Math.random();
    let amount;

    if (roll < 0.006) {
        amount = 3.85 + Math.random() * 0.15;
    } else if (roll < 0.04) {
        amount = 2.5 + Math.random() * 1.34;
    } else if (roll < 0.18) {
        amount = 1.25 + Math.random() * 1.24;
    } else if (roll < 0.5) {
        amount = 0.75 + Math.random() * 0.49;
    } else {
        amount = 0.5 + Math.random() * 0.24;
    }

    return Math.min(4, Math.round(amount * 100) / 100);
}

const KEY_POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const TRADER_KEYS = ['BUY', 'SELL', 'HOLD'];

let shiftOccupiedZones = [];
let timingBarState = null;
let keyMatchState = null;

function getShiftProfile(jobTitle = state.currentJobTitle) {
    const gameplay = SHIFT_PROFILES[jobTitle] || DEFAULT_SHIFT_PROFILE;
    const job = getJobByTitle(jobTitle);
    return {
        ...gameplay,
        bonusBase: job?.bonusBase ?? 0,
        instructions: job?.instructions ?? '',
    };
}

function getComboMultiplier() {
    return 1 + Math.min(state.shiftCombo, 5) * 0.04;
}

function setShiftPhase(phase) {
    const briefing = document.getElementById('shift-briefing-ui');
    const active = document.getElementById('shift-active-ui');
    const summary = document.getElementById('shift-summary-ui');

    if (briefing) briefing.classList.toggle('hidden', phase !== 'briefing');
    if (briefing) briefing.classList.toggle('flex', phase === 'briefing');
    if (active) active.classList.toggle('hidden', phase !== 'active');
    if (active) active.classList.toggle('flex', phase === 'active');
    if (summary) summary.classList.toggle('hidden', phase !== 'summary');
    if (summary) summary.classList.toggle('flex', phase === 'summary');
}

function setShiftStatus(text, blink) {
    const status = document.getElementById('ui-shift-status');
    if (!status) return;
    status.innerText = text;
    status.classList.toggle('blinking', !!blink);
}

function renderJobScene(profile, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.className = container.id === 'shift-scene-preview'
        ? 'shift-scene-preview'
        : 'shift-workzone shift-workzone-live flex-1 relative overflow-hidden min-h-0';

    const isPizza = profile.sceneClass === 'scene-pizza';

    if (container.id === 'tip-container') {
        if (isPizza) resetPizzaTipRing();
        container.classList.add(profile.sceneClass);
        container.innerHTML = `
            ${isPizza ? getPizzaPlayerSceneShell('live') : ''}
            <div class="shift-workzone-grid" aria-hidden="true"></div>
            <div class="shift-workzone-scanline" aria-hidden="true"></div>
            <div id="shift-float-layer" class="shift-float-layer"></div>
            ${isPizza ? '<div id="shift-tip-ring" class="shift-tip-ring"></div>' : ''}
            <div class="shift-workzone-label">
                <span class="blinking">█</span> <span id="ui-shift-verb-label">${profile.verb}</span> <span class="blinking">█</span>
            </div>`;
        if (isPizza) mountPizzaPlayerArt(container, state.isShiftActive);
    } else {
        container.classList.add(profile.sceneClass);
        if (isPizza) {
            container.innerHTML = getPizzaPlayerSceneShell('preview');
            mountPizzaPlayerArt(container, false);
        } else {
            container.innerHTML = `<span id="shift-scene-glyph" class="shift-scene-glyph">${profile.glyph}</span>`;
        }
    }
}

function updateShiftBriefing() {
    const unemployed = state.isUnemployed;
    const profile = unemployed ? getShiftProfile('PIZZA SHIFT') : getShiftProfile();
    const pizzaWage = 0.30;
    const length = state.shiftMaxTime;
    const baseEstimate = (unemployed ? pizzaWage : state.baseWagePerSec) * length;

    const role = document.getElementById('ui-shift-role');
    const wageEl = document.getElementById('ui-shift-wage');
    const lengthEl = document.getElementById('ui-shift-length');
    const estimateEl = document.getElementById('ui-shift-estimate');
    const bonusEl = document.getElementById('ui-shift-bonus-range');
    const instructions = document.getElementById('ui-shift-instructions');
    const badge = document.getElementById('ui-shift-badge');
    const startBtn = document.getElementById('btn-start-shift');
    const begBtn = document.getElementById('btn-beg-for-job');

    if (role) role.innerText = unemployed ? 'PIZZA SHIFT' : state.currentJobTitle;
    if (wageEl) wageEl.innerText = unemployed ? `$${pizzaWage.toFixed(2)}/s` : `$${state.baseWagePerSec.toFixed(2)}/s`;
    if (lengthEl) lengthEl.innerText = `${length}s`;
    if (estimateEl) estimateEl.innerText = `~$${baseEstimate.toFixed(0)}+`;
    if (bonusEl) {
        const isPizza = (unemployed ? 'PIZZA SHIFT' : state.currentJobTitle) === 'PIZZA SHIFT';
        bonusEl.innerText = isPizza ? '+$0.50-$4' : `+$${profile.bonusBase.toFixed(2)}`;
    }

    if (unemployed) {
        const fromPizza = state.firedFromJob === 'PIZZA SHIFT';
        if (instructions) {
            instructions.innerText = fromPizza
                ? 'You got fired from pizza delivery. Beg your boss for one more chance.'
                : `You lost ${state.firedFromJob}. Pizza delivery is hiring — beg for the job.`;
        }
        if (badge) badge.innerText = 'FIRED';
        if (begBtn) {
            begBtn.innerText = fromPizza ? '[ BEG FOR JOB BACK ]' : '[ BEG FOR JOB ]';
            begBtn.classList.remove('hidden');
        }
        if (startBtn) startBtn.classList.add('hidden');
        setShiftStatus('FIRED', true);
    } else {
        if (instructions) instructions.innerText = profile.instructions;
        if (badge) badge.innerText = 'ON CALL';
        if (begBtn) begBtn.classList.add('hidden');
        if (startBtn) startBtn.classList.remove('hidden');
        setShiftStatus('READY', false);
    }

    renderJobScene(profile, 'shift-scene-preview');

    if (!state.isShiftActive) {
        setShiftPhase('briefing');
    }
}

function begForJobBack() {
    if (!state.isUnemployed) return;

    state.isUnemployed = false;
    state.firedFromJob = null;
    state.currentJobTitle = 'PIZZA SHIFT';
    state.baseWagePerSec = 0.30;
    state.bossStrikes = 0;

    tryUnlockSkill(2);

    updateWorkAppLabel();
    updateShiftBriefing();
    showToast('PIZZA JOB RESTORED');
    addMessage('BOSS', 'Fine. One more chance at pizza delivery. Do not mess this up.');
}

function updateShiftHUD() {
    const timeLeft = Math.max(0, state.shiftMaxTime - state.shiftTimeElapsed);
    const seconds = Math.ceil(timeLeft);
    const timerEl = document.getElementById('ui-shift-timer');
    const earnedEl = document.getElementById('ui-shift-earned');
    const comboEl = document.getElementById('ui-shift-combo');
    const tipsEl = document.getElementById('ui-shift-tips');
    const percentEl = document.getElementById('ui-shift-percent');
    const progressEl = document.getElementById('ui-shift-progress');
    const verbEl = document.getElementById('ui-shift-verb');
    const verbLabel = document.getElementById('ui-shift-verb-label');
    const profile = getShiftProfile();

    if (timerEl) {
        timerEl.innerText = `00:${seconds < 10 ? '0' : ''}${seconds}`;
        timerEl.classList.toggle('shift-timer-urgent', seconds <= 11 && state.isShiftActive);
    }
    if (earnedEl) earnedEl.innerText = `$${state.shiftEarned.toFixed(2)}`;
    if (comboEl) comboEl.innerText = `x${getComboMultiplier().toFixed(1)}`;
    if (tipsEl) tipsEl.innerText = `${state.shiftTipsCollected}`;
    if (verbEl) verbEl.innerText = profile.verb;
    if (verbLabel) verbLabel.innerText = profile.verb;

    const percent = (state.shiftTimeElapsed / state.shiftMaxTime) * 100;
    if (progressEl) progressEl.style.width = `${percent}%`;
    if (percentEl) percentEl.innerText = `${Math.floor(percent)}%`;
}

function pulseEarnedHUD() {
    const cell = document.querySelector('.shift-hud-earned-cell');
    if (!cell) return;
    cell.classList.remove('shift-hud-pulse');
    void cell.offsetWidth;
    cell.classList.add('shift-hud-pulse');
}

function showFloatText(text, topPct, leftPct) {
    const layer = document.getElementById('shift-float-layer');
    if (!layer) return;
    const el = document.createElement('span');
    el.className = 'shift-float-text';
    el.innerText = text;
    el.style.top = `${topPct}%`;
    el.style.left = `${leftPct}%`;
    layer.appendChild(el);
    setTimeout(() => el.remove(), 700);
}

function awardBonus(amount, topPct, leftPct) {
    const multiplier = getComboMultiplier();
    const total = amount * multiplier;
    const comboExtra = total - amount;

    state.cash += total;
    state.shiftEarned += total;
    state.shiftBonusEarned += total;
    state.shiftBonusRaw += amount;
    state.shiftComboBonus += comboExtra;
    state.shiftTipsCollected++;
    state.shiftCombo++;

    updateHUD();
    updateShiftHUD();
    pulseEarnedHUD();
    if (topPct != null) showFloatText(`+$${total.toFixed(2)}`, topPct, leftPct);
}

function resetCombo() {
    state.shiftCombo = 0;
    updateShiftHUD();
}

function findClearPosition(widthPct, heightPct) {
    const maxAttempts = 5;
    for (let i = 0; i < maxAttempts; i++) {
        const top = Math.random() * (85 - heightPct) + 8;
        const left = Math.random() * (80 - widthPct) + 8;
        const overlaps = shiftOccupiedZones.some(z =>
            Math.abs(z.top - top) < (z.h + heightPct) * 0.5 &&
            Math.abs(z.left - left) < (z.w + widthPct) * 0.5
        );
        if (!overlaps) {
            shiftOccupiedZones.push({ top, left, w: widthPct, h: heightPct });
            return { top, left };
        }
    }
    return { top: 15 + Math.random() * 50, left: 15 + Math.random() * 50 };
}

function releaseZone(top, left) {
    shiftOccupiedZones = shiftOccupiedZones.filter(z => z.top !== top || z.left !== left);
}

// === Archetype: spawn_tap ===
function scheduleSpawnTap() {
    if (!state.isShiftActive) return;
    const profile = getShiftProfile();
    const delay = Math.random() * (profile.spawnMax - profile.spawnMin) + profile.spawnMin;
    state.tipSpawnerInterval = setTimeout(() => {
        spawnTapTask();
        scheduleSpawnTap();
    }, delay);
}

function spawnTapTask() {
    if (!state.isShiftActive) return;
    const profile = getShiftProfile();
    if (profile.sceneClass === 'scene-pizza') {
        spawnPizzaTip();
        return;
    }
    spawnTapTaskGeneric(profile);
}

function spawnPizzaTip() {
    const profile = getShiftProfile();
    const container = document.getElementById('tip-container');
    const ring = document.getElementById('shift-tip-ring');
    if (!container || !ring) return;

    const slot = pickPizzaTipSlot();
    const amount = rollPizzaTipAmount();

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tip-btn tip-btn-ring pointer-events-auto';
    btn.style.top = `${slot.top}%`;
    btn.style.left = `${slot.left}%`;
    btn.dataset.slotId = slot.id;
    btn.innerHTML = '[TIP]';

    pizzaTipBusySlots.add(slot.id);

    const removeTip = (missed) => {
        releasePizzaTipSlot(slot.id);
        if (btn.parentNode) btn.remove();
        if (missed) resetCombo();
    };

    btn.onclick = function () {
        awardBonus(amount, slot.top, slot.left);
        removeTip(false);
    };

    ring.appendChild(btn);
    setTimeout(() => {
        if (btn.parentNode) removeTip(true);
    }, profile.taskTimeout);
}

function spawnTapTaskGeneric(profile) {
    const container = document.getElementById('tip-container');
    if (!container) return;

    const btn = document.createElement('button');
    const pos = findClearPosition(22, 12);
    const amount = profile.bonusBase;

    btn.className = 'tip-btn pointer-events-auto';
    btn.style.top = `${pos.top}%`;
    btn.style.left = `${pos.left}%`;
    btn.innerHTML = `+${amount < 10 ? '$' + amount.toFixed(amount % 1 ? 2 : 0) : '$' + amount}`;

    const removeBtn = () => {
        releaseZone(pos.top, pos.left);
        if (btn.parentNode) btn.remove();
    };

    btn.onclick = function () {
        awardBonus(amount, pos.top, pos.left);
        removeBtn();
    };

    container.appendChild(btn);
    setTimeout(() => {
        if (btn.parentNode) {
            resetCombo();
            removeBtn();
        }
    }, profile.taskTimeout);
}

// === Archetype: timing_bar ===
function initTimingBar() {
    const profile = getShiftProfile();
    const rail = document.getElementById('shift-action-rail');
    const bar = document.getElementById('shift-timing-bar');
    if (rail) rail.classList.remove('hidden');
    if (bar) bar.classList.remove('hidden');

    const zone = bar?.querySelector('.shift-timing-zone');
    if (zone) {
        const widthPct = (profile.zoneWidth || 0.18) * 100;
        zone.style.width = `${widthPct}%`;
        zone.style.left = `${Math.random() * (100 - widthPct)}%`;
    }

    timingBarState = {
        position: 0,
        direction: 1,
        sweepMs: profile.sweepMs || 1200,
        lastTick: performance.now(),
    };

    state.shiftArchetypeTimer = setInterval(timingBarTick, 16);
}

function timingBarTick() {
    if (!state.isShiftActive || !timingBarState) return;
    const now = performance.now();
    const dt = now - timingBarState.lastTick;
    timingBarState.lastTick = now;

    const speed = dt / timingBarState.sweepMs;
    timingBarState.position += speed * timingBarState.direction;

    if (timingBarState.position >= 1) {
        timingBarState.position = 1;
        timingBarState.direction = -1;
    } else if (timingBarState.position <= 0) {
        timingBarState.position = 0;
        timingBarState.direction = 1;
    }

    const cursor = document.getElementById('shift-timing-cursor');
    if (cursor) cursor.style.left = `${timingBarState.position * 100}%`;
}

function handleTimingHit() {
    if (!state.isShiftActive || !timingBarState) return;
    const profile = getShiftProfile();
    const bar = document.getElementById('shift-timing-bar');
    const zone = bar?.querySelector('.shift-timing-zone');
    if (!zone) return;

    const zoneLeft = parseFloat(zone.style.left) / 100;
    const zoneWidth = parseFloat(zone.style.width) / 100;
    const pos = timingBarState.position;
    const hit = pos >= zoneLeft && pos <= zoneLeft + zoneWidth;

    if (hit) {
        awardBonus(profile.bonusBase, 50, 50);
        const widthPct = parseFloat(zone.style.width) || 18;
        zone.style.left = `${Math.random() * (100 - widthPct)}%`;
    } else {
        resetCombo();
    }
}

function cleanupTimingBar() {
    clearInterval(state.shiftArchetypeTimer);
    state.shiftArchetypeTimer = null;
    timingBarState = null;
    const bar = document.getElementById('shift-timing-bar');
    const rail = document.getElementById('shift-action-rail');
    if (bar) bar.classList.add('hidden');
    if (rail) rail.classList.add('hidden');
}

// === Archetype: key_match ===
function initKeyMatch() {
    const rail = document.getElementById('shift-action-rail');
    const keyRail = document.getElementById('shift-key-rail');
    if (rail) rail.classList.remove('hidden');
    if (keyRail) keyRail.classList.remove('hidden');
    scheduleKeyMatchRound();
}

function scheduleKeyMatchRound() {
    if (!state.isShiftActive) return;
    const profile = getShiftProfile();
    const delay = 800 + Math.random() * 1200;
    state.tipSpawnerInterval = setTimeout(() => {
        startKeyMatchRound();
    }, delay);
}

function startKeyMatchRound() {
    if (!state.isShiftActive) return;
    const profile = getShiftProfile();
    const prompt = document.getElementById('ui-key-prompt');
    const container = document.getElementById('shift-key-buttons');
    if (!prompt || !container) return;

    let correct;
    let options;

    if (state.currentJobTitle === 'DAY TRADER') {
        correct = TRADER_KEYS[Math.floor(Math.random() * TRADER_KEYS.length)];
        options = [...TRADER_KEYS].sort(() => Math.random() - 0.5);
    } else {
        correct = KEY_POOL.charAt(Math.floor(Math.random() * KEY_POOL.length));
        options = [correct];
        while (options.length < 3) {
            const k = KEY_POOL.charAt(Math.floor(Math.random() * KEY_POOL.length));
            if (!options.includes(k)) options.push(k);
        }
        options.sort(() => Math.random() - 0.5);
    }

    prompt.innerText = state.currentJobTitle === 'DAY TRADER' ? `CALL: ${correct}` : `TYPE: ${correct}`;
    container.innerHTML = '';

    keyMatchState = { correct, resolved: false };

    options.forEach(key => {
        const btn = document.createElement('button');
        btn.className = 'nokia-btn nokia-btn-outline py-1 text-[9px] text-center justify-center';
        btn.innerText = key;
        btn.onclick = () => handleKeyMatch(key);
        container.appendChild(btn);
    });

    state.shiftArchetypeTimer = setTimeout(() => {
        if (keyMatchState && !keyMatchState.resolved) {
            keyMatchState.resolved = true;
            resetCombo();
            prompt.innerText = 'MISSED!';
            container.innerHTML = '';
            scheduleKeyMatchRound();
        }
    }, profile.roundMs);
}

function handleKeyMatch(key) {
    if (!keyMatchState || keyMatchState.resolved) return;
    keyMatchState.resolved = true;
    clearTimeout(state.shiftArchetypeTimer);

    const profile = getShiftProfile();
    const prompt = document.getElementById('ui-key-prompt');
    const container = document.getElementById('shift-key-buttons');

    if (key === keyMatchState.correct) {
        awardBonus(profile.bonusBase, 50, 50);
        if (prompt) prompt.innerText = 'CORRECT!';
    } else {
        resetCombo();
        if (prompt) prompt.innerText = 'WRONG!';
    }

    if (container) container.innerHTML = '';
    setTimeout(scheduleKeyMatchRound, 600);
}

function cleanupKeyMatch() {
    clearTimeout(state.shiftArchetypeTimer);
    clearTimeout(state.tipSpawnerInterval);
    state.shiftArchetypeTimer = null;
    keyMatchState = null;
    const keyRail = document.getElementById('shift-key-rail');
    const rail = document.getElementById('shift-action-rail');
    if (keyRail) keyRail.classList.add('hidden');
    if (rail) rail.classList.add('hidden');
    const container = document.getElementById('shift-key-buttons');
    if (container) container.innerHTML = '';
}

// === Archetype: executive ===
function scheduleExecutiveEvent() {
    if (!state.isShiftActive) return;
    const profile = getShiftProfile();
    const delay = Math.random() * (profile.eventMax - profile.eventMin) + profile.eventMin;
    state.tipSpawnerInterval = setTimeout(() => {
        spawnExecutiveEvent();
        scheduleExecutiveEvent();
    }, delay);
}

function spawnExecutiveEvent() {
    if (!state.isShiftActive) return;
    const profile = getShiftProfile();
    const container = document.getElementById('tip-container');
    if (!container) return;

    const btn = document.createElement('button');
    const pos = findClearPosition(28, 14);
    const label = profile.eventLabel || 'MEETING';

    btn.className = 'tip-btn tip-btn-exec pointer-events-auto';
    btn.style.top = `${pos.top}%`;
    btn.style.left = `${pos.left}%`;
    btn.innerHTML = label;

    const removeBtn = () => {
        releaseZone(pos.top, pos.left);
        if (btn.parentNode) btn.remove();
    };

    btn.onclick = function () {
        awardBonus(profile.bonusBase, pos.top, pos.left);
        this.innerHTML = 'DONE';
        this.classList.add('tip-btn-collected');
        setTimeout(removeBtn, 400);
    };

    container.appendChild(btn);
    setTimeout(() => {
        if (btn.parentNode && !btn.classList.contains('tip-btn-collected')) removeBtn();
    }, 3000);
}

function startArchetypeEngine() {
    const profile = getShiftProfile();
    cleanupArchetypeEngine();

    if (profile.archetype === 'spawn_tap') {
        scheduleSpawnTap();
    } else if (profile.archetype === 'timing_bar') {
        initTimingBar();
    } else if (profile.archetype === 'key_match') {
        initKeyMatch();
    } else if (profile.archetype === 'executive') {
        scheduleExecutiveEvent();
    }
}

function cleanupArchetypeEngine() {
    clearInterval(state.shiftArchetypeTimer);
    clearTimeout(state.tipSpawnerInterval);
    state.shiftArchetypeTimer = null;
    state.tipSpawnerInterval = null;
    timingBarState = null;
    keyMatchState = null;
    shiftOccupiedZones = [];
    stopPizzaArtAnimation();

    cleanupTimingBar();
    cleanupKeyMatch();

    const container = document.getElementById('tip-container');
    if (container) {
        renderJobScene(getShiftProfile(), 'tip-container');
    }
}

// === Core shift flow ===
function startShift() {
    if (state.isUnemployed) {
        showToast('YOU ARE FIRED');
        return;
    }

    const profile = getShiftProfile();

    state.isShiftActive = true;
    state.shiftTimeElapsed = 0;
    state.shiftEarned = 0;
    state.shiftTipsCollected = 0;
    state.shiftCombo = 0;
    state.shiftBonusEarned = 0;
    state.shiftBonusRaw = 0;
    state.shiftComboBonus = 0;
    state.shiftManualEnd = false;

    setShiftPhase('active');
    setShiftStatus('● LIVE', true);

    const badge = document.getElementById('ui-shift-badge');
    if (badge) badge.innerText = '● LIVE';

    renderJobScene(profile, 'tip-container');
    updateShiftHUD();

    state.shiftInterval = setInterval(processShiftTick, 100);
    startArchetypeEngine();
}

function processShiftTick() {
    const tickLength = 0.1;
    state.shiftTimeElapsed += tickLength;

    const earnedThisTick = state.baseWagePerSec * tickLength;
    state.shiftEarned += earnedThisTick;
    state.cash += earnedThisTick;

    updateHUD();
    updateShiftHUD();

    if (state.shiftTimeElapsed >= state.shiftMaxTime) {
        endShift(false);
    }
}

function getShiftMood(manual, totalEarned) {
    if (manual) return 'EARLY OUT';
    const base = state.baseWagePerSec * state.shiftMaxTime;
    if (totalEarned >= base * 1.15) return 'STRONG';
    if (totalEarned >= base * 0.85) return 'DECENT';
    return 'SLOW';
}

function showShiftSummary(manual) {
    const total = state.shiftEarned;
    const basePay = Math.max(0, total - state.shiftBonusEarned);
    const bonusRaw = state.shiftBonusRaw;
    const comboBonus = state.shiftComboBonus;

    const baseEl = document.getElementById('ui-summary-base');
    const bonusEl = document.getElementById('ui-summary-bonus');
    const comboEl = document.getElementById('ui-summary-combo');
    const totalEl = document.getElementById('ui-summary-total');
    const moodEl = document.getElementById('ui-summary-mood');

    if (baseEl) baseEl.innerText = `$${basePay.toFixed(2)}`;
    if (bonusEl) bonusEl.innerText = `$${bonusRaw.toFixed(2)}`;
    if (comboEl) comboEl.innerText = `$${comboBonus.toFixed(2)}`;
    if (totalEl) totalEl.innerText = `$${total.toFixed(2)}`;
    if (moodEl) moodEl.innerText = getShiftMood(manual, total);

    setShiftPhase('summary');
    setShiftStatus('DONE', false);
}

function finishShiftSummary() {
    const manual = state.shiftManualEnd;
    const earned = state.shiftEarned;

    sendBossShiftFeedback(manual, earned);
    switchView('home-view');

    if (state.shiftsCompleted === 2) {
        if (tryUnlockSkill(1)) {
            unlockCVApp();
        } else if (!state.unlockedApps.cv) {
            unlockCVApp();
        }
    }

    if (state.shiftsCompleted === 1) {
        setTimeout(() => addMessage('MOM', `Rent is $${getWeeklyRent().toFixed(2)} this week. Get to work.`), 2000);
    }

    setShiftPhase('briefing');
    updateShiftBriefing();
}

function endShift(manual) {
    if (!state.isShiftActive) return;

    state.isShiftActive = false;
    state.shiftManualEnd = manual;

    clearInterval(state.shiftInterval);
    cleanupArchetypeEngine();

    const earned = state.shiftEarned;
    recordJobEarnings(earned);
    recordShiftCompleted();

    state.shiftsCompleted++;
    advanceDay();

    const timerEl = document.getElementById('ui-shift-timer');
    if (timerEl) timerEl.classList.remove('shift-timer-urgent');

    const badge = document.getElementById('ui-shift-badge');
    if (badge) badge.innerText = 'ON CALL';

    showShiftSummary(manual);
}

// Backward-compatible aliases
function startPizzaShift() { startShift(); }
function endPizzaShift(manual) { endShift(manual); }
