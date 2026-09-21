import { shippingRates } from '@wix/ecom/service-plugins';
import {
  FOXPOST_CODE,
  foxpostShippingPrice,
  isFoxpostDeliveryAddress,
} from '../../../../lib/foxpost-core';

export default shippingRates.provideHandlers({
  getShippingRates: async ({ request, metadata }) => {
    const destination = request.shippingDestination;
    const country = String(destination?.country || '').toUpperCase();
    const currency = String(metadata?.currency || 'HUF').toUpperCase();

    if (country && country !== 'HU') {
      return { shippingRates: [] };
    }

    if (currency !== 'HUF') {
      return { shippingRates: [] };
    }

    const selectedPoint = isFoxpostDeliveryAddress(destination);
    const price = foxpostShippingPrice(request.lineItems);

    return {
      shippingRates: [
        {
          code: FOXPOST_CODE,
          title: 'FOXPOST automata / átvételi pont',
          logistics: {
            deliveryTime: '1–4 munkanap',
            instructions: selectedPoint
              ? 'A kiválasztott FOXPOST átvételi pont a rendelés szállítási adataiban szerepel.'
              : 'A folytatáshoz válassz FOXPOST automatát vagy átvételi pontot.',
            ...(selectedPoint
              ? {
                  pickupDetails: {
                    address: destination,
                    pickupMethod: 'PICKUP_POINT',
                  },
                }
              : {}),
          },
          cost: {
            price: String(price),
            currency: 'HUF',
          },
        },
      ],
    };
  },
});
