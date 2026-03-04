document.addEventListener('DOMContentLoaded', () => {

    // --- STATE MANAGEMENT ---
    let currentUser = null;
    let cart = JSON.parse(localStorage.getItem('gotao_cart')) || [];
    let favorites = JSON.parse(localStorage.getItem('gotao_favorites')) || [];
    let favoritesFilterActive = false;

    // Products Database — loaded from API
    let products = [
        { id: 'aim', title: 'Aimbot', desc: 'Sistema de mira de precisão com randomização humanizada suave.', price: 24.90, type: 'individual', imgClass: 'product-img-url', imgSrc: 'aimbot_product_1772599993553.png' },
        { id: 'wall', title: 'Wallhack', desc: 'Módulo avançado de ESP com caixas delimitadoras de alta precisão.', price: 49.90, type: 'individual', imgClass: 'product-img-url', imgSrc: 'wallhack_product_1772600011243.png' },
        { id: 'radar', title: 'Radarhack', desc: 'Overlay de radar externo indetectável pelas verificações principais.', price: 29.90, type: 'individual', imgClass: 'product-img-url', imgSrc: 'radarhack_product_1772600025927.png' },

        { id: 'bun_aw', title: 'Aimbot + Wallhack', desc: 'O combo mais popular para dominação em partidas competitivas.', price: 59.90, type: 'bundle', imgClass: 'product-img-url', imgSrc: 'bundle_aw_product_1772600044996.png' },
        { id: 'bun_ar', title: 'Aimbot + Radarhack', desc: 'Domínio sutil e estratégico sem atrair a atenção do Overwatch.', price: 39.90, type: 'bundle', imgClass: 'product-img-url', imgSrc: 'bundle_ar_product_1772600060233.png' },
        { id: 'bun_all', title: 'Arsenal Completo', desc: 'Acesso total: Aimbot, Wallhack e Radarhack em um pacote só.', price: 79.90, type: 'bundle', imgClass: 'product-img-url', imgSrc: 'bundle_all_product_1772600077696.png' },

        { id: 'lifetime', title: 'ACESSO VITALÍCIO', desc: 'Todos os recursos para sempre + suporte prioritário V.I.P.', price: 699.90, type: 'vitalício', imgClass: 'product-img-url', imgSrc: 'lifetime_product_1772600091894.png' }
    ];

    // --- ADMIN DOM SECURITY ---
    const ADMIN_SVG_STRING = `
        <button class="nav-btn admin-btn" id="admin-btn" title="Painel Administrativo">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shadcn-user-cog">
                <path class="body-path" d="M2 21a8 8 0 0 1 10.434-7.62"/>
                <circle class="head-circle" cx="10" cy="8" r="5"/>
                <g class="cog-group">
                    <circle cx="18" cy="18" r="3" />
                    <path d="m14.305 19.53.923-.382" />
                    <path d="m15.228 16.852-.923-.383" />
                    <path d="m16.852 15.228-.383-.923" />
                    <path d="m16.852 20.772-.383.924" />
                    <path d="m19.148 15.228.383-.923" />
                    <path d="m19.53 21.696-.382-.924" />
                    <path d="m20.772 16.852.924-.383" />
                    <path d="m20.772 19.148.924.383" />
                </g>
            </svg>
        </button>
    `;

    // --- UI ELEMENTS ---
    const ui = {
        nav: document.getElementById('site-navbar'),
        navActions: document.getElementById('nav-actions'),
        viewAuth: document.getElementById('view-auth'),
        viewStore: document.getElementById('view-store'),
        cartToggleBtn: document.getElementById('cart-toggle-btn'),
        cartBadge: document.getElementById('cart-badge'),
        logoutBtn: document.getElementById('logout-btn'),
        loginForm: document.getElementById('login-form'),
        registerForm: document.getElementById('register-form'),
        showRegLink: document.getElementById('show-register'),
        showLoginLink: document.getElementById('show-login'),
        productGrid: document.getElementById('product-grid'),
        cartOverlay: document.getElementById('cart-overlay'),
        cartPanel: document.getElementById('cart-panel'),
        closeCartBtn: document.getElementById('close-cart-btn'),
        cartItemsContainer: document.getElementById('cart-items'),
        cartTotalPrice: document.getElementById('cart-total-price'),
        installmentInfo: document.getElementById('installment-info'),
        profileToggleBtn: document.getElementById('profile-toggle-btn'),
        profileModal: document.getElementById('profile-modal'),
        closeProfileBtn: document.getElementById('close-profile-btn'),
        saveAvatarBtn: document.getElementById('save-avatar-btn'),
        avatarGrid: document.getElementById('avatar-grid'),
        navAvatarImg: document.getElementById('nav-avatar-img'),
        favFilterBtn: document.getElementById('fav-filter-btn'),
        checkoutBtn: document.getElementById('checkout-btn')
    };

    const staticHeartTemplate = document.getElementById('static-heart-template').innerHTML;

    // --- NAVIGATION & VIEWS ---
    const showView = (viewName) => {
        ui.viewAuth.classList.remove('active');
        ui.viewStore.classList.remove('active');

        if (viewName === 'auth') {
            ui.viewAuth.classList.add('active');
            ui.nav.style.display = 'none';
        } else if (viewName === 'store') {
            ui.viewStore.classList.add('active');
            ui.nav.style.display = 'flex';
        }
    };

    const enforceAdminDOM = (user) => {
        const existingAdminBtn = document.getElementById('admin-btn');
        if (user && user.role === 'admin') {
            if (!existingAdminBtn) {
                ui.navActions.insertAdjacentHTML('afterbegin', ADMIN_SVG_STRING);
                // Wire navigation to admin dashboard
                const adminBtn = document.getElementById('admin-btn');
                if (adminBtn) {
                    adminBtn.addEventListener('click', () => {
                        window.location.href = '/admin.html';
                    });
                }
            }
        } else {
            if (existingAdminBtn) {
                existingAdminBtn.remove();
            }
        }
    };

    // --- AUTHENTICATION FLOW ---
    const handleLoginSuccess = async (user) => {
        currentUser = user;
        localStorage.setItem('gotao_user', JSON.stringify(user));

        enforceAdminDOM(user);
        updateAvatarDisplay(user.avatar || 'default');

        // Fetch products from API (falls back to hardcoded defaults)
        try {
            const res = await fetch('/api/products');
            const apiProducts = await res.json();
            if (Array.isArray(apiProducts) && apiProducts.length > 0) {
                products = apiProducts;
            }
        } catch (e) { /* use hardcoded fallback */ }

        showView('store');
        renderProducts();
        updateCartBadge();
    };

    const logout = () => {
        currentUser = null;
        localStorage.removeItem('gotao_user');
        enforceAdminDOM(null); // Completely destroys the Admin SVG from DOM
        cart = [];
        saveCart();
        updateCartBadge();
        showView('auth');
    };

    ui.logoutBtn.addEventListener('click', logout);

    // Initial session check
    const savedUser = JSON.parse(localStorage.getItem('gotao_user'));
    if (savedUser) {
        handleLoginSuccess(savedUser);
    } else {
        showView('auth');
    }

    // Toggle forms
    const toggleAuthForms = (e) => {
        e.preventDefault();
        ui.loginForm.classList.toggle('hidden');
        ui.loginForm.classList.toggle('active');
        ui.registerForm.classList.toggle('hidden');
        ui.registerForm.classList.toggle('active');
        document.querySelectorAll('.feedback, .alert-message').forEach(el => el.textContent = '');
        document.querySelectorAll('.input-group').forEach(el => el.classList.remove('invalid'));
    };

    ui.showRegLink.addEventListener('click', toggleAuthForms);
    ui.showLoginLink.addEventListener('click', toggleAuthForms);

    // Form Validator logic
    const validateField = (input, condition, msg) => {
        const group = input.parentElement;
        const feedback = group.querySelector('.feedback');
        if (!condition) {
            group.classList.add('invalid');
            feedback.textContent = msg;
            return false;
        }
        group.classList.remove('invalid');
        feedback.textContent = '';
        return true;
    };

    const validDomains = ['@gmail.com', '@outlook.com', '@hotmail.com', '@yahoo.com'];

    // Login Submit
    ui.loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-password').value;
        const msgDiv = document.getElementById('login-message');
        const btn = ui.loginForm.querySelector('button');

        const origHtml = btn.innerHTML;
        btn.innerHTML = '<span>VERIFICANDO...</span>'; btn.disabled = true;

        try {
            const res = await fetch('/api/login', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password: pass })
            });
            const data = await res.json();

            if (res.ok) {
                handleLoginSuccess(data);
            } else {
                msgDiv.textContent = data.error === 'Invalid credentials.' ? 'Credenciais inválidas.' : data.error;
                msgDiv.className = 'alert-message alert-error';
            }
        } catch (e) {
            msgDiv.textContent = 'Erro de conexão com o servidor local.'; msgDiv.className = 'alert-message alert-error';
        } finally {
            btn.innerHTML = origHtml; btn.disabled = false;
        }
    });

    // Register Submit
    ui.registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = document.getElementById('reg-username');
        const email = document.getElementById('reg-email');
        const pass = document.getElementById('reg-password');
        const msgDiv = document.getElementById('reg-message');

        const uValid = validateField(user, user.value.length >= 3, 'Mínimo de 3 caracteres');
        const eValid = validateField(email, validDomains.some(d => email.value.toLowerCase().endsWith(d)), 'Domínio inválido');
        const pValid = validateField(pass, pass.value.length >= 6, 'Mínimo de 6 caracteres');

        if (!uValid || !eValid || !pValid) return;

        const btn = ui.registerForm.querySelector('button');
        const origHtml = btn.innerHTML;
        btn.innerHTML = '<span>PROCESSANDO...</span>'; btn.disabled = true;

        try {
            const res = await fetch('/api/register', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user.value, email: email.value, password: pass.value })
            });
            const data = await res.json();
            if (res.ok) {
                msgDiv.textContent = 'Registro concluído com sucesso!'; msgDiv.className = 'alert-message alert-success';
                ui.registerForm.reset();
                setTimeout(() => toggleAuthForms(new Event('click')), 1500);
            } else {
                msgDiv.textContent = data.error === 'User already exists.' ? 'Usuário ou e-mail já existe.' : data.error;
                msgDiv.className = 'alert-message alert-error';
            }
        } catch (e) {
            msgDiv.textContent = 'Erro de conexão com o servidor local.'; msgDiv.className = 'alert-message alert-error';
        } finally {
            btn.innerHTML = origHtml; btn.disabled = false;
        }
    });


    // --- STORE RENDERING ---
    const renderProducts = () => {
        ui.productGrid.innerHTML = '';

        let displayProducts = products;
        if (favoritesFilterActive) {
            displayProducts = products.filter(p => favorites.includes(p.id));
        }

        if (displayProducts.length === 0) {
            ui.productGrid.innerHTML = '<p style="text-align:center; width:100%; color:rgba(255,255,255,0.5);">Nenhum produto favoritado.</p>';
            return;
        }

        displayProducts.forEach(p => {
            const el = document.createElement('div');
            el.className = 'glass-card product-card shine-effect';

            // Format price BR
            const priceFormatted = `R$ ${p.price.toFixed(2).replace('.', ',')}`;
            const timeSpan = p.type !== 'vitalício' ? '/mês' : '';

            // Ensure offsets have defaults
            const offsetX = p.imageOffsetX || 0;
            const offsetY = p.imageOffsetY || 0;

            // Check if favorited
            const isFav = favorites.includes(p.id) ? 'active' : '';

            el.innerHTML = `
                <div class="product-image-container" data-index="${p.id}">
                    <img src="${p.imgSrc || ''}" class="store-product-img" alt="${p.title}" style="transform: translate(${offsetX}px, ${offsetY}px)" />
                    <div class="product-image-overlay"></div>
                    <span class="product-badge">${p.type.toUpperCase()}</span>
                    <div class="product-heart-wrap" data-id="${p.id}">
                        ${staticHeartTemplate.replace('static-heart-btn', `static-heart-btn ${isFav}`)}
                    </div>
                </div>
                <div class="product-content">
                    <h3 class="product-title">${p.title}</h3>
                    <p class="product-desc">${p.desc}</p>
                    <div class="product-footer">
                        <span class="product-price">${priceFormatted}${timeSpan}</span>
                        <button class="neon-button purple-variant add-cart" data-id="${p.id}">
                            <span>ADICIONAR</span>
                        </button>
                    </div>
                </div>
            `;
            ui.productGrid.appendChild(el);
        });

        // Bind static heart toggle & save
        document.querySelectorAll('.product-heart-wrap .static-heart-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget;
                const parent = target.closest('.product-heart-wrap');
                const id = parent.getAttribute('data-id');

                target.classList.toggle('active');

                if (target.classList.contains('active')) {
                    if (!favorites.includes(id)) favorites.push(id);
                } else {
                    favorites = favorites.filter(favId => favId !== id);
                    if (favoritesFilterActive) renderProducts(); // Auto-remove from view if filtering
                }

                localStorage.setItem('gotao_favorites', JSON.stringify(favorites));
            });
        });

        // Bind Cart buttons
        document.querySelectorAll('.add-cart').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                addToCart(id);
            });
        });
    };

    // --- GLOBAL FAVORITES FILTER ---
    if (ui.favFilterBtn) {
        ui.favFilterBtn.addEventListener('click', () => {
            favoritesFilterActive = !favoritesFilterActive;
            ui.favFilterBtn.classList.toggle('active', favoritesFilterActive);
            renderProducts();
        });
    }

    // --- CART SYSTEM ---
    const saveCart = () => localStorage.setItem('gotao_cart', JSON.stringify(cart));
    const updateCartBadge = () => { ui.cartBadge.textContent = cart.length; };

    const formatBRL = (num) => `R$ ${num.toFixed(2).replace('.', ',')}`;

    const addToCart = (id) => {
        const product = products.find(p => p.id === id);
        if (!product) return;

        // Prevent duplicate lifetimes
        if (product.type === 'vitalício' && cart.some(item => item.type === 'vitalício')) {
            alert('Acesso vitalício já foi adicionado ao carrinho.');
            return;
        }

        cart.push(product);
        saveCart();
        updateCartBadge();
        renderCart();
        openCart();
    };

    const removeFromCart = (index) => {
        cart.splice(index, 1);
        saveCart();
        updateCartBadge();
        renderCart();
    };

    const calculateInstallments = (price, isLifetime) => {
        if (!isLifetime) {
            // Regular products: Up to 3x without interest
            const installValue = price / 3;
            return `3x de ${formatBRL(installValue)} sem juros`;
        } else {
            // Lifetime: Up to 10x without interest, 12x with 15% interest
            // For UI simplicity according to plan, return the 12x option as premium
            const totalWithInterest = price * 1.15;
            const installValue = totalWithInterest / 12;
            return `12x de ${formatBRL(installValue)} com juros`;
        }
    };

    const renderCart = () => {
        ui.cartItemsContainer.innerHTML = '';
        let total = 0;
        let hasLifetime = false;

        if (cart.length === 0) {
            ui.cartItemsContainer.innerHTML = '<p class="cart-empty">Seu carrinho está vazio.</p>';
            ui.cartTotalPrice.textContent = 'R$ 0,00';
            ui.installmentInfo.innerHTML = '';
            return;
        }

        cart.forEach((item, index) => {
            total += item.price;
            if (item.type === 'vitalício') hasLifetime = true;

            const el = document.createElement('div');
            el.className = 'cart-item';
            el.innerHTML = `
                <div class="cart-item-info">
                    <h4>${item.title}</h4>
                    <p>${formatBRL(item.price)}</p>
                </div>
                <button class="remove-item-btn" data-index="${index}">&times;</button>
            `;
            ui.cartItemsContainer.appendChild(el);
        });

        ui.cartTotalPrice.textContent = formatBRL(total);

        // Global Installment Info (Footer)
        if (ui.installmentInfo) {
            const installmentText = calculateInstallments(total, hasLifetime);
            ui.installmentInfo.innerHTML = `
                <div style="text-align: right; color: var(--neon-green); font-size: 0.9rem; font-weight: 500;">
                    ou até ${installmentText}
                </div>
            `;
        }

        document.querySelectorAll('.remove-item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                removeFromCart(e.currentTarget.getAttribute('data-index'));
            });
        });
    };

    const openCart = () => {
        renderCart();
        ui.cartOverlay.classList.add('active');
        ui.cartPanel.classList.add('active');
    };
    const closeCart = () => {
        ui.cartOverlay.classList.remove('active');
        ui.cartPanel.classList.remove('active');
    };

    ui.cartToggleBtn.addEventListener('click', openCart);
    ui.closeCartBtn.addEventListener('click', closeCart);
    ui.cartOverlay.addEventListener('click', closeCart);


    // --- PROFILE / AVATAR SYSTEM ---
    const avatars = ['avatar-1', 'avatar-2', 'avatar-3'];
    let selectedAvatarClass = 'avatar-1';

    // Update visual navbar
    function updateAvatarDisplay(avatarClass) {
        if (avatarClass === 'default') {
            ui.navAvatarImg.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%23222"/><circle cx="50" cy="50" r="20" fill="%23aaa"/></svg>';
            return;
        }

        let svgStr = '';
        if (avatarClass === 'avatar-1') svgStr = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%23222"/><circle cx="50" cy="50" r="30" fill="%238A2BE2"/></svg>';
        if (avatarClass === 'avatar-2') svgStr = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%23222"/><circle cx="50" cy="50" r="30" fill="%2339FF14"/></svg>';
        if (avatarClass === 'avatar-3') svgStr = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%23222"/><rect x="20" y="20" width="60" height="60" fill="%238A2BE2"/></svg>';
        ui.navAvatarImg.src = `data:image/svg+xml;utf8,${svgStr}`;
    }

    const openProfile = () => {
        ui.avatarGrid.innerHTML = '';
        avatars.forEach(av => {
            const el = document.createElement('div');
            el.className = `avatar-option ${av}`;
            if (currentUser && currentUser.avatar === av) el.classList.add('selected');

            el.addEventListener('click', () => {
                document.querySelectorAll('.avatar-option').forEach(n => n.classList.remove('selected'));
                el.classList.add('selected');
                selectedAvatarClass = av;
            });
            ui.avatarGrid.appendChild(el);
        });

        ui.profileModal.classList.add('active');
    };

    const closeProfile = () => ui.profileModal.classList.remove('active');

    ui.profileToggleBtn.addEventListener('click', openProfile);
    ui.closeProfileBtn.addEventListener('click', closeProfile);

    ui.saveAvatarBtn.addEventListener('click', async () => {
        if (!currentUser) return;

        const btn = ui.saveAvatarBtn;
        const origHtml = btn.innerHTML;
        btn.innerHTML = '<span>SALVANDO...</span>'; btn.disabled = true;

        try {
            const res = await fetch('/api/updateUser', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: currentUser.username, avatar: selectedAvatarClass })
            });

            if (res.ok) {
                currentUser.avatar = selectedAvatarClass;
                localStorage.setItem('gotao_user', JSON.stringify(currentUser));
                updateAvatarDisplay(selectedAvatarClass);
                closeProfile();
            }
        } catch (e) {
            console.error('Falha ao atualizar avatar.');
        } finally {
            btn.innerHTML = origHtml; btn.disabled = false;
        }
    });

    // --- EFFECTS ---
    const particlesContainer = document.getElementById('particles');
    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.style.position = 'absolute';
        particle.style.width = Math.random() * 4 + 1 + 'px';
        particle.style.height = particle.style.width;
        particle.style.background = Math.random() > 0.5 ? 'var(--neon-purple)' : 'var(--neon-green)';
        particle.style.borderRadius = '50%';
        particle.style.left = Math.random() * 100 + 'vw';
        particle.style.top = Math.random() * 100 + 'vh';
        particle.style.opacity = Math.random() * 0.5;
        particle.style.boxShadow = `0 0 10px ${particle.style.background}`;
        // GPU acceleration optimization
        particle.style.willChange = 'transform';
        const duration = Math.random() * 10 + 5;
        particle.style.animation = `float ${duration}s infinite linear alternate`;
        particlesContainer.appendChild(particle);
    }

    // --- CHECKOUT REDIRECTION ---
    if (ui.checkoutBtn) {
        ui.checkoutBtn.addEventListener('click', () => {
            if (cart.length === 0) {
                alert('Seu carrinho está vazio!');
                return;
            }
            window.location.href = '/checkout.html';
        });
    }
});
