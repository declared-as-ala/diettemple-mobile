# DietTemple Mobile — Production Launch Checklist

**Status**: 90% Ready ✅ (API configured with https://api.diettemple.tn)
**Last Updated**: 2026-06-08  
**Remaining**: Only need to test on real device + verify backend endpoints  
**Target Launch**: Today or tomorrow ⚡

---

## 🔴 CRITICAL (Must Complete Before Launch)

### **1. API Configuration - ✅ ALREADY CONFIGURED**
- [x] `src/config/api.config.ts` is correctly set
- [x] `API_HOST = 'https://api.diettemple.tn'` (Line 11)
- [x] All API calls go to: `https://api.diettemple.tn/api`
- [x] HTTPS enabled (secure connection)

**API Endpoints Available:**
- Products: `GET https://api.diettemple.tn/api/products`
- Orders: `POST https://api.diettemple.tn/api/orders`
- Leads: `POST https://api.diettemple.tn/api/leads`
- Auth: `POST https://api.diettemple.tn/api/auth/login`

### **2. Backend Endpoints - VERIFY THESE EXIST**
Before launching, confirm your backend has ALL these endpoints:

**Auth:**
- [ ] `POST /auth/login` → returns `{ token, user }`
- [ ] `POST /auth/register` → returns `{ token, user }`
- [ ] `GET /api/profile` → returns `{ user }`

**Products:**
- [ ] `GET /api/products` → returns product list
- [ ] `GET /api/products/:id` → returns single product details

**Orders & Checkout:**
- [ ] `POST /api/orders` → accepts `{ items, deliveryAddress, promoCode }`
- [ ] `GET /api/orders/:id` → returns order details

**Signup Form:**
- [ ] `POST /api/leads` → accepts `{ gender, name, email, phone, objective }`
- [ ] Sends email to `admin@diettemple.tn` on new lead

### **3. Product Images - ALREADY DONE**
- [x] Placeholder fallback added to all screens
- [x] If no image URL: shows `https://via.placeholder.com/...`
- [x] Grid view (ProductCardV2)
- [x] Detail page + thumbnails
- [x] Cart page

### **4. Complete Order Flow Test - MUST TEST END-TO-END**

**Login → Browse → Cart → Checkout:**
- [ ] User can login with credentials
- [ ] Splash screen appears then main app loads
- [ ] Boutique page shows products (with or without images)
- [ ] Can scroll and view all products
- [ ] Product detail page loads when tapped
- [ ] Price displayed correctly on detail page
- [ ] Can add to cart with quantity selector
- [ ] Cart badge updates on header
- [ ] Cart page shows all items with prices
- [ ] Can update quantities in cart
- [ ] Can remove items from cart

**Checkout:**
- [ ] Click "Passer au paiement" button
- [ ] CheckoutCart page loads (promo code optional)
- [ ] Apply promo code works (if available)
- [ ] Click "Continuer" button
- [ ] DeliveryAddress page loads
- [ ] All form fields work (name, street, city, delegation, phone, email)
- [ ] Form validation works (required fields)
- [ ] Phone number validation works (Tunisia format)
- [ ] Email validation works
- [ ] Click submit button
- [ ] Loading spinner appears
- [ ] Order is created on backend (check backend logs)
- [ ] Redirected to PaymentSuccess/OrderConfirmation page
- [ ] Order ID visible and matches backend
- [ ] Cart is cleared
- [ ] Can navigate back to home and browse again

**Test Multiple Scenarios:**
- [ ] Single product order
- [ ] Multiple different products
- [ ] Same product in different quantities
- [ ] With and without promo code
- [ ] With and without UH member discount

### **5. Gender Video Signup Flow**
- [ ] Signup page shows "Homme" and "Femme" cards
- [ ] Clicking "Homme" loads video (check video URL loads from `/api/landing/stream/homme`)
- [ ] Clicking "Femme" loads video (check video URL loads from `/api/landing/stream/femme`)
- [ ] Form appears after video (name, email, phone, objective)
- [ ] Form submission sends data to `/api/leads`
- [ ] Confirmation message displays
- [ ] Admin receives email at `admin@diettemple.tn`
- [ ] Email contains: gender, name, email, phone, objective

---

## 🟡 HIGH PRIORITY (Test Before Launch)

### **Device Testing - CRITICAL**
⚠️ **Do NOT test only in Expo Go**. Build actual APK and test on real device.

**Build Process:**
```bash
cd Mobile
npm install
eas build --platform android --release
# Download APK from EAS dashboard
```

**Install & Test on Android Device:**
- [ ] Download signed APK
- [ ] Transfer to Android phone
- [ ] Install APK (`adb install app.apk` or via file manager)
- [ ] Launch app from home screen
- [ ] Go through login → browse → order flow
- [ ] Verify all buttons work
- [ ] Check footer buttons don't overlap screen
- [ ] Verify notch safe area on notched devices
- [ ] Test on at least 2 different Android phones if possible

**Test on Different Screen Sizes:**
- [ ] Small phone (4.5-5" screen)
- [ ] Medium phone (5-6" screen)
- [ ] Large phone (6.5"+ screen)
- [ ] With and without notch

### **Network & Performance Testing**
- [ ] Test with good network (fast WiFi)
- [ ] Test with poor network (throttle to 3G)
  - [ ] Products still load (skeleton shows, then content)
  - [ ] Error messages appear on timeout
  - [ ] No crashes
- [ ] Test with no network
  - [ ] Graceful error handling
  - [ ] User sees "connection error" message
  - [ ] App doesn't crash
- [ ] App startup time (measure how long splash appears)
  - [ ] Should be < 3 seconds

### **UI/UX Verification**
- [ ] All text is readable (not cut off)
- [ ] All buttons are tappable (min 44×44 pixels)
- [ ] Images display correctly (or placeholder if missing)
- [ ] Spacing and padding look good
- [ ] No layout shifting/jank
- [ ] Dark mode colors look correct
- [ ] Font sizes readable on various devices

### **Critical User Flows - Test Each**
- [ ] Login with valid credentials ✓
- [ ] Logout clears data ✓
- [ ] Browse boutique page ✓
- [ ] Filter/search products (if available) ✓
- [ ] Add to favorites ✓
- [ ] Remove from favorites ✓
- [ ] Add to cart ✓
- [ ] Update cart quantities ✓
- [ ] Apply promo code (if available) ✓
- [ ] Complete full checkout ✓
- [ ] View past orders ✓
- [ ] Edit profile ✓
- [ ] Change password ✓

### **Error Handling**
- [ ] App doesn't crash on network errors
- [ ] Error messages are clear in French
- [ ] "Retry" buttons work
- [ ] Can navigate back from errors
- [ ] Error boundary catches crashes gracefully

---

## 🟠 MEDIUM PRIORITY (Nice to Have)

### **Optional: Crash Monitoring**
- [ ] Consider setting up Sentry/Bugsnag
- [ ] Not required for launch, but helpful
- [ ] Helps track production issues

### **Optional: Performance Optimization**
- [ ] ProGuard enabled for APK size reduction
- [ ] Check APK size < 100 MB
- [ ] Image optimization done

### **Optional: Future Features**
- [ ] Offline product caching
- [ ] Force update notifications
- [ ] In-app messaging for promotions
- [ ] GymPresenceVerificationScreen camera feature (currently not critical)

---

## ✅ COMPLETED & READY

- [x] Mobile UI fully enhanced
- [x] Gender video signup flow
- [x] Splash screen with DietTemple branding
- [x] Product image fallbacks
- [x] Cart and checkout flow
- [x] Order confirmation page
- [x] Auth with secure tokens
- [x] Error boundary & crash recovery
- [x] Footer spacing fixed
- [x] Product pricing displays everywhere

---

## 📋 BACKEND CHECKLIST

**Ensure backend is production-ready:**
- [ ] All endpoints respond correctly
- [ ] Database is backed up
- [ ] Email service configured (for admin notifications)
- [ ] CORS configured to allow mobile app domain
- [ ] JWT secret is strong (32+ chars)
- [ ] Error handling works (returns proper error messages)
- [ ] Rate limiting configured (prevent abuse)
- [ ] Logs are being recorded

**Test these API calls from mobile app:**
```bash
# Login
POST /auth/login
Body: { email, password }

# Get products
GET /api/products

# Create order
POST /api/orders
Body: { items, deliveryAddress, promoCode }

# Submit lead
POST /api/leads
Body: { gender, name, email, phone, objective }
```

---

## 🚀 LAUNCH TIMELINE

### **Day 1: Preparation (2 hours)**
- [ ] Update API config with production domain
- [ ] Verify all backend endpoints working
- [ ] Review code for any TODOs/FIXMEs
- [ ] Prepare app version & build number

### **Day 2: Build & First Test (3-4 hours)**
- [ ] Clean install: `npm install` in Mobile folder
- [ ] Build APK: `eas build --platform android --release`
- [ ] Wait for EAS to finish building (~5-10 min)
- [ ] Download APK
- [ ] Install on Android device
- [ ] Test complete order flow 3-5 times
- [ ] Test gender video signup
- [ ] Test login/logout
- [ ] Take screenshots for Play Store listing

### **Day 3: Final Testing & Deployment (2-3 hours)**
- [ ] Test on 2nd device (if available)
- [ ] Final check of all critical flows
- [ ] Prepare app description for Play Store
- [ ] Upload APK to Google Play Console
- [ ] Set pricing and release notes
- [ ] Roll out to 10% of users first (staged rollout)
- [ ] Monitor for crashes 24 hours
- [ ] Expand to 100% if stable

**Total time to launch: 6-9 hours spread over 3 days**

---

## ✅ GO/NO-GO DECISION

**You are GO for launch when:**
- ✓ API config updated and tested
- ✓ All 4 order flow tests passed
- ✓ App tested on real Android device
- ✓ No unhandled crashes
- ✓ All required endpoints working
- ✓ Product images load (or placeholder works)

**You are NO-GO if:**
- ✗ API still pointing to dev/staging
- ✗ Order flow fails at any step
- ✗ App crashes on real device
- ✗ Backend endpoints missing
- ✗ Critical errors in console

---

## 📞 SUPPORT DURING LAUNCH

**If issues appear after launch:**
1. Check backend logs immediately
2. Review app crash reports (in Play Console)
3. Disable the feature causing issues (if minor)
4. Roll back to previous version (if critical)
5. Fix and redeploy new APK

---

## 🎯 SUCCESS CHECKLIST

Once live, verify:
- [ ] Users can login
- [ ] Products visible in boutique
- [ ] Orders created successfully
- [ ] Admin receives emails
- [ ] No major crashes reported
- [ ] Response times acceptable
- [ ] Images load consistently

**If all above pass → MISSION ACCOMPLISHED** 🎉

---

**Questions?** Check backend logs or review specific flow that's failing.

**Ready to launch?** Start with API config update (Day 1, step 1).

