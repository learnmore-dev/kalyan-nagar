const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(process.cwd(), 'data', 'institute_db.json');

function seedRahulAttendance() {
  if (!fs.existsSync(DB_FILE)) {
    console.error('DB file not found:', DB_FILE);
    return;
  }

  const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));

  // Clear existing old dummy attendances for usr_trainer_1 and usr_rahul to avoid messy duplicates
  db.attendances = db.attendances.filter(
    (a) => a.trainer_id !== 'usr_trainer_1' && a.trainer_id !== 'usr_rahul'
  );

  const sampleSelfies = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400'
  ];

  const labs = [
    'Main Campus Lab 1 (MERN Stack Lab)',
    'Data Science Lab 2, Campus West',
    'Full-Stack Development Lab 3',
    'Institute Tech Arena, 2nd Floor'
  ];

  const augustDays = [
    { date: '2026-08-01', dayOfWeek: 6, status: 'present', inTime: '09:20', outTime: '18:30', lab: labs[0] },
    // 2026-08-02: Sunday (Week-off)
    { date: '2026-08-03', dayOfWeek: 1, status: 'present', inTime: '09:12', outTime: '18:45', lab: labs[0] },
    { date: '2026-08-04', dayOfWeek: 2, status: 'present', inTime: '09:18', outTime: '18:30', lab: labs[1] },
    { date: '2026-08-05', dayOfWeek: 3, status: 'late', inTime: '10:35', outTime: '19:00', lab: labs[0] },
    { date: '2026-08-06', dayOfWeek: 4, status: 'present', inTime: '09:15', outTime: '18:30', lab: labs[2] },
    { date: '2026-08-07', dayOfWeek: 5, status: 'present', inTime: '09:25', outTime: '18:35', lab: labs[0] },
    { date: '2026-08-08', dayOfWeek: 6, status: 'present', inTime: '09:10', outTime: '18:20', lab: labs[3] },
    // 2026-08-09: Sunday (Week-off)
    { date: '2026-08-10', dayOfWeek: 1, status: 'present', inTime: '09:05', outTime: '18:30', lab: labs[0] },
    { date: '2026-08-11', dayOfWeek: 2, status: 'late', inTime: '10:28', outTime: '18:50', lab: labs[1] },
    { date: '2026-08-12', dayOfWeek: 3, status: 'present', inTime: '09:15', outTime: '18:30', lab: labs[0] },
    { date: '2026-08-13', dayOfWeek: 4, status: 'present', inTime: '09:20', outTime: '18:40', lab: labs[2] },
    { date: '2026-08-14', dayOfWeek: 5, status: 'leave', inTime: null, outTime: null, lab: 'On Approved Casual Leave' },
    // 2026-08-15: Independence Day (Mandatory Holiday)
    // 2026-08-16: Sunday (Week-off)
    { date: '2026-08-17', dayOfWeek: 1, status: 'present', inTime: '09:10', outTime: '18:35', lab: labs[0] },
    { date: '2026-08-18', dayOfWeek: 2, status: 'present', inTime: '09:15', outTime: '18:30', lab: labs[1] },
    { date: '2026-08-19', dayOfWeek: 3, status: 'present', inTime: '09:12', outTime: '18:45', lab: labs[0] },
    { date: '2026-08-20', dayOfWeek: 4, status: 'late', inTime: '10:40', outTime: '19:15', lab: labs[3] },
    { date: '2026-08-21', dayOfWeek: 5, status: 'present', inTime: '09:14', outTime: '18:30', lab: labs[0] },
    { date: '2026-08-22', dayOfWeek: 6, status: 'present', inTime: '09:22', outTime: '18:30', lab: labs[2] },
    // 2026-08-23: Sunday (Week-off)
    { date: '2026-08-24', dayOfWeek: 1, status: 'present', inTime: '09:15', outTime: '18:30', lab: labs[0] },
    { date: '2026-08-25', dayOfWeek: 2, status: 'present', inTime: '09:30', outTime: '18:30', lab: labs[0] }
  ];

  augustDays.forEach((day, idx) => {
    const selfie = sampleSelfies[idx % sampleSelfies.length];
    const markInIso = day.inTime ? `${day.date}T${day.inTime}:00.000Z` : null;
    const markOutIso = day.outTime ? `${day.date}T${day.outTime}:00.000Z` : null;

    const record = {
      id: `att_${day.date}_usr_trainer_1`,
      trainer_id: 'usr_trainer_1',
      trainer_name: 'Rahul Sharma',
      date: day.date,
      mark_in_time: markInIso,
      mark_out_time: markOutIso,
      photo_in: day.inTime ? selfie : null,
      photo_out: day.outTime ? selfie : null,
      latitude: '23.0225',
      longitude: 72.5714,
      location_name: day.lab,
      day_status: day.status,
      created_at: `${day.date}T09:00:00.000Z`
    };

    db.attendances.push(record);

    // Also clone for usr_rahul if used interchangeably
    db.attendances.push({
      ...record,
      id: `att_${day.date}_usr_rahul`,
      trainer_id: 'usr_rahul'
    });
  });

  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  console.log(`Successfully seeded ${augustDays.length} attendance records for Rahul Sharma!`);
}

seedRahulAttendance();
