async function testSnapshot() {
  const res = await fetch('http://localhost:3000/api/monitoring/snapshot');
  const data = await res.json();
  console.log('Summary Before 12 PM:', data.summary);
  console.log('\nTrainers Monitoring Status:');
  data.trainers.forEach((t) => {
    console.log(
      `Trainer: ${t.trainer_name} | Login: ${t.login_time || 'None'} | Attendance: ${t.attendance_status} | Badge: ${t.status_badge}`
    );
  });
}
testSnapshot();
