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
    baseWagePerSec: 0.50,
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
    shiftTipsCollected: 0,
    playerName: '',
    messagesFlash: false,
    unlockedApps: {
        messages: false,
        work: false,
        cv: false,
        jobs: false,
        casino: false
    }
};

const elCash = document.getElementById('ui-cash');
const elRentTimer = document.getElementById('ui-rent-timer');

const MESSAGE_SENDERS = {
    MOM: { label: 'MAM', preview: 'Family updates' },
    BOSS: { label: 'BOSS', preview: 'Work updates' },
    SUSAN: { label: 'AUNTY SUSAN', preview: 'CV help' },
    SKILLS: { label: 'SKILLS', preview: 'CV unlocks' }
};

// Master Database of all possible jobs in the game
const JOB_DB = [
    { id: 'j1', title: 'DISHWASHER', pay: 0.80, req: ['NO-LIFE'] },
    { id: 'j2', title: 'BURGER FLIP', pay: 1.20, req: ['NO-LIFE', 'FAST-HANDS'] },
    { id: 'j3', title: 'CASHIER', pay: 1.50, req: ['MATH-WIZ'] },
    { id: 'j4', title: 'MANAGER', pay: 3.00, req: ['NO-LIFE', 'MATH-WIZ', 'YELLING'] },
    { id: 'j5', title: 'CEO', pay: 50.00, req: ['NEPOTISM', 'GOLF'] },
    { id: 'j6', title: 'SIGN SPINNER', pay: 1.00, req: ['NO-SHAME'] },
    { id: 'j7', title: 'DATA ENTRY', pay: 1.80, req: ['NO-LIFE', 'TYPING'] },
    { id: 'j8', title: 'DAY TRADER', pay: 12.00, req: ['RISK-TAKER'] }
];

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
