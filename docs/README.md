# Redsys EDS Block

An injectable EDS block by Redsys that provides encapsulated, reusable payment functionality, including:
- rendering the payment form
- processing payments
- handling payment errors

Payment errors are displayed through the block error container:

#redsys-payment-error

## Installation and usage

### Add the block to your EDS storefront

If you have not set up your EDS storefront yet,

- [See an overview](https://experienceleague.adobe.com/developer/commerce/storefront/get-started/) of the EDS storefront architecture.
- [Install dependencies](https://github.com/adobe-commerce/aio-cli-plugin-commerce?tab=readme-ov-file#prerequisites) required to set up an EDS storefront locally.
- Set up the EDS storefront using the below commands:

  ```sh
  # Run these commands from your desired project directory
  aio login
  gh auth login
  aio commerce init
  git clone git@github.com:user/initialized-eds-storefront.git
  cd initialized-eds-storefront

  # Run from the EDS storefront root directory
  npm start
  ```

With your EDS storefront set up, copy the `blocks/redsys-payment/` folder from the app into your EDS project's `blocks/redsys-payment/` directory.

### Extend the OOPE GraphQL Schema

Redsys requires initialization data from the Adobe Commerce GraphQL API.
You can extend the GraphQL schema to return that data by making the below adjustments:

1. In `build.mjs` at the root folder of your EDS Storefront, add the following code to extend the OOPE GraphQL schema:

```js
overrideGQLOperations([
  {
    npm: '@dropins/storefront-checkout',
    operations: [
      `
  fragment CHECKOUT_DATA_FRAGMENT on Cart {
    available_payment_methods {
      code
      title
      oope_payment_method_config {
        backend_integration_url
        custom_config {
          ... on CustomConfigKeyValue {
              key
              value
          }
        }
      }
    }
    selected_payment_method {
      code
      title
      oope_payment_method_config {
        backend_integration_url
        custom_config {
          ... on CustomConfigKeyValue {
              key
              value
          }
        }
      }
    }
  }
`,
    ],
  },
]);
```

2. Build the new schema by running `npm install` from the EDS storefront root directory. If successful, the new fragments will be added
   inside `scripts/__dropins__/storefront-checkout/fragments.js`.

3. The new data in the updated schema must be allowed through the checkout's data transformer.
   Edit your `scripts/initializers/checkout.js` to allow the data through the transformer.

```js
await initializeDropin(async () => {
  ...
  return initializers.mountImmediately(initialize, {
      langDefinitions,
      models: {
        CartModel: {
            transformer: (data) => {
              return {
                  availablePaymentMethods: data?.available_payment_methods,
                  selectedPaymentMethod: data?.selected_payment_method,
              };
            },
        },
      },
  });
})();
```

### Integrate the Redsys EDS block into your commerce-checkout block:

A boilerplate Commerce EDS storefront will use the `commerce-checkout` block which is located under
`blocks/commerce-checkout/commerce-checkout.js`. You can integrate this with
redsys by making some simple adjustments.

First, import the Redsys block's javascript component:

```javascript
import * as redsys from '../redsys-payment/redsys-payment.js';

let paymentMode = null;
let isRedirectingToRedsys = false;
```

Next, find the payment methods renderer and add a slot for the `redsys` payment method code:

```javascript
CheckoutProvider.render(PaymentMethods, {
  slots: {
    Methods: {
      ...
      redsys: {
        render: redsys.renderRedsysPaymentMethod,
      },
      ...
    },
  },
})
```

Extend handlePlaceOrder:

```javascript
CheckoutProvider.render(PlaceOrder, {
  handlePlaceOrder: async ({ cartId, code }) => {
    ...
      if (code === 'redsys') {
          if (!paymentMode) {
              const init = await redsys.loadInitParams();
              paymentMode = init.paymentFlow;
          }
          if (paymentMode === 'redirect') {
              isRedirectingToRedsys = true;
              await redsys.redirectToRedsys(cartId);
              return;
          }
          if (!await redsys.handleRedsysPayment(cartId)) {
              return;
          }
      }
    ...
    await orderApi.placeOrder(cartId);
  },
})
```

Finally, change these methods:

```javascript
events.on('order/placed', async (orderData) => {
if (isRedirectingToRedsys) return;
await handleOrderPlaced(orderData);
});
```

## Styling

Customize the appearance by modifying `blocks/redsys-payment/redsys-payment.css`.

## Adobe App Builder configuration

Configure the following Runtime actions:

- init-params
- payment
- payment-insite
- webhook

Required secrets:

- merchantCode
- terminal
- secretKey
- environment

## Payment flows

The block supports two modes:

### Redirect

The customer is redirected to Redsys payment page.

### InSite

The customer remains inside the checkout page.

The block:
1- Loads the Redsys InSite iframe.
2- Receives the payment token (idOper) from Redsys.
3- Sends the payment request server-side through Adobe App Builder Runtime.
4- Confirms the payment response.
5- Allows Commerce checkout to create the order.

## Redsys InSite domain configuration

For InSite payments, the storefront domain must be registered in Redsys administration.

Example:

https://main--store--org.aem.page