// Relies on plannerTranslations, medicalPackagesData, attractionsData from planner-data.js

// 从URL参数获取城市设置，默认为北京
const urlParams = new URLSearchParams(window.location.search);
const currentLanguage = urlParams.get('lang') || 'en';
let currentCity = urlParams.get('city') || 'beijing';
let selectedAttractions = [];
let selectedMedicalPackage = null;

// Update medical package prices based on language
function updateMedicalPackagePrices() {
    Object.keys(medicalPackagesData).forEach(packageId => {
        const packageData = medicalPackagesData[packageId];
        const priceElement = document.getElementById(`${packageId}-price`);
        if (priceElement) {
            if (currentLanguage === 'en') {
                priceElement.innerHTML = `<span class="text-sm font-normal text-gray-500 mr-1">from</span>$${packageData.price.usd}`;
            } else {
                priceElement.innerHTML = `¥${packageData.price.rmb}<span class="text-sm font-normal text-gray-500 ml-1">起</span>`;
            }
        }
    });
}

// Initialize the page
function init() {
    // 设置初始语言显示
    const langText = document.getElementById('lang-text');
    if (langText) langText.textContent = currentLanguage === 'en' ? '中文' : 'English';

    // 根据URL参数设置正确的城市标签页
    document.querySelectorAll('.city-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.city === currentCity) {
            tab.classList.add('active');
        }
    });

    updateLanguage();
    updateMedicalPackagePrices();
    renderAttractions();
    updateAttractionCards(); // 确保卡片状态正确
    updateMedicalPackageCards(); // 确保医疗套餐卡片状态正确
    updateSummary();
    setupEventListeners();
}

// Render attractions based on current city
function renderAttractions() {
    const container = document.getElementById('attractions-container');
    const attractions = attractionsData[currentCity];

    container.innerHTML = attractions.map(attraction => {
        // Handle price display - USD primary, RMB secondary
        let priceDisplay;
        if (attraction.priceUSD === 0 && attraction.priceRMB === 0) {
            priceDisplay = 'Free';
        } else {
            priceDisplay = `$${attraction.priceUSD} (¥${attraction.priceRMB})`;
        }

        return `
        <div class="attraction-card bg-white rounded-xl p-6 shadow-lg" data-id="${attraction.id}">
            <img src="${attraction.image}" alt="${attraction.name[currentLanguage]}" class="attraction-image mb-4">
            <h3 class="text-xl font-bold mb-3">${attraction.name[currentLanguage]}</h3>
            <p class="text-gray-600 mb-4 text-sm">${attraction.description[currentLanguage]}</p>
            <div class="flex justify-between items-center text-sm text-gray-500 mb-4">
                <span><i data-lucide="clock" class="w-4 h-4 inline mr-1"></i>${attraction.duration} ${plannerTranslations[currentLanguage].hours}</span>
                <span>${priceDisplay}</span>
            </div>
            <div class="text-center">
                <button class="select-btn w-full py-2 px-4 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition">
                    ${plannerTranslations[currentLanguage].selectAttraction}
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

    // Attraction selection - 使用事件委托
    document.addEventListener('click', (e) => {
        // 检查是否点击了选择按钮或卡片
        const button = e.target.closest('.select-btn');
        const card = e.target.closest('.attraction-card');

        if (button && card) {
            e.preventDefault();
            e.stopPropagation();
            const attractionId = card.dataset.id;
            console.log('Clicked attraction button:', attractionId); // 调试日志
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
            card.querySelector('.medical-select-btn span').textContent = currentLanguage === 'en' ? 'Selected ✓' : '已选择 ✓';
            card.querySelector('.medical-select-btn').classList.add('bg-green-600', 'text-white', 'border-green-600');
        } else {
            card.classList.remove('selected');
            card.querySelector('.medical-select-btn span').textContent = plannerTranslations[currentLanguage].selectPackage;
            card.querySelector('.medical-select-btn').classList.remove('bg-green-600', 'text-white', 'border-green-600');
        }
    });
}

// Toggle attraction selection
function toggleAttraction(attractionId) {
    console.log('toggleAttraction called with:', attractionId); // 调试日志
    const attraction = attractionsData[currentCity].find(a => a.id === attractionId);
    console.log('Found attraction:', attraction); // 调试日志
    const index = selectedAttractions.findIndex(a => a.id === attractionId);

    if (index > -1) {
        selectedAttractions.splice(index, 1);
        console.log('Removed attraction, new array:', selectedAttractions); // 调试日志
    } else {
        selectedAttractions.push(attraction);
        console.log('Added attraction, new array:', selectedAttractions); // 调试日志
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
            card.querySelector('.select-btn').textContent = currentLanguage === 'en' ? 'Selected ✓' : '已选择 ✓';
            card.querySelector('.select-btn').classList.add('bg-blue-600', 'text-white');
        } else {
            card.classList.remove('selected');
            card.querySelector('.select-btn').textContent = plannerTranslations[currentLanguage].selectAttraction;
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

    // Calculate attraction cost - always use USD as primary currency
    const attractionCost = selectedAttractions.reduce((sum, attraction) => {
        return sum + attraction.priceUSD;
    }, 0);

    // Calculate medical package totals
    let medicalCost = 0;
    let medicalDays = 0;
    let reportWaitDays = 0;

    if (selectedMedicalPackage) {
        const medicalPackage = medicalPackagesData[selectedMedicalPackage];
        medicalCost = medicalPackage.price.usd; // Always use USD for calculation
        medicalDays = medicalPackage.duration;
        reportWaitDays = medicalPackage.reportWaitDays;
    }

    // Calculate total cost and time
    const totalCost = attractionCost + medicalCost;

    // 修正时间计算逻辑：
    // 1. 如果只有体检套餐：显示体检1天 + 等待报告7天（但等待期间可以旅游）
    // 2. 如果只有旅游项目：显示旅游天数
    // 3. 如果两者都有：体检1天 + 旅游天数（等待报告期间可以进行旅游活动）
    let totalMedicalTourismDays;
    if (selectedMedicalPackage && selectedAttractions.length > 0) {
        // 体检1天 + 旅游天数（等待报告期间进行旅游）
        totalMedicalTourismDays = medicalDays + totalDays;
    } else if (selectedMedicalPackage) {
        // 只有体检：1天体检 + 7天等待（但实际行程只需要1天，其余时间可自由安排）
        totalMedicalTourismDays = medicalDays;
    } else {
        // 只有旅游
        totalMedicalTourismDays = totalDays;
    }

    console.log('updateSummary called'); // 调试日志
    console.log('Selected attractions:', selectedAttractions); // 调试日志
    console.log('Selected medical package:', selectedMedicalPackage); // 调试日志
    console.log('Medical days:', medicalDays, 'Tourism days:', totalDays, 'Total days:', totalMedicalTourismDays); // 调试日志

    const timeElement = document.getElementById('total-time');
    const costElement = document.getElementById('total-cost');

    console.log('Time element found:', timeElement); // 调试日志
    console.log('Cost element found:', costElement); // 调试日志

    if (timeElement && costElement) {
        // 如果没有选择任何项目，显示提示文字
        if (selectedAttractions.length === 0 && !selectedMedicalPackage) {
            timeElement.textContent = currentLanguage === 'en' ? 'No items selected' : '未选择项目';
            costElement.textContent = currentLanguage === 'en' ? 'No cost' : '无费用';
        } else {
            // 显示总时间和费用 - 始终使用美元
            timeElement.textContent = `${totalMedicalTourismDays} ${plannerTranslations[currentLanguage].days}`;
            costElement.textContent = `$${Math.round(totalCost)}`;
        }
        console.log('Updated time and cost elements'); // 调试日志
    } else {
        console.error('Could not find time or cost elements'); // 调试日志
    }

    // Update planning summary title
    let summaryItems = [];
    if (selectedMedicalPackage) {
        summaryItems.push(medicalPackagesData[selectedMedicalPackage].name[currentLanguage]);
    }
    if (selectedAttractions.length > 0) {
        summaryItems.push(...selectedAttractions.map(a => a.name[currentLanguage]));
    }

    if (summaryItems.length > 0) {
        document.querySelector('[data-key="planningTitle"]').textContent =
            `${currentLanguage === 'en' ? 'Planning Summary' : '规划摘要'}: ${summaryItems.join(', ')}`;
    } else {
        document.querySelector('[data-key="planningTitle"]').textContent =
            currentLanguage === 'en' ? 'Planning Summary: No items selected' : '规划摘要：未选择项目';
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
                    <h4 class="font-semibold text-green-800">${medicalPackage.name[currentLanguage]}</h4>
                    <p class="text-sm text-green-600">${medicalPackage.duration} ${plannerTranslations[currentLanguage].day} • ${currentLanguage === 'en' ? '$' + medicalPackage.price.usd : '¥' + medicalPackage.price.rmb}</p>
                    <p class="text-xs text-green-500">${plannerTranslations[currentLanguage].reportWaitTime}</p>
                </div>
                <button class="text-red-500 hover:text-red-700" onclick="toggleMedicalPackage('${medicalPackage.id}')">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
        `;
    }

    // Add attractions
    listHTML += selectedAttractions.map(attraction => {
        // Handle price display - USD primary, RMB secondary
        let priceDisplay;
        if (attraction.priceUSD === 0 && attraction.priceRMB === 0) {
            priceDisplay = 'Free';
        } else {
            priceDisplay = `$${attraction.priceUSD} (¥${attraction.priceRMB})`;
        }

        return `
        <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <div>
                <h4 class="font-semibold">${attraction.name[currentLanguage]}</h4>
                <p class="text-sm text-gray-600">${attraction.duration} ${plannerTranslations[currentLanguage].hours} • ${priceDisplay}</p>
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

// Update language for all elements
function updateLanguage() {
    document.querySelectorAll('[data-key]').forEach(element => {
        const key = element.dataset.key;
        if (plannerTranslations[currentLanguage][key]) {
            element.textContent = plannerTranslations[currentLanguage][key];
        }
    });
}

// Generate detailed itinerary
function generateItinerary() {
    if (selectedAttractions.length === 0 && !selectedMedicalPackage) {
        alert(currentLanguage === 'en' ? 'Please select at least one item (medical package or attraction).' : '请至少选择一个项目（体检套餐或景点）。');
        return;
    }

    // Calculate totals
    const totalHours = selectedAttractions.reduce((sum, attraction) => sum + attraction.duration, 0);
    const totalDays = convertHoursToDays(totalHours);

    // Calculate attraction cost - always use USD as primary currency
    const attractionCost = selectedAttractions.reduce((sum, attraction) => {
        return sum + attraction.priceUSD;
    }, 0);

    let medicalCost = 0;
    let medicalDays = 0;
    let reportWaitDays = 0;

    if (selectedMedicalPackage) {
        const medicalPackage = medicalPackagesData[selectedMedicalPackage];
        medicalCost = medicalPackage.price.usd; // Always use USD for calculation
        medicalDays = medicalPackage.duration;
        reportWaitDays = medicalPackage.reportWaitDays;
    }

    const totalCost = attractionCost + medicalCost;


    // 修正时间计算逻辑（与updateSummary保持一致）
    let totalMedicalTourismDays;
    if (selectedMedicalPackage && selectedAttractions.length > 0) {
        // 体检1天 + 旅游天数（等待报告期间进行旅游）
        totalMedicalTourismDays = medicalDays + totalDays;
    } else if (selectedMedicalPackage) {
        // 只有体检：1天体检（7天等待期间可自由安排）
        totalMedicalTourismDays = medicalDays;
    } else {
        // 只有旅游
        totalMedicalTourismDays = totalDays;
    }

    let itinerary = currentLanguage === 'en' ?
        `🎯 Your ${currentCity.charAt(0).toUpperCase() + currentCity.slice(1)} Medical Tourism Itinerary\n\n` :
        `🎯 您的${currentCity === 'beijing' ? '北京' : '成都'}医疗旅游行程\n\n`;

    // Add medical package if selected
    if (selectedMedicalPackage) {
        const medicalPackage = medicalPackagesData[selectedMedicalPackage];
        itinerary += `🏥 ${currentLanguage === 'en' ? 'Medical Package' : '体检套餐'}:\n`;
        itinerary += `   ${medicalPackage.name[currentLanguage]}\n`;
        itinerary += `   ${currentLanguage === 'en' ? 'Check-up Duration' : '体检时长'}: ${medicalPackage.duration} ${plannerTranslations[currentLanguage].day}\n`;
        itinerary += `   ${currentLanguage === 'en' ? 'Price' : '价格'}: ${currentLanguage === 'en' ? '$' + medicalPackage.price.usd : '¥' + medicalPackage.price.rmb}\n`;
        itinerary += `   ${medicalPackage.description[currentLanguage]}\n`;
        itinerary += `   ${plannerTranslations[currentLanguage].reportWaitTime}\n\n`;
    }

    // Add attractions if selected
    if (selectedAttractions.length > 0) {
        itinerary += `🎭 ${currentLanguage === 'en' ? 'Cultural Experiences' : '文化体验'}:\n`;
        selectedAttractions.forEach((attraction, index) => {
            // Handle price display - USD primary, RMB secondary
            let priceDisplay;
            if (attraction.priceUSD === 0 && attraction.priceRMB === 0) {
                priceDisplay = 'Free';
            } else {
                priceDisplay = `$${attraction.priceUSD} (¥${attraction.priceRMB})`;
            }

            itinerary += `${index + 1}. ${attraction.name[currentLanguage]}\n`;
            itinerary += `   ${currentLanguage === 'en' ? 'Duration' : '时长'}: ${attraction.duration} ${plannerTranslations[currentLanguage].hours}\n`;
            itinerary += `   ${currentLanguage === 'en' ? 'Price' : '价格'}: ${priceDisplay}\n`;
            itinerary += `   ${attraction.description[currentLanguage]}\n\n`;
        });
    }

    itinerary += `📊 ${currentLanguage === 'en' ? 'Summary' : '总结'}:\n`;
    if (selectedMedicalPackage && selectedAttractions.length > 0) {
        itinerary += `${plannerTranslations[currentLanguage].totalMedicalTourismTime}: ${totalMedicalTourismDays} ${plannerTranslations[currentLanguage].days}\n`;
        itinerary += `   (${currentLanguage === 'en' ? 'Medical check-up' : '体检'}: ${medicalDays} ${plannerTranslations[currentLanguage].day} + ${currentLanguage === 'en' ? 'Tourism' : '旅游'}: ${totalDays} ${plannerTranslations[currentLanguage].days})\n`;
        itinerary += `${plannerTranslations[currentLanguage].totalMedicalTourismCost}: $${Math.round(totalCost)}\n`;
    } else if (selectedMedicalPackage) {
        itinerary += `${currentLanguage === 'en' ? 'Medical Package Time' : '体检套餐时间'}: ${totalMedicalTourismDays} ${plannerTranslations[currentLanguage].day}\n`;
        itinerary += `   (${currentLanguage === 'en' ? 'Report available after 7 days, travel activities can be done during waiting period' : '7天后出报告，等待期间可进行旅游活动'})\n`;
        itinerary += `${currentLanguage === 'en' ? 'Medical Package Cost' : '体检套餐费用'}: $${medicalCost}\n`;
    } else {
        itinerary += `${currentLanguage === 'en' ? 'Cultural Experience Time' : '文化体验时间'}: ${totalDays} ${plannerTranslations[currentLanguage].days}\n`;
        itinerary += `${currentLanguage === 'en' ? 'Cultural Experience Cost' : '文化体验费用'}: $${Math.round(attractionCost)}\n`;
    }
    itinerary += `\n${plannerTranslations[currentLanguage].timeNote}\n\n`;
    itinerary += `📞 ${currentLanguage === 'en' ? 'Contact us for booking' : '联系我们预订'}: WhatsApp +86 199 1038 5444`;

    // Create a modal or new window to display the itinerary
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    modal.id = 'itinerary-modal';

    // Close modal function
    const closeModal = () => {
        const modalElement = document.getElementById('itinerary-modal');
        if (modalElement) {
            modalElement.remove();
        }
    };

    modal.innerHTML = `
        <div class="bg-white rounded-xl p-6 max-w-2xl w-full max-h-96 overflow-y-auto relative" onclick="event.stopPropagation()">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-xl font-bold">${currentLanguage === 'en' ? 'Your Itinerary' : '您的行程'}</h3>
                <button id="close-modal-btn" class="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full p-1 transition-colors">
                    <i data-lucide="x" class="w-6 h-6"></i>
                </button>
            </div>
            <pre class="whitespace-pre-wrap text-sm text-gray-700">${itinerary}</pre>
            <div class="mt-4 flex flex-wrap gap-3">
                <button id="copy-btn" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    ${currentLanguage === 'en' ? 'Copy to Clipboard' : '复制到剪贴板'}
                </button>
                <button id="whatsapp-btn" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                    ${currentLanguage === 'en' ? 'Send via WhatsApp' : '通过WhatsApp发送'}
                </button>
                <button id="close-modal-btn-2" class="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors">
                    ${currentLanguage === 'en' ? 'Close' : '关闭'}
                </button>
            </div>
        </div>
    `;

    // Add click event to close modal when clicking outside
    modal.addEventListener('click', closeModal);

    document.body.appendChild(modal);
    lucide.createIcons();

    // Add event listeners for close buttons
    document.getElementById('close-modal-btn').addEventListener('click', closeModal);
    document.getElementById('close-modal-btn-2').addEventListener('click', closeModal);

    // Add event listener for copy button
    document.getElementById('copy-btn').addEventListener('click', () => {
        navigator.clipboard.writeText(itinerary).then(() => {
            // Optional: Show a brief success message
            const btn = document.getElementById('copy-btn');
            const originalText = btn.textContent;
            btn.textContent = currentLanguage === 'en' ? 'Copied!' : '已复制!';
            setTimeout(() => {
                btn.textContent = originalText;
            }, 2000);
        });
    });

    // Add event listener for WhatsApp button
    document.getElementById('whatsapp-btn').addEventListener('click', () => {
        // Create a properly formatted message for WhatsApp
        const whatsappMessage = encodeURIComponent(itinerary);
        const whatsappUrl = `https://wa.me/8619910385444?text=${whatsappMessage}`;
        window.open(whatsappUrl, '_blank');
    });

    // Add ESC key listener to close modal
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
