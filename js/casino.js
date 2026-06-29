function updateScratchLeaveUI() {
    const btn = document.getElementById('btn-scratch-leave');
    const buyBtn = document.getElementById('btn-buy-scratch');
    if (!btn || !buyBtn) return;
    const buyVisible = !buyBtn.classList.contains('hidden');
    btn.classList.toggle('hidden', !buyVisible);
}

function leaveScratch() {
    const buyBtn = document.getElementById('btn-buy-scratch');
    if (!buyBtn || buyBtn.classList.contains('hidden')) return;
    switchView('gamble-menu-view');
}

function initScratch() {
    state.scratch.active = false;
    state.scratch.jackpotsFound = 0;
    state.scratch.won = false;
    document.getElementById('btn-buy-scratch').classList.remove('hidden');
    document.getElementById('scratch-boxes').innerHTML = `
        <div class="w-10 h-10 border-2 border-[var(--lcd-pixel)] flex items-center justify-center opacity-30">[ ]</div>
        <div class="w-10 h-10 border-2 border-[var(--lcd-pixel)] flex items-center justify-center opacity-30">[ ]</div>
        <div class="w-10 h-10 border-2 border-[var(--lcd-pixel)] flex items-center justify-center opacity-30">[ ]</div>
    `;
    updateScratchLeaveUI();
    switchView('scratch-view');
}

function buyScratch() {
    if (state.cash < 1.00) {
        showToast("BROKE.");
        return;
    }
    adjustCash(-1);

    state.scratch.active = true;
    state.scratch.won = false;
    tryUnlockTrophy('scratch_buy');
    document.getElementById('btn-buy-scratch').classList.add('hidden');
    updateScratchLeaveUI();

    // Each box has an independent 15% chance to be a jackpot
    state.scratch.jackpotsFound = 0;
    state.scratch.boxes = ['X', 'X', 'X'].map(() => Math.random() < 0.15 ? '$' : 'X');

    renderScratchBoxes();
}

function renderScratchBoxes() {
    const container = document.getElementById('scratch-boxes');
    container.innerHTML = '';
    
    state.scratch.boxes.forEach((val, index) => {
        const btn = document.createElement('button');
        btn.className = "w-10 h-10 border-2 border-[var(--lcd-pixel)] bg-[var(--lcd-pixel)] text-[var(--lcd-bg)] flex items-center justify-center font-bold text-lg hover:bg-transparent hover:text-[var(--lcd-pixel)]";
        btn.innerText = "?";
        btn.onclick = () => revealScratch(index, btn);
        container.appendChild(btn);
    });
}

function finishScratchRound() {
    state.scratch.active = false;

    if (state.scratch.jackpotsFound === 0) {
        playDunDun();
        showToast("YOU LOSE.");
    } else if (state.scratch.jackpotsFound > 1) {
        const total = state.scratch.jackpotsFound * 5;
        showToast(`TOTAL WIN +$${total.toFixed(2)}`);
    }

    setTimeout(initScratch, 2000);
}

function revealScratch(index, btnElement) {
    if (!state.scratch.active) return;

    playScratchRip();

    const val = state.scratch.boxes[index];
    btnElement.className = "w-10 h-10 border-2 border-[var(--lcd-pixel)] bg-transparent text-[var(--lcd-pixel)] flex items-center justify-center font-bold text-lg";
    btnElement.innerText = val;
    btnElement.onclick = null; // Disable click

    if (val === '$') {
        state.scratch.won = true;
        state.scratch.jackpotsFound++;
        adjustCash(5);
        recordCasinoWin(5.00);
        recordScratchJackpot();
        tryUnlockTrophy('scratch_jackpot');
        showToast("JACKPOT! +$5.00");
    } else {
        playDing();
    }

    const allRevealed = Array.from(document.getElementById('scratch-boxes').children)
        .every(el => el.innerText !== '?');
    if (allRevealed) {
        finishScratchRound();
    }
}

function roundBetAmount(amount) {
    return Math.round((Number(amount) || 0) * 100) / 100;
}

function getBjMaxWager() {
    return roundBetAmount(state.bj.bet + state.cash);
}

function setBjWager(targetBet) {
    const maxWager = getBjMaxWager();
    const nextBet = roundBetAmount(Math.min(maxWager, Math.max(0, targetBet)));
    const delta = roundBetAmount(nextBet - state.bj.bet);
    if (delta === 0) return;

    adjustCash(-delta);
    state.bj.bet = nextBet;
    updateBjBetUI();
}

function refundBjWager(silent = true) {
    if (state.bj.bet <= 0) return;
    adjustCash(state.bj.bet, silent ? { silent: true } : undefined);
    state.bj.bet = 0;
    updateBjBetUI();
}

function initBlackjack() {
    state.bj.state = 'bet';
    state.bj.bet = 0;
    
    document.getElementById('bj-bet-screen').classList.remove('hidden');
    document.getElementById('bj-active-screen').classList.add('hidden');
    const customInput = document.getElementById('bj-custom-bet-input');
    if (customInput) customInput.value = '';
    updateBjBetUI();
    
    switchView('blackjack-view');
}

function updateBjBetUI() {
    document.getElementById('bj-bet-amount').innerText = formatMoney(state.bj.bet);
    document.getElementById('bj-status').innerText = 'BET';

    const dealBtn = document.getElementById('bj-deal-btn');
    if (dealBtn) {
        const canDeal = state.bj.bet > 0;
        dealBtn.disabled = !canDeal;
        dealBtn.classList.toggle('opacity-50', !canDeal);
        dealBtn.classList.toggle('pointer-events-none', !canDeal);
    }
}

function changeBjBet(amount) {
    if (amount === 'max') {
        setBjWager(getBjMaxWager());
        return;
    }

    const step = Number(amount) || 0;
    if (step > 0) {
        if (state.cash < step) {
            showToast('NOT ENOUGH CASH');
            return;
        }
        setBjWager(state.bj.bet + step);
        return;
    }

    if (step < 0) {
        if (state.bj.bet < Math.abs(step)) return;
        setBjWager(state.bj.bet + step);
    }
}

function applyBjCustomBet() {
    const input = document.getElementById('bj-custom-bet-input');
    if (!input) return;

    const raw = String(input.value || '').trim();
    if (!raw) {
        showToast('ENTER A WAGER');
        return;
    }

    const amount = roundBetAmount(raw);
    if (!Number.isFinite(amount) || amount <= 0) {
        showToast('INVALID WAGER');
        return;
    }

    if (state.cash < amount) {
        showToast('NOT ENOUGH CASH');
        return;
    }

    setBjWager(state.bj.bet + amount);
    input.value = '';
}

function leaveBlackjack() {
    if (state.bj.state === 'bet') {
        refundBjWager();
    }
    switchView('gamble-menu-view');
}

function getDeck() {
    const values = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
    let deck = [];
    for(let i=0; i<4; i++) { // 4 suits
        for(let v of values) deck.push(v);
    }
    return shuffleArray(deck);
}

function getHandValue(hand) {
    let val = 0;
    let aces = 0;
    for(let c of hand) {
        if(['J','Q','K'].includes(c)) val += 10;
        else if(c === 'A') { val += 11; aces += 1; }
        else val += parseInt(c);
    }
    while(val > 21 && aces > 0) { val -= 10; aces -= 1; }
    return val;
}

function playBjCardFlipDuns(count, gapMs = 70) {
    for (let i = 0; i < count; i++) {
        setTimeout(() => playCardFlipDun(), i * gapMs);
    }
}

function startBjDeal() {
    if (state.bj.bet <= 0) {
        showToast("PLACE A WAGER");
        return;
    }
    
    state.bj.wasAllIn = state.cash <= 0 && state.bj.bet > 0;

    state.bj.state = 'play';
    state.bj.deck = getDeck();
    state.bj.player = [state.bj.deck.pop(), state.bj.deck.pop()];
    state.bj.dealer = [state.bj.deck.pop(), state.bj.deck.pop()];

    document.getElementById('bj-bet-screen').classList.add('hidden');
    document.getElementById('bj-active-screen').classList.remove('hidden');
    document.getElementById('bj-actions').classList.remove('hidden');
    
    renderBj();
    playBjCardFlipDuns(4);
    
    if (getHandValue(state.bj.player) === 21) endBj('bj');
}

function renderBj() {
    const pVal = getHandValue(state.bj.player);
    document.getElementById('bj-plr-val').innerText = `(${pVal})`;
    document.getElementById('bj-plr-cards').innerText = state.bj.player.map(c => `[${c}]`).join(' ');

    if (state.bj.state === 'play') {
        document.getElementById('bj-dlr-val').innerText = `(?)`;
        document.getElementById('bj-dlr-cards').innerText = `[?] [${state.bj.dealer[1]}]`;
    } else {
        const dVal = getHandValue(state.bj.dealer);
        document.getElementById('bj-dlr-val').innerText = `(${dVal})`;
        document.getElementById('bj-dlr-cards').innerText = state.bj.dealer.map(c => `[${c}]`).join(' ');
    }
}

function bjHit() {
    if (state.bj.state !== 'play') return;
    state.bj.player.push(state.bj.deck.pop());
    renderBj();
    playCardFlipDun();
    
    if (getHandValue(state.bj.player) > 21) {
        endBj('bust');
    }
}

function bjStand() {
    if (state.bj.state !== 'play') return;
    state.bj.state = 'over';
    document.getElementById('bj-actions').classList.add('hidden');
    playCardFlipDun();
    
    // Dealer logic
    let dVal = getHandValue(state.bj.dealer);
    let dealerDraws = 0;
    while (dVal < 17) {
        state.bj.dealer.push(state.bj.deck.pop());
        dVal = getHandValue(state.bj.dealer);
        dealerDraws++;
    }
    
    renderBj();
    if (dealerDraws > 0) {
        playBjCardFlipDuns(dealerDraws);
    }
    
    const pVal = getHandValue(state.bj.player);
    
    if (dVal > 21) endBj('win');
    else if (pVal > dVal) endBj('win');
    else if (pVal < dVal) endBj('lose');
    else endBj('push');
}

function endBj(result) {
    state.bj.state = 'over';
    document.getElementById('bj-actions').classList.add('hidden');
    renderBj();
    
    setTimeout(() => {
        let lostHugeAmount = false;
        let winAmount = 0;

        if (result === 'bj') {
            const win = state.bj.bet * 2.5; // Blackjack pays 3:2
            winAmount = win;
            adjustCash(win, { gainAmount: state.bj.bet });
            recordCasinoWin(win);
            showToast(`BLACKJACK! +$${win.toFixed(2)}`);
        } else if (result === 'win') {
            const win = state.bj.bet * 2;
            winAmount = win;
            adjustCash(win, { gainAmount: state.bj.bet });
            recordCasinoWin(win);
            showToast(`YOU WIN! +$${win.toFixed(2)}`);
        } else if (result === 'push') {
            adjustCash(state.bj.bet, { silent: true });
            state.bj.bet = 0;
            showToast("PUSH. MONEY RETURNED.");
        } else {
            const lostBet = state.bj.bet;
            const tableTotal = lostBet + state.cash;
            if (tableTotal > 0 && (lostBet / tableTotal) >= 0.9) {
                lostHugeAmount = true;
            }
            playDunDun();
            showToast(`YOU LOSE $${lostBet.toFixed(2)}`);
            state.bj.bet = 0;
        }

        checkCasinoSkillUnlocks({ winAmount, lostHugeAmount });
        if (result === 'bj' || result === 'win') {
            tryUnlockTrophy('bj_win');
            if (state.bj.wasAllIn) tryUnlockTrophy('bj_allin_win');
            checkTrophyMilestones();
        } else if (lostHugeAmount) {
            tryUnlockTrophy('bj_allin_lose');
        }

        setTimeout(initBlackjack, 2500);
    }, 1000);
}
