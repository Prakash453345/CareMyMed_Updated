/**
 * medicationScheduler.js — Utilities for day-specific medication scheduling.
 *
 * Handles filtering medications by day of week (e.g., Mon/Wed/Fri, Sundays only),
 * alternate days, weekly intervals, and generating user-friendly schedule badges.
 */

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_ABBRS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DISPLAY_ABBRS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Checks whether a given medication is scheduled for a target date (defaults to today).
 *
 * @param {Object} med - Medication object
 * @param {Date} [targetDate=new Date()] - Target Date to check against
 * @returns {boolean}
 */
export function isMedicationScheduledForToday(med, targetDate = new Date()) {
  if (!med) return false;

  // Status check: inactive/paused/discontinued medications return false
  if (med.status && med.status !== 'active') return false;
  if (med.is_active === false || med.isActive === false) return false;

  const dateObj = targetDate instanceof Date ? targetDate : new Date(targetDate);
  const dayIndex = dateObj.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const currentDayName = DAY_NAMES[dayIndex];
  const currentDayAbbr = DAY_ABBRS[dayIndex];

  // 1. Check explicit daysOfWeek / days_of_week array
  const days = med.daysOfWeek || med.days_of_week || med.frequency_days;
  if (Array.isArray(days) && days.length > 0) {
    const normalizedDays = days.map((d) => String(d).toLowerCase().trim());
    if (
      normalizedDays.includes('daily') ||
      normalizedDays.includes('everyday') ||
      normalizedDays.includes('every day')
    ) {
      return true;
    }
    return normalizedDays.some(
      (d) => d === currentDayName || d === currentDayAbbr || d.startsWith(currentDayAbbr)
    );
  }

  // 2. Check frequency string if present
  const freqStr =
    (typeof med.frequency === 'string' ? med.frequency : '') ||
    (typeof med.frequency_type === 'string' ? med.frequency_type : '');
  const lowerFreq = freqStr.toLowerCase();

  if (lowerFreq) {
    if (lowerFreq.includes('as needed') || lowerFreq.includes('prn')) {
      return true; // As Needed meds are always accessible
    }

    // Explicit day mentions in string (e.g. "Mon, Wed, Fri" or "Every Sunday")
    const mentionsCurrentDay =
      lowerFreq.includes(currentDayName) || lowerFreq.includes(currentDayAbbr);
    const mentionsAnySpecificDay =
      DAY_NAMES.some((d) => lowerFreq.includes(d)) ||
      DAY_ABBRS.some((d) => lowerFreq.includes(d));

    if (mentionsAnySpecificDay) {
      return mentionsCurrentDay;
    }

    // Weekly default (if weekly and no specific day given, default to Sunday or creation day)
    if (/once\s*a\s*week|weekly|1\/week|every\s*week/i.test(lowerFreq)) {
      const scheduledDay = med.weekly_day ? med.weekly_day.toLowerCase() : 'sunday';
      return currentDayName === scheduledDay || currentDayAbbr === scheduledDay;
    }

    // Alternate days (every 2 days)
    if (/alternate\s*day/i.test(lowerFreq)) {
      const start = new Date(med.startDate || med.created_at || Date.now());
      const diffDays = Math.floor((dateObj - start) / (1000 * 60 * 60 * 24));
      return diffDays % 2 === 0;
    }
  }

  // Default: Daily medication
  return true;
}

/**
 * Filter an array of medications down to those scheduled for the target date.
 */
export function filterMedsForDate(medsList = [], targetDate = new Date()) {
  if (!Array.isArray(medsList)) return [];
  return medsList.filter((med) => isMedicationScheduledForToday(med, targetDate));
}

/**
 * Get human-readable schedule badge label for display in UI cards.
 * e.g., "Every Mon, Wed, Fri", "Sundays Only", "Daily", "As Needed".
 */
export function getFormattedScheduleLabel(med) {
  if (!med) return 'Daily';

  const days = med.daysOfWeek || med.days_of_week || med.frequency_days;
  if (Array.isArray(days) && days.length > 0) {
    const normalizedDays = days.map((d) => String(d).toLowerCase().trim());
    if (
      normalizedDays.includes('daily') ||
      normalizedDays.includes('everyday') ||
      normalizedDays.includes('every day') ||
      normalizedDays.length === 7
    ) {
      return 'Daily';
    }

    // Format e.g., ["monday", "wednesday", "friday"] -> "Mon, Wed, Fri"
    const matchedAbbrs = DAY_NAMES.map((name, idx) => {
      const isMatch = normalizedDays.some(
        (d) => d === name || d === DAY_ABBRS[idx] || d.startsWith(DAY_ABBRS[idx])
      );
      return isMatch ? DISPLAY_ABBRS[idx] : null;
    }).filter(Boolean);

    if (matchedAbbrs.length === 1) {
      return `${matchedAbbrs[0]}s Only`;
    }
    if (matchedAbbrs.length > 1) {
      return `Every ${matchedAbbrs.join(', ')}`;
    }
  }

  const freqStr =
    (typeof med.frequency === 'string' ? med.frequency : '') ||
    (typeof med.frequency_type === 'string' ? med.frequency_type : '');
  const lowerFreq = freqStr.toLowerCase();

  if (/once\s*a\s*week|weekly|1\/week|every\s*week/i.test(lowerFreq)) {
    return 'Once Weekly';
  }
  if (/twice\s*a\s*week|2x\/week/i.test(lowerFreq)) {
    return 'Twice Weekly';
  }
  if (/twice\s*a\s*month|2x\/month|every\s*2\s*weeks|biweekly/i.test(lowerFreq)) {
    return 'Twice Monthly';
  }
  if (/once\s*a\s*month|monthly/i.test(lowerFreq)) {
    return 'Monthly';
  }
  if (/alternate\s*day/i.test(lowerFreq)) {
    return 'Alternate Days';
  }
  if (/as needed|prn/i.test(lowerFreq)) {
    return 'As Needed';
  }

  return freqStr || 'Daily';
}
