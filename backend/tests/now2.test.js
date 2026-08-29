const mongoose = require('mongoose');
require('dotenv').config();

async function checkNow() {
    await mongoose.connect(process.env.MONGODB_URI);
    const MedicineLog = require('./src/models/MedicineLog');

    const d = new Date('2026-04-25T00:00:00.000Z');
    
    const logs = await MedicineLog.find({ patient_id: '69e8a09ba966a8ab9dd35d57', date: d }).lean(); 
    
    console.log(`Logs for 2026-04-25: ${logs.length}`);
    for (const log of logs) {
        log.medicines.forEach(m => {
            console.log(`  * ${m.medicine_name}: taken=${m.taken} (at ${m.taken_at ? m.taken_at.toISOString() : null})`);
        });
    }

    process.exit(0);
}
checkNow();
