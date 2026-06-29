let TROPHIES_DB = [];
const TROPHY_BRANCH_LABELS = {
    work: 'WORK',
    career: 'CAREER',
    casino: 'CASINO',
    social: 'SOCIAL',
};

function getTrophyById(id) {
    return TROPHIES_DB.find(t => t.id === id) || null;
}

function hasTrophy(id) {
    return state.trophyIds.includes(id);
}

function isTrophyVisible(def) {
    if (!def.hidden) return true;
    if (hasTrophy(def.id)) return true;
    if (!def.parent) return false;
    return hasTrophy(def.parent);
}

function tryUnlockTrophy(id) {
    if (hasTrophy(id)) return false;

    const def = getTrophyById(id);
    if (!def) return false;
    if (def.parent && !hasTrophy(def.parent)) return false;

    state.trophyIds.push(id);
    showToast(`TROPHY: ${def.title}`);

    const view = document.getElementById('trophies-view');
    if (view && !view.classList.contains('hidden')) {
        renderTrophiesView();
    }

    return true;
}

function checkTrophyMilestones() {
    if (state.shiftsCompleted >= 2) tryUnlockTrophy('two_shifts');
    if (state.unlockedApps.cv) tryUnlockTrophy('cv_unlock');
    if (state.equippedCV.length > 0) tryUnlockTrophy('equip_cv');
    if (state.achievements.length >= 1) tryUnlockTrophy('skill_unlock');
    if (state.achievements.length >= 5) tryUnlockTrophy('five_skills');
    if (state.unlockedApps.cinder) tryUnlockTrophy('dating_app');

    const normalMatches = (state.cinder.matches || []).filter(id => id !== 'unknown');
    if (normalMatches.length >= 1) tryUnlockTrophy('first_match');

    ensureSkillProgress();
    if (state.skillProgress.blackjackWinnings >= 250) tryUnlockTrophy('bj_total_250');

    ensureStatsState();
    if (state.historyStats.interviewsTotal >= 10) tryUnlockTrophy('ten_interviews');
    if (state.historyStats.rentSpent > 0) tryUnlockTrophy('rent_paid');
}

function tryUnlockJobTierTrophy(jobTitle) {
    const map = {
        'BURGER FLIP': 'job_flip',
        'MANAGER': 'job_office',
        'DAY TRADER': 'job_market',
        'CEO': 'job_corner',
    };
    const id = map[jobTitle];
    if (id) tryUnlockTrophy(id);
}

function openTrophies() {
    openUnlockedApp('trophies', renderTrophiesView, 'trophies-view');
}

function renderTrophyCard(def) {
    const unlocked = hasTrophy(def.id);
    const title = unlocked ? def.title : (def.hidden ? '???' : def.title);
    const hint = unlocked || !def.hidden ? def.hint : 'Complete the prior trophy.';
    const cardCls = unlocked ? 'trophy-card trophy-card--unlocked' : 'trophy-card trophy-card--locked';
    const glyphCls = unlocked ? 'trophy-card-glyph' : 'trophy-card-glyph trophy-card-glyph--locked';

    return `
        <div class="${cardCls}" data-trophy-id="${def.id}">
            <div class="${glyphCls}" aria-hidden="true">${unlocked ? escapeHtml(def.glyph) : '?'}</div>
            <div class="trophy-card-body">
                <div class="trophy-card-title">${escapeHtml(title)}</div>
                <div class="trophy-card-hint normal-case">${escapeHtml(hint)}</div>
            </div>
        </div>
    `;
}

function renderTrophiesView() {
    const container = document.getElementById('trophies-content');
    const summary = document.getElementById('trophies-summary');
    if (!container) return;

    const visible = TROPHIES_DB.filter(isTrophyVisible);
    const unlockedCount = state.trophyIds.length;
    const totalCount = TROPHIES_DB.length;

    if (summary) {
        summary.textContent = `${unlockedCount} / ${totalCount}`;
    }

    const branches = ['work', 'career', 'casino', 'social'];
    let html = '';

    branches.forEach(branch => {
        const items = visible.filter(t => t.branch === branch);
        if (!items.length) return;

        html += `<div class="trophy-branch-label">${TROPHY_BRANCH_LABELS[branch] || branch.toUpperCase()}</div>`;
        html += '<div class="trophy-grid">';
        items.forEach(def => {
            html += renderTrophyCard(def);
        });
        html += '</div>';
    });

    container.innerHTML = html || '<div class="text-[9px] opacity-70 text-center py-4">NO TROPHIES LOADED</div>';
}
