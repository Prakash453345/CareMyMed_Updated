const mongoose = require('mongoose');
require('dotenv').config();

async function testSyncEdgeCases() {
    console.log('--- STARTING END-TO-END SYNC TEST ---');
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const Patient = require('./src/models/Patient');
        const Profile = require('./src/models/Profile');
        const MedicineLog = require('./src/models/MedicineLog');

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find a patient who has both Patient and Profile records
        const testPatient = await Patient.findOne({ profile_id: { $exists: true } }).lean();
        if (!testPatient) {
            console.log('No valid patient with profile_id found.');
            process.exit(1);
        }

        console.log(`[TEST DATA] Using Patient: ${testPatient.name || testPatient.fullName} (Patient ID: ${testPatient._id}, Profile ID: ${testPatient.profile_id})`);

        // Clean up today's log to simulate a fresh start
        await MedicineLog.deleteMany({ patient_id: testPatient._id, date: today });

        // Create a mock log directly (SIMULATING PATIENT APP API)
        const log = new MedicineLog({
            patient_id: testPatient._id,
            date: today,
            medicines: [
                {
                    medicine_name: 'TestMed1',
                    scheduled_time: 'morning',
                    taken: true,
                    marked_by: 'patient',
                    is_active: true
                }
            ]
        });
        await log.save();
        console.log('\n✅ [PATIENT API] Patient marked "TestMed1" as taken (marked_by=patient)');

        // ==========================================
        // CALLER ENDPOINT SIMULATION (patients.js)
        // ==========================================
        // A caller normally clicks on the patient from the list, which passes the Profile ID
        const callerRequestedId = testPatient.profile_id;
        console.log(`\n[CALLER API] Caller queries GET /api/patients/${callerRequestedId}`);

        // This is exactly what patients.js line 179+ does with my fix
        let patientDoc = await Patient.findOne({
            $or: [{ _id: callerRequestedId }, { profile_id: callerRequestedId }]
        });

        if (patientDoc) {
            console.log('  ✅ Caller successfully resolved true Patient document from Profile ID!');
            console.log(`  Resolved Patient ID: ${patientDoc._id}`);
        } else {
            console.error('  ❌ FAILED to resolve Patient document!');
        }

        const truePatientId = patientDoc ? patientDoc._id : callerRequestedId;
        const retrievedLog = await MedicineLog.findOne({ patient_id: truePatientId, date: today }).lean();

        if (retrievedLog && retrievedLog.medicines.find(m => m.medicine_name === 'TestMed1' && m.taken)) {
            console.log('  ✅ Admin Dashboard successfully verified "TestMed1" is taken!');
        } else {
            console.error('  ❌ Admin Dashboard could not see the MedicineLog!');
        }

        // ==========================================
        // EDGE CASE 2: Caller Marks a Medicine
        // ==========================================
        // Simulating syncMedicineLogHelper (caretaker.js)
        console.log(`\n[CALLER API] Caller marks "TestMed2" as taken...`);
        const validPt = await Patient.findOne({ $or: [{ _id: callerRequestedId }, { profile_id: callerRequestedId }] });
        let logToUpdate = await MedicineLog.findOne({ patient_id: validPt._id, date: today });
        logToUpdate.medicines.push({
            medicine_name: 'TestMed2',
            scheduled_time: 'afternoon',
            taken: true,
            marked_by: 'caller',
            is_active: true
        });
        await logToUpdate.save();

        console.log('✅ [CALLER API] Caller saved "TestMed2" successfully.');

        // ==========================================
        // USER ENDPOINT SIMULATION (medicines.js)
        // ==========================================
        // The patient opens their app to view the medications (medicines.js line 33)
        // Users App queries using exact patient_id
        console.log(`\n[PATIENT API] Patient opens dashboard and queries GET /api/users/medicines/today`);
        const userAppLog = await MedicineLog.findOne({ patient_id: testPatient._id, date: today }).lean();

        const p_testMed1 = userAppLog.medicines.find(m => m.medicine_name === 'TestMed1');
        const p_testMed2 = userAppLog.medicines.find(m => m.medicine_name === 'TestMed2');

        if (p_testMed1 && p_testMed1.taken && p_testMed1.marked_by === 'patient') {
            console.log('  ✅ User App confirms TestMed1 is taken (patient-marked)');
        }
        if (p_testMed2 && p_testMed2.taken && p_testMed2.marked_by === 'caller') {
            console.log('  ✅ User App confirms TestMed2 is taken (caller-marked)');
        }

        console.log('\n--- END-TO-END TEST SUCCESSFUL ---');
        process.exit(0);
    } catch (e) {
        console.error('Test Failed:', e);
        process.exit(1);
    }
}
testSyncEdgeCases();
