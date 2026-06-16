function isVipJobsAvailable() {
    if (state.unlockedApps.vipJobs) return true;
    return typeof isDebugMode === 'function' && isDebugMode();
}

function openVipJobs() {
    if (!isVipJobsAvailable()) {
        showToast('APP LOCKED');
        return;
    }
    renderVipJobList();
    switchView('vip-jobs-view');
}

function renderVipJobList() {
    const container = document.getElementById('vip-job-list-content');
    if (!container) return;

    container.innerHTML = `
        <div class="text-[9px] mb-1 font-bold normal-case">vipjobs.json</div>
        <div class="text-[8px] opacity-80 mb-2 normal-case">RECRUIT-ONLY LISTINGS</div>
    `;

    if (!VIP_JOBS_DB.length) {
        container.innerHTML += '<div class="text-[9px] opacity-70 text-center py-4">NO LISTINGS</div>';
        return;
    }

    VIP_JOBS_DB.forEach(job => {
        const match = calculateMatch(job.req);
        const desc = job.description ? `<div class="text-[8px] opacity-80 leading-tight normal-case">${escapeHtml(job.description)}</div>` : '';
        container.innerHTML += `
            <div class="vip-job-card border-2 border-[var(--lcd-pixel)] p-1 flex flex-col gap-1 bg-transparent">
                <div class="flex justify-between font-bold text-[10px]">
                    <span>${escapeHtml(job.title)}</span>
                    <span>$${job.pay.toFixed(2)}/s</span>
                </div>
                ${desc}
                <div class="text-[8px] opacity-90 leading-tight">REQ: ${formatSkillReqsWithStatus(job.req)}</div>
                <div class="flex justify-between items-center mt-1 border-t border-dashed border-[var(--lcd-pixel)] pt-1">
                    <span class="text-[9px] ${match >= 50 ? 'font-bold' : ''}">MATCH: ${match}%</span>
                    <button onclick="applyForVipJob('${job.id}')" class="nokia-btn-outline px-2 py-[2px] text-[9px] w-auto">
                        APPLY
                    </button>
                </div>
            </div>
        `;
    });
}

function applyForVipJob(jobId) {
    const job = getVipJobById(jobId);
    if (!job) return;
    startInterview(job, calculateMatch(job.req));
}
