// Конфигурация
const CONFIG = {
    sliderInterval: 10000,
    galleryInterval: 3000, // 3 секунды для отзывов
    phoneRegex: /^\+7\d{10}$/,
    messageMinLength: 10,
    messageMaxLength: 1000
};

// Список позитивных эмодзи для отзывов
const EMOJIS = ['😊', '🌟', '👍', '💫', '✨', '🎉', '❤️', '😍', '🤩', '👏', '🎊', '💖'];

// Кэш DOM элементов
const DOM = {
    modals: {
        contact: null,
        text: null
    },
    forms: {
        contact: null
    },
    inputs: {
        phone: null,
        message: null
    },
    burgerMenu: null,
    mainNav: null
};

// Состояние приложения
const STATE = {
    currentSlide: 0,
    galleryIntervals: new Map(),
    isModalOpen: false,
    isMobileMenuOpen: false
};

// Утилиты
const Utils = {
    // Дебаунс для оптимизации scroll событий
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Троттлинг для частых событий
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // Ленивая загрузка изображений
    lazyLoadImages() {
        const lazyImages = document.querySelectorAll('[data-bg]');
        
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.style.backgroundImage = `url(${img.dataset.bg})`;
                    img.removeAttribute('data-bg');
                    observer.unobserve(img);
                }
            });
        });

        lazyImages.forEach(img => imageObserver.observe(img));
    },

    // Получить случайный эмодзи
    getRandomEmoji() {
        return EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    }
};

// Менеджер мобильного меню
const MobileMenuManager = {
    init() {
        DOM.burgerMenu = document.getElementById('burgerMenu');
        DOM.mainNav = document.getElementById('mainNav');
        
        if (DOM.burgerMenu && DOM.mainNav) {
            DOM.burgerMenu.addEventListener('click', () => this.toggleMobileMenu());
            
            // Закрытие меню при клике на ссылку
            document.querySelectorAll('.nav-menu a').forEach(link => {
                link.addEventListener('click', () => this.closeMobileMenu());
            });
            
            // Закрытие меню при клике вне его
            document.addEventListener('click', (e) => {
                if (STATE.isMobileMenuOpen && 
                    !DOM.mainNav.contains(e.target) && 
                    !DOM.burgerMenu.contains(e.target)) {
                    this.closeMobileMenu();
                }
            });
        }
    },

    toggleMobileMenu() {
        if (STATE.isMobileMenuOpen) {
            this.closeMobileMenu();
        } else {
            this.openMobileMenu();
        }
    },

    openMobileMenu() {
        DOM.mainNav.classList.add('active');
        DOM.burgerMenu.classList.add('active');
        document.body.style.overflow = 'hidden';
        STATE.isMobileMenuOpen = true;
    },

    closeMobileMenu() {
        DOM.mainNav.classList.remove('active');
        DOM.burgerMenu.classList.remove('active');
        document.body.style.overflow = 'auto';
        STATE.isMobileMenuOpen = false;
    }
};

// Менеджер слайдеров
const SliderManager = {
    init() {
        this.initBackgroundSlider();
        this.initGallerySliders();
        this.initReviewsSlider();
    },

    initBackgroundSlider() {
        const slides = document.querySelectorAll('.slide');
        if (!slides.length) return;

        setInterval(() => {
            slides[STATE.currentSlide].classList.remove('active');
            STATE.currentSlide = (STATE.currentSlide + 1) % slides.length;
            slides[STATE.currentSlide].classList.add('active');
        }, CONFIG.sliderInterval);
    },

    initGallerySliders() {
        document.querySelectorAll('[data-gallery]').forEach((gallery, index) => {
            const galleryNumber = gallery.dataset.gallery;
            if (galleryNumber !== 'reviews') {
                this.startGalleryAutoSlide(galleryNumber);
            }
        });
    },

    initReviewsSlider() {
        this.startGalleryAutoSlide('reviews');
    },

    startGalleryAutoSlide(galleryId) {
        const gallerySelector = `[data-gallery="${galleryId}"]`;
        const gallery = document.querySelector(gallerySelector);
        if (!gallery) return;

        const images = gallery.querySelectorAll('.gallery-image');
        const dots = gallery.parentElement.querySelectorAll('.dot');
        let currentImage = 0;
        const totalImages = images.length;

        // Очистка предыдущего интервала
        if (STATE.galleryIntervals.has(galleryId)) {
            clearInterval(STATE.galleryIntervals.get(galleryId));
        }

        // Установка интервала (3 секунды для отзывов, 10 для остальных)
        const intervalTime = galleryId === 'reviews' ? CONFIG.galleryInterval : CONFIG.sliderInterval;

        const interval = setInterval(() => {
            images[currentImage].classList.remove('active');
            dots[currentImage].classList.remove('active');
            
            currentImage = (currentImage + 1) % totalImages;
            
            images[currentImage].classList.add('active');
            dots[currentImage].classList.add('active');
            
            // Для отзывов обновляем эмодзи
            if (galleryId === 'reviews') {
                this.updateReviewEmoji(images[currentImage]);
            }
        }, intervalTime);

        STATE.galleryIntervals.set(galleryId, interval);
        
        // Инициализация эмодзи для активного слайда отзывов
        if (galleryId === 'reviews') {
            this.updateReviewEmoji(images[currentImage]);
        }
    },

    updateReviewEmoji(activeSlide) {
        const emojiOverlay = activeSlide.querySelector('.emoji-overlay');
        if (emojiOverlay) {
            emojiOverlay.textContent = Utils.getRandomEmoji();
        }
    },

    changeImage(galleryId, direction) {
        const gallerySelector = `[data-gallery="${galleryId}"]`;
        const gallery = document.querySelector(gallerySelector);
        if (!gallery) return;

        const images = gallery.querySelectorAll('.gallery-image');
        const dots = gallery.parentElement.querySelectorAll('.dot');
        let currentImage = Array.from(images).findIndex(img => img.classList.contains('active'));
        
        images[currentImage].classList.remove('active');
        dots[currentImage].classList.remove('active');
        
        if (direction === 1) {
            currentImage = (currentImage + 1) % images.length;
        } else {
            currentImage = (currentImage - 1 + images.length) % images.length;
        }
        
        images[currentImage].classList.add('active');
        dots[currentImage].classList.add('active');
        
        // Обновляем эмодзи для отзывов
        if (galleryId === 'reviews') {
            this.updateReviewEmoji(images[currentImage]);
        }
        
        this.startGalleryAutoSlide(galleryId);
    },

    goToImage(galleryId, imageIndex) {
        const gallerySelector = `[data-gallery="${galleryId}"]`;
        const gallery = document.querySelector(gallerySelector);
        if (!gallery) return;

        const images = gallery.querySelectorAll('.gallery-image');
        const dots = gallery.parentElement.querySelectorAll('.dot');
        
        images.forEach(img => img.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));
        
        images[imageIndex].classList.add('active');
        dots[imageIndex].classList.add('active');
        
        // Обновляем эмодзи для отзывов
        if (galleryId === 'reviews') {
            this.updateReviewEmoji(images[imageIndex]);
        }
        
        this.startGalleryAutoSlide(galleryId);
    }
};

// Менеджер модальных окон
const ModalManager = {
    init() {
        DOM.modals.contact = document.getElementById('contactModal');
        DOM.modals.text = document.getElementById('textModal');
    },

    openModal() {
        if (STATE.isModalOpen) return;
        
        DOM.modals.contact.style.display = 'flex';
        DOM.modals.contact.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        STATE.isModalOpen = true;
    },

    closeModal() {
        DOM.modals.contact.style.display = 'none';
        DOM.modals.contact.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = 'auto';
        STATE.isModalOpen = false;
    },

    openTextModal(title, text) {
        if (STATE.isModalOpen) return;
        
        document.getElementById('textModalTitle').textContent = title;
        document.getElementById('textModalBody').textContent = text;
        DOM.modals.text.style.display = 'flex';
        DOM.modals.text.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        STATE.isModalOpen = true;
    },

    closeTextModal() {
        DOM.modals.text.style.display = 'none';
        DOM.modals.text.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = 'auto';
        STATE.isModalOpen = false;
    },

    handleOutsideClick(event) {
        if (event.target === DOM.modals.contact) {
            this.closeModal();
        }
        if (event.target === DOM.modals.text) {
            this.closeTextModal();
        }
        if (event.target.classList.contains('gallery-popup')) {
            closeMediaPopup();
        }
    }
};

// Валидация форм
const FormValidator = {
    init() {
        DOM.forms.contact = document.getElementById('contactForm');
        DOM.inputs.phone = document.getElementById('phone');
        DOM.inputs.message = document.getElementById('message');
    },

    addPhonePrefix() {
        if (DOM.inputs.phone.value === '') {
            DOM.inputs.phone.value = '+7';
        }
    },

    validatePhone() {
        const phoneError = document.getElementById('phoneError');
        
        if (DOM.inputs.phone.value && !CONFIG.phoneRegex.test(DOM.inputs.phone.value)) {
            phoneError.style.display = 'block';
            phoneError.textContent = 'Введите номер в формате +71112223344';
            DOM.inputs.phone.style.borderColor = '#e74c3c';
            return false;
        } else {
            phoneError.style.display = 'none';
            DOM.inputs.phone.style.borderColor = '#e0e0e0';
            return true;
        }
    },

    updateMessageCounter() {
        const messageCounter = document.getElementById('messageCounter');
        const currentLength = DOM.inputs.message.value.length;
        
        messageCounter.textContent = `${currentLength}/${CONFIG.messageMaxLength}`;
        messageCounter.style.color = currentLength > CONFIG.messageMaxLength ? '#e74c3c' : '#999';
    },

    validateForm(formData) {
        const name = formData.get('name');
        const phone = formData.get('phone');
        const message = formData.get('message');
        
        if (!name || !phone || !message) {
            alert('Пожалуйста, заполните все обязательные поля');
            return false;
        }
        
        if (!CONFIG.phoneRegex.test(phone)) {
            alert('Пожалуйста, введите корректный номер телефона в формате +71112223344');
            return false;
        }
        
        if (message.length < CONFIG.messageMinLength || message.length > CONFIG.messageMaxLength) {
            alert(`Сообщение должно содержать от ${CONFIG.messageMinLength} до ${CONFIG.messageMaxLength} символов`);
            return false;
        }
        
        return true;
    }
};

// Обработчик отправки формы
const FormHandler = {
    async submitForm(event) {
        event.preventDefault();
        
        const formData = new FormData(DOM.forms.contact);
        
        if (!FormValidator.validateForm(formData)) {
            return;
        }
        
        const submitButton = document.querySelector('.submit-button');
        const originalText = submitButton.textContent;
        
        // Показ состояния загрузки
        submitButton.textContent = 'Отправка...';
        submitButton.disabled = true;
        DOM.forms.contact.classList.add('loading');
        
        try {
            // Имитация отправки
            await this.simulateSubmit(formData);
            
            alert('Спасибо! Ваше сообщение отправлено. Мы свяжемся с вами в ближайшее время.');
            DOM.forms.contact.reset();
            ModalManager.closeModal();
            FormValidator.updateMessageCounter();
            
        } catch (error) {
            alert('Произошла ошибка при отправке. Пожалуйста, попробуйте еще раз.');
        } finally {
            submitButton.textContent = originalText;
            submitButton.disabled = false;
            DOM.forms.contact.classList.remove('loading');
        }
    },

    simulateSubmit(formData) {
        return new Promise(resolve => {
            setTimeout(() => {
                console.log('Form submitted:', Object.fromEntries(formData));
                resolve();
            }, 2000);
        });
    }
};

// Навигация и скролл
const NavigationManager = {
    init() {
        this.setupSmoothScroll();
        this.setupScrollHeader();
        this.setupScrollAnimations();
    },

    setupSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                
                const targetId = link.getAttribute('href');
                const targetElement = document.querySelector(targetId);
                
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    },

    setupScrollHeader() {
        let lastScrollTop = 0;
        
        const handleScroll = Utils.throttle(() => {
            const header = document.querySelector('.header');
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            
            if (scrollTop > lastScrollTop && scrollTop > 100) {
                header.classList.add('hidden');
            } else {
                header.classList.remove('hidden');
            }
            
            lastScrollTop = scrollTop;
        }, 100);
        
        window.addEventListener('scroll', handleScroll);
    },

    setupScrollAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, observerOptions);

        document.querySelectorAll('.hero-content, .text-content').forEach(el => {
            observer.observe(el);
        });
    }
};

// Галерея парка
const GalleryManager = {
    init() {
        this.initGallery();
    },

    galleryData: [
        {
            type: 'image',
            src: 'images/b_1.jpg',
            alt: 'Вид на водопад в парке'
        },
        {
            type: 'image',
            src: 'images/b_2.webp',
            alt: 'Лесная тропа'
        },
        {
            type: 'image',
            src: 'images/ecotropa-4.webp',
            alt: 'Лесная тропа'
        },
        {
            type: 'image',
            src: 'images/b_3.webp',
            alt: 'Лесная тропа'
        },
        {
            type: 'image',
            src: 'images/main-vodopad-8.jpg',
            alt: 'Лесная тропа'
        },
        {
            type: 'image',
            src: 'images/mel-1.webp',
            alt: 'Лесная тропа'
        },
        {
            type: 'image',
            src: 'images/olen-2.webp',
            alt: 'Лесная тропа'
        },
        {
            type: 'image',
            src: 'images/orig.jpeg',
            alt: 'Лесная тропа'
        },
        {
            type: 'image',
            src: 'images/saam-2.webp',
            alt: 'Лесная тропа'
        },
        {
            type: 'image',
            src: 'images/ecotropa-5.webp',
            alt: 'Лесная тропа'
        },
        {
            type: 'image',
            src: 'images/most_1.webp',
            alt: 'Лесная тропа'
        },
        {
            type: 'image',
            src: 'images/saamskaya-derevnya-i-olenya-ferma-1-1.jpg',
            alt: 'Лесная тропа'
        }
    ],

    // Переменные для управления галереей
    currentMediaIndex: 0,
    galleryGrid: null,
    galleryPopup: null,
    popupImage: null,
    popupVideo: null,
    popupClose: null,
    prevBtn: null,
    nextBtn: null,
    popupCounter: null,

    initGallery() {
        this.galleryGrid = document.getElementById('galleryGrid');
        this.galleryPopup = document.getElementById('galleryPopup');
        this.popupImage = document.getElementById('popupImage');
        this.popupVideo = document.getElementById('popupVideo');
        this.popupClose = document.getElementById('popupClose');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.popupCounter = document.getElementById('popupCounter');

        // Очищаем контейнер
        this.galleryGrid.innerHTML = '';
        
        // Добавляем элементы в галерею
        this.galleryData.forEach((item, index) => {
            const galleryItem = document.createElement('div');
            galleryItem.className = 'gallery-item';
            galleryItem.setAttribute('data-index', index);
            
            if (item.type === 'image') {
                galleryItem.innerHTML = `
                    <img class="gallery-img" src="${item.src}" alt="${item.alt}" loading="lazy">
                `;
            }
            
            this.galleryGrid.appendChild(galleryItem);
            
            // Добавляем обработчик клика
            galleryItem.addEventListener('click', () => this.openMediaPopup(index));
        });

        // Обработчики событий
        this.popupClose.addEventListener('click', () => this.closeMediaPopup());
        this.prevBtn.addEventListener('click', () => this.prevMedia());
        this.nextBtn.addEventListener('click', () => this.nextMedia());

        // Закрытие попапа при клике вне контента
        this.galleryPopup.addEventListener('click', (e) => {
            if (e.target === this.galleryPopup) {
                this.closeMediaPopup();
            }
        });

        // Навигация с клавиатуры
        document.addEventListener('keydown', (e) => {
            if (this.galleryPopup.style.display === 'flex') {
                if (e.key === 'Escape') {
                    this.closeMediaPopup();
                } else if (e.key === 'ArrowRight') {
                    this.nextMedia();
                } else if (e.key === 'ArrowLeft') {
                    this.prevMedia();
                }
            }
        });
    },

    // Открытие попапа с медиа
    openMediaPopup(index) {
        this.currentMediaIndex = index;
        this.updatePopupMedia();
        this.galleryPopup.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    },

    // Обновление медиа в попапе
    updatePopupMedia() {
        const currentItem = this.galleryData[this.currentMediaIndex];
        
        if (currentItem.type === 'image') {
            this.popupImage.src = currentItem.src;
            this.popupImage.alt = currentItem.alt;
            this.popupImage.style.display = 'block';
            this.popupVideo.style.display = 'none';
            if (this.popupVideo.pause) this.popupVideo.pause();
        } else if (currentItem.type === 'video') {
            this.popupVideo.src = currentItem.src;
            this.popupVideo.poster = currentItem.poster;
            this.popupVideo.setAttribute('controls', 'true');
            this.popupImage.style.display = 'none';
            this.popupVideo.style.display = 'block';
            if (this.popupVideo.play) this.popupVideo.play();
        }
        
        // Обновляем счетчик
        this.popupCounter.textContent = `${this.currentMediaIndex + 1} / ${this.galleryData.length}`;
    },

    // Закрытие попапа
    closeMediaPopup() {
        this.galleryPopup.style.display = 'none';
        document.body.style.overflow = 'auto';
        if (this.popupVideo.pause) this.popupVideo.pause();
    },

    // Переход к следующему медиа
    nextMedia() {
        this.currentMediaIndex = (this.currentMediaIndex + 1) % this.galleryData.length;
        this.updatePopupMedia();
    },

    // Переход к предыдущему медиа
    prevMedia() {
        this.currentMediaIndex = (this.currentMediaIndex - 1 + this.galleryData.length) % this.galleryData.length;
        this.updatePopupMedia();
    }
};

// Яндекс карты
const MapManager = {
    init() {
        this.loadYandexMaps();
    },

    initYandexMap() {
        // Проверяем, загружена ли API Яндекс.Карт
        if (typeof ymaps !== 'undefined') {
            ymaps.ready(function() {
                const map = new ymaps.Map('yandex-map', {
                    center: [61.4776, 30.0307],
                    zoom: 14,
                    controls: ['zoomControl', 'fullscreenControl']
                });
                
                // Добавляем метку парка
                const parkPlacemark = new ymaps.Placemark([61.4776, 30.0307], {
                    balloonContent: 'Эко-парк «Долина водопадов»<br>Республика Карелия'
                }, {
                    preset: 'islands#greenIcon',
                    iconColor: '#5C7355'
                });
                
                map.geoObjects.add(parkPlacemark);
                
                // Открываем балун при загрузке
                parkPlacemark.balloon.open();
            });
        } else {
            console.warn('Yandex Maps API не загружена');
            // Альтернатива: показать статичную карту
            document.getElementById('yandex-map').innerHTML = `
                <div style="width:100%;height:100%;background:#f0f0f0;display:flex;align-items:center;justify-content:center;color:#666;">
                    <div style="text-align:center;">
                        <p>Карта временно недоступна</p>
                        <p>Координаты: 61.4776° 30.0307°</p>
                    </div>
                </div>
            `;
        }
    },

    // Функция для открытия навигационного приложения
    openNavigationApp(event) {
        event.preventDefault();
        
        const lat = 61.4776;
        const lon = 30.0307;
        
        // Проверяем, является ли устройство мобильным
        const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
            // Пытаемся открыть Яндекс.Навигатор
            setTimeout(function() {
                // Если Яндекс.Навигатор не установлен, открываем ссылку в браузере
                window.location.href = `https://yandex.ru/maps/?pt=${lon},${lat}&z=14&l=map`;
            }, 500);
            
            // Основная ссылка для Яндекс.Навигатора
            window.location.href = `yandexnavi://build_route_on_map?lat_to=${lat}&lon_to=${lon}`;
        } else {
            // Для десктопов открываем Яндекс.Карты в новой вкладке
            window.open(`https://yandex.ru/maps/?pt=${lon},${lat}&z=14&l=map`, '_blank');
        }
    },

    // Загрузка API Яндекс.Карт
    loadYandexMaps() {
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = 'https://api-maps.yandex.ru/2.1/?apikey=ваш_ключ_api&lang=ru_RU';
        script.onload = () => this.initYandexMap();
        script.onerror = function() {
            console.error('Ошибка загрузки Яндекс.Карт');
            // Показываем альтернативную карту
            document.getElementById('yandex-map').innerHTML = `
                <div style="width:100%;height:100%;background:#f0f0f0;display:flex;align-items:center;justify-content:center;color:#666;border-radius:12px;">
                    <div style="text-align:center;padding:20px;">
                        <h4 style="margin-bottom:10px;color:#5C7355;">Эко-парк «Долина водопадов»</h4>
                        <p style="margin-bottom:5px;">Координаты: 61.4776° 30.0307°</p>
                        <p style="margin-bottom:15px;">Республика Карелия</p>
                        <a href="https://yandex.ru/maps/?pt=30.0307,61.4776&z=14&l=map" 
                           target="_blank" 
                           style="color:#F9C801;text-decoration:underline;">
                            Открыть в Яндекс.Картах
                        </a>
                    </div>
                </div>
            `;
        };
        document.head.appendChild(script);
    }
};

// Основная инициализация
class App {
    constructor() {
        this.init();
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.initializeModules();
            this.setupEventListeners();
            this.setupPerformanceOptimizations();
        });
    }

    initializeModules() {
        // Инициализация менеджеров
        MobileMenuManager.init();
        ModalManager.init();
        FormValidator.init();
        SliderManager.init();
        NavigationManager.init();
        GalleryManager.init();
        MapManager.init();
        
        // Ленивая загрузка изображений
        Utils.lazyLoadImages();
    }

    setupEventListeners() {
        // Глобальные обработчики
        document.addEventListener('click', (e) => ModalManager.handleOutsideClick(e));
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
        
        // Обработчики формы
        if (DOM.inputs.phone) {
            DOM.inputs.phone.addEventListener('input', () => FormValidator.validatePhone());
            DOM.inputs.phone.addEventListener('blur', () => FormValidator.validatePhone());
        }
        
        if (DOM.inputs.message) {
            DOM.inputs.message.addEventListener('input', () => FormValidator.updateMessageCounter());
            FormValidator.updateMessageCounter(); // Инициализация счетчика
        }
        
        if (DOM.forms.contact) {
            DOM.forms.contact.addEventListener('submit', (e) => FormHandler.submitForm(e));
        }

        // Добавляем обработчик для кнопки навигации
        const navButton = document.querySelector('.nav-button');
        if (navButton) {
            navButton.addEventListener('click', MapManager.openNavigationApp);
        }
    }

    setupPerformanceOptimizations() {
        // Предзагрузка критичных изображений
        this.preloadCriticalImages();
        
        // Очистка при покидании страницы
        window.addEventListener('beforeunload', () => {
            STATE.galleryIntervals.forEach(interval => clearInterval(interval));
        });
    }

    handleKeydown(e) {
        if (e.key === 'Escape' && STATE.isModalOpen) {
            ModalManager.closeModal();
            ModalManager.closeTextModal();
            GalleryManager.closeMediaPopup();
        }
    }

    preloadCriticalImages() {
        const criticalImages = [
            'images/b_1.jpg'
        ];
        
        criticalImages.forEach(src => {
            const img = new Image();
            img.src = src;
        });
    }
}

// Глобальные функции для HTML атрибутов
window.openModal = () => ModalManager.openModal();
window.closeModal = () => ModalManager.closeModal();
window.openTextModal = (title, text) => ModalManager.openTextModal(title, text);
window.closeTextModal = () => ModalManager.closeTextModal();
window.changeImage = (galleryNumber, direction) => SliderManager.changeImage(galleryNumber, direction);
window.goToImage = (galleryNumber, imageIndex) => SliderManager.goToImage(galleryNumber, imageIndex);
window.addPhonePrefix = () => FormValidator.addPhonePrefix();
window.validatePhone = () => FormValidator.validatePhone();
window.submitForm = (event) => FormHandler.submitForm(event);
window.openNavigationApp = (event) => MapManager.openNavigationApp(event);

// Запуск приложения
new App();