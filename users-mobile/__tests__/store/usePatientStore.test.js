import usePatientStore from '../../src/store/usePatientStore';
import { apiService } from '../../src/lib/api';

jest.mock('../../src/lib/api', () => ({
    apiService: {
        medicines: {
            getAdherenceRecap: jest.fn(),
            refill: jest.fn().mockResolvedValue({ data: { success: true } }),
        },
        patients: {
            getDashboard: jest.fn().mockResolvedValue({ data: null }),
        },
    },
}));

describe('usePatientStore Adherence Caching', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset Zustand store state
        usePatientStore.setState({
            adherenceRecap: null,
            adherenceRecaps: { weekly: null, monthly: null, yearly: null },
        });
    });

    it('should fetch from API and cache data on first call', async () => {
        const mockData = { adherence_rate: 85, perfect_days: 5, total_doses_taken: 15 };
        apiService.medicines.getAdherenceRecap.mockResolvedValueOnce({ data: mockData });

        const result = await usePatientStore.getState().fetchAdherenceRecap('weekly');

        expect(apiService.medicines.getAdherenceRecap).toHaveBeenCalledTimes(1);
        expect(apiService.medicines.getAdherenceRecap).toHaveBeenCalledWith('weekly');
        expect(result).toEqual(mockData);
        expect(usePatientStore.getState().adherenceRecap).toEqual(mockData);
        expect(usePatientStore.getState().adherenceRecaps.weekly).toEqual(mockData);
    });

    it('should return cached data immediately without calling API on subsequent calls', async () => {
        const mockData = { adherence_rate: 85, perfect_days: 5, total_doses_taken: 15 };
        usePatientStore.setState({
            adherenceRecaps: {
                weekly: mockData,
                monthly: null,
                yearly: null,
            },
        });

        const result = await usePatientStore.getState().fetchAdherenceRecap('weekly');

        expect(apiService.medicines.getAdherenceRecap).not.toHaveBeenCalled();
        expect(result).toEqual(mockData);
        expect(usePatientStore.getState().adherenceRecap).toEqual(mockData);
    });
});

describe('usePatientStore updateMedSupply Supply Baseline', () => {
    it('resets totalDoses capacity baseline to equal remainingDoses after refill (43 / 43)', async () => {
        const initialMed = {
            id: 'vit_d3',
            name: 'Vitamin D3',
            refillInfo: { remainingDoses: 38, totalDoses: 74, alertThreshold: 5 },
        };

        usePatientStore.setState({
            dashboardMeds: [initialMed],
            medicationSchedule: { morning: [initialMed] },
            patient: { timezone: 'Asia/Kolkata' },
        });

        await usePatientStore.getState().updateMedSupply('Vitamin D3', 5, 'vit_d3');

        const state = usePatientStore.getState();
        const updatedMed = state.dashboardMeds.find(m => m.id === 'vit_d3');

        expect(updatedMed).toBeTruthy();
        expect(updatedMed.refillInfo.remainingDoses).toBe(43);
        expect(updatedMed.refillInfo.totalDoses).toBe(43); // 43 / 43 capacity baseline
    });
});
