// Relies on translations object from translations.js

let chartInstances = {};

function renderCharts() {
    // Check if Chart.js is available
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js is not loaded yet. Charts will not be rendered.');
        return;
    }

    const chartData = translations['en'];

    // Destroy existing charts if they exist
    if (chartInstances.efficiencyChart) chartInstances.efficiencyChart.destroy();

    // Note: Cost chart is now replaced with static visual comparison
    // Only render efficiency chart

    try {
        // Efficiency Chart - Stacked Bar
        const efficiencyCtx = document.getElementById('efficiencyChart');
        if (!efficiencyCtx) {
            console.warn('Efficiency chart canvas not found');
            return;
        }

        chartInstances.efficiencyChart = new Chart(efficiencyCtx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: [chartData.efficiencyChart.usLabel, chartData.efficiencyChart.chinaLabel],
                datasets: [{
                    label: chartData.efficiencyChart.appointment,
                    data: [56, 3],
                    backgroundColor: 'rgba(251, 191, 36, 0.6)', // Amber
                    borderColor: 'rgba(251, 191, 36, 1)',
                    borderWidth: 1
                }, {
                    label: chartData.efficiencyChart.checkup,
                    data: [2, 2],
                    backgroundColor: 'rgba(59, 130, 246, 0.6)', // Blue
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1
                }, {
                    label: chartData.efficiencyChart.results,
                    data: [7, 2],
                    backgroundColor: 'rgba(239, 68, 68, 0.6)', // Red
                    borderColor: 'rgba(239, 68, 68, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: { display: true, text: chartData.efficiencyChart.title, font: { size: 16 } },
                    tooltip: { mode: 'index', intersect: false }
                },
                scales: {
                    x: { stacked: true, title: { display: true, text: chartData.efficiencyChart.xAxisTitle || 'Days' } },
                    y: { stacked: true }
                }
            }
        });
    } catch (error) {
        console.error('Error creating charts:', error);
        // Hide chart containers if charts fail to load
        const efficiencyChart = document.getElementById('efficiencyChart');
        if (efficiencyChart) efficiencyChart.style.display = 'none';
    }
}




// Function to check if Chart.js is loaded with timeout
function waitForChart(timeout = 10000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();

        function checkChart() {
            if (typeof Chart !== 'undefined') {
                resolve();
            } else if (Date.now() - startTime > timeout) {
                reject(new Error('Chart.js failed to load within timeout'));
            } else {
                setTimeout(checkChart, 100);
            }
        }

        checkChart();
    });
}

// Number counting animation
function animateNumber(element, start, end, duration) {
    const startTime = performance.now();
    const range = end - start;

    function updateNumber(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function for smooth animation
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const current = Math.floor(start + (range * easeOutQuart));

        element.textContent = current.toLocaleString();

        if (progress < 1) {
            requestAnimationFrame(updateNumber);
        }
    }

    requestAnimationFrame(updateNumber);
}

// Enhanced price comparison animations
function initializePriceComparison() {
    // Intersection Observer for triggering animations when section comes into view
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Add staggered animation delays to price bars
                const priceBars = entry.target.querySelectorAll('.price-bar-animation');
                priceBars.forEach((bar, index) => {
                    bar.style.animationDelay = `${index * 0.3}s`;
                    bar.classList.add('price-bar-animation');
                });

                // Trigger savings highlight animation
                const savingsElements = entry.target.querySelectorAll('.savings-highlight');
                savingsElements.forEach((element, index) => {
                    setTimeout(() => {
                        element.style.animationDelay = `${index * 0.5}s`;
                        element.classList.add('savings-highlight');
                    }, 1000);
                });

                // Animate savings numbers
                setTimeout(() => {
                    const savingsNumbers = entry.target.querySelectorAll('.dramatic-savings');
                    savingsNumbers.forEach(numberElement => {
                        const text = numberElement.textContent;
                        const matches = text.match(/\$?([\d,]+)/g);
                        if (matches && matches.length > 0) {
                            // Extract the first number for animation
                            const firstNumber = parseInt(matches[0].replace(/[$,]/g, ''));
                            if (firstNumber > 1000) {
                                const tempSpan = document.createElement('span');
                                tempSpan.className = 'count-up';
                                numberElement.innerHTML = text.replace(matches[0], tempSpan.outerHTML);
                                const countElement = numberElement.querySelector('.count-up');
                                animateNumber(countElement, 0, firstNumber, 2000);
                            }
                        }
                    });
                }, 1500);
            }
        });
    }, { threshold: 0.3 });

    // Observe the price comparison section
    const priceSection = document.querySelector('.price-comparison-container');
    if (priceSection) {
        observer.observe(priceSection);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // Wait for Chart.js to be fully loaded
    try {
        await waitForChart();
        // Chart.js loaded successfully
    } catch (error) {
        console.warn('Chart.js failed to load:', error.message);
        // Hide chart containers if Chart.js fails to load
        const efficiencyChart = document.getElementById('efficiencyChart');
        if (efficiencyChart && efficiencyChart.parentElement) {
            efficiencyChart.parentElement.style.display = 'none';
        }
    }

    lucide.createIcons();
    lucide.createIcons();
    renderCharts();

    // Initialize price comparison animations
    initializePriceComparison();

    // Language switcher removed


    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    mobileMenuButton.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
    });

    document.querySelectorAll('[data-modal-target]').forEach(button => {
        button.addEventListener('click', () => {
            const targetModal = document.getElementById(button.dataset.modalTarget);
            if (targetModal) {
                targetModal.classList.add('active');
            }
        });
    });

    document.querySelectorAll('.modal-close, .modal-overlay').forEach(element => {
        element.addEventListener('click', (e) => {
            if (e.target === element) {
                element.closest('.modal-overlay').classList.remove('active');
            }
        });
    });

    // Tab functionality for destinations
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    // Map configuration for different cities
    const cityMapConfig = {
        'beijing': {
            query: 'Labubu+store+北京',
            center: '39.9042,116.4074',
            zoom: '12'
        },
        'chengdu': {
            query: 'Labubu+store+成都',
            center: '30.5728,104.0668',
            zoom: '12'
        }
    };

    function updateLabubuMap(cityId) {
        const mapIframe = document.getElementById('labubu-map');
        const config = cityMapConfig[cityId];
        if (config && mapIframe) {
            const newSrc = `https://www.google.com/maps/embed/v1/search?key=AIzaSyC1QzUEqeQLmu9srYB6H4Ip3ldcCNZsizY&q=${config.query}&center=${config.center}&zoom=${config.zoom}`;
            mapIframe.src = newSrc;
        }
    }

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            const tabId = button.dataset.tab;
            tabContents.forEach(content => {
                if (content.id === `${tabId}-content`) {
                    content.classList.remove('hidden');
                } else {
                    content.classList.add('hidden');
                }
            });

            // Update Labubu map based on selected city
            updateLabubuMap(tabId);
        });
    });

    // Culture tab functionality
    const cultureTabButtons = document.querySelectorAll('.culture-tab-button');
    const cultureTabContents = document.querySelectorAll('.culture-tab-content');

    cultureTabButtons.forEach(button => {
        button.addEventListener('click', () => {
            cultureTabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            const tabId = button.dataset.cultureTab;
            cultureTabContents.forEach(content => {
                if (content.id === `${tabId}-culture-content`) {
                    content.classList.remove('hidden');
                } else {
                    content.classList.add('hidden');
                }
            });

            // Update Labubu map when culture tab changes
            updateLabubuMap(tabId);
        });
    });

    // Carousel functionality
    const carousels = ['beijing', 'chengdu', 'video', 'hero'];
    const carouselStates = {};

    carousels.forEach(carouselId => {
        const container = document.getElementById(`${carouselId}-carousel`);
        if (!container) return;

        // Use different selectors for hero carousel
        const isHeroCarousel = carouselId === 'hero';
        const slideSelector = isHeroCarousel ? '.hero-carousel-slide' : '.carousel-slide';
        const trackSelector = isHeroCarousel ? '.hero-carousel-track' : '.carousel-track';

        carouselStates[carouselId] = {
            currentSlide: 0,
            totalSlides: container.querySelectorAll(slideSelector).length,
            intervalId: null
        };

        const track = container.querySelector(trackSelector);
        const indicators = document.querySelectorAll(`[data-carousel="${carouselId}"][data-slide]`);
        const navButtons = isHeroCarousel ? [] : document.querySelectorAll(`[data-carousel="${carouselId}"][data-direction]`);


        function updateCarousel() {
            const translateX = -carouselStates[carouselId].currentSlide * 100;
            if (track) track.style.transform = `translateX(${translateX}%)`;

            indicators.forEach((indicator, index) => {
                indicator.classList.toggle('active', index === carouselStates[carouselId].currentSlide);
            });

            // Dynamic height adjustment for hero carousel
            if (isHeroCarousel) {
                setTimeout(() => adjustHeroCarouselHeight(), 50);
            }
        }

        function adjustHeroCarouselHeight() {
            if (!isHeroCarousel) return;

            const currentSlideElement = container.querySelectorAll(slideSelector)[carouselStates[carouselId].currentSlide];
            const img = currentSlideElement ? currentSlideElement.querySelector('img') : null;

            if (img) {
                if (img.complete && img.naturalWidth > 0) {
                    calculateAndSetHeight(img);
                } else {
                    img.onload = () => calculateAndSetHeight(img);
                }
            }
        }

        function calculateAndSetHeight(img) {
            const containerWidth = container.offsetWidth - 40; // Subtract padding
            const imgAspectRatio = img.naturalWidth / img.naturalHeight;

            // Calculate the height needed to display the image at its natural aspect ratio
            let targetHeight = containerWidth / imgAspectRatio + 40; // Add padding

            // Apply only minimum height constraint to prevent too small containers
            const minHeight = window.innerWidth <= 768 ? 200 : 250;

            targetHeight = Math.max(minHeight, targetHeight);

            // Set the container height with smooth transition
            container.style.height = targetHeight + 'px';

            // Also set all slide heights
            const slides = container.querySelectorAll(slideSelector);
            slides.forEach(slide => {
                slide.style.height = targetHeight + 'px';
            });
        }

        function nextSlide() {
            carouselStates[carouselId].currentSlide = (carouselStates[carouselId].currentSlide + 1) % carouselStates[carouselId].totalSlides;
            updateCarousel();
        }

        function prevSlide() {
            carouselStates[carouselId].currentSlide = (carouselStates[carouselId].currentSlide - 1 + carouselStates[carouselId].totalSlides) % carouselStates[carouselId].totalSlides;
            updateCarousel();
        }

        function goToSlide(slideIndex) {
            carouselStates[carouselId].currentSlide = slideIndex;
            updateCarousel();
        }

        function startAutoplay() {
            clearInterval(carouselStates[carouselId].intervalId); // Clear existing interval
            const intervalTime = 7000; // Set interval time
            carouselStates[carouselId].intervalId = setInterval(nextSlide, intervalTime);
        }

        function stopAutoplay() {
            clearInterval(carouselStates[carouselId].intervalId);
        }


        // Navigation buttons (only for non-hero carousels)
        if (!isHeroCarousel) {
            navButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    if (button.dataset.direction === 'next') {
                        nextSlide();
                    } else if (button.dataset.direction === 'prev') {
                        prevSlide();
                    }

                    stopAutoplay();
                    startAutoplay();
                });
            });
        }

        // Indicator buttons
        indicators.forEach((indicator, index) => {
            indicator.addEventListener('click', () => {
                const slideIndex = parseInt(indicator.dataset.slide);
                goToSlide(slideIndex);
                stopAutoplay();
                startAutoplay();
            });
        });

        // Touch swipe support
        let touchStartX = 0;
        let touchEndX = 0;

        container.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            stopAutoplay();
        }, { passive: true });

        container.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
            startAutoplay();
        }, { passive: true });

        function handleSwipe() {
            if (touchEndX < touchStartX - 50) nextSlide();
            if (touchEndX > touchStartX + 50) prevSlide();
        }

        // Initialize
        updateCarousel();
        startAutoplay();

        // Initial height adjustment for hero
        if (isHeroCarousel) {
            window.addEventListener('resize', adjustHeroCarouselHeight);
            // Try repeatedly to set height as images load
            [100, 500, 1000, 2000].forEach(delay => {
                setTimeout(adjustHeroCarouselHeight, delay);
            });
        }
    });

    // Scroll spy for navigation
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-link');

    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (scrollY >= (sectionTop - sectionHeight / 3)) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href').includes(current)) {
                link.classList.add('active');
            }
        });
    });

    // Handle inquiry form submission
    const inquiryForm = document.getElementById('inquiry-form');
    if (inquiryForm) {
        inquiryForm.addEventListener('submit', (e) => {
            e.preventDefault();

            // Collect form data
            const formData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                package: document.getElementById('package-select').value,
                message: document.getElementById('message').value
            };

            // Here you would typically send this data to a backend
            // For now, we'll just show the success modal

            // Show success modal
            const successModal = document.getElementById('success-modal');
            if (successModal) {
                const title = 'Inquiry Sent Successfully!';
                const msg = 'Thank you for your interest. Our health consultant will contact you within 24 hours.';

                successModal.querySelector('h3').textContent = title;
                successModal.querySelector('p').textContent = msg;

                successModal.classList.add('active');

                // Clear form
                inquiryForm.reset();

                // Close modal after 3 seconds
                setTimeout(() => {
                    successModal.classList.remove('active');
                }, 3000);
            }
        });
    }

    // Handle "Get a Quote" buttons to scroll to form and pre-select package if applicable
    document.querySelectorAll('a[href="#contact"]').forEach(link => {
        link.addEventListener('click', (e) => {
            // Check if there's a package data attribute
            const packageId = link.getAttribute('data-package');
            if (packageId) {
                const select = document.getElementById('package-select');
                if (select) {
                    select.value = packageId;
                }
            }
        });
    });

    // Handle Culture Planner Link with Language Parameter
    const plannerLink = document.getElementById('culture-planner-link');
    if (plannerLink) {
        plannerLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = `culture-planner.html`;
        });
    }

    // Copy to clipboard functionality
    window.copyToClipboard = function (text, elementId) {
        navigator.clipboard.writeText(text).then(() => {
            showCopySuccess(elementId);
        }).catch(err => {
            console.error('Failed to copy: ', err);
        });
    };

    function showCopySuccess(elementId) {
        const btn = document.getElementById(elementId);
        if (!btn) return;

        const originalText = btn.innerHTML;
        const successText = 'Copied!';

        btn.innerHTML = `<span class="flex items-center"><i data-lucide="check" class="w-4 h-4 mr-1"></i> ${successText}</span>`;
        lucide.createIcons();

        setTimeout(() => {
            btn.innerHTML = originalText;
            lucide.createIcons();
        }, 2000);
    }
});
