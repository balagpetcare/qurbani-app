# Cursor AI Command for Android/Flutter App

You are working inside the Qurbani 2026 Android mobile app project. Use the provided image assets from this ZIP file and implement a clean, production-ready image usage system for the app.

Goal:
Use the Qurbani 2026 logo, banner, splash, onboarding, and promotional screenshots properly inside the Android/Flutter app without converting functional screens into static images.

Asset placement:
1. Copy these files into the app assets folder:
   - assets/images/brand/qurbani_original_square_logo.png
   - assets/images/brand/qurbani_app_icon_logo.png
   - assets/images/banners/qurbani_original_wide_banner.png
   - assets/images/banners/qurbani_feature_banner.png
   - assets/images/splash/qurbani_splash_screen.png
   - assets/images/onboarding/qurbani_onboarding_welcome.png
   - assets/images/store/qurbani_services_screenshot.png
   - assets/images/store/qurbani_request_form_screenshot.png
   - assets/images/store/qurbani_area_doctor_support_screenshot.png

2. Update pubspec.yaml and register all image asset folders:
   assets:
     - assets/images/brand/
     - assets/images/banners/
     - assets/images/splash/
     - assets/images/onboarding/
     - assets/images/store/

Implementation requirements:
1. Create a reusable BrandAssets class/file that defines constants for all image paths.
2. Create a reusable BrandLogo widget:
   - Supports small, medium, large sizes.
   - Uses qurbani_app_icon_logo.png by default.
   - Has optional rounded corners and shadow.
3. Create a reusable BrandBanner widget:
   - Uses qurbani_original_wide_banner.png.
   - Mobile responsive.
   - Uses BoxFit.cover.
   - Has rounded corners and soft shadow.
4. Implement or update SplashScreen:
   - Use qurbani_splash_screen.png or a clean layout using BrandLogo.
   - Keep loading simple: logo, app name, tagline, loading indicator.
   - Do not show too many buttons on splash.
5. Implement or update Onboarding/Welcome screen:
   - Use the brand style from qurbani_onboarding_welcome.png.
   - Actual UI should be Flutter widgets, not only a static image.
   - Text:
     স্বাগতম
     কোরবানির পশুর জরুরি চিকিৎসা, দ্রুত সহায়তা ও নির্ভরযোগ্য সেবা
   - Buttons:
     শুরু করুন
     পরে দেখব
6. Implement Home screen top hero:
   - Use qurbani_original_wide_banner.png as top hero banner.
   - Add primary CTA: রিকোয়েস্ট পাঠান
   - Add secondary CTA: ডাক্তার হিসেবে যুক্ত হন
7. Implement Services section using real Flutter cards/widgets:
   - জরুরি চিকিৎসা
   - ডাক্তার সহায়তা
   - এলাকাভিত্তিক সেবা
   - দ্রুত যোগাযোগ
   Use the generated services screenshot only as visual reference.
8. Implement Request form screen with real input fields:
   - এলাকা নির্বাচন করুন
   - পশুর ধরন
   - সমস্যার বিবরণ দিন
   - আপনার মোবাইল নম্বর
   - জরুরি সহায়তা প্রয়োজন?
   - CTA: রিকোয়েস্ট সাবমিট করুন
   Do not use the screenshot as the actual form.
9. Implement Area-based Doctor Support screen/section:
   - Use real widgets for area selector and doctor list.
   - Do not show doctor phone/WhatsApp numbers publicly.
   - Contact details must only be visible after valid lead assignment/access.
10. Use the store screenshots only for Play Store/App Store marketing or an internal preview page, not as functional app pages.

Brand style:
- Primary green: deep forest green.
- Accent gold: warm gold.
- Background: mint/white gradient.
- UI style: rounded cards, soft shadows, mobile-first layout, large touch-friendly buttons.
- Bangla text must be clean, natural, and readable.

Quality checks:
1. Run flutter pub get.
2. Run dart format.
3. Run flutter analyze.
4. Run flutter test if tests exist.
5. Build Android debug APK to verify assets:
   flutter build apk --debug

Final output required:
- List all files changed.
- Confirm where each image is used.
- Confirm that no customer-facing public screen exposes doctor phone/WhatsApp numbers.
