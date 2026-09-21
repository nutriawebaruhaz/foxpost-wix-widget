import { shippingRates } from '@wix/ecom/service-plugins';
import { buildFoxpostShippingRate } from '../../../../lib/foxpost-core';

export default shippingRates.provideHandlers({
  getShippingRates: async ({ request, metadata }) => {
    const rate = buildFoxpostShippingRate(request, metadata?.currency);

    return {
      shippingRates: rate ? [rate] : [],
    };
  },
});
