const SFX_CASCADE_MAX_MS = 3000;
const SFX_CHIME_TAIL_MS = 180;
const SFX_FINALE_EXTRA_MS = 280;
const SFX_GAIN_AMOUNT_CAP = 2500;
const SFX_DING_COUNT_MAX = 20;
const SFX_FULL_BUDGET_GAPS = 17;
const SFX_COIN_FREQ_LOW = 620;
const SFX_COIN_FREQ_HIGH = 3400;

let sfxCtx = null;
let sfxGestureBound = false;
let sfxTypingBound = false;
let sfxClickBuffer = null;

function getSfxContext() {
    if (!sfxCtx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        sfxCtx = new Ctx();
    }
    return sfxCtx;
}

function getClickNoiseBuffer(ctx) {
    if (sfxClickBuffer) return sfxClickBuffer;

    const duration = 0.03;
    const length = Math.ceil(ctx.sampleRate * duration);
    sfxClickBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = sfxClickBuffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
        const decay = Math.pow(1 - i / length, 2.2);
        data[i] = (Math.random() * 2 - 1) * decay;
    }

    return sfxClickBuffer;
}

function resumeSfxContext() {
    const ctx = getSfxContext();
    if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
    }
}

function bindSfxGestureUnlock() {
    if (sfxGestureBound) return;
    sfxGestureBound = true;

    const unlock = () => resumeSfxContext();
    document.addEventListener('pointerdown', unlock, { once: true, capture: true });
    document.addEventListener('keydown', unlock, { once: true, capture: true });
}

function isTypingInput(el) {
    if (!el?.matches('input, textarea')) return false;
    if (el.tagName === 'TEXTAREA') return true;

    const type = (el.type || 'text').toLowerCase();
    return type === 'text'
        || type === 'search'
        || type === 'number'
        || type === 'password'
        || type === 'tel'
        || type === 'email';
}

function bindTypingSfx() {
    if (sfxTypingBound) return;
    sfxTypingBound = true;

    document.addEventListener('input', (event) => {
        if (!event.isTrusted || !isTypingInput(event.target)) return;

        const insertTypes = new Set(['insertText', 'insertFromPaste', 'insertReplacementText']);
        const deleteTypes = new Set([
            'deleteContentBackward',
            'deleteContentForward',
            'deleteByCut',
        ]);

        if (event.inputType) {
            if (insertTypes.has(event.inputType)) playTypeCluck();
            else if (deleteTypes.has(event.inputType)) playBackspaceBlast();
            return;
        }

        playTypeCluck();
    }, true);
}

function initSfx() {
    getSfxContext();
    bindSfxGestureUnlock();
    bindTypingSfx();
    resumeSfxContext();
}

function createCoinOutput(ctx, panValue) {
    const master = ctx.createGain();
    master.connect(ctx.destination);

    if (typeof ctx.createStereoPanner === 'function') {
        const panner = ctx.createStereoPanner();
        panner.pan.value = panValue;
        panner.connect(master);
        return panner;
    }

    return master;
}

function pitchProgressForDing(index, total) {
    if (total <= 1) return 0.55;
    return index / (total - 1);
}

function freqForPitchProgress(progress) {
    const clamped = Math.min(1, Math.max(0, progress));
    const ratio = SFX_COIN_FREQ_HIGH / SFX_COIN_FREQ_LOW;
    return SFX_COIN_FREQ_LOW * Math.pow(ratio, clamped);
}

function buildCascadeGaps(total) {
    const gapCount = total - 1;
    if (gapCount <= 0) return [];

    const finaleReserve = total > 1 ? SFX_FINALE_EXTRA_MS : 0;
    const maxBudget = SFX_CASCADE_MAX_MS - SFX_CHIME_TAIL_MS - finaleReserve;
    const ramp = Math.min(1, gapCount / SFX_FULL_BUDGET_GAPS);
    const snappyBudget = 90 + gapCount * 48;
    const budget = snappyBudget + (maxBudget - snappyBudget) * (ramp * ramp);

    const weights = [];
    for (let i = 0; i < gapCount; i++) {
        weights.push(Math.sqrt(gapCount - i));
    }

    const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
    return weights.map(weight => (weight / weightSum) * budget);
}

function playCoinChime(index, total, options = {}) {
    const ctx = getSfxContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const gainScale = options.gainScale != null ? options.gainScale : 1;
    const pitchProgress = options.pitchProgress != null
        ? options.pitchProgress
        : pitchProgressForDing(index, total);
    const isFinale = index === total - 1;
    const freq = freqForPitchProgress(pitchProgress);
    const pan = ((index % 2) * 2 - 1) * (0.18 + pitchProgress * 0.22);
    const output = createCoinOutput(ctx, pan);

    const click = ctx.createBufferSource();
    click.buffer = getClickNoiseBuffer(ctx);

    const clickFilter = ctx.createBiquadFilter();
    clickFilter.type = 'bandpass';
    clickFilter.frequency.setValueAtTime(freq * 1.8, now);
    clickFilter.Q.value = 10;

    const clickGain = ctx.createGain();
    const clickPeak = (isFinale ? 0.38 : 0.34) * gainScale;
    const clickTail = isFinale ? 0.04 : 0.028;
    clickGain.gain.setValueAtTime(clickPeak, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + clickTail);

    click.connect(clickFilter);
    clickFilter.connect(clickGain);
    clickGain.connect(output);
    click.start(now);
    click.stop(now + clickTail + 0.01);

    const body = ctx.createOscillator();
    body.type = 'triangle';
    body.frequency.setValueAtTime(freq, now);
    body.frequency.exponentialRampToValueAtTime(freq * (isFinale ? 1.02 : 1.035), now + 0.012);

    const bodyGain = ctx.createGain();
    const bodyPeak = (isFinale ? 0.34 : 0.24) * gainScale;
    const bodyTail = isFinale ? 0.52 : 0.16;
    bodyGain.gain.setValueAtTime(0.001, now);
    bodyGain.gain.exponentialRampToValueAtTime(bodyPeak, now + 0.002);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, now + bodyTail);

    body.connect(bodyGain);
    bodyGain.connect(output);
    body.start(now);
    body.stop(now + bodyTail + 0.02);

    const shimmer = ctx.createOscillator();
    shimmer.type = 'sine';
    shimmer.frequency.setValueAtTime(freq * 2.01, now);

    const shimmerGain = ctx.createGain();
    const shimmerTail = isFinale ? 0.28 : 0.09;
    shimmerGain.gain.setValueAtTime(0.001, now);
    shimmerGain.gain.exponentialRampToValueAtTime((isFinale ? 0.12 : 0.1) * gainScale, now + 0.0015);
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + shimmerTail);

    shimmer.connect(shimmerGain);
    shimmerGain.connect(output);
    shimmer.start(now);
    shimmer.stop(now + shimmerTail + 0.02);

    const ring = ctx.createOscillator();
    ring.type = 'sine';
    ring.frequency.setValueAtTime(freq * 3.02, now);

    const ringGain = ctx.createGain();
    const ringTail = isFinale ? 0.22 : 0.055;
    ringGain.gain.setValueAtTime(0.001, now);
    ringGain.gain.exponentialRampToValueAtTime((isFinale ? 0.06 : 0.045) * gainScale, now + 0.001);
    ringGain.gain.exponentialRampToValueAtTime(0.001, now + ringTail);

    ring.connect(ringGain);
    ringGain.connect(output);
    ring.start(now);
    ring.stop(now + ringTail + 0.02);
}

function playDing(pitchIndex = 0) {
    playCoinChime(0, 1, { pitchProgress: 0.55 });
}

function playAchievementDing() {
    playCoinChime(0, 2, { pitchProgress: 0.35, gainScale: 1.1 });
    setTimeout(() => playCoinChime(1, 2, { pitchProgress: 0.9, gainScale: 1.05 }), 140);
}

function playNavBeep(kind) {
    const ctx = getSfxContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const isBack = kind === 'back';
    const startHz = isBack
        ? 740 + Math.random() * 200
        : 1060 + Math.random() * 280;
    const endHz = startHz * (0.7 + Math.random() * 0.1);
    const duration = 0.045 + Math.random() * 0.02;
    const peak = (isBack ? 0.04 : 0.05) + Math.random() * 0.015;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(startHz, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(endHz, 1), now + duration);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration + 0.01);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.02);
}

function playAppBeep() {
    playNavBeep('open');
}

function playAppBackBeep() {
    playNavBeep('back');
}

function playBootChimeNote(ctx, time, freq, peak, tail) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(peak, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + tail);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(time);
    osc.stop(time + tail + 0.02);
}

function playBootChime() {
    const ctx = getSfxContext();
    if (!ctx) return;

    resumeSfxContext();

    const now = ctx.currentTime;
    const jitter = 1 + (Math.random() * 0.05 - 0.025);

    playBootChimeNote(ctx, now, 740 * jitter, 0.065, 0.2);
    playBootChimeNote(ctx, now + 0.11, 988 * jitter, 0.058, 0.28);
    playBootChimeNote(ctx, now + 0.22, 1175 * jitter, 0.05, 0.34);
}

function playTypeCluck() {
    const ctx = getSfxContext();
    if (!ctx) return;

    resumeSfxContext();

    const now = ctx.currentTime;
    const thumpHz = 165 + Math.random() * 55;
    const clickHz = 1400 + Math.random() * 900;
    const peak = 0.048 + Math.random() * 0.018;
    const clickDur = 0.014 + Math.random() * 0.008;

    const click = ctx.createBufferSource();
    click.buffer = getClickNoiseBuffer(ctx);

    const clickFilter = ctx.createBiquadFilter();
    clickFilter.type = 'bandpass';
    clickFilter.frequency.setValueAtTime(clickHz, now);
    clickFilter.Q.value = 4 + Math.random() * 3;

    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(peak, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + clickDur);

    click.connect(clickFilter);
    clickFilter.connect(clickGain);
    clickGain.connect(ctx.destination);
    click.start(now);
    click.stop(now + clickDur + 0.01);

    const thump = ctx.createOscillator();
    thump.type = 'triangle';
    thump.frequency.setValueAtTime(thumpHz, now);
    thump.frequency.exponentialRampToValueAtTime(thumpHz * 0.82, now + 0.02);

    const thumpGain = ctx.createGain();
    thumpGain.gain.setValueAtTime(0.001, now);
    thumpGain.gain.exponentialRampToValueAtTime(peak * 0.85, now + 0.0015);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.028);

    thump.connect(thumpGain);
    thumpGain.connect(ctx.destination);
    thump.start(now);
    thump.stop(now + 0.035);
}

function playBackspaceBlast() {
    const ctx = getSfxContext();
    if (!ctx) return;

    resumeSfxContext();

    const now = ctx.currentTime;
    const duration = 0.085 + Math.random() * 0.035;
    const startHz = 1500 + Math.random() * 700;
    const endHz = 110 + Math.random() * 90;
    const peak = 0.052 + Math.random() * 0.018;

    const laser = ctx.createOscillator();
    laser.type = 'sawtooth';
    laser.frequency.setValueAtTime(startHz, now);
    laser.frequency.exponentialRampToValueAtTime(Math.max(endHz, 1), now + duration);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(4200, now);
    filter.frequency.exponentialRampToValueAtTime(320, now + duration);
    filter.Q.value = 2.5;

    const laserGain = ctx.createGain();
    laserGain.gain.setValueAtTime(0.0001, now);
    laserGain.gain.exponentialRampToValueAtTime(peak, now + 0.003);
    laserGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    laser.connect(filter);
    filter.connect(laserGain);
    laserGain.connect(ctx.destination);
    laser.start(now);
    laser.stop(now + duration + 0.02);

    const zap = ctx.createOscillator();
    zap.type = 'square';
    zap.frequency.setValueAtTime(startHz * 1.5, now);
    zap.frequency.exponentialRampToValueAtTime(endHz * 1.2, now + duration * 0.7);

    const zapGain = ctx.createGain();
    zapGain.gain.setValueAtTime(0.0001, now);
    zapGain.gain.exponentialRampToValueAtTime(peak * 0.35, now + 0.002);
    zapGain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.55);

    zap.connect(zapGain);
    zapGain.connect(ctx.destination);
    zap.start(now);
    zap.stop(now + duration * 0.6);

    const noise = ctx.createBufferSource();
    noise.buffer = getClickNoiseBuffer(ctx);

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(1800 + Math.random() * 1200, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(peak * 0.45, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.018);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.02);
}

function playWompGlide(ctx, startTime, startHz, endHz, duration, peakGain) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startHz, startTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(endHz, 1), startTime + duration);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
}

function playWompWomp() {
    const ctx = getSfxContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    playWompGlide(ctx, now, 350, 120, 0.35, 0.12);
    playWompGlide(ctx, now + 0.47, 320, 110, 0.35, 0.1);
}

function playLossChime(index, total) {
    const pitchProgress = 1 - pitchProgressForDing(index, total);
    playCoinChime(index, total, { pitchProgress, gainScale: 0.82 });
}

function playCardFlipDun() {
    const ctx = getSfxContext();
    if (!ctx) return;

    resumeSfxContext();

    const now = ctx.currentTime;
    const dunHz = 78 + Math.random() * 32;
    const peak = 0.11 + Math.random() * 0.03;
    const tail = 0.09 + Math.random() * 0.03;

    const body = ctx.createOscillator();
    body.type = 'triangle';
    body.frequency.setValueAtTime(dunHz, now);
    body.frequency.exponentialRampToValueAtTime(dunHz * 0.72, now + tail);

    const bodyGain = ctx.createGain();
    bodyGain.gain.setValueAtTime(0.001, now);
    bodyGain.gain.exponentialRampToValueAtTime(peak, now + 0.004);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, now + tail);

    body.connect(bodyGain);
    bodyGain.connect(ctx.destination);
    body.start(now);
    body.stop(now + tail + 0.02);

    const thud = ctx.createOscillator();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(dunHz * 0.55, now);

    const thudGain = ctx.createGain();
    thudGain.gain.setValueAtTime(0.001, now);
    thudGain.gain.exponentialRampToValueAtTime(peak * 0.55, now + 0.003);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + tail * 0.85);

    thud.connect(thudGain);
    thudGain.connect(ctx.destination);
    thud.start(now);
    thud.stop(now + tail);
}

function playScratchRip() {
    const ctx = getSfxContext();
    if (!ctx) return;

    resumeSfxContext();

    const now = ctx.currentTime;
    const duration = 0.04 + Math.random() * 0.02;
    const peak = 0.055 + Math.random() * 0.02;
    const ripHz = 900 + Math.random() * 700;

    const noise = ctx.createBufferSource();
    noise.buffer = getClickNoiseBuffer(ctx);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(ripHz, now);
    filter.Q.value = 3 + Math.random() * 4;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(peak, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + duration + 0.01);
}

function dingCountForAmount(amount) {
    const value = Math.min(SFX_GAIN_AMOUNT_CAP, Math.abs(Number(amount) || 0));
    if (value <= 0) return 0;
    if (value <= 1) return 1;

    const progress = Math.pow(
        (value - 1) / (SFX_GAIN_AMOUNT_CAP - 1),
        0.5
    );

    return Math.max(
        1,
        Math.min(SFX_DING_COUNT_MAX, Math.round(1 + progress * (SFX_DING_COUNT_MAX - 1)))
    );
}

function getMoneyGainDingDuration(amount, stepIndex, total) {
    const gaps = buildCascadeGaps(total);
    if (stepIndex < gaps.length) return Math.max(80, gaps[stepIndex]);
    return Math.max(120, SFX_CHIME_TAIL_MS);
}

function scheduleMoneyGainCascade(amount, onDing) {
    const count = dingCountForAmount(amount);
    const gaps = buildCascadeGaps(count);
    let delay = 0;

    for (let i = 0; i < count; i++) {
        const step = i;
        setTimeout(() => {
            playCoinChime(step, count, { pitchProgress: pitchProgressForDing(step, count) });
            if (onDing) onDing(step, count);
        }, delay);
        if (i < gaps.length) delay += gaps[i];
    }

    return { count, totalMs: delay + SFX_CHIME_TAIL_MS };
}

function playMoneyGain(amount, hudStart, hudDelta) {
    const result = scheduleMoneyGainCascade(amount, (step, total) => {
        const durationMs = getMoneyGainDingDuration(amount, step, total);
        if (typeof onCashGainDing === 'function') {
            onCashGainDing(step, total, durationMs);
        }
    });

    if (typeof beginCashGainFxBurst === 'function') {
        beginCashGainFxBurst(result.count, result.totalMs, hudStart, hudDelta);
    }
}

function scheduleMoneyLossCascade(amount, onDing) {
    const count = dingCountForAmount(amount);
    const gaps = buildCascadeGaps(count);
    let delay = 0;

    for (let i = 0; i < count; i++) {
        const step = i;
        setTimeout(() => {
            playLossChime(step, count);
            if (onDing) onDing(step, count);
        }, delay);
        if (i < gaps.length) delay += gaps[i];
    }

    return { count, totalMs: delay + SFX_CHIME_TAIL_MS };
}

function playMoneyLoss(amount, hudStart, hudDelta) {
    const result = scheduleMoneyLossCascade(amount, (step, total) => {
        const durationMs = getMoneyGainDingDuration(amount, step, total);
        if (typeof onCashLossDing === 'function') {
            onCashLossDing(step, total, durationMs);
        }
    });

    if (typeof beginCashLossFxBurst === 'function') {
        beginCashLossFxBurst(result.count, result.totalMs, hudStart, hudDelta);
    }
}

function adjustCash(delta, options = {}) {
    const amount = Number(delta) || 0;
    if (amount === 0) return;

    const cashBefore = state.cash;
    state.cash += amount;

    if (options.silent) {
        updateHUD();
        return;
    }

    const sfx = options.sfx || 'auto';
    if (sfx === 'none') {
        updateHUD();
        return;
    }

    if (elRentTimer) elRentTimer.innerText = formatGameDate();

    if (sfx === 'gain' || (sfx === 'auto' && amount > 0)) {
        setCashHudDisplay(cashBefore);
        playMoneyGain(
            options.gainAmount != null ? options.gainAmount : amount,
            cashBefore,
            amount
        );
        return;
    }

    if (sfx === 'loss' || (sfx === 'auto' && amount < 0)) {
        setCashHudDisplay(cashBefore);
        playMoneyLoss(
            options.lossAmount != null ? options.lossAmount : Math.abs(amount),
            cashBefore,
            amount
        );
    }
}
