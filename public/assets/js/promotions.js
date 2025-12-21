/**
 * PROMOTION MANAGER (Marketing Feature Flags)
 * 
 * This file controls which marketing modules are active on the website.
 * Set features to 'true' to enable them, 'false' to disable.
 */

const PROMOTIONS = {
    // 1. HERO SECTIONS (Only enable one at a time ideally, or CSS will handle priority)
    'christmas_hero': true,      // Replaces the standard hero with Christmas theme
    
    // 2. CONTENT SECTIONS (Can be enabled in parallel)
    'executive_pass': true,      // The ~$5,000 executive package section
    'new_year_countdown': false, // (Example) Future module
    'chat_discount_popup': false // (Example) Future module
};

/**
 * LOGIC: Apply classes to the body tag based on config.
 * DO NOT EDIT BELOW THIS LINE unless you are a developer.
 */
(function applyPromotions() {
    const body = document.body || document.documentElement;
    
    // 1. Apply feature classes
    for (const [feature, isActive] of Object.entries(PROMOTIONS)) {
        if (isActive) {
            document.documentElement.classList.add(`enable-${feature}`);
            console.log(`[Promo] Enabled: ${feature}`);
        }
    }

    // 2. Conflict Resolution: If ANY specific promo hero is active, hide the standard hero
    if (PROMOTIONS['christmas_hero'] || PROMOTIONS['new_year_hero']) {
        document.documentElement.classList.add('hide-standard-hero');
    }

})();
