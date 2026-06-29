let SKILLS_DB = [];
let JOB_DB = [];
let VIP_JOBS_DB = [];
let REPLIES_DB = { contacts: {} };
window.REPLIES_DB = REPLIES_DB;
let SKILLS = {};
let PIZZA_PLAYER_ASCII = '';
let BURGER_GRILL_ASCII = '';
let BOOT_SPLASH_ASCII = '';
let CINDER_DB = { defaultBioTemplate: '', profiles: [] };
let CINDER_FACES = {};
let CINDER_PROFILES = {};

const DATA_CACHE_BUST = Date.now();

function fetchData(path) {
    return fetch(`${path}?cb=${DATA_CACHE_BUST}`);
}

function trimAsciiBlankEdges(text) {
    return normalizeAsciiText(text, { trimEdges: true, trimEnd: false });
}

function centerAsciiArt(text) {
    return normalizeAsciiText(text, { trimEdges: true, center: true, trimEnd: false });
}

function normalizeSkillId(id) {
    const n = Number(id);
    return Number.isFinite(n) ? n : null;
}

async function loadGameData() {
    const [skillsRes, jobsRes, vipJobsRes, eventsRes, repliesRes, cinderRes, trophiesRes, pizzaArtRes, burgerArtRes, bootArtRes] = await Promise.all([
        fetchData('data/skills.json'),
        fetchData('data/jobs.json'),
        fetchData('data/vipjobs.json'),
        fetchData('data/events.json'),
        fetchData('data/replies.json'),
        fetchData('data/cinder.json'),
        fetchData('data/trophies.json'),
        fetchData('data/ascii/pizza-player.txt'),
        fetchData('data/ascii/burger-grill.txt'),
        fetchData('data/ascii/boot-splash.txt'),
    ]);

    if (!skillsRes.ok || !jobsRes.ok || !vipJobsRes.ok || !eventsRes.ok || !repliesRes.ok || !cinderRes.ok || !trophiesRes.ok || !pizzaArtRes.ok || !burgerArtRes.ok || !bootArtRes.ok) {
        throw new Error('Failed to load game data JSON files');
    }

    const skillsData = await skillsRes.json();
    const jobsData = await jobsRes.json();
    await vipJobsRes.json();
    const eventsData = await eventsRes.json();
    const repliesData = await repliesRes.json();
    const cinderData = await cinderRes.json();
    const trophiesData = await trophiesRes.json();
    PIZZA_PLAYER_ASCII = normalizeAsciiText(await pizzaArtRes.text());
    BURGER_GRILL_ASCII = normalizeAsciiText(await burgerArtRes.text());
    BOOT_SPLASH_ASCII = normalizeAsciiText(await bootArtRes.text(), { trimEdges: true });

    SKILLS_DB = skillsData.skills;
    JOB_DB = jobsData.jobs;
    VIP_JOBS_DB = [];
    EVENTS_DB = eventsData.events || [];
    EVENT_CONTACTS = eventsData.contacts || [];
    REPLIES_DB = repliesData;
    window.REPLIES_DB = REPLIES_DB;
    if (!REPLIES_DB.contacts || !REPLIES_DB.contacts.MOM) {
        throw new Error('replies.json must define contacts.MOM');
    }
    CINDER_DB = cinderData;
    TROPHIES_DB = trophiesData.trophies || [];
    buildSkillsMap();
    registerEventContacts();
    await loadCinderFaces();
    registerCinderProfiles();
}

async function loadCinderFaces() {
    const profiles = CINDER_DB.profiles || [];
    const uniqueFiles = [...new Set(profiles.map(p => p.asciiFile).filter(Boolean))];
    const results = await Promise.all(
        uniqueFiles.map(async file => {
            const res = await fetchData(`data/ascii/${file}`);
            if (!res.ok) throw new Error(`Failed to load Cinder ASCII: ${file}`);
            const text = normalizeAsciiText(await res.text(), { trimEdges: true });
            return [file, text];
        })
    );
    const fileMap = Object.fromEntries(results);
    CINDER_FACES = {};
    profiles.forEach(profile => {
        if (profile.id && profile.asciiFile) {
            CINDER_FACES[profile.id] = centerAsciiArt(fileMap[profile.asciiFile] || '');
        }
    });
}

function registerCinderProfiles() {
    CINDER_PROFILES = {};
    (CINDER_DB.profiles || []).forEach(profile => {
        if (profile.id) CINDER_PROFILES[profile.id] = profile;
    });
}

function getCinderContactKey(profileId) {
    return `CINDER_${String(profileId).toUpperCase()}`;
}

function getCinderProfileById(profileId) {
    return CINDER_PROFILES[profileId] || null;
}

function isCinderCrashProfile(profile) {
    return profile?.special === 'crash';
}

function isCinderUnknownContact(contact) {
    return contact === getCinderContactKey('unknown');
}

function generateCinderBio(profile) {
    if (!profile) return '';
    const template = profile.bioTemplate || CINDER_DB.defaultBioTemplate || '';
    const fields = { name: profile.name || '', age: String(profile.age ?? ''), ...(profile.bioFields || {}) };
    return fillTemplate(template, fields);
}

function unlockCinderContact(profileId) {
    const profile = getCinderProfileById(profileId);
    if (!profile || isCinderCrashProfile(profile)) return null;

    const contactKey = getCinderContactKey(profileId);
    if (state.cinder.unlockedContacts.includes(contactKey)) return contactKey;

    MESSAGE_SENDERS[contactKey] = {
        label: profile.name,
        preview: 'Cinder match',
        category: 'cinder_match'
    };

    if (profile.replies) {
        if (!REPLIES_DB.contacts) REPLIES_DB.contacts = {};
        REPLIES_DB.contacts[contactKey] = profile.replies;
    }

    state.cinder.unlockedContacts.push(contactKey);
    return contactKey;
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

function getVipJobById(id) {
    return VIP_JOBS_DB.find(j => j.id === id) || null;
}

function getSearchableJobs() {
    return JOB_DB.filter(j => j.searchable !== false);
}
