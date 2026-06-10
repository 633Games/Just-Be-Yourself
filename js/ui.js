function updateHUD() {
    elCash.innerText = `$${state.cash.toFixed(2)}`;
    elRentTimer.innerText = formatGameDate();
}

function advanceDay() {
    const date = new Date(state.gameDateMs);
    date.setDate(date.getDate() + 1);
    state.gameDateMs = date.getTime();

    if (state.shiftsCompleted > 0 && state.shiftsCompleted % 7 === 0) {
        state.rentWeek++;
        state.rentPaidThisWeek = false;
        const rent = getWeeklyRent();
        setTimeout(() => {
            addMessage('MOM', `Week ${state.rentWeek}. Rent is $${rent.toFixed(2)} this week.`);
            state.messagesFlash = true;
            updateMessagesBadge();
        }, 800);
    }
    updateHUD();
}

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

    ['home-view', 'name-setup-view', 'job-view', 'cv-view', 'job-searcher-view', 'interview-view', 'gamble-menu-view', 'scratch-view', 'blackjack-view', 'messages-view', 'messages-thread-view'].forEach(id => {
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
    if (!state.unlockedApps.casino) {
        showToast('APP LOCKED');
        return;
    }
    switchView('gamble-menu-view');
}
