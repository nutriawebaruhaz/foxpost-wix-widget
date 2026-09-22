import assert from 'node:assert/strict';
import {
  FOXPOST_CODE,
  buildFoxpostDeliveryAddress,
  buildFoxpostShippingRate,
  cartValue,
  foxpostPointId,
  foxpostPointIdFromAddressLine2,
  foxpostShippingPrice,
  isFoxpostDeliveryAddress,
  isSelectableFoxpostPoint,
  shouldBlockFoxpostCheckout,
  shouldOfferFoxpost,
  splitStreet,
  sanitizeDeliveryAddress,
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

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

test('FOXPOST operator_id is preferred and normalized', () => {
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

test('FOXPOST delivery address contains customer-visible point and internal ID marker', () => {
  const address = buildFoxpostDeliveryAddress(foxpostPoint);
  assert.equal(address.country, 'HU');
  assert.equal(address.postalCode, '9081');
  assert.equal(address.city, 'Győrújbarát');
  assert.equal(address.streetAddress?.name, 'István utca');
  assert.equal(address.streetAddress?.number, '67.');
  assert.equal(address.addressLine2, 'Győrújbarát Gabi Cukrászat · Foxpost HU5516');
  assert.equal(foxpostPointIdFromAddressLine2(address.addressLine2), 'HU5516');
  assert.equal(isFoxpostDeliveryAddress(address), true);
});

test('Packeta delivery address is also persisted with a stable fallback ID', () => {
  const address = buildFoxpostDeliveryAddress(packetaPoint);
  assert.match(address.addressLine2 || '', /Foxpost 987654$/);
  assert.equal(isFoxpostDeliveryAddress(address), true);
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

test('FOXPOST costs 1,990 HUF below free-shipping threshold', () => {
  assert.equal(foxpostShippingPrice([{ totalPrice: '29999' }]), 1990);
});

test('FOXPOST becomes free exactly at 30,000 HUF', () => {
  assert.equal(foxpostShippingPrice([{ totalPrice: '30000' }]), 0);
});

test('FOXPOST stays free above 30,000 HUF', () => {
  assert.equal(foxpostShippingPrice([{ totalPrice: '45000' }]), 0);
});

test('FOXPOST option is offered for Hungary/HUF and pre-address state', () => {
  assert.equal(shouldOfferFoxpost('HU', 'HUF'), true);
  assert.equal(shouldOfferFoxpost(undefined, 'HUF'), true);
});

test('FOXPOST option is not offered for foreign destination or non-HUF currency', () => {
  assert.equal(shouldOfferFoxpost('AT', 'HUF'), false);
  assert.equal(shouldOfferFoxpost('HU', 'EUR'), false);
});

test('Shipping rate before point selection is selectable but not yet pickupDetails', () => {
  const rate = buildFoxpostShippingRate(
    {
      lineItems: [{ totalPrice: '12000' }],
      shippingDestination: { country: 'HU' },
    },
    'HUF'
  );

  assert.ok(rate);
  assert.equal(rate?.code, FOXPOST_CODE);
  assert.equal(rate?.price, '1990');
  assert.equal(rate?.pickupAddress, null);
});

test('Shipping rate after point selection becomes a PICKUP_POINT', () => {
  const destination = buildFoxpostDeliveryAddress(foxpostPoint);
  const rate = buildFoxpostShippingRate(
    {
      lineItems: [{ totalPrice: '31000' }],
      shippingDestination: destination,
    },
    'HUF'
  );

  assert.ok(rate);
  assert.equal(rate?.price, '0');
  assert.deepEqual(rate?.pickupAddress, destination);
});

test('Wix pickup address output removes null fields', () => {
  assert.deepEqual(
    sanitizeDeliveryAddress({
      streetAddress: { name: 'Példa utca', number: null },
      city: 'Budapest',
      subdivision: null,
      country: 'HU',
      postalCode: '1117',
      addressLine2: 'Packeta Z-Pont · Foxpost 987654',
    }),
    {
      streetAddress: { name: 'Példa utca' },
      city: 'Budapest',
      country: 'HU',
      postalCode: '1117',
      addressLine2: 'Packeta Z-Pont · Foxpost 987654',
    }
  );
});

test('FOXPOST checkout is blocked until a pickup address is present', () => {
  assert.equal(
    shouldBlockFoxpostCheckout(FOXPOST_CODE, { country: 'HU' }),
    true
  );
  assert.equal(
    shouldBlockFoxpostCheckout(
      FOXPOST_CODE,
      buildFoxpostDeliveryAddress(foxpostPoint)
    ),
    false
  );
});

test('Validation never blocks a non-FOXPOST delivery method', () => {
  assert.equal(
    shouldBlockFoxpostCheckout('gls_home', { country: 'HU' }),
    false
  );
});

console.log('\nAll FOXPOST core flow tests passed.');
