const cron = require('node-cron');
const InvoiceModel = require('../models/invoice.model');

let invoiceCronTask = null;

async function runInvoiceJob() {
  try {
    const result = await InvoiceModel.generateRecurringInvoices();
    if (result.count > 0) {
      console.log(`[Cron] Berhasil membuat ${result.count} tagihan berulang otomatis (F-31)`);
    }
    return result;
  } catch (err) {
    console.error('[Cron] Gagal menjalankan auto-generate tagihan:', err.message);
    throw err;
  }
}

function startCronJobs() {
  if (invoiceCronTask) {
    return;
  }

  // Jalankan setiap hari pukul 00:00 (tengah malam)
  const cronSchedule = process.env.CRON_INVOICE_SCHEDULE || '0 0 * * *';

  invoiceCronTask = cron.schedule(cronSchedule, async () => {
    console.log('[Cron] Menjalankan pengecekan tagihan otomatis & jatuh tempo...');
    await runInvoiceJob();
  });

  console.log(`[Cron] Scheduler tagihan aktif dengan jadwal: ${cronSchedule}`);
}

function stopCronJobs() {
  if (invoiceCronTask) {
    invoiceCronTask.stop();
    invoiceCronTask = null;
    console.log('[Cron] Scheduler tagihan dihentikan');
  }
}

module.exports = {
  startCronJobs,
  stopCronJobs,
  runInvoiceJob,
};
