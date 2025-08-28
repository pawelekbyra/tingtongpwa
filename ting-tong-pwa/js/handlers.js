import { API } from './api.js';
import { UI } from './ui.js';
import { State } from './state.js';
import * as Utils from './utils.js';
import { VideoManager } from './video.js';
import { AccountPanel } from './account.js';
import { Notifications } from './notifications.js';
import { slidesData } from './data.js';

/**
 * ==========================================================================
 * 7. EVENT HANDLERS
 * ==========================================================================
 */

function handleNotificationClick(event) {
    const item = event.target.closest('.notification-item');
    if (!item) return;

    item.classList.toggle('expanded');
    item.setAttribute('aria-expanded', item.classList.contains('expanded'));

    if (item.classList.contains('unread')) {
        item.classList.remove('unread');
    }
}

async function handleLogin(form) {
    const submitButton = form.querySelector('input[type="submit"]');
    submitButton.disabled = true;
    try {
        const data = Object.fromEntries(new FormData(form).entries());
        const json = await API.login(data);
        if (json.success) {
            State.set('isUserLoggedIn', true);
            UI.showAlert(Utils.getTranslation('loginSuccess'));
            await API.refreshNonce();

            // This needs to be defined in the main App module or passed in
            // For now, we assume a function exists to refresh data
            if (window.App && typeof window.App.fetchAndUpdateSlideData === 'function') {
                window.App.fetchAndUpdateSlideData();
            }

            UI.updateUIForLoginState();
        } else {
            UI.showAlert(json.data?.message || Utils.getTranslation('loginFailed'), true);
        }
    } finally {
        submitButton.disabled = false;
    }
}

async function handleLogout(link) {
    if (link.disabled) return;
    link.disabled = true;
    const json = await API.logout();
    if (json.success) {
        State.set('isUserLoggedIn', false);
        UI.showAlert(Utils.getTranslation('logoutSuccess'));
        slidesData.forEach(slide => slide.isLiked = false);
        await API.refreshNonce();
        UI.updateUIForLoginState();
    } else {
        UI.showAlert(json.data?.message || 'Logout failed.', true);
    }
    link.disabled = false;
}

async function handleLikeToggle(button) {
    if (!State.get('isUserLoggedIn')) {
        Utils.vibrateTry();
        UI.showAlert(Utils.getTranslation('likeAlert'));
        return;
    }
    const slideId = button.closest('.webyx-section')?.dataset.slideId;
    const slideData = slidesData.find(s => s.id === slideId);
    if (!slideData) return;

    const isCurrentlyLiked = !!slideData.isLiked;
    const newLikedState = !isCurrentlyLiked;
    const currentCount = slideData.initialLikes;
    const newCount = newLikedState ? currentCount + 1 : Math.max(0, currentCount - 1);

    // Optimistic UI update
    slideData.isLiked = newLikedState;
    slideData.initialLikes = newCount;
    UI.applyLikeStateToDom(slideData.likeId, newLikedState, newCount);
    button.disabled = true;

    const json = await API.toggleLike(slideData.likeId);

    if (json.success) {
        slideData.isLiked = json.data.status === 'liked';
        slideData.initialLikes = json.data.count;
        UI.applyLikeStateToDom(slideData.likeId, slideData.isLiked, slideData.initialLikes);
    } else {
        // Revert
        slideData.isLiked = isCurrentlyLiked;
        slideData.initialLikes = currentCount;
        UI.applyLikeStateToDom(slideData.likeId, isCurrentlyLiked, currentCount);
        UI.showAlert(json.data?.message || Utils.getTranslation('likeError'), true);
    }
    button.disabled = false;
}

function handleShare(button) {
    const section = button.closest('.webyx-section');
    const slideData = slidesData.find(s => s.id === section.dataset.slideId);
    if (navigator.share && slideData) {
        navigator.share({
            title: Utils.getTranslation('shareTitle'),
            text: slideData.description,
            url: window.location.href,
        }).catch(err => { if (err.name !== 'AbortError') console.error('Share error:', err); });
    } else {
        navigator.clipboard.writeText(window.location.href).then(() => UI.showAlert(Utils.getTranslation('linkCopied')));
    }
}

function handleLanguageToggle() {
    const newLang = State.get('currentLang') === 'pl' ? 'en' : 'pl';
    State.set('currentLang', newLang);
    localStorage.setItem('tt_lang', newLang);
    UI.updateTranslations();
    Notifications.render();
}

function mainClickHandler(e) {
    const target = e.target;
    const actionTarget = target.closest('[data-action]');
    if (!actionTarget) {
        if (target.closest('.videoPlayer')) VideoManager.handleVideoClick(target.closest('.videoPlayer'));
        return;
    }

    const action = actionTarget.dataset.action;
    const section = actionTarget.closest('.webyx-section');

    switch (action) {
        case 'toggle-like': handleLikeToggle(actionTarget); break;
        case 'share': handleShare(actionTarget); break;
        case 'toggle-language': handleLanguageToggle(); break;
        case 'open-comments-modal': UI.openModal(UI.DOM.commentsModal); break;
        case 'open-info-modal': UI.openModal(UI.DOM.infoModal); break;
        case 'open-account-modal':
            if(section) section.querySelector('.logged-in-menu').classList.remove('active');
            AccountPanel.openAccountModal();
            break;
        case 'close-account-modal':
            AccountPanel.closeAccountModal();
            break;
        case 'logout': e.preventDefault(); handleLogout(actionTarget); break;
        case 'toggle-main-menu':
            if (State.get('isUserLoggedIn')) {
                section.querySelector('.logged-in-menu').classList.toggle('active');
            } else {
                Utils.vibrateTry();
                UI.showAlert(Utils.getTranslation('menuAccessAlert'));
            }
            break;
        case 'toggle-login-panel':
            if (!State.get('isUserLoggedIn')) {
                section.querySelector('.login-panel').classList.toggle('active');
                section.querySelector('.topbar').classList.toggle('login-panel-active');
            }
            break;
        case 'subscribe':
            if (!State.get('isUserLoggedIn')) {
                Utils.vibrateTry(); UI.showAlert(Utils.getTranslation('subscribeAlert'));
            }
            break;
        case 'toggle-notifications':
            if (State.get('isUserLoggedIn')) {
                const popup = UI.DOM.notificationPopup;
                popup.classList.toggle('visible');
                if(popup.classList.contains('visible')) Notifications.render();
            } else {
                Utils.vibrateTry();
                UI.showAlert(Utils.getTranslation('notificationAlert'));
            }
            break;
        case 'close-notifications':
            if (UI.DOM.notificationPopup) {
                UI.DOM.notificationPopup.classList.remove('visible');
            }
            break;
        case 'show-tip-jar': document.querySelector('#bmc-wbtn')?.click(); break;
    }
}

function formSubmitHandler(e) {
    const form = e.target.closest('form.login-form');
    if (form) { e.preventDefault(); handleLogin(form); }
}

export function initializeGlobalListeners() {
    Utils.setAppHeightVar();
    window.addEventListener('resize', Utils.setAppHeightVar);
    window.addEventListener('orientationchange', Utils.setAppHeightVar);

    ['touchstart', 'pointerdown', 'click', 'keydown'].forEach(evt => {
        document.addEventListener(evt, Utils.recordUserGesture, { passive: true });
    });

    document.body.addEventListener('click', mainClickHandler);
    UI.DOM.container.addEventListener('submit', formSubmitHandler);

    document.querySelectorAll('.modal-overlay:not(#accountModal)').forEach(modal => {
        modal.addEventListener('click', (e) => { if (e.target === modal) UI.closeModal(modal); });
        modal.querySelector('.modal-close-btn, .topbar-close-btn')?.addEventListener('click', () => UI.closeModal(modal));
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const visibleModal = document.querySelector('.modal-overlay.visible:not(#accountModal):not(#cropModal)');
            if(visibleModal) UI.closeModal(visibleModal);
            if(UI.DOM.notificationPopup.classList.contains('visible')) UI.DOM.notificationPopup.classList.remove('visible');
        }
    });

    document.addEventListener('click', (event) => {
        const popup = UI.DOM.notificationPopup;
        if (popup && popup.classList.contains('visible') &&
            !popup.contains(event.target) &&
            !event.target.closest('[data-action="toggle-notifications"]')) {
            popup.classList.remove('visible');
        }
    });

    UI.DOM.notificationPopup.querySelector('.notification-list').addEventListener('click', handleNotificationClick);
}
