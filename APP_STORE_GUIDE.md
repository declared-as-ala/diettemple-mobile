# DietTemple Mobile — Complete App Store Submission Guide

**Status**: Ready to submit ✅  
**Platform**: Android (Google Play) & iOS (Apple App Store)  
**Target Timeline**: 2-4 weeks total (from submission to live)

---

## 📋 TABLE OF CONTENTS

1. [Pre-Submission Checklist](#pre-submission-checklist)
2. [Google Play Store Guide](#google-play-store-guide)
3. [Apple App Store Guide](#apple-app-store-guide)
4. [Common Rejection Reasons](#common-rejection-reasons)
5. [Post-Launch Maintenance](#post-launch-maintenance)

---

## 🔴 PRE-SUBMISSION CHECKLIST

### **1. App Basics**
- [ ] App name finalized: **DietTemple**
- [ ] Package name correct: `com.diettemple.app`
- [ ] Version code: `1` (first release)
- [ ] Version name: `1.0.0`
- [ ] App icon created (512×512 PNG)
- [ ] Screenshots prepared (5-8 screenshots)
- [ ] App description written (short & long)
- [ ] Privacy policy written and hosted online
- [ ] Terms of service written (if applicable)

### **2. Testing**
- [ ] Build production APK: ✅ (via EAS)
- [ ] Test on real Android device: ✅ (minimum)
- [ ] Test all major flows:
  - [ ] Login/Signup
  - [ ] Browse products
  - [ ] Add to cart
  - [ ] Complete checkout
  - [ ] Gender video signup
- [ ] Test on slow network
- [ ] Check crash logs (no major crashes)
- [ ] Verify backend API working
- [ ] Check all images load correctly

### **3. Legal & Compliance**
- [ ] Privacy Policy updated and live at: `https://diettemple.tn/privacy`
- [ ] Terms of Service live at: `https://diettemple.tn/terms`
- [ ] GDPR/CCPA compliance checked (if applicable in Tunisia)
- [ ] No prohibited content (weapons, gambling, etc.)
- [ ] Age rating appropriate (likely 3+ or 12+)
- [ ] Contact email for support: `support@diettemple.tn`

### **4. Content Ready**
- [ ] App name & subtitle
- [ ] Short description (80 chars max)
- [ ] Full description (4000 chars max)
- [ ] 5-8 high-quality screenshots (1080×1920 px each)
- [ ] Feature graphic (1024×500 px for Android)
- [ ] Promotional graphic (180×120 px)
- [ ] App icon (512×512 PNG, no rounded corners)
- [ ] Release notes for v1.0.0

### **5. Accounts & Credentials**
- [ ] Google Play Developer account ($25 one-time fee)
- [ ] Apple Developer account ($99/year)
- [ ] Google API credentials (if needed)
- [ ] Apple certificates generated and saved
- [ ] Bundle ID registered: `com.diettemple.app`

---

## 🟢 GOOGLE PLAY STORE GUIDE

### **STEP 1: Create Developer Account**

**Cost**: $25 (one-time)

1. Go to [Google Play Console](https://play.google.com/console)
2. Sign in with Google account (preferably business account)
3. Accept terms and pay $25 registration fee
4. Complete merchant profile:
   - [ ] Business name: DietTemple
   - [ ] Country: Tunisia
   - [ ] Contact email: your-email@diettemple.tn

**Time**: 15 minutes

---

### **STEP 2: Create New App**

1. Click **"Create app"** button
2. Fill in basic info:
   - App name: **DietTemple**
   - Default language: **French**
   - App or game: **App**
   - Free or paid: **Free**
3. Accept all policies
4. Click **"Create app"**

**Time**: 5 minutes

---

### **STEP 3: Complete Store Listing**

#### **3.1 App Details**
- [ ] **Short description** (50 chars):
  ```
  Transform your physique with DietTemple
  ```
- [ ] **Full description** (4000 chars max):
  ```
  DietTemple est votre compagnon ultime pour la transformation physique.
  
  🏋️ Programme d'entraînement personnalisé
  Suivi scientifique et progression mesurable
  Accès à la boutique de suppléments premium
  Communauté de transformation
  Deviens ta Version Ultime.
  
  Contacter support: support@diettemple.tn
  ```

#### **3.2 Graphics & Screenshots**
Upload in this order:

1. **Phone Screenshots** (min 2, max 8)
   - Size: 1080 × 1920 px (9:16 aspect ratio)
   - Format: PNG or JPG
   - Screenshot 1: Login screen
   - Screenshot 2: Product browse
   - Screenshot 3: Add to cart
   - Screenshot 4: Checkout
   - Screenshot 5: Gender video signup
   - Screenshot 6: Success confirmation
   - Screenshot 7: Profile page
   - Screenshot 8: UH Premium section

2. **Feature Graphic** (header image)
   - Size: 1024 × 500 px
   - Include app name and main value prop
   - Professional design

3. **App Icon**
   - Size: 512 × 512 px
   - PNG format (no transparency)
   - No rounded corners (Google will round them)

4. **Video** (optional but recommended)
   - Upload 30-60 second demo video (MP4)
   - Shows app in action

#### **3.3 Category & Content Rating**
- **Category**: Shopping or Health & Fitness
- **Content Rating**: Complete questionnaire
  - Ads in app? No
  - User-generated content? No
  - Login required? Yes (for some features)
  - Age rating: 3+ or 12+ (depends on content)

#### **3.4 Privacy Policy**
- [ ] Link to privacy policy: `https://diettemple.tn/privacy-policy`
- [ ] Ensure it's accessible and in French
- [ ] Cover: data collection, cookies, user rights

#### **3.5 Contact Details**
- [ ] Support email: `support@diettemple.tn`
- [ ] Business address: Your physical address in Tunisia
- [ ] Phone: Your business number

**Time**: 30-45 minutes

---

### **STEP 4: Upload APK/AAB**

#### **4.1 Generate Production APK**

```bash
cd Mobile
eas build --platform android
# Download APK from EAS dashboard
```

Or use Android App Bundle (recommended):
```bash
eas build --platform android --release
```

#### **4.2 Upload to Google Play**

1. Go to **"Testing"** → **"Internal Testing"**
2. Create new internal testing release:
   - [ ] Upload APK or AAB file
   - [ ] Set version code: `1`
   - [ ] Add release notes: 
     ```
     Initial release
     - Product browse and shopping
     - Gender-specific video signup
     - Order tracking
     ```
3. Click **"Review"** → **"Start rollout to production"**

**Time**: 10 minutes

---

### **STEP 5: Set Pricing & Distribution**

- [ ] **Pricing**: Free
- [ ] **Countries**: Select all or specific (minimum Tunisia)
- [ ] **Device categories**: Phones and Tablets
- [ ] **Content rating age**: Select appropriate rating
- [ ] **Ads**: No ads

**Time**: 5 minutes

---

### **STEP 6: Review & Submit**

1. Click **"Check your app content"**
   - Review all sections (green checkmarks needed)
   - Fix any missing info
2. Scroll to bottom
3. Click **"Submit app for review"**
4. Review compliance statement
5. Click **"Submit"**

**Time**: 5 minutes

---

### **STEP 7: Wait for Review**

- **Expected time**: 2-4 hours (sometimes up to 24 hours)
- **Notification**: Email when approved or rejected
- **Status**: Check in Google Play Console → App status

**Common reasons for rejection:**
- Missing privacy policy
- App crashes on test device
- Misleading description or screenshots
- Permission misuse
- Poor user experience

---

### **✅ Google Play Launch Checklist**

```
PRE-SUBMISSION:
- [ ] APK/AAB ready and tested
- [ ] All screenshots uploaded
- [ ] Privacy policy linked
- [ ] App description complete
- [ ] Content rating set
- [ ] Contact email valid

SUBMISSION:
- [ ] Internal test release created
- [ ] Production rollout started
- [ ] App submitted for review

POST-APPROVAL:
- [ ] App live on Google Play
- [ ] Update app.json version
- [ ] Share download link
```

---

## 🍎 APPLE APP STORE GUIDE

### **STEP 1: Create Developer Account**

**Cost**: $99/year

1. Go to [Apple Developer](https://developer.apple.com)
2. Sign in or create Apple ID
3. Enroll in **Apple Developer Program**
4. Pay $99 annual fee
5. Agree to terms
6. Verify email

**Time**: 30 minutes

---

### **STEP 2: Create App Record**

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click **"+ New App"**
3. Fill in:
   - **Platform**: iOS
   - **Name**: DietTemple
   - **Primary language**: English (or French)
   - **Bundle ID**: `com.diettemple.app` (must match Xcode)
   - **SKU**: `diettemple-mobile-1` (internal, any unique ID)
   - **User access**: Your roles

4. Click **"Create"**

**Time**: 5 minutes

---

### **STEP 3: App Information**

#### **3.1 Basic Info**
- [ ] **App name**: DietTemple
- [ ] **Subtitle**: Transform Your Physique (optional)
- [ ] **Primary category**: Shopping or Health & Fitness
- [ ] **Secondary category**: Fitness (optional)
- [ ] **Content rating**: Complete questionnaire
  - Realistic violence? No
  - Gambling? No
  - Medical/health info? No/Yes (if fitness content)
  - Alcohol/tobacco? No

#### **3.2 App Icon & Screenshots**

Upload for iPhone in this order:

1. **App Icon** (required)
   - Size: 1024 × 1024 px
   - PNG format
   - No transparency
   - No rounded corners

2. **iPhone Screenshots** (2-10 per size class)
   - Sizes: 
     - iPhone 6.7": 1242 × 2688 px
     - iPhone 6.5": 1242 × 2688 px
     - iPhone 5.5": 1242 × 2208 px
     - iPhone 5.8": 1125 × 2436 px
   - Format: PNG or JPG
   - Show key features (same as Google Play)

3. **iPad Screenshots** (optional but recommended)
   - Size: 2048 × 2732 px (12.9")
   - Show iPad layout

#### **3.3 Promotional Image (optional)**
- Size: 1200 × 627 px
- For featuring in App Store

#### **3.4 Description**
- [ ] **Description** (4000 chars max):
  ```
  DietTemple is your ultimate companion for physical transformation.
  
  KEY FEATURES:
  🏋️ Personalized Workout Programs - Scientific training protocols designed by experts
  📊 Progress Tracking - Measurable results and detailed analytics
  🛒 Premium Supplement Shop - Curated nutrition and supplements
  👥 Transformation Community - Connect with like-minded individuals
  🎯 Video Guidance - Expert-led training videos
  
  BECOME YOUR ULTIMATE VERSION.
  
  DietTemple combines cutting-edge fitness science with practical guidance to help you achieve lasting transformation.
  
  Privacy Policy: https://diettemple.tn/privacy-policy
  Contact: support@diettemple.tn
  ```

- [ ] **Keywords** (100 chars max):
  ```
  fitness, workout, gym, training, nutrition, health, supplements, transformation
  ```

- [ ] **Support URL**: `https://diettemple.tn/support`
- [ ] **Privacy Policy URL**: `https://diettemple.tn/privacy-policy`
- [ ] **License Agreement**: `https://diettemple.tn/terms`

#### **3.5 Release Notes**
```
Version 1.0.0 - Initial Release

Welcome to DietTemple! Your personal fitness transformation begins here.

Features:
• Complete workout program with personalized plans
• Premium supplement marketplace
• Gender-specific video guidance
• Order tracking and management
• Progress analytics

Thank you for joining the DietTemple community!
```

**Time**: 45 minutes

---

### **STEP 4: Build & Sign App**

#### **4.1 Create Production Build**

For iOS, you'll need to use Xcode or EAS Build:

```bash
cd Mobile
eas build --platform ios
# Download .ipa file from EAS
```

#### **4.2 Code Signing (via EAS)**

EAS handles code signing automatically if you:
1. Connect Apple ID in EAS dashboard
2. Let EAS create certificates
3. Download built .ipa

**Time**: 15-30 minutes

---

### **STEP 5: Upload Build**

#### **Using Transporter App** (recommended)

1. Download [Transporter](https://apps.apple.com/app/transporter/id1450874784) from Mac App Store
2. Sign in with Apple ID
3. Drag & drop .ipa file
4. Click **"Deliver"**
5. Wait for processing (5-10 min)

#### **Alternative: Xcode**

1. In Xcode: Product → Archive
2. Window → Organizer
3. Select archive → Distribute App
4. Choose "App Store Connect"
5. Follow prompts to upload

**Time**: 10 minutes

---

### **STEP 6: Configure for Review**

#### **6.1 TestFlight (Internal Testing)**
Optional but recommended before full review:

1. Go to **TestFlight** tab
2. Add internal testers (up to 100)
3. Invite testers via email
4. Collect feedback
5. Fix issues if needed
6. Re-upload new build if necessary

#### **6.2 Build Selection**

1. Go to **"App Store"** tab
2. Select **"Build"** section
3. Choose build for review
4. Click **"Add for Review"**

**Time**: 5 minutes

---

### **STEP 7: Provide Review Information**

Fill in review details:

- [ ] **Sign In Requirements**: Yes (some features require login)
- [ ] **Test Account**: 
  ```
  Username: test@diettemple.tn
  Password: TestPassword123!
  ```
- [ ] **Testing Notes**: 
  ```
  App allows anonymous browsing of products.
  Gender-specific video signup available on signup screen.
  Test account provides access to order history and profile features.
  ```
- [ ] **Notes for Reviewers**: 
  ```
  This is a fitness and nutrition platform with e-commerce functionality.
  The app includes personalized workout programs and a supplement marketplace.
  ```

**Time**: 10 minutes

---

### **STEP 8: Submit for Review**

1. Scroll to top of page
2. Click **"Submit for Review"**
3. Confirm age rating
4. Confirm export/encryption laws (usually "No")
5. Confirm advertising compliance
6. Click **"Submit"**

**Time**: 2 minutes

---

### **STEP 9: Wait for Review**

- **Expected time**: 24-48 hours (sometimes 1 week)
- **Notification**: Email when approved or needs action
- **Status**: Check in App Store Connect → Version Status
- **Possible outcomes**:
  - ✅ Approved → App goes live
  - ⚠️ Needs information → Respond and resubmit
  - ❌ Rejected → Fix issues and resubmit

**Time**: 1-7 days

---

### **✅ Apple App Store Launch Checklist**

```
PRE-SUBMISSION:
- [ ] Developer account active ($99/year)
- [ ] Bundle ID configured
- [ ] App icon 1024×1024 PNG ready
- [ ] 5-10 screenshots per device size ready
- [ ] Description written (4000 chars)
- [ ] Keywords defined (100 chars)
- [ ] Privacy policy live
- [ ] TestFlight builds tested

SUBMISSION:
- [ ] Build uploaded via Transporter
- [ ] All metadata filled in
- [ ] Review information complete
- [ ] App submitted for review

POST-APPROVAL:
- [ ] App goes live automatically
- [ ] Share download link
- [ ] Monitor reviews and ratings
```

---

## 🔴 COMMON REJECTION REASONS

### **Google Play Store**
| Issue | Solution |
|-------|----------|
| App crashes on startup | Test on real device, check logcat |
| Missing privacy policy | Add link to privacy policy |
| Vague description | Be specific about features |
| Bad screenshots | Use actual app screenshots, add text overlays |
| Misleading permissions | Only request needed permissions |
| Malware detected | Ensure all code is legitimate |

### **Apple App Store**
| Issue | Solution |
|-------|----------|
| "This app does not include a privacy policy" | Add in App Store Connect → App Information |
| Crashes on launch | Test in Xcode simulator and device |
| Missing TestFlight build | Upload .ipa via Transporter |
| Needs test account details | Provide valid test account credentials |
| "Guideline 2.1 - App Functionality" | Ensure app works as described |
| Sign-in required but no account option | Allow anonymous access or provide test account |

### **For Both**
| Issue | Solution |
|-------|----------|
| API unreachable | Ensure backend is live at api.diettemple.tn |
| No network connection | Test offline error handling |
| Performance issues | Optimize images, reduce API calls |
| UX problems | Test on multiple devices, fix issues |
| Wrong category | Choose "Shopping" or "Health & Fitness" |

---

## ✅ POST-LAUNCH MAINTENANCE

### **Day 1: Live**
- [ ] Monitor crash reports (Google Play & App Store Connect)
- [ ] Check for negative reviews
- [ ] Respond to support emails immediately
- [ ] Monitor server logs for errors
- [ ] Verify analytics tracking works

### **Week 1: Monitor**
- [ ] Check daily crash rates (should be < 0.1%)
- [ ] Review user feedback
- [ ] Monitor API response times
- [ ] Fix any critical bugs ASAP
- [ ] Track user signups and retention

### **Month 1: Optimize**
- [ ] Analyze user behavior in analytics
- [ ] Fix bug reports and crashes
- [ ] Update screenshots if needed
- [ ] Respond to all reviews (positive and negative)
- [ ] Plan next features based on feedback

### **Ongoing**
- [ ] Monthly check for OS updates compatibility
- [ ] Update version yearly (required by Apple)
- [ ] Keep description and screenshots fresh
- [ ] Respond to reviews within 24 hours
- [ ] Monitor performance metrics
- [ ] Plan feature releases every 2-4 weeks

---

## 📈 EXPECTED TIMELINE

| Phase | Duration | Notes |
|-------|----------|-------|
| Pre-submission prep | 1-2 days | Screenshots, descriptions, testing |
| Google Play review | 2-4 hours | Usually fast |
| Apple App Store review | 1-7 days | More variable |
| **Total to live** | **2-9 days** | From submission to both stores |

---

## 🎯 LAUNCH DAY CHECKLIST

**Before you submit anything:**
- [ ] Backend (api.diettemple.tn) is 100% stable
- [ ] All endpoints tested and working
- [ ] APK/IPA tested on real devices
- [ ] No crashes found
- [ ] All graphics ready
- [ ] Descriptions finalized
- [ ] Contact emails monitored
- [ ] Support team briefed

**After approval:**
- [ ] Announce launch on social media
- [ ] Share download links
- [ ] Monitor reviews closely
- [ ] Respond to users quickly
- [ ] Fix bugs within 24 hours

---

## 📞 SUPPORT & TROUBLESHOOTING

### **If App Gets Rejected**

1. **Read rejection reason carefully**
2. **Identify specific problem** (crashes, policy, content, etc.)
3. **Fix the issue** in code or metadata
4. **Rebuild and retest** locally
5. **Resubmit** with explanation of fixes
6. **Follow up** if no response after 48 hours

### **Contacts**
- **Google Play Help**: https://support.google.com/googleplay
- **Apple Support**: https://developer.apple.com/support
- **DietTemple Support**: support@diettemple.tn

---

## 🚀 YOU'RE READY!

**Summary:**
- ✅ Google Play Store: 2-4 hour review
- ✅ Apple App Store: 1-7 day review
- ✅ Total effort: 4-6 hours of work
- ✅ Total cost: $25 (Google) + $99/year (Apple)

**Next steps:**
1. Create accounts (Google + Apple)
2. Prepare all assets (screenshots, description, privacy policy)
3. Build production APK/IPA
4. Test thoroughly on real devices
5. Submit to both stores
6. Wait for approval
7. 🎉 Go live!

---

**Questions?** Refer to specific platform docs:
- [Google Play Console Help](https://support.google.com/googleplay/android-developer)
- [App Store Connect Help](https://help.apple.com/app-store-connect)

**Good luck! 🚀**
