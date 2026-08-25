# Changelog

All notable changes to this project will be documented in this file.

## [0.0.2] - 2026-08-25

### Added
- Storefront Settings: new "Head Scripts" and "Body Scripts" fields for injecting
  custom HTML/JS (e.g. Meta Pixel, Google Analytics/Tag Manager, site verification
  tags) into every storefront page's `<head>` and `<body>`.
- Meta Pixel conversion tracking: `AddToCart`, `InitiateCheckout`, and `Purchase`
  events now fire automatically from the cart/checkout flow when a pixel is
  configured via Head Scripts.

## [0.0.1] - Initial release
- Core storefront: shop, product, cart, and checkout flows.
- Storefront Settings page for branding, SEO, shipping, and footer configuration.
