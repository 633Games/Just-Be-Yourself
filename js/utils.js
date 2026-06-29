function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatMoney(amount) {
    return `$${Number(amount || 0).toFixed(2)}`;
}

function shuffleArray(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

function getOwnedSkillIds() {
    return state.achievements
        .map(normalizeSkillId)
        .filter(id => id !== null);
}

function computeJobMatch(jobReqs, source) {
    if (!jobReqs || jobReqs.length === 0) return 100;

    const skillIds = source === 'equipped' ? getEquippedSkillIds() : getOwnedSkillIds();
    let matches = 0;
    jobReqs.forEach(req => {
        const reqId = normalizeSkillId(req);
        if (reqId !== null && skillIds.includes(reqId)) matches++;
    });

    return Math.floor((matches / jobReqs.length) * 100);
}

function getShiftPerformanceTier(earned, manual) {
    if (manual) return 'early';
    const base = state.baseWagePerSec * state.shiftMaxTime;
    if (earned >= base * 1.15) return 'strong';
    if (earned >= base * 0.85) return 'decent';
    return 'slow';
}

function getShiftMoodLabel(manual, totalEarned) {
    if (manual) return 'EARLY OUT';
    const tier = getShiftPerformanceTier(totalEarned, false);
    if (tier === 'strong') return 'STRONG';
    if (tier === 'decent') return 'DECENT';
    return 'SLOW';
}

function openUnlockedApp(appKey, renderFn, viewId, lockedMessage) {
    if (!state.unlockedApps[appKey]) {
        showToast(lockedMessage || 'APP LOCKED');
        return false;
    }
    if (renderFn) renderFn();
    if (viewId) switchView(viewId);
    return true;
}

function fillTemplate(str, vars) {
    if (!str) return '';
    return str
        .replace(/\{(\w+)\}/gi, (_, key) => vars[key] ?? '')
        .replace(/\$\{(\w+)\}/g, (_, key) => vars[key] ?? '');
}

function renderDebugButtonList(container, config) {
    const header = document.createElement('div');
    header.className = 'text-[9px] mb-1 font-bold border-t border-dashed border-[var(--lcd-pixel)] pt-2';
    header.innerText = config.title;
    container.appendChild(header);

    if (!config.items.length) {
        const empty = document.createElement('div');
        empty.className = 'text-[9px] opacity-70 mb-3';
        empty.innerText = config.emptyText;
        container.appendChild(empty);
        return;
    }

    const list = document.createElement('div');
    list.className = 'flex flex-col gap-1 mb-3';
    container.appendChild(list);

    config.items.forEach(item => {
        const btn = document.createElement('button');
        btn.className = `nokia-btn nokia-btn-outline w-full py-1 text-[10px] mb-0 normal-case${item.disabled ? ' opacity-60' : ''}`;
        btn.disabled = Boolean(item.disabled);
        btn.innerHTML = item.html;
        if (item.onClick) btn.onclick = item.onClick;
        list.appendChild(btn);
    });
}
