let SKILLS_DB = [];
let JOB_DB = [];
let VIP_JOBS_DB = [];
let REPLIES_DB = { contacts: {} };
let SKILLS = {};
let PIZZA_PLAYER_ASCII = '';
let BURGER_GRILL_ASCII = '';
let BOOT_SPLASH_ASCII = '';
let CINDER_DB = { defaultBioTemplate: '', profiles: [] };
let CINDER_FACES = {};
let CINDER_PROFILES = {};

function trimAsciiBlankEdges(text) {
    const lines = text.replace(/\r\n/g, '\n').split('\n');
    while (lines.length && !lines[0].trim()) lines.shift();
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
    return lines.join('\n');
}

function centerAsciiArt(text) {
    let lines = trimAsciiBlankEdges(text).split('\n');
    if (!lines.length) return '';
    return lines.map(line => line.trim()).join('\n');
}

function normalizeSkillId(id) {
    const n = Number(id);
    return Number.isFinite(n) ? n : null;
}

async function loadGameData() {
    const [skillsRes, jobsRes, vipJobsRes, eventsRes, repliesRes, cinderRes, pizzaArtRes, burgerArtRes, bootArtRes] = await Promise.all([
        fetch('data/skills.json'),
        fetch('data/jobs.json'),
        fetch('data/vipjobs.json'),
        fetch('data/events.json'),
        fetch('data/replies.json'),
        fetch('data/cinder.json'),
        fetch('data/ascii/pizza-player.txt'),
        fetch('data/ascii/burger-grill.txt'),
        fetch('data/ascii/boot-splash.txt'),
    ]);

    if (!skillsRes.ok || !jobsRes.ok || !vipJobsRes.ok || !eventsRes.ok || !repliesRes.ok || !cinderRes.ok || !pizzaArtRes.ok || !burgerArtRes.ok || !bootArtRes.ok) {
        throw new Error('Failed to load game data JSON files');
    }

    const skillsData = await skillsRes.json();
    const jobsData = await jobsRes.json();
    const vipJobsData = await vipJobsRes.json();
    const eventsData = await eventsRes.json();
    const repliesData = await repliesRes.json();
    const cinderData = await cinderRes.json();
    PIZZA_PLAYER_ASCII = (await pizzaArtRes.text()).replace(/\r\n/g, '\n').trimEnd();
    BURGER_GRILL_ASCII = (await burgerArtRes.text()).replace(/\r\n/g, '\n').trimEnd();
    BOOT_SPLASH_ASCII = trimAsciiBlankEdges((await bootArtRes.text()).replace(/\r\n/g, '\n'));

    SKILLS_DB = skillsData.skills;
    JOB_DB = jobsData.jobs;
    VIP_JOBS_DB = vipJobsData.jobs || [];
    EVENTS_DB = eventsData.events || [];
    EVENT_CONTACTS = eventsData.contacts || [];
    REPLIES_DB = repliesData;
    if (!REPLIES_DB.contacts || !REPLIES_DB.contacts.MOM) {
        throw new Error('replies.json must define contacts.MOM');
    }
    CINDER_DB = cinderData;
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
            const res = await fetch(`data/ascii/${file}`);
            if (!res.ok) throw new Error(`Failed to load Cinder ASCII: ${file}`);
            const text = trimAsciiBlankEdges((await res.text()).replace(/\r\n/g, '\n'));
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
    return template.replace(/\{(\w+)\}/g, (_, key) => fields[key] ?? '');
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

function getVipJobById(id) {
    return VIP_JOBS_DB.find(j => j.id === id) || null;
}

function getSearchableJobs() {
    return JOB_DB.filter(j => j.searchable !== false);
}
