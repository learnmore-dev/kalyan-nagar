const tls = require('tls');

function sendNativeGmail({ user, pass, to, subject, html }) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(465, 'smtp.gmail.com', { rejectUnauthorized: false }, () => {
      console.log('Connected to Gmail SMTP over SSL (Port 465)...');
    });

    let step = 0;

    socket.setEncoding('utf8');

    const boundary = '----=_Part_' + Date.now();
    const mailData = [
      `From: "Learnmore Technologies" <${user}>`,
      `To: <${to}>`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: 7bit`,
      '',
      html,
      '',
      '.'
    ].join('\r\n');

    socket.on('data', (data) => {
      const msg = data.toString();
      // console.log('S:', msg.trim());

      if (step === 0 && msg.startsWith('220')) {
        socket.write(`EHLO localhost\r\n`);
        step = 1;
      } else if (step === 1 && msg.includes('250')) {
        socket.write('AUTH LOGIN\r\n');
        step = 2;
      } else if (step === 2 && msg.startsWith('334')) {
        // Send base64 username
        socket.write(Buffer.from(user).toString('base64') + '\r\n');
        step = 3;
      } else if (step === 3 && msg.startsWith('334')) {
        // Send base64 app password
        socket.write(Buffer.from(pass).toString('base64') + '\r\n');
        step = 4;
      } else if (step === 4 && msg.startsWith('235')) {
        console.log('Authentication Successful!');
        socket.write(`MAIL FROM:<${user}>\r\n`);
        step = 5;
      } else if (step === 5 && msg.startsWith('250')) {
        socket.write(`RCPT TO:<${to}>\r\n`);
        step = 6;
      } else if (step === 6 && msg.startsWith('250')) {
        socket.write('DATA\r\n');
        step = 7;
      } else if (step === 7 && msg.startsWith('354')) {
        socket.write(mailData + '\r\n');
        step = 8;
      } else if (step === 8 && msg.startsWith('250')) {
        console.log('✅ Email Delivered Successfully to Gmail Server!');
        socket.write('QUIT\r\n');
        resolve(true);
      } else if (msg.startsWith('5')) {
        console.error('SMTP Error:', msg);
        reject(new Error(msg));
        socket.end();
      }
    });

    socket.on('error', (err) => {
      reject(err);
    });
  });
}

const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #1e293b; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: linear-gradient(135deg, #4f46e5, #3730a3); padding: 30px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; }
    .content { padding: 30px; line-height: 1.6; }
    .badge-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 16px; margin: 20px 0; }
    .badge-title { font-size: 15px; font-weight: 700; color: #991b1b; }
    .badge-desc { font-size: 13px; color: #7f1d1d; margin-top: 4px; }
    .details-table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
    .details-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
    .details-table td.label { font-weight: 600; color: #64748b; width: 40%; }
    .details-table td.val { font-weight: 700; color: #0f172a; font-family: monospace; }
    .cta-box { background: #f8fafc; border-radius: 12px; padding: 16px; text-align: center; margin-top: 25px; border: 1px solid #e2e8f0; font-size: 12px; color: #475569; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎓 Learnmore Technologies</h1>
      <p>Faculty Attendance & Monitoring Operations</p>
    </div>
    
    <div class="content">
      <p>Dear <strong>Amit Verma</strong>,</p>
      
      <p>This is an automated operational notification regarding today's faculty login status.</p>
      
      <div class="badge-box">
        <div class="badge-title">⚠️ Notice of Uninformed Absence (12:00 PM Cutoff)</div>
        <div class="badge-desc">
          Our attendance monitoring engine recorded that you have not logged in to the Faculty Portal by the standard 12:00 PM cutoff today (26 Aug 2026), and no prior approved leave was registered in the system.
        </div>
      </div>
      
      <table class="details-table">
        <tr>
          <td class="label">Trainer Name:</td>
          <td class="val">Amit Verma (Database & SQL Faculty)</td>
        </tr>
        <tr>
          <td class="label">Date:</td>
          <td class="val">26 Aug 2026</td>
        </tr>
        <tr>
          <td class="label">Cutoff Evaluated:</td>
          <td class="val">12:00 PM (IST)</td>
        </tr>
        <tr>
          <td class="label">Recorded Status:</td>
          <td class="val" style="color: #dc2626; font-weight: 800;">🔴 NOT LOGGED IN / ABSENT</td>
        </tr>
      </table>
      
      <div class="cta-box">
        <strong>Next Steps:</strong> If you are unable to conduct your scheduled batches today or are facing an emergency, please submit a regularized leave application in the portal or contact institute administration immediately.
      </div>
    </div>
    
    <div class="footer">
      This is an automated system email generated by Learnmore Faculty Portal. Please do not reply directly to this email.
    </div>
  </div>
</body>
</html>
`;

sendNativeGmail({
  user: 'kanzariyapratik124@gmail.com',
  pass: 'xrdtkwzkayzeerkf',
  to: 'kanzariyapratik124@gmail.com',
  subject: '⚠️ Notice of Uninformed Absence - 12:00 PM Cutoff Alert',
  html
}).catch(console.error);
