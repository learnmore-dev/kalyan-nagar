const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('====================================================');
  console.log('🚀 STARTING FULL TRAINER MONITORING PORTAL TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`✅ [PASS] ${testName} ${details ? '-> ' + details : ''}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} ${details ? '-> ' + details : ''}`);
      failed++;
    }
  }

  // 1. Central Live Monitoring Snapshot API
  console.log('\n--- 1. Testing Live Monitoring Snapshot ---');
  try {
    const res = await fetch(`${BASE_URL}/api/monitoring/snapshot`);
    const data = await res.json();
    assert(data.success === true, 'Monitoring Snapshot API returns 200 OK');
    assert(data.trainers && data.trainers.length > 0, 'Trainers array exists in snapshot', `Found ${data.trainers.length} trainers`);
    assert(data.summary && data.summary.totalTrainers >= 3, 'Summary statistics calculated', `Total: ${data.summary.totalTrainers}`);
    assert(data.isWorkingDay !== undefined, 'Working day calculation present', `isWorkingDay: ${data.isWorkingDay}`);
  } catch (err) {
    assert(false, 'Monitoring Snapshot API', err.message);
  }

  // 2. Automated 12 PM Cut-off Evaluation (Normal Working Day vs Holiday vs Week-off)
  console.log('\n--- 2. Testing 12:00 PM Automated Non-Login Cutoff ---');
  try {
    // Normal Working Day Test
    const resWork = await fetch(`${BASE_URL}/api/cron/12pm-cutoff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2026-08-25' }), // Tuesday
    });
    const dataWork = await resWork.json();
    assert(dataWork.success === true, '12 PM Cut-off execution on Working Day');
    assert(dataWork.isWorkingDay === true, 'Recognized as Working Day');
    assert(dataWork.unloggedTrainers !== undefined, 'Evaluated unlogged trainers list', `${dataWork.totalFlagged} flagged`);

    // Holiday Test (2026-08-15 Independence Day)
    const resHoliday = await fetch(`${BASE_URL}/api/cron/12pm-cutoff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2026-08-15' }),
    });
    const dataHoliday = await resHoliday.json();
    assert(dataHoliday.isWorkingDay === false, 'Holiday correctly bypassed 12 PM absence penalty', `Day Type: ${dataHoliday.dayType}`);
    assert(dataHoliday.totalFlagged === 0, 'Zero trainers flagged on Holiday');

    // Week-off Test (Sunday: 2026-08-23)
    const resSunday = await fetch(`${BASE_URL}/api/cron/12pm-cutoff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2026-08-23' }),
    });
    const dataSunday = await resSunday.json();
    assert(dataSunday.isWorkingDay === false, 'Sunday Week-off correctly bypassed', `Day Type: ${dataSunday.dayType}`);
    assert(dataSunday.totalFlagged === 0, 'Zero trainers flagged on Week-off');
  } catch (err) {
    assert(false, '12 PM Cutoff Test', err.message);
  }

  // 3. Holiday & Week-Off Configuration API
  console.log('\n--- 3. Testing Holiday & Week-off Management ---');
  try {
    const res = await fetch(`${BASE_URL}/api/holidays?year=2026&month=8`);
    const data = await res.json();
    assert(data.success === true, 'Holidays API returns 200 OK');
    assert(data.holidayConfig.mandatory_holidays.length === 5, '5 Mandatory Holidays configured');
    assert(data.holidayConfig.optional_holidays.length === 5, '5 Optional Holidays configured');
    assert(data.monthlySchedule.totalDays === 31, 'August total days = 31');
    assert(data.monthlySchedule.netWorkingDays === 25, 'August net working days calculated = 25 (31 - 5 Sun - 1 Indep. Day)');
  } catch (err) {
    assert(false, 'Holidays API Test', err.message);
  }

  // 4. Admin Leave Quota Override & Audit Trail
  console.log('\n--- 4. Testing Admin Leave Override & Audit Logs ---');
  try {
    const testAdmin = 'Director (Admin)';
    const resAdjust = await fetch(`${BASE_URL}/api/leaves/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trainer_id: 'usr_trainer_1',
        admin_name: testAdmin,
        leave_type: 'casual_sick',
        new_balance: 11,
        reason: 'Automated Test Verification Adjustment',
      }),
    });
    const dataAdjust = await resAdjust.json();
    assert(dataAdjust.success === true, 'Admin Leave Override executed successfully');
    assert(dataAdjust.balance.casual_sick_quota === 11, 'Trainer quota updated to 11');
    assert(dataAdjust.auditLog !== undefined, 'Audit record created');
    assert(dataAdjust.auditLog.admin_name === testAdmin, 'Audit record logs correct admin name');

    // Fetch all audit logs
    const resAudits = await fetch(`${BASE_URL}/api/leaves/adjust`);
    const dataAudits = await resAudits.json();
    assert(dataAudits.auditLogs && dataAudits.auditLogs.length > 0, 'Audit logs retrievable via API', `Total logs: ${dataAudits.auditLogs.length}`);
  } catch (err) {
    assert(false, 'Leave Override & Audit Test', err.message);
  }

  // 5. Multi-Topic Coverage & Course Completion Analytics
  console.log('\n--- 5. Testing Multi-Topic Selection & Syllabus Progress ---');
  try {
    const resCov = await fetch(`${BASE_URL}/api/topics/coverage`);
    const dataCov = await resCov.json();
    assert(dataCov.success === true, 'Topic Coverage API returns 200 OK');
    assert(dataCov.coverages && dataCov.coverages.length > 0, 'Coverages calculated across batches', `Found ${dataCov.coverages.length} batches`);

    const firstBatch = dataCov.coverages[0];
    assert(firstBatch.total_topics > 0, 'Batch has total topics from Syllabus', `${firstBatch.course_name}: ${firstBatch.total_topics} topics`);
    assert(firstBatch.coverage_percentage !== undefined, 'Topic coverage % calculated', `${firstBatch.coverage_percentage}% completed`);
  } catch (err) {
    assert(false, 'Topic Coverage API Test', err.message);
  }

  // 6. WhatsApp Standardized Message Format & Length Truncation
  console.log('\n--- 6. Testing WhatsApp Short Message Standards ---');
  try {
    const resLogs = await fetch(`${BASE_URL}/api/whatsapp`);
    const dataLogs = await resLogs.json();
    assert(dataLogs.success === true, 'WhatsApp Logs API returns 200 OK');
    assert(dataLogs.logs !== undefined, 'WhatsApp broadcast log history available');
  } catch (err) {
    assert(false, 'WhatsApp Logs Test', err.message);
  }

  // 7. Frontend Pages Availability
  console.log('\n--- 7. Testing Frontend Pages (HTTP 200) ---');
  const pages = [
    '/admin/dashboard',
    '/admin/leaves',
    '/admin/holidays',
    '/admin/batches',
    '/admin/trainers',
    '/admin/attendance',
    '/admin/reports',
    '/admin/whatsapp',
    '/admin/live-monitor',
    '/trainer/dashboard',
    '/trainer/sessions/add',
    '/trainer/leaves',
  ];

  for (const page of pages) {
    try {
      const res = await fetch(`${BASE_URL}${page}`);
      assert(res.status === 200, `Page Route: ${page}`, `Status: ${res.status}`);
    } catch (err) {
      assert(false, `Page Route: ${page}`, err.message);
    }
  }

  console.log('\n====================================================');
  console.log(`📊 TEST SUITE SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================\n');
}

runTests();
