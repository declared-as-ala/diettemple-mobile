# Mobile Production To-Do

## Apple review fixes — 2026-07-11 (see docs/apple-review-fixes.md)

- [x] Remove `UIBackgroundModes: audio` (Guideline 2.5.4) — expo-video plugin config + `plugins/withRemoveBackgroundAudio.js` guard.
- [x] Lock iPad to portrait + `requireFullScreen` (module-scope Dimensions unsafe under rotation/Split View).
- [x] In-app account deletion (Profil → Compte → Supprimer le compte) + backend `DELETE /api/me/account`.
- [x] Link https://diettemple.tn/support and support@diettemple.tn in Aide & Contact and Mentions légales.
- [x] Stop returning `passwordHash`/`otp` from login endpoints (backend).
- [x] Idempotent Apple-review seed (`npm run seed:apple-review`, backend) — creates `user1@diettemple.tn` with 90-day subscription and full demo data.
- [ ] Deploy backend to production (deletion endpoint + sanitized login + seed script).
- [ ] Run `npm run seed:apple-review` on the server; verify `user1@diettemple.tn` login.
- [ ] New EAS iOS build (bump `ios.buildNumber`) and resubmit.

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
