const express = require('express');
const multer = require('multer');
const { authenticate, requireRole } = require('../middleware/authenticate');
const caretakerController = require('../controllers/caretakerController');

const upload = multer({ dest: 'uploads/' });

const router = express.Router();

// ── All routes require caretaker/caller (or higher) ─────────
router.use(authenticate, requireRole('caretaker', 'caller', 'care_manager', 'org_admin', 'super_admin'));

// ═══════════════════════════════════════════════════════════════
// 1. GET /api/caretaker/dashboard — My shift KPIs
// ═══════════════════════════════════════════════════════════════
router.get('/dashboard', caretakerController.getDashboard);

// ═══════════════════════════════════════════════════════════════
// 2. GET /api/caretaker/call-queue — My shift routing queue
// ═══════════════════════════════════════════════════════════════
router.get('/call-queue', caretakerController.getCallQueue);

// ═══════════════════════════════════════════════════════════════
// 3. GET /api/caretaker/patients — My assigned patients
// ═══════════════════════════════════════════════════════════════
router.get('/patients', caretakerController.getPatients);

// ═══════════════════════════════════════════════════════════════
// 4. GET /api/caretaker/patients/:id — Patient detail
// ═══════════════════════════════════════════════════════════════
router.get('/patients/:id', caretakerController.getPatientDetail);

// ═══════════════════════════════════════════════════════════════
// 5. GET /api/caretaker/patients/:id/meds — Patient medications
//    Optional ?shift=morning|afternoon|night to filter by time-of-day
// ═══════════════════════════════════════════════════════════════
router.get('/patients/:id/meds', caretakerController.getPatientMeds);

// ═══════════════════════════════════════════════════════════════
// 5a. POST /api/caretaker/patients/:id/medications — Add Med
// ═══════════════════════════════════════════════════════════════
router.post('/patients/:id/medications', caretakerController.addPatientMedication);

// ═══════════════════════════════════════════════════════════════
// 5b. PUT /api/caretaker/patients/:id/medications/:medId — Update Med
// ═══════════════════════════════════════════════════════════════
router.put('/patients/:id/medications/:medId', caretakerController.updatePatientMedication);

// ═══════════════════════════════════════════════════════════════
// 5c. DELETE /api/caretaker/patients/:id/medications/:medId — Delete Med
// ═══════════════════════════════════════════════════════════════
router.delete('/patients/:id/medications/:medId', caretakerController.deletePatientMedication);

// ═══════════════════════════════════════════════════════════════
// 5d. POST /api/caretaker/patients/:id/prescriptions/extract — Extract OCR from uploaded prescription
// ═══════════════════════════════════════════════════════════════
router.post('/patients/:id/prescriptions/extract', caretakerController.extractPrescription);

// ═══════════════════════════════════════════════════════════════
// 6. POST /api/caretaker/calls — Log a call
// ═══════════════════════════════════════════════════════════════

// ── POST /api/caretaker/dictate ──────────────────────────
// Proxy for Groq Whisper AI (Transcribe + Translate if needed)
router.post('/dictate', upload.single('audio'), caretakerController.dictate);

router.post('/calls', caretakerController.logCall);

// ═══════════════════════════════════════════════════════════════
// 7. GET /api/caretaker/performance — My performance stats
// ═══════════════════════════════════════════════════════════════
router.get('/performance', caretakerController.getPerformance);

// ═══════════════════════════════════════════════════════════════
// 8. GET /api/caretaker/call-history — My call history logs
// ═══════════════════════════════════════════════════════════════
router.get('/call-history', caretakerController.getCallHistory);

// ═══════════════════════════════════════════════════════════════
// TEMPORARY / OTC MEDICINES
// ═══════════════════════════════════════════════════════════════

// ── GET /api/caretaker/patients/:id/temp-meds ─────────────────
// List all active temporary medicines for a patient
router.get('/patients/:id/temp-meds', caretakerController.listTempMeds);

// ── GET /api/caretaker/calls/agora-token ─────────────────────
// Generate Agora RTC Token for active calls
router.get('/calls/agora-token', caretakerController.getAgoraToken);

// ── POST /api/caretaker/patients/:id/temp-meds ────────────────
// Add a temporary medicine (triggers Groq AI classification)
router.post('/patients/:id/temp-meds', caretakerController.addTempMed);

// ── DELETE /api/caretaker/patients/:id/temp-meds/:medId ───────
// Soft-delete a temporary medicine
router.delete('/patients/:id/temp-meds/:medId', caretakerController.deleteTempMed);

// ── GET /api/caretaker/medicine-info ──────────────────────────
// Standalone AI lookup — caller checks a medicine before adding
router.get('/medicine-info', caretakerController.getMedicineInfo);

module.exports = router;
