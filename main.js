import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail, updateProfile, updatePassword, updateEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import firebaseConfig from "./firebase-config.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);
const googleProvider = new GoogleAuthProvider();

document.addEventListener('DOMContentLoaded', () => {
    let currentUser = null;
    // Authenticated View Elements
    const authLinks = document.getElementById('authLinks');
    const userProfileNav = document.getElementById('userProfileNav');
    const navUserName = document.getElementById('navUserName');
    const userAvatar = document.getElementById('userAvatar');
    const profileDropdown = document.getElementById('profileDropdown');
    const pdAvatarInitials = document.getElementById('pdAvatarInitials');
    const pdFullName = document.getElementById('pdFullName');
    const pdLogout = document.getElementById('pdLogout');

    // Monitor Auth State
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            console.log("User is logged in:", user.email);

            // Toggle Visibility
            if (authLinks) authLinks.style.display = 'none';
            if (userProfileNav) userProfileNav.style.display = 'flex';

            // Set Name
            const displayName = user.displayName || user.email.split('@')[0];
            if (navUserName) navUserName.innerText = `Hi, ${displayName}`;
            if (pdFullName) pdFullName.innerText = displayName;

            // Set Initials
            const initials = displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            if (userAvatar) userAvatar.innerText = initials;
            if (pdAvatarInitials) pdAvatarInitials.innerText = initials;

            // Populate Profile View
            const sideAvatar = document.getElementById('sideAvatar');
            const sideName = document.getElementById('sideName');
            const profileFullName = document.getElementById('profileFullName');
            const profilePhone = document.getElementById('profilePhone');

            if (sideAvatar) sideAvatar.innerText = initials;
            if (sideName) sideName.innerText = displayName;
            if (profileFullName) profileFullName.innerText = displayName;
            if (profilePhone && user.phoneNumber) profilePhone.innerText = user.phoneNumber;
            else if (profilePhone) profilePhone.innerText = 'Not provided';

            // Populate Dashboard View
            const dashAvatar = document.getElementById('dashAvatar');
            const dashName = document.getElementById('dashName');
            if (dashAvatar) dashAvatar.innerText = initials;
            if (dashName) dashName.innerText = displayName;

            // Populate Settings View
            const setEmails = document.querySelectorAll('.set-email');
            setEmails.forEach(el => el.innerText = user.email);

            const setNames = document.querySelectorAll('.set-first-name');
            setNames.forEach(el => el.innerText = displayName.split(' ')[0]);

            const setLastNames = document.querySelectorAll('.set-last-name');
            setLastNames.forEach(el => el.innerText = displayName.split(' ').slice(1).join(' ') || '--');

            const setPhones = document.querySelectorAll('.set-phone');
            setPhones.forEach(el => el.innerText = user.phoneNumber || '+91 8179792568');

            // Set Profile Initials and Names globally in sidebars
            document.querySelectorAll('.set-avatar').forEach(el => el.innerText = initials);
            document.querySelectorAll('.set-name').forEach(el => el.innerText = displayName);

            // Fetch extra user data from Firestore
            const fetchExtraData = async () => {
                const userRef = doc(db, "users", user.uid);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    const data = userSnap.data();
                    if (data.phone) {
                        document.querySelectorAll('.set-phone').forEach(el => el.innerText = data.phone);
                    }
                    if (data.dob) {
                        if (document.getElementById('setDob')) document.getElementById('setDob').innerText = data.dob;
                        // Pre-fill modal DOB if it exists
                        const dobInput = document.querySelector('input[name="dob"]');
                        if (dobInput) dobInput.value = data.dob;
                    }
                }
            };
            fetchExtraData();

            // Update legacy login button text just in case it's used elsewhere
            const loginBtn = document.getElementById('loginBtn');
            if (loginBtn) loginBtn.innerText = 'Logout';
        } else {
            currentUser = null;

            // Toggle Visibility
            if (authLinks) authLinks.style.display = 'flex';
            if (userProfileNav) userProfileNav.style.display = 'none';
            if (profileDropdown) profileDropdown.classList.remove('active');

            const loginBtn = document.getElementById('loginBtn');
            if (loginBtn) loginBtn.innerText = 'Login';
        }
    });

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

        if (confirmLogout) {
            confirmLogout.addEventListener('click', () => {
                signOut(auth).then(() => {
                    closeLogout();
                    window.location.hash = 'home';
                });
            });
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

    // Auto Open Enquiry Modal (10s)
    // We store the timer ID to clear it if user manually opens a modal before 10s
    let autoModalTimer = null;

    if (enquiryModal) {
        autoModalTimer = setTimeout(() => {
            // Only open if user is NOT logged in and no modal is currently active
            if (!currentUser &&
                (!loginModal || !loginModal.classList.contains('active')) &&
                (!enquiryModal.classList.contains('active'))) {
                enquiryModal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        }, 10000); // 10 seconds
    }

    // Open Enquiry (Signup)
    if (signupBtn && enquiryModal) {
        signupBtn.addEventListener('click', (e) => {
            e.preventDefault();
            enquiryModal.classList.add('active');
            document.body.style.overflow = 'hidden';
            if (autoModalTimer) clearTimeout(autoModalTimer); // Cancel auto timer
        });
    }

    // Open Login / Handle Logout
    if (loginBtn && loginModal) {
        loginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentUser) {
                signOut(auth).then(() => {
                    alert('Logged out successfully');
                });
            } else {
                loginModal.classList.add('active');
                document.body.style.overflow = 'hidden';
                if (autoModalTimer) clearTimeout(autoModalTimer);
            }
        });
    }

    // Open Function
    window.openModal = () => {
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
                // 1. Update Firebase Auth Profile (DisplayName)
                const fullName = `${fn} ${ln}`;
                await updateProfile(currentUser, { displayName: fullName });

                // 2. Update Firestore 'users' collection for extra fields
                await setDoc(doc(db, "users", currentUser.uid), {
                    firstName: fn,
                    lastName: ln,
                    phone: phone,
                    dob: dob,
                    lastUpdated: serverTimestamp()
                }, { merge: true });

                // Update UI globally
                document.querySelectorAll('.set-first-name').forEach(el => el.innerText = fn);
                document.querySelectorAll('.set-last-name').forEach(el => el.innerText = ln);
                document.querySelectorAll('.set-phone').forEach(el => el.innerText = `+91 ${phone}`);
                if (pdFullName) pdFullName.innerText = fullName;
                if (navUserName) navUserName.innerText = `Hi, ${fn}`;
                if (document.getElementById('setDob')) document.getElementById('setDob').innerText = dob || '--';

                alert('Account settings updated and saved to Firebase!');
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
                if (newPass) {
                    await updatePassword(currentUser, newPass);
                    alert('Password updated successfully in Firebase!');
                }
                closeSettingsModal(editSecurityModal);
                editSecurityForm.reset();
            } catch (error) {
                console.error("Security update error:", error);
                alert("Security update failed: " + error.message + ". For security reasons, you may need to log out and log back in before changing your password.");
            }
        });
    }

    // Click Outside
    window.addEventListener('click', (e) => {
        if (e.target === enquiryModal || e.target === loginModal) {
            closeAllModals();
        }
    });

    // Form Submits
    if (enquiryForm) {
        enquiryForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const fn = enquiryForm.querySelector('input[placeholder="First Name"]').value;
            const ln = enquiryForm.querySelector('input[placeholder="Last Name"]').value;
            const email = enquiryForm.querySelector('input[placeholder="Email Address"]').value;
            const phone = enquiryForm.querySelector('input[placeholder="Mobile Number"]').value;
            const password = enquiryForm.querySelector('input[placeholder="Create Password"]').value;
            const countryCode = enquiryForm.querySelector('.country-code')?.value || '+91';

            try {
                // 1. Create User in Firebase Auth
                const result = await createUserWithEmailAndPassword(auth, email, password);
                const user = result.user;

                // 2. Update Display Name
                const fullName = `${fn} ${ln}`;
                await updateProfile(user, { displayName: fullName });

                // 3. Save extra data to Firestore 'users' collection
                await setDoc(doc(db, "users", user.uid), {
                    firstName: fn,
                    lastName: ln,
                    email: email,
                    phone: phone,
                    countryCode: countryCode,
                    createdAt: serverTimestamp(),
                    lastLogin: serverTimestamp()
                });

                alert('Account created successfully! You are now logged in.');
                closeAllModals();

                // Redirect to home
                window.location.hash = 'home';

            } catch (error) {
                console.error("Signup Error: ", error);
                alert('Signup failed: ' + error.message);
            }
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = loginForm.querySelector('input[placeholder="Registered E-mail"]').value;
            const password = loginForm.querySelector('input[placeholder="Access Key"]').value;

            try {
                await signInWithEmailAndPassword(auth, email, password);
                alert('Logged in successfully!');
                closeAllModals();

                // Redirect to home
                window.location.hash = 'home';

                const quickOverlay = document.getElementById('quickLoginOverlay');
                if (quickOverlay) quickOverlay.style.display = 'none';
            } catch (error) {
                console.error("Login Error:", error.message);
                alert('Authentication Failed: ' + error.message);
            }
        });
    }

    // Forgot Password Logic
    const forgotPasswordLink = document.getElementById('forgotPassword');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = loginForm.querySelector('input[placeholder="Email Address"]').value;

            if (!email) {
                alert('Please enter your email address first.');
                return;
            }

            try {
                await sendPasswordResetEmail(auth, email);
                alert('A password reset link has been sent to your email. Please check your inbox (and spam folder).');
            } catch (error) {
                console.error("Password reset error:", error.message);
                alert('Failed to send reset email: ' + error.message);
            }
        });
    }

    // Google Login Handling
    const handleGoogleLogin = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            // Create user document if it doesn't exist
            const userRef = doc(db, "users", user.uid);
            await setDoc(userRef, {
                displayName: user.displayName,
                email: user.email,
                lastLogin: serverTimestamp()
            }, { merge: true });

            alert(`Welcome ${user.displayName}! Logged in successfully via Google.`);
            closeAllModals();
            const quickOverlay = document.getElementById('quickLoginOverlay');
            if (quickOverlay) quickOverlay.style.display = 'none';
        } catch (error) {
            console.error("Google Auth Error:", error.message);
            alert("Google Sign-In failed. Please try again.");
        }
    };

    const googleBtns = document.querySelectorAll('.social-btn.google');
    googleBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            handleGoogleLogin();
        });
    });

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
        if (!tabId) tabId = 'home';

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

        if (tabId === 'profile' || tabId === 'dashboard' || tabId === 'settings' || tabId === 'needs' || tabId === 'resume' || tabId === 'eligibility') {
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
    };

    // Tab Click Listener
    tabLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = link.getAttribute('data-tab');
            switchView(tabId);
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
                        await setDoc(doc(db, "users", currentUser.uid), {
                            purpose: activePurpose,
                            targetCountry: activeCountry,
                            lastUpdated: serverTimestamp()
                        }, { merge: true });

                        // Update UI (simple refresh logic for demo)
                        alert(`Purpose updated to ${activePurpose} for ${activeCountry}!`);

                        // Update the "I would like to" section text if we want to be fancy
                        // For now, let's just close
                        editPurposeModal.classList.remove('active');
                        document.body.style.overflow = 'auto';
                    } catch (e) {
                        console.error("Save purpose error:", e);
                        alert("Failed to save changes.");
                    }
                } else {
                    editPurposeModal.classList.remove('active');
                    document.body.style.overflow = 'auto';
                }
            });
        }
    }
});

