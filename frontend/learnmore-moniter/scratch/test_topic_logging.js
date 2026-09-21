async function testAllSessions() {
  const today = new Date().toISOString().split('T')[0];

  // 1. Priya Patel check-in and session
  await fetch('http://localhost:3000/api/attendance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      trainer_id: 'usr_trainer_2',
      date: today,
      action: 'mark_in',
      location_name: 'Data Science Lab 2'
    })
  });

  await fetch('http://localhost:3000/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      batch_id: 'btc_3',
      trainer_id: 'usr_trainer_2',
      trainer_name: 'Priya Patel',
      course_id: 'course_datascience',
      course_name: 'Python Data Science & ML',
      selected_topics: ['Pandas DataFrames', 'NumPy Arrays', 'Matplotlib Plotting'],
      session_date: today,
      hours_taken: 2,
      description: 'Pandas DataFrames, NumPy Arrays, Matplotlib Plotting',
      whatsapp_sent: false
    })
  });

  // 2. Fetch snapshot to verify
  const snapRes = await fetch('http://localhost:3000/api/monitoring/snapshot');
  const data = await snapRes.json();
  console.log('\n--- LIVE MONITORING SNAPSHOT TABLE DATA ---');
  data.trainers.forEach(t => {
    console.log(`Trainer: ${t.trainer_name} | Attendance: ${t.attendance_status} | Today Topic: ${t.today_topic} | Status: ${t.status_badge}`);
  });
}

testAllSessions();
