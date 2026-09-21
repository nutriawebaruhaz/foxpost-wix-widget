import { shippingRates } from '@wix/ecom/service-plugins';
import { PickupMethod } from '@wix/auto_sdk_ecom_shipping-rates';
import { buildFoxpostShippingRate } from '../../../../lib/foxpost-core';

export default shippingRates.provideHandlers({
  getShippingRates: async ({ request, metadata }) => {
    const decision = buildFoxpostShippingRate(request, metadata?.currency);

    if (!decision) {
      return { shippingRates: [] };
    }

    return {
      shippingRates: [
        {
          code: decision.code,
          title: decision.title,
          logistics: decision.pickupAddress
            ? {
                deliveryTime: decision.deliveryTime,
                instructions: decision.instructions,
                pickupDetails: {
                  address: decision.pickupAddress,
                  pickupMethod: PickupMethod.PICKUP_POINT,
                },
              }
            : {
                deliveryTime: decision.deliveryTime,
                instructions: decision.instructions,
              },
          cost: {
            price: decision.price,
            currency: decision.currency,
          },
        },
      ],
    };
  },
});
