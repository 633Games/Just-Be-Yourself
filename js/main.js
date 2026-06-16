const PHONE_DESIGN_WIDTH = 360;
const PHONE_DESIGN_HEIGHT = 750;
const BROWSER_PLAY_KEY = 'remember-browser-play';

let stableLayoutHeight = null;

function isMobileNative() {
    return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
}

function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent)
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isStandaloneApp() {
    return window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true;
}

function allowsBrowserPlay() {
    return /(?:^|[?&])allow-browser=1(?:&|$)/.test(location.search)
        || sessionStorage.getItem(BROWSER_PLAY_KEY) === '1';
}

function requiresInstallGate() {
    return isIOS() && isMobileNative() && !isStandaloneApp() && !allowsBrowserPlay();
}

function showInstallGate() {
    const gate = document.getElementById('install-gate');
    const stage = document.querySelector('.phone-stage');
    document.documentElement.classList.add('install-gate-active');
    gate?.classList.remove('hidden');
    stage?.classList.add('hidden');
}

function hideInstallGate() {
    const gate = document.getElementById('install-gate');
    const stage = document.querySelector('.phone-stage');
    document.documentElement.classList.remove('install-gate-active');
    gate?.classList.add('hidden');
    stage?.classList.remove('hidden');
}

function getLayoutHeight() {
    return Math.max(
        window.innerHeight,
        window.visualViewport?.height ?? 0
    );
}

function applyMobileNativeClass() {
    document.documentElement.classList.toggle('mobile-native', isMobileNative());
}

function syncAppHeight(force = false) {
    const fullHeight = getLayoutHeight();
    if (stableLayoutHeight === null || force) {
        stableLayoutHeight = fullHeight;
    } else if (fullHeight > stableLayoutHeight + 40) {
        stableLayoutHeight = fullHeight;
    }
    document.documentElement.style.setProperty('--app-height', `${Math.round(stableLayoutHeight)}px`);
}

function isTextInputFocused() {
    const el = document.activeElement;
    return el && (el.matches('input, textarea, [contenteditable="true"]'));
}

function scrollFocusedInputIntoView() {
    const el = document.activeElement;
    if (!el?.matches('input, textarea')) return;
    const footer = el.closest('#messages-thread-footer, #name-setup-view, .p-2');
    (footer || el).scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function setKeyboardOpen(open) {
    document.documentElement.classList.toggle('keyboard-open', open);
}

function setupInputKeyboardHandling() {
    document.addEventListener('focusin', (event) => {
        if (!event.target.matches('input, textarea')) return;
        setKeyboardOpen(true);
        setTimeout(scrollFocusedInputIntoView, 350);
    });

    document.addEventListener('focusout', () => {
        setTimeout(() => {
            if (!isTextInputFocused()) setKeyboardOpen(false);
        }, 100);
    });
}

function preventDoubleTapZoom() {
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (event) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, { passive: false });
}

function fitPhoneToWindow() {
    const wrapper = document.getElementById('phone-scale-wrapper');
    if (!wrapper) return;
    if (isMobileNative()) {
        wrapper.style.transform = '';
        return;
    }
    const scale = Math.min(
        stableLayoutHeight / PHONE_DESIGN_HEIGHT,
        window.innerWidth / PHONE_DESIGN_WIDTH
    );
    wrapper.style.transform = `scale(${scale})`;
}

function handleViewportChange(force = false) {
    syncAppHeight(force);
    applyMobileNativeClass();
    fitPhoneToWindow();
    if (typeof isBootSplashVisible === 'function' && isBootSplashVisible()) {
        scheduleBootSplashFit();
    }
}

function setupInstallGate() {
    if (!requiresInstallGate()) {
        hideInstallGate();
        return false;
    }
    showInstallGate();
    document.getElementById('install-gate-bypass')
        ?.addEventListener('click', bypassInstallGate, { once: true });
    return true;
}

function bypassInstallGate() {
    sessionStorage.setItem(BROWSER_PLAY_KEY, '1');
    hideInstallGate();
    bootGame();
}

async function bootGame() {
    try {
        await loadGameData();
    } catch (err) {
        document.body.innerHTML = '<p style="font-family:monospace;padding:2rem;">Failed to load game data. Serve this folder with a local server (see README):<br><code>python3 -m http.server 8000</code></p>';
        return;
    }
    handleViewportChange();
    ensureStatsState();
    setupCVListeners();
    updateHUD();
    if (typeof syncFatalPhoneTheme === 'function') syncFatalPhoneTheme();
    await playBootSplash();
    switchView('name-setup-view');
    document.getElementById('player-name-input')?.focus();
}

function submitPlayerName() {
    const input = document.getElementById('player-name-input');
    const name = input.value.trim();
    if (!name) {
        showToast('ENTER A NAME');
        return;
    }

    state.playerName = name;
    state.unlockedApps.messages = true;
    applyDebugBootstrap();
    addMessage(
        'MOM',
        `Youve finished school either get a job or get out of my house. Carlos said you can use his car to deliver pizzas until you get on your feet. DONT muck this up ${name}. Love Mam xx`
    );
    state.messagesFlash = true;
    updateAppMenu();
    switchView('home-view');
}

preventDoubleTapZoom();
setupInputKeyboardHandling();
if (requiresInstallGate()) showInstallGate();
handleViewportChange(true);
window.addEventListener('resize', () => handleViewportChange(false));
window.addEventListener('orientationchange', () => {
    stableLayoutHeight = null;
    handleViewportChange(true);
});
window.visualViewport?.addEventListener('resize', () => {
    if (isTextInputFocused()) return;
    handleViewportChange(false);
});
window.visualViewport?.addEventListener('scroll', () => {
    if (isTextInputFocused()) return;
    handleViewportChange(false);
});

window.onload = async () => {
    if (setupInstallGate()) return;
    await bootGame();
};
