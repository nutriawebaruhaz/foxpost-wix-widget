# Nutri-A FOXPOST Checkout v2

Development source for replacing the current Cart Page FOXPOST workaround with a native Wix Checkout integration.

## Status

- Development only.
- Do **not** release, deploy, publish, or add the plugin to the live checkout without explicit approval.
- The existing live Cart Page integration and the repository's `main` branch are intentionally untouched.

## Intended flow

1. Wix Checkout shows `FOXPOST automata / átvételi pont` as a delivery option.
2. The checkout plugin renders in `checkout:delivery-step:options:after`.
3. While FOXPOST is selected, Checkout's Continue button is disabled until a point is chosen.
4. The plugin embeds the official FOXPOST pickup-point finder.
5. On selection, the plugin writes the pickup address to Cart V2 `deliveryInfo.address`.
6. The plugin requests a checkout refresh.
7. The Shipping Rates service plugin returns the same rate as a native `PICKUP_POINT`.
8. Billing information remains separate from the pickup-point delivery address.

## Current merchant pricing preserved

- Standard domestic rate: 1,990 HUF
- Free shipping threshold: 30,000 HUF
- Delivery estimate carried over from current Wix configuration: 1–4 business days

## Before any release

- Generate/merge the Wix CLI project metadata and package scaffold.
- Validate the two extension builders with the current Wix CLI.
- Add a dashboard installation page for the checkout plugin.
- Test a complete order on a development/test checkout.
- Confirm the Wix order and confirmation email show the FOXPOST pickup details correctly.
- Confirm switching from FOXPOST to another delivery method cannot leave a locker address behind.
