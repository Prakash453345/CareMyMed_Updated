/**
 * medicationSupplyEngine.js
 * Pure, architecture-grade medication supply & prescription engine.
 * Single source of truth for dosage, daily consumption, days remaining, and refill calculations.
 */

/**
 * Normalizes a medication name by lowercasing, trimming, and stripping dosage numbers (e.g. "500mg", "650")
 * while preserving form/release modifiers like "XR", "SR", "FORTE", "EC", "PLUS".
 */
export function normalizeMedicationName(name) {
  if (!name || typeof name !== 'string') return '';
  return name
    .trim()
    .toLowerCase()
    .replace(/\b\d+(?:\.\d+)?\s*(?:mg|g|mcg|ml|iu|m|tablets?|tabs?|capsules?|caps?)\b/gi, '')
    .replace(/\b\d+\b/g, '') // remove standalone numbers
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Safely matches a selected medication against master medication list.
 * Match priority:
 * 1. Exact _id / id match
 * 2. Exact raw name match (case-insensitive)
 * 3. Exact normalized name match
 * 4. Substring fallback (only if non-ambiguous)
 */
export function matchMasterMedication(selectedMed, allMeds) {
  if (!selectedMed || !Array.isArray(allMeds) || allMeds.length === 0) return null;

  const selId = (selectedMed._id || selectedMed.id || '').toString();
  const rawSelName = (selectedMed.name || selectedMed.medicine_name || '').trim().toLowerCase();
  const normSelName = normalizeMedicationName(selectedMed.name || selectedMed.medicine_name);

  if (!rawSelName && !selId) return null;

  // Priority 1: Exact ID match
  if (selId) {
    const idMatch = allMeds.find(m => (m._id || m.id || '').toString() === selId);
    if (idMatch) return idMatch;
  }

  // Priority 2: Exact raw name match
  const rawMatch = allMeds.find(m => (m.name || m.medicine_name || '').trim().toLowerCase() === rawSelName);
  if (rawMatch) return rawMatch;

  // Priority 3: Exact normalized name match
  if (normSelName) {
    const normMatches = allMeds.filter(m => normalizeMedicationName(m.name || m.medicine_name) === normSelName);
    if (normMatches.length === 1) return normMatches[0];
    if (normMatches.length > 1) {
      // If multiple match normalized name, pick one that matches dosage form or return first
      return normMatches[0];
    }
  }

  // Priority 4: Safe non-ambiguous substring match
  if (normSelName && normSelName.length >= 3) {
    const subMatches = allMeds.filter(m => {
      const targetNorm = normalizeMedicationName(m.name || m.medicine_name);
      return targetNorm.includes(normSelName) || normSelName.includes(targetNorm);
    });
    if (subMatches.length === 1) return subMatches[0];
  }

  return null;
}

/**
 * Detects if a medication is SOS / PRN / As Needed.
 */
export function isPRNMedication(prescription, selectedSlot) {
  const target = prescription || selectedSlot || {};
  const freqStr = (
    (typeof target.frequency === 'string' ? target.frequency : '') ||
    (typeof target.frequency_type === 'string' ? target.frequency_type : '') ||
    (typeof target.instructions === 'string' ? target.instructions : '') ||
    (typeof selectedSlot?.frequency === 'string' ? selectedSlot.frequency : '') ||
    (typeof selectedSlot?.instructions === 'string' ? selectedSlot.instructions : '')
  ).toLowerCase();

  const slotStr = (target.slot || selectedSlot?.slot || target.type || selectedSlot?.type || '').toLowerCase();

  return /sos|prn|as\s*needed|when\s*required|on\s*demand|if\s*needed|as\s*required/i.test(freqStr) ||
         /as_needed/i.test(slotStr);
}

/**
 * Extracts quantityPerDose (tablets/units taken in a single dose).
 */
export function resolveQuantityPerDose(prescription, selectedSlot) {
  const target = prescription || selectedSlot || {};
  
  if (typeof target.quantityPerDose === 'number' && target.quantityPerDose > 0) return target.quantityPerDose;
  if (typeof target.pills_per_dose === 'number' && target.pills_per_dose > 0) return target.pills_per_dose;
  if (typeof target.dose_quantity === 'number' && target.dose_quantity > 0) return target.dose_quantity;

  const dosageStr = ((target.dosage || selectedSlot?.dosage || '') + ' ' + (target.unit || '')).toLowerCase();
  const freqStr = (target.frequency || selectedSlot?.frequency || '').toLowerCase();

  if (/½|1\/2|0\.5/.test(dosageStr) || /½|1\/2|0\.5/.test(freqStr)) return 0.5;

  const qtyMatch = dosageStr.match(/(\d+(?:\.\d+)?)\s*(?:tablet|tablets|tab|tabs|pill|pills|cap|capsule|capsules)/i) ||
                   freqStr.match(/(\d+(?:\.\d+)?)\s*(?:tablet|tablets|tab|tabs|pill|pills|cap|capsule|capsules)\s*(?:per|each|\/|\b)/i);

  if (qtyMatch && parseFloat(qtyMatch[1]) > 0) {
    return parseFloat(qtyMatch[1]);
  }

  return 1; // Default 1 tablet per dose
}

/**
 * Resolves dosesPerDay using strict hierarchical source priority & slot deduplication.
 * Priority:
 * 1. Master prescription explicit times/scheduledTimes/slots array length
 * 2. Store medicationSchedule deduplicated slot occurrences
 * 3. Store dashboardMeds deduplicated slot occurrences
 * 4. Structured frequency string & Indian 1-0-1 notation
 * 5. Default fallback = 1
 */
export function resolveDosesPerDay(prescription, selectedSlot, storeState) {
  if (isPRNMedication(prescription, selectedSlot)) {
    return 0; // PRN has 0 fixed daily doses
  }

  const selectedNameNorm = normalizeMedicationName(selectedSlot?.name || selectedSlot?.medicine_name || prescription?.name);
  const sources = {};

  // Priority 1: Master prescription explicit array length
  if (prescription) {
    const timesArr = Array.isArray(prescription.times) && prescription.times.length > 0 ? prescription.times :
                     Array.isArray(prescription.scheduledTimes) && prescription.scheduledTimes.length > 0 ? prescription.scheduledTimes :
                     Array.isArray(prescription.scheduled_times) && prescription.scheduled_times.length > 0 ? prescription.scheduled_times :
                     Array.isArray(prescription.slots) && prescription.slots.length > 0 ? prescription.slots : null;
    if (timesArr) {
      sources.masterTimes = timesArr.length;
    }
  }

  // Priority 2: Grouped medicationSchedule deduplicated slot occurrences
  const schedule = storeState?.medicationSchedule;
  if (schedule && selectedNameNorm) {
    const uniqueSlots = new Set();
    Object.entries(schedule).forEach(([slotName, slotMeds]) => {
      if (Array.isArray(slotMeds)) {
        slotMeds.forEach(item => {
          if (normalizeMedicationName(item.name || item.medicine_name) === selectedNameNorm) {
            uniqueSlots.add(slotName);
          }
        });
      }
    });
    if (uniqueSlots.size > 0) {
      sources.medicationSchedule = uniqueSlots.size;
    }
  }

  // Priority 3: Flat dashboardMeds deduplicated slot occurrences
  const dashboardMeds = storeState?.dashboardMeds;
  if (Array.isArray(dashboardMeds) && selectedNameNorm) {
    const uniqueSlots = new Set();
    dashboardMeds.forEach(item => {
      if (normalizeMedicationName(item.name || item.medicine_name) === selectedNameNorm) {
        const slotKey = item.type || item.scheduled_time || item.slot || item.id || item.time || Math.random().toString();
        uniqueSlots.add(slotKey);
      }
    });
    if (uniqueSlots.size > 0) {
      sources.dashboardMeds = uniqueSlots.size;
    }
  }

  // Priority 4: Frequency string text parsing & Indian 1-0-1 notation
  const freqStr = (
    (typeof prescription?.frequency === 'string' ? prescription.frequency : '') ||
    (typeof prescription?.instructions === 'string' ? prescription.instructions : '') ||
    (typeof selectedSlot?.frequency === 'string' ? selectedSlot.frequency : '') ||
    (typeof selectedSlot?.instructions === 'string' ? selectedSlot.instructions : '')
  ).toLowerCase();

  if (freqStr) {
    const dashMatch = freqStr.match(/\b([0-4])\s*-\s*([0-4])\s*-\s*([0-4])\b/);
    if (dashMatch) {
      const mDose = parseInt(dashMatch[1], 10);
      const aDose = parseInt(dashMatch[2], 10);
      const nDose = parseInt(dashMatch[3], 10);
      const activeSlots = (mDose > 0 ? 1 : 0) + (aDose > 0 ? 1 : 0) + (nDose > 0 ? 1 : 0);
      if (activeSlots > 0) {
        sources.freqText = activeSlots;
      }
    } else if (/twice|2x|2\/day|2\s*times|bid|b\.i\.d|two\s*times|twice\s*daily/i.test(freqStr)) {
      sources.freqText = 2;
    } else if (/thrice|3x|3\/day|3\s*times|tid|t\.i\.d|three\s*times|three\s*daily/i.test(freqStr)) {
      sources.freqText = 3;
    } else if (/4x|4\/day|4\s*times|qid|q\.i\.d|four\s*times/i.test(freqStr)) {
      sources.freqText = 4;
    } else if (/once|1x|1\/day|1\s*time|qd|q\.d|once\s*daily/i.test(freqStr)) {
      sources.freqText = 1;
    }
  }

  // Evaluate Priority Order
  const dosesPerDay = sources.masterTimes ??
                      sources.medicationSchedule ??
                      sources.dashboardMeds ??
                      sources.freqText ?? 1;

  // Log mismatch warning if high-confidence sources disagree
  const uniqueVals = new Set(Object.values(sources));
  if (uniqueVals.size > 1) {
    console.warn('[SUPPLY ENGINE MISMATCH]', {
      medication: selectedSlot?.name || prescription?.name,
      resolvedDosesPerDay: dosesPerDay,
      sources,
    });
  }

  return dosesPerDay;
}

/**
 * Derives the complete normalized prescription model.
 */
export function derivePrescriptionModel(selectedMed, storeState = null) {
  if (!selectedMed) {
    return {
      prescription: null,
      selectedSlot: null,
      quantityPerDose: 1,
      dosesPerDay: 1,
      dailyTabletConsumption: 1,
      isPRN: false,
    };
  }

  const allMeds = storeState?.patient?.medications ||
                  storeState?.patientData?.medications ||
                  storeState?.medications || [];

  const masterMed = matchMasterMedication(selectedMed, allMeds);
  const isPRN = isPRNMedication(masterMed, selectedMed);
  const quantityPerDose = resolveQuantityPerDose(masterMed, selectedMed);
  const dosesPerDay = resolveDosesPerDay(masterMed, selectedMed, storeState);
  const dailyTabletConsumption = isPRN ? 0 : quantityPerDose * dosesPerDay;

  return {
    prescription: masterMed,
    selectedSlot: selectedMed,
    quantityPerDose,
    dosesPerDay,
    dailyTabletConsumption,
    isPRN,
  };
}

/**
 * Calculates estimated days remaining cleanly supporting decimals (e.g. 24.5 days).
 */
export function calculateDaysRemaining(remainingDoses, dailyTabletConsumption) {
  if (typeof remainingDoses !== 'number' || remainingDoses < 0) return null;
  if (!dailyTabletConsumption || dailyTabletConsumption <= 0) return null;

  const rawDays = remainingDoses / dailyTabletConsumption;
  // Return formatted float (1 decimal if not whole, e.g. 24.5 or 12.25 -> 12.3)
  return Math.round(rawDays * 10) / 10;
}

/**
 * Calculates refill package preset sizes dynamically based on daily consumption.
 */
export function calculateRefillPresets(dailyTabletConsumption, monthsArr = [1, 2, 3]) {
  const consumption = (!dailyTabletConsumption || dailyTabletConsumption <= 0) ? 1 : dailyTabletConsumption;
  return monthsArr.map(months => ({
    months,
    tablets: Math.max(1, Math.round(consumption * 30 * months)),
  }));
}
