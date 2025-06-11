import cron from 'node-cron';
import { main } from './closeSheetExport';

// Function to log the next run time
function logNextRun() {
    const now = new Date();
    const nextRun = new Date(now);
    nextRun.setHours(6, 0, 0, 0);
    
    if (now.getHours() >= 6) {
        nextRun.setDate(nextRun.getDate() + 1);
    }
    
    console.log(`Next scheduled run: ${nextRun.toLocaleString('en-GB', { timeZone: 'Europe/London' })}`);
}

// Schedule the job to run at 6:00 AM BST
cron.schedule('0 6 * * *', async () => {
    console.log(`Running scheduled export at ${new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' })}`);
    
    try {
        await main();
        console.log('Scheduled export completed successfully');
    } catch (error) {
        console.error('Error in scheduled export:', error);
    }
    
    logNextRun();
}, {
    timezone: 'Europe/London' // BST timezone
});

// Log when the scheduler starts
console.log('Scheduler started');
logNextRun();

// Keep the process running
process.on('SIGINT', () => {
    console.log('Scheduler stopped');
    process.exit();
}); 