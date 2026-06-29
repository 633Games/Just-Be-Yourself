const SKILL_IDS = {
    MISSION_DRIVEN: 1,
    HIGH_RESILIENCE: 2,
    RISK_TAKER: 3,
    RESULTS_ORIENTATED: 4,
    ANALYTICAL: 5,
    EMOTIONAL_INTELLIGENCE: 6,
    EXECUTIVE_NETWORK: 7,
    BROWN_NOSER: 8,
    CAPITAL_INVESTOR: 9,
    TECHNICALLY_PROFICIENT: 10,
};

const BLACKJACK_WINNINGS_THRESHOLD = 250;
const BOSS_THANKS_THRESHOLD = 5;
const STEVE_LEND_THRESHOLD = 2;
const INTERVIEW_COUNT_THRESHOLD = 10;
const GENEROSITY_SKILL_THRESHOLD = 150;

function ensureSkillProgress() {
    if (!state.skillProgress) {
        state.skillProgress = {
            blackjackWinnings: 0,
            bossThankCount: 0,
            steveLendCount: 0,
        };
    }
    if (typeof state.skillProgress.blackjackWinnings !== 'number') state.skillProgress.blackjackWinnings = 0;
    if (typeof state.skillProgress.bossThankCount !== 'number') state.skillProgress.bossThankCount = 0;
    if (typeof state.skillProgress.steveLendCount !== 'number') state.skillProgress.steveLendCount = 0;
}

function formatSkillDescription(id) {
    const raw = getSkillDescription(id);
    if (!raw) return '';
    return fillTemplate(raw, { name: state.playerName || 'mate' });
}

function tryUnlockSkill(id) {
    if (!unlockSkill(id)) return false;
    playAchievementDing();
    setTimeout(() => {
        notifySkillUnlocked(id);
        notifySusanJobOpportunities(id);
        checkTrophyMilestones();
    }, 800);
    return true;
}

function messageMatchesSwear(text) {
    const normalized = text.toLowerCase();
    return normalized.includes('fuck')
        || normalized.includes('shit')
        || normalized.includes("don't care")
        || normalized.includes('dont care');
}

function messageMatchesThanks(text) {
    const normalized = text.toLowerCase();
    return normalized.includes('thank you')
        || normalized.includes('thanks')
        || normalized.includes('thank');
}

function checkCasinoSkillUnlocks({ winAmount = 0, lostHugeAmount = false } = {}) {
    ensureSkillProgress();

    if (winAmount > 0) {
        state.skillProgress.blackjackWinnings += winAmount;
    }

    if (state.skillProgress.blackjackWinnings >= BLACKJACK_WINNINGS_THRESHOLD) {
        tryUnlockSkill(SKILL_IDS.RESULTS_ORIENTATED);
    }

    if (lostHugeAmount) {
        tryUnlockSkill(SKILL_IDS.RISK_TAKER);
    }
}

function checkGenerositySkillUnlock() {
    if (state.eventStats.moneyGiven >= GENEROSITY_SKILL_THRESHOLD) {
        tryUnlockSkill(SKILL_IDS.CAPITAL_INVESTOR);
    }
}

function checkEventSkillUnlocks({ eventId, choiceId } = {}) {
    if (eventId === 'lottery_scam' && choiceId === 'refuse') {
        tryUnlockSkill(SKILL_IDS.ANALYTICAL);
    }

    if (eventId === 'steve_car_crash' && choiceId === 'lend') {
        ensureSkillProgress();
        state.skillProgress.steveLendCount++;
        if (state.skillProgress.steveLendCount >= STEVE_LEND_THRESHOLD) {
            tryUnlockSkill(SKILL_IDS.EXECUTIVE_NETWORK);
        }
    }
}

function checkBossReplySkillUnlocks(playerText) {
    if (!playerText) return;

    if (messageMatchesSwear(playerText)) {
        tryUnlockSkill(SKILL_IDS.EMOTIONAL_INTELLIGENCE);
    }

    if (messageMatchesThanks(playerText)) {
        ensureSkillProgress();
        state.skillProgress.bossThankCount++;
        if (state.skillProgress.bossThankCount >= BOSS_THANKS_THRESHOLD) {
            tryUnlockSkill(SKILL_IDS.BROWN_NOSER);
        }
    }
}

function checkInterviewSkillUnlocks() {
    ensureStatsState();
    if (state.historyStats.interviewsTotal >= INTERVIEW_COUNT_THRESHOLD) {
        tryUnlockSkill(SKILL_IDS.TECHNICALLY_PROFICIENT);
    }
}

function getJobsRequiringSkill(skillId) {
    const id = normalizeSkillId(skillId);
    if (id === null) return [];
    return getSearchableJobs().filter(job => (job.req || []).some(req => normalizeSkillId(req) === id));
}

function calculatePotentialMatch(jobReqs) {
    return computeJobMatch(jobReqs, 'owned');
}

function notifySusanJobOpportunities(newSkillId) {
    if (!state.unlockedApps.jobs) return;

    const skillId = normalizeSkillId(newSkillId);
    const owned = getOwnedSkillIds();

    getSearchableJobs().forEach(job => {
        const reqs = (job.req || []).map(normalizeSkillId).filter(id => id !== null);
        if (reqs.length === 0) return;
        if (!reqs.includes(skillId)) return;
        if (!reqs.every(req => owned.includes(req))) return;

        addMessage('SUSAN', `Try JOB SEARCHER — ${job.title} looks like you now love x`);
        state.messagesFlash = true;
        updateMessagesBadge();
    });
}
