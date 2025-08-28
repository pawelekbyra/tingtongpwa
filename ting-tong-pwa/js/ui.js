import { State } from './state.js';
import * as Utils from './utils.js';
import { Config } from './config.js';
import { slidesData } from './data.js';
import { VideoManager } from './video.js';
import { AccountPanel } from './account.js';

/**
 * ==========================================================================
 * 5. UI MODULE
 * ==========================================================================
 */

export const UI = (function() {
    const DOM = {
        container: document.getElementById('webyx-container'),
        template: document.getElementById('slide-template'),
        preloader: document.getElementById('preloader'),
        alertBox: document.getElementById('alertBox'),
        alertText: document.getElementById('alertText'),
        infoModal: document.getElementById('infoModal'),
        commentsModal: document.getElementById('commentsModal'),
        accountModal: document.getElementById('accountModal'),
        notificationPopup: document.getElementById('notificationPopup'),
    };
    let alertTimeout;

    function showAlert(message, isError = false) {
        if (!DOM.alertBox || !DOM.alertText) return;
        clearTimeout(alertTimeout);
        DOM.alertBox.style.animation = 'none';
        requestAnimationFrame(() => {
            DOM.alertBox.style.animation = '';
            DOM.alertText.textContent = message;
            DOM.alertBox.style.backgroundColor = isError ? 'var(--accent-color)' : 'rgba(0, 0, 0, 0.85)';
            DOM.alertBox.classList.add('visible');
        });
        alertTimeout = setTimeout(() => DOM.alertBox.classList.remove('visible'), 3000);
    }

    function getFocusable(node) {
        if (!node) return [];
        return Array.from(node.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'));
    }

    function trapFocus(modal) {
        const focusable = getFocusable(modal);
        if (focusable.length === 0) return () => {};
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const handleKeyDown = (e) => {
            if (e.key !== 'Tab') return;
            if (e.shiftKey) {
                if (document.activeElement === first) { last.focus(); e.preventDefault(); }
            } else {
                if (document.activeElement === last) { first.focus(); e.preventDefault(); }
            }
        };
        modal.addEventListener('keydown', handleKeyDown);
        return () => modal.removeEventListener('keydown', handleKeyDown);
    }

    function openModal(modal) {
        State.set('lastFocusedElement', document.activeElement);
        DOM.container.setAttribute('aria-hidden', 'true');
        modal.classList.add('visible');
        modal.setAttribute('aria-hidden', 'false');
        const focusable = getFocusable(modal);
        (focusable.length > 0 ? focusable[0] : modal.querySelector('.modal-content'))?.focus();
        modal._focusTrapDispose = trapFocus(modal);
    }

    function closeModal(modal) {
        modal.classList.remove('visible');
        modal.setAttribute('aria-hidden', 'true');
        if (modal._focusTrapDispose) { modal._focusTrapDispose(); delete modal._focusTrapDispose; }
        DOM.container.removeAttribute('aria-hidden');
        State.get('lastFocusedElement')?.focus();
    }

    function updateLikeButtonState(likeButton, liked, count) {
        if (!likeButton) return;
        const likeCountEl = likeButton.querySelector('.like-count');
        likeButton.classList.toggle('active', liked);
        likeButton.setAttribute('aria-pressed', String(liked));
        if (likeCountEl) {
            likeCountEl.textContent = Utils.formatCount(count);
            likeCountEl.dataset.rawCount = String(count);
        }
        const translationKey = liked ? 'unlikeAriaLabelWithCount' : 'likeAriaLabelWithCount';
        const label = Utils.getTranslation(translationKey).replace('{count}', Utils.formatCount(count));
        likeButton.setAttribute('aria-label', label);
    }

    function applyLikeStateToDom(likeId, liked, count) {
        document.querySelectorAll(`.like-button[data-like-id="${likeId}"]`).forEach(btn => updateLikeButtonState(btn, liked, count));
    }

    function updateUIForLoginState() {
        const isLoggedIn = State.get('isUserLoggedIn');
        const currentSlideIndex = State.get('currentSlideIndex');

        DOM.container.querySelectorAll('.webyx-section').forEach((section) => {
            const sim = section.querySelector('.tiktok-symulacja');
            sim.classList.toggle('is-logged-in', isLoggedIn);
            const isSecret = sim.dataset.access === 'secret';
            const showSecretOverlay = isSecret && !isLoggedIn;

            section.querySelector('.secret-overlay').classList.toggle('visible', showSecretOverlay);
            section.querySelector('.videoPlayer').classList.toggle('secret-active', showSecretOverlay);
            section.querySelector('.topbar .central-text-wrapper').classList.toggle('with-arrow', !isLoggedIn);
            section.querySelector('.login-panel').classList.remove('active');
            section.querySelector('.topbar').classList.remove('login-panel-active');
            section.querySelector('.logged-in-menu').classList.remove('active');
            section.querySelector('.topbar .topbar-text').textContent = isLoggedIn ? Utils.getTranslation('loggedInText') : Utils.getTranslation('loggedOutText');

            const likeBtn = section.querySelector('.like-button');
            if (likeBtn) {
                const slide = slidesData.find(s => String(s.likeId) === String(likeBtn.dataset.likeId));
                if (slide) {
                    updateLikeButtonState(likeBtn, !!(slide.isLiked && isLoggedIn), Number(slide.initialLikes || 0));
                }
            }

            if (parseInt(section.dataset.index, 10) === currentSlideIndex) {
                VideoManager.updatePlaybackForLoginChange(section, showSecretOverlay);
            }
        });
    }

    function updateTranslations() {
        const lang = State.get('currentLang');
        document.documentElement.lang = lang;
        document.querySelectorAll('[data-translate-key]').forEach(el => el.textContent = Utils.getTranslation(el.dataset.translateKey));
        document.querySelectorAll('[data-translate-aria-label]').forEach(el => el.setAttribute('aria-label', Utils.getTranslation(el.dataset.translateAriaLabel)));
        document.querySelectorAll('[data-translate-title]').forEach(el => el.setAttribute('title', Utils.getTranslation(el.dataset.translateTitle)));
        updateUIForLoginState();
    }

    function createSlideElement(slideData, index) {
        const slideFragment = DOM.template.content.cloneNode(true);
        const section = slideFragment.querySelector('.webyx-section');
        section.dataset.index = index;
        section.dataset.slideId = slideData.id;

        const loginPanel = section.querySelector('.login-panel');
        const renderedForm = document.getElementById('um-login-render-container');
        if (loginPanel && renderedForm) {
            loginPanel.innerHTML = renderedForm.innerHTML;
            const form = loginPanel.querySelector('.login-form');
            if (form) {
                form.querySelector('label[for="user_login"]')?.remove();
                form.querySelector('#user_login')?.setAttribute('placeholder', 'Login');
                form.querySelector('label[for="user_pass"]')?.remove();
                form.querySelector('#user_pass')?.setAttribute('placeholder', 'Hasło');
                const submitButton = form.querySelector('#wp-submit');
                if (submitButton) submitButton.value = 'ENTER';
            }
        }

        section.querySelector('.tiktok-symulacja').dataset.access = slideData.access;
        section.querySelector('.videoPlayer').poster = slideData.poster || Config.LQIP_POSTER;
        section.querySelector('.profileButton img').src = slideData.avatar;
        section.querySelector('.text-user').textContent = slideData.user;
        section.querySelector('.text-description').textContent = slideData.description;

        const likeBtn = section.querySelector('.like-button');
        likeBtn.dataset.likeId = slideData.likeId;
        updateLikeButtonState(likeBtn, slideData.isLiked, slideData.initialLikes);

        const progressSlider = section.querySelector('.video-progress');
        VideoManager.initProgressBar(progressSlider, section.querySelector('.videoPlayer'));

        return section;
    }

    function renderSlides() {
        DOM.container.innerHTML = '';
        if (slidesData.length === 0) return;

        const addClone = (slideData, index, isFirst) => {
            const clone = createSlideElement(slideData, index);
            clone.dataset.isClone = 'true';
            DOM.container.appendChild(clone);
        };

        addClone(slidesData[slidesData.length - 1], slidesData.length - 1, false);
        slidesData.forEach((data, index) => DOM.container.appendChild(createSlideElement(data, index)));
        addClone(slidesData[0], 0, true);
    }

    return {
        DOM,
        showAlert,
        openModal,
        closeModal,
        updateUIForLoginState,
        updateTranslations,
        applyLikeStateToDom,
        renderSlides
    };
})();
