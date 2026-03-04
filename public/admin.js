document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // SECURITY: Frontend role guard
    // ==========================================
    const savedUser = JSON.parse(localStorage.getItem('gotao_user'));
    if (!savedUser || savedUser.role !== 'admin') {
        // Non-admins cannot even render this page
        window.location.href = '/';
        return; // Halt all script execution
    }

    const currentUser = savedUser;

    // ==========================================
    // STATE
    // ==========================================
    let products = [];
    let hasChanges = false;

    // ==========================================
    // UI ELEMENTS
    // ==========================================
    const ui = {
        sidebar: document.getElementById('sidebar'),
        mobileMenuBtn: document.getElementById('mobile-menu-btn'),
        logoutBtn: document.getElementById('admin-logout-btn'),
        greeting: document.getElementById('admin-greeting'),
        statProducts: document.getElementById('stat-total-products'),
        statUsers: document.getElementById('stat-total-users'),
        statAvgPrice: document.getElementById('stat-avg-price'),
        productsGrid: document.getElementById('products-admin-grid'),
        saveAllBtn: document.getElementById('save-all-btn'),
        addProductBtn: document.getElementById('add-product-btn'),
        toastContainer: document.getElementById('toast-container')
    };

    // Set greeting
    ui.greeting.textContent = `Bem-vindo, ${currentUser.username}.`;

    // ==========================================
    // SIDEBAR NAVIGATION
    // ==========================================
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    const views = document.querySelectorAll('.admin-view');

    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = link.getAttribute('data-view');

            sidebarLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            views.forEach(v => {
                v.classList.remove('active');
                if (v.id === `view-${target}`) v.classList.add('active');
            });

            // Close mobile sidebar
            ui.sidebar.classList.remove('open');
        });
    });

    // Mobile menu toggle
    ui.mobileMenuBtn.addEventListener('click', () => {
        ui.sidebar.classList.toggle('open');
    });

    // Logout
    ui.logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('gotao_user');
        window.location.href = '/';
    });

    // ==========================================
    // TOAST SYSTEM
    // ==========================================
    const showToast = (message, type = 'success') => {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icon = type === 'success'
            ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#39FF14" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>'
            : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff3333" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';

        toast.innerHTML = `${icon}<span class="toast-message">${message}</span>`;
        ui.toastContainer.appendChild(toast);

        setTimeout(() => toast.remove(), 4000);
    };

    // ==========================================
    // LOADING OVERLAY
    // ==========================================
    const showLoading = () => {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.id = 'loading-overlay';
        overlay.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(overlay);
    };
    const hideLoading = () => {
        const el = document.getElementById('loading-overlay');
        if (el) el.remove();
    };

    // ==========================================
    // CHANGE TRACKING
    // ==========================================
    const markChanged = () => {
        hasChanges = true;
        ui.saveAllBtn.classList.add('visible');
    };

    const clearChanges = () => {
        hasChanges = false;
        ui.saveAllBtn.classList.remove('visible');
        document.querySelectorAll('.admin-product-card.changed').forEach(c => c.classList.remove('changed'));
    };

    // ==========================================
    // FETCH PRODUCTS
    // ==========================================
    const fetchProducts = async () => {
        try {
            const res = await fetch('/api/products');
            products = await res.json();
            updateStats();
            renderProductCards();
        } catch (e) {
            showToast('Erro ao carregar produtos.', 'error');
        }
    };

    // ==========================================
    // UPDATE DASHBOARD STATS
    // ==========================================
    const updateStats = () => {
        ui.statProducts.textContent = products.length;

        const avg = products.length > 0
            ? (products.reduce((sum, p) => sum + p.price, 0) / products.length)
            : 0;
        ui.statAvgPrice.textContent = `R$ ${avg.toFixed(2).replace('.', ',')}`;

        // User count is approximate (we don't have a public API for it)
        ui.statUsers.textContent = '—';
    };

    // ==========================================
    // RENDER PRODUCT CARDS
    // ==========================================
    const renderProductCards = () => {
        ui.productsGrid.innerHTML = '';

        products.forEach((product, index) => {
            const card = document.createElement('div');
            card.className = 'admin-product-card';
            card.setAttribute('data-index', index);

            const imgSrc = product.imgSrc || '';
            const imgUrl = imgSrc.startsWith('http') ? imgSrc : `/${imgSrc}`;
            // Provide defaults if undefined
            if (product.imageOffsetX === undefined) product.imageOffsetX = 0;
            if (product.imageOffsetY === undefined) product.imageOffsetY = 0;

            card.innerHTML = `
                <div class="card-image-section" data-index="${index}">
                    <img src="${imgUrl}" alt="${product.title}" onerror="this.style.display='none'" />
                    <div class="card-image-overlay"></div>
                    <span class="card-type-badge">${(product.type || 'individual').toUpperCase()}</span>
                    <button class="change-image-btn" data-index="${index}">Alterar Imagem</button>
                    <input type="file" class="hidden-file-input" data-index="${index}" accept=".jpg,.jpeg,.png,.webp" />
                </div>
                <div class="card-body">
                    <div class="card-field">
                        <label>Nome do Produto</label>
                        <input type="text" class="field-title" data-index="${index}" value="${product.title}" />
                    </div>
                    <div class="card-field">
                        <label>Descrição</label>
                        <textarea class="field-desc" data-index="${index}">${product.desc}</textarea>
                    </div>
                    <div class="card-row">
                        <div class="card-field">
                            <label>Preço (R$)</label>
                            <input type="number" class="field-price" data-index="${index}" value="${product.price}" min="0" step="0.01" />
                        </div>
                        <div class="card-field">
                            <label>Tipo</label>
                            <select class="field-type" data-index="${index}">
                                <option value="individual" ${product.type === 'individual' ? 'selected' : ''}>Individual</option>
                                <option value="bundle" ${product.type === 'bundle' ? 'selected' : ''}>Bundle</option>
                                <option value="vitalício" ${product.type === 'vitalício' ? 'selected' : ''}>Vitalício</option>
                            </select>
                        </div>
                    </div>
                    <div class="card-actions">
                        <button class="card-delete-btn" data-index="${index}">Excluir</button>
                    </div>
                </div>
            `;

            ui.productsGrid.appendChild(card);
        });

        // Bind events
        bindCardEvents();
    };

    // ==========================================
    // BIND CARD EVENTS (INCLUDING IMAGE DRAG)
    // ==========================================
    const bindCardEvents = () => {
        // 1. Initial Image Sizing & Offset Application
        document.querySelectorAll('.card-image-section img').forEach((img) => {
            const wrap = img.closest('.card-image-section');
            const idx = parseInt(wrap.getAttribute('data-index'));
            const p = products[idx];

            const applySizeAndPosition = () => {
                const wrapRatio = wrap.offsetWidth / wrap.offsetHeight;
                const imgRatio = img.naturalWidth / img.naturalHeight;

                if (imgRatio > wrapRatio) {
                    img.style.height = '100%';
                    img.style.width = 'auto';
                } else {
                    img.style.width = '100%';
                    img.style.height = 'auto';
                }

                // Clamp existing offsets just in case container resized
                setTimeout(() => {
                    const minX = wrap.offsetWidth - img.offsetWidth;
                    const minY = wrap.offsetHeight - img.offsetHeight;
                    p.imageOffsetX = Math.max(Math.min(minX, 0), Math.min(0, p.imageOffsetX));
                    p.imageOffsetY = Math.max(Math.min(minY, 0), Math.min(0, p.imageOffsetY));
                    img.style.transform = `translate(${p.imageOffsetX}px, ${p.imageOffsetY}px)`;
                }, 10);
            };

            if (img.complete) {
                applySizeAndPosition();
            } else {
                img.addEventListener('load', applySizeAndPosition);
            }
        });

        // 2. Drag & Drop Repositioning Logic
        document.querySelectorAll('.card-image-section').forEach(container => {
            let isDragging = false;
            let startClientX = 0;
            let startClientY = 0;
            let startOffsetX = 0;
            let startOffsetY = 0;
            let img = container.querySelector('img');
            const idx = parseInt(container.getAttribute('data-index'));

            const startDrag = (e) => {
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const clientY = e.touches ? e.touches[0].clientY : e.clientY;
                // Exclude clicks on overlay buttons
                if (e.target.tagName.toLowerCase() === 'button' || e.target.closest('button')) return;

                isDragging = true;
                container.classList.add('grabbing');
                startClientX = clientX;
                startClientY = clientY;
                startOffsetX = products[idx].imageOffsetX || 0;
                startOffsetY = products[idx].imageOffsetY || 0;
            };

            const doDrag = (e) => {
                if (!isDragging) return;
                e.preventDefault(); // Prevent text selection / default drag
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const clientY = e.touches ? e.touches[0].clientY : e.clientY;

                const deltaX = clientX - startClientX;
                const deltaY = clientY - startClientY;

                let newX = startOffsetX + deltaX;
                let newY = startOffsetY + deltaY;

                // Clamp to prevent empty space
                const minX = container.offsetWidth - img.offsetWidth;
                const minY = container.offsetHeight - img.offsetHeight;

                newX = Math.max(Math.min(minX, 0), Math.min(0, newX));
                newY = Math.max(Math.min(minY, 0), Math.min(0, newY));

                img.style.transform = `translate(${newX}px, ${newY}px)`;

                // Store temporarily on DOM element to save on mouseup
                img.dataset.currentX = newX;
                img.dataset.currentY = newY;
            };

            const endDrag = () => {
                if (!isDragging) return;
                isDragging = false;
                container.classList.remove('grabbing');

                const finalX = parseFloat(img.dataset.currentX);
                const finalY = parseFloat(img.dataset.currentY);

                if (!isNaN(finalX) && !isNaN(finalY)) {
                    if (products[idx].imageOffsetX !== finalX || products[idx].imageOffsetY !== finalY) {
                        products[idx].imageOffsetX = finalX;
                        products[idx].imageOffsetY = finalY;
                        markChanged();
                    }
                }
            };

            // Mouse Events
            container.addEventListener('mousedown', startDrag);
            window.addEventListener('mousemove', doDrag);
            window.addEventListener('mouseup', endDrag);

            // Touch Events
            container.addEventListener('touchstart', startDrag, { passive: false });
            window.addEventListener('touchmove', doDrag, { passive: false });
            window.addEventListener('touchend', endDrag);
        });

        // Change tracking on inputs
        document.querySelectorAll('.field-title, .field-desc, .field-price, .field-type').forEach(input => {
            input.addEventListener('input', (e) => {
                const idx = parseInt(e.target.getAttribute('data-index'));
                const card = e.target.closest('.admin-product-card');
                card.classList.add('changed');

                // Sync to state
                if (e.target.classList.contains('field-title')) products[idx].title = e.target.value;
                if (e.target.classList.contains('field-desc')) products[idx].desc = e.target.value;
                if (e.target.classList.contains('field-price')) products[idx].price = parseFloat(e.target.value) || 0;
                if (e.target.classList.contains('field-type')) products[idx].type = e.target.value;

                markChanged();
            });
        });

        // Image change buttons
        document.querySelectorAll('.change-image-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = e.currentTarget.getAttribute('data-index');
                const fileInput = document.querySelector(`.hidden-file-input[data-index="${idx}"]`);
                fileInput.click();
            });
        });

        // File input change (upload)
        document.querySelectorAll('.hidden-file-input').forEach(input => {
            input.addEventListener('change', async (e) => {
                const idx = parseInt(e.target.getAttribute('data-index'));
                const file = e.target.files[0];
                if (!file) return;

                // Validate size
                if (file.size > 10 * 1024 * 1024) {
                    showToast('Arquivo muito grande. Máximo: 10MB.', 'error');
                    return;
                }

                // Validate type
                const allowed = ['image/jpeg', 'image/png', 'image/webp'];
                if (!allowed.includes(file.type)) {
                    showToast('Tipo inválido. Use JPG, PNG ou WebP.', 'error');
                    return;
                }

                // Preview immediately
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const card = document.querySelector(`.admin-product-card[data-index="${idx}"]`);
                    const img = card.querySelector('.card-image-section img');
                    img.src = ev.target.result;
                    img.style.display = 'block';
                };
                reader.readAsDataURL(file);

                // Upload to server
                showLoading();
                try {
                    const formData = new FormData();
                    formData.append('username', currentUser.username);
                    formData.append('image', file);

                    const res = await fetch('/api/admin/upload', {
                        method: 'POST',
                        body: formData
                    });
                    const data = await res.json();

                    if (res.ok) {
                        products[idx].imgSrc = data.imgSrc;
                        markChanged();
                        showToast('Imagem carregada com sucesso!');
                    } else {
                        showToast(data.error || 'Erro no upload.', 'error');
                    }
                } catch (e) {
                    showToast('Erro de conexão durante upload.', 'error');
                } finally {
                    hideLoading();
                }
            });
        });

        // Delete buttons
        document.querySelectorAll('.card-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-index'));
                const name = products[idx].title;
                if (confirm(`Tem certeza que deseja excluir "${name}"?`)) {
                    products.splice(idx, 1);
                    markChanged();
                    renderProductCards();
                    updateStats();
                    showToast(`"${name}" removido.`);
                }
            });
        });
    };

    // ==========================================
    // ADD NEW PRODUCT
    // ==========================================
    ui.addProductBtn.addEventListener('click', () => {
        const newProduct = {
            id: `new_${Date.now()}`,
            title: 'Novo Produto',
            desc: 'Descrição do produto.',
            price: 0,
            type: 'individual',
            imgSrc: '',
            imageOffsetX: 0,
            imageOffsetY: 0
        };
        products.push(newProduct);
        markChanged();
        renderProductCards();
        updateStats();
        showToast('Novo produto adicionado. Edite os campos.');

        // Scroll to bottom
        setTimeout(() => {
            const grid = ui.productsGrid;
            const lastCard = grid.lastElementChild;
            if (lastCard) lastCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    });

    // ==========================================
    // SAVE ALL PRODUCTS
    // ==========================================
    ui.saveAllBtn.addEventListener('click', async () => {
        // Validate
        for (const p of products) {
            if (!p.title || p.title.trim() === '') {
                showToast('Todos os produtos precisam de um nome.', 'error');
                return;
            }
            if (typeof p.price !== 'number' || p.price < 0 || isNaN(p.price)) {
                showToast(`Preço inválido para "${p.title}".`, 'error');
                return;
            }
        }

        showLoading();

        // FAB Save loading state
        ui.saveAllBtn.disabled = true;
        const originalFabHtml = ui.saveAllBtn.innerHTML;
        ui.saveAllBtn.innerHTML = '<div class="spinner-small"></div><span>Salvando...</span>';

        try {
            const res = await fetch('/api/admin/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: currentUser.username, // SECURITY: sent for backend re-validation
                    products: products
                })
            });
            const data = await res.json();

            if (res.ok) {
                clearChanges();
                showToast('Produtos salvos com sucesso!');
            } else {
                showToast(data.error || 'Erro ao salvar.', 'error');
            }
        } catch (e) {
            showToast('Erro de conexão ao salvar.', 'error');
        } finally {
            hideLoading();
            ui.saveAllBtn.innerHTML = originalFabHtml;
            ui.saveAllBtn.disabled = false;
        }
    });

    // ==========================================
    // INIT
    // ==========================================
    fetchProducts();
});
