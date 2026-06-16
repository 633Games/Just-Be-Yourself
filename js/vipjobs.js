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
        <div class="text-center py-12 normal-case">
            <span class="cinder-unknown-text text-[12px]">Coming Soon</span>
        </div>
    `;
}
