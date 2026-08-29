require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const Profile = require('./src/models/Profile');
const Organization = require('./src/models/Organization');
const Escalation = require('./src/models/Escalation');
const CallLog = require('./src/models/CallLog');
const Notification = require('./src/models/Notification');
const { 
    checkOrgDailySummary, 
    checkOrgWeeklySummary 
} = require('./src/services/orgAdminNotificationScheduler');
const { 
    checkPlatformDailySummary, 
    checkPlatformWeeklySummary, 
    notifyNewOrganizationOnboarded 
} = require('./src/services/superAdminNotificationScheduler');
const { 
    notifyEscalationAssigned
} = require('./src/services/notificationService');

async function runTests() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Clear previous test notifications for clean output
        await Notification.deleteMany({ type: { $in: [
            'org_daily_summary', 'org_weekly_summary', 
            'platform_daily_summary', 'platform_weekly_summary', 
            'new_org_created', 'critical_escalation_alert'
        ]}});

        // Fetch admins
        const orgAdmins = await Profile.find({ role: 'org_admin', isActive: true }).select('_id organizationId').lean();
        const superAdmins = await Profile.find({ role: 'super_admin', isActive: true }).select('_id').lean();

        // 1. Test Admin Daily Summaries
        console.log('\n--- Testing Daily Summaries ---');
        const resOrgDaily = await checkOrgDailySummary(orgAdmins, true) || 0;
        const resPlatDaily = await checkPlatformDailySummary(superAdmins, true) || 0;
        console.log(`Generated ${resOrgDaily} org daily summaries and ${resPlatDaily} platform daily summaries.`);
        
        // 2. Test Admin Weekly Summaries
        console.log('\n--- Testing Weekly Summaries ---');
        const resOrgWeekly = await checkOrgWeeklySummary(orgAdmins, true) || 0;
        const resPlatWeekly = await checkPlatformWeeklySummary(superAdmins, true) || 0;
        console.log(`Generated ${resOrgWeekly} org weekly summaries and ${resPlatWeekly} platform weekly summaries.`);

        // 3. Test Notify New Organization
        console.log('\n--- Testing New Organization Notification ---');
        const org = await Organization.findOne({ isActive: true });
        if (org) {
            await notifyNewOrganizationOnboarded(org);
            console.log(`Triggered new organization notification for '${org.name}'.`);
        } else {
            console.log('No active orgs to test with.');
        }

        // 4. Test Critical Escalation Alert
        console.log('\n--- Testing Critical Escalation ---');
        const patient = await Profile.findOne({ role: 'patient' });
        // find a care manager to assign to
        const manager = await Profile.findOne({ role: 'care_manager' });
        if (org && patient && manager) {
            const escalation = await Escalation.create({
                patientId: patient._id,
                organizationId: org._id,
                assignedTo: manager._id,
                type: 'missed_medication',
                priority: 'critical',
                status: 'open',
                message: 'Patient missed heart medication and reported chest pain.',
            });
            await notifyEscalationAssigned(escalation._id);
            console.log('Triggered critical escalation notification.');
            // Cleanup the dummy escalation to avoid polluting the DB
            await Escalation.deleteOne({ _id: escalation._id });
        } else {
            console.log('Could not find necessary profiles to test escalation.');
        }

        // Fetch and print all generated notifications
        console.log('\n--- Generated Notifications ---');
        const notifs = await Notification.find({ type: { $in: [
            'org_daily_summary', 'org_weekly_summary', 
            'platform_daily_summary', 'platform_weekly_summary', 
            'new_org_created', 'critical_escalation_alert'
        ]}}).sort({ createdAt: -1 });
        
        if (notifs.length === 0) console.log('No notifications generated.');
        
        notifs.forEach(n => {
            console.log(`\n[${n.type.toUpperCase()}]`);
            console.log(`Title: ${n.title}`);
            console.log(`Body: ${n.body}`);
        });

    } catch (err) {
        console.error('Test Error:', err);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');
    }
}

runTests();
