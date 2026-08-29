require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const Profile = require('./src/models/Profile');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const careManager = await Profile.findOne({ role: 'care_manager' });
  console.log('Care Manager ID:', careManager._id);
  
  const callers = await Profile.find({ role: 'caller' });
  console.log('Total Callers in DB:', callers.length);
  callers.forEach(c => {
    console.log(`- Caller: ${c.fullName}, isActive: ${c.isActive}, managedBy: ${c.managedBy}, orgId: ${c.organizationId}`);
  });
  
  process.exit(0);
}
check();
