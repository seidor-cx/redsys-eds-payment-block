# Installing the Redsys App for Adobe Commerce

## Overview

This guide explains how to install and configure the Redsys App for Adobe Commerce.

The application provides a secure payment integration between Adobe Commerce and the Redsys payment platform using Adobe App Builder Runtime. It supports both Redirect and InSite payment flows while keeping merchant credentials securely on the server side.

## Features

- Redsys Redirect payments
- Redsys InSite embedded payments
- Secure server-side signature generation
- Webhook processing
- Multi-store support
- Adobe Commerce SaaS, PaaS, and on-premises integration
- Adobe App Builder Runtime architecture

## Supported platforms

The Redsys app supports the following Adobe Commerce deployments:

- Adobe Commerce as a Cloud Service (SaaS)
- Adobe Commerce on Cloud (PaaS)
- Adobe Commerce on-premises

## Before you begin

The required Adobe Commerce configuration depends on the deployment type.

### Adobe Commerce as a Cloud Service

For Adobe Commerce as a Cloud Service, you need an active Commerce Cloud Service instance.

The Commerce REST endpoint can be obtained from the Commerce Cloud Service instance details.

### Adobe Commerce PaaS / on-premises

For Adobe Commerce on Cloud (PaaS) or on-premises deployments, you need:

- The base URL of the Adobe Commerce installation.
- The Commerce store code used by the storefront.
- An Adobe Commerce Integration with the permissions required by the Redsys app.
- The OAuth 1.0a credentials generated for that integration:

  - Consumer Key
  - Consumer Secret
  - Access Token
  - Access Token Secret

For these deployments, the configured base URL must point to the Adobe Commerce installation itself, for example:

`https://www.example.com`

The application builds REST API paths using the configured store code:

`/rest/<store_code>/V1/...`

The eventing API uses:

`/rest/all/V1/eventing/...`

## Install the App via Adobe Exchange Marketplace

To install the Redsys app:

1. Navigate to the Redsys app listing on the Adobe Exchange Marketplace.
2. Click **Free** and follow the instructions to install the application into your organization's Adobe environment.
3. The application will appear under **Adobe Exchange App Management**. If approval is required, an account administrator must review and approve the application.
4. Open your Adobe Commerce Admin.
5. Navigate to **Stores > Settings > Configuration > Adobe Services > Admin UI SDK**.
6. Enable the **Admin UI SDK** and set **Refresh registrations on schedule** to daily.
7. Click **Configure extensions**.
8. Select **Redsys** and click **Save**.
9. The **Redsys** menu will appear in the Adobe Commerce Admin.
10. Open **Redsys Configuration** and enter the required Commerce and Redsys settings.

No source code download, local `.env` configuration, or manual App Builder deployment is required to install the application from Adobe Exchange.

## Redsys Configuration

Before you can access the Redsys configuration page, you will need to register the Redsys app in your Adobe Commerce Admin area. You can do this by following the steps below:

1. Log into your Adobe Commerce Admin area.

2. Navigate to **Stores > Settings > Configuration > Adobe Services > Admin UI SDK**.

   ![Redsys App Environment](img/admin-ui-sdk.png)

3. Enable the **Admin UI SDK** and set **Refresh registrations on schedule** to daily.

4. Click **Configure extensions**.

   ![Eligible Extensions](img/eligible-extensions.png)

5. Select the Redsys app and click **Save**.

6. A Redsys menu will appear in the sidebar. Click **Redsys Configuration**.

   ![Redsys Menu](img/Redsys-menu.png)

7. The main configuration screen will appear.

   ![Configuration page](img/Redsys-config.png)

The following settings are available for configuration:

- **Enable**: Enables or disables the Redsys payment method at your storefront.
- **Adobe Commerce Platform**: Select whether the connected Commerce instance is Adobe Commerce as a Cloud Service (SaaS) or Adobe Commerce on Cloud (PaaS) / on-premises.
- **Adobe Commerce Base URL**:

  - For **SaaS**, enter the REST API base URL of the Adobe Commerce as a Cloud Service instance.
  - For **PaaS / on-premises**, enter the base URL of the Adobe Commerce installation, for example `https://www.example.com`.

- **Commerce Store Code**: The Commerce store code
