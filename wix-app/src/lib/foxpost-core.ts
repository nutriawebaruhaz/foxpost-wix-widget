export const FOXPOST_CODE = 'foxpost_pickup';
export const FOXPOST_CARRIER_APP_ID = 'ae3fcc51-5b48-49ea-ba28-ab54d642679b';
export const STANDARD_PRICE_HUF = 1990;
export const FREE_SHIPPING_FROM_HUF = 30000;

const FOXPOST_MARKER_PREFIX = 'FP2|';

export type FoxpostPoint = {
  place_id?: number | string;
  operator_id?: string;
  name?: string;
  address?: string;
  zip?: string;
  city?: string;
  street?: string;
  findme?: string;
  geolat?: number;
  geolng?: number;
  country?: string;
  variant?: string;
  serviceString?: string;
  paymentOptionsString?: string;
};

export type DeliveryAddress = {
  streetAddress?: {
    name?: string | null;
    number?: string | null;
  };
  city?: string | null;
  subdivision?: string | null;
  country?: string | null;
  postalCode?: string | null;
  addressLine2?: string | null;
};

export function foxpostPointId(point: FoxpostPoint): string | null {
  const operatorId = String(point.operator_id ?? '').trim();
  if (operatorId) {
    return operatorId.toUpperCase();
  }

  const placeId = String(point.place_id ?? '').trim();
  return placeId || null;
}

export function isSelectableFoxpostPoint(point: FoxpostPoint): boolean {
  return Boolean(
    foxpostPointId(point) &&
    String(point.name ?? '').trim() &&
    String(point.zip ?? '').trim() &&
    String(point.city ?? '').trim() &&
    String(point.street ?? '').trim()
  );
}

export function splitStreet(street: string): { name: string; number?: string } {
  const clean = street.trim();
  const match = clean.match(/^(.*?)[,\s]+(\d+[A-Za-z]?\.?(?:\s*[-/]\s*\d+[A-Za-z]?\.?)?)$/);

  if (!match) {
    return { name: clean };
  }

  const streetName = match[1];
  const streetNumber = match[2];

  if (!streetName || !streetNumber) {
    return { name: clean };
  }

  return {
    name: streetName.trim(),
    number: streetNumber.trim(),
  };
}

function markerPart(value: unknown): string {
  return encodeURIComponent(String(value ?? '').trim());
}

function decodeMarkerPart(value: string | undefined): string {
  if (!value) {
    return '';
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function buildFoxpostPointMarker(point: FoxpostPoint): string {
  const pointId = foxpostPointId(point);
  if (!pointId || !isSelectableFoxpostPoint(point)) {
    throw new Error('Foxpost pickup point is incomplete.');
  }

  return [
    FOXPOST_MARKER_PREFIX.slice(0, -1),
    markerPart(pointId),
    markerPart(String(point.country ?? 'HU').toUpperCase()),
    markerPart(point.zip),
    markerPart(point.city),
    markerPart(point.street),
    markerPart(point.name),
  ].join('|');
}

export function foxpostPointFromAddressLine2(
  addressLine2: string | null | undefined
): FoxpostPoint | null {
  const value = String(addressLine2 ?? '').trim();

  if (value.startsWith(FOXPOST_MARKER_PREFIX)) {
    const [, pointId, country, zip, city, street, name] = value.split('|');
    const decodedPointId = decodeMarkerPart(pointId);

    if (!decodedPointId) {
      return null;
    }

    return {
      operator_id: decodedPointId,
      country: decodeMarkerPart(country) || 'HU',
      zip: decodeMarkerPart(zip),
      city: decodeMarkerPart(city),
      street: decodeMarkerPart(street),
      name: decodeMarkerPart(name),
    };
  }

  const legacyMatch = value.match(/FOXPOST\s+([A-Z0-9-]+)/i);
  if (!legacyMatch?.[1]) {
    return null;
  }

  return {
    operator_id: legacyMatch[1].toUpperCase(),
    name: value
      .replace(/\s*[·|-]\s*FOXPOST\s+[A-Z0-9-]+.*$/i, '')
      .trim() || 'Foxpost átvételi pont',
  };
}

export function buildFoxpostPickupAddress(point: FoxpostPoint): DeliveryAddress {
  const pointId = foxpostPointId(point);
  if (!pointId || !isSelectableFoxpostPoint(point)) {
    throw new Error('Foxpost pickup point is incomplete.');
  }

  const street = splitStreet(String(point.street ?? ''));
  const pointName = String(point.name ?? '').trim();

  return {
    streetAddress: {
      name: street.name,
      ...(street.number ? { number: street.number } : {}),
    },
    city: String(point.city ?? '').trim(),
    country: String(point.country ?? 'HU').toUpperCase(),
    postalCode: String(point.zip ?? '').trim(),
    addressLine2: pointName,
  };
}

export function buildFoxpostCartAddress(
  currentAddress: DeliveryAddress | null | undefined,
  point: FoxpostPoint
): DeliveryAddress {
  return {
    ...sanitizeDeliveryAddress(currentAddress),
    country: String(currentAddress?.country ?? 'HU').toUpperCase(),
    addressLine2: buildFoxpostPointMarker(point),
  };
}

export function buildFoxpostDeliveryAddress(point: FoxpostPoint): DeliveryAddress {
  return buildFoxpostPickupAddress(point);
}

export function foxpostPointIdFromAddressLine2(
  addressLine2: string | null | undefined
): string | null {
  const point = foxpostPointFromAddressLine2(addressLine2);
  return point ? foxpostPointId(point) : null;
}

export function isFoxpostDeliveryAddress(
  address: DeliveryAddress | null | undefined
): boolean {
  return Boolean(foxpostPointIdFromAddressLine2(address?.addressLine2));
}

export function cartValue(
  lineItems: Array<{ totalPrice?: unknown; price?: unknown; quantity?: unknown }> | undefined
): number {
  return (lineItems ?? []).reduce((sum, item) => {
    const total = Number(item.totalPrice);
    if (item.totalPrice !== undefined && item.totalPrice !== null && Number.isFinite(total)) {
      return sum + total;
    }

    const price = Number(item.price);
    const quantity = Number(item.quantity ?? 1);
    return sum + (Number.isFinite(price) ? price : 0) * (Number.isFinite(quantity) ? quantity : 1);
  }, 0);
}

export function foxpostShippingPrice(
  lineItems: Array<{ totalPrice?: unknown; price?: unknown; quantity?: unknown }> | undefined
): number {
  return cartValue(lineItems) >= FREE_SHIPPING_FROM_HUF ? 0 : STANDARD_PRICE_HUF;
}

export type ShippingLineItem = {
  totalPrice?: unknown;
  price?: unknown;
  quantity?: unknown;
};

export type ShippingRateRequestLike = {
  lineItems?: ShippingLineItem[];
  shippingDestination?: DeliveryAddress;
};

export function shouldOfferFoxpost(
  country: string | null | undefined,
  currency: string | null | undefined
): boolean {
  const normalizedCountry = String(country ?? '').toUpperCase();
  const normalizedCurrency = String(currency ?? 'HUF').toUpperCase();

  return (!normalizedCountry || normalizedCountry === 'HU') && normalizedCurrency === 'HUF';
}

export function sanitizeDeliveryAddress(address: DeliveryAddress | null | undefined) {
  if (!address) {
    return {};
  }

  const streetName = address.streetAddress?.name ?? undefined;
  const streetNumber = address.streetAddress?.number ?? undefined;
  const city = address.city ?? undefined;
  const subdivision = address.subdivision ?? undefined;
  const country = address.country ?? undefined;
  const postalCode = address.postalCode ?? undefined;
  const addressLine2 = address.addressLine2 ?? undefined;

  return {
    ...(streetName || streetNumber
      ? {
          streetAddress: {
            ...(streetName ? { name: streetName } : {}),
            ...(streetNumber ? { number: streetNumber } : {}),
          },
        }
      : {}),
    ...(city ? { city } : {}),
    ...(subdivision ? { subdivision } : {}),
    ...(country ? { country } : {}),
    ...(postalCode ? { postalCode } : {}),
    ...(addressLine2 ? { addressLine2 } : {}),
  };
}

export function buildFoxpostShippingRate(
  request: ShippingRateRequestLike,
  currency: string | null | undefined
) {
  const destination = request.shippingDestination;
  const normalizedCurrency = String(currency ?? 'HUF').toUpperCase();

  if (!shouldOfferFoxpost(destination?.country, normalizedCurrency)) {
    return null;
  }

  const storedPoint = foxpostPointFromAddressLine2(destination?.addressLine2);
  const selectedPoint = Boolean(storedPoint && foxpostPointId(storedPoint));
  const price = foxpostShippingPrice(request.lineItems);

  let pickupAddress: ReturnType<typeof sanitizeDeliveryAddress> | null = null;

  if (storedPoint && isSelectableFoxpostPoint(storedPoint)) {
    pickupAddress = sanitizeDeliveryAddress(buildFoxpostPickupAddress(storedPoint));
  } else if (selectedPoint && destination) {
    // Backwards compatibility for carts created with the legacy marker format.
    pickupAddress = sanitizeDeliveryAddress(destination);
  }

  return {
    code: FOXPOST_CODE,
    title: 'Foxpost automata / átvételi pont',
    deliveryTime: '1–4 munkanap',
    instructions: selectedPoint
      ? 'A csomag a kiválasztott Foxpost automatába / átvételi pontra érkezik.'
      : 'A folytatáshoz válassz Foxpost automatát vagy átvételi pontot.',
    pickupAddress,
    price: String(price),
    currency: normalizedCurrency,
  };
}

export function shouldBlockFoxpostCheckout(
  selectedDeliveryCode: string | undefined,
  shippingAddress: DeliveryAddress | null | undefined
): boolean {
  return (
    selectedDeliveryCode === FOXPOST_CODE &&
    !isFoxpostDeliveryAddress(shippingAddress)
  );
}
