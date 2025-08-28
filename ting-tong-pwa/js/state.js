/**
 * ==========================================================================
 * 2. STATE MANAGEMENT
 * ==========================================================================
 */
// Guard for undefined WordPress objects in standalone mode
if (typeof window.TingTongData === 'undefined') {
    console.warn('`TingTongData` is not defined. Using mock data for standalone development.');
    window.TingTongData = {
        isLoggedIn: false, // Start as logged out
    };
}

export const State = (function() {
    const _state = {
        isUserLoggedIn: (typeof TingTongData !== 'undefined' && TingTongData.isLoggedIn) || false,
        currentLang: 'pl',
        currentSlideIndex: 0,
        isAutoplayBlocked: false,
        isDraggingProgress: false,
        lastFocusedElement: null,
        lastUserGestureTimestamp: 0,
        activeVideoSession: 0,
    };

    return {
        get: (key) => _state[key],
        set: (key, value) => { _state[key] = value; },
        getState: () => ({ ..._state }),
    };
})();
