/* eslint-disable import/no-unresolved */
/* eslint-disable no-console */

// Order Dropin Modules
import * as orderApi from '@dropins/storefront-order/api.js';
import { events } from '@dropins/tools/event-bus.js';
import { loadCSS } from '../../scripts/aem.js';

loadCSS('/blocks/redsys-payment/redsys-payment.css');

// eslint-disable-next-line no-unused-vars
let cartData = null;
// eslint-disable-next-line no-unused-vars
let checkoutData = null;
let merchantOrder = null;
let config = null;
let redsysLoadingPromise = null;
let listenerRegistered = false;
let idOper = null;
let paymentConfig = null;

function getPaymentConfig() {
  if (!checkoutData) {
    throw new Error('Checkout data not initialized.');
  }

  if (paymentConfig) {
    return paymentConfig;
  }

  const redsysPaymentMethod = checkoutData.selectedPaymentMethod?.code === 'redsys'
    ? checkoutData.selectedPaymentMethod
    : checkoutData.availablePaymentMethods?.find(
      (method) => method.code === 'redsys',
    );

  if (!redsysPaymentMethod?.oope_payment_method_config?.backend_integration_url) {
    throw new Error('Redsys payment configuration not found.');
  }

  // eslint-disable-next-line no-shadow
  const config = JSON.parse(
    redsysPaymentMethod.oope_payment_method_config.backend_integration_url,
  );

  paymentConfig = {
    ...config,
    paymentUrl: `${config.baseUrl}/api/v1/web/redsys-commerce/payment`,
    paymentInsiteUrl: `${config.baseUrl}/api/v1/web/redsys-commerce/payment-insite`,
    webhookUrl: `${config.baseUrl}/api/v1/web/redsys-commerce/webhook`,
    initParamsUrl: `${config.baseUrl}/api/v1/web/redsys-commerce/init-params`,
  };

  return paymentConfig;
}

function getRedsysOrigin(environment) {
  return environment === 'production'
    ? 'https://sis.redsys.es'
    : 'https://sis-t.redsys.es:25443';
}

function showPaymentError() {
  const container = document.getElementById('redsys-payment-error');

  if (container) {
    container.textContent = 'El pago no ha sido autorizado. Revisa los datos de la tarjeta.';
    container.style.display = 'block';
  }
}

function loadRedsysJs(environment) {
  if (redsysLoadingPromise) {
    return redsysLoadingPromise;
  }

  if (window.getInSiteForm && window.storeIdOper) {
    return Promise.resolve();
  }

  const url = environment === 'production'
    ? `${getRedsysOrigin(environment)}/sis/NC/redsysV3.js`
    : `${getRedsysOrigin(environment)}/sis/NC/sandbox/redsysV3.js`;

  // Create a new loading promise
  redsysLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return redsysLoadingPromise;
}

export async function loadInitParams() {
  if (config) {
    return config;
  }
  const { initParamsUrl } = getPaymentConfig();

  const response = await fetch(initParamsUrl);
  if (!response.ok) {
    throw new Error('Unable to load Redsys configuration');
  }
  config = await response.json();
  return config;
}

// eslint-disable-next-line no-shadow
async function mountPaymentForm(merchantOrder) {
  const init = await loadInitParams();

  await loadRedsysJs(init.environment);
  if (!listenerRegistered) {
    window.addEventListener('message', (event) => {
      if (!event.origin.startsWith('https://sis')) {
        return;
      }
      window.storeIdOper(
        event,
        'token',
        'errorCode',
        () => true,
      );
      idOper = document.getElementById('token')?.value;
    });
    listenerRegistered = true;
  }
  document.getElementById('card-form').innerHTML = '';
  window.getInSiteForm(
    'card-form',
    '',
    '',
    '',
    '',
    'Pagar con Redsys',
    init.merchantCode,
    init.terminal,
    merchantOrder,
    'ES',
    true,
    false,
    'inline',
    true,
  );
  setTimeout(() => {
    const iframe = document.querySelector('#card-form iframe');

    iframe?.contentWindow.postMessage(
      'domain',
      getRedsysOrigin(init.environment),
    );
  }, 500);
}

export async function redirectToRedsys(cartId) {
  const order = await orderApi.placeOrder(cartId);
  const orderId = order.number;

  const cart = events.lastPayload('cart/data');
  const amount = cart?.total?.includingTax?.value;

  if (!amount) {
    throw new Error('Cart total not available');
  }
  const {
    paymentUrl,
    webhookUrl,
  } = getPaymentConfig();

  const res = await fetch(paymentUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      orderId,
      amount,
      urlOk: `${window.location.origin}/order-details?orderRef=${orderId}`,
      urlKo: `${window.location.origin}/order-details?orderRef=${orderId}`,
      callbackUrl: webhookUrl,
    }),
  });

  const data = await res.json();

  if (!data?.url || !data?.params) {
    throw new Error('Invalid Redsys response');
  }

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = data.url;

  Object.entries(data.params).forEach(([key, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = value;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
  form.remove();
}

export async function handleRedsysPayment(cartId) {
  const init = await loadInitParams();
  const targetOrigin = getRedsysOrigin(init.environment);

  const error = document.getElementById('errorCode')?.value;

  if (error) {
    console.error('Redsys token error', error);
    showPaymentError();
    return false;
  }

  // Obtener idOper del iframe Redsys
  if (!idOper) {
    const iframe = document.querySelector('#card-form iframe');

    if (!iframe) {
      console.error('Redsys iframe not found');
      return false;
    }

    iframe.contentWindow.postMessage(
      {
        payFromModule: true,
        validation: 'OK',
      },
      targetOrigin,
    );

    return new Promise((resolve) => {
      const interval = setInterval(() => {
        const token = document.getElementById('token')?.value;
        const errorCode = document.getElementById('errorCode')?.value;

        if (errorCode) {
          clearInterval(interval);
          console.error('Redsys token error', errorCode);
          showPaymentError();
          resolve(false);
          return;
        }

        if (!token) {
          return;
        }

        clearInterval(interval);

        idOper = token;

        resolve(handleRedsysPayment(cartId));
      }, 100);
    });
  }

  const cart = events.lastPayload('cart/data');
  const amount = cart.total.includingTax.value;
  const { paymentInsiteUrl } = getPaymentConfig();

  const paymentResponse = await fetch(paymentInsiteUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      merchantOrder,
      amount,
      idOper,
    }),
  });
  if (!paymentResponse.ok) {
    showPaymentError();
    return false;
  }
  const paymentData = await paymentResponse.json();
  if (!paymentData.success) {
    showPaymentError();
    return false;
  }
  await orderApi.placeOrder(cartId);

  return true;
}

export async function renderRedsysPaymentMethod(ctx) {
  const init = await loadInitParams();

  if (init.paymentFlow === 'redirect') {
    const content = document.createElement('div');
    content.id = 'redsys-payment-redirect';

    content.innerHTML = `
      <div>
        Pay securely with Redsys (Redirect)
      </div>
    `;

    ctx.replaceHTML(content);
    return;
  }

  // InSite mode
  const content = document.createElement('div');
  content.id = 'redsys-payment-form';

  // Ensure a child element exists for Redsys
  const redsysContainer = document.createElement('div');
  redsysContainer.id = 'redsys-elements-container';
  redsysContainer.classList.add('redsys-elements-loading');

  redsysContainer.innerHTML = `
    <div id="redsys-payment-error" class="dropin-alert dropin-alert--error" style="display:none;"></div>
    <div id="card-form"></div>
    <input type="hidden" id="token">
    <input type="hidden" id="errorCode">
  `;

  content.appendChild(redsysContainer);
  ctx.replaceHTML(content);

  requestAnimationFrame(async () => {
    try {
      merchantOrder = Date.now().toString().slice(-12);
      await mountPaymentForm(merchantOrder);
      redsysContainer.classList.remove('redsys-elements-loading');
    } catch (error) {
      redsysContainer.classList.remove('redsys-elements-loading');
      console.error('Failed to initialize Redsys payment form:', error);

      redsysContainer.innerHTML = `
        <div class="dropin-alert dropin-alert--error">
          Unable to load payment form. Please refresh and try again.
        </div>
      `;
    }
  });
}

// Listen for checkout initialization to set up Redsys payment
events.on(
  'checkout/initialized',
  (data) => {
    checkoutData = data;
  },
  { eager: true },
);

// Listen for cart data
events.on('cart/initialized', (data) => {
  cartData = data;
}, { eager: true });

// Default export for block initialization (if used as a block)
export default function decorate() {}
