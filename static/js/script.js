// Конфигурация
const CONFIG = {
    sliderInterval: 8000,
    galleryInterval: 5000,
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
    mainNav: null,
    navClose: null,
    galleryPopup: null,
    popupImage: null,
    popupClose: null,
    prevBtn: null,
    nextBtn: null,
    popupCounter: null
};

// Состояние приложения
const STATE = {
    currentSlide: 0,
    galleryIntervals: new Map(),
    isModalOpen: false,
    isMobileMenuOpen: false,
    videoStates: new Map(), // Для отслеживания состояния видео в каждой галерее
    currentMediaIndex: 0,
    galleryData: [],
    scrollPosition: 0
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
                    const bg = img.getAttribute('data-bg');
                    if (bg) {
                        img.style.backgroundImage = `url(${bg})`;
                        img.removeAttribute('data-bg');
                    }
                    observer.unobserve(img);
                }
            });
        }, {
            rootMargin: '50px 0px',
            threshold: 0.1
        });

        lazyImages.forEach(img => imageObserver.observe(img));
    },

    // Получить случайный эмодзи
    getRandomEmoji() {
        return EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    },

    // Предзагрузка критичных изображений
    preloadCriticalImages() {
        const criticalImages = [
            'images/logo5.png',
            'images/b_1.JPEG'
        ];
        
        criticalImages.forEach(src => {
            const img = new Image();
            img.src = src;
        });
    }
};

// Менеджер мобильного меню
const MobileMenuManager = {
    init() {
        DOM.burgerMenu = document.getElementById('burgerMenu');
        DOM.mainNav = document.getElementById('mainNav');
        DOM.navClose = document.getElementById('navClose');
        
        if (DOM.burgerMenu && DOM.mainNav) {
            DOM.burgerMenu.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleMobileMenu();
            });
            
            if (DOM.navClose) {
                DOM.navClose.addEventListener('click', () => this.closeMobileMenu());
            }
            
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

            // Закрытие меню при нажатии Escape
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && STATE.isMobileMenuOpen) {
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
        document.body.style.overflow = '';
        STATE.isMobileMenuOpen = false;
    }
};

const VideoGalleryManager = {
    init() {
        this.setupVideoObservers();
        this.preloadVideos();
    },

    preloadVideos() {
        // Предзагрузка всех видео
        document.querySelectorAll('.gallery-video').forEach(video => {
            video.load();
            // Устанавливаем стратегию загрузки
            video.preload = 'auto';
        });
    },

    setupVideoObservers() {
        const videoGalleries = document.querySelectorAll('.image-gallery');
        
        videoGalleries.forEach((gallery) => {
            const video = gallery.querySelector('.gallery-video');
            if (!video) return;

            const galleryId = gallery.dataset.gallery;
            
            // Инициализируем состояние видео
            STATE.videoStates.set(galleryId, {
                played: false,
                currentTime: 0,
                isVisible: false
            });

            // Наблюдатель за видимостью с более агрессивными настройками
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.handleGalleryVisible(galleryId, video, entry.intersectionRatio);
                    } else {
                        this.handleGalleryHidden(galleryId, video);
                    }
                });
            }, {
                threshold: [0, 0.1, 0.5, 0.8, 1], // Множественные пороги
                rootMargin: '150px 0px 150px 0px' // Больший запас
            });

            observer.observe(gallery);

            // Обработчики событий видео
            video.addEventListener('loadeddata', () => {
                console.log('Video loaded for gallery:', galleryId);
            });

            video.addEventListener('canplaythrough', () => {
                console.log('Video can play through for gallery:', galleryId);
            });

            video.addEventListener('error', (e) => {
                console.error('Video error:', e);
                this.handleVideoError(galleryId, gallery);
            });

            video.addEventListener('ended', () => {
                this.handleVideoEnded(galleryId, gallery);
            });
        });
    },

    handleGalleryVisible(galleryId, video, intersectionRatio) {
        const state = STATE.videoStates.get(galleryId);
        if (!state) return;

        const gallery = video.closest('.image-gallery');
        const isActive = gallery.querySelector('.gallery-video.active');
        
        if (isActive && !state.played && intersectionRatio > 0.3) {
            this.forcePlayVideo(video, galleryId);
        }
    },

    async forcePlayVideo(video, galleryId) {
        try {
            // Сбрасываем и запускаем видео
            video.currentTime = 0;
            
            // Несколько попыток воспроизведения
            const playPromise = video.play();
            
            if (playPromise !== undefined) {
                await playPromise;
                console.log('Video autoplay successful for gallery:', galleryId);
                
                const state = STATE.videoStates.get(galleryId);
                if (state) {
                    state.played = true;
                }
                return true;
            }
        } catch (error) {
            console.log('Autoplay failed, trying fallback:', error);
            return this.fallbackAutoplay(video, galleryId);
        }
    },

    fallbackAutoplay(video, galleryId) {
        // Альтернативный метод автовоспроизведения
        return new Promise((resolve) => {
            video.muted = true; // Убеждаемся, что видео без звука
            
            // Пытаемся воспроизвести с задержкой
            setTimeout(() => {
                video.play().then(() => {
                    console.log('Fallback autoplay successful');
                    const state = STATE.videoStates.get(galleryId);
                    if (state) {
                        state.played = true;
                    }
                    resolve(true);
                }).catch(error => {
                    console.log('Fallback autoplay also failed:', error);
                    this.showPlayIndicator(video);
                    resolve(false);
                });
            }, 300);
        });
    },

    handleGalleryHidden(galleryId, video) {
        const state = STATE.videoStates.get(galleryId);
        if (!state) return;

        // Не останавливаем видео полностью, только приостанавливаем если оно не активно
        if (!video.classList.contains('active')) {
            video.pause();
            state.currentTime = video.currentTime;
        }
    },

    handleVideoEnded(galleryId, gallery) {
        const state = STATE.videoStates.get(galleryId);
        if (!state) return;

        state.played = true;
        state.currentTime = 0;

        // Автоматически перезапускаем видео вместо переключения на изображения
        const video = gallery.querySelector('.gallery-video');
        if (video) {
            setTimeout(() => {
                video.currentTime = 0;
                video.play().catch(e => console.log('Loop play failed:', e));
            }, 100);
        }
    },

    handleVideoError(galleryId, gallery) {
        console.warn('Video failed to load, falling back to images');
        this.fallbackToImages(galleryId, gallery);
    },

    fallbackToImages(galleryId, gallery) {
        const video = gallery.querySelector('.gallery-video');
        const images = gallery.querySelectorAll('.gallery-image');
        
        if (video && images.length > 0) {
            video.style.display = 'none';
            if (images[0]) images[0].classList.add('active');
        }
        
        SliderManager.startGalleryAutoSlide(galleryId);
    },

    showPlayIndicator(video) {
        // Убираем старый индикатор если есть
        const oldIndicator = video.parentElement.querySelector('.video-play-indicator');
        if (oldIndicator) oldIndicator.remove();

        const playButton = document.createElement('div');
        playButton.className = 'video-play-indicator';
        playButton.innerHTML = '▶';
        playButton.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 60px;
            height: 60px;
            background: rgba(82, 91, 77, 0.9);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 24px;
            cursor: pointer;
            z-index: 100;
            backdrop-filter: blur(10px);
            border: 2px solid white;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        `;
        
        playButton.addEventListener('click', (e) => {
            e.stopPropagation();
            video.play().then(() => {
                playButton.remove();
            }).catch(error => {
                console.log('Manual play failed:', error);
            });
        });

        const galleryContent = video.closest('.gallery-content');
        if (galleryContent) {
            galleryContent.style.position = 'relative';
            galleryContent.appendChild(playButton);
        }
    },

    restartVideo(galleryId) {
        const gallery = document.querySelector(`[data-gallery="${galleryId}"]`);
        if (!gallery) return;

        const video = gallery.querySelector('.gallery-video');
        const state = STATE.videoStates.get(galleryId);
        
        if (video && state) {
            state.played = false;
            state.currentTime = 0;
            video.currentTime = 0;
            
            // Активируем видео
            gallery.querySelectorAll('.gallery-image').forEach(img => {
                img.classList.remove('active');
            });
            gallery.querySelectorAll('.gallery-video').forEach(vid => {
                vid.classList.remove('active');
            });
            video.classList.add('active');
            
            // Немедленно пытаемся воспроизвести
            this.forcePlayVideo(video, galleryId);
        }
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
        const slides = document.querySelectorAll('.background-slider .slide');
        if (!slides.length) return;

        setInterval(() => {
            slides[STATE.currentSlide].classList.remove('active');
            STATE.currentSlide = (STATE.currentSlide + 1) % slides.length;
            slides[STATE.currentSlide].classList.add('active');
        }, CONFIG.sliderInterval);
    },

    initGallerySliders() {
        document.querySelectorAll('[data-gallery]').forEach((gallery) => {
            const galleryId = gallery.dataset.gallery;
            if (galleryId !== 'reviews') {
                // Для галерей с видео не запускаем автослайд сразу
                const hasVideo = gallery.querySelector('.gallery-video');
                if (!hasVideo) {
                    this.startGalleryAutoSlide(galleryId);
                }
            }
        });
    },

    initReviewsSlider() {
        this.startGalleryAutoSlide('reviews');
    },

     startGalleryAutoSlide(galleryId) {
        // Для галерей с видео не запускаем автослайд, если видео активно
        if (galleryId === '1') {
            const state = STATE.videoStates.get(galleryId);
            if (state && !state.played) {
                return; // Ждем пока видео не закончится
            }
        }

        const gallerySelector = `[data-gallery="${galleryId}"]`;
        const gallery = document.querySelector(gallerySelector);
        if (!gallery) return;

        const media = gallery.querySelectorAll('.gallery-image, .gallery-video');
        let currentMedia = 0;
        const totalMedia = media.length;

        if (totalMedia === 0) return;

        // Очистка предыдущего интервала
        if (STATE.galleryIntervals.has(galleryId)) {
            clearInterval(STATE.galleryIntervals.get(galleryId));
        }

        const intervalTime = galleryId === 'reviews' ? CONFIG.galleryInterval : CONFIG.sliderInterval;

        const interval = setInterval(() => {
            // Для галереи с видео проверяем состояние
            if (galleryId === '1') {
                const state = STATE.videoStates.get(galleryId);
                if (state && !state.played) {
                    return; // Не переключаем пока видео не закончится
                }
            }

            media[currentMedia].classList.remove('active');
            
            currentMedia = (currentMedia + 1) % totalMedia;
            
            // Если переключаемся на видео, перезапускаем его
            if (media[currentMedia].classList.contains('gallery-video')) {
                VideoGalleryManager.restartVideo(galleryId);
            } else {
                media[currentMedia].classList.add('active');
                
                // Если переключаемся с видео на изображение, пауза видео
                const video = gallery.querySelector('.gallery-video');
                if (video && video.classList.contains('active')) {
                    video.classList.remove('active');
                    video.pause();
                }
            }
        }, intervalTime);

        STATE.galleryIntervals.set(galleryId, interval);
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

        const media = gallery.querySelectorAll('.gallery-image, .gallery-video');
        
        if (media.length === 0) return;

        let currentMedia = Array.from(media).findIndex(item => item.classList.contains('active'));
        if (currentMedia === -1) currentMedia = 0;
        
        media[currentMedia].classList.remove('active');
        
        if (direction === 1) {
            currentMedia = (currentMedia + 1) % media.length;
        } else {
            currentMedia = (currentMedia - 1 + media.length) % media.length;
        }
        
        // Если переключаемся на видео, перезапускаем его
        if (media[currentMedia].classList.contains('gallery-video')) {
            VideoGalleryManager.restartVideo(galleryId);
        } else {
            media[currentMedia].classList.add('active');
        }
        
        // Обновляем эмодзи для отзывов
        if (galleryId === 'reviews') {
            this.updateReviewEmoji(media[currentMedia]);
        }
        
        // Перезапускаем автослайд
        this.startGalleryAutoSlide(galleryId);
    },

    goToImage(galleryId, imageIndex) {
        const gallerySelector = `[data-gallery="${galleryId}"]`;
        const gallery = document.querySelector(gallerySelector);
        if (!gallery) return;

        const media = gallery.querySelectorAll('.gallery-image, .gallery-video');
        
        if (media.length === 0) return;

        media.forEach(item => item.classList.remove('active'));
        
        if (media[imageIndex]) {
            // Если переключаемся на видео, перезапускаем его
            if (media[imageIndex].classList.contains('gallery-video')) {
                VideoGalleryManager.restartVideo(galleryId);
            } else {
                media[imageIndex].classList.add('active');
            }
        }
        
        // Обновляем эмодзи для отзывов
        if (galleryId === 'reviews') {
            this.updateReviewEmoji(media[imageIndex]);
        }
        
        // Перезапускаем автослайд
        this.startGalleryAutoSlide(galleryId);
    }


};

// Менеджер модальных окон
const ModalManager = {
    init() {
        DOM.modals.contact = document.getElementById('contactModal');
        DOM.modals.text = document.getElementById('textModal');
        
        // Обработчики закрытия модальных окон
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    },

    openModal() {
        if (STATE.isModalOpen) return;
        
        if (DOM.modals.contact) {
            DOM.modals.contact.style.display = 'flex';
            DOM.modals.contact.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            STATE.isModalOpen = true;
        }
    },

    closeModal() {
        if (DOM.modals.contact) {
            DOM.modals.contact.style.display = 'none';
            DOM.modals.contact.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
            STATE.isModalOpen = false;
        }
    },

    openTextModal(title, text) {
        if (STATE.isModalOpen) return;
        
        const titleElement = document.getElementById('textModalTitle');
        const bodyElement = document.getElementById('textModalBody');
        
        if (titleElement && bodyElement && DOM.modals.text) {
            titleElement.textContent = title;
            bodyElement.textContent = text;
            DOM.modals.text.style.display = 'flex';
            DOM.modals.text.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            STATE.isModalOpen = true;
        }
    },

    closeTextModal() {
        if (DOM.modals.text) {
            DOM.modals.text.style.display = 'none';
            DOM.modals.text.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
            STATE.isModalOpen = false;
        }
    },

    closeAllModals() {
        this.closeModal();
        this.closeTextModal();
        GalleryManager.closeMediaPopup();
        MobileMenuManager.closeMobileMenu();
    },

    handleOutsideClick(event) {
        if (event.target === DOM.modals.contact) {
            this.closeModal();
        }
        if (event.target === DOM.modals.text) {
            this.closeTextModal();
        }
        if (event.target.classList.contains('gallery-popup')) {
            GalleryManager.closeMediaPopup();
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
        if (DOM.inputs.phone && DOM.inputs.phone.value === '') {
            DOM.inputs.phone.value = '+7';
        }
    },

    validatePhone() {
        if (!DOM.inputs.phone) return true;
        
        const phoneError = document.getElementById('phoneError');
        
        if (DOM.inputs.phone.value && !CONFIG.phoneRegex.test(DOM.inputs.phone.value)) {
            if (phoneError) {
                phoneError.style.display = 'block';
                phoneError.textContent = 'Введите номер в формате +71112223344';
            }
            DOM.inputs.phone.style.borderColor = 'var(--error-color)';
            return false;
        } else {
            if (phoneError) {
                phoneError.style.display = 'none';
            }
            DOM.inputs.phone.style.borderColor = '#e0e0e0';
            return true;
        }
    },

    updateMessageCounter() {
        if (!DOM.inputs.message) return;
        
        const messageCounter = document.getElementById('messageCounter');
        if (!messageCounter) return;
        
        const currentLength = DOM.inputs.message.value.length;
        
        messageCounter.textContent = `${currentLength}/${CONFIG.messageMaxLength}`;
        messageCounter.style.color = currentLength > CONFIG.messageMaxLength ? 'var(--error-color)' : '#999';
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
        
        if (!DOM.forms.contact) return;
        
        const formData = new FormData(DOM.forms.contact);
        
        if (!FormValidator.validateForm(formData)) {
            return;
        }
        
        const submitButton = DOM.forms.contact.querySelector('.submit-button');
        const originalText = submitButton ? submitButton.textContent : 'Отправить';
        
        // Показ состояния загрузки
        if (submitButton) {
            submitButton.textContent = 'Отправка...';
            submitButton.disabled = true;
        }
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
            if (submitButton) {
                submitButton.textContent = originalText;
                submitButton.disabled = false;
            }
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
                const href = link.getAttribute('href');
                if (href === '#' || !href.startsWith('#')) return;
                
                e.preventDefault();
                
                const targetId = href.substring(1); // Убираем # из начала
                this.scrollToSection(targetId);
            });
        });
    },
    
    scrollToSection(sectionId) {
        const element = document.getElementById(sectionId);
        if (element) {
            const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
            const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
            const offsetPosition = elementPosition - headerHeight - 20;
            
            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    },

    setupScrollHeader() {
        let lastScrollTop = 0;
        const header = document.querySelector('.header');
        if (!header) return;
        
        const handleScroll = Utils.throttle(() => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            
            // Добавляем/убираем фон при прокрутке
            if (scrollTop > 100) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
            
            // Скрываем/показываем хедер при прокрутке
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

        // Наблюдаем за элементами, которые должны анимироваться при скролле
        document.querySelectorAll('.hero-content, .text-content, .about-content, .price-card').forEach(el => {
            observer.observe(el);
        });
    }
};

// Галерея парка
// Галерея парка
const GalleryManager = {
    init() {
        this.initGalleryElements();
        this.loadGalleryData();
    },

    initGalleryElements() {
        this.galleryGrid = document.getElementById('galleryGrid');
        this.galleryPopup = document.getElementById('galleryPopup');
        this.popupImage = document.getElementById('popupImage');
        this.popupClose = document.getElementById('popupClose');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.popupCounter = document.getElementById('popupCounter');

        if (!this.galleryGrid || !this.galleryPopup) return;

        // Обработчики событий
        if (this.popupClose) {
            this.popupClose.addEventListener('click', () => this.closeMediaPopup());
        }
        
        if (this.prevBtn) {
            this.prevBtn.addEventListener('click', () => this.prevMedia());
        }
        
        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', () => this.nextMedia());
        }

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

    loadGalleryData() {
        if (!this.galleryGrid) return;

        // Показываем индикатор загрузки
        this.galleryGrid.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #718096; grid-column: 1 / -1;">
                <div class="loading" style="margin: 0 auto 15px;"></div>
                <p>Загрузка галереи...</p>
            </div>
        `;
        
        // Загружаем данные галереи с сервера
        fetch('/gallery-data')
            .then(response => response.json())
            .then(data => {
                if (data.success && data.images) {
                    this.renderGallery(data.images);
                } else {
                    this.showError();
                }
            })
            .catch(error => {
                console.error('Error loading gallery:', error);
                this.showError();
            });
    },

    renderGallery(images) {
        if (!this.galleryGrid) return;

        // Очищаем контейнер
        this.galleryGrid.innerHTML = '';
        
        if (!images || images.length === 0) {
            this.galleryGrid.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #718096; grid-column: 1 / -1;">
                    <div style="font-size: 48px; margin-bottom: 15px;">🖼️</div>
                    <p>Галерея пуста</p>
                    <p style="font-size: 14px; margin-top: 10px;">Изображения скоро появятся</p>
                </div>
            `;
            STATE.galleryData = [];
            return;
        }
        
        // Создаем элементы галереи
        images.forEach((image, index) => {
            const galleryItem = document.createElement('div');
            galleryItem.className = 'gallery-item';
            galleryItem.setAttribute('data-index', index);
            
            galleryItem.innerHTML = `
                <img class="gallery-img" src="/static/${image.path}" alt="${image.alt || 'Фотография парка'}" 
                     loading="lazy" style="width: 100%; height: 250px; object-fit: cover; border-radius: 8px;">
            `;
            
            this.galleryGrid.appendChild(galleryItem);
            
            // Добавляем обработчик клика
            galleryItem.addEventListener('click', () => this.openMediaPopup(index));
        });

        // Сохраняем данные в STATE
        STATE.galleryData = images.map(img => ({
            type: 'image',
            src: `/static/${img.path}`,
            alt: img.alt || 'Фотография парка'
        }));
    },

    showError() {
        if (!this.galleryGrid) return;
        
        this.galleryGrid.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #e53e3e; grid-column: 1 / -1;">
                <div style="font-size: 48px; margin-bottom: 15px;">⚠️</div>
                <p>Ошибка загрузки галереи</p>
                <button onclick="GalleryManager.loadGalleryData()" 
                        style="margin-top: 15px; padding: 8px 16px; background: #4299e1; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Попробовать снова
                </button>
            </div>
        `;
        STATE.galleryData = [];
    },

    // Открытие попапа с медиа
    openMediaPopup(index) {
        if (!this.galleryPopup || !STATE.galleryData.length) return;
        
        STATE.currentMediaIndex = index;
        this.updatePopupMedia();
        this.galleryPopup.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    },

    // Обновление медиа в попапе
    updatePopupMedia() {
        if (!this.popupImage || !this.popupCounter) return;
        
        const currentItem = STATE.galleryData[STATE.currentMediaIndex];
        if (!currentItem) return;
        
        if (currentItem.type === 'image') {
            this.popupImage.src = currentItem.src;
            this.popupImage.alt = currentItem.alt;
            this.popupImage.style.display = 'block';
        }
        
        // Обновляем счетчик
        this.popupCounter.textContent = `${STATE.currentMediaIndex + 1} / ${STATE.galleryData.length}`;
    },

    // Закрытие попапа
    closeMediaPopup() {
        if (!this.galleryPopup) return;
        
        this.galleryPopup.style.display = 'none';
        document.body.style.overflow = '';
    },

    // Переход к следующему медиа
    nextMedia() {
        if (!STATE.galleryData.length) return;
        
        STATE.currentMediaIndex = (STATE.currentMediaIndex + 1) % STATE.galleryData.length;
        this.updatePopupMedia();
    },

    // Переход к предыдущему медиа
    prevMedia() {
        if (!STATE.galleryData.length) return;
        
        STATE.currentMediaIndex = (STATE.currentMediaIndex - 1 + STATE.galleryData.length) % STATE.galleryData.length;
        this.updatePopupMedia();
    }
};

// Яндекс карты
const MapManager = {
    init() {
        this.loadYandexMaps();
        this.setupNavigationHandler();
    },

    initYandexMap() {
        // Проверяем, загружена ли API Яндекс.Карт
        if (typeof ymaps !== 'undefined') {
            ymaps.ready(() => {
                const mapContainer = document.getElementById('yandex-map');
                if (!mapContainer) return;
                
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
                    iconColor: '#525B4D'
                });
                
                map.geoObjects.add(parkPlacemark);
                
                // Открываем балун при загрузке
                parkPlacemark.balloon.open();
            });
        } else {
            console.warn('Yandex Maps API не загружена');
            this.showFallbackMap();
        }
    },

    // Функция для открытия навигационного приложения
    openNavigationApp(event) {
        if (event) {
            event.preventDefault();
        }
        
        const lat = 61.4776;
        const lon = 30.0307;
        
        // Проверяем, является ли устройство мобильным
        const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
            // Пытаемся открыть Яндекс.Навигатор
            setTimeout(() => {
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

    setupNavigationHandler() {
        const navButton = document.querySelector('.nav-button');
        if (navButton) {
            navButton.addEventListener('click', (e) => this.openNavigationApp(e));
        }
    },

    // Загрузка API Яндекс.Карт
    loadYandexMaps() {
        const mapContainer = document.getElementById('yandex-map');
        if (!mapContainer) {
            this.showFallbackMap();
            return;
        }

        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = 'https://api-maps.yandex.ru/2.1/?apikey=ваш_ключ_api&lang=ru_RU';
        script.onload = () => this.initYandexMap();
        script.onerror = () => {
            console.error('Ошибка загрузки Яндекс.Карт');
            this.showFallbackMap();
        };
        document.head.appendChild(script);
    },

    showFallbackMap() {
        const mapContainer = document.getElementById('yandex-map');
        if (!mapContainer) return;
        
        mapContainer.innerHTML = `
            <!--<div style="background:#f0f0f0;display:flex;align-items:center;justify-content:center;color:#666;border-radius:12px;">
                <div style="text-align:center;padding:20px;">
                    <h4 style="margin-bottom:10px;color:#525B4D;">Эко-парк «Долина водопадов»</h4>
                    <p style="margin-bottom:5px;">Координаты: 61.4776° 30.0307°</p>
                    <p style="margin-bottom:15px;">Республика Карелия</p>
                    <a href="https://yandex.ru/maps/?pt=30.0307,61.4776&z=14&l=map" 
                       target="_blank" 
                       style="color:#819079;text-decoration:underline;font-weight:500;">
                        Открыть в Яндекс.Картах
                    </a>
                </div>
            </div>-->
        `;
    }
};

// Оптимизация производительности
const PerformanceManager = {
    init() {
        this.setupLazyLoading();
        this.optimizeAnimations();
        this.preventLayoutShifts();
    },

    setupLazyLoading() {
        // Ленивая загрузка изображений
        Utils.lazyLoadImages();
        
        // Ленивая загрузка iframe
        const lazyIframes = document.querySelectorAll('iframe[loading="lazy"]');
        const iframeObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const iframe = entry.target;
                    iframe.src = iframe.dataset.src;
                    iframeObserver.unobserve(iframe);
                }
            });
        });
        
        lazyIframes.forEach(iframe => iframeObserver.observe(iframe));
    },

    optimizeAnimations() {
        // Отключаем анимации для пользователей, предпочитающих уменьшенное движение
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            document.documentElement.style.setProperty('--transition', 'none');
        }
    },

    preventLayoutShifts() {
        // Резервируем место для изображений
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            if (!img.hasAttribute('width') || !img.hasAttribute('height')) {
                const width = img.naturalWidth || 300;
                const height = img.naturalHeight || 200;
                img.setAttribute('width', width);
                img.setAttribute('height', height);
            }
        });
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
        PerformanceManager.init();
        MobileMenuManager.init();
        ModalManager.init();
        FormValidator.init();
        VideoGalleryManager.init();
        SliderManager.init();
        NavigationManager.init();
        GalleryManager.init();
        MapManager.init();
    }

    setupEventListeners() {
        // Глобальные обработчики
        document.addEventListener('click', (e) => ModalManager.handleOutsideClick(e));
        
        // Обработчики формы
        if (DOM.inputs.phone) {
            DOM.inputs.phone.addEventListener('input', () => FormValidator.validatePhone());
            DOM.inputs.phone.addEventListener('blur', () => FormValidator.validatePhone());
        }
        
        if (DOM.inputs.message) {
            DOM.inputs.message.addEventListener('input', () => FormValidator.updateMessageCounter());
            // Инициализация счетчика
            setTimeout(() => FormValidator.updateMessageCounter(), 100);
        }
        
        if (DOM.forms.contact) {
            DOM.forms.contact.addEventListener('submit', (e) => FormHandler.submitForm(e));
        }

        // Обработчик изменения размера окна
        window.addEventListener('resize', Utils.debounce(() => {
            this.handleResize();
        }, 250));
    }

    setupPerformanceOptimizations() {
        // Предзагрузка критичных изображений
        Utils.preloadCriticalImages();
        
        // Очистка при покидании страницы
        window.addEventListener('beforeunload', () => {
            STATE.galleryIntervals.forEach(interval => clearInterval(interval));
        });

        // Оптимизация для медленных соединений
        if (navigator.connection && navigator.connection.saveData) {
            this.enableSaveDataMode();
        }
    }

    handleResize() {
        // Переинициализация видео при изменении размера окна
        VideoGalleryManager.init();
    }

    enableSaveDataMode() {
        // Отключаем автовоспроизведение видео
        const videos = document.querySelectorAll('video');
        videos.forEach(video => {
            video.removeAttribute('autoplay');
        });
        
        // Уменьшаем качество изображений
        const images = document.querySelectorAll('img[data-src]');
        images.forEach(img => {
            const originalSrc = img.getAttribute('data-src');
            if (originalSrc.includes('webp')) {
                img.setAttribute('data-src', originalSrc.replace('.webp', '.jpeg'));
            }
        });
    }
}

document.querySelectorAll('.hero-button').forEach(button => {
    button.addEventListener('click', (e) => {
        e.preventDefault();
        const href = button.getAttribute('href');
        NavigationManager.scrollToSection(href.substring(1)); // Убираем # из href
    });
});

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
window.scrollToSection = (sectionId) => NavigationManager.scrollToSection(sectionId);

// Запуск приложения
new App();