document.addEventListener('DOMContentLoaded', () => {
    // ---- Elements ----
    const paymentOptions = document.querySelectorAll('.payment-option');
    const paymentForms = document.querySelectorAll('.payment-form');

    // Credit Card Simulation Elements
    const ccInner = document.getElementById('cc-inner');
    const ccNumInput = document.getElementById('input-cc-num');
    const ccNameInput = document.getElementById('input-cc-name');
    const ccExpInput = document.getElementById('input-cc-exp');
    const ccCvvInput = document.getElementById('input-cc-cvv');

    const ccDisplayNum = document.getElementById('cc-display-number');
    const ccDisplayName = document.getElementById('cc-display-name');
    const ccDisplayExp = document.getElementById('cc-display-exp');
    const ccDisplayCvv = document.getElementById('cc-display-cvv');

    // Pix & Boleto Elements
    const pixCountdown = document.getElementById('pix-countdown');
    const copyPixBtn = document.getElementById('copy-pix-btn');
    const boletoVencimento = document.getElementById('boleto-vencimento');

    // Cart Output Elements
    const checkoutItemsWrapper = document.getElementById('checkout-items');
    const checkoutTotalPrice = document.getElementById('checkout-total-price');
    const checkoutInstallmentsText = document.getElementById('checkout-installments');
    const finishPaymentBtn = document.getElementById('finish-payment-btn');

    // ---- Load Cart Data ----
    const loadCartData = () => {
        const cartStr = localStorage.getItem('gotao_cart');
        const cart = cartStr ? JSON.parse(cartStr) : [];

        if (cart.length === 0) {
            alert('Seu carrinho está vazio. Redirecionando para a loja.');
            window.location.href = '/';
            return;
        }

        let total = 0;
        let hasLifetime = false;

        cart.forEach(item => {
            total += item.price;
            if (item.type === 'vitalício') hasLifetime = true;

            const el = document.createElement('div');
            el.className = 'checkout-item';
            el.innerHTML = `
                <span class="checkout-item-title">${item.title}</span>
                <span class="checkout-item-price">${formatBRL(item.price)}</span>
            `;
            checkoutItemsWrapper.appendChild(el);
        });

        checkoutTotalPrice.textContent = formatBRL(total);

        // Calculate Installments (Matches store logic)
        if (hasLifetime) {
            const jurosTotal = total * 1.15;
            checkoutInstallmentsText.innerHTML = `ou 12x de ${formatBRL(jurosTotal / 12)} com juros`;
        } else {
            checkoutInstallmentsText.innerHTML = `ou 3x de ${formatBRL(total / 3)} sem juros`;
        }
    };

    // ---- Utility Formatter ----
    const formatBRL = (value) => {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    // ---- Payment Method Toggles ----
    paymentOptions.forEach(option => {
        option.addEventListener('click', () => {
            // Update Active Tab
            paymentOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');

            // Check radio intentionally
            const radio = option.querySelector('input[type="radio"]');
            if (radio) radio.checked = true;

            // Show corresponding Form Content Layout
            const method = option.getAttribute('data-method');
            paymentForms.forEach(form => form.classList.remove('active'));
            document.getElementById(`form-${method}`).classList.add('active');

            if (method === 'pix') startPixTimer();
        });
    });

    // ---- Credit Card 3D Interactions ----

    // CVV Flip Logic (Focus = Front To Back, Blur = Back To Front)
    ccCvvInput.addEventListener('focus', () => {
        ccInner.classList.add('flipped');
    });
    ccCvvInput.addEventListener('blur', () => {
        ccInner.classList.remove('flipped');
    });

    // Formatting & Binding: Card Number
    ccNumInput.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, ''); // Remove non-digits
        val = val.replace(/(.{4})/g, '$1 ').trim(); // Add space every 4 digits
        e.target.value = val;

        ccDisplayNum.textContent = val !== '' ? val : '0000 0000 0000 0000';
    });

    // Formatting & Binding: Name
    ccNameInput.addEventListener('input', (e) => {
        // Apenas letras (com suporte a acentuação) e espaços
        let val = e.target.value.replace(/[^a-zA-ZÀ-ÿ\s]/g, '').toUpperCase();
        e.target.value = val;
        ccDisplayName.textContent = val !== '' ? val : 'NOME DO TITULAR';
    });

    // Formatting & Binding: Expiry (MM/AA)
    ccExpInput.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length > 2) {
            val = val.substring(0, 2) + '/' + val.substring(2, 4);
        }
        e.target.value = val;
        ccDisplayExp.textContent = val !== '' ? val : 'MM/AA';
    });

    // Formatting & Binding: CVV
    ccCvvInput.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '');
        e.target.value = val;
        ccDisplayCvv.textContent = val !== '' ? val : 'CVV';
    });


    // ---- Fake PIX Timer Logic ----
    let pixTimerInterval;
    const startPixTimer = () => {
        clearInterval(pixTimerInterval);
        let timeRemaining = 600; // 10 minutes (in seconds)

        const updateTimer = () => {
            const m = Math.floor(timeRemaining / 60).toString().padStart(2, '0');
            const s = (timeRemaining % 60).toString().padStart(2, '0');
            pixCountdown.textContent = `${m}:${s}`;
            timeRemaining--;
            if (timeRemaining < 0) clearInterval(pixTimerInterval);
        };

        updateTimer();
        pixTimerInterval = setInterval(updateTimer, 1000);
    };

    copyPixBtn.addEventListener('click', () => {
        const key = document.getElementById('pix-key');
        key.select();
        document.execCommand('copy');
        showToast('Chave Pix Copiada!', 'success');
    });

    // ---- Fake Boleto Expiry Generation ----
    const initBoleto = () => {
        const today = new Date();
        today.setDate(today.getDate() + 3); // Em 3 dias úteis visualmente
        boletoVencimento.textContent = today.toLocaleDateString('pt-BR');
    };

    // ---- Toast Notification System ----
    const showToast = (msg, type = 'success') => {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const el = document.createElement('div');
        el.className = `toast toast-${type} active`;
        el.innerText = msg;

        container.appendChild(el);
        setTimeout(() => el.classList.remove('active'), 2500);
        setTimeout(() => el.remove(), 2800);
    };

    // ---- Finish Checkout Action ----
    finishPaymentBtn.addEventListener('click', () => {
        const method = document.querySelector('input[name="paymentMethod"]:checked').value;
        finishPaymentBtn.innerHTML = '<span class="spinner"></span> Processando...';

        setTimeout(() => {
            localStorage.removeItem('gotao_cart'); // Clear cart
            showToast('Pagamento aprovado com sucesso!', 'success');
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        }, 1500); // Fake 1.5s loading duration
    });


    // INIT
    loadCartData();
    initBoleto();
});
