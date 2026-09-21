import { app } from '@wix/astro/builders';
import foxpostCheckout from './extensions/site/plugins/foxpost-checkout/foxpost-checkout.extension';
import foxpostShippingRates from './extensions/backend/service-plugins/foxpost-shipping-rates/foxpost-shipping-rates.extension';
import foxpostSetup from './extensions/dashboard/pages/foxpost-setup/foxpost-setup.extension';

export default app()
  .use(foxpostCheckout)
  .use(foxpostShippingRates)
  .use(foxpostSetup);
