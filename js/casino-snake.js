const SNAKE_ENTRY = 5;
const SNAKE_GOAL = 15;
const SNAKE_JACKPOT = 500;
const SNAKE_COMBO_SUM = (SNAKE_GOAL * (SNAKE_GOAL + 1)) / 2;
const SNAKE_TICK_START = 180;
const SNAKE_TICK_MIN = 70;
const SNAKE_TICK_SPEEDUP = 12;
const SNAKE_SPEEDUP_EVERY = 3;

let snakeKeyHandler = null;

function roundSnakeMoney(amount) {
    return Math.round((Number(amount) || 0) * 100) / 100;
}

function getSnakeIncrement(combo) {
    return roundSnakeMoney(SNAKE_JACKPOT * combo / SNAKE_COMBO_SUM);
}

function updateSnakeLeaveUI() {
    const btn = document.getElementById('btn-snake-leave');
    const startBtn = document.getElementById('btn-snake-start');
    if (!btn || !startBtn) return;
    const lobbyVisible = !startBtn.classList.contains('hidden');
    btn.classList.toggle('hidden', !lobbyVisible);
}

function updateSnakeHud() {
    const potEl = document.getElementById('snake-pot');
    const comboEl = document.getElementById('snake-combo');
    const eatenEl = document.getElementById('snake-eaten');
    if (potEl) potEl.textContent = formatMoney(state.snake.pot);
    if (comboEl) comboEl.textContent = `x${state.snake.combo}`;
    if (eatenEl) eatenEl.textContent = `${state.snake.eaten} / ${SNAKE_GOAL}`;
}

function cleanupSnake() {
    if (state.snake.intervalId) {
        clearInterval(state.snake.intervalId);
        state.snake.intervalId = null;
    }
    if (snakeKeyHandler) {
        document.removeEventListener('keydown', snakeKeyHandler);
        snakeKeyHandler = null;
    }
}

function leaveSnake() {
    const startBtn = document.getElementById('btn-snake-start');
    if (!startBtn || startBtn.classList.contains('hidden')) return;
    cleanupSnake();
    switchView('gamble-menu-view');
}

function initSnake() {
    cleanupSnake();
    state.snake.phase = 'lobby';
    state.snake.snake = [];
    state.snake.combo = 0;
    state.snake.eaten = 0;
    state.snake.pot = 0;
    state.snake.food = null;
    state.snake.pendingDirs = [];
    state.snake.nextDir = null;
    state.snake.dir = { x: 1, y: 0 };
    state.snake.tickMs = SNAKE_TICK_START;

    const startBtn = document.getElementById('btn-snake-start');
    const dpad = document.getElementById('snake-dpad');
    if (startBtn) startBtn.classList.remove('hidden');
    if (dpad) dpad.classList.add('hidden');

    updateSnakeHud();
    renderSnakeGrid();
    updateSnakeLeaveUI();
    switchView('snake-view');
}

function snakeCellKey(x, y) {
    return `${x},${y}`;
}

function snakeOccupiedSet() {
    const set = new Set();
    state.snake.snake.forEach(seg => set.add(snakeCellKey(seg.x, seg.y)));
    return set;
}

function spawnSnakeFood() {
    const occupied = snakeOccupiedSet();
    const empty = [];
    for (let y = 0; y < state.snake.gridH; y++) {
        for (let x = 0; x < state.snake.gridW; x++) {
            if (!occupied.has(snakeCellKey(x, y))) {
                empty.push({ x, y });
            }
        }
    }
    if (empty.length === 0) {
        state.snake.food = null;
        return;
    }
    state.snake.food = empty[Math.floor(Math.random() * empty.length)];
}

function renderSnakeGrid() {
    const grid = document.getElementById('snake-grid');
    if (!grid) return;

    const { gridW, gridH, snake, food } = state.snake;
    const bodySet = new Set();
    snake.forEach((seg, i) => {
        if (i > 0) bodySet.add(snakeCellKey(seg.x, seg.y));
    });
    const head = snake[0];

    let html = '';
    for (let y = 0; y < gridH; y++) {
        for (let x = 0; x < gridW; x++) {
            let ch = '·';
            let cls = 'snake-cell';
            if (head && head.x === x && head.y === y) {
                ch = '@';
                cls += ' snake-head';
            } else if (bodySet.has(snakeCellKey(x, y))) {
                ch = 'o';
                cls += ' snake-body';
            } else if (food && food.x === x && food.y === y) {
                ch = '■';
                cls += ' snake-food';
            }
            html += `<span class="${cls}">${ch}</span>`;
        }
        if (y < gridH - 1) html += '\n';
    }
    grid.textContent = html;
}

function queueSnakeDir(dx, dy) {
    if (state.snake.phase !== 'playing') return;

    const last = state.snake.pendingDirs.length
        ? state.snake.pendingDirs[state.snake.pendingDirs.length - 1]
        : state.snake.dir;

    if (last.x + dx === 0 && last.y + dy === 0) return;

    if (state.snake.pendingDirs.length < 2) {
        state.snake.pendingDirs.push({ x: dx, y: dy });
    }
}

function bindSnakeInput() {
    if (snakeKeyHandler) return;

    snakeKeyHandler = (e) => {
        if (state.snake.phase !== 'playing') return;
        const key = e.key;
        if (key === 'ArrowUp') queueSnakeDir(0, -1);
        else if (key === 'ArrowDown') queueSnakeDir(0, 1);
        else if (key === 'ArrowLeft') queueSnakeDir(-1, 0);
        else if (key === 'ArrowRight') queueSnakeDir(1, 0);
        else return;
        e.preventDefault();
    };

    document.addEventListener('keydown', snakeKeyHandler);
}

function startSnakeRun() {
    if (state.snake.phase === 'playing') return;

    if (state.cash < SNAKE_ENTRY) {
        showToast('BROKE.');
        return;
    }

    adjustCash(-SNAKE_ENTRY);
    tryUnlockTrophy('snake_play');

    cleanupSnake();

    const midY = Math.floor(state.snake.gridH / 2);
    const midX = Math.floor(state.snake.gridW / 2);
    state.snake.phase = 'playing';
    state.snake.snake = [
        { x: midX, y: midY },
        { x: midX - 1, y: midY },
        { x: midX - 2, y: midY },
    ];
    state.snake.dir = { x: 1, y: 0 };
    state.snake.nextDir = null;
    state.snake.pendingDirs = [];
    state.snake.combo = 0;
    state.snake.eaten = 0;
    state.snake.pot = 0;
    state.snake.tickMs = SNAKE_TICK_START;

    spawnSnakeFood();
    updateSnakeHud();
    renderSnakeGrid();

    const startBtn = document.getElementById('btn-snake-start');
    const dpad = document.getElementById('snake-dpad');
    if (startBtn) startBtn.classList.add('hidden');
    if (dpad) dpad.classList.remove('hidden');
    updateSnakeLeaveUI();

    bindSnakeInput();

    state.snake.intervalId = setInterval(snakeTick, state.snake.tickMs);
}

function snakeTick() {
    if (state.snake.phase !== 'playing') return;

    if (state.snake.pendingDirs.length) {
        state.snake.dir = state.snake.pendingDirs.shift();
    }

    const head = state.snake.snake[0];
    const newHead = {
        x: head.x + state.snake.dir.x,
        y: head.y + state.snake.dir.y,
    };

    if (
        newHead.x < 0 || newHead.x >= state.snake.gridW ||
        newHead.y < 0 || newHead.y >= state.snake.gridH
    ) {
        finishSnakeRun(false);
        return;
    }

    const willEat = state.snake.food &&
        newHead.x === state.snake.food.x &&
        newHead.y === state.snake.food.y;

    const bodyToCheck = willEat
        ? state.snake.snake
        : state.snake.snake.slice(0, -1);

    if (bodyToCheck.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
        finishSnakeRun(false);
        return;
    }

    state.snake.snake.unshift(newHead);

    if (willEat) {
        snakeEatFood();
    } else {
        state.snake.snake.pop();
    }

    renderSnakeGrid();
}

function snakeEatFood() {
    state.snake.eaten++;
    state.snake.combo++;

    let increment = getSnakeIncrement(state.snake.combo);
    if (state.snake.eaten >= SNAKE_GOAL) {
        state.snake.pot = SNAKE_JACKPOT;
    } else {
        state.snake.pot = roundSnakeMoney(state.snake.pot + increment);
    }

    updateSnakeHud();
    playMoneyGainFxOnly(increment);

    if (state.snake.eaten % SNAKE_SPEEDUP_EVERY === 0) {
        state.snake.tickMs = Math.max(SNAKE_TICK_MIN, state.snake.tickMs - SNAKE_TICK_SPEEDUP);
        if (state.snake.intervalId) {
            clearInterval(state.snake.intervalId);
            state.snake.intervalId = setInterval(snakeTick, state.snake.tickMs);
        }
    }

    if (state.snake.eaten >= SNAKE_GOAL) {
        finishSnakeRun(true);
        return;
    }

    spawnSnakeFood();
    if (!state.snake.food) {
        finishSnakeRun(true);
    }
}

function bankSnakePot() {
    const pot = roundSnakeMoney(state.snake.pot);
    if (pot <= 0) return;

    adjustCash(pot, { gainAmount: pot });
    recordCasinoWin(pot);

    if (pot >= SNAKE_JACKPOT) {
        recordSnakeClear();
        tryUnlockTrophy('snake_clear');
    }
}

function finishSnakeRun(won) {
    if (state.snake.phase !== 'playing') return;

    cleanupSnake();
    state.snake.phase = 'over';

    const pot = roundSnakeMoney(state.snake.pot);
    bankSnakePot();

    if (won && pot >= SNAKE_JACKPOT) {
        showToast(`JACKPOT! ${formatMoney(SNAKE_JACKPOT)}`);
    } else if (pot > 0) {
        showToast(`GAME OVER — WON ${formatMoney(pot)}`);
    } else {
        playDunDun();
        showToast('GAME OVER.');
    }

    const startBtn = document.getElementById('btn-snake-start');
    const dpad = document.getElementById('snake-dpad');
    if (startBtn) startBtn.classList.remove('hidden');
    if (dpad) dpad.classList.add('hidden');
    updateSnakeLeaveUI();

    state.snake.phase = 'lobby';
}
