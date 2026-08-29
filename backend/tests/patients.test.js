require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const Patient = require('./src/models/Patient');
const Profile = require('./src/models/Profile');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const careManager = await Profile.findOne({ role: 'care_manager' });
  const orgId = careManager.organizationId;
  
  const objId = new mongoose.Types.ObjectId(orgId);
  
  const CaretakerPatient = require('./src/models/CaretakerPatient');
  
  const managedCallers = await Profile.find({
      organizationId: orgId,
      role: { $in: ['caller', 'caretaker'] },
      isActive: true
  }).select('_id fullName').lean();
  
  const managedCallerIds = managedCallers.map(c => c._id);
  
  const managedAssignments = await CaretakerPatient.find({
      caretakerId: { $in: managedCallerIds },
      status: 'active'
  }).distinct('patientId');
  
  const assignedCount = await Patient.countDocuments({
      _id: { $in: managedAssignments },
      is_active: { $ne: false }
  });
  
  const allOrgAssignedIds = await CaretakerPatient.find({
      status: 'active'
  }).distinct('patientId');
  const unassignedCountObj = await Patient.countDocuments({
      organization_id: orgId,
      is_active: true,
      _id: { $nin: allOrgAssignedIds }
  });
  
  console.log('assignedCount:', assignedCount);
  console.log('unassignedCountObj:', unassignedCountObj);
  console.log('Total (assigned + unassigned):', assignedCount + unassignedCountObj);
  
  process.exit(0);
}
check();
