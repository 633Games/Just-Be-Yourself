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
    return buildAsciiArtHtml(PIZZA_PLAYER_ASCII, (row, col, ch) => getPizzaAnimRegion(row, col, ch));
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
        cellState.forEach((cell, el) => {
            if (now < cell.nextAt) return;
            cell.idx = (cell.idx + 1) % cell.region.chars.length;
            el.textContent = cell.region.chars[cell.idx];
            cell.nextAt = now + cell.region.interval + Math.random() * 120;
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

function fitPizzaPlayerArt(container) {
    const wrap = container?.querySelector('.pizza-player-art-wrap');
    const pre = container?.querySelector('.shift-ascii-player');
    fitAsciiToContainer(wrap, pre, '--pizza-scale');
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

function spawnPizzaTip() {
    const profile = getShiftProfile();
    const ring = document.getElementById('shift-tip-ring');
    if (!ring) return;

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
