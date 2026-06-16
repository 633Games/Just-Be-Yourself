const GAME_START_DATE = new Date(2005, 10, 15); // 15 Nov 2005

const state = {
    cash: 0.00,
    shiftsCompleted: 0,
    gameDateMs: GAME_START_DATE.getTime(),
    baseWeeklyRent: 50,
    rentIncreasePerWeek: 10,
    rentWeek: 1,
    rentPaidThisWeek: false,
    isShiftActive: false,
    shiftEarned: 0,
    shiftTimeElapsed: 0,
    shiftMaxTime: 60,
    baseWagePerSec: 0.30,
    shiftInterval: null,
    tipSpawnerInterval: null,
    // New CV State variables
    achievements: [],
    equippedCV: [],
    maxCVSlots: 2,
    availableJobs: [],
    // Interview State
    currentJobTitle: "PIZZA SHIFT",
    interview: null,
    // Casino State
    scratch: { active: false, boxes: [], won: false },
    bj: { bet: 1, deck: [], player: [], dealer: [], state: 'bet' }, // bet, play, over
    // Messages
    messages: [],
    messagesUnread: 0,
    bossStrikes: 0,
    isUnemployed: false,
    firedFromJob: null,
    shiftTipsCollected: 0,
    shiftCombo: 0,
    shiftBonusEarned: 0,
    shiftBonusRaw: 0,
    shiftComboBonus: 0,
    shiftArchetypeTimer: null,
    shiftManualEnd: false,
    playerName: '',
    messagesFlash: false,
    unlockedApps: {
        messages: false,
        work: false,
        cv: false,
        jobs: false,
        casino: false,
        stats: false,
        cinder: false,
        vipJobs: false
    },
    cinder: {
        introSeen: false,
        pool: [],
        deck: [],
        matches: [],
        unlockedContacts: [],
        lastRefillDateKey: null,
        crashSeen: false,
        crashOffered: false,
        swipeCount: 0
    },
    happiness: 5,
    eventHistory: {},
    activeEvents: [],
    eventStats: {
        moneyGiven: 0,
        moneyForced: 0,
        eventsAccepted: 0,
        eventsRefused: 0
    },
    historyStats: {
        jobEarnings: 0,
        casinoEarnings: 0,
        scratchJackpots: 0,
        rentSpent: 0,
        eventMoneyGiven: 0,
        interviewsTotal: 0,
        interviewsPassed: 0,
        interviewsFailed: 0
    },
    skillProgress: {
        blackjackWinnings: 0,
        bossThankCount: 0,
        steveLendCount: 0
    }
};

const DEBUG_PLAYER_NAME = 'Debug633';

const elCash = document.getElementById('ui-cash');
const elRentTimer = document.getElementById('ui-rent-timer');

const MESSAGE_SENDERS = {
    MOM: { label: 'MAM', preview: 'Family updates' },
    BOSS: { label: 'BOSS', preview: 'Work updates' },
    SUSAN: { label: 'AUNTY SUSAN', preview: 'CV help' },
    SKILLS: { label: 'SKILLS', preview: 'CV unlocks' }
};

function getWeeklyRent() {
    return state.baseWeeklyRent + (state.rentWeek - 1) * state.rentIncreasePerWeek;
}

function formatGameDate(ms = state.gameDateMs) {
    const d = new Date(ms);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${mm}/${dd}/${yy}`;
}
