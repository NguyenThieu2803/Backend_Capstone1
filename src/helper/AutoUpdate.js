const cron = require('node-cron');
const { autoUpdateDeliveryStatus } = require('../service/Order.service');
const purchaseHistoryService = require('../service/purchaseHistory.service');

// Schedule the task to run daily at midnight
cron.schedule('0 0 * * *', async () => {
  try {
    const result = await autoUpdateDeliveryStatus();
    console.log(result.message);
    const autoUpdatePurchaseHistory = await purchaseHistoryService.updatePurchaseHistory();
    console.log(autoUpdatePurchaseHistory.message)
  } catch (error) {
    console.error('Error in scheduled delivery status update:', error.message);
  }
});