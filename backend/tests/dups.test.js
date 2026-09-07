const mongoose = require('mongoose');
require('dotenv').config();

async function checkDups() {
    await mongoose.connect(process.env.MONGODB_URI);
    const MedicineLog = require('./src/models/MedicineLog');

    const logs = await MedicineLog.find({ patient_id: '69e8a09ba966a8ab9dd35d57' }).lean(); // Priyanka's ID from user image
    
    console.log(`Found ${logs.length} logs for Patient 69e8a09ba966a8ab9dd35d57:`);
    for (const log of logs) {
        console.log(`\nLog ID: ${log._id}`);
        console.log(`- Date in DB: ${log.date.toISOString()}`);
        console.log(`- Created at: ${log.created_at ? log.created_at.toISOString() : 'N/A'}`);
        log.medicines.forEach(m => {
            console.log(`  * ${m.medicine_name} [${m.scheduled_time}] taken=${m.taken} by=${m.marked_by}`);
        });
    }
    process.exit(0);
}
checkDups();
