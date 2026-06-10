function startPizzaShift() {
    state.isShiftActive = true;
    state.shiftTimeElapsed = 0;
    state.shiftEarned = 0;
    state.shiftTipsCollected = 0;
    
    document.getElementById('shift-start-ui').classList.add('hidden');
    document.getElementById('shift-active-ui').classList.remove('hidden');
    document.getElementById('btn-end-shift').classList.remove('hidden');
    document.getElementById('ui-shift-earned').innerText = "$0.00";
    
    state.shiftInterval = setInterval(processShiftTick, 100);
    scheduleNextTip();
}

function processShiftTick() {
    const tickLength = 0.1;
    state.shiftTimeElapsed += tickLength;
    
    const earnedThisTick = state.baseWagePerSec * tickLength;
    state.shiftEarned += earnedThisTick;
    state.cash += earnedThisTick;
    
    updateHUD();
    
    const timeLeft = Math.max(0, state.shiftMaxTime - state.shiftTimeElapsed);
    const seconds = Math.floor(timeLeft % 60);
    document.getElementById('ui-shift-timer').innerText = `00:${seconds < 10 ? '0' : ''}${seconds}`;
    document.getElementById('ui-shift-earned').innerText = `$${state.shiftEarned.toFixed(2)}`;
    
    const percent = (state.shiftTimeElapsed / state.shiftMaxTime) * 100;
    document.getElementById('ui-shift-progress').style.width = `${percent}%`;

    if (state.shiftTimeElapsed >= state.shiftMaxTime) {
        endPizzaShift(false);
    }
}

function scheduleNextTip() {
    if (!state.isShiftActive) return;
    const nextTipIn = Math.random() * 3000 + 1000; // Faster for smaller screen
    state.tipSpawnerInterval = setTimeout(() => {
        spawnTip();
        scheduleNextTip();
    }, nextTipIn);
}

function spawnTip() {
    const container = document.getElementById('tip-container');
    const btn = document.createElement('button');
    
    // Constrain coordinates so they don't spawn off the tiny screen
    const top = Math.random() * 70 + 10;
    const left = Math.random() * 60 + 10;
    
    // Y2K Blocky button style
    btn.className = "absolute border-2 border-[var(--lcd-pixel)] bg-[var(--lcd-bg)] text-[var(--lcd-pixel)] px-2 py-1 text-[10px] font-bold pointer-events-auto z-30 cursor-pointer shadow-[2px_2px_0_rgba(17,20,6,1)]";
    btn.style.top = `${top}%`;
    btn.style.left = `${left}%`;
    btn.innerHTML = `+$1`;
    
    // Hover effect managed by JS since absolute elements can be finicky
    btn.onmouseenter = () => {
        btn.style.backgroundColor = 'var(--lcd-pixel)';
        btn.style.color = 'var(--lcd-bg)';
    };
    btn.onmouseleave = () => {
        btn.style.backgroundColor = 'var(--lcd-bg)';
        btn.style.color = 'var(--lcd-pixel)';
    };

    btn.onclick = function() {
        state.cash += 1.00;
        state.shiftEarned += 1.00;
        state.shiftTipsCollected++;
        updateHUD();
        
        this.innerHTML = "OK";
        this.style.backgroundColor = 'var(--lcd-pixel)';
        this.style.color = 'var(--lcd-bg)';
        this.style.boxShadow = 'none';
        this.style.pointerEvents = 'none';
        setTimeout(() => this.remove(), 400);
    };

    container.appendChild(btn);
    setTimeout(() => { if(btn.parentNode) btn.remove(); }, 1500);
}

function endPizzaShift(manual) {
    state.isShiftActive = false;
    clearInterval(state.shiftInterval);
    clearTimeout(state.tipSpawnerInterval);
    document.getElementById('tip-container').innerHTML = '';
    
    state.shiftsCompleted++;
    advanceDay();
    
    document.getElementById('shift-start-ui').classList.remove('hidden');
    document.getElementById('shift-active-ui').classList.add('hidden');
    document.getElementById('btn-end-shift').classList.add('hidden');
    
    document.getElementById('ui-shift-progress').style.width = '0%';
    document.getElementById('ui-shift-timer').innerText = "00:00";
    
    showToast(`DONE: $${state.shiftEarned.toFixed(2)}`);
    
    switchView('home-view');

    sendBossShiftFeedback(manual, state.shiftEarned);
    
    if (state.shiftsCompleted === 2 && !state.achievements.includes('NO-LIFE')) {
        state.achievements.push('NO-LIFE');
        unlockCVApp();
    }
    
    if (state.shiftsCompleted === 1) {
        setTimeout(() => addMessage('MOM', `Rent is $${getWeeklyRent().toFixed(2)} this week. Get to work.`), 2000);
    }
}
