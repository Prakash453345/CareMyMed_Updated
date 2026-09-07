import type { GoldieConfig } from "goldie";

/**
 * Goldie Configuration for CareMyMed (Google Play Store).
 *
 * NOTE: "pixel-10-pro" is used strictly as Goldie's Google Play output and
 * device framing specification (1080x1920 portrait PNG). The source screenshots
 * are captured directly from the physical OnePlus CE6 test device.
 */
const config: GoldieConfig = {
  appRoot: process.cwd(),
  bundleId: "com.careco.users",
  appPath: "./android/app/build/outputs/apk/release/app-release.apk",
  android: {
    appPath: "./android/app/build/outputs/apk/release/app-release.apk",
    applicationId: "com.careco.users",
  },
  // Goldie output/frame specification only. Source capture is from physical OnePlus CE6.
  devices: ["pixel-10-pro"],
  locales: ["en-US"],
  appearance: "light",
  frame: { variant: "17-pro-blue" },
  theme: {
    background: "linear-gradient(165deg, #F3E8FF 0%, #FAF5FF 40%, #FFFFFF 100%)",
    headlineColor: "#1E1B4B",
    subheadColor: "#5B21B6",
    fontFamily: '-apple-system, "SF Pro Display", Roboto, "Segoe UI", sans-serif',
    copyHeightRatio: 0.21,
    deviceWidthRatio: 1.0,
    layout: "classic",
    screenOnly: true,
  },
  store: {
    name: "CareMyMed",
    subtitle: {
      "en-US": "Healthcare & Medication Companion",
    },
    developer: "CareMyMed Inc.",
    category: "Medical",
    rating: 4.9,
    ratingCount: "1.2k",
    ageRating: "12+",
    price: "Free",
    description: {
      "en-US":
        "CareMyMed brings your daily vitals, scheduled medications, wearable analytics, and patient health score into a single, unified command center.",
    },
  },
  scenes: [
    {
      kind: "screenshot",
      id: "01-dashboard",
      flow: "dashboard.yaml",
      headline: {
        "en-US": "Your Daily Health Score",
      },
      subhead: {
        "en-US": "Morning health briefs, score trends, and medication reminders",
      },
    },
    {
      kind: "screenshot",
      id: "02-medication-plan",
      flow: "medication-plan.yaml",
      headline: {
        "en-US": "Smart Dose Schedules & Vitals",
      },
      subhead: {
        "en-US": "Scheduled dose tracking, wearable sync, and vitals check-in",
      },
    },
    {
      kind: "screenshot",
      id: "03-mood-coaching",
      flow: "mood-coaching.yaml",
      headline: {
        "en-US": "Personalized Daily Coaching",
      },
      subhead: {
        "en-US": "Mood tracking and habit building tailored to your routine",
      },
    },
    {
      kind: "screenshot",
      id: "04-profile-security",
      flow: "profile-security.yaml",
      headline: {
        "en-US": "Secure Health Records",
      },
      subhead: {
        "en-US": "Full data ownership, exportable medical records, and privacy controls",
      },
    },
    {
      kind: "screenshot",
      id: "05-secure-access",
      flow: "secure-access.yaml",
      headline: {
        "en-US": "Frictionless & Protected Access",
      },
      subhead: {
        "en-US": "Fast, HIPAA-conscious authentication for patients & caregivers",
      },
    },
  ],
};

export default config;
