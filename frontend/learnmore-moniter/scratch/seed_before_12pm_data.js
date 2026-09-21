const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(process.cwd(), 'data', 'institute_db.json');

function seedBefore12PMState() {
  if (!fs.existsSync(DB_FILE)) return;

  const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  const today = '2026-08-25';

  db.attendances = db.attendances.filter((a) => a.date !== today);

  // 1. Rahul Sharma -> Logged in at 09:15 AM local time (On-time 🟢)
  const rahulIn = new Date(2026, 7, 25, 9, 15, 0).toISOString();
  db.attendances.push({
    id: `att_${today}_usr_trainer_1`,
    trainer_id: 'usr_trainer_1',
    trainer_name: 'Rahul Sharma',
    date: today,
    mark_in_time: rahulIn,
    mark_out_time: null,
    photo_in: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
    photo_out: null,
    latitude: '23.0225',
    longitude: 72.5714,
    location_name: 'Main Campus Lab 1 (MERN Stack)',
    day_status: 'present',
    created_at: rahulIn
  });

  // Also usr_rahul
  db.attendances.push({
    id: `att_${today}_usr_rahul`,
    trainer_id: 'usr_rahul',
    trainer_name: 'Rahul Sharma',
    date: today,
    mark_in_time: rahulIn,
    mark_out_time: null,
    photo_in: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
    photo_out: null,
    latitude: '23.0225',
    longitude: 72.5714,
    location_name: 'Main Campus Lab 1 (MERN Stack)',
    day_status: 'present',
    created_at: rahulIn
  });

  // 2. Priya Patel -> Logged in at 11:20 AM local time (Late Login before 12 PM 🟡)
  const priyaIn = new Date(2026, 7, 25, 11, 20, 0).toISOString();
  db.attendances.push({
    id: `att_${today}_usr_trainer_2`,
    trainer_id: 'usr_trainer_2',
    trainer_name: 'Priya Patel',
    date: today,
    mark_in_time: priyaIn,
    mark_out_time: null,
    photo_in: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
    photo_out: null,
    latitude: '23.0225',
    longitude: 72.5714,
    location_name: 'Data Science Lab 2',
    day_status: 'present',
    created_at: priyaIn
  });

  // 3. Amit Verma -> NOT logged in today (🔴 Not Logged In)
  // Ensure no leave or session exists for Amit today

  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  console.log('Successfully set 12 PM pre-state with accurate local time stamps!');
}

seedBefore12PMState();
