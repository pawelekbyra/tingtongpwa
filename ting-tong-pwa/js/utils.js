import { Config } from './config.js';
import { State } from './state.js';

/**
 * ==========================================================================
 * 3. UTILITIES
 * ==========================================================================
 */

export function getTranslation(key) {
    return (Config.TRANSLATIONS[State.get('currentLang')]?.[key]) || key;
}

export function formatCount(count) {
    count = Number(count) || 0;
    if (count >= 1000000) return (count / 1000000).toFixed(1).replace('.0', '') + 'M';
    if (count >= 1000) return (count / 1000).toFixed(1).replace('.0', '') + 'K';
    return String(count);
}

export function fixProtocol(url) {
    if (!url) return url;
    try {
        if (window.location.protocol === 'https:') {
            const urlObj = new URL(url, window.location.origin);
            if (urlObj.protocol === 'http:') {
                urlObj.protocol = 'https:';
                return urlObj.toString();
            }
        }
    } catch (e) { /* Invalid URL, return as is */ }
    return url;
}

export function toRelativeIfSameOrigin(url) {
    if (!url) return url;
    try {
        const urlObj = new URL(url, window.location.origin);
        if (urlObj.origin === window.location.origin) {
            return urlObj.pathname + urlObj.search + urlObj.hash;
        }
    } catch (e) { /* Invalid URL, return as is */ }
    return url;
}

export function vibrateTry(ms = 35) {
    if (navigator.vibrate) {
        try { navigator.vibrate(ms); } catch(e) {}
    }
}

export function recordUserGesture() {
    State.set('lastUserGestureTimestamp', Date.now());
}

export function setAppHeightVar() {
  document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
}


/**
 * ==========================================================================
 * Patches from tt-patch-2025-08-18
 * ==========================================================================
 */

const CDN_HOST = null; // <— ZMIEŃ jeśli używasz innego hosta CDN
const isHttpUrl = (u) => /^https?:\/\//i.test(u);

function toCDN(url) {
    if (!url || !CDN_HOST) return url;
    try {
      if (url.startsWith(CDN_HOST)) return url;
      if (isHttpUrl(url)) {
        const u = new URL(url);
        const c = new URL(CDN_HOST);
        return `${c.origin}${u.pathname}${u.search}${u.hash}`;
      }
      return CDN_HOST.replace(/\/+$/,'') + '/' + url.replace(/^\/+/, '');
    } catch {
      return url;
    }
}

function rewriteNodeSrc(el) {
    try {
      const src = el.getAttribute('src');
      if (!src) return;
      const mapped = toCDN(src);
      if (mapped && mapped !== src) el.setAttribute('src', mapped);
    } catch(e){}
}

function rewriteSources(root) {
    if (!root || !CDN_HOST) return;
    if (root.tagName === 'SOURCE' || root.tagName === 'VIDEO') rewriteNodeSrc(root);
    root.querySelectorAll?.('source, video').forEach(rewriteNodeSrc);
}

export function initializeCDN() {
    try {
        const head = document.head || document.getElementsByTagName('head')[0];
        if (head && CDN_HOST) {
          const mk = (tag, attrs) => {
            const el = document.createElement(tag);
            Object.entries(attrs).forEach(([k,v]) => el.setAttribute(k, v));
            return el;
          };
          if (!document.querySelector(`link[rel="preconnect"][href="${CDN_HOST}"]`)) {
            head.appendChild(mk('link', { rel: 'preconnect', href: CDN_HOST, crossorigin: '' }));
          }
          if (!document.querySelector(`link[rel="dns-prefetch"][href="//${CDN_HOST.replace(/^https?:\/\//,'')}"]`)) {
            head.appendChild(mk('link', { rel: 'dns-prefetch', href: '//' + CDN_HOST.replace(/^https?:\/\//,'') }));
          }
        }
      } catch(e){ /* no-op */ }

      const mm = new MutationObserver(muts => {
        for (const m of muts) {
          const nodes = Array.from(m.addedNodes || []);
          for (const n of nodes) rewriteSources(n);
          if (m.type === 'attributes' && (m.target.tagName === 'SOURCE' || m.target.tagName === 'VIDEO') && m.attributeName === 'src') {
            rewriteNodeSrc(m.target);
          }
        }
      });
      mm.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
}

export function initializeIOSAudioUnlock() {
    const isIOS = () => /iP(hone|ad|od)/i.test(navigator.userAgent) ||
                       (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    function unlockAudioFromLangChoiceOnce() {
        if (!isIOS()) return;
        let unlocked = false;
        const handler = (ev) => {
            const t = ev.target.closest?.('[data-lang], .lang-option, .language-option, .lang-flag, [data-translate-lang]');
            if (!t) return;
            if (unlocked) return;
            unlocked = true;

            const vids = document.querySelectorAll('video');
            vids.forEach(v => {
                try {
                    v.muted = false;
                    const p = v.play();
                    if (p && typeof p.catch === 'function') p.catch(() => {});
                } catch(e){}
            });

            document.removeEventListener('click', handler, true);
        };
        document.addEventListener('click', handler, true);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', unlockAudioFromLangChoiceOnce, { once: true });
    } else {
        unlockAudioFromLangChoiceOnce();
    }
}
