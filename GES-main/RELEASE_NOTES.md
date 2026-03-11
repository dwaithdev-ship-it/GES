# Release Notes - GES Human Resources Consultancy Web Portal

**Version:** 1.0.0-alpha
**Date:** January 29, 2026
**Status:** In Development (Frontend Prototype)

## 📌 Project Overview
This project is a high-fidelity web application. It serves as the digital frontend for **GES HUMAN RESOURCES CONSULTANCY**, offering services for Visas, Immigration, Work, and Study abroad.

The application is built as a **Single Page Interface** where the main navigation acts as a tab switcher, allowing users to toggle between different service views ("Migrate", "Work", "Study") without page reloads, providing a seamless, app-like experience.

---

## 🛠 Technology Stack
The project is built using vanilla web technologies to ensure maximum performance, control, and zero build-step complexity for this phase.

*   **Core**:
    *   **HTML5**: Semantic structure using `<header>`, `<main>`, `<section>`, and module-based views.
    *   **CSS3**: Custom styling with CSS Variables (`:root`), Flexbox/Grid layouts, and CSS Animations (Flip cards, Fade-ins). No external CSS frameworks (like Bootstrap) are used to maintain a unique, premium design identity.
    *   **JavaScript (ES6+)**: Handles DOM manipulation, event listeners, modal logic, and tab switching.

*   **External Dependencies (CDNs)**:
    *   **Font Awesome (Free v6.4.0)**: Used for all UI icons (phones, social media, arrows, checks).
        *   `<link href="cdnjs.cloudflare.com/ajax/libs/font-awesome/..." />`
    *   **Google Fonts**: Uses 'Outfit' font family for a modern, clean academic/professional look.
        *   Weights: 300, 400, 500, 600, 700, 800.
    *   **FlagCDN**: Provides high-quality SVG country flags for the "Popular Visa" section and utility bar.
        *   Example: `https://flagcdn.com/h240/ca.png` (Canada).

---

## 📂 Project Structure & File Architecture

### 1. `index.html` (The Skeleton)
The Single Point of Entry.
*   **Header**: Contains the Logo (Home trigger) and the `nav-tabs` matching the color-coded service strips.
*   **Utility Bar**: Top strip for quick contacts, Login/Signup triggers, and WhatsApp links.
*   **Main View (`#home-view`)**: The default active container housing the Hero, Popular Visa grid, and Marketing Bands.
*   **Tab Placeholders**: Empty `<div>` containers (`#migrate-view`, `#work-view`, etc.) ready to be populated with specific service content.
*   **Modals**: Hidden HTML structures for `#enquiryModal` and `#loginModal` located at the bottom of the body.

### 2. `style.css` (The Skin)
Handling the visual presentation.
*   **Colors System**: Defined in `:root` (e.g., `--y-red`, `--y-blue`, `--y-yellow`) for consistency.
*   **Tab Logic**: Specific classes (`.nav-item-check`, `.nav-item-migrate`) control the unique hover/active color fills for the navigation bar.
*   **Components**:
    *   `.visa-flip-card`: 3D transform animations for the country flags.
    *   `.hero-inner-card`: The main curved yellow background container.
    *   `.modal-overlay`: Backdrop blurring and centering logic for popups.

### 3. `main.js` (The Brain)
Handling user interaction and state.
*   **Tab Switching**: Listens for clicks on `.tab-link`, toggles the `.active` class on the corresponding View ID, and updates the header styling.
*   **Modal Management**:
    *   **Auto-Timer**: Triggers the "Get Started" enquiry modal automatically after 10 seconds *unless* the user is already interacting.
    *   **Manual Triggers**: Wired to "Signup" and "Login" buttons.
    *   **Mutual Exclusion**: Ensures only one modal is open at a time (e.g., clicking Login closes Enquiry).
*   **Scroll Animations**: Simple Intersection Observer-style logic (`reveal()`) to fade in elements as the user scrolls.

---

## 🚀 Key Features & Functionality

### 1. Dynamic Tabbed Navigation
*   **Behavior**: Clicking a menu item (e.g., "Free Eligibility Check") instantly swaps the main content area with the specific target view.
*   **Design**: Each tab has a unique associated brand color (Orange for Eligibility, Purple for Migrate, etc.). On hover/active, the tab fills with this color, and text turns white (or black for Yellow) for contrast.

### 2. Intelligent Modals
*   **Enquiry Modal**:
    *   Captures user intent early.
    *   Features a "Use as WhatsApp Number" toggle.
    *   Includes terms acceptance.
*   **Login Modal**:
    *   Dedicated for returning users.
    *   Fields: Email, Password, Remember Me.
    *   Social Login Placeholders (LinkedIn, Google).

### 3. "Popular Visa" Flip Grid
*   **Interaction**: Hovering over a country flag card flips it 180 degrees to reveal a specific list of available visa types (e.g., PR, Student, Work) for that country.
*   **Alignment**: The info block text is perfectly aligned to stretch with the grid height for a balanced layout.

### 4. WhatsApp Integration (Frontend)
*   The UI includes specific "WhatsApp" labeled buttons and toggles.
*   *Note*: Currently, this is data collection only. Actual API integration (sending messages) is slated for backend development.

---

## ⚠️ Requirements & Compatibility
*   **Browser**: Requires a modern browser (Chrome, Edge, Firefox, Safari) that supports:
    *   CSS Grid & Flexbox
    *   CSS Variables
    *   ES6 JavaScript features (Arrow functions, `const`/`let`)
*   **Server**: Serving via a simple HTTP server (like Live Server) is recommended to ensure no CORS issues with local assets (images), though it works largely as a static file set.

---

## 📝 Maintenance & Updates
*   **Adding New Tabs**: Requires 3 steps:
    1.  Add `<li>` in `index.html` nav with unique `data-tab`.
    2.  Add corresponding `<div id="[tab]-view">` placeholder in `index.html`.
    3.  Add `.nav-item-[name]` color styles in `style.css`.
*   **Updating Images**: Ensure images are placed in the root or an `/assets` folder and referenced relatively.

---
*Last Updated: January 29, 2026*
