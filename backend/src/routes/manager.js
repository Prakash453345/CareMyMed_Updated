const express = require('express');
const { authenticate, requireRole } = require('../middleware/authenticate');
const managerController = require('../controllers/managerController');

const router = express.Router();

// ── All routes require care_manager (or higher) ─────────────
router.use(authenticate, requireRole('care_manager', 'org_admin', 'super_admin'));

// ═══════════════════════════════════════════════════════════════
// 1. GET /api/manager/dashboard — Operations KPIs
// ═══════════════════════════════════════════════════════════════
router.get('/dashboard', managerController.getDashboard);

// ═══════════════════════════════════════════════════════════════
// 1b. POST /api/manager/reconcile — Continuous Round-Robin Reconciliation
// Auto-assigns ALL unassigned patients in the org to available callers
// ═══════════════════════════════════════════════════════════════
router.post('/reconcile', managerController.reconcilePatients);

// 2. GET /api/manager/alerts — Escalations assigned to me
// ═══════════════════════════════════════════════════════════════
router.get('/alerts', managerController.getAlerts);

// ═══════════════════════════════════════════════════════════════
// 3. GET /api/manager/call-queue — Today's calls (supervised)
// ═══════════════════════════════════════════════════════════════
router.get('/call-queue', managerController.getCallQueue);

// ═══════════════════════════════════════════════════════════════
// 4. GET /api/manager/caretakers — My supervised caretakers
// ═══════════════════════════════════════════════════════════════
router.get('/caretakers', managerController.getCaretakers);

// ═══════════════════════════════════════════════════════════════
// NEW: DELETE /api/manager/caretakers/:id — Soft-delete caller
// ═══════════════════════════════════════════════════════════════
router.delete('/caretakers/:id', managerController.deleteCaretaker);

// ═══════════════════════════════════════════════════════════════
// 5. GET /api/manager/patients — Patients under supervision
// ═══════════════════════════════════════════════════════════════
router.get('/patients', managerController.getPatients);

// ═══════════════════════════════════════════════════════════════
// 6. POST /api/manager/patients/assign — Assign patient to caretaker
// ═══════════════════════════════════════════════════════════════
router.post('/patients/assign', managerController.assignPatient);

// ═══════════════════════════════════════════════════════════════
// 7. PUT /api/manager/patients/:id/reassign — Reassign patient
// ═══════════════════════════════════════════════════════════════
router.put('/patients/:id/reassign', managerController.reassignPatient);

// ═══════════════════════════════════════════════════════════════
// 8. GET /api/manager/medications — All medications (supervised)
// ═══════════════════════════════════════════════════════════════
router.get('/medications', managerController.getMedications);

// ═══════════════════════════════════════════════════════════════
// 9. POST /api/manager/medications — Add medication
// ═══════════════════════════════════════════════════════════════
router.post('/medications', managerController.createMedication);

// ═══════════════════════════════════════════════════════════════
// 10. PUT /api/manager/medications/:id — Update medication
// ═══════════════════════════════════════════════════════════════
router.put('/medications/:id', managerController.updateMedication);

// ═══════════════════════════════════════════════════════════════
// 11. GET /api/manager/analytics/adherence — Adherence trends
// ═══════════════════════════════════════════════════════════════
router.get('/analytics/adherence', managerController.getAdherenceAnalytics);

// ═══════════════════════════════════════════════════════════════
// 12. GET /api/manager/analytics/performance — Caretaker perf
// ═══════════════════════════════════════════════════════════════
router.get('/analytics/performance', managerController.getPerformanceAnalytics);

// ═══════════════════════════════════════════════════════════════
// 13. POST /api/manager/alerts/:id/resolve — Resolve escalation
// ═══════════════════════════════════════════════════════════════
router.post('/alerts/:id/resolve', managerController.resolveAlert);

// ═══════════════════════════════════════════════════════════════
// 14. POST /api/manager/messages — Send message to caretaker
// ═══════════════════════════════════════════════════════════════
router.post('/messages', managerController.sendMessage);

module.exports = router;
