import {
  normalizeMedicationName,
  matchMasterMedication,
  isPRNMedication,
  resolveQuantityPerDose,
  resolveDosesPerDay,
  derivePrescriptionModel,
  calculateDaysRemaining,
  calculateRefillPresets,
} from '../../src/utils/medicationSupplyEngine';

describe('medicationSupplyEngine — Architecture-Grade Test Suite', () => {
  describe('normalizeMedicationName', () => {
    it('normalizes dosage numbers while preserving variant modifiers', () => {
      expect(normalizeMedicationName('Metformin 500mg')).toBe('metformin');
      expect(normalizeMedicationName('Metformin XR 500mg')).toBe('metformin xr');
      expect(normalizeMedicationName('Dolo 650')).toBe('dolo');
      expect(normalizeMedicationName(' Vitamin D3 60000 IU ')).toBe('vitamin d3');
    });
  });

  describe('matchMasterMedication', () => {
    const allMeds = [
      { _id: 'med_1', name: 'Metformin 500mg', times: ['morning', 'night'] },
      { _id: 'med_2', name: 'Metformin XR 1000mg', times: ['night'] },
      { _id: 'med_3', name: 'Paracetamol', frequency: 'SOS as needed' },
    ];

    it('matches by exact _id first', () => {
      const selected = { id: 'med_2', name: 'Metformin' };
      const matched = matchMasterMedication(selected, allMeds);
      expect(matched._id).toBe('med_2');
    });

    it('matches by normalized name cleanly without false collisions between Metformin and Metformin XR', () => {
      const selectedReg = { name: 'Metformin' };
      const matchedReg = matchMasterMedication(selectedReg, allMeds);
      expect(matchedReg._id).toBe('med_1');

      const selectedXR = { name: 'Metformin XR' };
      const matchedXR = matchMasterMedication(selectedXR, allMeds);
      expect(matchedXR._id).toBe('med_2');
    });
  });

  describe('resolveDosesPerDay & Hierarchical Priority', () => {
    it('resolves dosesPerDay = 2 for Metformin scheduled morning and night', () => {
      const prescription = { name: 'Metformin 500mg', times: ['morning', 'night'] };
      const selectedSlot = { name: 'Metformin', type: 'night' };
      const storeState = {
        dashboardMeds: [
          { name: 'Metformin', type: 'morning' },
          { name: 'Metformin', type: 'night' },
        ],
      };

      const doses = resolveDosesPerDay(prescription, selectedSlot, storeState);
      expect(doses).toBe(2);
    });

    it('deduplicates duplicate dashboard entries for the same slot', () => {
      const selectedSlot = { name: 'Metformin', type: 'night' };
      const storeState = {
        dashboardMeds: [
          { name: 'Metformin', type: 'morning' },
          { name: 'Metformin', type: 'morning' }, // duplicate log
          { name: 'Metformin', type: 'night' },
          { name: 'Metformin', type: 'night' }, // duplicate log
        ],
      };

      const doses = resolveDosesPerDay(null, selectedSlot, storeState);
      expect(doses).toBe(2); // unique slots: morning, night
    });

    it('parses Indian 1-0-1 notation into 2 doses/day', () => {
      const prescription = { name: 'Pantoprazole', frequency: '1-0-1' };
      const doses = resolveDosesPerDay(prescription, null, null);
      expect(doses).toBe(2);
    });

    it('parses Indian 1-1-1 notation into 3 doses/day', () => {
      const prescription = { name: 'Amoxicillin', frequency: '1-1-1' };
      const doses = resolveDosesPerDay(prescription, null, null);
      expect(doses).toBe(3);
    });

    it('parses BID (2), TID (3), QID (4) frequency keywords', () => {
      expect(resolveDosesPerDay({ frequency: 'Take twice daily BID' })).toBe(2);
      expect(resolveDosesPerDay({ frequency: 'Take 3 times daily TID' })).toBe(3);
      expect(resolveDosesPerDay({ frequency: 'Four times a day QID' })).toBe(4);
    });

    it('returns 0 doses/day for SOS / PRN medications', () => {
      const prescription = { name: 'Paracetamol', frequency: 'SOS as needed' };
      expect(resolveDosesPerDay(prescription, null, null)).toBe(0);
    });
  });

  describe('derivePrescriptionModel & Supply Calculations', () => {
    it('calculates Metformin 1 tablet 2x/day: 49 stock = 24.5 days supply, presets 60/120/180', () => {
      const selectedSlot = { name: 'Metformin', dosage: '500mg', type: 'night' };
      const storeState = {
        patient: {
          medications: [
            { _id: 'm1', name: 'Metformin 500mg', times: ['morning', 'night'] },
          ],
        },
      };

      const rx = derivePrescriptionModel(selectedSlot, storeState);
      expect(rx.quantityPerDose).toBe(1);
      expect(rx.dosesPerDay).toBe(2);
      expect(rx.dailyTabletConsumption).toBe(2);
      expect(rx.isPRN).toBe(false);

      const daysLeft = calculateDaysRemaining(49, rx.dailyTabletConsumption);
      expect(daysLeft).toBe(24.5);

      const presets = calculateRefillPresets(rx.dailyTabletConsumption, [1, 2, 3]);
      expect(presets).toEqual([
        { months: 1, tablets: 60 },
        { months: 2, tablets: 120 },
        { months: 3, tablets: 180 },
      ]);
    });

    it('calculates 2 tablets 2x/day (4 tablets/day): 49 stock = 12.3 days supply, presets 120/240/360', () => {
      const selectedSlot = { name: 'Metformin 1000mg', dosage: '2 tablets', type: 'night' };
      const storeState = {
        patient: {
          medications: [
            { _id: 'm1', name: 'Metformin 1000mg', times: ['morning', 'night'] },
          ],
        },
      };

      const rx = derivePrescriptionModel(selectedSlot, storeState);
      expect(rx.quantityPerDose).toBe(2);
      expect(rx.dosesPerDay).toBe(2);
      expect(rx.dailyTabletConsumption).toBe(4);

      const daysLeft = calculateDaysRemaining(49, rx.dailyTabletConsumption);
      expect(daysLeft).toBe(12.3);

      const presets = calculateRefillPresets(rx.dailyTabletConsumption, [1, 2, 3]);
      expect(presets).toEqual([
        { months: 1, tablets: 120 },
        { months: 2, tablets: 240 },
        { months: 3, tablets: 360 },
      ]);
    });

    it('handles SOS / PRN medications safely without fake estimated days supply', () => {
      const selectedSlot = { name: 'Paracetamol', frequency: 'SOS as needed' };
      const rx = derivePrescriptionModel(selectedSlot, null);

      expect(rx.isPRN).toBe(true);
      expect(rx.dailyTabletConsumption).toBe(0);

      const daysLeft = calculateDaysRemaining(49, rx.dailyTabletConsumption);
      expect(daysLeft).toBeNull();
    });

    it('correctly resolves dosesPerDay = 2 when single slot item has times: ["night"] but dashboardMeds has morning and night slots', () => {
      const selectedSlot = { name: 'Metformin', dosage: '500mg', type: 'night', times: ['night'] };
      const storeState = {
        patient: {
          medications: [
            { _id: 'm1', name: 'Metformin 500mg', times: ['night'] },
          ],
        },
        dashboardMeds: [
          { name: 'Metformin', type: 'morning' },
          { name: 'Metformin', type: 'night' },
        ],
      };

      const rx = derivePrescriptionModel(selectedSlot, storeState);
      expect(rx.quantityPerDose).toBe(1);
      expect(rx.dosesPerDay).toBe(2);
      expect(rx.dailyTabletConsumption).toBe(2);

      const daysLeft = calculateDaysRemaining(49, rx.dailyTabletConsumption);
      expect(daysLeft).toBe(24.5);

      const presets = calculateRefillPresets(rx.dailyTabletConsumption, [1, 2, 3]);
      expect(presets).toEqual([
        { months: 1, tablets: 60 },
        { months: 2, tablets: 120 },
        { months: 3, tablets: 180 },
      ]);
    });
  });
});
