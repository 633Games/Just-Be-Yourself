function calculateMatch(jobReqs) {
    if (!jobReqs || jobReqs.length === 0) return 100;

    const equipped = getEquippedSkillIds();
    let matches = 0;
    jobReqs.forEach(req => {
        const reqId = normalizeSkillId(req);
        if (reqId !== null && equipped.includes(reqId)) matches++;
    });

    return Math.floor((matches / jobReqs.length) * 100);
}

function generateJobs() {
    state.availableJobs = [];
    // Copy and shuffle the database
    let pool = [...getSearchableJobs()].sort(() => Math.random() - 0.5);

    // 1. Find a job with partial qualification (50% to 99%)
    let jobPartialIndex = pool.findIndex(j => calculateMatch(j.req) >= 50 && calculateMatch(j.req) < 100);
    if (jobPartialIndex === -1) jobPartialIndex = 0; // Fallback if none exist
    state.availableJobs.push(pool.splice(jobPartialIndex, 1)[0]);

    // 2. Find a job you are 100% qualified for
    let job100Index = pool.findIndex(j => calculateMatch(j.req) === 100);
    if (job100Index === -1) job100Index = 0; 
    state.availableJobs.push(pool.splice(job100Index, 1)[0]);

    // 3. The Wildcard (20% chance for a completely unqualified job 0%, otherwise random)
    let rareChance = Math.random();
    let jobWildIndex = 0;
    if (rareChance < 0.2) {
        jobWildIndex = pool.findIndex(j => calculateMatch(j.req) === 0);
        if (jobWildIndex === -1) jobWildIndex = 0;
    }
    state.availableJobs.push(pool.splice(jobWildIndex, 1)[0]);
    
    // Shuffle final display order so the 100% job isn't always in the exact same spot
    state.availableJobs.sort(() => Math.random() - 0.5);
}

function openJobSearcher() {
    if (!state.unlockedApps.jobs) {
        showToast('APP LOCKED');
        return;
    }
    generateJobs();
    renderJobSearcher();
    switchView('job-searcher-view');
}

function renderJobSearcher() {
    const container = document.getElementById('job-list-content');
    container.innerHTML = '<div class="text-[9px] mb-1 font-bold">AVAILABLE LISTINGS:</div>';
    
    state.availableJobs.forEach(job => {
        const match = calculateMatch(job.req);
        container.innerHTML += `
            <div class="border-2 border-[var(--lcd-pixel)] p-1 flex flex-col gap-1 bg-transparent">
                <div class="flex justify-between font-bold text-[10px]">
                    <span>${job.title}</span>
                    <span>$${job.pay.toFixed(2)}/s</span>
                </div>
                <div class="text-[8px] opacity-90 leading-tight">REQ: ${formatSkillReqs(job.req)}</div>
                <div class="flex justify-between items-center mt-1 border-t border-dashed border-[var(--lcd-pixel)] pt-1">
                    <span class="text-[9px] ${match >= 50 ? 'font-bold' : ''}">MATCH: ${match}%</span>
                    <button onclick="applyForJob('${job.id}')" class="nokia-btn-outline px-2 py-[2px] text-[9px] w-auto">
                        APPLY
                    </button>
                </div>
            </div>
        `;
    });
}

function applyForJob(jobId) {
    const job = getJobById(jobId);
    const match = calculateMatch(job.req);
    
    startInterview(job, match);
}

const QUIZ_DB = {
    100: [
        { q: "WHAT COLOR IS A FIRE TRUCK?", a: ["RED", "BLUE", "TRIANGLE"], correct: 0 },
        { q: "SPELL 'GREEN'", a: ["G-R-E-E-N", "B-L-U-E", "7"], correct: 0 },
        { q: "WHAT IS 1 + 1?", a: ["2", "ELEPHANT", "11"], correct: 0 }
    ],
    50: [
        { q: "SOLVE: 4X + 12 = 36", a: ["X = 6", "X = 12", "X = 4"], correct: 0 },
        { q: "QUARTERS IN $3.50?", a: ["14", "12", "16"], correct: 0 },
        { q: "IF A=1, Z=26, FIND C+D", a: ["7", "6", "8"], correct: 0 }
    ]
};

function startInterview(job, match) {
    let qPool = [];
    let timerMax = 10;
    
    if (match === 100) {
        qPool = [...QUIZ_DB[100]].sort(() => Math.random() - 0.5);
        timerMax = 15;
    } else if (match > 0) {
        qPool = [...QUIZ_DB[50]].sort(() => Math.random() - 0.5);
        timerMax = 8;
    } else {
        // 0% Match
        qPool = [ { q: "ERROR", a: ["A", "B", "C"], correct: -1 } ]; // Unwinnable
        timerMax = 2;
    }

    state.interview = {
        job: job,
        match: match,
        question: qPool[0], // 1 question per interview to keep it punchy
        timeLeft: timerMax,
        interval: null,
        scrambleInterval: null
    };

    recordInterviewStarted();
    switchView('interview-view');
    renderInterview();

    // Run the timer
    state.interview.interval = setInterval(() => {
        state.interview.timeLeft -= 0.1;
        document.getElementById('interview-timer').innerText = Math.max(0, state.interview.timeLeft).toFixed(1);
        
        if (state.interview.timeLeft <= 0) {
            endInterview(false, "TIME UP!");
        }
    }, 100);

    // Turn on the glitch text if underqualified
    if (match === 0) {
        state.interview.scrambleInterval = setInterval(scrambleInterviewUI, 50);
    }
}

function renderInterview() {
    const qData = state.interview.question;
    document.getElementById('interview-q').innerText = qData.q;
    
    const ansContainer = document.getElementById('interview-answers');
    ansContainer.innerHTML = '';
    
    // Shuffle answers but remember which one was originally correct
    let answers = qData.a.map((text, idx) => ({text, isCorrect: idx === qData.correct}));
    answers.sort(() => Math.random() - 0.5);

    answers.forEach(ans => {
        const btn = document.createElement('button');
        btn.className = "nokia-btn nokia-btn-outline w-full py-2 text-[10px] interview-ans-btn transition-transform";
        btn.innerText = ans.text;
        btn.onclick = () => endInterview(ans.isCorrect, ans.isCorrect ? "HIRED!" : "INCORRECT!");
        
        // Evade cursor if 0%
        if (state.interview.match === 0) {
            btn.onmouseenter = () => {
                btn.style.transform = `translate(${Math.random()*30 - 15}px, ${Math.random()*15 - 7.5}px)`;
            };
        }
        
        ansContainer.appendChild(btn);
    });
}

function scrambleInterviewUI() {
    const chars = 'ᔑʖᓵ↸ᒷ⎓⊣⍑╎⋮ꖌꖎᒲリ𝙹!¡ᑑ∷ᓭℸ⚍⍊∴S||⨅'; // Approximation of standard galactic alphabet
    
    const getScramble = (len) => {
        let res = '';
        for(let i=0; i<len; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
        return res;
    };

    document.getElementById('interview-q').innerText = getScramble(15);
    document.querySelectorAll('.interview-ans-btn').forEach(btn => {
        btn.innerText = getScramble(8);
    });
}

function endInterview(isCorrect, reason) {
    clearInterval(state.interview.interval);
    clearInterval(state.interview.scrambleInterval);
    
    if (isCorrect && state.interview.match > 0) {
        // Hired! Apply new wage and update UI titles
        state.currentJobTitle = state.interview.job.title;
        state.baseWagePerSec = state.interview.job.pay;
        
        updateWorkAppLabel();
        recordInterviewPassed();
        recordNewJob();
        
        showToast(`${reason}<br>NEW WAGE: $${state.baseWagePerSec.toFixed(2)}/s`);
        notifyJobHired(state.interview.job.title, state.interview.job.pay);
    } else {
        recordInterviewFailed();
        showToast(`REJECTED:<br>${reason}`);
    }
    
    switchView('home-view');
    state.interview = null;
}

function openCV() {
    if (!state.unlockedApps.cv) {
        showToast('CV APP LOCKED');
        return;
    }
    setupCVListeners();
    renderCV();
    switchView('cv-view');
}

function renderCVSkillButton(skillId, equipped) {
    const id = normalizeSkillId(skillId);
    const name = getSkillName(id);
    const description = getSkillDescription(id);
    const marker = equipped ? '[*]' : '[ ]';
    const borderClass = equipped ? ' border border-[var(--lcd-pixel)] mb-1' : '';
    const descHtml = description
        ? `<span class="text-[8px] opacity-80 block leading-tight mt-[2px]">${description}</span>`
        : '';

    return `
        <button data-skill-id="${id}" class="cv-skill-btn nokia-btn text-[9px]${borderClass} text-left w-full">
            <span>${marker} ${name}</span>
            ${descHtml}
        </button>
    `;
}

function renderCV() {
    const container = document.getElementById('cv-content');
    container.innerHTML = '<div class="text-[10px] mb-1 font-bold">EQUIPPED SKILLS:</div>';
    
    if (state.equippedCV.length === 0) {
        container.innerHTML += '<div class="text-[9px] opacity-70 mb-2 px-2">- EMPTY SLOT -</div>';
    } else {
        state.equippedCV.forEach(skillId => {
            container.innerHTML += renderCVSkillButton(skillId, true);
        });
    }

    container.innerHTML += '<div class="text-[10px] mt-2 mb-1 font-bold border-t-2 border-dashed border-[var(--lcd-pixel)] pt-2">AVAILABLE:</div>';
    
    const equipped = getEquippedSkillIds();
    const available = state.achievements
        .map(normalizeSkillId)
        .filter(id => id !== null && !equipped.includes(id));
    if (available.length === 0) {
        container.innerHTML += '<div class="text-[9px] opacity-70 px-2">- NONE -</div>';
    } else {
        available.forEach(skillId => {
            container.innerHTML += renderCVSkillButton(skillId, false);
        });
    }
    
    document.getElementById('cv-equipped-count').innerText = `${state.equippedCV.length}/${state.maxCVSlots}`;
}

function toggleCV(skillId) {
    const id = normalizeSkillId(skillId);
    if (id === null) return;

    if (state.equippedCV.some(s => normalizeSkillId(s) === id)) {
        state.equippedCV = state.equippedCV.filter(s => normalizeSkillId(s) !== id);
    } else {
        if (state.equippedCV.length >= state.maxCVSlots) {
            showToast('CV FULL!');
            return;
        }
        state.equippedCV.push(id);
    }
    renderCV();
}

function setupCVListeners() {
    const container = document.getElementById('cv-content');
    if (!container || container.dataset.cvBound) return;
    container.dataset.cvBound = 'true';
    container.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-skill-id]');
        if (btn) toggleCV(btn.dataset.skillId);
    });
}
