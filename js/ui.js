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
}

function showToast(message) {
    const container = document.getElementById('toast-container');
    container.innerHTML = ''; // Clear previous
    
    const toast = document.createElement('div');
    // Full-screen takeover alert style like old feature phones
    toast.className = `bg-[var(--lcd-pixel)] text-[var(--lcd-bg)] border-2 border-[var(--lcd-bg)] p-4 text-center w-full shadow-[0_0_0_4px_var(--lcd-pixel)] pointer-events-auto z-[100]`;
    toast.innerHTML = `<span class="blinking block mb-2">! ALERT !</span><span>${message}</span>`;
    
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
}

function openCasino() {
    if (!state.unlockedApps.casino) {
        showToast('APP LOCKED');
        return;
    }
    switchView('gamble-menu-view');
}
