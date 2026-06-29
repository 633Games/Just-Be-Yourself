function updateHUD() {
    elCash.innerText = formatMoney(state.cash);
    elRentTimer.innerText = formatGameDate();
}

const CASH_GAIN_FLOATER_TEXT = '+$$$';
const CASH_SCALE_MAX = 1.2;
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
        elCash.classList.remove('cash-hud-pop', 'cash-hud-settle');
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
        elCash.classList.remove('cash-hud-settle');
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

function beginCashGainFxBurst(dingCount, totalMs) {
    const burstId = ++cashFxBurstId;
    if (cashFxResetTimer) clearTimeout(cashFxResetTimer);

    if (cashHudAnim) {
        cashHudAnim.cancel();
        cashHudAnim = null;
    }
    cashHudScale = 1;
    cashHudRotate = 0;
    elCash?.classList.remove('cash-hud-pop', 'cash-hud-settle');
    if (elCash) elCash.style.transform = '';

    cashFxResetTimer = setTimeout(() => {
        if (burstId !== cashFxBurstId) return;
        resetCashHudFx();
    }, totalMs + CASH_BURST_PAD_MS);
}

function onCashGainDing(stepIndex, total, durationMs) {
    if (!document.getElementById('cash-fx-layer') || !elCash) return;

    spawnCashGainFloater(CASH_GAIN_FLOATER_TEXT, durationMs, stepIndex, () => {
        hitCashHud(stepIndex, total, durationMs);
    });
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

    ['home-view', 'name-setup-view', 'job-view', 'cv-view', 'vip-jobs-view', 'job-searcher-view', 'interview-view', 'gamble-menu-view', 'scratch-view', 'blackjack-view', 'messages-view', 'messages-thread-view', 'stats-view', 'trophies-view', 'cinder-view', 'cinder-matches-view', 'debug-view'].forEach(id => {
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

function stripToastHtml(message) {
    return String(message)
        .replace(/<br\s*\/?>/gi, ' · ')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function finishTickerItem(container) {
    if (tickerAnim) {
        tickerAnim.cancel();
        tickerAnim = null;
    }
    container.innerHTML = '';
    tickerActive = false;
    drainTickerQueue();
}

function drainTickerQueue() {
    if (tickerActive || tickerQueue.length === 0) return;

    const container = document.getElementById('toast-container');
    if (!container) return;

    tickerActive = true;

    const text = tickerQueue.shift();
    container.innerHTML = '';

    const track = document.createElement('div');
    track.className = 'ticker-tape-track';
    track.innerHTML = `<span class="ticker-tape-text"><span class="blinking">!</span><span>${escapeHtml(text)}</span></span>`;
    container.appendChild(track);

    requestAnimationFrame(() => {
        const viewport = container.clientWidth;
        const travel = viewport + track.offsetWidth;
        const duration = Math.max(3500, Math.min(12000, (travel / 42) * 1000));

        tickerAnim = track.animate(
            [
                { transform: `translateX(${viewport}px)` },
                { transform: `translateX(-${track.offsetWidth}px)` },
            ],
            { duration, easing: 'linear', fill: 'forwards' }
        );

        tickerAnim.onfinish = () => finishTickerItem(container);
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
