async function testFullTopicWhatsApp() {
  const mockSession = {
    batch_id: 'btc_1',
    trainer_id: 'usr_trainer_1',
    trainer_name: 'Rahul Sharma',
    session_date: '2026-08-26',
    hours_taken: 2,
    selected_topics: [
      'Variables & Identifiers',
      'Data Types & Type Casting',
      'Operators & Expressions',
      'Conditional Statements (if-else, switch)',
      'Functions, Arrow Functions & Closures',
      'Arrays, Array Methods (map, filter, reduce)',
      'Objects, Destructuring & Spread Operator'
    ],
    description: 'Complete hands-on JavaScript core concepts',
    students_attendance: [
      { student_id: 'st_1', status: 'present' },
      { student_id: 'st_2', status: 'present' },
      { student_id: 'st_3', status: 'present' },
      { student_id: 'st_4', status: 'absent' }
    ]
  };

  const res = await fetch('http://localhost:3000/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mockSession)
  });

  const data = await res.json();
  console.log('\n--- SESSION CREATION & WHATSAPP MESSAGE VERIFICATION ---');
  console.log('Target Group Name:', data.whatsapp?.deliveredTo);
  console.log('\nComplete Delivered WhatsApp Message:');
  console.log('--------------------------------------------------');
  console.log(data.whatsapp?.messageText);
  console.log('--------------------------------------------------');
}

testFullTopicWhatsApp();
