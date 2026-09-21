const http = require('http');

function pingPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/api/auth/login`, (res) => {
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function findActivePort() {
  const candidatePorts = [3002, 3000, 3001, 8000, 5000];
  console.log('🔍 Detecting active server port...');
  for (let attempt = 1; attempt <= 5; attempt++) {
    for (const port of candidatePorts) {
      const active = await pingPort(port);
      if (active) {
        console.log(`✅ Next.js server detected running on port ${port}!`);
        return port;
      }
    }
    console.log(`⏳ Waiting for server startup (attempt ${attempt}/5)...`);
    await new Promise((r) => setTimeout(r, 2000));
  }
  return 3002;
}

function postJSON(port, path, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: port,
        path: path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve(body);
          }
        });
      }
    );
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function runTest() {
  console.log('🚀 Starting Full WhatsApp New Group & Work Status Test...\n');

  const activePort = await findActivePort();

  console.log('\n📱 Checking WhatsApp Bot Connection Status (port 5002)...');
  try {
    const statusRes = await new Promise((resolve) => {
      http.get('http://127.0.0.1:5002/status', (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try { resolve(JSON.parse(data)); } catch { resolve(null); }
        });
      }).on('error', () => resolve(null));
    });
    if (statusRes && statusRes.bot) {
      console.log(`🤖 WhatsApp Bot State: ${statusRes.bot.isConnected ? '✅ CONNECTED (' + statusRes.bot.phoneNumber + ')' : '⚠️ DISCONNECTED / UNLINKED (Status: ' + statusRes.bot.status + ')'}`);
      if (!statusRes.bot.isConnected) {
        console.log('⚠️ ATTENTION: WhatsApp Bot is currently DISCONNECTED or UNLINKED on the server!');
        console.log('⚠️ Please open http://3.110.237.56:' + activePort + '/admin/whatsapp and SCAN THE QR CODE to link WhatsApp!\n');
      }
    } else {
      console.log('⚠️ WhatsApp Bot port 5002 is not responding.');
    }
  } catch (e) {}

  const batchName = `LMT-TEST-BATCH-${Date.now().toString().slice(-4)}`;
  console.log(`\n1️⃣ Creating New Batch: "${batchName}" with numbers 9737356415 & 8340729468...`);

  try {
    const batchRes = await postJSON(activePort, '/api/batches', {
      name: batchName,
      course_id: 'crs_1',
      course_name: 'Python & Web Development',
      trainer_id: 'usr_trainer_1',
      total_hours: 60,
      batch_type: 'training',
      auto_whatsapp_group: true,
      students: [
        { name: 'Student 1', phone: '9737356415' },
        { name: 'Student 2', phone: '8340729468' },
      ],
    });

    console.log('✅ Batch API Response:', batchRes);
    const batchId = batchRes?.batch?.id || batchRes?.id;
    const waGroupId = batchRes?.batch?.whatsapp_group_id;
    console.log(`📌 Created Batch ID: ${batchId}, WhatsApp Group ID: ${waGroupId}\n`);

    console.log('2️⃣ Submitting Work Status for the newly created batch...');
    const sessionRes = await postJSON(activePort, '/api/sessions', {
      batch_id: batchId,
      trainer_id: 'usr_trainer_1',
      trainer_name: 'KANZARIYA PRATIK',
      date: new Date().toISOString().split('T')[0],
      hours_taken: 2,
      description: 'MODULE 1 >> Introduction to Python, Variables & Data Types\n• Overview of Python environment\n• Setting up VS Code and running first script',
      selected_topics: ['Introduction to Python', 'Variables & Data Types'],
      students_attendance: [
        { student_id: 'st_1', student_name: 'Student 1', status: 'present' },
        { student_id: 'st_2', student_name: 'Student 2', status: 'present' },
      ],
    });

    console.log('✅ Session Work Status API Response:', sessionRes);
    console.log('\n🎉 ALL TESTS COMPLETED!');
  } catch (err) {
    console.error('❌ Test Failed:', err.message);
  }
}

runTest();
