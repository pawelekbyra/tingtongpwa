import { API } from './api.js';

/**
 * ==========================================================================
 * 8. ACCOUNT PANEL
 * ==========================================================================
 */
export const AccountPanel = (function(){
    // Global variables for the panel
    let cropImage = null;
    let cropCanvas = null;
    let cropCtx = null;
    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;
    let minScale = 1;
    let maxScale = 3;

    // Global state for settings
    let userSettings = {
        emailConsent: true,
        emailLanguage: 'pl'
    };

    // Main initialization function
    function init() {
        initializeModal();
        initializeCropper();
        setupEventListeners();
        loadUserSettings();
    }

    // Load user settings - MOCK
    async function loadUserSettings() {
        try {
            // MOCK - simulating settings load
            await new Promise(resolve => setTimeout(resolve, 500));
            userSettings = { emailConsent: true, emailLanguage: 'pl' };
            updateSettingsUI();
        } catch (error) {
            console.log('Could not load settings:', error);
        }
    }

    function updateSettingsUI() {
        const consentToggle = document.getElementById('emailConsent');
        if (userSettings.emailConsent) {
            consentToggle.classList.add('active');
        } else {
            consentToggle.classList.remove('active');
        }
        document.querySelectorAll('.language-option').forEach(option => {
            option.classList.remove('active');
            if (option.dataset.lang === userSettings.emailLanguage) {
                option.classList.add('active');
            }
        });
    }

    // Settings handlers
    function toggleEmailConsent() {
        userSettings.emailConsent = !userSettings.emailConsent;
        updateSettingsUI();
    }

    function selectLanguage(lang) {
        userSettings.emailLanguage = lang;
        updateSettingsUI();
    }

    async function saveSettings() {
        const button = document.getElementById('saveSettingsBtn');
        const originalText = button.textContent;
        try {
            button.disabled = true;
            button.innerHTML = '<span class="loading-spinner"></span> Zapisywanie...';
            await new Promise(resolve => setTimeout(resolve, 1000));
            showSuccess('settingsSuccess', 'Ustawienia zostały zapisane! (DEMO)');
        } catch (error) {
            showError('settingsError', error.message);
        } finally {
            button.disabled = false;
            button.textContent = originalText;
        }
    }

    // Profile data functions
    async function loadInitialProfileData() {
        try {
            const result = await API.loadUserProfile();
            if (result.success) {
                populateProfileForm(result.data);
            } else {
                throw new Error(result.data?.message || 'Nie udało się załadować profilu');
            }
        } catch (error) {
            console.log('Could not load profile data:', error);
            showError('profileError', 'Nie można załadować danych profilu.');
        }
    }

    function populateProfileForm(data) {
        if (data.first_name) document.getElementById('firstName').value = data.first_name;
        if (data.last_name) document.getElementById('lastName').value = data.last_name;
        if (data.email) document.getElementById('email').value = data.email;
        if (data.display_name) document.getElementById('displayName').textContent = data.display_name;
        if (data.email) document.getElementById('userEmail').textContent = data.email;
        if (data.avatar) document.getElementById('userAvatar').src = data.avatar;
    }

    // Modal visibility functions
    function openAccountModal() {
        const modal = document.getElementById('accountModal');
        modal.classList.add('visible');
        document.body.style.overflow = 'hidden';
        loadInitialProfileData(); // Fetch live data when opening
    }

    function closeAccountModal() {
        const modal = document.getElementById('accountModal');
        modal.classList.remove('visible');
        document.body.style.overflow = '';
    }

    // Tab switching
    function initializeModal() {
        const tabButtons = document.querySelectorAll('.account-tabs .tab-btn');
        const tabPanes = document.querySelectorAll('.account-content .tab-pane');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.dataset.tab;
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                tabPanes.forEach(pane => pane.classList.remove('active'));
                document.getElementById(targetTab + '-tab').classList.add('active');
                document.querySelector('.account-header h2').textContent = button.textContent;
            });
        });
    }

    // Event Listeners setup
    function setupEventListeners() {
        document.getElementById('avatarFileInput').addEventListener('change', handleFileSelect);
        document.getElementById('profileForm').addEventListener('submit', handleProfileSubmit);
        document.getElementById('passwordForm').addEventListener('submit', handlePasswordSubmit);
        document.getElementById('deleteForm').addEventListener('submit', handleDeleteSubmit);

        document.getElementById('avatarEditBtn').addEventListener('click', () => document.getElementById('avatarFileInput').click());
        document.getElementById('emailConsent').addEventListener('click', toggleEmailConsent);
        document.querySelectorAll('.language-option').forEach(el => el.addEventListener('click', () => selectLanguage(el.dataset.lang)));
        document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);

        const deleteInput = document.getElementById('deleteConfirmation');
        const deleteBtn = document.getElementById('deleteAccountBtn');
        deleteInput.addEventListener('input', function() {
            deleteBtn.disabled = this.value.trim() !== 'USUWAM KONTO';
        });

        document.getElementById('zoomSlider').addEventListener('input', function() {
            scale = parseFloat(this.value);
            drawCropCanvas();
        });

        document.getElementById('cropCloseBtn').addEventListener('click', closeCropModal);
        document.getElementById('zoomInBtn').addEventListener('click', () => adjustZoom(0.1));
        document.getElementById('zoomOutBtn').addEventListener('click', () => adjustZoom(-0.1));
        document.getElementById('cropSaveBtn').addEventListener('click', cropAndSave);

        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape') {
                if (document.getElementById('cropModal').classList.contains('visible')) {
                    closeCropModal();
                } else if (document.getElementById('accountModal').classList.contains('visible')) {
                    closeAccountModal();
                }
            }
        });
    }

    function handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) return showError('profileError', 'Proszę wybrać plik obrazu.');
        if (file.size > 5 * 1024 * 1024) return showError('profileError', 'Plik jest za duży. Maksymalny rozmiar to 5MB.');

        const reader = new FileReader();
        reader.onload = function(e) {
            cropImage = new Image();
            cropImage.onload = function() {
                openCropModal();
                initializeCropCanvas();
            };
            cropImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function openCropModal() { document.getElementById('cropModal').classList.add('visible'); }
    function closeCropModal() { document.getElementById('cropModal').classList.remove('visible'); cropImage = null; }

    function initializeCropper() {
        cropCanvas = document.getElementById('cropCanvas');
        cropCtx = cropCanvas.getContext('2d');
        cropCanvas.addEventListener('mousedown', startDrag);
        cropCanvas.addEventListener('mousemove', drag);
        window.addEventListener('mouseup', endDrag);
        cropCanvas.addEventListener('mouseleave', endDrag);
        cropCanvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        cropCanvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', endDrag);
    }

    function initializeCropCanvas() {
        if (!cropImage) return;
        const canvasRect = cropCanvas.getBoundingClientRect();
        cropCanvas.width = canvasRect.width;
        cropCanvas.height = canvasRect.height;

        const cropCircleSize = Math.min(cropCanvas.width, cropCanvas.height) * 0.8;
        const imageMaxDimension = Math.max(cropImage.width, cropImage.height);

        minScale = cropCircleSize / imageMaxDimension;
        scale = minScale;
        offsetX = 0;
        offsetY = 0;

        const slider = document.getElementById('zoomSlider');
        slider.min = minScale.toFixed(2);
        slider.max = (minScale * 4).toFixed(2);
        slider.value = scale.toFixed(2);
        maxScale = minScale * 4;

        drawCropCanvas();
    }

    function drawCropCanvas() {
        if (!cropImage || !cropCtx) return;
        const canvas = cropCanvas;
        const ctx = cropCtx;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const imgWidth = cropImage.width * scale;
        const imgHeight = cropImage.height * scale;
        const x = (canvas.width - imgWidth) / 2 + offsetX;
        const y = (canvas.height - imgHeight) / 2 + offsetY;
        ctx.drawImage(cropImage, x, y, imgWidth, imgHeight);
    }

    function startDrag(event) { isDragging = true; lastX = event.clientX; lastY = event.clientY; cropCanvas.style.cursor = 'grabbing'; }
    function drag(event) { if (!isDragging) return; const deltaX = event.clientX - lastX; const deltaY = event.clientY - lastY; offsetX += deltaX; offsetY += deltaY; lastX = event.clientX; lastY = event.clientY; constrainOffsets(); drawCropCanvas(); }
    function endDrag() { isDragging = false; cropCanvas.style.cursor = 'grab'; }
    function handleTouchStart(event) { event.preventDefault(); if (event.touches.length === 1) { const touch = event.touches[0]; startDrag({ clientX: touch.clientX, clientY: touch.clientY }); } }
    function handleTouchMove(event) { event.preventDefault(); if (event.touches.length === 1 && isDragging) { const touch = event.touches[0]; drag({ clientX: touch.clientX, clientY: touch.clientY }); } }
    function adjustZoom(delta) { const newScale = Math.max(minScale, Math.min(maxScale, scale + delta)); scale = newScale; document.getElementById('zoomSlider').value = scale; constrainOffsets(); drawCropCanvas(); }
    function constrainOffsets() { if (!cropImage) return; const imgWidth = cropImage.width * scale; const imgHeight = cropImage.height * scale; const maxOffsetX = Math.max(0, (imgWidth - cropCanvas.width) / 2); const maxOffsetY = Math.max(0, (imgHeight - cropCanvas.height) / 2); offsetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, offsetX)); offsetY = Math.max(-maxOffsetY, Math.min(maxOffsetY, offsetY)); }

    async function cropAndSave() {
        if (!cropImage) return;
        const button = document.getElementById('cropSaveBtn');
        const originalHTML = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '<span class="loading-spinner"></span> Zapisywanie...';

        try {
            const outputCanvas = document.createElement('canvas');
            outputCanvas.width = 200;
            outputCanvas.height = 200;
            const outputCtx = outputCanvas.getContext('2d');

            const cropSize = Math.min(cropCanvas.width, cropCanvas.height) * 0.8;
            const srcSize = cropSize / scale;
            const srcX = (cropImage.width - srcSize) / 2 - (offsetX / scale);
            const srcY = (cropImage.height - srcSize) / 2 - (offsetY / scale);

            outputCtx.drawImage(cropImage, srcX, srcY, srcSize, srcSize, 0, 0, 200, 200);

            const dataUrl = outputCanvas.toDataURL('image/png', 0.9);
            const result = await API.uploadAvatar(dataUrl);

            if (result.success && result.data?.url) {
                const newAvatarUrl = result.data.url + '?t=' + Date.now();
                document.getElementById('userAvatar').src = newAvatarUrl;
                document.querySelectorAll('.profile img, .tiktok-symulacja .profile img').forEach(img => { img.src = newAvatarUrl; });
                showSuccess('profileSuccess', 'Avatar został zaktualizowany!');
                closeCropModal();
                document.dispatchEvent(new CustomEvent('tt:avatar-updated', { detail: { url: newAvatarUrl } }));
            } else {
                throw new Error(result.data?.message || 'Nie otrzymano URL avatara');
            }
        } catch (error) {
            showError('profileError', error.message || 'Błąd podczas przetwarzania obrazu.');
        } finally {
            button.disabled = false;
            button.innerHTML = originalHTML;
        }
    }

    async function handleProfileSubmit(event) {
        event.preventDefault();
        const button = document.getElementById('saveProfileBtn');
        const originalText = button.textContent;
        button.disabled = true;
        button.innerHTML = '<span class="loading-spinner"></span> Zapisywanie...';
        try {
            const data = { first_name: document.getElementById('firstName').value.trim(), last_name: document.getElementById('lastName').value.trim(), email: document.getElementById('email').value.trim() };
            if (!data.first_name || !data.last_name || !data.email) throw new Error('Wszystkie pola są wymagane.');
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw new Error('Podaj prawidłowy adres email.');
            const result = await API.updateProfile(data);
            if (result.success) {
                showSuccess('profileSuccess', 'Profil został zaktualizowany!');
                populateProfileForm(result.data);
            } else { throw new Error(result.data?.message || 'Błąd aktualizacji profilu.'); }
        } catch (error) {
            showError('profileError', error.message);
        } finally {
            button.disabled = false;
            button.textContent = originalText;
        }
    }

    async function handlePasswordSubmit(event) {
        event.preventDefault();
        const button = document.getElementById('changePasswordBtn');
        const originalText = button.textContent;
        button.disabled = true;
        button.innerHTML = '<span class="loading-spinner"></span> Zmienianie...';
        try {
            const currentPassword = document.getElementById('currentPassword').value, newPassword = document.getElementById('newPassword').value, confirmPassword = document.getElementById('confirmPassword').value;
            if (!currentPassword || !newPassword || !confirmPassword) throw new Error('Wszystkie pola są wymagane.');
            if (newPassword.length < 8) throw new Error('Nowe hasło musi mieć minimum 8 znaków.');
            if (newPassword !== confirmPassword) throw new Error('Nowe hasła muszą być identyczne.');
            const result = await API.changePassword({ current_password: currentPassword, new_password_1: newPassword, new_password_2: confirmPassword });
            if (result.success) {
                showSuccess('passwordSuccess', 'Hasło zostało zmienione!');
                document.getElementById('passwordForm').reset();
            } else { throw new Error(result.data?.message || 'Błąd zmiany hasła.'); }
        } catch (error) {
            showError('passwordError', error.message);
        } finally {
            button.disabled = false;
            button.textContent = originalText;
        }
    }

    async function handleDeleteSubmit(event) {
        event.preventDefault();
        const button = document.getElementById('deleteAccountBtn');
        const originalText = button.textContent;
        button.disabled = true;
        button.innerHTML = '<span class="loading-spinner"></span> Usuwanie...';
        try {
            const confirmText = document.getElementById('deleteConfirmation').value;
            if (confirmText.trim() !== 'USUWAM KONTO') throw new Error('Wpisz dokładnie: USUWAM KONTO');
            const result = await API.deleteAccount(confirmText);
            if (result.success) {
                showSuccess('deleteSuccess', 'Konto zostało usunięte. Trwa wylogowywanie...');
                setTimeout(() => window.location.reload(), 2000);
            } else { throw new Error(result.data?.message || 'Błąd usuwania konta.'); }
        } catch (error) {
            showError('deleteError', error.message);
            if(!document.getElementById('deleteSuccess').classList.contains('show')) {
              button.disabled = false;
              button.textContent = originalText;
            }
        }
    }

    function hideAllMessages() { document.querySelectorAll('.status-message').forEach(el => { el.classList.remove('show'); el.style.display = 'none'; }); }
    function showSuccess(elementId, message) { hideAllMessages(); const el = document.getElementById(elementId); el.textContent = message; el.style.display = 'block'; requestAnimationFrame(() => el.classList.add('show')); setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.style.display = 'none', 300); }, 3000); }
    function showError(elementId, message) { hideAllMessages(); const el = document.getElementById(elementId); el.textContent = message; el.style.display = 'block'; requestAnimationFrame(() => el.classList.add('show')); setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.style.display = 'none', 300); }, 4000); }

    return { init, openAccountModal, closeAccountModal };
})();
