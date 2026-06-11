const HAPPINESS_MIN = 0;
const HAPPINESS_MAX = 10;

const DEFAULT_HISTORY_STATS = {
    jobEarnings: 0,
    casinoEarnings: 0,
    scratchJackpots: 0,
    rentSpent: 0,
    eventMoneyGiven: 0,
    interviewsTotal: 0,
    interviewsPassed: 0,
    interviewsFailed: 0
};

function ensureStatsState() {
    if (typeof state.happiness !== 'number') state.happiness = 5;

    if (!state.historyStats) state.historyStats = { ...DEFAULT_HISTORY_STATS };
    Object.keys(DEFAULT_HISTORY_STATS).forEach(key => {
        if (typeof state.historyStats[key] !== 'number') state.historyStats[key] = 0;
    });

    if (!state.eventStats) {
        state.eventStats = {
            moneyGiven: 0,
            moneyForced: 0,
            eventsAccepted: 0,
            eventsRefused: 0
        };
    }
}

function refreshStatsView() {
    const view = document.getElementById('stats-view');
    if (!view || view.classList.contains('hidden')) return;
    renderStats();
}

function adjustHappiness(delta) {
    ensureStatsState();
    state.happiness = Math.max(HAPPINESS_MIN, Math.min(HAPPINESS_MAX, state.happiness + delta));
    refreshStatsView();
}

function recordJobEarnings(amount) {
    ensureStatsState();
    if (amount > 0) state.historyStats.jobEarnings += amount;
    refreshStatsView();
}

function recordCasinoWin(amount) {
    ensureStatsState();
    if (amount <= 0) return;
    state.historyStats.casinoEarnings += amount;
    adjustHappiness(3);
    refreshStatsView();
}

function recordScratchJackpot() {
    ensureStatsState();
    state.historyStats.scratchJackpots++;
    refreshStatsView();
}

function recordRentPaid(amount) {
    ensureStatsState();
    state.historyStats.rentSpent += amount;
    adjustHappiness(-1);
    refreshStatsView();
}

function recordShiftCompleted() {
    ensureStatsState();
    adjustHappiness(-1);
}

function recordNewJob() {
    ensureStatsState();
    adjustHappiness(2);
    refreshStatsView();
}

function recordInterviewStarted() {
    ensureStatsState();
    state.historyStats.interviewsTotal++;
    checkInterviewSkillUnlocks();
    refreshStatsView();
}

function recordInterviewPassed() {
    ensureStatsState();
    state.historyStats.interviewsPassed++;
    refreshStatsView();
}

function recordInterviewFailed() {
    ensureStatsState();
    state.historyStats.interviewsFailed++;
    refreshStatsView();
}

function recordEventMoneyGiven(amount) {
    ensureStatsState();
    if (amount > 0) state.historyStats.eventMoneyGiven += amount;
    refreshStatsView();
}

function recordEventPaymentHappiness() {
    ensureStatsState();
    adjustHappiness(-1);
}

function recordEventRefusedHappiness() {
    ensureStatsState();
    adjustHappiness(-3);
    refreshStatsView();
}

function getTotalEventMoneyGiven() {
    ensureStatsState();
    return state.historyStats.eventMoneyGiven;
}

function formatMoney(amount) {
    return `$${Number(amount || 0).toFixed(2)}`;
}

function openStats() {
    if (!state.unlockedApps.stats) {
        showToast('APP LOCKED');
        return;
    }
    ensureStatsState();
    renderStats();
    switchView('stats-view');
}

function renderStats() {
    ensureStatsState();
    const container = document.getElementById('stats-content');
    if (!container) return;

    const h = state.happiness;
    const hist = state.historyStats;

    container.innerHTML = `
        <div class="text-[10px] font-bold mb-2 border-b-2 border-dashed border-[var(--lcd-pixel)] pb-1">CURRENT</div>
        <div class="flex justify-between text-[10px] mb-3">
            <span>HAPPINESS</span>
            <span class="font-bold">${h}/${HAPPINESS_MAX}</span>
        </div>
        <div class="happiness-bar w-full h-2 border border-[var(--lcd-pixel)] mb-4">
            <div class="happiness-bar-fill h-full bg-[var(--lcd-pixel)]" style="width:${(h / HAPPINESS_MAX) * 100}%"></div>
        </div>

        <div class="text-[10px] font-bold mb-2 border-b-2 border-dashed border-[var(--lcd-pixel)] pb-1">HISTORY</div>
        <div class="flex flex-col gap-1 text-[9px]">
            <div class="flex justify-between"><span>JOB EARNINGS</span><span>${formatMoney(hist.jobEarnings)}</span></div>
            <div class="flex justify-between"><span>CASINO EARNINGS</span><span>${formatMoney(hist.casinoEarnings)}</span></div>
            <div class="flex justify-between"><span>SCRATCH JACKPOTS</span><span>${hist.scratchJackpots}</span></div>
            <div class="flex justify-between"><span>RENT PAID</span><span>${formatMoney(hist.rentSpent)}</span></div>
            <div class="flex justify-between"><span>EVENT MONEY GIVEN</span><span>${formatMoney(hist.eventMoneyGiven)}</span></div>
            <div class="flex justify-between"><span>INTERVIEWS</span><span>${hist.interviewsTotal}</span></div>
            <div class="flex justify-between"><span>INTERVIEWS PASSED</span><span>${hist.interviewsPassed}</span></div>
            <div class="flex justify-between"><span>INTERVIEWS FAILED</span><span>${hist.interviewsFailed}</span></div>
        </div>
    `;
}
