const express = require('express');
const { authenticate, requireRole } = require('../middleware/authenticate');
const orgController = require('../controllers/orgController');

const router = express.Router();

// ── All routes require org_admin ────────────────────────────────
router.use(authenticate, requireRole('org_admin', 'super_admin'));

// ═══════════════════════════════════════════════════════════════
// NEW: DELETE /api/org/deactivate — Org Admin cancels subscription (tie-up)
// ═══════════════════════════════════════════════════════════════
router.delete('/deactivate', orgController.deactivateOrganization);

// ═══════════════════════════════════════════════════════════════
// 1. GET /api/org/dashboard — Org-scoped KPIs
// ═══════════════════════════════════════════════════════════════
router.get('/dashboard', orgController.getDashboard);

// ═══════════════════════════════════════════════════════════════
// 1b. POST /api/org/reconcile — Org Admin Round-Robin Reconciliation
// Auto-assigns ALL unassigned patients in the org to available callers
// ═══════════════════════════════════════════════════════════════
router.post('/reconcile', orgController.reconcile);

// 2. GET /api/org/care-managers — Managers in org
// ═══════════════════════════════════════════════════════════════
router.get('/care-managers', orgController.listCareManagers);

// ═══════════════════════════════════════════════════════════════
// 3. POST /api/org/care-managers — Create care manager
// ═══════════════════════════════════════════════════════════════
router.post('/care-managers', orgController.createCareManager);

// ═══════════════════════════════════════════════════════════════
// 4. GET /api/org/caretakers — Caretakers in org
// ═══════════════════════════════════════════════════════════════
router.get('/caretakers', orgController.listCaretakers);

// ═══════════════════════════════════════════════════════════════
// 5. GET /api/org/patients — Patients in org
// ═══════════════════════════════════════════════════════════════
router.get('/patients', orgController.listPatients);

// ═══════════════════════════════════════════════════════════════
// 6. GET /api/org/analytics/adherence — Weekly adherence trends
// ═══════════════════════════════════════════════════════════════
router.get('/analytics/adherence', orgController.getAdherenceAnalytics);

// ═══════════════════════════════════════════════════════════════
// 7. GET /api/org/analytics/calls — Call stats
// ═══════════════════════════════════════════════════════════════
router.get('/analytics/calls', orgController.getCallAnalytics);

// ═══════════════════════════════════════════════════════════════
// 8. GET /api/org/billing/subscription — Subscription details
// ═══════════════════════════════════════════════════════════════
router.get('/billing/subscription', orgController.getSubscription);

// ═══════════════════════════════════════════════════════════════
// 9. GET /api/org/billing/invoices — Invoice history
// ═══════════════════════════════════════════════════════════════
router.get('/billing/invoices', orgController.listInvoices);

// ═══════════════════════════════════════════════════════════════
// 10. GET /api/org/audit-logs — Audit logs (org-scoped)
// ═══════════════════════════════════════════════════════════════
router.get('/audit-logs', orgController.listAuditLogs);

// ═══════════════════════════════════════════════════════════════
// 11. PUT /api/org/settings — Update org settings
// ═══════════════════════════════════════════════════════════════
router.put('/settings', orgController.updateSettings);

module.exports = router;
