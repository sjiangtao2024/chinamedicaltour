/**
 * China Medical Tour - Packages Data & Rendering
 * Handles the generation of modal content for Elite, Platinum, and VIP packages.
 * Refactored to use translations.js for content.
 */

// Function to get packages data dynamically to ensure translations are loaded
function getPackagesData() {
    // Check if translations exist
    if (typeof translations === 'undefined' || !translations.en) {
        console.error('Translations not loaded');
        return {};
    }

    const t = translations.en;

    return {
        elite: {
            id: 'elite-modal',
            title: t.eliteModalTitle,
            subtitle: null,
            sections: [
                {
                    title: t.modalGeneral,
                    contentHTML: t.eliteModalGeneralItems
                },
                {
                    title: t.modalLab,
                    contentHTML: t.eliteModalLabItems
                },
                {
                    title: t.modalInstrument,
                    contentHTML: t.eliteModalInstrumentItems
                }
            ]
        },
        platinum: {
            id: 'platinum-modal',
            title: t.platinumModalTitle,
            subtitle: t.modalSubtitle,
            sections: [
                {
                    title: t.modalDeepLab,
                    contentHTML: t.platinumModalDeepLabItems
                },
                {
                    title: t.modalTumor,
                    contentHTML: t.platinumModalTumorItems
                },
                {
                    title: t.modalDeepImaging,
                    contentHTML: t.platinumModalDeepImagingItems
                },
                {
                    title: t.modalSpecial,
                    contentHTML: t.platinumModalSpecialItems
                }
            ]
        },
        vip: {
            id: 'vip-modal',
            title: t.vipModalTitle,
            subtitle: t.modalSubtitle,
            sections: [
                {
                    title: t.modalAdvancedImaging || 'Premium Imaging', // Fallback if key missing
                    contentHTML: t.vipModalImagingItems
                },
                {
                    title: t.modalDigestive || 'Endoscopy',
                    contentHTML: t.vipModalEndoscopyItems
                },
                {
                    title: t.modalCardio || 'Cardiovascular Assessment',
                    contentHTML: t.vipModalCardioItems
                },
                {
                    title: t.modalFullLab || 'Comprehensive Lab Panel',
                    contentHTML: t.vipModalLabItems
                }
            ]
        }
    };
}

/**
 * Generates the HTML for a single package modal
 */
function createModalHTML(packageKey, pkg) {
    if (!pkg) return '';

    const subtitleHTML = pkg.subtitle
        ? `<p class="font-semibold text-blue-600 mb-4">${pkg.subtitle}</p>`
        : '';

    const sectionsHTML = pkg.sections.map(section => `
        <div>
            <h4 class="font-semibold text-gray-700 mt-2 border-b pb-1">${section.title}</h4>
            <ul class="list-disc list-inside mt-2 space-y-1 text-sm">
                ${section.contentHTML}
            </ul>
        </div>
    `).join('');

    return `
    <div id="${pkg.id}" class="modal-overlay">
        <div class="modal-content max-w-4xl w-full mx-4">
            <h3 class="text-2xl font-bold mb-4 text-gray-800">${pkg.title}</h3>
            ${subtitleHTML}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 text-gray-600">
                ${sectionsHTML}
            </div>
            <i data-lucide="x" class="modal-close text-gray-500 hover:text-gray-800 absolute top-4 right-4 cursor-pointer w-6 h-6"></i>
        </div>
    </div>
    `;
}

/**
 * Renders all package modals into the DOM and initializes event listeners
 */
function renderPackages() {
    const container = document.getElementById('modals-container');
    if (!container) {
        console.error('Modals container not found!');
        return;
    }

    const packagesData = getPackagesData();
    const html = Object.keys(packagesData)
        .map(key => createModalHTML(key, packagesData[key]))
        .join('');

    container.innerHTML = html;

    // Initialize Lucide icons for the close buttons
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // Initialize Modal Logic
    initializeModals();
}

/**
 * Re-binds event listeners for the newly created modals
 */
function initializeModals() {
    const modals = document.querySelectorAll('.modal-overlay');
    const closeButtons = document.querySelectorAll('.modal-close');

    // Close on overlay click
    modals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });

    // Close on X button click
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal-overlay');
            if (modal) modal.classList.remove('active');
        });
    });
}

// Render when DOM is ready
document.addEventListener('DOMContentLoaded', renderPackages);