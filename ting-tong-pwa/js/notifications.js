import { UI } from './ui.js';
import * as Utils from './utils.js';

export const Notifications = (function() {
    const mockData = [
        { id: 1, type: 'message', previewKey: 'notif1Preview', timeKey: 'notif1Time', fullKey: 'notif1Full', unread: true },
        { id: 2, type: 'profile', previewKey: 'notif2Preview', timeKey: 'notif2Time', fullKey: 'notif2Full', unread: true },
        { id: 3, type: 'offer', previewKey: 'notif3Preview', timeKey: 'notif3Time', fullKey: 'notif3Full', unread: false },
    ];

    const icons = {
        message: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>`,
        profile: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>`,
        offer: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" /><path stroke-linecap="round" stroke-linejoin="round" d="M6 6h.008v.008H6V6z" /></svg>`
    };

    return {
        render: () => {
            const listEl = UI.DOM.notificationPopup.querySelector('.notification-list');
            const emptyStateEl = UI.DOM.notificationPopup.querySelector('.notification-empty-state');
            listEl.innerHTML = '';
            listEl.appendChild(emptyStateEl);

            if (mockData.length === 0) {
                emptyStateEl.classList.remove('hidden-by-js');
                return;
            }

            emptyStateEl.classList.add('hidden-by-js');
            const fragment = document.createDocumentFragment();

            mockData.forEach(notif => {
                const item = document.createElement('li');
                item.className = `notification-item ${notif.unread ? 'unread' : ''}`;
                item.setAttribute('role', 'button');
                item.setAttribute('tabindex', '0');
                item.setAttribute('aria-expanded', 'false');

                item.innerHTML = `
                    <div class="notif-header">
                        <div class="notif-icon" aria-hidden="true">${icons[notif.type] || ''}</div>
                        <div class="notif-content-wrapper">
                            <div class="notif-summary">
                                <span class="notif-preview">${Utils.getTranslation(notif.previewKey)}</span>
                                <span class="notif-time">${Utils.getTranslation(notif.timeKey)}</span>
                            </div>
                            <div class="unread-dot"></div>
                            <svg class="expand-chevron" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                        </div>
                    </div>
                    <div class="notif-full-details">
                        ${Utils.getTranslation(notif.fullKey)}
                    </div>
                `;
                fragment.appendChild(item);
            });
            listEl.appendChild(fragment);
        }
    }
})();
