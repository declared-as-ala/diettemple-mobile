# Mobile Production To-Do

## Completed

- [x] Replace payment-method selection with direct standard order confirmation.
- [x] Send customer and admin confirmation emails after order creation.
- [x] Calculate product prices, delivery fee, and promo discounts on the backend.
- [x] Ignore client-supplied prices, totals, discounts, and payment method.
- [x] Reserve product stock atomically when a confirmed order is created.
- [x] Remove obsolete mobile payment screens and disable payment API routes.
- [x] Restrict order details and invoice PDFs to the authenticated owner.
- [x] Fix all current strict TypeScript errors.
- [x] Disconnect realtime socket while the app is backgrounded.
- [x] Increase realtime reconnect backoff.
- [x] Stop writing new authentication tokens to AsyncStorage.
- [x] Disable Android cleartext traffic and backups.
- [x] Remove unnecessary Android storage and overlay permissions.
- [x] Hide the placeholder health/watch feature until a real integration exists.
- [x] Add CI checks for mobile TypeScript and backend compilation.

## Required Before Store Submission

- [ ] Configure and verify the Android production upload/signing key in EAS.
- [ ] Configure Java locally and run `android\gradlew.bat bundleRelease`.
- [ ] Add Sentry or Firebase Crashlytics for production crash reporting.
- [ ] Extend CI with an Android release build after signing credentials are configured.
- [ ] Test SMTP delivery using real customer and admin email addresses.
- [ ] Test the full order flow on physical Android and iOS devices.
- [ ] Optimize large bundled images to reduce app download size.
- [ ] Implement real health/watch integrations before restoring those screens.
- [ ] Add automated tests for checkout, authentication, workout start, and order history.
