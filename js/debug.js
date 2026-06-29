const DEBUG_CASH_PRESETS = [10, 50, 100, 500];

function isDebugMode() {
    return state.playerName === DEBUG_PLAYER_NAME;
}

function applyDebugBootstrap() {
    if (!isDebugMode()) return;

    Object.keys(state.unlockedApps).forEach(key => {
        state.unlockedApps[key] = true;
    });
    updateWorkAppLabel();
    updateAppMenu();
}

function debugGiveMoney(amount) {
    if (!isDebugMode()) return;

    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
        showToast('INVALID AMOUNT');
        return;
    }

    adjustCash(value);
    showToast(`+${formatMoney(value)}`);
    renderDebugMenu();
}

function debugAdjustHappiness(delta) {
    if (!isDebugMode()) return;
    ensureStatsState();
    adjustHappiness(delta);
    showToast(`HAPPINESS ${state.happiness}/10`);
    renderDebugMenu();
}

function debugAdvanceDay() {
    if (!isDebugMode()) return;
    if (state.isShiftActive) {
        showToast('END SHIFT FIRST');
        return;
    }

    state.shiftsCompleted++;
    advanceDay();
    showToast(`ADVANCED TO ${formatGameDate()}`);
    renderDebugMenu();
}

function debugGrantSkill(skillId) {
    if (!isDebugMode()) return;

    const skill = getSkill(skillId);
    if (!skill) {
        showToast('SKILL NOT FOUND');
        return;
    }

    if (hasSkill(skillId)) {
        showToast('ALREADY UNLOCKED');
        renderDebugMenu();
        return;
    }

    if (unlockSkill(skillId)) {
        playAchievementDing();
        notifySkillUnlocked(skillId);
        showToast(`UNLOCKED: ${skill.name}`);
    }

    renderDebugMenu();
}

function renderDebugSkills(container) {
    renderDebugButtonList(container, {
        title: 'GIVE SKILLS',
        emptyText: 'NO SKILLS LOADED',
        items: SKILLS_DB.map(skill => {
            const owned = hasSkill(skill.id);
            return {
                disabled: owned,
                html: `
                    <span class="flex flex-col gap-[2px] items-start">
                        <span class="font-bold">${escapeHtml(skill.name)}</span>
                        <span class="text-[8px] opacity-80">#${skill.id} · ${escapeHtml(skill.key || 'NO KEY')}</span>
                    </span>
                    <span>${owned ? 'OK' : '>'}</span>
                `,
                onClick: owned ? null : () => debugGrantSkill(skill.id),
            };
        }),
    });
}

function openDebugMenu() {
    if (!isDebugMode()) return;
    renderDebugMenu();
    switchView('debug-view');
}

function renderDebugMenu() {
    const container = document.getElementById('debug-event-list');
    if (!container) return;

    ensureStatsState();

    container.innerHTML = `
        <div class="text-[9px] mb-1 font-bold">GIVE MONEY</div>
        <div class="text-[9px] mb-2 opacity-80">CASH: ${formatMoney(state.cash)}</div>
        <div id="debug-cash-presets" class="grid grid-cols-2 gap-1 mb-2"></div>
        <div class="debug-cash-row mb-3">
            <input
                id="debug-cash-input"
                type="number"
                min="1"
                step="1"
                placeholder="AMOUNT"
                class="nokia-input debug-cash-input normal-case"
                onkeydown="if (event.key === 'Enter') debugGiveMoneyFromInput()"
            />
            <button type="button" onclick="debugGiveMoneyFromInput()" class="nokia-btn nokia-btn-outline debug-cash-add-btn">+</button>
        </div>
        <div class="text-[9px] mb-1 font-bold border-t border-dashed border-[var(--lcd-pixel)] pt-2">HAPPINESS</div>
        <div class="text-[9px] mb-2 opacity-80">CURRENT: ${state.happiness}/10</div>
        <div class="flex gap-1 mb-3">
            <button onclick="debugAdjustHappiness(-1)" class="nokia-btn nokia-btn-outline flex-1 py-1 text-[10px] justify-center">-1</button>
            <button onclick="debugAdjustHappiness(1)" class="nokia-btn nokia-btn-outline flex-1 py-1 text-[10px] justify-center">+1</button>
        </div>
        <div class="text-[9px] mb-1 font-bold border-t border-dashed border-[var(--lcd-pixel)] pt-2">TIME</div>
        <div class="text-[9px] mb-2 opacity-80">DATE: ${formatGameDate()} · SHIFT ${state.shiftsCompleted}</div>
        <button onclick="debugAdvanceDay()" class="nokia-btn nokia-btn-outline w-full py-1 text-[10px] justify-center mb-3">ADVANCE DAY</button>
    `;

    const presetContainer = document.getElementById('debug-cash-presets');
    DEBUG_CASH_PRESETS.forEach(amount => {
        const btn = document.createElement('button');
        btn.className = 'nokia-btn nokia-btn-outline w-full py-1 text-[10px]';
        btn.innerText = `+$${amount}`;
        btn.onclick = () => debugGiveMoney(amount);
        presetContainer.appendChild(btn);
    });

    renderDebugSkills(container);
    renderDebugJobs(container);

    const eventsHeader = document.createElement('div');
    eventsHeader.className = 'text-[9px] mb-1 font-bold border-t border-dashed border-[var(--lcd-pixel)] pt-2';
    eventsHeader.innerText = 'TRIGGER RANDOM EVENT';
    container.appendChild(eventsHeader);

    if (!EVENTS_DB.length) {
        const empty = document.createElement('div');
        empty.className = 'text-[9px] opacity-70';
        empty.innerText = 'NO EVENTS LOADED';
        container.appendChild(empty);
        return;
    }

    EVENTS_DB.forEach(eventDef => {
        const btn = document.createElement('button');
        btn.className = 'nokia-btn nokia-btn-outline w-full py-1 text-[10px] mb-1 normal-case';
        btn.innerHTML = `
            <span class="flex flex-col gap-[2px]">
                <span class="font-bold">${eventDef.id}</span>
                <span class="text-[8px] opacity-80">${eventDef.contact} · ${eventDef.schedule?.type || 'unknown'}</span>
            </span>
            <span>></span>
        `;
        btn.onclick = () => debugTriggerEvent(eventDef.id);
        container.appendChild(btn);
    });
}

function debugTriggerEvent(eventId) {
    if (!isDebugMode()) return;

    const eventDef = getEventById(eventId);
    if (!eventDef) {
        showToast('EVENT NOT FOUND');
        return;
    }

    triggerEvent(eventDef);
    showToast(`TRIGGERED: ${eventId}`);
    switchView('home-view');
}

function debugGiveMoneyFromInput() {
    const input = document.getElementById('debug-cash-input');
    if (!input) return;
    debugGiveMoney(input.value);
    input.value = '';
}

function renderDebugJobs(container) {
    renderDebugButtonList(container, {
        title: 'LAUNCH JOB MINIGAME',
        emptyText: 'NO JOBS LOADED',
        items: JOB_DB.map(job => ({
            html: `
                <span class="flex flex-col gap-[2px] items-start">
                    <span class="font-bold">${escapeHtml(job.title)}</span>
                    <span class="text-[8px] opacity-80">${formatMoney(job.pay)}/s · ${escapeHtml(job.id)}</span>
                </span>
                <span>></span>
            `,
            onClick: () => debugLaunchJobShift(job.title),
        })),
    });
}

function debugLaunchJobShift(jobTitle) {
    if (!isDebugMode()) return;

    if (state.isShiftActive) {
        showToast('END SHIFT FIRST');
        return;
    }

    const job = getJobByTitle(jobTitle);
    if (!job) {
        showToast('JOB NOT FOUND');
        return;
    }

    state.isUnemployed = false;
    state.firedFromJob = null;
    state.currentJobTitle = job.title;
    state.baseWagePerSec = job.pay;
    state.bossStrikes = 0;

    updateWorkAppLabel();
    switchView('job-view');
    updateShiftBriefing();
    startShift();
    showToast(`${job.title} SHIFT`);
}
