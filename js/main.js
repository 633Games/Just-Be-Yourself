const PHONE_DESIGN_WIDTH = 360;
const PHONE_DESIGN_HEIGHT = 750;

function fitPhoneToWindow() {
    const wrapper = document.getElementById('phone-scale-wrapper');
    if (!wrapper) return;
    const scale = Math.min(
        window.innerHeight / PHONE_DESIGN_HEIGHT,
        window.innerWidth / PHONE_DESIGN_WIDTH
    );
    wrapper.style.transform = `scale(${scale})`;
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
    addMessage(
        'MOM',
        `Youve finished school either get a job or get out of my house. Carlos said you can use his car to deliver pizzas until you get on your feet. DONT muck this up ${name}. Love Mam xx`
    );
    state.messagesFlash = true;
    updateAppMenu();
    switchView('home-view');
}

fitPhoneToWindow();
window.addEventListener('resize', fitPhoneToWindow);

window.onload = async () => {
    try {
        await loadGameData();
    } catch (err) {
        document.body.innerHTML = '<p style="font-family:monospace;padding:2rem;">Failed to load game data. Serve this folder with a local server (see README):<br><code>python3 -m http.server 8000</code></p>';
        return;
    }
    fitPhoneToWindow();
    setupCVListeners();
    updateHUD();
    switchView('name-setup-view');
    document.getElementById('player-name-input')?.focus();
};
