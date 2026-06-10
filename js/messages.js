const REPLY_POOLS = {
    MOM: [
        'Ok son',
        'Busy. Ill read this later',
        'Love you x',
        'Stop texting me at work',
        'Ok love',
        'Ill talk to you tonight',
        'Fine. But rent still due'
    ],
    SUSAN: [
        'Aw thats nice love',
        'Ha ha youre a card',
        'Text your mam not me',
        'Lovely to hear from you x',
        'Youre sweet love',
        'Ha ha ok love'
    ],
    BOSS: [
        'Have you finished your work yet {name}? Sort it out or youre sacked',
        'Less chatting more working {name}',
        'This isnt a social club. Get back to it',
        'Clocks ticking {name}. Move',
        'Sort it out or youre sacked',
        'Save it for break time {name}'
    ]
};

const REPLYABLE_CONTACTS = ['MOM', 'BOSS', 'SUSAN'];
const REPLY_MAX_CHARS = 100;
const pendingReadContacts = new Set();

function normalizeSender(sender) {
    const key = sender.toUpperCase();
    if (key === 'MOM' || key === 'MAM') return 'MOM';
    if (key === 'BOSS' || key === 'SUSAN' || key === 'SKILLS') return key;
    if (key === 'SYS') return 'SKILLS';
    return 'MOM';
}

function getMessageContact(message) {
    return message.contact || message.sender;
}

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function stripHtml(text) {
    return text.replace(/<[^>]+>/g, '');
}

function addMessage(sender, text, options = {}) {
    const contact = normalizeSender(sender);
    const outgoing = Boolean(options.outgoing);
    const viewingThread = !outgoing && state.activeThread === contact;
    const pendingRead = !outgoing && pendingReadContacts.has(contact);
    const markRead = outgoing || viewingThread || pendingRead;

    if (pendingRead) pendingReadContacts.delete(contact);

    state.messages.push({
        id: state.messages.length,
        contact,
        text,
        html: Boolean(options.html),
        read: markRead,
        outgoing
    });
    if (!outgoing && !markRead) {
        state.messagesUnread++;
        state.messagesFlash = true;
    }
    updateMessagesBadge();
}

function markThreadAsRead(contact) {
    if (!contact) return;
    state.messages.forEach(m => {
        if (getMessageContact(m) === contact && !m.read && !m.outgoing) {
            m.read = true;
            state.messagesUnread = Math.max(0, state.messagesUnread - 1);
        }
    });
    updateMessagesBadge();
}

function getUnreadCount(sender) {
    return state.messages.filter(m => {
        return getMessageContact(m) === sender && !m.read && !m.outgoing;
    }).length;
}

function updateMessagesBadge() {
    const badge = document.getElementById('messages-unread-badge');
    if (!badge) return;
    if (state.messagesUnread > 0) {
        badge.classList.remove('hidden');
        badge.innerText = state.messagesUnread > 9 ? '9+' : String(state.messagesUnread);
    } else {
        badge.classList.add('hidden');
        state.messagesFlash = false;
    }

    const msgBtn = document.getElementById('btn-app-messages');
    if (msgBtn) {
        msgBtn.classList.toggle('app-flash', state.messagesFlash);
    }
}

function updateAppMenu() {
    const menuItems = [
        { btnId: 'btn-app-messages', labelId: 'ui-menu-messages-label', key: 'messages', label: 'MESSAGES' },
        { btnId: 'btn-app-work', labelId: 'ui-menu-job-btn', key: 'work', label: () => `[WORK] ${state.currentJobTitle}` },
        { btnId: 'btn-app-cv', labelId: 'ui-menu-cv-label', key: 'cv', label: 'MY CV' },
        { btnId: 'btn-app-jobs', labelId: 'ui-menu-jobs-label', key: 'jobs', label: 'JOB SEARCHER' },
        { btnId: 'btn-app-casino', labelId: 'ui-menu-casino-label', key: 'casino', label: 'CASINO' }
    ];

    let slot = 1;
    menuItems.forEach(item => {
        const btn = document.getElementById(item.btnId);
        const label = document.getElementById(item.labelId);
        if (!btn || !label) return;

        const unlocked = state.unlockedApps[item.key];
        btn.classList.toggle('hidden', !unlocked);

        if (unlocked) {
            const text = typeof item.label === 'function' ? item.label() : item.label;
            label.innerText = `${slot}- ${text}`;
            slot++;
        }
    });

    updateMessagesBadge();
}

function updateWorkAppLabel() {
    const title = document.getElementById('ui-current-job-title');
    if (title) title.innerText = state.currentJobTitle;
    if (typeof updateShiftBriefing === 'function') updateShiftBriefing();
    updateAppMenu();
}

function unlockWorkApp() {
    state.unlockedApps.work = true;
    state.messagesFlash = false;
    updateWorkAppLabel();
}

function unlockCVApp() {
    state.unlockedApps.cv = true;
    state.unlockedApps.jobs = true;
    state.unlockedApps.casino = true;

    const msg = `Hey ${state.playerName}, Mam said you needed help doing your CV ive sent you an app that will help you write your cv with all your skills in, dont put too much in, employers dont normally like that and remember to <strong class="glitch-text">BE YOURSELF</strong>`;
    addMessage('SUSAN', msg, { html: true });
    state.messagesFlash = true;
    updateAppMenu();
}

function checkIntroUnlock() {
    if (state.unlockedApps.work) return;

    const momMessages = state.messages.filter(m => getMessageContact(m) === 'MOM' && !m.outgoing);
    if (momMessages.length > 0 && momMessages.every(m => m.read)) {
        unlockWorkApp();
    }
}

function openMessages() {
    state.messagesView = 'list';
    renderMessagesContacts();
    switchView('messages-view');
}

function openMessageThread(sender) {
    const from = normalizeSender(sender);
    state.messagesView = 'thread';
    state.activeThread = from;
    state.messages.forEach(m => {
        if (getMessageContact(m) === from && !m.read && !m.outgoing) {
            m.read = true;
            state.messagesUnread = Math.max(0, state.messagesUnread - 1);
        }
    });
    updateMessagesBadge();
    renderMessageThread(from);
    switchView('messages-thread-view');
    checkIntroUnlock();
}

function backToMessagesList() {
    markThreadAsRead(state.activeThread);
    state.messagesView = 'list';
    state.activeThread = null;
    renderMessagesContacts();
    switchView('messages-view');
}

function renderMessagesContacts() {
    const container = document.getElementById('messages-contact-list');
    container.innerHTML = '';

    const sendersWithMessages = [...new Set(state.messages.map(m => getMessageContact(m)))];

    if (sendersWithMessages.length === 0) {
        container.innerHTML = '<div class="text-[9px] opacity-70 text-center py-4">NO MESSAGES</div>';
        return;
    }

    sendersWithMessages.forEach(key => {
        const meta = MESSAGE_SENDERS[key];
        if (!meta) return;

        const thread = state.messages.filter(m => getMessageContact(m) === key);
        const unread = getUnreadCount(key);
        const lastMsg = thread[thread.length - 1];
        const previewText = stripHtml(lastMsg.text);
        const preview = previewText.slice(0, 28) + (previewText.length > 28 ? '...' : '');

        const btn = document.createElement('button');
        btn.className = `nokia-btn border border-[var(--lcd-pixel)] mb-1${unread ? ' contact-unread-flash' : ''}`;
        btn.onclick = () => openMessageThread(key);
        btn.innerHTML = `
            <span class="flex flex-col items-start gap-[2px] text-[10px]">
                <span class="font-bold">${meta.label}${unread ? ` (${unread})` : ''}</span>
                <span class="text-[8px] opacity-80 normal-case">${escapeHtml(preview)}</span>
            </span>
            <span>></span>
        `;
        container.appendChild(btn);
    });
}

function renderThreadFooter(from) {
    const payBtn = document.getElementById('btn-pay-rent');
    const payAmount = document.getElementById('rent-pay-amount');
    const replyRow = document.getElementById('message-reply-row');
    const replyInput = document.getElementById('message-reply-input');

    if (replyRow) {
        replyRow.classList.toggle('hidden', !REPLYABLE_CONTACTS.includes(from));
    }
    if (replyInput) {
        replyInput.value = '';
        replyInput.maxLength = REPLY_MAX_CHARS;
    }
    updateReplyCharCount();

    if (from === 'MOM' && payBtn) {
        payBtn.classList.remove('hidden');
        if (state.rentPaidThisWeek) {
            payBtn.disabled = true;
            payBtn.classList.add('opacity-60');
            payBtn.innerHTML = '[ RENT PAID THIS WEEK ]';
        } else {
            payBtn.disabled = false;
            payBtn.classList.remove('opacity-60');
            payBtn.innerHTML = `[ PAY WEEKLY RENT $<span id="rent-pay-amount">${getWeeklyRent().toFixed(2)}</span> ]`;
        }
    } else if (payBtn) {
        payBtn.classList.add('hidden');
    }

    if (payAmount && from === 'MOM' && !state.rentPaidThisWeek) {
        payAmount.innerText = getWeeklyRent().toFixed(2);
    }
}

function renderMessageThread(sender) {
    const from = normalizeSender(sender);
    document.getElementById('messages-thread-title').innerText = MESSAGE_SENDERS[from].label;

    const container = document.getElementById('messages-thread-log');
    const thread = state.messages.filter(m => getMessageContact(m) === from);

    if (thread.length === 0) {
        container.innerHTML = '<div class="text-[9px] opacity-70 text-center py-4">NO MESSAGES YET</div>';
    } else {
        container.innerHTML = thread.map(msg => {
            if (msg.outgoing) {
                return `
                    <div class="msg-outgoing text-[10px] leading-tight normal-case">
                        <div class="msg-outgoing-label">YOU</div>
                        <p>${escapeHtml(msg.text)}</p>
                    </div>
                `;
            }
            return `
                <div class="msg-incoming text-[10px] leading-tight normal-case">
                    <p>${msg.html ? msg.text : escapeHtml(msg.text)}</p>
                </div>
            `;
        }).join('');
    }

    renderThreadFooter(from);
    setTimeout(() => { container.scrollTop = container.scrollHeight; }, 50);
}

function payWeeklyRent() {
    if (state.activeThread !== 'MOM') return;

    const amount = getWeeklyRent();
    if (state.rentPaidThisWeek) {
        showToast('RENT ALREADY PAID');
        return;
    }
    if (state.cash < amount) {
        showToast('NOT ENOUGH CASH');
        return;
    }

    state.cash -= amount;
    state.rentPaidThisWeek = true;
    updateHUD();
    addMessage('MOM', `Got your $${amount.toFixed(2)}. Rent sorted for week ${state.rentWeek}. Cheers love.`);
    renderMessageThread('MOM');
    showToast(`RENT PAID: $${amount.toFixed(2)}`);
}

function queueContactReply(contact) {
    const pool = REPLY_POOLS[contact];
    if (!pool) return;

    setTimeout(() => {
        let reply = pool[Math.floor(Math.random() * pool.length)];
        reply = reply.replace(/\{name\}/gi, state.playerName);
        addMessage(contact, reply);
        if (state.activeThread === contact) {
            renderMessageThread(contact);
        }
    }, 700 + Math.random() * 900);
}

function updateReplyCharCount() {
    const input = document.getElementById('message-reply-input');
    const counter = document.getElementById('message-reply-count');
    if (!input || !counter) return;
    counter.innerText = `${input.value.length}/${REPLY_MAX_CHARS}`;
}

function sendPlayerReply() {
    const input = document.getElementById('message-reply-input');
    if (!input || !state.activeThread) return;

    const text = input.value.trim();
    if (!text) return;
    if (!REPLYABLE_CONTACTS.includes(state.activeThread)) return;
    if (text.length > REPLY_MAX_CHARS) return;

    addMessage(state.activeThread, text, { outgoing: true });
    pendingReadContacts.add(state.activeThread);
    input.value = '';
    updateReplyCharCount();
    renderMessageThread(state.activeThread);
    queueContactReply(state.activeThread);
}

function resetJobToPizzaShift() {
    state.currentJobTitle = 'PIZZA SHIFT';
    state.baseWagePerSec = 0.30;
    state.bossStrikes = 0;
    updateWorkAppLabel();
}

function firePlayer() {
    const oldJob = state.currentJobTitle;
    state.firedFromJob = oldJob;
    state.isUnemployed = true;
    state.currentJobTitle = 'UNEMPLOYED';
    state.baseWagePerSec = 0;
    state.bossStrikes = 0;
    updateWorkAppLabel();
    addMessage('BOSS', `You're fired from ${oldJob}. Don't come back.`);
    setTimeout(() => {
        addMessage('MOM', 'You lost your job again? Rent does not wait.');
    }, 1500);
}

function sendBossShiftFeedback(manual, shiftEarned) {
    if (!state.unlockedApps.work) return;

    const job = state.currentJobTitle;

    if (manual) {
        state.bossStrikes++;
        if (state.bossStrikes >= 2) {
            firePlayer();
            return;
        }
        addMessage('BOSS', `Left ${job} early? Strike ${state.bossStrikes}/2. Finish your shifts.`);
        return;
    }

    state.bossStrikes = 0;

    const tipNote = state.shiftTipsCollected > 0
        ? ` ${state.shiftTipsCollected} tip${state.shiftTipsCollected === 1 ? '' : 's'} collected.`
        : '';

    const base = state.baseWagePerSec * state.shiftMaxTime;
    const strong = base * 1.15;
    const decent = base * 0.85;

    if (shiftEarned >= strong) {
        addMessage('BOSS', `Strong shift at ${job}. $${shiftEarned.toFixed(2)} earned.${tipNote} Keep it up.`);
    } else if (shiftEarned >= decent) {
        addMessage('BOSS', `Decent work at ${job}.${tipNote} Try to earn more next shift.`);
    } else {
        addMessage('BOSS', `Slow shift at ${job}. Pick up the pace or customers stop tipping.`);
    }
}

function notifySkillUnlocked(skillId) {
    const id = normalizeSkillId(skillId);
    addMessage('SKILLS', `NEW SKILL: ${getSkillName(id)}. Open MY CV to equip it.`);
}

function notifyJobHired(jobTitle, wage) {
    addMessage('BOSS', `Welcome to ${jobTitle}. $${wage.toFixed(2)}/sec. Do not be late.`);
    state.bossStrikes = 0;
}
