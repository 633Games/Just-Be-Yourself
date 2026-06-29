const DAILY_CINDER_BATCH = 3;
const CINDER_CRASH_PROFILE_ID = 'unknown';

function getNormalCinderProfileIds() {
    return (CINDER_DB.profiles || [])
        .map(p => p.id)
        .filter(id => id && id !== CINDER_CRASH_PROFILE_ID && !isCinderCrashProfile(getCinderProfileById(id)));
}

function ensureCinderPool() {
    const matched = new Set(state.cinder.matches);
    const inDeck = new Set(state.cinder.deck);
    const allIds = getNormalCinderProfileIds();
    allIds.forEach(id => {
        if (!matched.has(id) && !inDeck.has(id) && !state.cinder.pool.includes(id)) {
            state.cinder.pool.push(id);
        }
    });
    state.cinder.pool = state.cinder.pool.filter(id => !matched.has(id) && !inDeck.has(id));
}

function maybeInjectCrashProfile() {
    if (state.cinder.crashSeen || state.cinder.deck.includes(CINDER_CRASH_PROFILE_ID)) return;

    const swipeTotal = state.cinder.swipeCount || 0;
    const force = swipeTotal >= 4 && !state.cinder.crashOffered;
    const random = Math.random() < 0.18;

    if (force || random) {
        state.cinder.deck.unshift(CINDER_CRASH_PROFILE_ID);
        state.cinder.crashOffered = true;
        tryUnlockTrophy('unknown_profile');
    }
}

function addProfilesToCinderDeck(count) {
    ensureCinderPool();
    const picked = [];
    for (let i = 0; i < count && state.cinder.pool.length > 0; i++) {
        const idx = Math.floor(Math.random() * state.cinder.pool.length);
        const [id] = state.cinder.pool.splice(idx, 1);
        picked.push(id);
    }
    state.cinder.deck.push(...picked);
    maybeInjectCrashProfile();
    return picked.length;
}

function tryDailyCinderRefill() {
    if (!state.unlockedApps.cinder) return 0;
    const todayKey = formatGameDate();
    if (state.cinder.lastRefillDateKey === todayKey) return 0;
    state.cinder.lastRefillDateKey = todayKey;
    return addProfilesToCinderDeck(DAILY_CINDER_BATCH);
}

function returnCinderProfileToPool(profileId) {
    if (!profileId || profileId === CINDER_CRASH_PROFILE_ID || state.cinder.matches.includes(profileId)) return;
    if (!state.cinder.pool.includes(profileId)) {
        state.cinder.pool.push(profileId);
    }
}

function getCurrentCinderProfileId() {
    return state.cinder.deck[0] || null;
}

function showCinderIntro() {
    document.getElementById('cinder-intro')?.classList.remove('hidden');
    document.getElementById('cinder-browse-body')?.classList.add('hidden');
    document.getElementById('cinder-browse-footer')?.classList.add('hidden');
    document.getElementById('cinder-intro-footer')?.classList.remove('hidden');
}

function showCinderBrowse() {
    document.getElementById('cinder-intro')?.classList.add('hidden');
    document.getElementById('cinder-browse-body')?.classList.remove('hidden');
    document.getElementById('cinder-browse-footer')?.classList.remove('hidden');
    document.getElementById('cinder-intro-footer')?.classList.add('hidden');
}

function renderCinderScreen() {
    if (!state.cinder.introSeen) {
        showCinderIntro();
        return;
    }
    showCinderBrowse();
    renderCinderProfile();
}

function openCinder() {
    openUnlockedApp('cinder', renderCinderScreen, 'cinder-view');
}

function cinderContinueFromIntro() {
    state.cinder.introSeen = true;
    tryDailyCinderRefill();
    showCinderBrowse();
    renderCinderProfile();
}

function setCinderGlitchMode(isGlitch) {
    const cardEl = document.getElementById('cinder-card');
    const faceWrap = document.getElementById('cinder-face-wrap');
    const nameEl = document.getElementById('cinder-name');
    const bioEl = document.getElementById('cinder-bio');
    const glitchFields = document.getElementById('cinder-glitch-fields');
    const passBtn = document.getElementById('cinder-btn-pass');
    const likeBtn = document.getElementById('cinder-btn-like');
    const matchesBtn = document.getElementById('cinder-matches-btn');
    const actionsEl = document.getElementById('cinder-actions');

    cardEl?.classList.toggle('cinder-card--glitch', isGlitch);
    const faceEl = document.getElementById('cinder-face');
    const hasGlitchFace = Boolean(CINDER_FACES[CINDER_CRASH_PROFILE_ID]);
    faceWrap?.classList.toggle('hidden', isGlitch && !hasGlitchFace);
    faceEl?.classList.toggle('cinder-face--glitch', isGlitch);
    nameEl?.classList.toggle('hidden', isGlitch);
    bioEl?.classList.toggle('hidden', isGlitch);
    glitchFields?.classList.toggle('hidden', !isGlitch);
    passBtn?.classList.toggle('hidden', isGlitch);
    matchesBtn?.classList.toggle('hidden', isGlitch);
    actionsEl?.classList.toggle('cinder-actions--solo', isGlitch);

    if (likeBtn) {
        likeBtn.innerText = isGlitch ? '[ ♥ MATCH ]' : '[ ♥ LIKE ]';
        likeBtn.classList.toggle('cinder-glitch-btn', isGlitch);
    }
}

function renderCinderProfile() {
    const cardEl = document.getElementById('cinder-card');
    const emptyEl = document.getElementById('cinder-empty');
    const actionsEl = document.getElementById('cinder-actions');
    const matchesBtn = document.getElementById('cinder-matches-btn');
    if (!cardEl || !emptyEl) return;

    const profileId = getCurrentCinderProfileId();
    const matchCount = state.cinder.matches.length;

    if (matchesBtn) {
        matchesBtn.innerText = `[ MATCHES (${matchCount}) ]`;
    }

    if (!profileId) {
        setCinderGlitchMode(false);
        cardEl.classList.add('hidden');
        if (actionsEl) actionsEl.classList.remove('hidden');
        if (actionsEl?.parentElement) actionsEl.parentElement.classList.remove('hidden');
        emptyEl.classList.remove('hidden');
        emptyEl.textContent = 'NO NEW PROFILES TODAY. CHECK BACK TOMORROW.';
        return;
    }

    emptyEl.classList.add('hidden');
    cardEl.classList.remove('hidden');
    if (actionsEl) actionsEl.classList.remove('hidden');
    if (actionsEl?.parentElement) actionsEl.parentElement.classList.remove('hidden');

    const profile = getCinderProfileById(profileId);
    if (!profile) return;

    const isGlitch = isCinderCrashProfile(profile);
    setCinderGlitchMode(isGlitch);

    if (isGlitch) {
        const faceEl = document.getElementById('cinder-face');
        if (faceEl) faceEl.textContent = CINDER_FACES[profileId] || '';
        scheduleCinderFaceFit();
        return;
    }

    const faceEl = document.getElementById('cinder-face');
    const nameEl = document.getElementById('cinder-name');
    const bioEl = document.getElementById('cinder-bio');

    if (faceEl) {
        faceEl.textContent = CINDER_FACES[profileId] || '';
        faceEl.classList.remove('cinder-face--glitch');
    }
    if (nameEl) nameEl.textContent = `${profile.name}, ${profile.age}`;
    if (bioEl) bioEl.textContent = generateCinderBio(profile);

    scheduleCinderFaceFit();
}

function fitCinderFace() {
    const wrap = document.getElementById('cinder-face-wrap');
    const stack = document.getElementById('cinder-face-stack');
    const face = document.getElementById('cinder-face');
    if (!wrap || !stack || !face || !face.textContent.trim()) return;

    stack.style.setProperty('--cinder-face-scale', '1');
    const wrapWidth = wrap.clientWidth;
    const wrapHeight = wrap.clientHeight;
    const faceWidth = face.scrollWidth;
    const faceHeight = face.scrollHeight;
    if (wrapWidth <= 0 || faceWidth <= 0 || wrapHeight <= 0 || faceHeight <= 0) return;

    const scale = Math.min(1, wrapWidth / faceWidth, wrapHeight / faceHeight);
    stack.style.setProperty('--cinder-face-scale', String(scale));
}

function scheduleCinderFaceFit() {
    scheduleAsciiFit(fitCinderFace);
}

function finishCinderSwipe(profileId, matched) {
    state.cinder.deck.shift();
    state.cinder.swipeCount++;

    if (matched) {
        if (!state.cinder.matches.includes(profileId)) {
            state.cinder.matches.push(profileId);
            unlockCinderContact(profileId);
            showToast("IT'S A MATCH!");
            tryUnlockTrophy('first_match');
            checkTrophyMilestones();
        }
    } else {
        returnCinderProfileToPool(profileId);
    }
    renderCinderProfile();
}

function cinderPass() {
    const profileId = getCurrentCinderProfileId();
    if (!profileId) return;
    const profile = getCinderProfileById(profileId);
    if (isCinderCrashProfile(profile)) return;
    finishCinderSwipe(profileId, false);
}

async function cinderLike() {
    const profileId = getCurrentCinderProfileId();
    if (!profileId) return;

    const profile = getCinderProfileById(profileId);
    if (isCinderCrashProfile(profile)) {
        await triggerCinderCrashMatch();
        return;
    }

    const chance = profile?.likeBackChance ?? 0;
    finishCinderSwipe(profileId, Math.random() < chance);
}

async function triggerCinderCrashMatch() {
    if (state.cinder.crashSeen) return;

    const likeBtn = document.getElementById('cinder-btn-like');
    if (likeBtn) likeBtn.disabled = true;

    state.cinder.deck.shift();
    state.cinder.swipeCount++;
    state.cinder.crashSeen = true;
    tryUnlockTrophy('phone_crash');

    await playPhoneCrashReboot();
}

function unlockCinderCrashContact() {
    const profile = getCinderProfileById(CINDER_CRASH_PROFILE_ID);
    if (!profile) return null;

    const contactKey = getCinderContactKey(CINDER_CRASH_PROFILE_ID);

    MESSAGE_SENDERS[contactKey] = {
        label: profile.name,
        preview: 'YOU ARE RECRUITED',
        category: 'cinder_match'
    };

    if (profile.replies) {
        if (!REPLIES_DB.contacts) REPLIES_DB.contacts = {};
        REPLIES_DB.contacts[contactKey] = profile.replies;
    }

    if (!state.cinder.unlockedContacts.includes(contactKey)) {
        state.cinder.unlockedContacts.push(contactKey);
    }
    if (!state.cinder.matches.includes(CINDER_CRASH_PROFILE_ID)) {
        state.cinder.matches.push(CINDER_CRASH_PROFILE_ID);
    }

    const hasThread = state.messages.some(m => getMessageContact(m) === contactKey);
    if (!hasThread) {
        addMessage(contactKey, 'YOU ARE RECRUITED');
    }

    state.messagesFlash = true;
    updateMessagesBadge();
    return contactKey;
}

function enableFatalPhoneTheme() {
    document.querySelector('.phone-display')?.classList.add('phone-fatal-screen');
    unlockVipJobsApp();
}

function unlockVipJobsApp() {
    if (state.unlockedApps.vipJobs) return;
    state.unlockedApps.vipJobs = true;
    tryUnlockTrophy('vip_access');
    updateAppMenu();
}

function syncFatalPhoneTheme() {
    if (state.cinder.crashSeen) enableFatalPhoneTheme();
}

async function playPhoneCrashReboot() {
    const display = document.querySelector('.phone-display');
    const overlay = document.getElementById('phone-crash-overlay');
    const staticLayer = document.getElementById('phone-crash-static');

    enableFatalPhoneTheme();
    if (overlay) {
        overlay.classList.remove('hidden');
        overlay.style.display = 'flex';
    }
    if (display) display.classList.add('phone-crash');
    if (staticLayer) staticLayer.classList.add('phone-crash-static--active');

    await wait(1400);

    if (staticLayer) staticLayer.classList.remove('phone-crash-static--active');
    if (overlay) overlay.classList.add('phone-crash-overlay--black');
    await wait(700);

    if (display) display.classList.remove('phone-crash');
    if (overlay) {
        overlay.classList.add('hidden');
        overlay.classList.remove('phone-crash-overlay--black');
        overlay.style.display = '';
    }

    await playBootSplash();

    const contactKey = unlockCinderCrashContact();
    if (contactKey) {
        openMessageThread(contactKey);
    } else {
        switchView('home-view');
    }
}

function openCinderMatches() {
    renderCinderMatches();
    switchView('cinder-matches-view');
}

function renderCinderMatches() {
    const container = document.getElementById('cinder-matches-list');
    if (!container) return;

    if (state.cinder.matches.length === 0) {
        container.innerHTML = '<div class="text-[9px] opacity-70 text-center py-4">NO MATCHES YET</div>';
        return;
    }

    container.innerHTML = state.cinder.matches.map(profileId => {
        const profile = getCinderProfileById(profileId);
        if (!profile) return '';
        const isGlitch = isCinderCrashProfile(profile);
        const face = CINDER_FACES[profileId] || (isGlitch ? '?' : profile.name.slice(0, 1));
        const miniFace = face.split('\n').slice(0, 4).join('\n');
        const glitchCls = isGlitch ? ' cinder-face--glitch' : '';
        const valueCls = isGlitch ? ' cinder-glitch-value' : '';
        return `
            <div class="cinder-match-row border-2 border-[var(--lcd-pixel)] p-2 flex gap-2 items-center">
                <pre class="cinder-match-face${glitchCls} text-[6px] leading-none shrink-0">${escapeHtml(miniFace)}</pre>
                <div class="flex flex-col gap-[2px] min-w-0">
                    <span class="text-[10px] font-bold${valueCls}">${escapeHtml(profile.name)}</span>
                    <span class="text-[8px] opacity-80${valueCls}">${isGlitch ? escapeHtml(String(profile.age)) : profile.age}</span>
                </div>
            </div>
        `;
    }).join('');
}
