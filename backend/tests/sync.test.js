const mongoose = require('mongoose');
require('dotenv').config();

async function checkSync() {
    await mongoose.connect(process.env.MONGODB_URI);
    const Patient = require('./src/models/Patient');
    const MedicineLog = require('./src/models/MedicineLog');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const patients = await Patient.find({}).lean();
    console.log(`Checking MedicineLogs for ${patients.length} patients on ${today.toDateString()}`);

    for (const pat of patients) {
        const logs = await MedicineLog.find({
            patient_id: pat._id,
            date: today
        }).lean();

        if (logs.length > 0) {
            console.log(`\nPatient: ${pat.name || pat.fullName || pat._id} has ${logs.length} log(s) for today.`);
            logs.forEach(log => {
                console.log(`  Log ID: ${log._id}`);
                log.medicines.forEach(m => {
                    console.log(`    - ${m.medicine_name} [${m.scheduled_time}]: taken=${m.taken} (marked_by=${m.marked_by})`);
                });
            });
        }
    }
    process.exit(0);
}
checkSync();
