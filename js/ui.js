function updateHUD() {
    finishCashHudStepAnimation();
    elCash.innerText = formatMoney(state.cash);
    elRentTimer.innerText = formatGameDate();
}

function setCashHudDisplay(amount) {
    if (elCash) elCash.innerText = formatMoney(amount);
}

function roundHudMoney(amount) {
    return Math.round((Number(amount) || 0) * 100) / 100;
}

function buildCashHudSteps(totalDelta, dingCount) {
    const totalCents = Math.round(Math.abs(totalDelta) * 100);
    const sign = totalDelta >= 0 ? 1 : -1;
    const baseCents = Math.floor(totalCents / dingCount);
    const remainder = totalCents - baseCents * dingCount;
    const steps = [];

    for (let i = 0; i < dingCount; i++) {
        const cents = baseCents + (i === dingCount - 1 ? remainder : 0);
        steps.push((sign * cents) / 100);
    }

    return steps;
}

let cashHudStepState = null;

function beginCashHudStepAnimation(startCash, delta, dingCount) {
    if (!dingCount || delta === 0) return;

    finishCashHudStepAnimation();
    cashHudStepState = {
        display: roundHudMoney(startCash),
        target: roundHudMoney(startCash + delta),
        steps: buildCashHudSteps(delta, dingCount),
    };
    setCashHudDisplay(cashHudStepState.display);
}

function tickCashHudOnDing(stepIndex) {
    if (!cashHudStepState || stepIndex >= cashHudStepState.steps.length) return;
    cashHudStepState.display = roundHudMoney(
        cashHudStepState.display + cashHudStepState.steps[stepIndex]
    );
    setCashHudDisplay(cashHudStepState.display);
}

function finishCashHudStepAnimation() {
    if (!cashHudStepState) return;
    cashHudStepState = null;
    if (elCash) elCash.innerText = formatMoney(state.cash);
}

const CASH_GAIN_FLOATER_TEXT = '+$$$';
const CASH_LOSS_FLOATER_TEXT = '-$$$';
const CASH_SCALE_MAX = 1.2;
const CASH_SCALE_MIN = 0.88;
const CASH_WOBBLE_DEG = 2.8;
const CASH_BURST_PAD_MS = 480;
const CASH_POP_EASE = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
const CASH_SETTLE_EASE = 'cubic-bezier(0.22, 1.12, 0.36, 1)';
const CASH_FLOATER_TRAVEL_PX = 20;

let cashFxBurstId = 0;
let cashFxResetTimer = null;
let cashHudScale = 1;
let cashHudRotate = 0;
let cashHudAnim = null;

function cashHudTransform(scale, rotate) {
    return `scale(${scale}) rotate(${rotate}deg)`;
}

function resetCashHudFx() {
    if (!elCash) return;

    if (cashHudAnim) {
        cashHudAnim.cancel();
        cashHudAnim = null;
    }

    if (cashHudScale <= 1.001 && Math.abs(cashHudRotate) < 0.05) {
        cashHudScale = 1;
        cashHudRotate = 0;
        elCash.classList.remove('cash-hud-pop', 'cash-hud-settle', 'cash-hud-loss', 'cash-hud-loss-settle');
        elCash.style.transform = '';
        return;
    }

    const fromScale = cashHudScale;
    const fromRotate = cashHudRotate;
    elCash.classList.remove('cash-hud-pop');
    elCash.classList.add('cash-hud-settle');

    cashHudAnim = elCash.animate(
        [
            { transform: cashHudTransform(fromScale, fromRotate) },
            { transform: cashHudTransform(1.04, fromRotate * 0.25) },
            { transform: cashHudTransform(1, 0) },
        ],
        {
            duration: Math.max(320, CASH_BURST_PAD_MS - 80),
            easing: CASH_SETTLE_EASE,
            fill: 'forwards',
        }
    );

    cashHudAnim.onfinish = () => {
        cashHudScale = 1;
        cashHudRotate = 0;
        elCash.classList.remove('cash-hud-settle', 'cash-hud-loss-settle');
        elCash.style.transform = '';
        cashHudAnim = null;
    };
}

function hitCashHud(stepIndex, total, landDurationMs) {
    if (!elCash) return;

    const progress = total > 0 ? (stepIndex + 1) / total : 1;
    const targetScale = Math.min(CASH_SCALE_MAX, 1 + progress * (CASH_SCALE_MAX - 1));
    const overshoot = Math.min(
        CASH_SCALE_MAX + 0.05,
        targetScale + Math.max(0.05, (targetScale - cashHudScale) * 0.55)
    );
    const wobbleDir = stepIndex % 2 === 0 ? -1 : 1;
    const targetRotate = wobbleDir * CASH_WOBBLE_DEG * (0.55 + progress * 0.45);
    const overshootRotate = targetRotate * 1.35;
    const popMs = Math.min(340, Math.max(130, landDurationMs * 0.42));

    if (cashHudAnim) {
        cashHudAnim.cancel();
        cashHudAnim = null;
    }

    elCash.classList.remove('cash-hud-settle');
    elCash.classList.add('cash-hud-pop');

    cashHudAnim = elCash.animate(
        [
            {
                transform: cashHudTransform(cashHudScale, cashHudRotate),
                filter: 'brightness(1)',
            },
            {
                transform: cashHudTransform(overshoot, overshootRotate),
                filter: 'brightness(1.14)',
            },
            {
                transform: cashHudTransform(targetScale, targetRotate),
                filter: 'brightness(1.05)',
            },
        ],
        {
            duration: popMs,
            easing: CASH_POP_EASE,
            fill: 'forwards',
        }
    );

    cashHudAnim.onfinish = () => {
        cashHudScale = targetScale;
        cashHudRotate = targetRotate;
        elCash.style.transform = cashHudTransform(targetScale, targetRotate);
        cashHudAnim = null;
    };
}

function spawnCashGainFloater(label, durationMs, stepIndex, onLand) {
    const layer = document.getElementById('cash-fx-layer');
    if (!layer || !elCash) return;

    const duration = Math.max(120, Number(durationMs) || 480);
    const fromLeft = stepIndex % 2 === 0;
    const travel = CASH_FLOATER_TRAVEL_PX;
    const half = travel / 2;
    const el = document.createElement('span');
    el.className = 'cash-gain-floater';
    el.textContent = label;
    el.style.setProperty('--cash-floater-duration', `${duration}ms`);
    el.style.setProperty('--floater-start-x', fromLeft ? `-${travel}px` : `${travel}px`);
    el.style.setProperty('--floater-start-y', `${travel}px`);
    el.style.setProperty('--floater-mid-x', fromLeft ? `-${half}px` : `${half}px`);
    el.style.setProperty('--floater-mid-y', `${half}px`);
    layer.appendChild(el);

    const landAt = duration * 0.68;
    setTimeout(() => {
        if (onLand) onLand();
    }, landAt);

    setTimeout(() => el.remove(), duration + 40);
}

function beginCashGainFxBurst(dingCount, totalMs, hudStart, hudDelta) {
    const burstId = ++cashFxBurstId;
    if (cashFxResetTimer) clearTimeout(cashFxResetTimer);

    if (cashHudAnim) {
        cashHudAnim.cancel();
        cashHudAnim = null;
    }
    cashHudScale = 1;
    cashHudRotate = 0;
    elCash?.classList.remove('cash-hud-pop', 'cash-hud-settle', 'cash-hud-loss', 'cash-hud-loss-settle');
    if (elCash) elCash.style.transform = '';

    if (hudDelta != null && hudStart != null) {
        beginCashHudStepAnimation(hudStart, hudDelta, dingCount);
    }

    cashFxResetTimer = setTimeout(() => {
        if (burstId !== cashFxBurstId) return;
        finishCashHudStepAnimation();
        resetCashHudFx();
    }, totalMs + CASH_BURST_PAD_MS);
}

function hitCashHudLoss(stepIndex, total, landDurationMs) {
    if (!elCash) return;

    const progress = total > 0 ? (stepIndex + 1) / total : 1;
    const targetScale = Math.max(CASH_SCALE_MIN, 1 - progress * (1 - CASH_SCALE_MIN));
    const undershoot = Math.max(
        CASH_SCALE_MIN - 0.04,
        targetScale - Math.max(0.04, (cashHudScale - targetScale) * 0.55)
    );
    const wobbleDir = stepIndex % 2 === 0 ? 1 : -1;
    const targetRotate = wobbleDir * CASH_WOBBLE_DEG * (0.55 + progress * 0.45);
    const undershootRotate = targetRotate * 1.35;
    const popMs = Math.min(340, Math.max(130, landDurationMs * 0.42));

    if (cashHudAnim) {
        cashHudAnim.cancel();
        cashHudAnim = null;
    }

    elCash.classList.remove('cash-hud-settle', 'cash-hud-loss-settle');
    elCash.classList.add('cash-hud-pop', 'cash-hud-loss');

    cashHudAnim = elCash.animate(
        [
            {
                transform: cashHudTransform(cashHudScale, cashHudRotate),
                filter: 'brightness(1)',
            },
            {
                transform: cashHudTransform(undershoot, undershootRotate),
                filter: 'brightness(0.82)',
            },
            {
                transform: cashHudTransform(targetScale, targetRotate),
                filter: 'brightness(0.9)',
            },
        ],
        {
            duration: popMs,
            easing: CASH_POP_EASE,
            fill: 'forwards',
        }
    );

    cashHudAnim.onfinish = () => {
        cashHudScale = targetScale;
        cashHudRotate = targetRotate;
        elCash.style.transform = cashHudTransform(targetScale, targetRotate);
        cashHudAnim = null;
    };
}

function resetCashHudLossFx() {
    if (!elCash) return;

    if (cashHudAnim) {
        cashHudAnim.cancel();
        cashHudAnim = null;
    }

    if (cashHudScale >= 0.999 && Math.abs(cashHudRotate) < 0.05) {
        cashHudScale = 1;
        cashHudRotate = 0;
        elCash.classList.remove('cash-hud-pop', 'cash-hud-loss', 'cash-hud-loss-settle');
        elCash.style.transform = '';
        return;
    }

    const fromScale = cashHudScale;
    const fromRotate = cashHudRotate;
    elCash.classList.remove('cash-hud-pop');
    elCash.classList.add('cash-hud-loss-settle');

    cashHudAnim = elCash.animate(
        [
            { transform: cashHudTransform(fromScale, fromRotate), filter: 'brightness(0.9)' },
            { transform: cashHudTransform(0.97, fromRotate * 0.25), filter: 'brightness(0.95)' },
            { transform: cashHudTransform(1, 0), filter: 'brightness(1)' },
        ],
        {
            duration: Math.max(320, CASH_BURST_PAD_MS - 80),
            easing: CASH_SETTLE_EASE,
            fill: 'forwards',
        }
    );

    cashHudAnim.onfinish = () => {
        cashHudScale = 1;
        cashHudRotate = 0;
        elCash.classList.remove('cash-hud-loss', 'cash-hud-loss-settle');
        elCash.style.transform = '';
        cashHudAnim = null;
    };
}

function spawnCashLossFloater(label, durationMs, stepIndex, onLand) {
    const layer = document.getElementById('cash-fx-layer');
    if (!layer || !elCash) return;

    const duration = Math.max(120, Number(durationMs) || 480);
    const drift = stepIndex % 2 === 0 ? -6 : 6;
    const el = document.createElement('span');
    el.className = 'cash-loss-floater';
    el.textContent = label;
    el.style.setProperty('--cash-floater-duration', `${duration}ms`);
    el.style.setProperty('--floater-drift-x', `${drift}px`);
    layer.appendChild(el);

    const landAt = duration * 0.32;
    setTimeout(() => {
        if (onLand) onLand();
    }, landAt);

    setTimeout(() => el.remove(), duration + 40);
}

function beginCashLossFxBurst(dingCount, totalMs, hudStart, hudDelta) {
    const burstId = ++cashFxBurstId;
    if (cashFxResetTimer) clearTimeout(cashFxResetTimer);

    if (cashHudAnim) {
        cashHudAnim.cancel();
        cashHudAnim = null;
    }
    cashHudScale = 1;
    cashHudRotate = 0;
    elCash?.classList.remove('cash-hud-pop', 'cash-hud-settle', 'cash-hud-loss-settle');
    elCash?.classList.add('cash-hud-loss');
    if (elCash) elCash.style.transform = '';

    if (hudDelta != null && hudStart != null) {
        beginCashHudStepAnimation(hudStart, hudDelta, dingCount);
    }

    cashFxResetTimer = setTimeout(() => {
        if (burstId !== cashFxBurstId) return;
        finishCashHudStepAnimation();
        resetCashHudLossFx();
    }, totalMs + CASH_BURST_PAD_MS);
}

function onCashLossDing(stepIndex, total, durationMs) {
    if (!document.getElementById('cash-fx-layer') || !elCash) return;

    tickCashHudOnDing(stepIndex);

    spawnCashLossFloater(CASH_LOSS_FLOATER_TEXT, durationMs, stepIndex, () => {
        hitCashHudLoss(stepIndex, total, durationMs);
    });
}

function onCashGainDing(stepIndex, total, durationMs) {
    if (!document.getElementById('cash-fx-layer') || !elCash) return;

    tickCashHudOnDing(stepIndex);

    spawnCashGainFloater(CASH_GAIN_FLOATER_TEXT, durationMs, stepIndex, () => {
        hitCashHud(stepIndex, total, durationMs);
    });
}

const targetHudFxState = new Map();
let targetFxBurstId = 0;
let targetFxResetTimer = null;

function getTargetHudFxState(el) {
    if (!targetHudFxState.has(el)) {
        targetHudFxState.set(el, { scale: 1, rotate: 0, anim: null });
    }
    return targetHudFxState.get(el);
}

function hitCashHudOn(el, stepIndex, total, landDurationMs) {
    if (!el) return;

    const fx = getTargetHudFxState(el);
    const progress = total > 0 ? (stepIndex + 1) / total : 1;
    const targetScale = Math.min(CASH_SCALE_MAX, 1 + progress * (CASH_SCALE_MAX - 1));
    const overshoot = Math.min(
        CASH_SCALE_MAX + 0.05,
        targetScale + Math.max(0.05, (targetScale - fx.scale) * 0.55)
    );
    const wobbleDir = stepIndex % 2 === 0 ? -1 : 1;
    const targetRotate = wobbleDir * CASH_WOBBLE_DEG * (0.55 + progress * 0.45);
    const overshootRotate = targetRotate * 1.35;
    const popMs = Math.min(340, Math.max(130, landDurationMs * 0.42));

    if (fx.anim) {
        fx.anim.cancel();
        fx.anim = null;
    }

    el.classList.remove('cash-hud-settle');
    el.classList.add('cash-hud-pop');

    fx.anim = el.animate(
        [
            {
                transform: cashHudTransform(fx.scale, fx.rotate),
                filter: 'brightness(1)',
            },
            {
                transform: cashHudTransform(overshoot, overshootRotate),
                filter: 'brightness(1.14)',
            },
            {
                transform: cashHudTransform(targetScale, targetRotate),
                filter: 'brightness(1.05)',
            },
        ],
        {
            duration: popMs,
            easing: CASH_POP_EASE,
            fill: 'forwards',
        }
    );

    fx.anim.onfinish = () => {
        fx.scale = targetScale;
        fx.rotate = targetRotate;
        el.style.transform = cashHudTransform(targetScale, targetRotate);
        fx.anim = null;
    };
}

function resetTargetHudFx(el) {
    if (!el) return;

    const fx = getTargetHudFxState(el);
    if (fx.anim) {
        fx.anim.cancel();
        fx.anim = null;
    }

    if (fx.scale <= 1.001 && Math.abs(fx.rotate) < 0.05) {
        fx.scale = 1;
        fx.rotate = 0;
        el.classList.remove('cash-hud-pop', 'cash-hud-settle');
        el.style.transform = '';
        return;
    }

    const fromScale = fx.scale;
    const fromRotate = fx.rotate;
    el.classList.remove('cash-hud-pop');
    el.classList.add('cash-hud-settle');

    fx.anim = el.animate(
        [
            { transform: cashHudTransform(fromScale, fromRotate) },
            { transform: cashHudTransform(1.04, fromRotate * 0.25) },
            { transform: cashHudTransform(1, 0) },
        ],
        {
            duration: Math.max(320, CASH_BURST_PAD_MS - 80),
            easing: CASH_SETTLE_EASE,
            fill: 'forwards',
        }
    );

    fx.anim.onfinish = () => {
        fx.scale = 1;
        fx.rotate = 0;
        el.classList.remove('cash-hud-settle');
        el.style.transform = '';
        fx.anim = null;
    };
}

function spawnCashGainFloaterOnTarget(targetEl, label, durationMs, stepIndex, onLand) {
    const layer = document.getElementById('cash-fx-layer');
    if (!layer || !targetEl) return;

    const duration = Math.max(120, Number(durationMs) || 480);
    const fromLeft = stepIndex % 2 === 0;
    const travel = CASH_FLOATER_TRAVEL_PX;
    const half = travel / 2;
    const layerRect = layer.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();
    const centerX = targetRect.left + targetRect.width / 2 - layerRect.left;
    const centerY = targetRect.top + targetRect.height / 2 - layerRect.top;

    const el = document.createElement('span');
    el.className = 'cash-gain-floater';
    el.textContent = label;
    el.style.left = `${centerX}px`;
    el.style.top = `${centerY}px`;
    el.style.setProperty('--cash-floater-duration', `${duration}ms`);
    el.style.setProperty('--floater-start-x', fromLeft ? `-${travel}px` : `${travel}px`);
    el.style.setProperty('--floater-start-y', `${travel}px`);
    el.style.setProperty('--floater-mid-x', fromLeft ? `-${half}px` : `${half}px`);
    el.style.setProperty('--floater-mid-y', `${half}px`);
    layer.appendChild(el);

    const landAt = duration * 0.68;
    setTimeout(() => {
        if (onLand) onLand();
    }, landAt);

    setTimeout(() => el.remove(), duration + 40);
}

function onCashGainDingForTarget(targetEl, stepIndex, total, durationMs) {
    if (!document.getElementById('cash-fx-layer') || !targetEl) return;

    spawnCashGainFloaterOnTarget(targetEl, CASH_GAIN_FLOATER_TEXT, durationMs, stepIndex, () => {
        hitCashHudOn(targetEl, stepIndex, total, durationMs);
    });
}

function beginCashGainFxBurstForTargets(targetIds, dingCount, totalMs) {
    const burstId = ++targetFxBurstId;
    if (targetFxResetTimer) clearTimeout(targetFxResetTimer);

    const targets = targetIds
        .map(id => document.getElementById(id))
        .filter(Boolean);

    targets.forEach(el => {
        const fx = getTargetHudFxState(el);
        if (fx.anim) {
            fx.anim.cancel();
            fx.anim = null;
        }
        fx.scale = 1;
        fx.rotate = 0;
        el.classList.remove('cash-hud-pop', 'cash-hud-settle');
        el.style.transform = '';
    });

    targetFxResetTimer = setTimeout(() => {
        if (burstId !== targetFxBurstId) return;
        targets.forEach(el => resetTargetHudFx(el));
    }, totalMs + CASH_BURST_PAD_MS);
}

function advanceDay() {
    const prevDate = new Date(state.gameDateMs);
    const prevMonth = prevDate.getMonth();

    processEventDeadlines();

    const date = new Date(state.gameDateMs);
    date.setDate(date.getDate() + 1);
    state.gameDateMs = date.getTime();

    const monthChanged = date.getMonth() !== prevMonth;

    if (state.shiftsCompleted > 0 && state.shiftsCompleted % 7 === 0) {
        state.rentWeek++;
        state.rentPaidThisWeek = false;
        const rent = getWeeklyRent();
        setTimeout(() => {
            addMessage('MOM', `Week ${state.rentWeek}. Rent is ${formatMoney(rent)} this week.`);
            state.messagesFlash = true;
            updateMessagesBadge();
        }, 800);
    }

    tryRollRandomEvents({ monthChanged });
    if (typeof tryDailyCinderRefill === 'function') {
        tryDailyCinderRefill();
    }
    updateHUD();
}

const APP_BEEP_VIEWS = new Set([
    'job-view',
    'messages-view',
    'cv-view',
    'vip-jobs-view',
    'job-searcher-view',
    'gamble-menu-view',
    'scratch-view',
    'blackjack-view',
    'snake-view',
    'stats-view',
    'trophies-view',
    'cinder-view',
    'cinder-matches-view',
    'debug-view',
]);

let activeViewId = null;

function switchView(viewId) {
    if (state.isShiftActive && viewId !== 'job-view') {
        showToast("CANNOT ABORT");
        return;
    }

    const targetView = document.getElementById(viewId);
    if (!targetView) {
        showToast("SYSTEM ERROR");
        return;
    }

    ['home-view', 'name-setup-view', 'job-view', 'cv-view', 'vip-jobs-view', 'job-searcher-view', 'interview-view', 'gamble-menu-view', 'scratch-view', 'blackjack-view', 'snake-view', 'messages-view', 'messages-thread-view', 'stats-view', 'trophies-view', 'cinder-view', 'cinder-matches-view', 'debug-view'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.add('hidden');
            el.classList.remove('flex');
        }
    });
    
    targetView.classList.remove('hidden');
    targetView.classList.add('flex');

    if (viewId === 'job-view' && typeof updateShiftBriefing === 'function') {
        updateShiftBriefing();
    }

    if (viewId === 'stats-view' && typeof renderStats === 'function') {
        renderStats();
    }

    if (viewId === 'cinder-view' && typeof renderCinderScreen === 'function') {
        renderCinderScreen();
    }

    if (viewId === 'trophies-view' && typeof renderTrophiesView === 'function') {
        renderTrophiesView();
    }

    if (APP_BEEP_VIEWS.has(viewId)) {
        playAppBeep();
    } else if (
        viewId === 'home-view'
        && activeViewId
        && activeViewId !== 'home-view'
        && activeViewId !== 'name-setup-view'
    ) {
        playAppBackBeep();
    }

    activeViewId = viewId;
}

let tickerQueue = [];
let tickerActive = false;
let tickerAnim = null;

const TICKER_BASE_PX_PER_SEC = 52;
const TICKER_BACKLOG_SPEED_STEP = 0.55;
const TICKER_MAX_PX_PER_SEC = 180;
const TICKER_MIN_DURATION_MS = 900;
const TICKER_MAX_DURATION_MS = 10000;

function getTickerScrollSpeedPxPerSec() {
    const backlog = tickerQueue.length + (tickerActive ? 1 : 0);
    const boost = 1 + Math.max(0, backlog - 1) * TICKER_BACKLOG_SPEED_STEP;
    return Math.min(TICKER_MAX_PX_PER_SEC, TICKER_BASE_PX_PER_SEC * boost);
}

function getTickerDurationMs(travelPx) {
    const pxPerSec = getTickerScrollSpeedPxPerSec();
    return Math.max(
        TICKER_MIN_DURATION_MS,
        Math.min(TICKER_MAX_DURATION_MS, (travelPx / pxPerSec) * 1000)
    );
}

function stripToastHtml(message) {
    return String(message)
        .replace(/<br\s*\/?>/gi, ' · ')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function finishTickerItem(viewport) {
    if (tickerAnim) {
        tickerAnim.cancel();
        tickerAnim = null;
    }
    if (viewport) viewport.innerHTML = '';
    tickerActive = false;
    drainTickerQueue();
}

function drainTickerQueue() {
    if (tickerActive || tickerQueue.length === 0) return;

    const viewport = document.getElementById('ticker-tape-viewport');
    if (!viewport) return;

    tickerActive = true;

    const text = tickerQueue.shift();
    viewport.innerHTML = '';

    const track = document.createElement('div');
    track.className = 'ticker-tape-track';
    track.innerHTML = `<span class="ticker-tape-text"><span class="blinking">!</span><span>${escapeHtml(text)}</span></span>`;
    viewport.appendChild(track);

    requestAnimationFrame(() => {
        const viewportWidth = viewport.clientWidth;
        const travel = viewportWidth + track.offsetWidth;
        const duration = getTickerDurationMs(travel);

        tickerAnim = track.animate(
            [
                { transform: `translateX(${viewportWidth}px)` },
                { transform: `translateX(-${track.offsetWidth}px)` },
            ],
            { duration, easing: 'linear', fill: 'forwards' }
        );

        tickerAnim.onfinish = () => finishTickerItem(viewport);
        tickerAnim.oncancel = () => {};
    });
}

function showToast(message) {
    const text = stripToastHtml(message);
    if (!text) return;
    tickerQueue.push(text);
    drainTickerQueue();
}

function openCasino() {
    openUnlockedApp('casino', () => {
        tryUnlockTrophy('casino_enter');
        checkTrophyMilestones();
    }, 'gamble-menu-view');
}
