const PHONE_DESIGN_WIDTH = 360;
const PHONE_DESIGN_HEIGHT = 750;

function isMobileNative() {
    return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
}

function applyMobileNativeClass() {
    document.documentElement.classList.toggle('mobile-native', isMobileNative());
}

function syncAppHeight() {
    const height = window.visualViewport?.height ?? window.innerHeight;
    document.documentElement.style.setProperty('--app-height', `${Math.round(height)}px`);
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
        window.innerHeight / PHONE_DESIGN_HEIGHT,
        window.innerWidth / PHONE_DESIGN_WIDTH
    );
    wrapper.style.transform = `scale(${scale})`;
}

function handleViewportChange() {
    syncAppHeight();
    applyMobileNativeClass();
    fitPhoneToWindow();
    if (typeof isBootSplashVisible === 'function' && isBootSplashVisible()) {
        scheduleBootSplashFit();
    }
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
handleViewportChange();
window.addEventListener('resize', handleViewportChange);
window.addEventListener('orientationchange', handleViewportChange);
window.visualViewport?.addEventListener('resize', handleViewportChange);
window.visualViewport?.addEventListener('scroll', handleViewportChange);

window.onload = async () => {
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
};
