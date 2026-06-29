const BOOT_STATUS_LINES = [
    'NORKЕE OS v1.0',
    'CHECKING RAM... OK',
    'LOADING DRIVERS...',
    'MOUNTING /PIZZA...',
    'SYNCING RENT CLOCK...',
    'READY.',
];

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function fitBootSplashArt() {
    const wrap = document.querySelector('.boot-splash-art-wrap');
    const stack = document.querySelector('.boot-splash-art-stack');
    if (!wrap || !stack) return;
    fitAsciiToContainer(wrap, stack, '--boot-scale', {
        widthFactor: 0.94,
        heightFactor: 0.9,
    });
}

function scheduleBootSplashFit() {
    scheduleAsciiFit(fitBootSplashArt);
}

function isBootSplashVisible() {
    const splash = document.getElementById('boot-splash');
    return splash && !splash.classList.contains('hidden');
}

window.addEventListener('resize', () => {
    if (isBootSplashVisible()) scheduleBootSplashFit();
});
window.addEventListener('orientationchange', () => {
    if (isBootSplashVisible()) scheduleBootSplashFit();
});

function setBootStatus(text) {
    const el = document.querySelector('#boot-splash-status .boot-splash-status-text');
    if (el) el.textContent = text;
}

function setBootProgress(ratio) {
    const fill = document.getElementById('boot-splash-bar-fill');
    if (fill) fill.style.width = `${Math.round(ratio * 100)}%`;
}

async function runBootStatusSequence() {
    const steps = BOOT_STATUS_LINES.length;
    for (let i = 0; i < steps; i++) {
        setBootStatus(BOOT_STATUS_LINES[i]);
        setBootProgress((i + 1) / steps);
        await wait(i === 0 ? 280 : 340);
    }
}

async function playBootSplash() {
    const splash = document.getElementById('boot-splash');
    const art = document.getElementById('boot-splash-art');
    const shine = document.getElementById('boot-splash-art-shine');
    if (!splash || !art || !BOOT_SPLASH_ASCII) return;

    art.textContent = BOOT_SPLASH_ASCII;
    if (shine) shine.textContent = BOOT_SPLASH_ASCII;
    scheduleBootSplashFit();
    setBootStatus(BOOT_STATUS_LINES[0]);
    setBootProgress(0.08);

    splash.classList.remove('hidden', 'boot-splash--out', 'boot-splash--hold');
    splash.classList.add('boot-splash--power', 'boot-splash--in');

    await wait(120);
    splash.classList.remove('boot-splash--power');
    playBootChime();

    await wait(1400);
    splash.classList.remove('boot-splash--in');
    splash.classList.add('boot-splash--hold');

    const statusPromise = runBootStatusSequence();
    await wait(900);
    await statusPromise;

    splash.classList.remove('boot-splash--hold');
    splash.classList.add('boot-splash--out');

    await wait(1100);
    splash.classList.add('hidden');
    splash.classList.remove('boot-splash--in', 'boot-splash--hold', 'boot-splash--out', 'boot-splash--power');
}
