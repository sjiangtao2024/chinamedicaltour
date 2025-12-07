/**
 * China Medical Tour - Packages Data & Rendering
 * Handles the generation of modal content for Elite, Platinum, and VIP packages.
 */

const packagesData = {
    elite: {
        id: 'elite-modal',
        title: 'Elite Medical Checkup Package',
        subtitle: null,
        sections: [
            {
                title: 'General Checkup',
                items: [
                    'Height, Weight, Blood Pressure, BMI',
                    'Internal Medicine, Surgery, Ophthalmology, ENT'
                ]
            },
            {
                title: 'Laboratory Tests',
                items: [
                    'Complete Blood Count (CBC), Urinalysis',
                    'Liver Function (ALT, AST)',
                    'Kidney Function (BUN, Cr)',
                    'Lipid Panel (TC, TG, HDL, LDL)',
                    'Fasting Blood Glucose (GLU)'
                ]
            },
            {
                title: 'Instrumental Exams',
                items: [
                    'Resting ECG',
                    'Abdominal Ultrasound (Liver, Gallbladder, Pancreas, Spleen, Kidney)',
                    'Chest X-Ray (AP View)'
                ]
            }
        ]
    },
    platinum: {
        id: 'platinum-modal',
        title: 'Platinum Deep Checkup Package',
        subtitle: 'Includes all Elite items, plus:',
        sections: [
            {
                title: 'Advanced Lab Tests',
                items: [
                    'Full Liver Function Panel',
                    'Full Kidney Function Panel',
                    'Thyroid Function (T3, T4, TSH)',
                    'Rheumatism Panel (RF, ASO, CRP)',
                    'Homocysteine (Hcy)'
                ]
            },
            {
                title: 'Tumor Marker Screening',
                items: [
                    'CEA (Broad spectrum)',
                    'AFP (Liver)',
                    'CA19-9 (Digestive)',
                    'CA125 (Female) / PSA (Male)'
                ]
            },
            {
                title: 'Advanced Imaging',
                items: [
                    'Carotid Artery Ultrasound',
                    'Thyroid Ultrasound',
                    'Urinary System Ultrasound'
                ]
            },
            {
                title: 'Specialized Tests',
                items: [
                    'C13/C14 Urea Breath Test (H. Pylori)',
                    'Bone Density Scan'
                ]
            }
        ]
    },
    vip: {
        id: 'vip-modal',
        title: 'VIP Comprehensive Package',
        subtitle: 'Includes all Platinum items, plus:',
        sections: [
            {
                title: 'Premium Imaging',
                items: [
                    'Brain MRI (Cerebrovascular & Tumor)',
                    'Low-Dose Chest CT (Early Lung Cancer)',
                    'Coronary Artery Calcium Score'
                ]
            },
            {
                title: 'Endoscopy',
                items: [
                    'Painless Gastroscopy',
                    'Painless Colonoscopy'
                ]
            },
            {
                title: 'Cardiovascular Assessment',
                items: [
                    'Echocardiography (Heart Ultrasound)',
                    '24h Holter Monitor (if indicated)'
                ]
            },
            {
                title: 'Comprehensive Lab Panel',
                items: [
                    'Full Tumor Marker Panel',
                    'Endocrine Hormone Panel'
                ]
            }
        ]
    }
};

/**
 * Generates the HTML for a single package modal
 */
function createModalHTML(packageKey) {
    const pkg = packagesData[packageKey];
    if (!pkg) return '';

    const subtitleHTML = pkg.subtitle
        ? `<p class="font-semibold text-blue-600 mb-4">${pkg.subtitle}</p>`
        : '';

    const sectionsHTML = pkg.sections.map(section => `
        <div>
            <h4 class="font-semibold text-gray-700 mt-2 border-b pb-1">${section.title}</h4>
            <ul class="list-disc list-inside mt-2 space-y-1 text-sm">
                ${section.items.map(item => `<li>${item}</li>`).join('')}
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

    const html = Object.keys(packagesData)
        .map(key => createModalHTML(key))
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
    // Open buttons are already in the main HTML, but we need to ensure they work with these new modals.
    // main.js usually handles this, but since we just injected new DOM elements,
    // we might need to re-bind the 'modal-close' and 'overlay' click events.

    // Note: main.js binds to document.querySelectorAll('.modal-close, .modal-overlay') on DOMContentLoaded.
    // Since this runs after, we need to bind events to these new elements.

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
