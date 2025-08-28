/**
 * ==========================================================================
 * 4. API MODULE
 * ==========================================================================
 */

// Guard for undefined WordPress objects in standalone mode
if (typeof window.ajax_object === 'undefined') {
    console.warn('`ajax_object` is not defined. Using mock data for standalone development.');
    window.ajax_object = {
        ajax_url: '#', // Prevent actual network requests
        nonce: '0a1b2c3d4e'
    };
}

async function _request(action, data = {}) {
    try {
        const body = new URLSearchParams({ action, nonce: ajax_object.nonce, ...data });
        const response = await fetch(ajax_object.ajax_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
            credentials: 'same-origin',
            body
        });
        if (!response.ok) throw new Error(`Server responded with ${response.status}`);
        const json = await response.json();
        if (json.new_nonce) ajax_object.nonce = json.new_nonce;
        return json;
    } catch (error) {
        console.error(`API Client Error for action "${action}":`, error);
        return { success: false, data: { message: error.message } };
    }
}

export const API = {
    login: (data) => _request('tt_ajax_login', data),
    logout: () => _request('tt_ajax_logout'),
    toggleLike: (postId) => _request('toggle_like', { post_id: postId }),
    refreshNonce: async () => {
        const json = await _request('tt_refresh_nonce');
        if (json.success && json.nonce) ajax_object.nonce = json.nonce;
        else console.error('Failed to refresh nonce.', json);
    },
    fetchSlidesData: () => _request('tt_get_slides_data_ajax'),
    // Account Panel API
    uploadAvatar: (dataUrl) => _request('tt_avatar_upload', { image: dataUrl }),
    updateProfile: (data) => _request('tt_profile_update', data),
    changePassword: (data) => _request('tt_password_change', data),
    deleteAccount: (confirmText) => _request('tt_account_delete', { confirm_text: confirmText }),
    loadUserProfile: () => _request('tt_profile_get'),
};
