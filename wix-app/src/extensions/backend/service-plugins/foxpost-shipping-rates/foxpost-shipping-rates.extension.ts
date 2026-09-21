import { extensions } from '@wix/astro/builders';

export default extensions.ecomShippingRates({
  id: 'e7816e6d-f15e-4236-88db-7ca746ca5497',
  name: 'foxpost-shipping-rates',
  description: 'FOXPOST pickup-point delivery for Nutri-A checkout.',
  fallbackDefinitionMandatory: false,
  source: './extensions/backend/service-plugins/foxpost-shipping-rates/foxpost-shipping-rates.ts',
});
