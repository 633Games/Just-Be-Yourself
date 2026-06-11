let SKILLS_DB = [];
let JOB_DB = [];
let REPLIES_DB = { contacts: {} };
let SKILLS = {};
let PIZZA_PLAYER_ASCII = '';

function normalizeSkillId(id) {
    const n = Number(id);
    return Number.isFinite(n) ? n : null;
}

async function loadGameData() {
    const [skillsRes, jobsRes, eventsRes, repliesRes, pizzaArtRes] = await Promise.all([
        fetch('data/skills.json'),
        fetch('data/jobs.json'),
        fetch('data/events.json'),
        fetch('data/replies.json'),
        fetch('data/ascii/pizza-player.txt'),
    ]);

    if (!skillsRes.ok || !jobsRes.ok || !eventsRes.ok || !repliesRes.ok || !pizzaArtRes.ok) {
        throw new Error('Failed to load game data JSON files');
    }

    const skillsData = await skillsRes.json();
    const jobsData = await jobsRes.json();
    const eventsData = await eventsRes.json();
    const repliesData = await repliesRes.json();
    PIZZA_PLAYER_ASCII = (await pizzaArtRes.text()).replace(/\r\n/g, '\n').trimEnd();

    SKILLS_DB = skillsData.skills;
    JOB_DB = jobsData.jobs;
    EVENTS_DB = eventsData.events || [];
    EVENT_CONTACTS = eventsData.contacts || [];
    REPLIES_DB = repliesData;
    buildSkillsMap();
    registerEventContacts();
}

function buildSkillsMap() {
    SKILLS = {};
    SKILLS_DB.forEach(skill => {
        if (skill.key) SKILLS[skill.key] = skill.id;
    });
}

function getSkill(id) {
    const skillId = normalizeSkillId(id);
    if (skillId === null) return null;
    return SKILLS_DB.find(s => s.id === skillId) || null;
}

function getSkillName(id) {
    return getSkill(id)?.name ?? `Skill ${id}`;
}

function getSkillDescription(id) {
    return getSkill(id)?.description ?? '';
}

function formatSkillReqs(reqIds) {
    if (!reqIds || reqIds.length === 0) return 'NONE';
    return reqIds.map(id => getSkillName(id)).join(', ');
}

function hasSkill(id) {
    const skillId = normalizeSkillId(id);
    if (skillId === null) return false;
    return state.achievements.some(a => normalizeSkillId(a) === skillId);
}

function unlockSkill(id) {
    const skillId = normalizeSkillId(id);
    if (skillId === null || hasSkill(skillId)) return false;
    state.achievements.push(skillId);
    return true;
}

function getEquippedSkillIds() {
    return state.equippedCV
        .map(normalizeSkillId)
        .filter(id => id !== null);
}

function getJobByTitle(title) {
    return JOB_DB.find(j => j.title === title) || null;
}

function getJobById(id) {
    return JOB_DB.find(j => j.id === id) || null;
}

function getSearchableJobs() {
    return JOB_DB.filter(j => j.searchable !== false);
}
