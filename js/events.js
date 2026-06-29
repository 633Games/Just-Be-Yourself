const MAX_EVENTS_PER_DAY = 1;

let EVENTS_DB = [];
let EVENT_CONTACTS = [];

function registerEventContacts() {
    EVENT_CONTACTS.forEach(contact => {
        if (!contact?.id) return;
        MESSAGE_SENDERS[contact.id] = {
            label: contact.label || contact.id,
            preview: contact.preview || 'Updates'
        };
    });
}

function getEventById(id) {
    return EVENTS_DB.find(e => e.id === id) || null;
}

function getEventHistory(eventId) {
    if (!state.eventHistory[eventId]) {
        state.eventHistory[eventId] = {
            count: 0,
            lastTriggeredShift: null,
            lastTriggeredDateMs: null
        };
    }
    return state.eventHistory[eventId];
}

function formatEventText(template, ctx = {}) {
    if (!template) return '';
    const amount = ctx.amount ?? 0;
    return fillTemplate(template, {
        amount: formatMoney(amount),
        name: state.playerName || 'nephew',
        deadlineDays: String(ctx.deadlineDays ?? ''),
    });
}

function roundAmount(value, roundTo = 1) {
    if (!roundTo || roundTo <= 0) return Math.ceil(value);
    return Math.ceil(value / roundTo) * roundTo;
}

function computeEventAmount(amountDef) {
    if (!amountDef) return 0;

    let value = 0;
    if (amountDef.type === 'percent_cash') {
        value = state.cash * (amountDef.percent ?? 0);
    } else {
        const min = amountDef.min ?? 0;
        const max = amountDef.max ?? min;
        value = min + Math.random() * (max - min);
    }

    value = roundAmount(value, amountDef.roundTo ?? 1);
    if (amountDef.min != null) value = Math.max(value, amountDef.min);
    if (amountDef.max != null) value = Math.min(value, amountDef.max);
    return Math.max(0, value);
}

function computeEscalatedAmount(baseAmount, escalationDef) {
    if (!escalationDef) return baseAmount;
    const multiplier = escalationDef.multiplier ?? 1;
    const minExtra = escalationDef.minExtra ?? 0;
    return Math.ceil(baseAmount * multiplier + minExtra);
}

function hasPendingEventForContact(contact) {
    return state.activeEvents.some(e => e.contact === contact && e.status === 'pending');
}

function eventConditionsMet(eventDef) {
    const conditions = eventDef.conditions || {};

    if (conditions.minShifts != null && state.shiftsCompleted < conditions.minShifts) return false;
    if (conditions.maxShifts != null && state.shiftsCompleted > conditions.maxShifts) return false;
    if (conditions.minCash != null && state.cash < conditions.minCash) return false;
    if (conditions.maxCash != null && state.cash > conditions.maxCash) return false;
    if (conditions.minRentWeek != null && state.rentWeek < conditions.minRentWeek) return false;
    if (conditions.maxRentWeek != null && state.rentWeek > conditions.maxRentWeek) return false;
    if (conditions.requiresJob && state.currentJobTitle !== conditions.requiresJob) return false;
    if (conditions.excludesJob && state.currentJobTitle === conditions.excludesJob) return false;
    if (conditions.requiresSkill != null && !hasSkill(conditions.requiresSkill)) return false;
    if (conditions.excludesSkill != null && hasSkill(conditions.excludesSkill)) return false;

    if (conditions.requiresApps) {
        for (const app of conditions.requiresApps) {
            if (!state.unlockedApps[app]) return false;
        }
    }

    if (conditions.onePerContact && hasPendingEventForContact(eventDef.contact)) return false;

    const history = getEventHistory(eventDef.id);
    const schedule = eventDef.schedule || {};

    if (schedule.maxOccurrences != null && history.count >= schedule.maxOccurrences) return false;

    if (schedule.cooldownDays != null && history.lastTriggeredShift != null) {
        const daysSince = state.shiftsCompleted - history.lastTriggeredShift;
        if (daysSince < schedule.cooldownDays) return false;
    }

    return true;
}

function isScheduleDue(eventDef, scheduleContext) {
    const schedule = eventDef.schedule || {};
    const type = schedule.type;
    const history = getEventHistory(eventDef.id);

    switch (type) {
        case 'once':
            return history.count === 0;
        case 'daily_chance':
            return true;
        case 'weekly_chance':
            return state.shiftsCompleted > 0 && state.shiftsCompleted % 7 === 0;
        case 'monthly_chance':
            return scheduleContext.monthChanged;
        case 'on_shift':
            return Array.isArray(schedule.shifts) && schedule.shifts.includes(state.shiftsCompleted);
        case 'every_n_days': {
            const interval = schedule.interval ?? 1;
            return state.shiftsCompleted > 0 && state.shiftsCompleted % interval === 0;
        }
        default:
            return false;
    }
}

function passesChanceRoll(eventDef) {
    const schedule = eventDef.schedule || {};
    const type = schedule.type || '';
    if (!type.endsWith('_chance')) return true;
    const chance = schedule.chance ?? 0;
    return Math.random() < chance;
}

function pickWeightedEvent(candidates) {
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];

    const totalWeight = candidates.reduce((sum, e) => sum + (e.schedule?.weight ?? 1), 0);
    let roll = Math.random() * totalWeight;
    for (const eventDef of candidates) {
        roll -= eventDef.schedule?.weight ?? 1;
        if (roll <= 0) return eventDef;
    }
    return candidates[candidates.length - 1];
}

function getEventStats() {
    return { ...state.eventStats };
}

function recordEventAccepted(amount) {
    state.eventStats.moneyGiven += amount;
    state.eventStats.eventsAccepted++;
    recordEventMoneyGiven(amount);
    recordEventPaymentHappiness();
    checkGenerositySkillUnlock();
}

function recordEventRefused() {
    state.eventStats.eventsRefused++;
    recordEventRefusedHappiness();
}

function recordEventForced(amount) {
    state.eventStats.moneyForced += amount;
    recordEventMoneyGiven(amount);
    if (amount > 0) recordEventPaymentHappiness();
}


function getPendingEventForContact(contact) {
    const instance = state.activeEvents.find(e => e.contact === contact && e.status === 'pending');
    if (!instance) return null;
    const eventDef = getEventById(instance.eventId);
    if (!eventDef) return null;
    return { instance, eventDef };
}

function triggerEvent(eventDef) {
    const baseAmount = computeEventAmount(eventDef.amount);
    const escalatedAmount = computeEscalatedAmount(baseAmount, eventDef.escalation);
    const deadlineDays = eventDef.deadlineDays ?? 0;
    const instanceId = `${eventDef.id}_${state.shiftsCompleted}`;

    const instance = {
        instanceId,
        eventId: eventDef.id,
        contact: eventDef.contact,
        baseAmount,
        escalatedAmount,
        triggeredShift: state.shiftsCompleted,
        deadlineShift: state.shiftsCompleted + deadlineDays,
        status: 'pending'
    };

    state.activeEvents.push(instance);

    const history = getEventHistory(eventDef.id);
    history.count++;
    history.lastTriggeredShift = state.shiftsCompleted;
    history.lastTriggeredDateMs = state.gameDateMs;

    const text = formatEventText(eventDef.opening?.text, {
        amount: baseAmount,
        deadlineDays
    });

    addMessage(eventDef.contact, text, { eventInstanceId: instanceId });
    state.messagesFlash = true;
    updateMessagesBadge();
}

function resolveExpiredEvent(instance, eventDef) {
    const escalation = eventDef.escalation || {};
    instance.status = 'resolved';
    instance.outcome = 'expired';

    if (escalation.forcedMessage) {
        const amount = escalation.deductEvenIfBroke !== false ? instance.escalatedAmount : instance.baseAmount;
        const text = formatEventText(escalation.forcedMessage, { amount });
        addMessage(instance.contact, text);
    }

    if (escalation.deductEvenIfBroke !== false && instance.escalatedAmount > 0) {
        const deducted = Math.min(state.cash, instance.escalatedAmount);
        state.cash -= deducted;
        if (deducted > 0) recordEventForced(deducted);
        updateHUD();
        if (deducted < instance.escalatedAmount) {
            addMessage(instance.contact, `Took every penny you had. Still short $${(instance.escalatedAmount - deducted).toFixed(2)}.`);
        }
    }

    if (state.activeThread === instance.contact) {
        renderMessageThread(instance.contact);
    }
}

function processEventDeadlines() {
    const pending = state.activeEvents.filter(e => e.status === 'pending');
    for (const instance of pending) {
        if (state.shiftsCompleted <= instance.deadlineShift) continue;
        const eventDef = getEventById(instance.eventId);
        if (!eventDef) {
            instance.status = 'resolved';
            instance.outcome = 'expired';
            continue;
        }
        resolveExpiredEvent(instance, eventDef);
    }
}

function tryRollRandomEvents(scheduleContext = {}) {
    if (state.shiftsCompleted === 0) return;

    const triggeredToday = state.activeEvents.filter(e => e.triggeredShift === state.shiftsCompleted).length;
    if (triggeredToday >= MAX_EVENTS_PER_DAY) return;

    const candidates = EVENTS_DB.filter(eventDef => {
        if (eventDef.enabled === false) return false;
        if (!eventConditionsMet(eventDef)) return false;
        if (!isScheduleDue(eventDef, scheduleContext)) return false;
        if (!passesChanceRoll(eventDef)) return false;
        return true;
    });

    const winner = pickWeightedEvent(candidates);
    if (!winner) return;

    triggerEvent(winner);
}

function resolveEventChoice(instanceId, choiceId) {
    const instance = state.activeEvents.find(e => e.instanceId === instanceId && e.status === 'pending');
    if (!instance) return;

    const eventDef = getEventById(instance.eventId);
    if (!eventDef) return;

    const choice = (eventDef.choices || []).find(c => c.id === choiceId);
    if (!choice) return;

    const amount = instance.baseAmount;
    const effect = choice.effect || {};

    if (effect.type === 'deduct_cash') {
        if (state.cash < amount) {
            showToast('NOT ENOUGH CASH');
            return;
        }
        state.cash -= amount;
        updateHUD();
        recordEventAccepted(amount);
    } else if (effect.type === 'close') {
        recordEventRefused();
    }

    instance.status = 'resolved';
    instance.outcome = choiceId;

    if (choice.reply) {
        const reply = formatEventText(choice.reply, { amount, deadlineDays: eventDef.deadlineDays });
        addMessage(instance.contact, reply);
    }

    checkEventSkillUnlocks({ eventId: instance.eventId, choiceId });

    tryUnlockTrophy('event_choice');
    checkTrophyMilestones();

    if (state.activeThread === instance.contact) {
        renderMessageThread(instance.contact);
    }
}

function renderEventActions(contact) {
    const container = document.getElementById('message-event-actions');
    if (!container) return;

    container.innerHTML = '';
    container.classList.add('hidden');

    const pending = getPendingEventForContact(contact);
    if (!pending) return;

    const { instance, eventDef } = pending;
    container.classList.remove('hidden');

    const daysLeft = Math.max(0, instance.deadlineShift - state.shiftsCompleted);
    if (daysLeft > 0) {
        const hint = document.createElement('div');
        hint.className = 'text-[8px] opacity-70 text-center normal-case';
        hint.innerText = `${daysLeft} day${daysLeft === 1 ? '' : 's'} to respond`;
        container.appendChild(hint);
    }

    (eventDef.choices || []).forEach(choice => {
        const btn = document.createElement('button');
        btn.className = 'nokia-btn nokia-btn-outline w-full py-1 text-[10px]';
        btn.innerText = `[ ${formatEventText(choice.label, { amount: instance.baseAmount, deadlineDays: eventDef.deadlineDays })} ]`;
        btn.onclick = () => resolveEventChoice(instance.instanceId, choice.id);
        container.appendChild(btn);
    });
}
