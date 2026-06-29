function updateHUD() {
    elCash.innerText = formatMoney(state.cash);
    elRentTimer.innerText = formatGameDate();
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

function showToast(message) {
    const container = document.getElementById('toast-container');
    container.innerHTML = '';

    const toast = document.createElement('div');
    toast.className = 'toast-alert bg-[var(--lcd-pixel)] text-[var(--lcd-bg)] border-b-2 border-[var(--lcd-bg)] px-2 py-2 text-center w-full pointer-events-auto text-[10px]';
    toast.innerHTML = `<span class="blinking inline mr-1">!</span><span>${message}</span>`;

    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('toast-alert-visible'));

    setTimeout(() => {
        toast.classList.remove('toast-alert-visible');
        toast.classList.add('toast-alert-hide');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function openCasino() {
    openUnlockedApp('casino', () => {
        tryUnlockTrophy('casino_enter');
        checkTrophyMilestones();
    }, 'gamble-menu-view');
}
