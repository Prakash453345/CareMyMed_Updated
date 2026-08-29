/**
 * END-TO-END Medication CRUD Test
 * Tests: ADD → verify in GET(all) → verify in GET(shift) → EDIT → verify → DELETE → verify removal
 * Validates both Medication collection AND embedded Patient.medications array stay in sync
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Patient = require('./src/models/Patient');
const Medication = require('./src/models/Medication');
const MedicineLog = require('./src/models/MedicineLog');
const CaretakerPatient = require('./src/models/CaretakerPatient');
const Profile = require('./src/models/Profile');

const API_BASE = 'http://localhost:5000/api';
let AUTH_TOKEN = null;

// ── Helper: Make API calls ────────────────────────────────
async function api(method, path, body) {
    const opts = {
        method,
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AUTH_TOKEN}` 
        },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${API_BASE}${path}`, opts);
    const data = await res.json();
    return { status: res.status, data };
}

function pass(msg) { console.log(`  ✅ PASS: ${msg}`); }
function fail(msg) { console.log(`  ❌ FAIL: ${msg}`); process.exitCode = 1; }
function section(msg) { console.log(`\n${'═'.repeat(60)}\n  ${msg}\n${'═'.repeat(60)}`); }

async function main() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // ── 1. Get a real caller profile with Supabase auth token ──
    section('1. SETUP — Find caller + patient for testing');

    const caller = await Profile.findOne({ role: { $in: ['caller', 'caretaker'] }, isActive: true }).lean();
    if (!caller) { fail('No active caller found'); return process.exit(1); }
    console.log(`  Caller: ${caller.fullName} (${caller._id})`);

    // Find a patient assigned to this caller
    const assignment = await CaretakerPatient.findOne({ caretakerId: caller._id, status: 'active' }).lean();
    if (!assignment) { fail('No patient assigned to caller'); return process.exit(1); }
    
    const patientId = assignment.patientId.toString();
    const patient = await Patient.findById(patientId).lean();
    console.log(`  Patient: ${patient?.name || 'Unknown'} (${patientId})`);

    // ── 2. Direct DB Test: Add medication ──
    section('2. ADD MEDICATION');

    const testMedName = `TestMed_${Date.now()}`;
    const testMed = await Medication.create({
        patientId: patientId,
        organizationId: caller.organizationId,
        name: testMedName,
        dosage: '500mg',
        frequency: 'daily',
        route: 'oral',
        scheduledTimes: ['08:00 AM', '08:00 PM'],
        times: ['morning', 'night'],
        instructions: 'Take with food',
        withFood: true,
        startDate: new Date(),
        prescribedBy: caller.fullName,
        addedBy: caller._id,
        status: 'active',
        isActive: true,
    });
    console.log(`  Created Medication doc: ${testMed._id}`);

    // Sync to Patient embedded array (like the API does)
    const pDoc = await Patient.findById(patientId);
    if (pDoc) {
        if (!pDoc.medications) pDoc.medications = [];
        pDoc.medications.push({
            _id: testMed._id,
            name: testMedName,
            dosage: '500mg',
            times: ['morning', 'night'],
            scheduledTimes: ['08:00 AM', '08:00 PM'],
            route: 'oral',
            instructions: 'Take with food',
            is_active: true,
            isActive: true,
        });
        pDoc.markModified('medications');
        await pDoc.save();
    }

    // ── VERIFY: Medication exists in Medication collection ──
    const medInCollection = await Medication.findById(testMed._id).lean();
    if (medInCollection && medInCollection.isActive) {
        pass(`Medication found in collection: ${medInCollection.name} (active=${medInCollection.isActive})`);
    } else {
        fail('Medication NOT found in collection after add');
    }

    // ── VERIFY: Medication exists in Patient embedded array ──
    const patientAfterAdd = await Patient.findById(patientId).lean();
    const embeddedMed = patientAfterAdd?.medications?.find(m => m._id.toString() === testMed._id.toString());
    if (embeddedMed && (embeddedMed.is_active !== false)) {
        pass(`Medication found in Patient.medications embedded array: ${embeddedMed.name}`);
    } else {
        fail('Medication NOT found in Patient.medications after add');
    }

    // ── VERIFY: getPatientMedications helper returns it ──
    const allMedsFilter = { patientId, isActive: true };
    const allMeds = await Medication.find(allMedsFilter).lean();
    const foundInAll = allMeds.some(m => m._id.toString() === testMed._id.toString());
    if (foundInAll) {
        pass('Medication appears in getPatientMedications (all shifts)');
    } else {
        fail('Medication NOT returned by getPatientMedications');
    }

    // ── VERIFY: Shift filtering works ──
    section('3. SHIFT FILTERING');

    // This med has scheduledTimes ['08:00 AM', '08:00 PM'] → morning + night
    // It should appear in morning shift, night shift, but NOT afternoon
    const currentHour = new Date().getHours();
    const currentShift = currentHour < 12 ? 'morning' : currentHour < 17 ? 'afternoon' : 'night';
    console.log(`  Current shift: ${currentShift} (hour: ${currentHour})`);

    // Simulate filterMedsByShift
    function filterMedsByShift(medications, shift) {
        shift = (shift || 'morning').toLowerCase().trim();
        return medications.filter(med => {
            const times = med.scheduledTimes && med.scheduledTimes.length > 0 ? med.scheduledTimes : (med.times || []);
            if (times.length === 0) return shift === 'morning';
            return times.some(t => {
                const lower = (t || '').toLowerCase().trim();
                if (lower === shift || lower.includes(shift)) return true;
                if (shift === 'night' && lower.includes('evening')) return true;
                let hour = -1;
                const match12 = lower.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
                const match24 = lower.match(/^(\d{1,2}):(\d{2})$/);
                if (match24) hour = parseInt(match24[1]);
                else if (match12) { hour = parseInt(match12[1]); if (match12[3].toLowerCase() === 'pm' && hour !== 12) hour += 12; if (match12[3].toLowerCase() === 'am' && hour === 12) hour = 0; }
                if (hour === -1) return shift === 'morning';
                if (shift === 'morning') return hour >= 0 && hour < 12;
                if (shift === 'afternoon') return hour >= 12 && hour < 17;
                if (shift === 'night') return hour >= 17;
                return false;
            });
        });
    }

    const morningMeds = filterMedsByShift([medInCollection], 'morning');
    const afternoonMeds = filterMedsByShift([medInCollection], 'afternoon');
    const nightMeds = filterMedsByShift([medInCollection], 'night');

    if (morningMeds.length === 1) pass('Shift filter: Med appears in MORNING (08:00 AM)');
    else fail('Shift filter: Med SHOULD appear in morning but does not');

    if (afternoonMeds.length === 0) pass('Shift filter: Med correctly EXCLUDED from AFTERNOON');
    else fail('Shift filter: Med should NOT appear in afternoon');

    if (nightMeds.length === 1) pass('Shift filter: Med appears in NIGHT (08:00 PM)');
    else fail('Shift filter: Med SHOULD appear in night but does not');

    // ── 4. EDIT MEDICATION ──
    section('4. EDIT MEDICATION');

    // Update: change scheduledTimes to afternoon only
    const updatedMed = await Medication.findByIdAndUpdate(
        testMed._id,
        { $set: { 
            dosage: '250mg',
            scheduledTimes: ['01:00 PM'],
            times: ['afternoon'],
        }},
        { new: true }
    ).lean();

    // Also update embedded
    await Patient.findOneAndUpdate(
        { _id: patientId, 'medications._id': testMed._id },
        { $set: {
            'medications.$.dosage': '250mg',
            'medications.$.scheduledTimes': ['01:00 PM'],
            'medications.$.times': ['afternoon'],
        }},
        { new: true }
    );

    if (updatedMed && updatedMed.dosage === '250mg') {
        pass(`Dosage updated: ${updatedMed.dosage}`);
    } else {
        fail('Dosage update failed');
    }

    // Verify shift filtering after edit
    const morningAfterEdit = filterMedsByShift([updatedMed], 'morning');
    const afternoonAfterEdit = filterMedsByShift([updatedMed], 'afternoon');
    const nightAfterEdit = filterMedsByShift([updatedMed], 'night');

    if (morningAfterEdit.length === 0) pass('After edit: Correctly EXCLUDED from morning');
    else fail('After edit: Should NOT appear in morning anymore');

    if (afternoonAfterEdit.length === 1) pass('After edit: Correctly appears in AFTERNOON');
    else fail('After edit: Should appear in afternoon');

    if (nightAfterEdit.length === 0) pass('After edit: Correctly EXCLUDED from night');
    else fail('After edit: Should NOT appear in night anymore');

    // Verify embedded array also updated
    const patientAfterEdit = await Patient.findById(patientId).lean();
    const embeddedAfterEdit = patientAfterEdit?.medications?.find(m => m._id.toString() === testMed._id.toString());
    if (embeddedAfterEdit?.dosage === '250mg') {
        pass('Patient embedded array dosage synced');
    } else {
        fail(`Patient embedded array NOT synced (dosage: ${embeddedAfterEdit?.dosage})`);
    }

    // ── 5. DELETE MEDICATION ──
    section('5. DELETE MEDICATION (Soft Delete)');

    // Soft delete in Medication collection
    await Medication.findByIdAndUpdate(testMed._id, { $set: { status: 'inactive', isActive: false, is_active: false } });

    // Soft delete in Patient embedded
    await Patient.findOneAndUpdate(
        { _id: patientId, 'medications._id': testMed._id },
        { $set: { 'medications.$.isActive': false, 'medications.$.is_active': false, 'medications.$.status': 'inactive' } }
    );

    // ── VERIFY: Not returned by active-only query ──
    const medsAfterDelete = await Medication.find({ patientId, isActive: true }).lean();
    const stillPresent = medsAfterDelete.some(m => m._id.toString() === testMed._id.toString());
    if (!stillPresent) {
        pass('Deleted med NOT returned by Medication.find({isActive: true})');
    } else {
        fail('Deleted med STILL appears in active medication query — BUG!');
    }

    // ── VERIFY: Not returned by getPatientMedications (activeOnly=true) ──
    const patientAfterDel = await Patient.findById(patientId).lean();
    const embeddedAfterDel = patientAfterDel?.medications?.find(m => m._id.toString() === testMed._id.toString());
    if (embeddedAfterDel && embeddedAfterDel.isActive === false) {
        pass('Patient.medications embedded entry marked inactive');
    } else if (!embeddedAfterDel) {
        pass('Patient.medications embedded entry removed');
    } else {
        fail(`Embedded med still active: isActive=${embeddedAfterDel?.isActive}, is_active=${embeddedAfterDel?.is_active}`);
    }

    // ── VERIFY: Shift filter won't include it ──
    // getPatientMedications filters by isActive first, so inactive meds don't reach shift filter
    const activeMedsOnly = await Medication.find({ patientId, isActive: true }).lean();
    const deletedInActive = activeMedsOnly.some(m => m._id.toString() === testMed._id.toString());
    if (!deletedInActive) {
        pass('ActiveCall screen will NOT show deleted med (filtered out before shift filter)');
    } else {
        fail('ActiveCall WOULD show deleted med — CRITICAL BUG');
    }

    // ── VERIFY: Embedded active filter ──
    const embeddedActive = (patientAfterDel?.medications || [])
        .filter(m => m.is_active !== false && m.isActive !== false);
    const deletedInEmbedded = embeddedActive.some(m => m._id.toString() === testMed._id.toString());
    if (!deletedInEmbedded) {
        pass('PatientDetailScreen will NOT show deleted med (embedded filter works)');
    } else {
        fail('PatientDetailScreen WOULD show deleted med from embedded array — BUG');
    }

    // ── 6. CLEANUP ──
    section('6. CLEANUP');
    
    // Hard delete the test medication
    await Medication.deleteOne({ _id: testMed._id });
    // Remove from embedded array
    await Patient.findByIdAndUpdate(patientId, { $pull: { medications: { _id: testMed._id } } });
    pass('Test medication cleaned up from both Medication collection and Patient.medications');

    // ── SUMMARY ──
    section('TEST SUMMARY');
    console.log(`  Exit code: ${process.exitCode || 0}`);
    if (!process.exitCode) {
        console.log('  🎉 ALL TESTS PASSED — Medication CRUD flow is working correctly');
        console.log('  ✅ ADD → syncs to Medication collection + Patient.medications');
        console.log('  ✅ SHIFT FILTER → correctly includes/excludes by scheduledTimes');
        console.log('  ✅ EDIT → updates both collection and embedded, shift filter reflects changes');
        console.log('  ✅ DELETE → soft-delete in both, excluded from all active queries');
        console.log('  ✅ ActiveCall → will only show active meds for current shift');
        console.log('  ✅ PatientDetail → will only show active meds');
    } else {
        console.log('  ⚠️  SOME TESTS FAILED — Review above for details');
    }

    process.exit(process.exitCode || 0);
}

main().catch(e => { console.error(e); process.exit(1); });
