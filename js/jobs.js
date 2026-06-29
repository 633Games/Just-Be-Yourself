function calculateMatch(jobReqs) {
    return computeJobMatch(jobReqs, 'equipped');
}

function formatSkillReqsWithStatus(reqIds) {
    if (!reqIds || reqIds.length === 0) return 'NONE';

    const equipped = getEquippedSkillIds();
    return reqIds.map(id => {
        const skillId = normalizeSkillId(id);
        const marker = skillId !== null && equipped.includes(skillId) ? '[*]' : '[ ]';
        return `${marker} ${getSkillName(skillId)}`;
    }).join('  ');
}

function generateJobs() {
    state.availableJobs = [];
    let pool = shuffleArray(getSearchableJobs());
    if (pool.length === 0) return;

    const isPartialJob = (job) => {
        const match = calculateMatch(job.req);
        const potential = computeJobMatch(job.req, 'owned');
        return (match >= 50 && match < 100) || (potential >= 50 && potential < 100 && match < 100);
    };

    let jobPartialIndex = pool.findIndex(isPartialJob);
    if (jobPartialIndex === -1) jobPartialIndex = 0;
    state.availableJobs.push(pool.splice(jobPartialIndex, 1)[0]);

    let job100Index = pool.findIndex(j => calculateMatch(j.req) === 100);
    if (job100Index === -1) {
        job100Index = pool.findIndex(j => computeJobMatch(j.req, 'owned') === 100);
    }
    if (job100Index === -1) job100Index = 0;
    state.availableJobs.push(pool.splice(job100Index, 1)[0]);

    let jobWildIndex = 0;
    if (Math.random() < 0.2) {
        jobWildIndex = pool.findIndex(j => calculateMatch(j.req) === 0);
        if (jobWildIndex === -1) jobWildIndex = 0;
    } else {
        const owned = getOwnedSkillIds();
        jobWildIndex = pool.findIndex(j =>
            (j.req || []).some(req => !owned.includes(normalizeSkillId(req)))
        );
        if (jobWildIndex === -1) jobWildIndex = Math.floor(Math.random() * pool.length);
    }
    if (pool.length > 0) {
        state.availableJobs.push(pool.splice(jobWildIndex, 1)[0]);
    }

    state.availableJobs = shuffleArray(state.availableJobs);
}

function openJobSearcher() {
    openUnlockedApp('jobs', () => {
        tryUnlockTrophy('job_search');
        generateJobs();
        renderJobSearcher();
    }, 'job-searcher-view');
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
                    <span>${formatMoney(job.pay)}/s</span>
                </div>
                <div class="text-[8px] opacity-90 leading-tight">REQ: ${formatSkillReqsWithStatus(job.req)}</div>
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
        qPool = shuffleArray(QUIZ_DB[100]);
        timerMax = 15;
    } else if (match > 0) {
        qPool = shuffleArray(QUIZ_DB[50]);
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
    answers = shuffleArray(answers);

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
        tryUnlockTrophy('new_job');
        tryUnlockJobTierTrophy(state.interview.job.title);
        checkTrophyMilestones();
        
        showToast(`${reason}<br>NEW WAGE: ${formatMoney(state.baseWagePerSec)}/s`);
        notifyJobHired(state.interview.job.title, state.interview.job.pay);
    } else {
        recordInterviewFailed();
        showToast(`REJECTED:<br>${reason}`);
    }
    
    switchView('home-view');
    state.interview = null;
}

function openCV() {
    openUnlockedApp('cv', () => {
        setupCVListeners();
        renderCV();
    }, 'cv-view', 'CV APP LOCKED');
}

function renderCVSkillCard(skillId, equipped) {
    const id = normalizeSkillId(skillId);
    const name = getSkillName(id);
    const description = formatSkillDescription(id);
    const marker = equipped ? '[*]' : '[ ]';
    const status = equipped ? 'EQUIPPED' : 'TAP TO ADD';
    const jobs = getJobsRequiringSkill(id);
    const jobsLine = jobs.length > 0
        ? jobs.map(j => j.title).join(', ')
        : '';

    const descHtml = description
        ? `<div class="cv-skill-card-detail cv-skill-card-muted">${description}</div>`
        : '';
    const jobsHtml = jobsLine
        ? `<div class="cv-skill-card-detail cv-skill-card-detail--jobs cv-skill-card-muted">NEEDED FOR: ${jobsLine}</div>`
        : '';

    return `
        <button type="button" data-skill-id="${id}" class="cv-skill-card border-2 border-[var(--lcd-pixel)]${equipped ? ' cv-skill-card--equipped' : ''}">
            <div class="cv-skill-card-title">${marker} ${name}</div>
            <div class="cv-skill-card-status cv-skill-card-muted">${status}</div>
            ${descHtml}
            ${jobsHtml}
        </button>
    `;
}

function renderCVLockedCard(skillId) {
    const id = normalizeSkillId(skillId);
    const name = getSkillName(id);

    return `
        <div class="cv-skill-card-locked border-2 border-[var(--lcd-pixel)]">
            <div class="cv-skill-card-locked-title">[LOCKED] ${name}</div>
        </div>
    `;
}

function renderCV() {
    const container = document.getElementById('cv-content');
    const equipped = getEquippedSkillIds();

    const unlocked = SKILLS_DB
        .map(skill => normalizeSkillId(skill.id))
        .filter(id => id !== null && hasSkill(id));
    const locked = SKILLS_DB
        .map(skill => normalizeSkillId(skill.id))
        .filter(id => id !== null && !hasSkill(id));

    let html = '<div class="cv-section-label">AVAILABLE:</div>';
    html += '<div class="cv-skill-list">';
    if (unlocked.length === 0) {
        html += '<div class="text-[9px] opacity-70 px-1">- NONE YET -</div>';
    } else {
        unlocked.forEach(id => {
            html += renderCVSkillCard(id, equipped.includes(id));
        });
    }
    html += '</div>';

    html += '<div class="cv-section-divider"></div>';

    html += '<div class="cv-section-label">LOCKED:</div>';
    html += '<div class="cv-skill-list">';
    if (locked.length === 0) {
        html += '<div class="text-[9px] opacity-70 px-1">- NONE -</div>';
    } else {
        locked.forEach(id => {
            html += renderCVLockedCard(id);
        });
    }
    html += '</div>';

    container.innerHTML = html;

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
    checkTrophyMilestones();
}

function setupCVListeners() {
    const container = document.getElementById('cv-content');
    if (!container || container.dataset.cvBound) return;
    container.dataset.cvBound = 'true';
    container.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-skill-id]');
        if (btn && btn.classList.contains('cv-skill-card')) toggleCV(btn.dataset.skillId);
    });
}
