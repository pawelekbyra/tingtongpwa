import { Config } from './config.js';
import { State } from './state.js';
import * as Utils from './utils.js';
import { API } from './api.js';
import { UI } from './ui.js';
import { VideoManager } from './video.js';
import { AccountPanel } from './account.js';
import { initializeGlobalListeners } from './handlers.js';
import { slidesData } from './data.js';

/**
 * ==========================================================================
 * 9. APP INITIALIZATION
 * ==========================================================================
 */
const App = (function() {

    async function _fetchAndUpdateSlideData() {
        const json = await API.fetchSlidesData();
        if (json.success && Array.isArray(json.data)) {
            const newDataMap = new Map(json.data.map(item => [String(item.likeId), item]));
            slidesData.forEach(existingSlide => {
                const updatedInfo = newDataMap.get(String(existingSlide.likeId));
                if (updatedInfo) {
                    existingSlide.isLiked = updatedInfo.isLiked;
                    existingSlide.initialLikes = updatedInfo.initialLikes;
                    UI.applyLikeStateToDom(existingSlide.likeId, existingSlide.isLiked, existingSlide.initialLikes);
                }
            });
        }
    }

    function _startApp(selectedLang) {
        State.set('currentLang', selectedLang);
        localStorage.setItem('tt_lang', selectedLang);

        UI.renderSlides();
        UI.updateTranslations();
        VideoManager.init();

        setTimeout(() => {
            UI.DOM.preloader.classList.add('preloader-hiding');
            UI.DOM.container.classList.add('ready');
            UI.DOM.preloader.addEventListener('transitionend', () => UI.DOM.preloader.style.display = 'none', { once: true });
        }, 1000);

        if (slidesData.length > 0) {
            const viewHeight = window.innerHeight;
            UI.DOM.container.classList.add('no-transition');
            UI.DOM.container.scrollTo({ top: viewHeight, behavior: 'auto' });
            requestAnimationFrame(() => {
                UI.DOM.container.classList.remove('no-transition');
                UI.DOM.container.addEventListener('scroll', () => {
                    clearTimeout(window.scrollEndTimeout);
                    window.scrollEndTimeout = setTimeout(() => {
                        const physicalIndex = Math.round(UI.DOM.container.scrollTop / viewHeight);
                        if (physicalIndex === 0) {
                            UI.DOM.container.classList.add('no-transition');
                            UI.DOM.container.scrollTop = slidesData.length * viewHeight;
                            requestAnimationFrame(() => UI.DOM.container.classList.remove('no-transition'));
                        } else if (physicalIndex === slidesData.length + 1) {
                            UI.DOM.container.classList.add('no-transition');
                            UI.DOM.container.scrollTop = viewHeight;
                            requestAnimationFrame(() => UI.DOM.container.classList.remove('no-transition'));
                        }
                    }, 50);
                }, { passive: true });
            });
        }
    }

    function _initializePreloader() {
        setTimeout(() => UI.DOM.preloader.classList.add('content-visible'), 500);
        UI.DOM.preloader.querySelectorAll('.language-selection button').forEach(button => {
            button.addEventListener('click', () => {
                UI.DOM.preloader.querySelectorAll('.language-selection button').forEach(btn => btn.disabled = true);
                button.classList.add('is-selected');
                setTimeout(() => _startApp(button.dataset.lang), 300);
            }, { once: true });
        });
    }

    function _setInitialConfig() {
        try {
            const c = navigator.connection || navigator.webkitConnection;
            if (c?.saveData) Config.LOW_DATA_MODE = true;
            if (c?.effectiveType?.includes('2g')) Config.LOW_DATA_MODE = true;
            if (c?.effectiveType?.includes('3g')) Config.HLS.maxAutoLevelCapping = 480;
        } catch(_) {}
    }

    return {
        init: () => {
            _setInitialConfig();
            initializeGlobalListeners();
            Utils.initializeCDN();
            Utils.initializeIOSAudioUnlock();
            AccountPanel.init();
            _initializePreloader();
            document.body.classList.add('loaded');
            window.App = { fetchAndUpdateSlideData: _fetchAndUpdateSlideData };
        },
    };
})();

document.addEventListener('DOMContentLoaded', App.init);
