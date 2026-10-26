const cron = require('node-cron');
const InvoiceModel = require('../models/invoice.model');
const ReminderService = require('./reminder.service');

let invoiceCronTask = null;
let reminderCronTask = null;

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

async function runReminderJob(io = null) {
  try {
    const result = await ReminderService.processAllReminders(io);
    if (result.remindersSent > 0) {
      console.log(
        `[Cron] Berhasil mengirimkan ${result.remindersSent} pengingat tagihan (F-35: ${result.dueSoonCount} jatuh tempo, ${result.overdueCount} tertunggak)`
      );
    }
    return result;
  } catch (err) {
    console.error('[Cron] Gagal menjalankan reminder scheduler:', err.message);
    throw err;
  }
}

function startCronJobs(io = null) {
  if (invoiceCronTask || reminderCronTask) {
    return;
  }

  // 1. Tagihan Otomatis: Setiap hari pukul 00:00 (F-31)
  const invoiceSchedule = process.env.CRON_INVOICE_SCHEDULE || '0 0 * * *';
  invoiceCronTask = cron.schedule(invoiceSchedule, async () => {
    console.log('[Cron] Menjalankan pengecekan tagihan otomatis & jatuh tempo (F-31)...');
    await runInvoiceJob();
  });

  // 2. Pengingat Tagihan: Setiap hari pukul 08:00 pagi (F-35)
  const reminderSchedule = process.env.CRON_REMINDER_SCHEDULE || '0 8 * * *';
  reminderCronTask = cron.schedule(reminderSchedule, async () => {
    console.log('[Cron] Menjalankan scheduler pengingat tagihan (F-35)...');
    await runReminderJob(io);
  });

  console.log(`[Cron] Scheduler tagihan & pengingat aktif (tagihan: ${invoiceSchedule}, reminder: ${reminderSchedule})`);
}

function stopCronJobs() {
  if (invoiceCronTask) {
    invoiceCronTask.stop();
    invoiceCronTask = null;
  }
  if (reminderCronTask) {
    reminderCronTask.stop();
    reminderCronTask = null;
  }
  console.log('[Cron] Scheduler tagihan & pengingat dihentikan');
}

module.exports = {
  startCronJobs,
  stopCronJobs,
  runInvoiceJob,
  runReminderJob,
};
