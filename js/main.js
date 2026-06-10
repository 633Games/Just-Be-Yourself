function submitPlayerName() {
    const input = document.getElementById('player-name-input');
    const name = input.value.trim();
    if (!name) {
        showToast('ENTER A NAME');
        return;
    }

    state.playerName = name;
    state.unlockedApps.messages = true;
    addMessage(
        'MOM',
        `Youve finished school either get a job or get out of my house. Carlos said you can use his car to deliver pizzas until you get on your feet. DONT muck this up ${name}. Love Mam xx`
    );
    state.messagesFlash = true;
    updateAppMenu();
    switchView('home-view');
}

window.onload = () => {
    updateHUD();
    switchView('name-setup-view');
    document.getElementById('player-name-input')?.focus();
};
