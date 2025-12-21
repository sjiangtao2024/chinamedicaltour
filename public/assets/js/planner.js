// Relies on plannerText, medicalPackagesData, attractionsData from planner-data.js

// Get city setting from URL parameters, default to Beijing
const urlParams = new URLSearchParams(window.location.search);
let currentCity = urlParams.get('city') || 'beijing';
let selectedAttractions = [];
let selectedMedicalPackage = null;

// Initialize the page
function init() {
    // Set correct city tab based on URL parameter
    document.querySelectorAll('.city-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.city === currentCity) {
            tab.classList.add('active');
        }
    });

    updateLanguage();
    updateMedicalPackagePrices();
    renderAttractions();
    updateAttractionCards(); // Ensure card states are correct
    updateMedicalPackageCards(); // Ensure medical package card states are correct
    updateSummary();
    setupEventListeners();
}

// Update medical package prices
function updateMedicalPackagePrices() {
    Object.keys(medicalPackagesData).forEach(packageId => {
        const packageData = medicalPackagesData[packageId];
        const priceElement = document.getElementById(`${packageId}-price`);
        if (priceElement) {
            priceElement.innerHTML = `<span class="text-sm font-normal text-gray-500 mr-1">from</span>$${packageData.price.usd}`;
        }
    });
}

// Render attractions based on current city
function renderAttractions() {
    const container = document.getElementById('attractions-container');
    const attractions = attractionsData[currentCity];

    container.innerHTML = attractions.map(attraction => {
        // Handle price display
        let priceDisplay;
        if (attraction.priceUSD === 0) {
            priceDisplay = 'Free';
        } else {
            priceDisplay = `$${attraction.priceUSD}`;
        }

        return `
        <div class="attraction-card bg-white rounded-xl p-6 shadow-lg" data-id="${attraction.id}">
            <img src="${attraction.image}" alt="${attraction.name}" class="attraction-image mb-4">
            <h3 class="text-xl font-bold mb-3">${attraction.name}</h3>
            <p class="text-gray-600 mb-4 text-sm">${attraction.description}</p>
            <div class="flex justify-between items-center text-sm text-gray-500 mb-4">
                <span><i data-lucide="clock" class="w-4 h-4 inline mr-1"></i>${attraction.duration} ${plannerText.hours}</span>
                <span>${priceDisplay}</span>
            </div>
            <div class="text-center">
                <button class="select-btn w-full py-2 px-4 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition">
                    ${plannerText.selectAttraction}
                </button>
            </div>
        </div>
        `;
    }).join('');

    // Re-initialize Lucide icons
    lucide.createIcons();
}

// Setup event listeners
function setupEventListeners() {
    // City tab switching
    document.querySelectorAll('.city-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.city-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentCity = tab.dataset.city;
            selectedAttractions = [];
            renderAttractions();
            updateSummary();
        });
    });

    // Medical package selection
    document.addEventListener('click', (e) => {
        const medicalButton = e.target.closest('.medical-select-btn');
        const medicalCard = e.target.closest('.medical-package-card');

        if (medicalCard) {
            e.preventDefault();
            e.stopPropagation();
            const packageId = medicalCard.dataset.package;
            toggleMedicalPackage(packageId);
        }
    });

    // Attraction selection - Event delegation
    document.addEventListener('click', (e) => {
        const button = e.target.closest('.select-btn');
        const card = e.target.closest('.attraction-card');

        if (button && card) {
            e.preventDefault();
            e.stopPropagation();
            const attractionId = card.dataset.id;
            toggleAttraction(attractionId);
        }
    });

    // Generate itinerary
    const generateBtn = document.getElementById('generate-itinerary');
    if (generateBtn) {
        generateBtn.addEventListener('click', generateItinerary);
    }
}

// Toggle medical package selection
function toggleMedicalPackage(packageId) {
    if (selectedMedicalPackage === packageId) {
        selectedMedicalPackage = null;
    } else {
        selectedMedicalPackage = packageId;
    }
    updateMedicalPackageCards();
    updateSummary();
}

// Update medical package card appearance
function updateMedicalPackageCards() {
    document.querySelectorAll('.medical-package-card').forEach(card => {
        const packageId = card.dataset.package;
        const isSelected = selectedMedicalPackage === packageId;

        if (isSelected) {
            card.classList.add('selected');
            card.querySelector('.medical-select-btn span').textContent = 'Selected ✓';
            card.querySelector('.medical-select-btn').classList.add('bg-green-600', 'text-white', 'border-green-600');
        } else {
            card.classList.remove('selected');
            card.querySelector('.medical-select-btn span').textContent = plannerText.selectPackage;
            card.querySelector('.medical-select-btn').classList.remove('bg-green-600', 'text-white', 'border-green-600');
        }
    });
}

// Toggle attraction selection
function toggleAttraction(attractionId) {
    const attraction = attractionsData[currentCity].find(a => a.id === attractionId);
    const index = selectedAttractions.findIndex(a => a.id === attractionId);

    if (index > -1) {
        selectedAttractions.splice(index, 1);
    } else {
        selectedAttractions.push(attraction);
    }

    updateAttractionCards();
    updateSummary();
}

// Update attraction card appearance
function updateAttractionCards() {
    document.querySelectorAll('.attraction-card').forEach(card => {
        const attractionId = card.dataset.id;
        const isSelected = selectedAttractions.some(a => a.id === attractionId);

        if (isSelected) {
            card.classList.add('selected');
            card.querySelector('.select-btn').textContent = 'Selected ✓';
            card.querySelector('.select-btn').classList.add('bg-blue-600', 'text-white');
        } else {
            card.classList.remove('selected');
            card.querySelector('.select-btn').textContent = plannerText.selectAttraction;
            card.querySelector('.select-btn').classList.remove('bg-blue-600', 'text-white');
        }
    });
}

// Convert hours to days
function convertHoursToDays(hours) {
    if (hours <= 3) return 0.5;
    if (hours <= 6) return 1;
    if (hours <= 9) return 1.5;
    if (hours <= 12) return 2;
    if (hours <= 15) return 2.5;
    if (hours <= 18) return 3;
    return Math.ceil(hours / 6) * 0.5;
}

// Update summary
function updateSummary() {
    // Calculate attraction totals
    const totalHours = selectedAttractions.reduce((sum, attraction) => sum + attraction.duration, 0);
    const totalDays = convertHoursToDays(totalHours);

    // Calculate attraction cost
    const attractionCost = selectedAttractions.reduce((sum, attraction) => sum + attraction.priceUSD, 0);

    // Calculate medical package totals
    let medicalCost = 0;
    let medicalDays = 0;

    if (selectedMedicalPackage) {
        const medicalPackage = medicalPackagesData[selectedMedicalPackage];
        medicalCost = medicalPackage.price.usd;
        medicalDays = medicalPackage.duration;
    }

    // Calculate total cost and time
    const totalCost = attractionCost + medicalCost;

    let totalMedicalTourismDays;
    if (selectedMedicalPackage && selectedAttractions.length > 0) {
        // 1 day Checkup + Tourism days (can be done during report wait time)
        totalMedicalTourismDays = medicalDays + totalDays;
    } else if (selectedMedicalPackage) {
        // Just checkup
        totalMedicalTourismDays = medicalDays;
    } else {
        // Just tourism
        totalMedicalTourismDays = totalDays;
    }

    const timeElement = document.getElementById('total-time');
    const costElement = document.getElementById('total-cost');

    if (timeElement && costElement) {
        if (selectedAttractions.length === 0 && !selectedMedicalPackage) {
            timeElement.textContent = 'No items selected';
            costElement.textContent = 'No cost';
        } else {
            timeElement.textContent = `${totalMedicalTourismDays} ${plannerText.days}`;
            costElement.textContent = `$${Math.round(totalCost)}`;
        }
    }

    // Update planning summary title
    let summaryItems = [];
    if (selectedMedicalPackage) {
        summaryItems.push(medicalPackagesData[selectedMedicalPackage].name);
    }
    if (selectedAttractions.length > 0) {
        summaryItems.push(...selectedAttractions.map(a => a.name));
    }

    if (summaryItems.length > 0) {
        document.querySelector('[data-key="planningTitle"]').textContent =
            `Planning Summary: ${summaryItems.join(', ')}`;
    } else {
        document.querySelector('[data-key="planningTitle"]').textContent =
            'Planning Summary: No items selected';
    }

    // Show/hide selected summary
    const summaryDiv = document.getElementById('selected-summary');
    if (selectedAttractions.length > 0 || selectedMedicalPackage) {
        summaryDiv.classList.remove('hidden');
        updateSelectedList();
    } else {
        summaryDiv.classList.add('hidden');
    }
}

// Update selected attractions list
function updateSelectedList() {
    const listContainer = document.getElementById('selected-list');
    let listHTML = '';

    // Add medical package if selected
    if (selectedMedicalPackage) {
        const medicalPackage = medicalPackagesData[selectedMedicalPackage];
        listHTML += `
            <div class="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                <div>
                    <h4 class="font-semibold text-green-800">${medicalPackage.name}</h4>
                    <p class="text-sm text-green-600">${medicalPackage.duration} ${plannerText.day} • $${medicalPackage.price.usd}</p>
                    <p class="text-xs text-green-500">${plannerText.reportWaitTime}</p>
                </div>
                <button class="text-red-500 hover:text-red-700" onclick="toggleMedicalPackage('${medicalPackage.id}')">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
        `;
    }

    // Add attractions
    listHTML += selectedAttractions.map(attraction => {
        let priceDisplay;
        if (attraction.priceUSD === 0) {
            priceDisplay = 'Free';
        } else {
            priceDisplay = `$${attraction.priceUSD}`;
        }

        return `
        <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <div>
                <h4 class="font-semibold">${attraction.name}</h4>
                <p class="text-sm text-gray-600">${attraction.duration} ${plannerText.hours} • ${priceDisplay}</p>
            </div>
            <button class="text-red-500 hover:text-red-700" onclick="toggleAttraction('${attraction.id}')">
                <i data-lucide="x" class="w-5 h-5"></i>
            </button>
        </div>
        `;
    }).join('');

    listContainer.innerHTML = listHTML;

    // Re-initialize Lucide icons
    lucide.createIcons();
}

// Update language for all elements (just populates static text from plannerText)
function updateLanguage() {
    document.querySelectorAll('[data-key]').forEach(element => {
        const key = element.dataset.key;
        if (plannerText[key]) {
            element.textContent = plannerText[key];
        }
    });
}

// Generate detailed itinerary
function generateItinerary() {
    if (selectedAttractions.length === 0 && !selectedMedicalPackage) {
        alert('Please select at least one item (medical package or attraction).');
        return;
    }

    // Calculate totals
    const totalHours = selectedAttractions.reduce((sum, attraction) => sum + attraction.duration, 0);
    const totalDays = convertHoursToDays(totalHours);
    const attractionCost = selectedAttractions.reduce((sum, attraction) => sum + attraction.priceUSD, 0);

    let medicalCost = 0;
    let medicalDays = 0;

    if (selectedMedicalPackage) {
        const medicalPackage = medicalPackagesData[selectedMedicalPackage];
        medicalCost = medicalPackage.price.usd;
        medicalDays = medicalPackage.duration;
    }

    const totalCost = attractionCost + medicalCost;

    let totalMedicalTourismDays;
    if (selectedMedicalPackage && selectedAttractions.length > 0) {
        totalMedicalTourismDays = medicalDays + totalDays;
    } else if (selectedMedicalPackage) {
        totalMedicalTourismDays = medicalDays;
    } else {
        totalMedicalTourismDays = totalDays;
    }

    let itinerary = `🎯 Your ${currentCity.charAt(0).toUpperCase() + currentCity.slice(1)} Medical Tourism Itinerary\n\n`;

    // Add medical package if selected
    if (selectedMedicalPackage) {
        const medicalPackage = medicalPackagesData[selectedMedicalPackage];
        itinerary += `🏥 Medical Package:\n`;
        itinerary += `   ${medicalPackage.name}\n`;
        itinerary += `   Check-up Duration: ${medicalPackage.duration} ${plannerText.day}\n`;
        itinerary += `   Price: $${medicalPackage.price.usd}\n`;
        itinerary += `   ${medicalPackage.description}\n`;
        itinerary += `   ${plannerText.reportWaitTime}\n\n`;
    }

    // Add attractions if selected
    if (selectedAttractions.length > 0) {
        itinerary += `🎭 Cultural Experiences:\n`;
        selectedAttractions.forEach((attraction, index) => {
            let priceDisplay;
            if (attraction.priceUSD === 0) {
                priceDisplay = 'Free';
            } else {
                priceDisplay = `$${attraction.priceUSD}`;
            }

            itinerary += `${index + 1}. ${attraction.name}\n`;
            itinerary += `   Duration: ${attraction.duration} ${plannerText.hours}\n`;
            itinerary += `   Price: ${priceDisplay}\n`;
            itinerary += `   ${attraction.description}\n\n`;
        });
    }

    itinerary += `📊 Summary:\n`;
    if (selectedMedicalPackage && selectedAttractions.length > 0) {
        itinerary += `${plannerText.totalMedicalTourismTime}: ${totalMedicalTourismDays} ${plannerText.days}\n`;
        itinerary += `   (Medical check-up: ${medicalDays} ${plannerText.day} + Tourism: ${totalDays} ${plannerText.days})\n`;
        itinerary += `${plannerText.totalMedicalTourismCost}: $${Math.round(totalCost)}\n`;
    } else if (selectedMedicalPackage) {
        itinerary += `Medical Package Time: ${totalMedicalTourismDays} ${plannerText.day}\n`;
        itinerary += `   (Report available after 7 days, travel activities can be done during waiting period)\n`;
        itinerary += `Medical Package Cost: $${medicalCost}\n`;
    } else {
        itinerary += `Cultural Experience Time: ${totalDays} ${plannerText.days}\n`;
        itinerary += `Cultural Experience Cost: $${Math.round(attractionCost)}\n`;
    }
    itinerary += `\n${plannerText.timeNote}\n\n`;
    itinerary += `📞 Contact us for booking: WhatsApp +86 199 1038 5444`;

    // Create a modal to display the itinerary
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    modal.id = 'itinerary-modal';

    const closeModal = () => {
        const modalElement = document.getElementById('itinerary-modal');
        if (modalElement) {
            modalElement.remove();
        }
    };

    modal.innerHTML = `
        <div class="bg-white rounded-xl p-6 max-w-2xl w-full max-h-96 overflow-y-auto relative" onclick="event.stopPropagation()">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-xl font-bold">Your Itinerary</h3>
                <button id="close-modal-btn" class="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full p-1 transition-colors">
                    <i data-lucide="x" class="w-6 h-6"></i>
                </button>
            </div>
            <pre class="whitespace-pre-wrap text-sm text-gray-700">${itinerary}</pre>
            <div class="mt-4 flex flex-wrap gap-3">
                <button id="copy-btn" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    Copy to Clipboard
                </button>
                <button id="whatsapp-btn" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                    Send via WhatsApp
                </button>
                <button id="close-modal-btn-2" class="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors">
                    Close
                </button>
            </div>
        </div>
    `;

    modal.addEventListener('click', closeModal);

    document.body.appendChild(modal);
    lucide.createIcons();

    document.getElementById('close-modal-btn').addEventListener('click', closeModal);
    document.getElementById('close-modal-btn-2').addEventListener('click', closeModal);

    document.getElementById('copy-btn').addEventListener('click', () => {
        navigator.clipboard.writeText(itinerary).then(() => {
            const btn = document.getElementById('copy-btn');
            const originalText = btn.textContent;
            btn.textContent = 'Copied!';
            setTimeout(() => {
                btn.textContent = originalText;
            }, 2000);
        });
    });

    document.getElementById('whatsapp-btn').addEventListener('click', () => {
        const whatsappMessage = encodeURIComponent(itinerary);
        const whatsappUrl = `https://wa.me/8619910385444?text=${whatsappMessage}`;
        window.open(whatsappUrl, '_blank');
    });

    const handleEscKey = (event) => {
        if (event.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', handleEscKey);
        }
    };
    document.addEventListener('keydown', handleEscKey);
}

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
