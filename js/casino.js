function initScratch() {
    state.scratch.active = false;
    document.getElementById('btn-buy-scratch').classList.remove('hidden');
    document.getElementById('scratch-boxes').innerHTML = `
        <div class="w-10 h-10 border-2 border-[var(--lcd-pixel)] flex items-center justify-center opacity-30">[ ]</div>
        <div class="w-10 h-10 border-2 border-[var(--lcd-pixel)] flex items-center justify-center opacity-30">[ ]</div>
        <div class="w-10 h-10 border-2 border-[var(--lcd-pixel)] flex items-center justify-center opacity-30">[ ]</div>
    `;
    switchView('scratch-view');
}

function buyScratch() {
    if (state.cash < 1.00) {
        showToast("BROKE.");
        return;
    }
    state.cash -= 1.00;
    updateHUD();

    state.scratch.active = true;
    state.scratch.won = false;
    tryUnlockTrophy('scratch_buy');
    document.getElementById('btn-buy-scratch').classList.add('hidden');

    // 15% chance to win $5
    const isWinner = Math.random() < 0.15;
    state.scratch.boxes = ['X', 'X', 'X'];
    
    if (isWinner) {
        const winIndex = Math.floor(Math.random() * 3);
        state.scratch.boxes[winIndex] = '$';
    }

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

function revealScratch(index, btnElement) {
    if (!state.scratch.active) return;

    const val = state.scratch.boxes[index];
    btnElement.className = "w-10 h-10 border-2 border-[var(--lcd-pixel)] bg-transparent text-[var(--lcd-pixel)] flex items-center justify-center font-bold text-lg";
    btnElement.innerText = val;
    btnElement.onclick = null; // Disable click

    if (val === '$') {
        state.scratch.won = true;
        state.scratch.active = false;
        state.cash += 5.00;
        recordCasinoWin(5.00);
        recordScratchJackpot();
        tryUnlockTrophy('scratch_jackpot');
        updateHUD();
        showToast("JACKPOT! +$5.00");
        setTimeout(initScratch, 2000);
    } else {
        // Check if all revealed
        const allRevealed = Array.from(document.getElementById('scratch-boxes').children)
                                 .every(el => el.innerText !== '?');
        if (allRevealed && !state.scratch.won) {
            state.scratch.active = false;
            showToast("YOU LOSE.");
            setTimeout(initScratch, 2000);
        }
    }
}

function initBlackjack() {
    state.bj.state = 'bet';
    state.bj.bet = 1;
    if(state.bj.bet > state.cash) state.bj.bet = Math.max(0, state.cash);
    
    document.getElementById('bj-bet-screen').classList.remove('hidden');
    document.getElementById('bj-active-screen').classList.add('hidden');
    updateBjBetUI();
    
    switchView('blackjack-view');
}

function updateBjBetUI() {
    document.getElementById('bj-bet-amount').innerText = `$${state.bj.bet.toFixed(2)}`;
    document.getElementById('bj-status').innerText = 'BET';
}

function changeBjBet(amount) {
    if (amount === 'max') {
        state.bj.bet = state.cash; // Grab the exact amount, including cents
    } else {
        // If they use +/- buttons, snap it back to a clean whole number
        state.bj.bet = Math.floor(state.bj.bet) + amount;
    }
    
    // Handle betting constraints
    if (state.bj.bet < 1 && state.cash >= 1) state.bj.bet = 1;
    else if (state.cash < 1) state.bj.bet = state.cash; // Allow sub-$1 bets if you are super broke
    
    if (state.bj.bet > state.cash) state.bj.bet = state.cash;
    
    updateBjBetUI();
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

function startBjDeal() {
    if (state.cash < state.bj.bet) {
        showToast("NOT ENOUGH CASH");
        return;
    }
    
    const cashBeforeBet = state.cash;
    state.bj.wasAllIn = state.bj.bet >= cashBeforeBet && cashBeforeBet > 0;
    state.cash -= state.bj.bet;
    updateHUD();

    state.bj.state = 'play';
    state.bj.deck = getDeck();
    state.bj.player = [state.bj.deck.pop(), state.bj.deck.pop()];
    state.bj.dealer = [state.bj.deck.pop(), state.bj.deck.pop()];

    document.getElementById('bj-bet-screen').classList.add('hidden');
    document.getElementById('bj-active-screen').classList.remove('hidden');
    document.getElementById('bj-actions').classList.remove('hidden');
    
    renderBj();
    
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
    
    if (getHandValue(state.bj.player) > 21) {
        endBj('bust');
    }
}

function bjStand() {
    if (state.bj.state !== 'play') return;
    state.bj.state = 'over';
    document.getElementById('bj-actions').classList.add('hidden');
    
    // Dealer logic
    let dVal = getHandValue(state.bj.dealer);
    while (dVal < 17) {
        state.bj.dealer.push(state.bj.deck.pop());
        dVal = getHandValue(state.bj.dealer);
    }
    
    renderBj();
    
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
            state.cash += win;
            recordCasinoWin(win);
            showToast(`BLACKJACK! +$${win.toFixed(2)}`);
        } else if (result === 'win') {
            const win = state.bj.bet * 2;
            winAmount = win;
            state.cash += win;
            recordCasinoWin(win);
            showToast(`YOU WIN! +$${win.toFixed(2)}`);
        } else if (result === 'push') {
            state.cash += state.bj.bet;
            showToast("PUSH. MONEY RETURNED.");
        } else {
            const totalBeforeBet = state.cash + state.bj.bet;
            if (totalBeforeBet > 0 && (state.bj.bet / totalBeforeBet) >= 0.9) {
                lostHugeAmount = true;
            }
            showToast(`YOU LOSE $${state.bj.bet.toFixed(2)}`);
        }
        updateHUD();

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
