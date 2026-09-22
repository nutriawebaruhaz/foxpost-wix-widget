import assert from 'node:assert/strict';
import {
  FOXPOST_CARRIER_APP_ID,
  FOXPOST_CODE,
  buildFoxpostCartAddress,
  buildFoxpostPickupAddress,
  buildFoxpostPointMarker,
  buildFoxpostShippingRate,
  cartValue,
  foxpostPointFromAddressLine2,
  foxpostPointId,
  foxpostPointIdFromAddressLine2,
  foxpostShippingPrice,
  isFoxpostDeliveryAddress,
  isSelectableFoxpostPoint,
  sanitizeDeliveryAddress,
  shouldBlockFoxpostCheckout,
  shouldOfferFoxpost,
  splitStreet,
} from '../src/lib/foxpost-core';

const foxpostPoint = {
  place_id: 1250198,
  operator_id: 'hu5516',
  name: 'Győrújbarát Gabi Cukrászat',
  address: '9081 Győrújbarát, István utca 67.',
  zip: '9081',
  city: 'Győrújbarát',
  street: 'István utca 67.',
  country: 'hu',
};

const packetaPoint = {
  place_id: 987654,
  operator_id: '',
  name: 'Packeta Z-Pont',
  address: '1117 Budapest, Példa utca 12.',
  zip: '1117',
  city: 'Budapest',
  street: 'Példa utca 12.',
  country: 'hu',
};

const customerAddress = {
  streetAddress: { name: 'Baross utca', number: '41.' },
  city: 'Budapest',
  subdivision: 'HU-BU',
  country: 'HU',
  postalCode: '1093',
};

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

test('Foxpost checkout uses the released app ID for carrier detection', () => {
  assert.equal(FOXPOST_CARRIER_APP_ID, 'ae3fcc51-5b48-49ea-ba28-ab54d642679b');
});

test('Foxpost operator_id is preferred and normalized', () => {
  assert.equal(foxpostPointId(foxpostPoint), 'HU5516');
});

test('Packeta pickup falls back to place_id when operator_id is empty', () => {
  assert.equal(foxpostPointId(packetaPoint), '987654');
  assert.equal(isSelectableFoxpostPoint(packetaPoint), true);
});

test('Pickup point without both identifiers is rejected', () => {
  assert.equal(
    isSelectableFoxpostPoint({
      name: 'No ID',
      zip: '1111',
      city: 'Budapest',
      street: 'Teszt utca 1.',
    }),
    false
  );
});

test('Street parser separates ordinary Hungarian house number', () => {
  assert.deepEqual(splitStreet('István utca 67.'), {
    name: 'István utca',
    number: '67.',
  });
});

test('Foxpost pickup address contains only the selected pickup point', () => {
  const address = buildFoxpostPickupAddress(foxpostPoint);
  assert.equal(address.country, 'HU');
  assert.equal(address.postalCode, '9081');
  assert.equal(address.city, 'Győrújbarát');
  assert.equal(address.streetAddress?.name, 'István utca');
  assert.equal(address.streetAddress?.number, '67.');
  assert.equal(address.addressLine2, 'Győrújbarát Gabi Cukrászat');
  assert.notEqual(address.streetAddress?.name, customerAddress.streetAddress.name);
});

test('Cart address preserves customer address and stores Foxpost only in marker', () => {
  const address = buildFoxpostCartAddress(customerAddress, foxpostPoint);

  assert.equal(address.streetAddress?.name, 'Baross utca');
  assert.equal(address.streetAddress?.number, '41.');
  assert.equal(address.city, 'Budapest');
  assert.equal(address.postalCode, '1093');
  assert.equal(foxpostPointIdFromAddressLine2(address.addressLine2), 'HU5516');
  assert.equal(isFoxpostDeliveryAddress(address), true);

  const restored = foxpostPointFromAddressLine2(address.addressLine2);
  assert.ok(restored);
  assert.equal(restored?.zip, '9081');
  assert.equal(restored?.city, 'Győrújbarát');
  assert.equal(restored?.street, 'István utca 67.');
  assert.equal(restored?.name, 'Győrújbarát Gabi Cukrászat');
});

test('Foxpost marker round-trips Unicode and spaces safely', () => {
  const marker = buildFoxpostPointMarker(foxpostPoint);
  assert.match(marker, /^FP2\|HU5516\|HU\|/);
  const restored = foxpostPointFromAddressLine2(marker);
  assert.equal(restored?.name, foxpostPoint.name);
  assert.equal(restored?.street, foxpostPoint.street);
});

test('Fallback pickup ID is persisted for a point without operator_id', () => {
  const address = buildFoxpostCartAddress(customerAddress, packetaPoint);
  assert.equal(foxpostPointIdFromAddressLine2(address.addressLine2), '987654');
});

test('Cart value uses totalPrice when available', () => {
  assert.equal(
    cartValue([
      { totalPrice: '10000', price: '999', quantity: 99 },
      { totalPrice: '5000' },
    ]),
    15000
  );
});

test('Cart value falls back to price × quantity', () => {
  assert.equal(
    cartValue([
      { price: '4990', quantity: 2 },
      { price: '1000', quantity: 1 },
    ]),
    10980
  );
});

test('Foxpost costs 1,990 HUF below free-shipping threshold', () => {
  assert.equal(foxpostShippingPrice([{ totalPrice: '29999' }]), 1990);
});

test('Foxpost becomes free exactly at 30,000 HUF', () => {
  assert.equal(foxpostShippingPrice([{ totalPrice: '30000' }]), 0);
});

test('Foxpost stays free above 30,000 HUF', () => {
  assert.equal(foxpostShippingPrice([{ totalPrice: '45000' }]), 0);
});

test('Foxpost option is offered for Hungary/HUF and pre-address state', () => {
  assert.equal(shouldOfferFoxpost('HU', 'HUF'), true);
  assert.equal(shouldOfferFoxpost(undefined, 'HUF'), true);
});

test('Foxpost option is not offered for foreign destination or non-HUF currency', () => {
  assert.equal(shouldOfferFoxpost('AT', 'HUF'), false);
  assert.equal(shouldOfferFoxpost('HU', 'EUR'), false);
});

test('Shipping rate before point selection is selectable but has no pickupDetails', () => {
  const rate = buildFoxpostShippingRate(
    {
      lineItems: [{ totalPrice: '12000' }],
      shippingDestination: { country: 'HU' },
    },
    'HUF'
  );

  assert.ok(rate);
  assert.equal(rate?.code, FOXPOST_CODE);
  assert.equal(rate?.title, 'Foxpost automata / átvételi pont');
  assert.equal(rate?.price, '1990');
  assert.equal(rate?.pickupAddress, null);
});

test('Shipping rate after selection builds pickup address from marker, not buyer address', () => {
  const destination = buildFoxpostCartAddress(customerAddress, foxpostPoint);
  const rate = buildFoxpostShippingRate(
    {
      lineItems: [{ totalPrice: '31000' }],
      shippingDestination: destination,
    },
    'HUF'
  );

  assert.ok(rate);
  assert.equal(rate?.price, '0');
  assert.deepEqual(
    rate?.pickupAddress,
    sanitizeDeliveryAddress(buildFoxpostPickupAddress(foxpostPoint))
  );
  assert.equal(rate?.pickupAddress?.postalCode, '9081');
  assert.equal(rate?.pickupAddress?.streetAddress?.name, 'István utca');
  assert.notEqual(rate?.pickupAddress?.postalCode, customerAddress.postalCode);
  assert.notEqual(rate?.pickupAddress?.streetAddress?.name, customerAddress.streetAddress.name);
});

test('Wix pickup address output removes null fields', () => {
  assert.deepEqual(
    sanitizeDeliveryAddress({
      streetAddress: { name: 'Példa utca', number: null },
      city: 'Budapest',
      subdivision: null,
      country: 'HU',
      postalCode: '1117',
      addressLine2: 'Packeta Z-Pont',
    }),
    {
      streetAddress: { name: 'Példa utca' },
      city: 'Budapest',
      country: 'HU',
      postalCode: '1117',
      addressLine2: 'Packeta Z-Pont',
    }
  );
});

test('Foxpost checkout is blocked until the marker is present', () => {
  assert.equal(
    shouldBlockFoxpostCheckout(FOXPOST_CODE, { country: 'HU' }),
    true
  );
  assert.equal(
    shouldBlockFoxpostCheckout(
      FOXPOST_CODE,
      buildFoxpostCartAddress(customerAddress, foxpostPoint)
    ),
    false
  );
});

test('Validation never blocks a non-Foxpost delivery method', () => {
  assert.equal(
    shouldBlockFoxpostCheckout('gls_home', { country: 'HU' }),
    false
  );
});

console.log('\nAll Foxpost core flow tests passed.');
