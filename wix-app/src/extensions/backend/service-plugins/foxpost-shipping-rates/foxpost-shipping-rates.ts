import { shippingRates } from '@wix/ecom/service-plugins';

const FOXPOST_CODE = 'foxpost_pickup';
const STANDARD_PRICE_HUF = 1990;
const FREE_SHIPPING_FROM_HUF = 30000;

function money(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function cartValue(request: any): number {
  return (request.lineItems || []).reduce((sum: number, item: any) => {
    if (item.totalPrice !== undefined && item.totalPrice !== null) {
      return sum + money(item.totalPrice);
    }

    return sum + money(item.price) * money(item.quantity || 1);
  }, 0);
}

function isFoxpostPoint(address: any): boolean {
  return /(?:^|[·|\s])FOXPOST\s+[A-Z0-9-]+/i.test(address?.addressLine2 || '');
}

export default shippingRates.provideHandlers({
  getShippingRates: async ({ request, metadata }) => {
    const destination = request.shippingDestination;
    const country = String(destination?.country || '').toUpperCase();
    const currency = String(metadata?.currency || 'HUF').toUpperCase();

    if (country && country !== 'HU') {
      return { shippingRates: [] };
    }

    // Nutri-A currently sells in HUF. Do not silently reuse the HUF price
    // if a future checkout requests another currency.
    if (currency !== 'HUF') {
      return { shippingRates: [] };
    }

    const total = cartValue(request);
    const selectedPoint = isFoxpostPoint(destination);
    const price = total >= FREE_SHIPPING_FROM_HUF ? 0 : STANDARD_PRICE_HUF;

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
