const BURGER_SIZZLE_ROW_START = 14;
const BURGER_SIZZLE_ROW_END = 28;

const BURGER_ANIM_REGIONS = {
    pattySizzle: {
        id: 'patty-sizzle',
        interval: 520,
        boldPulse: true,
        animateChars: false,
    },
};

let burgerArtAnimTimer = null;
let burgerSizzleBoostUntil = 0;
let burgerFlipState = null;

function isBurgerFlipJob(profile = getShiftProfile()) {
    return profile.sceneClass === 'scene-grill';
}

function burgerCellHash(row, col) {
    let n = row * 7919 + col * 6151 + 9341;
    n = (n ^ (n >>> 13)) * 1274126177;
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function getBurgerSizzleWeight(row, col, lineLength) {
    const rowCenter = (BURGER_SIZZLE_ROW_START + BURGER_SIZZLE_ROW_END) / 2;
    const rowSpan = (BURGER_SIZZLE_ROW_END - BURGER_SIZZLE_ROW_START) / 2 + 0.5;
    const rowT = Math.abs(row - rowCenter) / rowSpan;
    const rowFeather = Math.max(0, 1 - rowT * rowT);

    const colCenter = lineLength * 0.5;
    const colSpan = lineLength * 0.34;
    const colT = Math.abs(col - colCenter) / colSpan;
    const colFeather = Math.max(0, 1 - colT * colT);

    return rowFeather * colFeather;
}

function getBurgerAnimRegion(row, col, ch, lineLength) {
    if (ch === ' ') return null;
    if (row < BURGER_SIZZLE_ROW_START || row > BURGER_SIZZLE_ROW_END) return null;

    const weight = getBurgerSizzleWeight(row, col, lineLength);
    const density = 0.34 + weight * 0.38;
    if (burgerCellHash(row, col) > density) return null;

    return {
        ...BURGER_ANIM_REGIONS.pattySizzle,
        weight,
        soft: weight < 0.45,
    };
}

function buildBurgerArtHtml() {
    return buildAsciiArtHtml(
        BURGER_GRILL_ASCII,
        (row, col, ch, lineLength) => getBurgerAnimRegion(row, col, ch, lineLength),
        (region) => ` data-weight="${region.weight.toFixed(3)}"`
    );
}

function stopBurgerArtAnimation() {
    if (burgerArtAnimTimer) {
        clearInterval(burgerArtAnimTimer);
        burgerArtAnimTimer = null;
    }
}

function startBurgerArtAnimation(pre) {
    stopBurgerArtAnimation();
    if (!pre) return;

    const cells = pre.querySelectorAll('.ascii-ch');
    if (!cells.length) return;

    const cellState = new Map();
    cells.forEach((el) => {
        const weight = parseFloat(el.dataset.weight || '0.5');
        cellState.set(el, {
            weight,
            lit: false,
            nextAt: performance.now() + Math.random() * 900,
        });
    });

    burgerArtAnimTimer = setInterval(() => {
        const now = performance.now();
        cellState.forEach((cell, el) => {
            if (now < cell.nextAt) return;

            if (Math.random() > (isBurgerSizzleBoosted() ? 0.18 : 0.35) + cell.weight * (isBurgerSizzleBoosted() ? 0.25 : 0.45)) {
                cell.nextAt = now + 120 + Math.random() * 280;
                return;
            }

            cell.lit = !cell.lit;
            el.classList.toggle('ascii-burger-sizzle-lit', cell.lit);
            el.classList.toggle('ascii-burger-bold', cell.lit && Math.random() < (isBurgerSizzleBoosted() ? 0.55 : 0.25) + cell.weight * 0.35);

            const boostMul = isBurgerSizzleBoosted() ? 0.5 : 1;
            const pace = (320 + (1 - cell.weight) * 520) * boostMul;
            cell.nextAt = now + pace + Math.random() * ((480 + cell.weight * 420) * boostMul);
        });
    }, 90);
}

function isBurgerSizzleBoosted() {
    return performance.now() < burgerSizzleBoostUntil;
}

function boostBurgerSizzle(ms = 1500) {
    burgerSizzleBoostUntil = performance.now() + ms;
    const pre = document.querySelector('.shift-ascii-burger');
    if (pre) pre.classList.add('burger-sizzle-boost');
    setTimeout(() => {
        if (!isBurgerSizzleBoosted()) {
            document.querySelector('.shift-ascii-burger')?.classList.remove('burger-sizzle-boost');
        }
    }, ms + 30);
}

function pulseBurgerCookFlash() {
    const pre = document.querySelector('.shift-ascii-burger');
    if (!pre) return;
    pre.classList.remove('burger-cook-flash');
    void pre.offsetWidth;
    pre.classList.add('burger-cook-flash');
    setTimeout(() => pre.classList.remove('burger-cook-flash'), 180);
}

function getBurgerGrillSceneShell(variant) {
    const previewCls = variant === 'preview' ? ' burger-grill-scene--preview' : '';
    return `<div class="burger-grill-scene${previewCls}">
        <div class="burger-scene-frame">
            <div class="burger-art-wrap">
                <div class="burger-art-inner">
                    <pre class="shift-ascii-burger" aria-hidden="true"></pre>
                </div>
            </div>
        </div>
    </div>`;
}

function fitBurgerGrillArt(container) {
    const wrap = container?.querySelector('.burger-art-wrap');
    const pre = container?.querySelector('.shift-ascii-burger');
    fitAsciiToContainer(wrap, pre, '--burger-scale', {
        widthFactor: 0.99,
        heightFactor: 0.99,
        maxScale: Infinity,
    });
}

function mountBurgerGrillArt(container, animate = true) {
    const pre = container?.querySelector('.shift-ascii-burger');
    if (!pre) return;

    stopBurgerArtAnimation();
    pre.innerHTML = buildBurgerArtHtml();

    requestAnimationFrame(() => {
        fitBurgerGrillArt(container);
        requestAnimationFrame(() => {
            fitBurgerGrillArt(container);
            wireBurgerFlipButton();
            if (state.isShiftActive && isBurgerFlipJob()) {
                startBurgerFlipBar();
            }
            if (animate) startBurgerArtAnimation(pre);
        });
    });
    setTimeout(() => fitBurgerGrillArt(container), 50);
}

function getBurgerFlipEls() {
    return {
        action: document.getElementById('burger-flip-action'),
        track: document.getElementById('burger-flip-track'),
        zone: document.getElementById('burger-flip-zone'),
        slider: document.getElementById('burger-flip-slider'),
        btn: document.getElementById('btn-burger-flip'),
    };
}

function wireBurgerFlipButton() {
    const { btn } = getBurgerFlipEls();
    if (!btn) return;
    btn.onclick = handleBurgerFlipPress;
}

function startBurgerFlipBar() {
    stopBurgerFlipBar();

    const { action, track, zone, slider, btn } = getBurgerFlipEls();
    if (!action || !track) return;

    const profile = getShiftProfile();
    const zoneWidthPct = (profile.passZoneWidth ?? 0.22) * 100;
    const passLeft = Math.random() * (100 - zoneWidthPct);

    burgerFlipState = {
        sliderPos: 0,
        direction: 1,
        sweepMs: profile.sweepMs ?? 1000,
        lastTick: performance.now(),
        passLeft,
        zoneWidthPct,
    };

    if (zone) {
        zone.style.width = `${zoneWidthPct}%`;
        zone.style.left = `${passLeft}%`;
    }
    if (slider) slider.style.left = '0%';
    if (btn) btn.disabled = false;

    action.classList.remove('hidden');
    action.classList.add('flex');

    burgerFlipState.timer = setInterval(burgerFlipBarTick, 16);
}

function burgerFlipBarTick() {
    if (!state.isShiftActive || !burgerFlipState) return;

    const now = performance.now();
    const dt = now - burgerFlipState.lastTick;
    burgerFlipState.lastTick = now;

    burgerFlipState.sliderPos += (dt / burgerFlipState.sweepMs) * burgerFlipState.direction;

    if (burgerFlipState.sliderPos >= 1) {
        burgerFlipState.sliderPos = 1;
        burgerFlipState.direction = -1;
    } else if (burgerFlipState.sliderPos <= 0) {
        burgerFlipState.sliderPos = 0;
        burgerFlipState.direction = 1;
    }

    const { slider, zone } = getBurgerFlipEls();
    if (slider) slider.style.left = `${burgerFlipState.sliderPos * 100}%`;

    if (zone && slider) {
        const zl = burgerFlipState.passLeft;
        const zr = zl + burgerFlipState.zoneWidthPct;
        const pos = burgerFlipState.sliderPos * 100;
        slider.classList.toggle('burger-flip-slider--hot', pos >= zl && pos <= zr);
    }
}

function handleBurgerFlipPress() {
    if (!state.isShiftActive || !burgerFlipState) return;

    const profile = getShiftProfile();
    const pos = burgerFlipState.sliderPos * 100;
    const zl = burgerFlipState.passLeft;
    const zr = zl + burgerFlipState.zoneWidthPct;
    const hit = pos >= zl && pos <= zr;

    const { zone, btn } = getBurgerFlipEls();

    if (hit) {
        awardBonus(profile.bonusBase, 50, 50);
        pulseBurgerCookFlash();
        boostBurgerSizzle(1500);
        if (btn) { btn.textContent = '✓ FLIPPED!'; setTimeout(() => { if (btn) btn.textContent = '[ FLIP ]'; }, 600); }
    } else {
        resetCombo();
        if (btn) { btn.textContent = '✗ MISS'; setTimeout(() => { if (btn) btn.textContent = '[ FLIP ]'; }, 500); }
    }

    const newLeft = Math.random() * (100 - burgerFlipState.zoneWidthPct);
    burgerFlipState.passLeft = newLeft;
    if (zone) zone.style.left = `${newLeft}%`;
}

function stopBurgerFlipBar() {
    if (burgerFlipState?.timer) clearInterval(burgerFlipState.timer);
    burgerFlipState = null;
    burgerSizzleBoostUntil = 0;

    const { action, btn } = getBurgerFlipEls();
    if (action) { action.classList.add('hidden'); action.classList.remove('flex'); }
    if (btn) btn.disabled = true;
    document.querySelector('.shift-ascii-burger')?.classList.remove('burger-sizzle-boost');
}
