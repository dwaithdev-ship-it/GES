// Custom Backend Config - dynamically use the same host the page was loaded from
const API_URL = `http://${window.location.hostname}:5000/api`;

const api = {
    async request(endpoint, method = 'GET', body = null, token = null) {
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const config = { method, headers };
        if (body) config.body = JSON.stringify(body);

        const response = await fetch(`${API_URL}${endpoint}`, config);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Request failed');
        return data;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    let currentUser = null;
    let editingItemId = null; // Track ID of the item being edited
    // Authenticated View Elements
    const authLinks = document.getElementById('authLinks');
    const userProfileNav = document.getElementById('userProfileNav');
    const navUserName = document.getElementById('navUserName');
    const userAvatar = document.getElementById('userAvatar');
    const profileDropdown = document.getElementById('profileDropdown');
    const pdAvatarInitials = document.getElementById('pdAvatarInitials');
    const pdFullName = document.getElementById('pdFullName');
    const pdLogout = document.getElementById('pdLogout');

    // Monitor Auth State (PostgreSQL/Local Storage)
    const checkAuthStatus = async () => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const user = await api.request('/auth/me', 'GET', null, token);
                currentUser = user;
                console.log("User is logged in (PostgreSQL):", user.email);

                // Extended Profile Details
                try {
                    const details = await api.request('/profile/details', 'GET', null, token);
                    currentUser.education = details.education || [];
                    currentUser.work_experience = details.work || [];
                    currentUser.skills = details.skills || [];
                    currentUser.tests = details.tests || [];
                    currentUser.languages = details.languages || [];
                    currentUser.visa_history = details.visa || [];
                } catch (e) {
                    console.warn("Failed to fetch extended profile details:", e.message);
                }

                // Toggle Visibility
                if (authLinks) authLinks.style.display = 'none';
                if (userProfileNav) userProfileNav.style.display = 'flex';

                // Set Name
                const displayName = user.first_name + ' ' + (user.last_name || '');
                if (navUserName) navUserName.innerText = `Hi, ${user.first_name}`;
                if (pdFullName) pdFullName.innerText = displayName;

                // Set Initials
                const initials = (user.first_name[0] + (user.last_name ? user.last_name[0] : '')).toUpperCase();
                if (userAvatar) userAvatar.innerText = initials;
                if (pdAvatarInitials) pdAvatarInitials.innerText = initials;

                // Populate UI components...
                updateUIWithUserData(user, initials);
                renderProfileDetails();

                if (loginBtn) loginBtn.innerText = 'Logout';
            } catch (err) {
                console.error("Session expired or invalid:", err.message);
                handleLogout();
            }
        } else {
            currentUser = null;
            if (authLinks) authLinks.style.display = 'flex';
            if (userProfileNav) userProfileNav.style.display = 'none';
            if (profileDropdown) profileDropdown.classList.remove('active');
            if (loginBtn) loginBtn.innerText = 'Login';
        }
    };


    const updateUIWithUserData = (user, initials) => {
        const sideAvatar = document.getElementById('sideAvatar');
        const sideName = document.getElementById('sideName');
        const displayName = user.first_name + ' ' + (user.last_name || '');

        if (sideAvatar) sideAvatar.innerText = initials;
        if (sideName) sideName.innerText = displayName;

        document.querySelectorAll('.set-email').forEach(el => el.innerText = user.email);
        document.querySelectorAll('.set-first-name').forEach(el => el.innerText = user.first_name);
        document.querySelectorAll('.set-last-name').forEach(el => el.innerText = user.last_name || '--');
        document.querySelectorAll('.set-phone').forEach(el => el.innerText = user.phone || 'Not provided');
        document.querySelectorAll('.set-avatar').forEach(el => el.innerText = initials);
        document.querySelectorAll('.set-name').forEach(el => el.innerText = displayName);

        // Update Identity section specifically
        const profileFullName = document.getElementById('profileFullName');
        const profilePhone = document.getElementById('profilePhone');
        if (profileFullName) profileFullName.innerText = displayName;
        if (profilePhone) profilePhone.innerText = user.phone || '--';

        if (document.getElementById('setDob')) document.getElementById('setDob').innerText = user.dob ? user.dob.split('T')[0] : '--';

        // Update Profile Photos
        const photoSelectors = ['#sideAvatar', '#dashAvatar', '#userAvatar', '#pdAvatarInitials', '.set-avatar'];
        if (user.photo_content) {
            const photoUrl = user.photo_content;
            photoSelectors.forEach(selector => {
                document.querySelectorAll(selector).forEach(el => {
                    el.innerHTML = `<img src="${photoUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
                });
            });
        } else {
            photoSelectors.forEach(selector => {
                document.querySelectorAll(selector).forEach(el => {
                    el.innerText = initials;
                });
            });
        }

        updateResumeUI();
    };

    const renderProfileDetails = () => {
        if (!currentUser) return;
        renderEducation();
        renderWork();
        renderSkills();
        renderTests();
        renderLanguages();
        renderVisa();
    };

    const renderEducation = () => {
        const container = document.getElementById('eduListContainer');
        const addBtn = document.getElementById('btnAddEducation');
        if (!container) return;
        container.innerHTML = '';
        const eduList = currentUser.education || [];

        // Always show "Add Education" button as "Add" or "Add Education"
        if (addBtn) addBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Add Education';

        if (eduList.length === 0) {
            container.innerHTML = '<p style="color:#999;font-size:0.85rem;padding:10px 0;">No education details added yet.</p>';
            return;
        }

        eduList.forEach(edu => {
            const item = document.createElement('div');
            item.className = 'profile-list-item';
            item.innerHTML = `
                <div class="profile-list-item-header">
                    <div class="profile-list-item-title"><i class="fas fa-graduation-cap" style="color:#6a1b9a;margin-right:8px;"></i>${edu.degree_name || 'Degree'}</div>
                    <div class="profile-list-item-actions">
                        <i class="fas fa-pen btn-edit-item" title="Edit" data-section="education" data-id="${edu.id}" style="color:#ea4335;cursor:pointer;"></i>
                        <i class="fas fa-trash-alt btn-delete-item" title="Delete" data-section="education" data-id="${edu.id}" style="color:#999;cursor:pointer;margin-left:12px;"></i>
                    </div>
                </div>
                <div class="profile-list-item-subtitle" style="font-weight:600;">${edu.institution || '--'}</div>
                <div class="profile-list-item-meta" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px;">
                    ${edu.field_of_study ? `<span style="background:#f3e5f5;padding:2px 8px;border-radius:4px;font-size:0.8rem;">${edu.field_of_study}</span>` : ''}
                    ${edu.education_level ? `<span style="background:#e8f5e9;padding:2px 8px;border-radius:4px;font-size:0.8rem;">${edu.education_level}</span>` : ''}
                    ${edu.location ? `<span style="background:#e3f2fd;padding:2px 8px;border-radius:4px;font-size:0.8rem;"><i class="fas fa-map-marker-alt" style="margin-right:3px;"></i>${edu.location}</span>` : ''}
                </div>
                <div style="font-size:0.8rem;color:#777;margin-top:6px;"><i class="far fa-calendar-alt" style="margin-right:4px;"></i>${edu.start_month || ''} ${edu.start_year || ''} - ${edu.end_month || ''} ${edu.end_year || 'Present'}${edu.course_type ? ' • ' + edu.course_type : ''}${edu.study_mode ? ' • ' + edu.study_mode : ''}</div>
                ${edu.score_value ? `<div style="font-size:0.8rem;color:#555;margin-top:4px;"><i class="fas fa-chart-line" style="margin-right:4px;color:#4caf50;"></i>Score: ${edu.score_value} (${edu.score_type || ''})</div>` : ''}
                ${edu.is_highest_education ? '<span style="background:#fff3e0;padding:2px 8px;border-radius:4px;font-size:0.75rem;color:#e65100;margin-top:4px;display:inline-block;"><i class="fas fa-star" style="margin-right:3px;"></i>Highest Qualification</span>' : ''}
            `;
            container.appendChild(item);
        });
    };

    const renderWork = () => {
        const container = document.getElementById('workListContainer');
        if (!container) return;
        container.innerHTML = '';
        const workList = currentUser.work_experience || [];
        if (workList.length === 0) {
            container.innerHTML = '<p style="color:#999;font-size:0.85rem;padding:10px 0;">No work experience added yet.</p>';
            return;
        }
        workList.forEach(work => {
            const item = document.createElement('div');
            item.className = 'profile-list-item';
            item.innerHTML = `
                <div class="profile-list-item-header">
                    <div class="profile-list-item-title"><i class="fas fa-briefcase" style="color:#1565c0;margin-right:8px;"></i>${work.role || 'Role'}</div>
                    <div class="profile-list-item-actions">
                        <i class="fas fa-pen btn-edit-item" title="Edit" data-section="work" data-id="${work.id}" style="color:#ea4335;cursor:pointer;"></i>
                        <i class="fas fa-trash-alt btn-delete-item" title="Delete" data-section="work" data-id="${work.id}" style="color:#999;cursor:pointer;margin-left:12px;"></i>
                    </div>
                </div>
                <div class="profile-list-item-subtitle" style="font-weight:600;">${work.company || '--'}</div>
                <div class="profile-list-item-meta" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px;">
                    ${work.functional_area ? `<span style="background:#e3f2fd;padding:2px 8px;border-radius:4px;font-size:0.8rem;">${work.functional_area}</span>` : ''}
                    ${work.industry ? `<span style="background:#f3e5f5;padding:2px 8px;border-radius:4px;font-size:0.8rem;">${work.industry}</span>` : ''}
                    ${work.employment_type ? `<span style="background:#e8f5e9;padding:2px 8px;border-radius:4px;font-size:0.8rem;">${work.employment_type}</span>` : ''}
                    ${work.location ? `<span style="background:#fff3e0;padding:2px 8px;border-radius:4px;font-size:0.8rem;"><i class="fas fa-map-marker-alt" style="margin-right:3px;"></i>${work.location}</span>` : ''}
                </div>
                <div style="font-size:0.8rem;color:#777;margin-top:6px;"><i class="far fa-calendar-alt" style="margin-right:4px;"></i>${work.start_month || ''} ${work.start_year || ''} - ${work.is_current_role ? '<span style="color:#4caf50;font-weight:600;">Present</span>' : ((work.end_month || '') + ' ' + (work.end_year || ''))}</div>
                ${work.responsibilities ? `<div style="font-size:0.8rem;color:#555;margin-top:4px;"><strong>Responsibilities:</strong> ${work.responsibilities}</div>` : ''}
                ${work.achievements ? `<div style="font-size:0.8rem;color:#555;margin-top:2px;"><strong>Achievements:</strong> ${work.achievements}</div>` : ''}
            `;
            container.appendChild(item);
        });
    };

    const renderSkills = () => {
        const container = document.getElementById('skillsListContainer');
        if (!container) return;
        container.innerHTML = '';
        const skillsList = currentUser.skills || [];
        if (skillsList.length === 0) {
            container.innerHTML = '<p style="color:#999;font-size:0.85rem;padding:10px 0;">No skills added yet.</p>';
            return;
        }
        skillsList.forEach(skill => {
            const tag = document.createElement('div');
            tag.className = 'profile-skill-tag';
            tag.style.cssText = 'display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg,#e8f5e9,#c8e6c9);padding:6px 14px;border-radius:20px;font-size:0.85rem;font-weight:500;color:#2e7d32;margin:4px;';
            tag.innerHTML = `
                <i class="fas fa-check-circle" style="font-size:0.7rem;"></i> ${skill.skill_name}
                <i class="fas fa-times btn-delete-item" data-section="skills" data-id="${skill.id}" style="cursor:pointer;color:#ea4335;margin-left:4px;font-size:0.75rem;"></i>
            `;
            container.appendChild(tag);
        });
    };

    const renderTests = () => {
        const container = document.getElementById('testsListContainer');
        if (!container) return;
        container.innerHTML = '';
        const testsList = currentUser.tests || [];
        if (testsList.length === 0) {
            container.innerHTML = '<p style="color:#999;font-size:0.85rem;padding:10px 0;">No test scores added yet.</p>';
            return;
        }
        testsList.forEach(test => {
            const item = document.createElement('div');
            item.className = 'profile-list-item';
            item.innerHTML = `
                <div class="profile-list-item-header">
                    <div class="profile-list-item-title"><i class="fas fa-file-alt" style="color:#f57c00;margin-right:8px;"></i>${test.test_name || 'Test'}</div>
                    <div class="profile-list-item-actions">
                        <i class="fas fa-pen btn-edit-item" title="Edit" data-section="tests" data-id="${test.id}" style="color:#ea4335;cursor:pointer;"></i>
                        <i class="fas fa-trash-alt btn-delete-item" title="Delete" data-section="tests" data-id="${test.id}" style="color:#999;cursor:pointer;margin-left:12px;"></i>
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:12px;margin-top:6px;">
                    <div style="background:linear-gradient(135deg,#fff3e0,#ffe0b2);padding:8px 16px;border-radius:8px;font-weight:700;font-size:1.1rem;color:#e65100;">${test.score || '--'}</div>
                    <div>
                        <div style="font-size:0.8rem;color:#777;">Taken: ${test.taken_month || ''} ${test.taken_year || ''}</div>
                        ${test.valid_till_month ? `<div style="font-size:0.8rem;color:#4caf50;">Valid: ${test.valid_till_month} ${test.valid_till_year || ''}</div>` : ''}
                    </div>
                </div>
            `;
            container.appendChild(item);
        });
    };

    const renderLanguages = () => {
        const container = document.getElementById('languagesListContainer');
        if (!container) return;
        container.innerHTML = '';
        const langList = currentUser.languages || [];
        if (langList.length === 0) {
            container.innerHTML = '<p style="color:#999;font-size:0.85rem;padding:10px 0;">No languages added yet.</p>';
            return;
        }
        langList.forEach(lang => {
            const item = document.createElement('div');
            item.className = 'profile-list-item';
            item.innerHTML = `
                <div class="profile-list-item-header">
                    <div class="profile-list-item-title"><i class="fas fa-language" style="color:#1565c0;margin-right:8px;"></i>${lang.language_name || 'Language'}</div>
                    <div class="profile-list-item-actions">
                        <i class="fas fa-pen btn-edit-item" title="Edit" data-section="languages" data-id="${lang.id}" style="color:#ea4335;cursor:pointer;"></i>
                        <i class="fas fa-trash-alt btn-delete-item" title="Delete" data-section="languages" data-id="${lang.id}" style="color:#999;cursor:pointer;margin-left:12px;"></i>
                    </div>
                </div>
                <div style="margin-top:6px;font-size:0.85rem;color:#555;">Overall: <strong>${lang.overall_proficiency || '--'}</strong></div>
                <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:8px;">
                    <div style="text-align:center;background:#e3f2fd;padding:6px 4px;border-radius:6px;"><div style="font-size:0.7rem;color:#777;">Listening</div><div style="font-weight:700;font-size:0.85rem;color:#1565c0;">${lang.listening_proficiency || '--'}</div></div>
                    <div style="text-align:center;background:#f3e5f5;padding:6px 4px;border-radius:6px;"><div style="font-size:0.7rem;color:#777;">Speaking</div><div style="font-weight:700;font-size:0.85rem;color:#6a1b9a;">${lang.speaking_proficiency || '--'}</div></div>
                    <div style="text-align:center;background:#e8f5e9;padding:6px 4px;border-radius:6px;"><div style="font-size:0.7rem;color:#777;">Reading</div><div style="font-weight:700;font-size:0.85rem;color:#2e7d32;">${lang.reading_proficiency || '--'}</div></div>
                    <div style="text-align:center;background:#fff3e0;padding:6px 4px;border-radius:6px;"><div style="font-size:0.7rem;color:#777;">Writing</div><div style="font-weight:700;font-size:0.85rem;color:#e65100;">${lang.writing_proficiency || '--'}</div></div>
                </div>
            `;
            container.appendChild(item);
        });
    };

    const renderVisa = () => {
        const container = document.getElementById('visaListContainer');
        if (!container) return;
        container.innerHTML = '';
        const visaList = currentUser.visa_history || [];
        if (visaList.length === 0) {
            container.innerHTML = '<p style="color:#999;font-size:0.85rem;padding:10px 0;">No visa history added yet.</p>';
            return;
        }
        visaList.forEach(visa => {
            const item = document.createElement('div');
            item.className = 'profile-list-item';
            item.innerHTML = `
                <div class="profile-list-item-header">
                    <div class="profile-list-item-title"><i class="fas fa-passport" style="color:#6a1b9a;margin-right:8px;"></i>${visa.visa_type || 'Visa'} - ${visa.country || ''}</div>
                    <div class="profile-list-item-actions">
                        <i class="fas fa-pen btn-edit-item" title="Edit" data-section="visa" data-id="${visa.id}" style="color:#ea4335;cursor:pointer;"></i>
                        <i class="fas fa-trash-alt btn-delete-item" title="Delete" data-section="visa" data-id="${visa.id}" style="color:#999;cursor:pointer;margin-left:12px;"></i>
                    </div>
                </div>
                <div style="margin-top:6px;font-size:0.85rem;color:#555;">Specification: <strong>${visa.specification || '--'}</strong></div>
                <div style="margin-top:4px;font-size:0.85rem;color:#777;"><i class="far fa-calendar-alt" style="margin-right:4px;"></i>Valid till: ${visa.valid_till_date || ''} ${visa.valid_till_month || ''} ${visa.valid_till_year || ''}</div>
            `;
            container.appendChild(item);
        });
    };


    const updateResumeUI = () => {
        if (!currentUser) return;

        const resumeName = localStorage.getItem(`resume_${currentUser.email}`);

        // Update Banner UI
        const resumePromptText = document.getElementById('resumePromptText');
        const resumeStatusDisplay = document.getElementById('resumeStatusDisplay');
        const uploadResumeBtn = document.getElementById('uploadResumeBtn');
        const uploadedFileName = document.getElementById('uploadedFileName');

        // Update Tab UI
        const resumeDisplay = document.getElementById('resumeDisplay');
        const removeResumeBtnTab = document.getElementById('removeResumeBtnTab');

        if (resumeName) {
            if (resumePromptText) resumePromptText.style.display = 'none';
            if (resumeStatusDisplay) resumeStatusDisplay.style.display = 'flex';
            if (uploadResumeBtn) uploadResumeBtn.style.display = 'none';
            if (uploadedFileName) uploadedFileName.innerText = resumeName;

            if (resumeDisplay) resumeDisplay.value = resumeName;
            if (removeResumeBtnTab) removeResumeBtnTab.style.display = 'block';
        } else {
            if (resumePromptText) resumePromptText.style.display = 'block';
            if (resumeStatusDisplay) resumeStatusDisplay.style.display = 'none';
            if (uploadResumeBtn) uploadResumeBtn.style.display = 'block';

            if (resumeDisplay) resumeDisplay.value = '';
            if (removeResumeBtnTab) removeResumeBtnTab.style.display = 'none';
        }
    };

    window.removeResume = () => {
        if (!currentUser) return;
        if (confirm('Are you sure you want to remove your resume?')) {
            localStorage.removeItem(`resume_${currentUser.email}`);
            updateResumeUI();
        }
    };



    // Toggle Dropdown (Handles profile nav and avatar clicks via bubbling)
    if (userProfileNav) {
        userProfileNav.addEventListener('click', (e) => {
            e.stopPropagation();
            if (profileDropdown) {
                const isActive = profileDropdown.classList.contains('active');
                // Close all other instances if any, then toggle
                profileDropdown.classList.toggle('active');
            }
        });
    }

    // Close dropdown on outside click
    window.addEventListener('click', () => {
        if (profileDropdown) profileDropdown.classList.remove('active');
    });

    // Logout via Dropdown Link
    const logoutModal = document.getElementById('logoutModal');
    const confirmLogout = document.getElementById('confirmLogout');
    const cancelLogout = document.getElementById('cancelLogout');
    const closeLogoutModal = document.getElementById('closeLogoutModal');

    if (pdLogout && logoutModal) {
        pdLogout.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            logoutModal.classList.add('active');
            document.body.style.overflow = 'hidden';
            if (profileDropdown) profileDropdown.classList.remove('active');
        });

        const closeLogout = () => {
            logoutModal.classList.remove('active');
            document.body.style.overflow = 'auto';
        };

        const handleLogout = () => {
            localStorage.removeItem('token');
            currentUser = null;
            closeLogout();
            window.location.hash = 'home';
            checkAuthStatus();
        };

        if (confirmLogout) {
            confirmLogout.addEventListener('click', handleLogout);
        }

        if (cancelLogout) {
            cancelLogout.addEventListener('click', (e) => {
                e.preventDefault();
                closeLogout();
            });
        }

        if (closeLogoutModal) {
            closeLogoutModal.addEventListener('click', closeLogout);
        }

        // Close on outside click
        logoutModal.addEventListener('click', (e) => {
            if (e.target === logoutModal) closeLogout();
        });
    }

    // 10-Second Timer for Enquiry Form
    // Modals Logic
    const enquiryModal = document.getElementById('enquiryModal');
    const loginModal = document.getElementById('loginModal');

    const closeModal = document.getElementById('closeModal');
    const closeLoginModal = document.getElementById('closeLoginModal');

    const signupBtn = document.getElementById('signupBtn');
    const loginBtn = document.getElementById('loginBtn');

    const enquiryForm = document.getElementById('enquiryForm');
    const loginForm = document.getElementById('loginForm');

    // Auto Open Enquiry Modal (15s) - ONLY for logged-out users
    let autoModalTimer = null;
    const triggerAutoModal = () => {
        const token = localStorage.getItem('token');
        // NEVER show signup modal if user is logged in
        if (currentUser || token) return;
        if ((!loginModal || !loginModal.classList.contains('active')) &&
            (!enquiryModal || !enquiryModal.classList.contains('active'))) {
            enquiryModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    };

    // Use setInterval for "every 15 seconds" - only for logged-out users
    autoModalTimer = setInterval(triggerAutoModal, 15000);

    // Open Enquiry (Signup) - ONLY when not logged in
    if (signupBtn && enquiryModal) {
        signupBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentUser || localStorage.getItem('token')) return; // Already logged in
            enquiryModal.classList.add('active');
            document.body.style.overflow = 'hidden';
            if (autoModalTimer) clearInterval(autoModalTimer);
        });
    }

    // Open Login / Handle Logout
    if (loginBtn && loginModal) {
        loginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentUser) {
                localStorage.removeItem('token');
                currentUser = null;
                alert('Logged out successfully');
                checkAuthStatus();
            } else {
                loginModal.classList.add('active');
                document.body.style.overflow = 'hidden';
                if (autoModalTimer) clearTimeout(autoModalTimer);
            }
        });
    }

    // Open Function - ONLY when not logged in
    window.openModal = () => {
        // NEVER show signup if user is logged in
        if (currentUser || localStorage.getItem('token')) return;
        if (enquiryModal) {
            enquiryModal.classList.add('active');
            document.body.style.overflow = 'hidden';
            if (autoModalTimer) clearTimeout(autoModalTimer);
        }
    };

    const closeAllModals = () => {
        if (enquiryModal) enquiryModal.classList.remove('active');
        if (loginModal) loginModal.classList.remove('active');
        document.body.style.overflow = 'auto';
    };

    if (closeModal) closeModal.addEventListener('click', closeAllModals);
    if (closeLoginModal) closeLoginModal.addEventListener('click', closeAllModals);

    // Settings Sidebar Tabbing
    const settingsNavItems = document.querySelectorAll('.settings-nav-item');
    const settingsSections = document.querySelectorAll('.settings-section');

    settingsNavItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabId = item.getAttribute('data-settings-tab');

            // Update sidebar active state
            settingsNavItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            // Toggle sections
            settingsSections.forEach(sec => sec.classList.remove('active'));
            const targetSec = document.getElementById(`${tabId}-sec`);
            if (targetSec) targetSec.classList.add('active');
        });
    });

    // Settings Modals Logic
    const editAccountModal = document.getElementById('editAccountModal');
    const editSecurityModal = document.getElementById('editSecurityModal');
    const editGeneralBtn = document.getElementById('editGeneralBtn');
    const editSecurityBtn = document.getElementById('editSecurityBtn');
    const editAccountForm = document.getElementById('editAccountForm');
    const editSecurityForm = document.getElementById('editSecurityForm');

    const openSettingsModal = (modal) => {
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    };

    const closeSettingsModal = (modal) => {
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    };

    // Open General Modal
    if (editGeneralBtn && editAccountModal && editAccountForm) {
        editGeneralBtn.addEventListener('click', () => {
            // Pre-fill
            const displayName = pdFullName ? pdFullName.innerText : 'Kalyan Dev';
            const firstName = displayName.split(' ')[0];
            const lastName = displayName.split(' ').slice(1).join(' ');
            const email = document.querySelector('.set-email').innerText;
            const phone = document.querySelector('.set-phone').innerText.replace('+91 ', '');

            editAccountForm.querySelector('input[name="firstName"]').value = firstName;
            editAccountForm.querySelector('input[name="lastName"]').value = lastName;
            editAccountForm.querySelector('input[name="email"]').value = email;
            editAccountForm.querySelector('input[name="phone"]').value = phone;

            openSettingsModal(editAccountModal);
        });
    }

    // Open Security Modal
    if (editSecurityBtn && editSecurityModal) {
        editSecurityBtn.addEventListener('click', () => openSettingsModal(editSecurityModal));
    }

    // Close Button Handling
    ['closeAccountModal', 'cancelAccountBtn'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener('click', () => closeSettingsModal(editAccountModal));
    });

    ['closeSecurityModal', 'cancelSecurityBtn'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener('click', () => closeSettingsModal(editSecurityModal));
    });

    // Password Visibility Toggle
    document.querySelectorAll('.password-toggle').forEach(icon => {
        icon.addEventListener('click', () => {
            const input = icon.previousElementSibling;
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.replace('far', 'fas');
                icon.classList.replace('fa-eye', 'fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.replace('fas', 'far');
                icon.classList.replace('fa-eye-slash', 'fa-eye');
            }
        });
    });

    // --- FORGOT PASSWORD FLOW ---
    const forgotPassModal = document.getElementById('forgotPasswordModal');
    const fpStep1 = document.getElementById('fpStep1');
    const fpStep2 = document.getElementById('fpStep2');
    const btnVerifyPhone = document.getElementById('btnVerifyPhone');
    const btnResetPassword = document.getElementById('btnResetPassword');

    const openForgotPassword = (e) => {
        if (e) e.preventDefault();
        closeAllModals();
        if (typeof closeSettingsModal === 'function') closeSettingsModal(editSecurityModal);
        if (forgotPassModal) {
            forgotPassModal.classList.add('active');
            fpStep1.style.display = 'block';
            fpStep2.style.display = 'none';
            document.body.style.overflow = 'hidden';
        }
    };

    document.getElementById('forgotPassword')?.addEventListener('click', openForgotPassword);
    document.getElementById('forgotPassword2')?.addEventListener('click', openForgotPassword);
    document.getElementById('forgotPassSettings')?.addEventListener('click', openForgotPassword);

    if (btnVerifyPhone) {
        btnVerifyPhone.addEventListener('click', async () => {
            const countryCode = document.getElementById('fp_country_code').value;
            const phone = document.getElementById('fp_phone').value;
            if (!phone) return alert('Enter mobile number');

            try {
                // We send phone as is or combine with country code if needed. 
                const response = await api.request('/auth/check-phone', 'POST', { phone });
                if (response.success) {
                    fpStep1.style.display = 'none';
                    fpStep2.style.display = 'block';
                }
            } catch (err) {
                alert(err.message || "User does not exist with this mobile number");
            }
        });
    }

    if (btnResetPassword) {
        btnResetPassword.addEventListener('click', async () => {
            const phone = document.getElementById('fp_phone').value;
            const newPass = document.getElementById('fp_new_password').value;
            const confirmPass = document.getElementById('fp_confirm_password').value;

            if (newPass.length < 6) return alert('Password must be at least 6 characters');
            if (newPass !== confirmPass) return alert('Passwords do not match');

            try {
                await api.request('/auth/reset-password-phone', 'POST', { phone, newPassword: newPass });
                alert('Password reset successfully! You can now login.');
                if (forgotPassModal) forgotPassModal.classList.remove('active');
                if (loginModal) loginModal.classList.add('active');
            } catch (err) {
                alert("Reset failed: " + err.message);
            }
        });
    }

    // --- SOCIAL AUTH LOGIC ---
    let googleTokenClient;

    const handleGoogleTokenResponse = async (tokenResponse) => {
        if (tokenResponse && tokenResponse.access_token) {
            try {
                const res = await api.request('/auth/google', 'POST', { accessToken: tokenResponse.access_token });
                localStorage.setItem('token', res.token);

                if (res.needsProfileUpdate) {
                    const phone = prompt("Welcome! Please enter your mobile number to complete your registration:");
                    if (phone) {
                        await api.request('/profile/update-phone', 'POST', { phone }, res.token);
                    }
                }

                alert('Welcome ' + (res.user.first_name || 'User') + '! Login successful.');
                closeAllModals();
                await checkAuthStatus();
                window.location.hash = '';
            } catch (err) {
                console.error("Google Auth failed:", err);
                alert("Google Authentication failed");
            }
        }
    };

    const handleGoogleCredentialResponse = async (response) => {
        try {
            const res = await api.request('/auth/google', 'POST', { idToken: response.credential });
            localStorage.setItem('token', res.token);
            alert('Welcome ' + (res.user.first_name || 'User') + '! Login successful.');
            closeAllModals();
            await checkAuthStatus();
            window.location.hash = '';
        } catch (err) {
            console.error("Google Auth failed:", err);
            alert("Google Authentication failed");
        }
    };

    const handleFacebookLogin = () => {
        FB.login((response) => {
            if (response.authResponse) {
                const accessToken = response.authResponse.accessToken;
                api.request('/auth/facebook', 'POST', { accessToken })
                    .then(async (res) => {
                        localStorage.setItem('token', res.token);

                        if (res.needsProfileUpdate) {
                            const phone = prompt("Welcome! Please enter your mobile number to complete your registration:");
                            if (phone) {
                                await api.request('/profile/update-phone', 'POST', { phone }, res.token);
                            }
                        }

                        alert('Welcome ' + (res.user.first_name || 'User') + '! Login successful.');
                        closeAllModals();
                        await checkAuthStatus();
                        window.location.hash = '';
                    })
                    .catch(err => {
                        console.error("FB Backend Error:", err);
                        alert("Facebook Login failed");
                    });
            } else {
                console.log('User cancelled login or did not fully authorize.');
            }
        }, { scope: 'email,public_profile,user_mobile_phone' });
    };

    // Initialize SDKs
    const initSocialAuth = () => {
        console.log("Initializing Social Auth...");

        // 1. Initialize Google Identity Services
        if (typeof google !== 'undefined') {
            console.log("Google SDK detected.");

            // Standard ID logic (for One Tap if needed)
            google.accounts.id.initialize({
                client_id: "654721077447-1620tmnla74ekka5u0m9aqm6feigtalk.apps.googleusercontent.com",
                callback: handleGoogleCredentialResponse,
                auto_select: false,
                cancel_on_tap_outside: true
            });

            // Token Client (for custom button popups - MOST RELIABLE)
            googleTokenClient = google.accounts.oauth2.initTokenClient({
                client_id: "654721077447-1620tmnla74ekka5u0m9aqm6feigtalk.apps.googleusercontent.com",
                scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/user.phonenumbers.read',
                callback: handleGoogleTokenResponse,
            });

        } else {
            console.warn("Google SDK not yet loaded, retrying...");
            setTimeout(initSocialAuth, 1000);
            return;
        }

        // 2. Initialize Facebook
        if (typeof FB !== 'undefined') {
            FB.init({
                appId: '1459790719118881',
                cookie: true,
                xfbml: true,
                version: 'v18.0'
            });
        }

        // 3. Attach Social Click Handlers
        document.querySelectorAll('.social-btn.google').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log("Google custom button clicked. Opening account selector...");
                if (googleTokenClient) {
                    googleTokenClient.requestAccessToken();
                } else {
                    alert('Google Sign-In is still initializing. Please wait a moment.');
                }
            });
        });

        document.querySelectorAll('.social-btn.facebook').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log("Facebook login button click detected.");
                handleFacebookLogin();
            });
        });
    };
    initSocialAuth();

    // Handle Forms Submit
    if (editAccountForm) {
        editAccountForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fn = editAccountForm.querySelector('input[name="firstName"]').value;
            const ln = editAccountForm.querySelector('input[name="lastName"]').value;
            const phone = editAccountForm.querySelector('input[name="phone"]').value;
            const dob = editAccountForm.querySelector('input[name="dob"]').value;

            if (!currentUser) return;

            try {
                const token = localStorage.getItem('token');
                await api.request('/auth/profile', 'PUT', { firstName: fn, lastName: ln, phone, dob }, token);

                alert('Account settings updated successfully.');
                checkAuthStatus(); // Refresh UI
                closeSettingsModal(editAccountModal);
            } catch (error) {
                console.error("Update error:", error);
                alert("Failed to save changes: " + error.message);
            }
        });
    }

    if (editSecurityForm) {
        editSecurityForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newPass = editSecurityForm.querySelector('input[name="newPassword"]').value;
            const confirmPass = editSecurityForm.querySelector('input[name="confirmPassword"]').value;

            if (!currentUser) return;

            if (newPass !== confirmPass) {
                alert('Passwords do not match!');
                return;
            }

            try {
                const token = localStorage.getItem('token');
                await api.request('/auth/security', 'PUT', { newPassword: newPass }, token);
                alert('Password updated successfully');
                closeSettingsModal(editSecurityModal);
                editSecurityForm.reset();
            } catch (error) {
                console.error("Security update error:", error);
                alert("Security update failed: " + error.message);
            }
        });
    }

    // Click Outside
    window.addEventListener('click', (e) => {
        if (e.target === enquiryModal || e.target === loginModal || e.target === forgotPassModal) {
            closeAllModals();
            if (forgotPassModal) forgotPassModal.classList.remove('active');
        }
    });

    // Form Submits
    if (enquiryForm) {
        enquiryForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            try {
                const fn = enquiryForm.querySelector('input[placeholder="First Name"]').value;
                const ln = enquiryForm.querySelector('input[placeholder="Last Name"]').value;
                const email = enquiryForm.querySelector('input[placeholder="Email Address"]').value;
                const phone = enquiryForm.querySelector('input[placeholder="Mobile Number"]').value;
                const password = enquiryForm.querySelector('input[placeholder="Create Password"]').value;
                const countryCode = enquiryForm.querySelector('.country-code')?.value || '+91';

                const response = await api.request('/auth/signup', 'POST', {
                    email, password, firstName: fn, lastName: ln, phone, countryCode
                });
                localStorage.setItem('token', response.token);
                alert('Account created successfully!');
                closeAllModals();
                await checkAuthStatus();
                window.location.hash = '';
            } catch (error) {
                console.error("Signup Error: ", error);
                alert('Signup failed: ' + error.message);
            }
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const email = loginForm.querySelector('input[placeholder="Registered E-mail"]').value;
                const password = loginForm.querySelector('input[placeholder="Access Key"]').value;

                const response = await api.request('/auth/login', 'POST', { email, password });
                localStorage.setItem('token', response.token);
                alert('Logged in successfully!');
                closeAllModals();
                await checkAuthStatus();
                window.location.hash = '';
            } catch (error) {
                console.error("Login Error:", error.message);
                alert('Authentication Failed: ' + error.message);
            }
        });
    }

    // Active Visa Type Switcher
    const visaTypes = document.querySelectorAll('.visa-type');
    visaTypes.forEach(type => {
        type.addEventListener('click', () => {
            visaTypes.forEach(t => t.classList.remove('active'));
            type.classList.add('active');

            // In a real app, this would update the hero content (e.g., Dubai vs Canada vs Australia)
            const countryName = type.innerText;
            const heroH1 = document.querySelector('.hero-content h1');
            if (heroH1) {
                heroH1.innerText = countryName;
            }
        });
    });

    // Navigation Elements
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');

    // Unified View Controller (Handles Hash-based Routing)
    const switchView = (tabId) => {
        if (!tabId || tabId === 'home') tabId = 'home';

        // --- AUTH GUARD: If tab is protected and user is not logged in, show signup --
        // Only dashboard/profile/settings need login
        const protectedTabs = ['profile', 'settings', 'needs', 'resume', 'eligibility'];

        if (protectedTabs.includes(tabId) && !currentUser) {
            // Not logged in -> Show Sign Up Modal
            if (window.openModal) window.openModal();

            // Revert hash if needed to stay on home
            if (window.location.hash !== '#home' && window.location.hash !== '') {
                window.location.hash = 'home';
            }
            return;
        }

        // Update URL Hash without triggering another switch
        if (window.location.hash !== `#${tabId}`) {
            window.location.hash = tabId;
        }

        // UI Updates
        tabLinks.forEach(l => l.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        document.querySelectorAll(`.tab-link[data-tab="${tabId}"]`).forEach(l => {
            l.classList.add('active');
        });

        const targetId = tabId === 'home' ? 'home-view' : `${tabId}-view`;
        const targetContent = document.getElementById(targetId);
        if (targetContent) {
            targetContent.classList.add('active');
        }

        // Header/UI State Transitions
        const navLogo = document.getElementById('navLogo');
        const topLogo = document.getElementById('topLogo');
        const mainHeader = document.querySelector('.main-header');
        const publicUtils = document.getElementById('publicUtils');
        const memberUtils = document.getElementById('memberUtils');

        if (tabId === 'profile' || tabId === 'settings' || tabId === 'needs' || tabId === 'resume' || tabId === 'eligibility') {
            if (navLogo) navLogo.style.display = 'none';
            if (topLogo) topLogo.style.display = 'block';
            if (mainHeader) mainHeader.style.display = 'none';
            if (publicUtils) publicUtils.style.display = 'none';
            if (memberUtils) memberUtils.style.display = 'flex';
        } else {
            if (navLogo) navLogo.style.display = 'block';
            if (topLogo) topLogo.style.display = 'none';
            if (mainHeader) mainHeader.style.display = 'block';
            if (publicUtils) publicUtils.style.display = 'flex';
            if (memberUtils) memberUtils.style.display = 'none';
        }

        // Scroll to top on navigation
        window.scrollTo(0, 0);

        // Update Resume UI states
        if (typeof updateResumeUI === 'function') updateResumeUI();
    };

    // Tab Click Listener
    tabLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = link.getAttribute('data-tab');
            switchView(tabId);
        });
    });

    // Global Resume Upload Trigger
    window.triggerResumeUpload = () => {
        if (!currentUser) {
            if (window.openModal) window.openModal();
            return;
        }

        const resumeInput = document.getElementById('globalResumeUpload');
        if (resumeInput) {
            resumeInput.click();
        }
    };

    // Profile Detail Modals Logic
    window.openProfileModal = (modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    };

    window.closeProfileModal = (modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    };

    // Add Button Event Listeners
    const btnAddEducation = document.getElementById('btnAddEducation');
    if (btnAddEducation) btnAddEducation.addEventListener('click', (e) => { e.preventDefault(); openProfileModal('modalEducation'); });

    const btnAddWork = document.getElementById('btnAddWork');
    if (btnAddWork) btnAddWork.addEventListener('click', (e) => { e.preventDefault(); openProfileModal('modalWork'); });

    const btnAddSkills = document.getElementById('btnAddSkills');
    if (btnAddSkills) btnAddSkills.addEventListener('click', (e) => { e.preventDefault(); openProfileModal('modalSkills'); });

    const btnAddTests = document.getElementById('btnAddTests');
    if (btnAddTests) btnAddTests.addEventListener('click', (e) => { e.preventDefault(); openProfileModal('modalTests'); });

    const btnAddLanguages = document.getElementById('btnAddLanguages');
    if (btnAddLanguages) btnAddLanguages.addEventListener('click', (e) => { e.preventDefault(); openProfileModal('modalLanguages'); });

    const btnAddVisa = document.getElementById('btnAddVisa');
    if (btnAddVisa) btnAddVisa.addEventListener('click', (e) => { e.preventDefault(); openProfileModal('modalVisa'); });

    // Link Profile Sidebar to Modals
    document.getElementById('sideNavIdentity')?.addEventListener('click', (e) => { e.preventDefault(); openProfileModal('modalIdentity'); });
    document.getElementById('sideNavEducation')?.addEventListener('click', (e) => { e.preventDefault(); openProfileModal('modalEducation'); });
    document.getElementById('sideNavWork')?.addEventListener('click', (e) => { e.preventDefault(); openProfileModal('modalWork'); });
    document.getElementById('sideNavSkills')?.addEventListener('click', (e) => { e.preventDefault(); openProfileModal('modalSkills'); });
    document.getElementById('sideNavTests')?.addEventListener('click', (e) => { e.preventDefault(); openProfileModal('modalTests'); });
    document.getElementById('sideNavLanguages')?.addEventListener('click', (e) => { e.preventDefault(); openProfileModal('modalLanguages'); });
    document.getElementById('sideNavVisa')?.addEventListener('click', (e) => { e.preventDefault(); openProfileModal('modalVisa'); });

    // Identity Pencil Icon
    const triggerEditIdentity = document.getElementById('triggerEditIdentity');
    if (triggerEditIdentity) {
        triggerEditIdentity.addEventListener('click', () => {
            if (!currentUser) return alert('Please login first');

            // Pre-fill Identity Modal
            document.getElementById('ident_first_name').value = currentUser.first_name || '';
            document.getElementById('ident_last_name').value = currentUser.last_name || '';
            document.getElementById('ident_middle_name').value = currentUser.middle_name || '';
            document.getElementById('ident_dob').value = currentUser.dob ? currentUser.dob.split('T')[0] : '';
            document.getElementById('ident_gender').value = currentUser.gender || '';
            document.getElementById('ident_marital_status').value = currentUser.marital_status || '';
            document.getElementById('ident_nationality').value = currentUser.nationality || '';
            document.getElementById('ident_phone').value = currentUser.phone || '';
            document.getElementById('ident_alt_phone').value = currentUser.alt_phone || '';
            document.getElementById('ident_email').value = currentUser.email || '';
            document.getElementById('ident_nickname').value = currentUser.nickname || '';
            document.getElementById('ident_employment_status').value = currentUser.employment_status || '';
            document.getElementById('ident_skype_id').value = currentUser.skype_id || '';
            document.getElementById('ident_landline').value = currentUser.landline || '';
            document.getElementById('ident_github_id').value = currentUser.github_id || '';
            document.getElementById('ident_linkedin_id').value = currentUser.linkedin_id || '';
            document.getElementById('ident_location').value = currentUser.current_location || '';

            openProfileModal('modalIdentity');
        });
    }

    // Populate Modal Dropdowns
    const populateModalDropdowns = () => {
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const years = [];
        for (let i = 2035; i >= 1960; i--) years.push(i);

        const eduLevels = ["Tenth", "Eleventh", "Twelfth", "ITI", "Diploma", "Bachelors", "BBS", "BVSC", "B. Des", "B. F.Tech", "BHM", "BJ", "Post Graduate", "MJMC", "MMS", "Masters", "Ph.D", "Others"];
        const countries = ["Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"];
        const studyModes = ["On-site Learning/Traditional Learning", "Full time", "Part time", "One Sitting", "Distance Learning"];
        const mediums = ["Hindi", "Urdu", "Telugu", "Punjabi", "Tamil", "Gujarati", "Bengali", "Kannada", "Malayalam", "Marathi", "Oriya", "Spanish", "French", "German", "Italian", "Japanese", "Chinese", "Russian", "Danish", "Swedish", "English"];
        const divisions = ["1st Division", "2nd Division", "3rd Division", "Pass Division"];
        const employmentTypes = ["Full-time employee", "Part-time employee", "Self employed", "freelance", "internship", "voluntary"];
        const industries = [
            "Accounting", "Airlines/Aviation", "Alternative Dispute Resolution", "Alternative Medicine", "Animation",
            "Apparel & Fashion", "Architecture & Planning", "Arts and Crafts", "Automotive", "Aviation & Aerospace",
            "Banking", "Biotechnology", "Broadcast Media", "Building Materials", "Business Supplies and Equipment",
            "Capital Markets", "Chemicals", "Civic & Social Organization", "Civil Engineering", "Commercial Real Estate",
            "Computer & Network Security", "Computer Games", "Computer Hardware", "Computer Networking", "Computer Software",
            "Construction", "Consumer Electronics", "Consumer Goods", "Consumer Services", "Cosmetics", "Dairy",
            "Defense & Space", "Design", "Education Management", "E-Learning", "Electrical/Electronic Manufacturing",
            "Entertainment", "Environmental Services", "Events Services", "Executive Office", "Facilities Services",
            "Farming", "Financial Services", "Fine Art", "Fishery", "Food & Beverages", "Food Production", "Fund-Raising",
            "Furniture", "Gambling & Casinos", "Government Administration", "Government Relations", "Graphic Design",
            "Health, Wellness and Fitness", "Higher Education", "Hospital & Health Care", "Hospitality", "Human Resources",
            "Import and Export", "Individual & Family Services", "Industrial Automation", "Information Services",
            "Information Technology and Services", "Insurance", "International Affairs", "International Trade and Development",
            "Internet", "Investment Banking", "Investment Management", "Judiciary", "Law Enforcement", "Law Practice",
            "Legal Services", "Legislative Office", "Leisure, Travel & Tourism", "Libraries", "Logistics and Supply Chain",
            "Luxury Goods & Jewelry", "Machinery", "Management Consulting", "Maritime", "Market Research", "Marketing and Advertising",
            "Mechanical or Industrial Engineering", "Media Production", "Medical Devices", "Medical Practice", "Mental Health Care",
            "Military", "Mining & Metals", "Motion Pictures and Film", "Museums and Institutions", "Music", "Nanotechnology",
            "Newspapers", "Non-Profit Organization Management", "Oil & Energy", "Online Media", "Outsourcing/Offshoring",
            "Package/Freight Delivery", "Packaging and Containers", "Paper & Forest Products", "Performing Arts",
            "Pharmaceuticals", "Philanthropy", "Photography", "Plastics", "Political Organization", "Primary/Secondary Education",
            "Printing", "Professional Training & Coaching", "Program Development", "Public Policy", "Public Relations and Communications",
            "Public Safety", "Publishing", "Railroad Manufacture", "Ranching", "Real Estate", "Recreational Facilities and Services",
            "Religious Institutions", "Renewables & Environment", "Research", "Restaurants", "Retail", "Security and Investigations",
            "Semiconductors", "Shipbuilding", "Sporting Goods", "Sports", "Staffing and Recruiting", "Supermarkets",
            "Telecommunications", "Textiles", "Think Tanks", "Tobacco", "Translation and Localization", "Transportation/Trucking/Railroad",
            "Utilities", "Venture Capital & Private Equity", "Veterinary", "Warehousing", "Wholesale", "Wine and Spirits", "Wireless",
            "Writing and Editing"
        ];
        const tests = ["GRE", "IELTS", "TOEFL", "OET", "PTE", "CAE"];
        const languages = ["Hindi", "Urdu", "Telugu", "Punjabi", "Tamil", "Gujarati", "Bengali", "Kannada", "Malayalam", "Marathi", "Oriya", "Spanish", "French", "German", "Italian", "Japanese", "Chinese", "Russian", "Danish", "Swedish", "English"];
        const proficiencies = ["Native speaker", "Proficient", "Advanced", "Intermediate", "Beginner"];
        const visaTypes = ["Student Visa", "Work Visa", "Tourist Visa", "Business Visa", "Visitor Visa", "Dependent Visa", "Permanent Resident", "Citizen"];

        const monthSelects = document.querySelectorAll('select[id$="_month"]');
        monthSelects.forEach(select => {
            select.innerHTML = '<option value="">Month</option>';
            months.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m;
                opt.innerText = m;
                select.appendChild(opt);
            });
        });

        const yearSelects = document.querySelectorAll('select[id$="_year"]');
        yearSelects.forEach(select => {
            select.innerHTML = '<option value="">Year</option>';
            years.forEach(y => {
                const opt = document.createElement('option');
                opt.value = y;
                opt.innerText = y;
                select.appendChild(opt);
            });
        });

        // Populate Education Levels
        const eduLevelSelect = document.getElementById('edu_level');
        if (eduLevelSelect) {
            eduLevelSelect.innerHTML = '<option value="">Select Level</option>';
            eduLevels.forEach(level => {
                const opt = document.createElement('option');
                opt.value = level;
                opt.innerText = level;
                eduLevelSelect.appendChild(opt);
            });
        }

        // Populate Countries
        const countrySelects = document.querySelectorAll('select[id$="_location"], select[id$="_country"], #ident_nationality, #ident_location');
        countrySelects.forEach(select => {
            select.innerHTML = '<option value="">Select Country</option>';
            countries.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c;
                opt.innerText = c;
                select.appendChild(opt);
            });
        });

        // Course Type
        const eduCourseType = document.getElementById('edu_course_type');
        if (eduCourseType) {
            eduCourseType.innerHTML = '<option value="">Type of Course</option><option value="Full time">Full time</option><option value="Part time">Part time</option>';
        }

        // Mode of Study
        const eduStudyMode = document.getElementById('edu_study_mode');
        if (eduStudyMode) {
            eduStudyMode.innerHTML = '<option value="">Please select</option>';
            studyModes.forEach(mode => {
                const opt = document.createElement('option');
                opt.value = mode;
                opt.innerText = mode;
                eduStudyMode.appendChild(opt);
            });
        }

        // Medium of Education
        const eduMedium = document.getElementById('edu_medium');
        if (eduMedium) {
            eduMedium.innerHTML = '<option value="">Please select</option>';
            mediums.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m;
                opt.innerText = m;
                eduMedium.appendChild(opt);
            });
        }

        // Division
        const eduDivision = document.getElementById('edu_division');
        if (eduDivision) {
            eduDivision.innerHTML = '<option value="">Please select</option>';
            divisions.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d;
                opt.innerText = d;
                eduDivision.appendChild(opt);
            });
        }

        // Score Value (Percentage/Grade)
        const eduScoreValue = document.getElementById('edu_score_value');
        const updateScoreDropdown = () => {
            if (!eduScoreValue) return;
            const isGrade = document.querySelector('input[name="edu_score_type"][value="grade"]')?.checked;
            if (isGrade) {
                eduScoreValue.innerHTML = '<option value="">Select Grade</option>';
                ["A", "B", "C", "D", "E", "F", "O"].forEach(g => {
                    const opt = document.createElement('option');
                    opt.value = g;
                    opt.innerText = g;
                    eduScoreValue.appendChild(opt);
                });
            } else {
                eduScoreValue.innerHTML = '<option value="">Select Percentage</option>';
                for (let i = 100; i >= 33; i--) {
                    const opt = document.createElement('option');
                    opt.value = i + '%';
                    opt.innerText = i + '%';
                    eduScoreValue.appendChild(opt);
                }
            }
        };

        const scoreRadios = document.querySelectorAll('input[name="edu_score_type"]');
        scoreRadios.forEach(radio => radio.addEventListener('change', updateScoreDropdown));
        updateScoreDropdown();

        // Work Employment Type
        const workEmpType = document.getElementById('work_employment_type');
        if (workEmpType) {
            workEmpType.innerHTML = '<option value="">Please select</option>';
            employmentTypes.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t;
                opt.innerText = t;
                workEmpType.appendChild(opt);
            });
        }

        // Work Industry
        const workIndustry = document.getElementById('work_industry');
        if (workIndustry) {
            workIndustry.innerHTML = '<option value="">Please select</option>';
            industries.forEach(i => {
                const opt = document.createElement('option');
                opt.value = i;
                opt.innerText = i;
                workIndustry.appendChild(opt);
            });
        }

        // Test Names
        const testNameSelect = document.getElementById('test_name');
        if (testNameSelect) {
            testNameSelect.innerHTML = '<option value="">Select Test</option>';
            tests.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t;
                opt.innerText = t;
                testNameSelect.appendChild(opt);
            });
        }

        // Language Names
        const langNameSelect = document.getElementById('lang_name');
        if (langNameSelect) {
            langNameSelect.innerHTML = '<option value="">Select Language</option>';
            languages.forEach(l => {
                const opt = document.createElement('option');
                opt.value = l;
                opt.innerText = l;
                langNameSelect.appendChild(opt);
            });
        }

        // Language Proficiencies
        const langProfSelects = document.querySelectorAll('#lang_listening, #lang_speaking, #lang_reading, #lang_writing');
        langProfSelects.forEach(select => {
            select.innerHTML = `<option value="">Select ${select.id.split('_')[1]} proficiency</option>`;
            proficiencies.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p;
                opt.innerText = p;
                select.appendChild(opt);
            });
        });

        // Visa Type
        const visaTypeSelect = document.getElementById('visa_type');
        if (visaTypeSelect) {
            visaTypeSelect.innerHTML = '<option value="">Select Visa Type</option>';
            visaTypes.forEach(v => {
                const opt = document.createElement('option');
                opt.value = v;
                opt.innerText = v;
                visaTypeSelect.appendChild(opt);
            });
        }

        const visaSpecs = [
            "Domestic worker visa", "Aged dependent relative", "Australia PR Holder", "Bridging visa -A/B/C/D",
            "Business innovation and invst. (PR)", "Business innovation and invst.(prov)", "Business owner or Investor",
            "Business talent (PR) visa", "Business visit", "Canada PR Holder", "Carer Visa", "Child Visa/Adoption Visa",
            "Citizen", "Citizen/PR Dependent", "Crew Travel authority", "Danish Green Card Holder", "Distinguished talent visa",
            "Emergency rescue/woman at risk", "Employer Nominated scheme", "Entrepreneur Visa", "Family sponsorship",
            "Family visit visa", "Finance Visa", "Former resident/Resident return visa", "General Visit",
            "Germany Jobseeker Visa Holder", "Global Special Humanitarian", "H1B Visa Holder", "Hong Kong Resident Permit Holder",
            "In-country special humanitarian", "Investor retirement", "Medical treatment", "PNP Nomination and Federal Application",
            "PR CEC - Single Applicant", "PR CEC-Married and Dependents", "PR Skilled Worker - Married & Dependents",
            "PR Skilled Worker - Single Applicant", "PR The Federal Skilled Trades Program", "PR skilled –Quebec selected skilled worker",
            "Parent visa/Contributory Parent visa", "Partner visa/Prospective marriage visa", "Post Graduate Work Permit",
            "Protection visa", "Quebec PR Holder", "Refugee visa", "Regional sponsored employer scheme", "Remaining relative/Orphan relative",
            "Self-employed persons", "Settlement Visa", "Skilled Independent migrant -PR", "Skilled nominated state or relative -PR",
            "Skilled recognized graduate -476", "Skilled regional (prov.) state or relative", "Sole Representative Visa",
            "Special category- NZ citizen", "Special category-NZ citizen family (temp.)", "Special program", "Sponsor a Refugee",
            "Start up Visa", "State sponsored Business owner or Investor", "Student Dependent", "Student Visa Extention",
            "Student guardian", "Student Visa", "Student permit/Student overseas", "Super yacht crew/Maritime crew", "TR dependent",
            "Temporary graduate-485", "Temporary work (Entertainment)", "Temporary work (International relations)",
            "Temporary work(short /long stay)", "Temporary work(skilled)-457", "The federal entrepreneur program",
            "The immigrant investor program", "Tier 1 Dependent", "Tier 1 Extension (FLR)", "Tier 1 Extension (ILR)",
            "Tourist Visa", "US Green Card Holder", "Visa for Dependents – Work Permit", "Visa for Dependents-Study Permit",
            "Visit Visa", "Visitor visa/evisitor visa", "Work Permit – Overseas applicant", "Work visa", "Work and Holiday",
            "Work dependent visa", "Working holiday visa"
        ];

        // Visa Specification
        const visaSpecSelect = document.getElementById('visa_specification');
        if (visaSpecSelect) {
            visaSpecSelect.innerHTML = '<option value="">Select Specification</option>';
            visaSpecs.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s;
                opt.innerText = s;
                visaSpecSelect.appendChild(opt);
            });
        }

        // Add dates 1-31 for visa
        const dateSelect = document.getElementById('visa_valid_date');
        if (dateSelect) {
            dateSelect.innerHTML = '<option value="">Date</option>';
            for (let i = 1; i <= 31; i++) {
                const opt = document.createElement('option');
                opt.value = i;
                opt.innerText = i;
                dateSelect.appendChild(opt);
            }
        }

        // Employment Status (Identity Modal)
        const empStatusSelect = document.getElementById('ident_employment_status');
        if (empStatusSelect) {
            const empStatuses = ["Employed", "Self-employed", "Unemployed", "Student", "Fresher", "Homemaker", "Retired"];
            empStatusSelect.innerHTML = '<option value="">Select Employment Status</option>';
            empStatuses.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s;
                opt.innerText = s;
                empStatusSelect.appendChild(opt);
            });
        }

        // Skill Suggestions
        document.querySelectorAll('.skill-tag.suggested').forEach(tag => {
            tag.addEventListener('click', () => {
                const skillInput = document.getElementById('skill_name_input');
                if (skillInput) {
                    // Remove the '+' from the end of the text
                    skillInput.value = tag.innerText.replace(' +', '').trim();
                }
            });
        });
    };
    populateModalDropdowns();

    // Helper to collect data and save
    const saveProfileDetail = async (endpoint, data, modalId) => {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Please login to save details.');
            return;
        }

        try {
            await api.request(endpoint, 'POST', data, token);
            alert('Details saved successfully!');
            closeProfileModal(modalId);
            // Refresh User Data and UI
            await checkAuthStatus();
        } catch (err) {
            alert('Error saving details: ' + err.message);
        }
    };

    const clearModalFields = (modalId) => {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        const inputs = modal.querySelectorAll('input:not([type="radio"]), select, textarea');
        inputs.forEach(input => {
            if (input.type === 'checkbox') input.checked = false;
            else input.value = '';
        });
        // Special case for radio buttons
        modal.querySelectorAll('input[type="radio"]').forEach(radio => radio.checked = false);
    };

    const prefillEducation = (edu) => {
        document.getElementById('edu_institution').value = edu.institution || '';
        document.getElementById('edu_field').value = edu.field_of_study || '';
        document.getElementById('edu_level').value = edu.education_level || '';
        document.getElementById('edu_degree').value = edu.degree_name || '';
        document.getElementById('edu_country').value = edu.location || '';
        document.getElementById('edu_is_highest').checked = edu.is_highest_education || false;
        document.getElementById('edu_start_month').value = edu.start_month || '';
        document.getElementById('edu_start_year').value = edu.start_year || '';
        document.getElementById('edu_end_month').value = edu.end_month || '';
        document.getElementById('edu_end_year').value = edu.end_year || '';
        document.getElementById('edu_course_type').value = edu.course_type || '';
        document.getElementById('edu_study_mode').value = edu.study_mode || '';
        document.getElementById('edu_medium').value = edu.medium_of_education || '';
        document.getElementById('edu_division').value = edu.division || '';
        const radio = document.querySelector(`input[name="edu_score_type"][value="${edu.score_type}"]`);
        if (radio) radio.checked = true;
        document.getElementById('edu_score_value').value = edu.score_value || '';
        document.getElementById('edu_additional').value = edu.additional_info || '';
    };

    const prefillWork = (work) => {
        document.getElementById('work_company').value = work.company || '';
        document.getElementById('work_domain').value = work.functional_area || '';
        document.getElementById('work_role').value = work.role || '';
        document.getElementById('work_location').value = work.location || '';
        document.getElementById('work_is_current').checked = work.is_current_role || false;
        document.getElementById('work_start_month').value = work.start_month || '';
        document.getElementById('work_start_year').value = work.start_year || '';
        document.getElementById('work_end_month').value = work.end_month || '';
        document.getElementById('work_end_year').value = work.end_year || '';
        document.getElementById('work_employment_type').value = work.employment_type || '';
        document.getElementById('work_industry').value = work.industry || '';
        document.getElementById('work_responsibilities').value = work.responsibilities || '';
        document.getElementById('work_achievements').value = work.achievements || '';
        if (document.getElementById('work_additional')) {
            document.getElementById('work_additional').value = work.additional_info || '';
        }
    };

    const prefillTests = (test) => {
        document.getElementById('test_name').value = test.test_name || '';
        document.getElementById('test_score').value = test.score || '';
        document.getElementById('test_taken_month').value = test.taken_month || '';
        document.getElementById('test_taken_year').value = test.taken_year || '';
        document.getElementById('test_valid_month').value = test.valid_till_month || '';
        document.getElementById('test_valid_year').value = test.valid_till_year || '';
    };

    const prefillLanguages = (lang) => {
        document.getElementById('lang_name').value = lang.language_name || '';
        const radio = document.querySelector(`input[name="langProf"][value="${lang.overall_proficiency}"]`);
        if (radio) radio.checked = true;
        document.getElementById('lang_listening').value = lang.listening_proficiency || '';
        document.getElementById('lang_speaking').value = lang.speaking_proficiency || '';
        document.getElementById('lang_reading').value = lang.reading_proficiency || '';
        document.getElementById('lang_writing').value = lang.writing_proficiency || '';
    };

    const prefillVisa = (visa) => {
        document.getElementById('visa_type').value = visa.visa_type || '';
        document.getElementById('visa_country').value = visa.country || '';
        document.getElementById('visa_specification').value = visa.specification || '';
        document.getElementById('visa_valid_date').value = visa.valid_till_date || '';
        document.getElementById('visa_valid_month').value = visa.valid_till_month || '';
        document.getElementById('visa_valid_year').value = visa.valid_till_year || '';
    };

    // Global listener for dynamic Edit/Delete buttons
    document.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.btn-edit-item');
        const deleteBtn = e.target.closest('.btn-delete-item');

        if (editBtn) {
            const section = editBtn.getAttribute('data-section');
            const id = editBtn.getAttribute('data-id');
            editingItemId = id;

            let item = null;
            if (section === 'education') item = currentUser.education.find(i => i.id == id);
            else if (section === 'work') item = currentUser.work_experience.find(i => i.id == id);
            else if (section === 'tests') item = currentUser.tests.find(i => i.id == id);
            else if (section === 'languages') item = currentUser.languages.find(i => i.id == id);
            else if (section === 'visa') item = currentUser.visa_history.find(i => i.id == id);

            if (!item) return;

            if (section === 'education') { prefillEducation(item); openProfileModal('modalEducation'); }
            else if (section === 'work') { prefillWork(item); openProfileModal('modalWork'); }
            else if (section === 'tests') { prefillTests(item); openProfileModal('modalTests'); }
            else if (section === 'languages') { prefillLanguages(item); openProfileModal('modalLanguages'); }
            else if (section === 'visa') { prefillVisa(item); openProfileModal('modalVisa'); }
        }

        if (deleteBtn) {
            const section = deleteBtn.getAttribute('data-section');
            const id = deleteBtn.getAttribute('data-id');

            if (!id || id === 'undefined' || id === 'null') {
                console.error("Delete failed: Invalid ID", { section, id });
                return;
            }

            if (!confirm('Are you sure you want to delete this entry?')) return;

            try {
                const token = localStorage.getItem('token');
                // Ensure endpoint starts with /
                const endpoint = `/profile/${section}/${id}`;
                console.log(`Attempting to DELETE: ${endpoint}`);

                await api.request(endpoint, 'DELETE', null, token);
                alert('Deleted successfully');
                await checkAuthStatus();
            } catch (err) {
                console.error("Delete Error:", err);
                alert('Error deleting: ' + err.message);
            }
        }
    });

    // Add Button Listeners (Clear modals and set editingItemId to null)
    document.getElementById('btnAddEducation')?.addEventListener('click', (e) => {
        e.preventDefault();
        editingItemId = null;
        clearModalFields('modalEducation');
        openProfileModal('modalEducation');
    });

    document.getElementById('btnAddWork')?.addEventListener('click', (e) => {
        e.preventDefault();
        editingItemId = null;
        clearModalFields('modalWork');
        openProfileModal('modalWork');
    });

    document.getElementById('btnAddSkills')?.addEventListener('click', (e) => {
        e.preventDefault();
        editingItemId = null;
        clearModalFields('modalSkills');
        openProfileModal('modalSkills');
    });

    document.getElementById('btnAddTests')?.addEventListener('click', (e) => {
        e.preventDefault();
        editingItemId = null;
        clearModalFields('modalTests');
        openProfileModal('modalTests');
    });

    document.getElementById('btnAddLanguages')?.addEventListener('click', (e) => {
        e.preventDefault();
        editingItemId = null;
        clearModalFields('modalLanguages');
        openProfileModal('modalLanguages');
    });

    document.getElementById('btnAddVisa')?.addEventListener('click', (e) => {
        e.preventDefault();
        editingItemId = null;
        clearModalFields('modalVisa');
        openProfileModal('modalVisa');
    });

    document.getElementById('triggerEditIdentity')?.addEventListener('click', (e) => {
        e.preventDefault();
        // Prefill identity is already handled in checkAuthStatus for simplicity, 
        // but we can ensure it's fresh here if needed.
        if (currentUser) {
            document.getElementById('ident_first_name').value = currentUser.first_name || '';
            document.getElementById('ident_last_name').value = currentUser.last_name || '';
            document.getElementById('ident_middle_name').value = currentUser.middle_name || '';
            document.getElementById('ident_dob').value = currentUser.dob ? currentUser.dob.split('T')[0] : '';
            document.getElementById('ident_gender').value = currentUser.gender || '';
            document.getElementById('ident_marital_status').value = currentUser.marital_status || '';
            document.getElementById('ident_nationality').value = currentUser.nationality || '';
            document.getElementById('ident_phone').value = currentUser.phone || '';
            document.getElementById('ident_alt_phone').value = currentUser.alt_phone || '';
            document.getElementById('ident_nickname').value = currentUser.nickname || '';
            document.getElementById('ident_employment_status').value = currentUser.employment_status || '';
            document.getElementById('ident_skype_id').value = currentUser.skype_id || '';
            document.getElementById('ident_landline').value = currentUser.landline || '';
            document.getElementById('ident_github_id').value = currentUser.github_id || '';
            document.getElementById('ident_linkedin_id').value = currentUser.linkedin_id || '';
            document.getElementById('ident_location').value = currentUser.current_location || '';
        }
        openProfileModal('modalIdentity');
    });

    // Save Handlers
    document.getElementById('btnSaveEducation')?.addEventListener('click', () => {
        const institution = document.getElementById('edu_institution').value;
        const study_field = document.getElementById('edu_field').value;
        if (!institution || !study_field) {
            alert('Institution and Field of Study are required.');
            return;
        }
        const data = {
            id: editingItemId,
            institution: institution,
            study_field: study_field,
            edu_level: document.getElementById('edu_level').value,
            degree: document.getElementById('edu_degree').value,
            location: document.getElementById('edu_country').value,
            is_highest: document.getElementById('edu_is_highest').checked,
            start_month: document.getElementById('edu_start_month').value,
            start_year: document.getElementById('edu_start_year').value,
            end_month: document.getElementById('edu_end_month').value,
            end_year: document.getElementById('edu_end_year').value,
            course_type: document.getElementById('edu_course_type').value,
            study_mode: document.getElementById('edu_study_mode').value,
            medium: document.getElementById('edu_medium').value,
            division: document.getElementById('edu_division').value,
            score_type: document.querySelector('input[name="edu_score_type"]:checked')?.value,
            score_value: document.getElementById('edu_score_value').value,
            info: document.getElementById('edu_additional').value
        };
        saveProfileDetail('/profile/education', data, 'modalEducation');
    });

    document.getElementById('btnSaveWork')?.addEventListener('click', () => {
        const data = {
            id: editingItemId,
            company: document.getElementById('work_company').value,
            domain: document.getElementById('work_domain').value,
            role: document.getElementById('work_role').value,
            location: document.getElementById('work_location').value,
            is_current: document.getElementById('work_is_current').checked,
            start_month: document.getElementById('work_start_month').value,
            start_year: document.getElementById('work_start_year').value,
            end_month: document.getElementById('work_end_month').value,
            end_year: document.getElementById('work_end_year').value,
            employment_type: document.getElementById('work_employment_type').value,
            industry: document.getElementById('work_industry').value,
            responsibilities: document.getElementById('work_responsibilities').value,
            achievements: document.getElementById('work_achievements').value,
            info: document.getElementById('work_additional')?.value || ''
        };
        saveProfileDetail('/profile/work', data, 'modalWork');
    });

    document.getElementById('btnSaveTests')?.addEventListener('click', () => {
        const data = {
            id: editingItemId,
            test_name: document.getElementById('test_name').value,
            score: document.getElementById('test_score').value,
            taken_month: document.getElementById('test_taken_month').value,
            taken_year: document.getElementById('test_taken_year').value,
            valid_month: document.getElementById('test_valid_month').value,
            valid_year: document.getElementById('test_valid_year').value
        };
        saveProfileDetail('/profile/tests', data, 'modalTests');
    });

    document.getElementById('btnSaveLanguages')?.addEventListener('click', () => {
        const data = {
            id: editingItemId,
            name: document.getElementById('lang_name').value,
            overall: document.querySelector('input[name="langProf"]:checked')?.value,
            listening: document.getElementById('lang_listening').value,
            speaking: document.getElementById('lang_speaking').value,
            reading: document.getElementById('lang_reading').value,
            writing: document.getElementById('lang_writing').value
        };
        saveProfileDetail('/profile/languages', data, 'modalLanguages');
    });

    document.getElementById('btnSaveVisa')?.addEventListener('click', () => {
        const data = {
            id: editingItemId,
            type: document.getElementById('visa_type').value,
            country: document.getElementById('visa_country').value,
            specification: document.getElementById('visa_specification').value,
            valid_date: document.getElementById('visa_valid_date').value,
            valid_month: document.getElementById('visa_valid_month').value,
            valid_year: document.getElementById('visa_valid_year').value
        };
        saveProfileDetail('/profile/visa', data, 'modalVisa');
    });

    document.getElementById('btnSaveSkills')?.addEventListener('click', () => {
        const skillInput = document.getElementById('skill_name_input');
        const data = {
            id: editingItemId,
            skill_name: skillInput ? skillInput.value : ''
        };
        if (!data.skill_name) {
            alert('Please enter a skill name.');
            return;
        }
        saveProfileDetail('/profile/skills', data, 'modalSkills');
    });

    document.getElementById('btnSaveIdentity')?.addEventListener('click', async () => {
        const token = localStorage.getItem('token');
        if (!token) return alert('Please login');

        const data = {
            firstName: document.getElementById('ident_first_name').value,
            lastName: document.getElementById('ident_last_name').value,
            middleName: document.getElementById('ident_middle_name').value,
            dob: document.getElementById('ident_dob').value,
            gender: document.getElementById('ident_gender').value,
            maritalStatus: document.getElementById('ident_marital_status').value,
            nationality: document.getElementById('ident_nationality').value,
            phone: document.getElementById('ident_phone').value,
            altPhone: document.getElementById('ident_alt_phone').value,
            nickname: document.getElementById('ident_nickname').value,
            employmentStatus: document.getElementById('ident_employment_status').value,
            skypeId: document.getElementById('ident_skype_id').value,
            landline: document.getElementById('ident_landline').value,
            githubId: document.getElementById('ident_github_id').value,
            linkedinId: document.getElementById('ident_linkedin_id').value,
            currentLocation: document.getElementById('ident_location').value
        };

        try {
            await api.request('/profile/identity', 'POST', data, token);
            alert('Identity details saved successfully!');
            closeProfileModal('modalIdentity');
            // Refresh User Data and UI
            checkAuthStatus();
        } catch (err) {
            alert('Error saving identity: ' + err.message);
        }
    });

    // Handle File Selection
    const resumeInput = document.getElementById('globalResumeUpload');
    if (resumeInput) {
        resumeInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Size validation: 5MB = 5 * 1024 * 1024 bytes
            const maxSize = 5 * 1024 * 1024;
            if (file.size > maxSize) {
                alert(`Error: The file "${file.name}" is too large (${(file.size / (1024 * 1024)).toFixed(2)} MB). Please upload a file smaller than 5MB.`);
                resumeInput.value = ''; // Reset input
                return;
            }

            // Simulation of upload progress
            const originalText = document.getElementById('uploadResumeBtn')?.innerText;
            if (document.getElementById('uploadResumeBtn')) {
                document.getElementById('uploadResumeBtn').innerText = 'Uploading...';
                document.getElementById('uploadResumeBtn').disabled = true;
            }

            try {
                const token = localStorage.getItem('token');
                // First save to backend
                await api.request('/auth/profile/resume', 'POST', { resumeName: file.name }, token);

                // Simulate network delay for upload animation
                await new Promise(resolve => setTimeout(resolve, 1500));

                // Save locally
                localStorage.setItem(`resume_${currentUser.email}`, file.name);

                alert(`Success! "${file.name}" has been uploaded and saved to your profile.`);
                updateResumeUI();
            } catch (err) {
                alert('Upload failed: ' + err.message);
            } finally {
                if (document.getElementById('uploadResumeBtn')) {
                    document.getElementById('uploadResumeBtn').innerText = originalText || 'Upload Resume';
                    document.getElementById('uploadResumeBtn').disabled = false;
                }
                resumeInput.value = ''; // Reset for next selection
            }
        });
    }

    // Setup validation for all modals
    const setupAllModalValidations = () => {
        // Helper to check if a field has a valid value (not empty, not default placeholder)
        const isFieldValid = (id, invalidValues = []) => {
            const el = document.getElementById(id);
            if (!el) return false;
            const val = el.value;
            if (!val || val.trim() === "") return false;
            // Check against generic defaults
            if (val === "Month" || val === "Year" || val === "Date" || val === "Day") return false;
            // Check against specific invalid values (defaults)
            if (invalidValues.includes(val)) return false;
            // Check if value looks like a default "Select..." prompt
            if (val.startsWith("Select ")) return false;
            if (val === "Please select") return false;
            return true;
        };

        const checkEdu = () => {
            // Required: Institution, Level, Degree, Country, Start Month/Year, End Month/Year, Course Type, Score Value
            const reqFields = [
                { id: 'edu_institution', invalid: [] },
                { id: 'edu_level', invalid: [''] },
                { id: 'edu_degree', invalid: [] },
                { id: 'edu_country', invalid: [''] }, // Fixed from edu_location
                { id: 'edu_start_month', invalid: ['Month'] },
                { id: 'edu_start_year', invalid: ['Year'] },
                { id: 'edu_end_month', invalid: ['Month'] },
                { id: 'edu_end_year', invalid: ['Year'] },
                { id: 'edu_course_type', invalid: ['', 'Type of Course'] },
                { id: 'edu_score_value', invalid: ['', 'Select Percentage', 'Select Grade'] }
            ];

            const isValid = reqFields.every(field => isFieldValid(field.id, field.invalid));

            const btn = document.getElementById('btnSaveEducation');
            if (btn) {
                btn.disabled = !isValid;
                btn.style.opacity = isValid ? '1' : '0.5';
                btn.style.cursor = isValid ? 'pointer' : 'not-allowed';
            }
        };

        const checkWork = () => {
            // Required: Company, Domain, Role, Location, Start Month/Year, Emp Type, Industry
            const baseFields = [
                { id: 'work_company', invalid: [] },
                { id: 'work_domain', invalid: [] },
                { id: 'work_role', invalid: [] },
                { id: 'work_location', invalid: ['', 'Select Country'] },
                { id: 'work_start_month', invalid: ['Month'] },
                { id: 'work_start_year', invalid: ['Year'] },
                { id: 'work_employment_type', invalid: ['', 'Please select'] },
                { id: 'work_industry', invalid: ['', 'Please select'] }
            ];

            let isValid = baseFields.every(field => isFieldValid(field.id, field.invalid));

            const isCurrent = document.getElementById('work_is_current')?.checked;
            if (!isCurrent) {
                if (!isFieldValid('work_end_month', ['Month']) || !isFieldValid('work_end_year', ['Year'])) {
                    isValid = false;
                }
            }

            const btn = document.getElementById('btnSaveWork');
            if (btn) {
                btn.disabled = !isValid;
                btn.style.opacity = isValid ? '1' : '0.5';
                btn.style.cursor = isValid ? 'pointer' : 'not-allowed';
            }
        };

        const checkIdentity = () => {
            // Required: First Name, Last Name, DOB, Gender, Marital Status, Nationality, Phone, Employment, Location
            const fields = [
                { id: 'ident_first_name', invalid: [] },
                { id: 'ident_last_name', invalid: [] },
                { id: 'ident_dob', invalid: [] },
                { id: 'ident_gender', invalid: ['', 'Select Gender'] },
                { id: 'ident_marital_status', invalid: ['', 'Select Marital Status'] },
                { id: 'ident_nationality', invalid: ['', 'Select Nationality'] },
                { id: 'ident_phone', invalid: [] },
                { id: 'ident_employment_status', invalid: ['', 'Select Employment Status'] },
                { id: 'ident_location', invalid: ['', 'Country'] }
            ];

            const isValid = fields.every(field => isFieldValid(field.id, field.invalid));

            const btn = document.getElementById('btnSaveIdentity');
            if (btn) {
                btn.disabled = !isValid;
                btn.style.opacity = isValid ? '1' : '0.5';
                btn.style.cursor = isValid ? 'pointer' : 'not-allowed';
            }
        };

        const checkSkills = () => {
            const isValid = isFieldValid('skill_name_input');
            const btn = document.getElementById('btnSaveSkills');
            if (btn) {
                btn.disabled = !isValid;
                btn.style.opacity = isValid ? '1' : '0.5';
                btn.style.cursor = isValid ? 'pointer' : 'not-allowed';
            }
        };

        const checkTests = () => {
            const fields = [
                { id: 'test_name', invalid: ['', 'Select Test', 'Ex.GRE'] },
                { id: 'test_score', invalid: [] },
                { id: 'test_taken_month', invalid: ['Month'] },
                { id: 'test_taken_year', invalid: ['Year'] }
            ];
            const isValid = fields.every(field => isFieldValid(field.id, field.invalid));

            const btn = document.getElementById('btnSaveTests');
            if (btn) {
                btn.disabled = !isValid;
                btn.style.opacity = isValid ? '1' : '0.5';
                btn.style.cursor = isValid ? 'pointer' : 'not-allowed';
            }
        };

        const checkLangs = () => {
            // Required: Name
            const nameValid = isFieldValid('lang_name', ['', 'Select Language']);

            // Check specific proficiencies if no overall? Or simplify?
            // Let's require the 4 specifics as they seem important in UI
            const specificsFields = ['lang_listening', 'lang_speaking', 'lang_reading', 'lang_writing'];
            const specificsValid = specificsFields.every(id => isFieldValid(id, ['', 'Select listening proficiency', 'Select speaking proficiency', 'Select reading proficiency', 'Select writing proficiency']));

            const isValid = nameValid && specificsValid;

            const btn = document.getElementById('btnSaveLanguages');
            if (btn) {
                btn.disabled = !isValid;
                btn.style.opacity = isValid ? '1' : '0.5';
                btn.style.cursor = isValid ? 'pointer' : 'not-allowed';
            }
        };

        const checkVisa = () => {
            const fields = [
                { id: 'visa_type', invalid: ['', 'Select Visa Type'] },
                { id: 'visa_country', invalid: ['', 'Select Country'] },
                { id: 'visa_valid_date', invalid: ['Date'] },
                { id: 'visa_valid_month', invalid: ['Month'] },
                { id: 'visa_valid_year', invalid: ['Year'] }
            ];
            const isValid = fields.every(field => isFieldValid(field.id, field.invalid));

            const btn = document.getElementById('btnSaveVisa');
            if (btn) {
                btn.disabled = !isValid;
                btn.style.opacity = isValid ? '1' : '0.5';
                btn.style.cursor = isValid ? 'pointer' : 'not-allowed';
            }
        };

        // Attach listeners to everything in all modals
        const modals = document.querySelectorAll('.profile-modal-overlay');
        modals.forEach(modal => {
            ['input', 'change', 'click'].forEach(evt => {
                modal.addEventListener(evt, () => {
                    checkEdu(); checkWork(); checkIdentity(); checkSkills(); checkTests(); checkLangs(); checkVisa();
                });
            });
        });

        // Run once
        checkEdu(); checkWork(); checkIdentity(); checkSkills(); checkTests(); checkLangs(); checkVisa();
    };

    // Trigger validation setup when modals are opened
    const originalOpenProfileModal = window.openProfileModal;
    window.openProfileModal = (modalId) => {
        if (originalOpenProfileModal) originalOpenProfileModal(modalId);
        setTimeout(setupAllModalValidations, 100);
    };

    // Handle Profile Photo Upload
    const photoInput = document.getElementById('profilePhotoInput');
    if (photoInput) {
        photoInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (file.size > 2 * 1024 * 1024) {
                alert('Image size should be less than 2MB');
                return;
            }

            const reader = new FileReader();
            reader.onload = async (event) => {
                const photoContent = event.target.result;
                const photoType = file.type;

                try {
                    const token = localStorage.getItem('token');
                    await api.request('/auth/profile/photo', 'POST', { photoContent, photoType }, token);
                    alert('Profile photo updated successfully!');
                    checkAuthStatus(); // Refresh UI
                } catch (err) {
                    alert('Failed to upload photo: ' + err.message);
                }
            };
            reader.readAsDataURL(file);
        });
    }

    // ===== CONTACT US scrolls to footer =====
    const contactUsLink = document.getElementById('contactUsLink');
    if (contactUsLink) {
        contactUsLink.addEventListener('click', (e) => {
            e.preventDefault();
            const footer = document.getElementById('siteFooter');
            if (footer) {
                footer.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    // ===== Switch to Login from Signup Modal =====
    const switchToLoginLink = document.getElementById('switchToLogin');
    if (switchToLoginLink) {
        switchToLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (enquiryModal) enquiryModal.classList.remove('active');
            if (loginModal) {
                loginModal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        });
    }

    // ===== Make ALL buttons/hyperlinks in migrate, work, study, visa, coaching, refer views DUMMY =====
    const dummyTabs = ['migrate-view', 'work-view', 'study-view', 'visa-view', 'coaching-view', 'refer-view'];
    dummyTabs.forEach(viewId => {
        const view = document.getElementById(viewId);
        if (!view) return;

        // Disable all buttons inside these views
        view.querySelectorAll('button').forEach(btn => {
            if (btn.classList.contains('tab-link')) return; // skip navigation buttons
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // No response - dummy
            });
        });

        // Disable all hyperlinks inside these views
        view.querySelectorAll('a').forEach(link => {
            if (link.classList.contains('tab-link')) return; // skip navigation links
            link.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // No response - dummy
            });
        });
    });

    // Also make buttons/links in home-view dummy (main page buttons like "Book Counselling", etc.)
    const homeView = document.getElementById('home-view');
    if (homeView) {
        homeView.querySelectorAll('button, .btn').forEach(btn => {
            if (btn.classList.contains('tab-link')) return;
            if (btn.id === 'signupBtn' || btn.id === 'loginBtn' || btn.id === 'contactUsLink') return;
            if (btn.closest('#publicUtils') || btn.closest('#memberUtils') || btn.closest('#authLinks')) return;
            // Allow the call/whatsapp links
            const href = btn.getAttribute('href');
            if (href && (href.startsWith('tel:') || href.startsWith('https://wa.me'))) return;
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // No response - dummy
            });
        });
    }

    // ===== Search Dropdown with Navigation =====
    const navSearchLinks = document.querySelectorAll('.nav-search');
    navSearchLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Check if search overlay already exists
            let searchOverlay = document.getElementById('searchOverlay');
            if (searchOverlay) {
                searchOverlay.classList.toggle('active');
                const input = searchOverlay.querySelector('input');
                if (input) input.focus();
                return;
            }

            // Create search overlay
            searchOverlay = document.createElement('div');
            searchOverlay.id = 'searchOverlay';
            searchOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:10000;display:flex;justify-content:center;padding-top:120px;';
            searchOverlay.classList.add('active');

            const searchContainer = document.createElement('div');
            searchContainer.style.cssText = 'background:#fff;border-radius:16px;padding:30px;width:550px;max-height:500px;box-shadow:0 20px 60px rgba(0,0,0,0.3);';

            const searchInput = document.createElement('input');
            searchInput.type = 'text';
            searchInput.placeholder = 'Search pages... (Migrate, Study, Work, Visa, Profile, etc.)';
            searchInput.style.cssText = 'width:100%;padding:14px 20px;border:2px solid #eee;border-radius:10px;font-size:1rem;outline:none;box-sizing:border-box;';

            const resultsDiv = document.createElement('div');
            resultsDiv.style.cssText = 'margin-top:15px;max-height:350px;overflow-y:auto;';

            const pages = [
                { name: 'Home', tab: 'home' },
                { name: 'Free Eligibility Check', tab: 'free-check' },
                { name: 'Migrate', tab: 'migrate' },
                { name: 'Work', tab: 'work' },
                { name: 'Study', tab: 'study' },
                { name: 'Visa', tab: 'visa' },
                { name: 'Coaching', tab: 'coaching' },
                { name: 'Refer', tab: 'refer' },
                { name: 'Jobsite', tab: 'jobsite' },
                { name: 'Profile', tab: 'profile' },
                { name: 'Settings', tab: 'settings' },
            ];

            const renderResults = (query) => {
                resultsDiv.innerHTML = '';
                const filtered = query ? pages.filter(p => p.name.toLowerCase().includes(query.toLowerCase())) : pages;
                if (filtered.length === 0) {
                    resultsDiv.innerHTML = '<p style="color:#999;padding:10px;text-align:center;">No pages found</p>';
                    return;
                }
                filtered.forEach(page => {
                    const item = document.createElement('div');
                    item.style.cssText = 'padding:12px 18px;cursor:pointer;border-radius:8px;font-size:0.95rem;font-weight:500;color:#333;transition:background 0.2s;';
                    item.innerHTML = `<i class="fas fa-arrow-right" style="margin-right:10px;color:#ea4335;font-size:0.8rem;"></i> ${page.name}`;
                    item.addEventListener('mouseenter', () => { item.style.background = '#f5f5f5'; });
                    item.addEventListener('mouseleave', () => { item.style.background = 'transparent'; });
                    item.addEventListener('click', () => {
                        searchOverlay.classList.remove('active');
                        searchOverlay.remove();
                        switchView(page.tab);
                    });
                    resultsDiv.appendChild(item);
                });
            };

            searchInput.addEventListener('input', (e) => {
                renderResults(e.target.value);
            });

            searchContainer.appendChild(searchInput);
            searchContainer.appendChild(resultsDiv);
            searchOverlay.appendChild(searchContainer);
            document.body.appendChild(searchOverlay);

            // Close on overlay click (outside the search box)
            searchOverlay.addEventListener('click', (e) => {
                if (e.target === searchOverlay) {
                    searchOverlay.classList.remove('active');
                    searchOverlay.remove();
                }
            });

            // Render all pages initially
            renderResults('');
            searchInput.focus();
        });
    });

    // Listen for Back/Forward Buttons
    window.addEventListener('hashchange', () => {
        const tabId = window.location.hash.replace('#', '') || 'home';
        switchView(tabId);
    });

    // Initial Load - Check Hash
    const initialTab = window.location.hash.replace('#', '') || 'home';
    switchView(initialTab);

    // Reveal animations on scroll
    const reveal = () => {
        const reveals = document.querySelectorAll('.feature-section, .country-card');
        for (let i = 0; i < reveals.length; i++) {
            const windowHeight = window.innerHeight;
            const elementTop = reveals[i].getBoundingClientRect().top;
            const elementVisible = 150;
            if (elementTop < windowHeight - elementVisible) {
                reveals[i].style.opacity = '1';
                reveals[i].style.transform = 'translateY(0)';
            }
        }
    };

    // Initial styles for reveal
    const revealElements = document.querySelectorAll('.feature-section, .country-card');
    revealElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'all 0.8s ease-out';
    });

    window.addEventListener('scroll', reveal);
    reveal(); // Trigger once on load
    // Wizard: Multi-step Logic
    const wizardStep1 = document.getElementById('wizard-step-1');
    const wizardStep2 = document.getElementById('wizard-step-2');

    const wizardNextBtn1 = document.getElementById('wizardNextBtn1');
    const wizardNextBtn2 = document.getElementById('wizardNextBtn2');
    const wizardBackBtn2 = document.getElementById('wizardBackBtn2');
    const wizardNextBtn3 = document.getElementById('wizardNextBtn3');
    const wizardBackBtn3 = document.getElementById('wizardBackBtn3');
    const wizardNextBtn4 = document.getElementById('wizardNextBtn4');
    const wizardBackBtn4 = document.getElementById('wizardBackBtn4');
    const wizardNextBtn5 = document.getElementById('wizardNextBtn5');
    const wizardBackBtn5 = document.getElementById('wizardBackBtn5');
    const wizardNextBtn6 = document.getElementById('wizardNextBtn6');
    const wizardBackBtn6 = document.getElementById('wizardBackBtn6');
    const wizardNextBtn7 = document.getElementById('wizardNextBtn7');
    const wizardBackBtn7 = document.getElementById('wizardBackBtn7');
    const wizardNextBtn8 = document.getElementById('wizardNextBtn8');
    const wizardBackBtn8 = document.getElementById('wizardBackBtn8');

    const selectedEvalInfo = document.getElementById('selectedEvalInfo');
    const selectedCountryFlag = document.getElementById('selectedCountryFlag');
    const selectedCountryName = document.getElementById('selectedCountryName');
    const scoreHelper = document.getElementById('scoreHelper');

    const countryFlags = {
        'UK': 'flags/uk.png',
        'Canada': 'flags/canada.png',
        'Germany': 'flags/germany.png',
        'Australia': 'flags/australia.png',
        'Australia Partner': 'flags/australia.png',
        'Saskatchewan': 'flags/saskatchewan.png',
        'Quebec': 'flags/quebec.png'
    };

    // Preload flags for instant display
    Object.values(countryFlags).forEach(url => {
        const img = new Image();
        img.src = url;
    });

    const countryPhrases = {
        'UK': 'Eligibility assessment requested for',
        'Canada': 'Profile review selection for',
        'Germany': 'Qualification check requested for',
        'Australia': 'Migration assessment selected for',
        'Australia Partner': 'Partner eligibility review for',
        'Saskatchewan': 'Regional assessment targeted for',
        'Quebec': 'Specialized evaluation selected for'
    };

    const countryConfig = {
        'UK': {
            totalSteps: 6,
            q2: 'Review your age category',
            p2: ["18 to 24", "25 to 32", "33 to 39", "40 to 44"],
            pts2: [5, 5, 5, 5],
            q3: 'Your highest qualification',
            p3: ["Ph.D", "Masters", "Diploma after Bachelors", "Bachelors", "Diploma after secondary", "Ph.D related to Your work profile", "Related to STEM"],
            pts3: [20, 15, 12, 10, 8, 20, 15],
            q4: 'Your total work experience',
            p4: ["Less than 1 year", "1 year", "2 years", "3 years", "4 years", "5 years", "6 years", "7 years", "8 years or more years"],
            pts4: [0, 2, 4, 6, 8, 10, 12, 14, 15],
            q5: 'Your English',
            p5: ["Very High Proficiency", "High Proficiency", "Moderate Proficiency", "Basic Proficiency", "No Proficiency"],
            pts5: [10, 8, 6, 4, 2],
            q6: 'Do you hold a job offer from UK and an approved sponsor, and is at an appropriate skill level?',
            p6: ["YES", "NO"],
            pts6: [50, 10],
            q7: 'If Yes(have offer from UK)- Is salary offered is £ 25600 and above the minimum going rate of your occupation?',
            p7: ["YES", "NO"],
            pts7: [0, 0],
            q8: 'Your Job in UK is one among the UK skilled worker shortage occupations list ?',
            p8: ["YES", "NO"],
            pts8: [20, 0]
        },
        'Canada': {
            totalSteps: 9,
            q2: 'Review your age category',
            p2: ["Below 18", "18-35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46", "47 or more"],
            pts2: [0, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
            q3: 'Your years of work experience',
            p3: ["1 year", "2 years", "3 years", "4 years", "5 years", "6 years", "7 or more years"],
            pts3: [9, 11, 13, 15, 15, 15, 15],
            q4: 'Your highest level of education',
            p4: ["PHD", "Masters", "Diploma after Bachelors", "Bachelors", "Diploma after secondary"],
            pts4: [6, 5, 4, 3, 2],
            q5: 'Your English proficiency',
            p5: ["Very High Proficiency", "High Proficiency", "Moderate Proficiency", "Basic Proficiency", "No Proficiency"],
            pts5: [24, 20, 16, 12, 0],
            q6: 'Your French proficiency',
            p6: ["Very High Proficiency", "High Proficiency", "Moderate Proficiency", "Basic Proficiency", "No Proficiency"],
            pts6: [24, 20, 16, 12, 0]
        },
        'Germany': {
            totalSteps: 8,
            q2: 'Identify your age group',
            p2: ["Below 18", "18 to 35", "35 to 40", "Above 40"],
            pts2: [0, 2, 1, 0],
            q3: 'Qualification',
            p3: ["Is your qualification and University fully recognized", "Is your qualification and University Partially recognized"],
            pts3: [6, 4],
            q4: 'Relevant Work Experience',
            p4: ["5 years in the last 7 years", "2 Years in the last 5 years"],
            pts4: [3, 4],
            q5: 'German Language Proficiency',
            p5: ["A2 level", "B1 level", "B2 and above"],
            pts5: [1, 2, 3],
            q6: 'English Language Proficiency: C1 Level',
            p6: ["Yes", "No"],
            pts6: [1, 0]
        },
        'Australia': {
            totalSteps: 7,
            q2: 'Select your age range',
            p2: ["18 to 24", "25 to 32", "33 to 39", "40 to 44"],
            pts2: [25, 30, 25, 15],
            q3: 'Your highest level of education',
            p3: ["PHD", "Masters", "Diploma after Bachelors", "Bachelors", "Diploma after secondary"],
            pts3: [20, 15, 10, 15, 10],
            q4: 'Your total work experience(excluding Australian experience)',
            p4: ["Less than 1 year", "1 year", "2 years", "3 years", "4 years", "5 years", "6 years", "7 years", "8 years or more years"],
            pts4: [0, 0, 0, 5, 5, 10, 10, 10, 15],
            q5: 'Your English proficiency',
            p5: ["Very High Proficiency", "High Proficiency", "Moderate Proficiency", "Basic Proficiency", "No Proficiency"],
            pts5: [20, 10, 0, 0, 0],
            q6: 'Are you married?',
            p6: ["Yes", "No"],
            pts6: [0, 20]
        },
        'Australia Partner': {
            totalSteps: 7,
            q2: 'Specify your age bracket',
            p2: ["18 to 24", "25 to 32", "33 to 39", "40 to 44"],
            pts2: [25, 30, 25, 15],
            q3: 'Your highest level of education',
            p3: ["PHD", "Masters", "Diploma after Bachelors", "Bachelors", "Diploma after secondary"],
            pts3: [20, 15, 10, 15, 10],
            q4: 'Your total work experience(excluding Australian experience)',
            p4: ["Less than 1 year", "1 year", "2 years", "3 years", "4 years", "5 years", "6 years", "7 years", "8 years or more years"],
            pts4: [0, 0, 0, 5, 5, 10, 10, 10, 15],
            q5: 'Your English Proficiency',
            p5: ["Very High Proficiency", "High Proficiency", "Moderate Proficiency", "Basic Proficiency", "No Proficiency"],
            pts5: [20, 10, 0, 0, 0],
            q6: 'Are you married?',
            p6: ["Yes", "No"],
            pts6: [0, 20]
        },
        'Saskatchewan': {
            totalSteps: 9,
            q2: 'Indicate your highest educational qualification',
            p2: ["Master's or Ph. D", "Bachelor's", "Trade Certificate", "Diploma", "1 year or more than 1 year Certificate course"],
            pts2: [23, 20, 20, 15, 12],
            q3: 'Work experience in last 5 years',
            p3: ["5 years", "4 years", "3 years", "2 years", "1 year"],
            pts3: [10, 8, 15, 4, 2],
            q4: 'Work experience in the 6-10 years',
            p4: ["5 years", "4 years", "3 years", "2 years"],
            pts4: [5, 4, 18, 2],
            q5: 'First Language Test (English or French)',
            p5: ["CLB 8 and higher", "CLB 7", "CLB 6", "CLB 5", "CLB 4"],
            pts5: [20, 18, 16, 14, 12],
            q6: 'Your age group',
            p6: ["18-21 years", "22-34 years", "35-45 years", "46-50 years"],
            pts6: [15, 20, 10, 0]
        },
        'Quebec': {
            totalSteps: 14,
            q2: 'Identify your age group',
            p2: ["18 to 24", "25 to 32", "33 to 39", "40 to 44"],
            pts2: [12, 10, 8, 6],
            q3: 'Work Experience of Skilled Worker',
            p3: ["Less than 6 months", "6 to 11 months", "12 to 23 months", "24 to 35 months", "36 to 47 months", "48 months or +"],
            pts3: [0, 8, 10, 12, 14, 16],
            q4: 'Level of Education',
            p4: ["General high school", "Vocational high school", "General postsecondary 2 years", "Technical postsecondary 1 year", "Technical postsecondary 2 years", "Technical postsecondary 1 year or 2 years", "Technical postsecondary 3 years", "Technical postsecondary section A or B training area 3 years", "University, undergraduate, 1 year", "University, undergraduate, 2 years", "University, undergraduate, 3 years or +", "Master's, 1 year or +", "University, doctorate"],
            pts4: [2, 8, 4, 6, 6, 6, 10, 10, 4, 4, 10, 12, 12],
            q5: 'Education in Quebec',
            p5: ["Yes", "No"],
            pts5: [4, 0],
            q6: 'Option of education',
            p6: ["Section A", "Section B", "Section C", "Section D", "Section E"],
            pts6: [2, 1, 0, 0, 0]
        }
    };

    const renderDashes = (container, current, total) => {
        if (!container) return;
        container.innerHTML = '';
        for (let i = 1; i <= total; i++) {
            const dash = document.createElement('div');
            dash.className = 'step-dash' + (i <= current ? ' active' : '');
            container.appendChild(dash);
        }
    };

    // Initial render for Step 1
    renderDashes(document.getElementById('progressBars1'), 1, 6);

    let wizardData = {
        country: '',
        evalType: 'Immigration',
        scores: {
            step2: 0,
            step3: 0,
            step4: 0,
            step5: 0,
            step6: 0,
            step7: 0,
            step8: 0
        }
    };

    const updateTotalScore = () => {
        const total = wizardData.scores.step2 + wizardData.scores.step3 + wizardData.scores.step4 + wizardData.scores.step5 + wizardData.scores.step6 + wizardData.scores.step7 + wizardData.scores.step8;
        const display = document.getElementById('currentScoreValue');
        if (display) {
            // Animate number change
            const startVal = parseInt(display.innerText) || 0;
            const duration = 500;
            let startTime = null;

            const animate = (currentTime) => {
                if (!startTime) startTime = currentTime;
                const progress = Math.min((currentTime - startTime) / duration, 1);
                const currentVal = Math.floor(progress * (total - startVal) + startVal);
                display.innerText = currentVal;
                if (progress < 1) requestAnimationFrame(animate);
            };
            requestAnimationFrame(animate);
        }
    };

    // Step 1: Country Selection
    const countryPills = document.querySelectorAll('#wizard-step-1 .c-pill');
    countryPills.forEach(pill => {
        pill.addEventListener('click', () => {
            countryPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            wizardData.country = pill.getAttribute('data-country');
            if (wizardNextBtn1) wizardNextBtn1.disabled = false;

            // Reset scores on country change
            wizardData.scores = { step2: 0, step3: 0, step4: 0, step5: 0, step6: 0, step7: 0, step8: 0 };
            updateTotalScore();

            // Update Step 1 progress bar total dynamically
            const config = countryConfig[wizardData.country];
            if (config) {
                document.getElementById('stepLabel1').innerText = `STEP 1 OF ${config.totalSteps}`;
                renderDashes(document.getElementById('progressBars1'), 1, config.totalSteps);
            }
        });
    });

    // Step 1 -> Step 2
    if (wizardNextBtn1) {
        wizardNextBtn1.addEventListener('click', () => {
            const config = countryConfig[wizardData.country];
            if (!config) return;

            wizardData.evalType = document.getElementById('evalTypeSelect').value;

            // Setup Step 2 UI dynamically
            document.getElementById('stepLabel2').innerText = `STEP 2 OF ${config.totalSteps}`;
            renderDashes(document.getElementById('progressBars2'), 2, config.totalSteps);
            document.getElementById('step2Question').innerText = config.q2;

            const pContainer = document.getElementById('step2PillContainer');
            pContainer.innerHTML = '';
            config.p2.forEach((val, idx) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'c-pill';
                btn.innerText = val;
                btn.addEventListener('click', () => {
                    pContainer.querySelectorAll('.c-pill').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    wizardData.scores.step2 = config.pts2[idx] || 0;
                    updateTotalScore();
                    if (wizardNextBtn2) wizardNextBtn2.disabled = false;
                });
                pContainer.appendChild(btn);
            });

            // Show Step 2
            wizardStep1.style.display = 'none';
            wizardStep2.style.display = 'block';

            // Update Score Box Header with Flag and Dynamic Sentence
            if (selectedEvalInfo) {
                selectedEvalInfo.style.display = 'block';
                selectedCountryName.innerText = wizardData.country;
                selectedCountryFlag.src = countryFlags[wizardData.country] ? './' + countryFlags[wizardData.country] : '';

                const evalTextP = selectedEvalInfo.querySelector('p');
                if (evalTextP) {
                    evalTextP.innerText = countryPhrases[wizardData.country] || 'Profile assessment for';
                }
            }
            if (scoreHelper) scoreHelper.style.display = 'none';
        });
    }

    // Dynamic logic for Step 2 selection now handled above during pill generation.

    // Step 2 Back
    if (wizardBackBtn2) {
        wizardBackBtn2.addEventListener('click', () => {
            wizardStep2.style.display = 'none';
            wizardStep1.style.display = 'block';

            if (selectedEvalInfo) selectedEvalInfo.style.display = 'none';
            if (scoreHelper) scoreHelper.style.display = 'block';
        });
    }

    // Step 2 -> Step 3
    if (wizardNextBtn2) {
        wizardNextBtn2.addEventListener('click', () => {
            const config = countryConfig[wizardData.country];
            if (!config) return;

            // Setup Step 3 UI dynamically
            document.getElementById('stepLabel3').innerText = `STEP 3 OF ${config.totalSteps}`;
            renderDashes(document.getElementById('progressBars3'), 3, config.totalSteps);
            document.getElementById('step3Question').innerText = config.q3;

            const pContainer = document.getElementById('step3PillContainer');
            pContainer.innerHTML = '';
            config.p3.forEach((val, idx) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'c-pill';
                btn.innerText = val;
                btn.addEventListener('click', () => {
                    pContainer.querySelectorAll('.c-pill').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    wizardData.scores.step3 = config.pts3[idx] || 0;
                    updateTotalScore();
                    if (wizardNextBtn3) wizardNextBtn3.disabled = false;
                });
                pContainer.appendChild(btn);
            });

            // Show Step 3
            wizardStep2.style.display = 'none';
            document.getElementById('wizard-step-3').style.display = 'block';
        });
    }

    // Step 3 Back
    if (wizardBackBtn3) {
        wizardBackBtn3.addEventListener('click', () => {
            document.getElementById('wizard-step-3').style.display = 'none';
            wizardStep2.style.display = 'block';
        });
    }

    // Step 3 -> Step 4
    if (wizardNextBtn3) {
        wizardNextBtn3.addEventListener('click', () => {
            const config = countryConfig[wizardData.country];
            if (!config || !config.q4) {
                alert(`Step 3 complete! Selection: ${wizardData.step3Selection}. Step 4 info coming soon.`);
                return;
            }

            // Setup Step 4 UI dynamically
            document.getElementById('stepLabel4').innerText = `STEP 4 OF ${config.totalSteps}`;
            renderDashes(document.getElementById('progressBars4'), 4, config.totalSteps);
            document.getElementById('step4Question').innerText = config.q4;

            const pContainer = document.getElementById('step4PillContainer');
            pContainer.innerHTML = '';
            config.p4.forEach((val, idx) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'c-pill';
                btn.innerText = val;
                btn.addEventListener('click', () => {
                    pContainer.querySelectorAll('.c-pill').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    wizardData.scores.step4 = config.pts4[idx] || 0;
                    updateTotalScore();
                    if (wizardNextBtn4) wizardNextBtn4.disabled = false;
                });
                pContainer.appendChild(btn);
            });

            // Show Step 4
            document.getElementById('wizard-step-3').style.display = 'none';
            document.getElementById('wizard-step-4').style.display = 'block';
        });
    }

    // Step 4 Back
    if (wizardBackBtn4) {
        wizardBackBtn4.addEventListener('click', () => {
            document.getElementById('wizard-step-4').style.display = 'none';
            document.getElementById('wizard-step-3').style.display = 'block';
        });
    }

    // Step 4 -> Step 5
    if (wizardNextBtn4) {
        wizardNextBtn4.addEventListener('click', () => {
            const config = countryConfig[wizardData.country];
            if (!config || !config.q5) {
                alert(`Step 4 complete! Selection recorded. Step 5 info coming soon.`);
                return;
            }

            // Setup Step 5 UI dynamically
            document.getElementById('stepLabel5').innerText = `STEP 5 OF ${config.totalSteps}`;
            renderDashes(document.getElementById('progressBars5'), 5, config.totalSteps);
            document.getElementById('step5Question').innerText = config.q5;

            const pContainer = document.getElementById('step5PillContainer');
            pContainer.innerHTML = '';
            config.p5.forEach((val, idx) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'c-pill';
                btn.innerText = val;
                btn.addEventListener('click', () => {
                    pContainer.querySelectorAll('.c-pill').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    wizardData.scores.step5 = config.pts5[idx] || 0;
                    updateTotalScore();
                    if (wizardNextBtn5) wizardNextBtn5.disabled = false;
                });
                pContainer.appendChild(btn);
            });

            // Show Step 5
            document.getElementById('wizard-step-4').style.display = 'none';
            document.getElementById('wizard-step-5').style.display = 'block';
        });
    }

    // Step 5 Back
    if (wizardBackBtn5) {
        wizardBackBtn5.addEventListener('click', () => {
            document.getElementById('wizard-step-5').style.display = 'none';
            document.getElementById('wizard-step-4').style.display = 'block';
        });
    }

    // Step 5 -> Step 6
    if (wizardNextBtn5) {
        wizardNextBtn5.addEventListener('click', () => {
            const config = countryConfig[wizardData.country];
            if (!config || !config.q6) {
                alert(`Step 5 complete! Selection recorded. Step 6 info coming soon.`);
                return;
            }

            // Setup Step 6 UI dynamically
            document.getElementById('stepLabel6').innerText = `STEP 6 OF ${config.totalSteps}`;
            renderDashes(document.getElementById('progressBars6'), 6, config.totalSteps);
            document.getElementById('step6Question').innerText = config.q6;

            const pContainer = document.getElementById('step6PillContainer');
            pContainer.innerHTML = '';
            config.p6.forEach((val, idx) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'c-pill';
                btn.innerText = val;
                btn.addEventListener('click', () => {
                    pContainer.querySelectorAll('.c-pill').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    wizardData.scores.step6 = config.pts6[idx] || 0;
                    updateTotalScore();

                    // Branching for UK
                    if (wizardData.country === 'UK') {
                        if (val === 'YES') {
                            config.totalSteps = 8;
                        } else {
                            config.totalSteps = 6;
                        }
                        document.getElementById('stepLabel6').innerText = `STEP 6 OF ${config.totalSteps}`;
                        renderDashes(document.getElementById('progressBars6'), 6, config.totalSteps);
                    }

                    if (wizardNextBtn6) wizardNextBtn6.disabled = false;
                });
                pContainer.appendChild(btn);
            });

            // Show Step 6
            document.getElementById('wizard-step-5').style.display = 'none';
            document.getElementById('wizard-step-6').style.display = 'block';
        });
    }

    // Step 6 Back
    if (wizardBackBtn6) {
        wizardBackBtn6.addEventListener('click', () => {
            document.getElementById('wizard-step-6').style.display = 'none';
            document.getElementById('wizard-step-5').style.display = 'block';
        });
    }

    // Step 6 -> Next / Lead Form transition
    if (wizardNextBtn6) {
        wizardNextBtn6.addEventListener('click', () => {
            const config = countryConfig[wizardData.country];

            // If UK and selected NO, go to Lead Form
            if (wizardData.country === 'UK' && config.totalSteps === 6) {
                document.getElementById('wizard-step-6').style.display = 'none';
                showLeadForm();
                return;
            }

            // Otherwise, check for Step 7 content or alert
            if (!config || !config.q7) {
                alert(`Step 6 complete! Selection recorded. Next steps coming soon.`);
                return;
            }

            // Setup Step 7 UI
            document.getElementById('stepLabel7').innerText = `STEP 7 OF ${config.totalSteps}`;
            renderDashes(document.getElementById('progressBars7'), 7, config.totalSteps);
            document.getElementById('step7Question').innerText = config.q7;

            const pContainer = document.getElementById('step7PillContainer');
            pContainer.innerHTML = '';
            config.p7.forEach((val, idx) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'c-pill';
                btn.innerText = val;
                btn.addEventListener('click', () => {
                    pContainer.querySelectorAll('.c-pill').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    wizardData.scores.step7 = config.pts7[idx] || 0;
                    updateTotalScore();
                    if (wizardNextBtn7) wizardNextBtn7.disabled = false;
                });
                pContainer.appendChild(btn);
            });

            document.getElementById('wizard-step-6').style.display = 'none';
            document.getElementById('wizard-step-7').style.display = 'block';
        });
    }

    // Step 7 -> Step 8
    if (wizardNextBtn7) {
        wizardNextBtn7.addEventListener('click', () => {
            const config = countryConfig[wizardData.country];
            if (!config || !config.q8) {
                alert(`Step 7 complete! Next steps coming soon.`);
                return;
            }

            // Setup Step 8 UI
            document.getElementById('stepLabel8').innerText = `STEP 8 OF ${config.totalSteps}`;
            renderDashes(document.getElementById('progressBars8'), 8, config.totalSteps);
            document.getElementById('step8Question').innerText = config.q8;

            const pContainer = document.getElementById('step8PillContainer');
            pContainer.innerHTML = '';
            config.p8.forEach((val, idx) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'c-pill';
                btn.innerText = val;
                btn.addEventListener('click', () => {
                    pContainer.querySelectorAll('.c-pill').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    wizardData.scores.step8 = config.pts8[idx] || 0;
                    updateTotalScore();
                    if (wizardNextBtn8) wizardNextBtn8.disabled = false;
                });
                pContainer.appendChild(btn);
            });

            document.getElementById('wizard-step-7').style.display = 'none';
            document.getElementById('wizard-step-8').style.display = 'block';
        });
    }

    // Step 8 -> Lead Form
    if (wizardNextBtn8) {
        wizardNextBtn8.addEventListener('click', () => {
            document.getElementById('wizard-step-8').style.display = 'none';
            showLeadForm();
        });
    }

    // Lead Form Helper
    const showLeadForm = () => {
        const leadStep = document.getElementById('wizard-lead-form');
        const rightCol = document.querySelector('.wizard-right-col');
        if (leadStep) leadStep.style.display = 'block';
        if (rightCol) rightCol.style.display = 'block'; // Ensure score box stays visible

        // Update map based on country (optional visual polish)
        const mapImg = document.getElementById('leadFormMap');
        if (mapImg) {
            const mapPaths = {
                'UK': './flags/uk_map.png',
                'Canada': './flags/canada_map.png',
                'Germany': './flags/germany_map.png'
            };
            if (mapPaths[wizardData.country]) {
                mapImg.src = mapPaths[wizardData.country];
            }
        }
    };

    // Placeholders for Step 7 and 8 Back buttons
    if (wizardBackBtn7) {
        wizardBackBtn7.addEventListener('click', () => {
            document.getElementById('wizard-step-7').style.display = 'none';
            document.getElementById('wizard-step-6').style.display = 'block';
        });
    }
    if (wizardBackBtn8) {
        wizardBackBtn8.addEventListener('click', () => {
            document.getElementById('wizard-step-8').style.display = 'none';
            document.getElementById('wizard-step-7').style.display = 'block';
        });
    }

    // Wizard: FAQ Accordion (Global handler for all instances)
    const faqContainers = document.querySelectorAll('.faq-accordion');
    faqContainers.forEach(container => {
        container.addEventListener('click', function (e) {
            const questionBox = e.target.closest('.faq-question');
            if (!questionBox) return;

            const item = questionBox.closest('.faq-item');
            const icon = questionBox.querySelector('.toggle-icon');
            const wasActive = item.classList.contains('active');

            // Close all items in THIS container only
            container.querySelectorAll('.faq-item').forEach(el => {
                el.classList.remove('active');
                const i = el.querySelector('.toggle-icon');
                if (i) i.innerText = '+';
            });

            // If it wasn't active, open it
            if (!wasActive) {
                item.classList.add('active');
                if (icon) icon.innerText = '—';
            }
        });
    });

    // Result Step Logic
    const btnDoQualify = document.querySelector('.btn-do-qualify');
    const quickLoginOverlay = document.getElementById('quickLoginOverlay');
    const closeQuickLogin = document.getElementById('closeQuickLogin');
    const triggerRealLogin = document.getElementById('triggerRealLogin');

    if (btnDoQualify) {
        btnDoQualify.addEventListener('click', async () => {
            if (!currentUser) {
                if (quickLoginOverlay) quickLoginOverlay.style.display = 'flex';
                return;
            }

            // Save Wizard Data to Firestore (Lead submission)
            const wizardLeadEl = document.getElementById('wizard-lead-form');
            if (wizardLeadEl) {
                const leadData = {
                    firstName: wizardLeadEl.querySelector('input[placeholder="First Name"]').value,
                    lastName: wizardLeadEl.querySelector('input[placeholder="Last Name*"]').value,
                    email: wizardLeadEl.querySelector('input[placeholder="E-mail*"]').value,
                    phone: wizardLeadEl.querySelector('input[placeholder="Phone Number*"]').value,
                    countryCode: wizardLeadEl.querySelector('.country-code-select').value,
                    assessmentScore: parseInt(document.getElementById('currentScoreValue').innerText),
                    targetCountry: wizardData.country,
                    type: 'wizard_lead',
                    timestamp: serverTimestamp()
                };

                addDoc(collection(db, "wizard_leads"), leadData).catch(err => console.error("Lead saving failed:", err));
            }

            // If logged in, show results
            const resultStep = document.getElementById('wizard-result-step');
            const finalScore = parseInt(document.getElementById('currentScoreValue').innerText);
            const country = wizardData.country;

            // UK Threshold is 70 for skilled worker (image shows 65, but our content says 70)
            const threshold = country === 'UK' ? 70 : 65;

            // Update UI elements
            document.getElementById('finalResultScore').innerText = finalScore;
            document.getElementById('targetCountryRes').innerText = `Migrate to ${country}`;
            document.getElementById('thresholdText').innerText = `Qualification Threshold: ${threshold}`;

            const statusTitle = document.getElementById('resultStatus');
            const subStatus = document.getElementById('resultSubStatus');
            const detailedMsg = document.getElementById('resultDetailedMsg');

            if (finalScore >= threshold) {
                statusTitle.innerText = "Outcome: Qualified";
                statusTitle.style.color = "#2e7d32";
                subStatus.innerText = "Congratulations! Your profile meets the primary eligibility standards.";
                detailedMsg.innerHTML = `We are pleased to inform you that your profile has reached the required point threshold for the <strong>${country} Immigration</strong> program.`;
            } else {
                statusTitle.innerText = "Outcome: Unsuccessful";
                statusTitle.style.color = "#111"; // Back to black/dark for Failed
                subStatus.innerText = "Your profile currently doesn't meet the primary migration criteria";
                detailedMsg.innerHTML = `We regret to inform you that your profile has not reached the required point threshold for the <strong>${country} Immigration</strong> program.`;
            }

            // Toggle views
            if (wizardLeadEl) wizardLeadEl.style.display = 'none';
            const rightCol = document.querySelector('.wizard-right-col');
            if (rightCol) rightCol.style.display = 'none';

            if (resultStep) {
                resultStep.style.display = 'block';
                // Scroll to top of section
                document.getElementById('free-check-view').scrollIntoView({ behavior: 'smooth' });
            }

            // Start Countdown
            let count = 6;
            const timerEl = document.getElementById('redirectCountdown');
            const interval = setInterval(() => {
                count--;
                if (timerEl) timerEl.innerText = `${count}s`;
                if (count <= 0) {
                    clearInterval(interval);
                    // In real app, redirect here
                }
            }, 1000);
        });
    }

    if (closeQuickLogin) {
        closeQuickLogin.addEventListener('click', () => {
            if (quickLoginOverlay) quickLoginOverlay.style.display = 'none';
        });
    }

    if (triggerRealLogin) {
        triggerRealLogin.addEventListener('click', () => {
            if (loginModal) {
                loginModal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        });
    }

    // Edit Purpose Modal Logic
    const editPurposeModal = document.getElementById('editPurposeModal');
    const triggerEditPurpose = document.getElementById('triggerEditPurpose');
    const closePurposeModal = document.getElementById('closePurposeModal');
    const savePurposeBtn = document.getElementById('savePurposeBtn');
    const purposeCards = document.querySelectorAll('.purpose-card');
    const countrySelectBtns = document.querySelectorAll('.country-select-btn');

    if (triggerEditPurpose && editPurposeModal) {
        triggerEditPurpose.addEventListener('click', () => {
            editPurposeModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        });

        if (closePurposeModal) {
            closePurposeModal.addEventListener('click', () => {
                editPurposeModal.classList.remove('active');
                document.body.style.overflow = 'auto';
            });
        }

        // Purpose Selection
        purposeCards.forEach(card => {
            card.addEventListener('click', () => {
                purposeCards.forEach(c => c.classList.remove('active'));
                card.classList.add('active');
            });
        });

        // Country Selection
        countrySelectBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                countrySelectBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Save Logic
        if (savePurposeBtn) {
            savePurposeBtn.addEventListener('click', async () => {
                const activePurpose = document.querySelector('.purpose-card.active')?.getAttribute('data-purpose') || 'Migrate';
                const activeCountry = document.querySelector('.country-select-btn.active')?.getAttribute('data-country') || 'Canada';

                if (currentUser) {
                    try {
                        const token = localStorage.getItem('token');
                        await api.request('/auth/meta', 'PUT', {
                            purpose: activePurpose,
                            targetCountry: activeCountry
                        }, token);

                        // Update UI (simple refresh logic for demo)
                        alert(`Purpose updated to ${activePurpose} for ${activeCountry}!`);

                        editPurposeModal.classList.remove('active');
                        document.body.style.overflow = 'auto';
                        checkAuthStatus(); // Refresh UI to show new purpose/country if displayed
                    } catch (e) {
                        console.error("Save purpose error:", e);
                        alert("Failed to save changes: " + e.message);
                    }
                } else {
                    editPurposeModal.classList.remove('active');
                    document.body.style.overflow = 'auto';
                }
            });
        }
    }

    // Job Site Search Logic
    const jobSearchForm = document.getElementById('jobSearchForm');
    const jobResults = document.getElementById('jobResults');
    const jobLoading = document.getElementById('jobLoading');
    const triggerJobSearch = document.getElementById('triggerJobSearch');
    const jobInitialActions = document.getElementById('jobInitialActions');
    const jobSearchActions = document.getElementById('jobSearchActions');
    const jobResultsContainer = document.getElementById('jobResultsContainer');

    if (triggerJobSearch) {
        triggerJobSearch.addEventListener('click', () => {
            if (jobInitialActions) jobInitialActions.style.display = 'none';
            if (jobSearchActions) jobSearchActions.style.display = 'block';
        });
    }

    if (jobSearchForm) {
        jobSearchForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const keywords = document.getElementById('jobKeywords').value;
            const location = document.getElementById('jobLocation').value;

            if (!keywords || !location) {
                alert('Please enter both keywords and location.');
                return;
            }

            if (jobResultsContainer) jobResultsContainer.style.display = 'block';
            jobResults.innerHTML = '';
            jobLoading.style.display = 'block';

            // Scroll to results
            jobResultsContainer.scrollIntoView({ behavior: 'smooth' });

            try {
                const response = await api.request('/jobs/search', 'POST', { keywords, location });
                jobLoading.style.display = 'none';

                if (response.jobs && response.jobs.length > 0) {
                    response.jobs.forEach(job => {
                        const jobCard = createJobCard(job);
                        jobResults.appendChild(jobCard);
                    });
                } else {
                    jobResults.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #666; padding: 40px;">No jobs found. Try different keywords or location.</p>';
                }
            } catch (err) {
                jobLoading.style.display = 'none';
                console.error("Job search failed:", err);
                alert("Failed to fetch jobs. Please try again later.");
            }
        });
    }

    function createJobCard(job) {
        const div = document.createElement('div');
        div.className = 'job-card';
        div.style.cssText = `
            background: #fff;
            padding: 30px;
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.03);
            border: 1px solid #f0f0f0;
            display: flex;
            flex-direction: column;
            gap: 15px;
            transition: transform 0.3s;
            position: relative;
        `;

        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <h3 style="font-weight: 800; color: #111; margin-bottom: 5px; font-size: 1.2rem;">${job.title}</h3>
                    <p style="color: #ea4335; font-weight: 700; font-size: 0.9rem;"><i class="fas fa-map-marker-alt"></i> ${job.location}</p>
                </div>
                <div style="background: rgba(46, 125, 50, 0.1); color: #2e7d32; padding: 5px 12px; border-radius: 50px; font-size: 0.8rem; font-weight: 700;">
                    ${job.type || 'Full Time'}
                </div>
            </div>
            <p style="color: #666; font-size: 0.95rem; line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; margin: 10px 0;">
                ${job.snippet.replace(/<[^>]*>?/gm, '')}
            </p>
            <div style="margin-top: auto; padding-top: 15px; border-top: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 700; color: #111; font-size: 1.1rem;">${job.salary || 'Competitive'}</span>
                <div style="display: flex; gap: 10px;">
                <button class="btn-job-details-view" data-job-id="${job.id}" style="background: #fff; border: 1px solid #ddd; color: #444; padding: 10px 20px; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 0.9rem; transition: background 0.3s;">View Details</button>
                <button class="btn-apply-job" data-job-id="${job.id}" style="background: #ea4335; color: #fff; border: none; padding: 10px 25px; border-radius: 8px; font-weight: 700; cursor: pointer; transition: all 0.3s; font-size: 0.9rem;">Apply Now</button>
            </div>
        </div>
    `;

        div.onmouseover = () => div.style.transform = 'translateY(-10px)';
        div.onmouseout = () => div.style.transform = 'translateY(0)';

        const viewDetailsBtn = div.querySelector('.btn-job-details-view');
        viewDetailsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openJobDetailsModal(job);
        });

        const applyBtn = div.querySelector('.btn-apply-job');
        applyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleJobApply(job);
        });

        return div;
    }

    async function handleJobApply(job) {
        if (!currentUser) {
            alert('Please sign in to apply for jobs and share your credentials with recruiters.');
            window.openModal();
            return;
        }

        const applyBtn = document.querySelector(`.btn-apply-job[data-job-id="${job.id}"]`);
        if (!applyBtn) return;

        const originalText = applyBtn.innerText;
        applyBtn.innerText = 'Sending Application...';
        applyBtn.disabled = true;
        applyBtn.style.opacity = '0.7';

        try {
            const token = localStorage.getItem('token');
            await api.request('/jobs/apply', 'POST', {
                jobId: job.id,
                jobTitle: job.title,
                company: job.company || 'Global Partner',
                location: job.location
            }, token);

            // Simulation feedback
            setTimeout(() => {
                applyBtn.innerText = 'Applied Successfully';
                applyBtn.style.background = '#2e7d32';
                applyBtn.style.opacity = '1';
                alert(`SUCCESS: Your GES profile (Name: ${currentUser.first_name}, Email: ${currentUser.email}) and resume have been shared with ${job.company || 'the recruiter'}. We are now redirecting you to the official application page.`);

                // Open Jooble link in new tab to finish application
                window.open(job.link, '_blank');
            }, 1000);
        } catch (err) {
            applyBtn.innerText = 'Apply Now';
            applyBtn.disabled = false;
            applyBtn.style.opacity = '1';
            console.error("Application failed:", err);
            alert("Application failed: " + err.message);
        }
    }

    // Character count for additional info areas
    const setupCharCount = (inputId, displayId) => {
        const input = document.getElementById(inputId);
        const display = document.getElementById(displayId);
        if (input && display) {
            input.addEventListener('input', () => {
                display.innerText = `${input.value.length}/80`;
            });
        }
    };
    setupCharCount('edu_additional', 'eduAddCharCount');
    setupCharCount('work_additional', 'workAddCharCount');

    // Job: Toggle End Date based on 'Currently Working'
    const workIsCurrent = document.getElementById('work_is_current');
    const workEndContainer = document.getElementById('workEndContainer');
    if (workIsCurrent && workEndContainer) {
        workIsCurrent.addEventListener('change', () => {
            workEndContainer.style.display = workIsCurrent.checked ? 'none' : 'block';
        });
    }

    // Skills: Click Suggested Skills
    const suggestedSkills = document.querySelectorAll('.skill-tag.suggested');
    const skillInput = document.getElementById('skill_name_input');
    suggestedSkills.forEach(tag => {
        tag.addEventListener('click', () => {
            if (skillInput) {
                const skillName = tag.innerText.trim();
                skillInput.value = skillName;
                // Optionally auto-save or just fill
            }
        });
    });

    // Dynamic Save Button States (Opacity/Color adjustment)
    const initModalSaveStates = () => {
        const profileModals = ['modalEducation', 'modalWork', 'modalSkills', 'modalTests', 'modalLanguages', 'modalVisa', 'modalIdentity'];

        profileModals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (!modal) return;

            const saveBtn = modal.querySelector('.modal-btn-save');
            if (!saveBtn) return;

            const inputs = modal.querySelectorAll('input, select, textarea');
            const updateState = () => {
                let hasValue = false;
                inputs.forEach(input => {
                    if (input.type === 'checkbox' || input.type === 'radio') {
                        if (input.checked) hasValue = true;
                    } else if (input.value.trim() !== '') {
                        hasValue = true;
                    }
                });

                if (hasValue) {
                    saveBtn.classList.add('active');
                } else {
                    saveBtn.classList.remove('active');
                }
            };

            inputs.forEach(input => {
                input.addEventListener('input', updateState);
                input.addEventListener('change', updateState);
            });

            // Also call it when modal might be prefilled
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.attributeName === 'class' && modal.classList.contains('active')) {
                        updateState();
                    }
                });
            });
            observer.observe(modal, { attributes: true });
        });
    };
    initModalSaveStates();

    // Global modal control functions
    window.openJobDetailsModal = async function (job) {
        const modal = document.getElementById('jobDetailsModal');
        const content = document.getElementById('jobDetailsContent');
        const applyBtn = document.getElementById('modalApplyBtn');

        if (!modal || !content) return;

        modal.style.display = 'flex';
        content.innerHTML = `
            <div style="text-align: left;">
                <div style="margin-bottom: 25px;">
                    <h2 style="font-size: 1.8rem; font-weight: 800; color: #111; margin-bottom: 10px;">${job.title}</h2>
                    <div style="display: flex; gap: 20px; align-items: center;">
                        <span style="color: #ea4335; font-weight: 700;"><i class="fas fa-map-marker-alt"></i> ${job.location}</span>
                        <span style="color: #666; font-weight: 600;"><i class="fas fa-building"></i> ${job.company || 'Global Partner'}</span>
                        <span style="background: rgba(46, 125, 50, 0.1); color: #2e7d32; padding: 4px 12px; border-radius: 50px; font-size: 0.8rem; font-weight: 700;">${job.type || 'Full Time'}</span>
                    </div>
                </div>
                
                <div style="margin-bottom: 30px;">
                    <h4 style="font-weight: 700; color: #333; margin-bottom: 15px; font-size: 1.1rem; border-left: 4px solid #ea4335; padding-left: 10px;">Job Description</h4>
                    <div style="color: #444; line-height: 1.8; font-size: 1rem;">
                        ${job.snippet}
                    </div>
                    <p style="margin-top: 20px; font-style: italic; color: #888; font-size: 0.85rem;">
                        * The snippet above provides a summary of the role. For the full official listing, you can visit the partner site after applying.
                    </p>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; border-top: 1px solid #eee; padding-top: 25px;">
                    <div>
                        <h5 style="color: #888; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 1px; margin-bottom: 5px;">Salary Range</h5>
                        <p style="font-weight: 700; color: #111; font-size: 1.1rem;">${job.salary || 'Competitive / Not Disclosed'}</p>
                    </div>
                    <div>
                        <h5 style="color: #888; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 1px; margin-bottom: 5px;">Posted On</h5>
                        <p style="font-weight: 700; color: #111; font-size: 1.1rem;">${new Date(job.updated).toLocaleDateString() || 'Recently'}</p>
                    </div>
                </div>
            </div>
        `;

        // Update Apply button in modal
        applyBtn.onclick = () => {
            closeJobDetailsModal();
            handleJobApply(job);
        };
    }

    window.closeJobDetailsModal = function () {
        const modal = document.getElementById('jobDetailsModal');
        if (modal) modal.style.display = 'none';
    }

    checkAuthStatus();
});

