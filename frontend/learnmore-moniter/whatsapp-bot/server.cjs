const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const http = require('http');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 5002;
const AUTH_DIR = path.join(__dirname, 'auth_info_baileys');

if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

let sock = null;
let isStarting = false;
let reconnectTimer = null;
let latestQrString = null;
let latestQrDataUrl = null;
let pairingCode = null;

let botStatus = {
  isConnected: false,
  phoneNumber: null,
  userName: null,
  status: 'initializing',
  lastConnectedAt: null,
};

function scheduleRestart(delayMs = 2000) {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    startWhatsApp();
  }, delayMs);
}

// Start or reconnect WhatsApp Baileys Socket
async function startWhatsApp() {
  if (isStarting) {
    console.log('⚡ Connection start already in progress, skipping duplicate call.');
    return;
  }
  isStarting = true;

  try {
    // Safely cleanup previous socket if existing
    if (sock) {
      try {
        sock.ev.removeAllListeners();
        sock.ws?.removeAllListeners?.();
        sock.ws?.close();
        sock.end();
      } catch (e) {
        // ignore
      }
      sock = null;
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    let version = [2, 3000, 1015901307];
    try {
      const vRes = await Promise.race([
        fetchLatestBaileysVersion(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1200))
      ]);
      if (vRes?.version) version = vRes.version;
    } catch (e) {
      console.log('Using default Baileys version due to fast startup timeout.');
    }
    console.log(`Using Baileys version: ${version.join('.')}`);

    sock = makeWASocket({
      version,
      logger: pino({ level: 'silent' }),
      auth: state,
      browser: Browsers.macOS('Desktop'),
      syncFullHistory: false,
      markOnlineOnConnect: true,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 25000,
      generateHighQualityLinkPreview: false,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        latestQrString = qr;
        try {
          latestQrDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 8 });
        } catch (e) {
          console.error('QR Render Error:', e);
        }
        botStatus.status = 'scan_required';
        botStatus.isConnected = false;
        console.log('⚡ New WhatsApp QR Code generated and ready for scan.');
      }

      if (connection === 'open') {
        latestQrString = null;
        latestQrDataUrl = null;
        pairingCode = null;
        botStatus.isConnected = true;
        botStatus.status = 'connected';
        botStatus.phoneNumber = sock?.user?.id ? sock.user.id.split(':')[0] : 'Linked';
        botStatus.userName = sock?.user?.name || 'Admin';
        botStatus.lastConnectedAt = new Date().toISOString();
        console.log('✅ WhatsApp Baileys Socket Connected Successfully! Logged in as:', sock?.user?.id);
        setTimeout(async () => {
          await refreshGroups(true);
        }, 1500);
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const errorMsg = lastDisconnect?.error?.message || String(lastDisconnect?.error || '');
        const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401;

        console.log(`⚠️ Connection close event. StatusCode: ${statusCode}, Error: ${errorMsg}, isLoggedOut: ${isLoggedOut}`);

        if (isLoggedOut) {
          botStatus.isConnected = false;
          botStatus.status = 'disconnected';
          console.log('🚪 Device logged out. Wiping auth session for fresh QR...');
          try {
            if (fs.existsSync(AUTH_DIR)) {
              fs.rmSync(AUTH_DIR, { recursive: true, force: true });
            }
          } catch (e) {
            console.warn('Auth directory cleanup error:', e.message);
          }
          latestQrDataUrl = null;
          latestQrString = null;
          pairingCode = null;
          scheduleRestart(2000);
        } else {
          // Restart required (515) or temporary handshake
          // Keep isConnected intact if paired so UI does not flicker 3-4 times
          botStatus.status = 'reconnecting';
          const delayMs = statusCode === DisconnectReason.restartRequired ? 1000 : 2500;
          console.log(`🔄 Reconnecting with existing session credentials in ${delayMs}ms...`);
          scheduleRestart(delayMs);
        }
      }
    });

    sock.ev.on('contacts.upsert', (newContacts) => {
      newContacts.forEach((c) => {
        if (c.id && (c.name || c.notify)) {
          const existing = cachedContacts.find((item) => item.id === c.id);
          if (!existing) {
            cachedContacts.push({
              id: c.id,
              name: c.name || c.notify || c.id.split('@')[0],
              phone: c.id.split('@')[0],
              size: 1
            });
          }
        }
      });
    });

    sock.ev.on('messages.upsert', async () => {
      // Message handler (if needed)
    });
  } catch (err) {
    console.error('Error starting WhatsApp socket:', err);
    scheduleRestart(4000);
  } finally {
    isStarting = false;
  }
}
let cachedGroups = [];
let cachedContacts = [];
let lastGroupsFetchTime = 0;
let isFetchingGroups = false;
let lastGroupFetchAttempt = 0;
const GROUPS_CACHE_FILE = path.join(__dirname, 'groups_cache.json');

// Try loading persisted groups cache on startup
try {
  if (fs.existsSync(GROUPS_CACHE_FILE)) {
    cachedGroups = JSON.parse(fs.readFileSync(GROUPS_CACHE_FILE, 'utf8'));
    console.log(`📁 Loaded ${cachedGroups.length} groups from disk cache.`);
  }
} catch (e) {}

async function refreshGroups(force = false) {
  if (!botStatus.isConnected || !sock) return cachedGroups;
  if (isFetchingGroups) return cachedGroups;

  const now = Date.now();
  if (!force && cachedGroups.length > 0 && (now - lastGroupFetchAttempt < 15000)) {
    return cachedGroups;
  }
  isFetchingGroups = true;
  lastGroupFetchAttempt = now;

  try {
    console.log('🔄 Querying participating groups & contacts from WhatsApp...');
    const groupData = await sock.groupFetchAllParticipating();
    const list = Object.values(groupData).map((g) => ({
      id: g.id,
      name: g.subject || g.name || 'WhatsApp Group',
      size: g.participants?.length || 0,
      creation: g.creation,
      owner: g.owner,
      isGroup: true
    }));

    if (list.length > 0) {
      cachedGroups = list;
      lastGroupsFetchTime = Date.now();
      try {
        fs.writeFileSync(GROUPS_CACHE_FILE, JSON.stringify(cachedGroups, null, 2));
      } catch (e) {}
      console.log(`✅ Loaded & cached ${cachedGroups.length} WhatsApp groups successfully!`);
    } else {
      console.log('ℹ️ 0 participating groups returned on first check, retrying in 3 seconds...');
      setTimeout(() => { refreshGroups(true); }, 3000);
    }
  } catch (err) {
    console.warn('⚠️ Group fetch notice:', err.message);
    if (String(err.message).includes('rate-overlimit')) {
      lastGroupFetchAttempt = Date.now() + 60000;
    }
  } finally {
    isFetchingGroups = false;
  }
  return cachedGroups;
}

// Start WhatsApp socket on boot
startWhatsApp();

// Periodically refresh groups in background every 3 minutes
setInterval(() => {
  if (botStatus.isConnected && sock) {
    refreshGroups();
  }
}, 3 * 60 * 1000);

// Process safety
process.on('uncaughtException', (err) => {
  console.error('Bot Uncaught Exception:', err?.message || err);
});
process.on('unhandledRejection', (err) => {
  console.error('Bot Unhandled Rejection:', err?.message || err);
});

// Lightweight HTTP API for Next.js & Django proxy
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  const getBody = () =>
    new Promise((resolve) => {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        try {
          resolve(JSON.parse(body || '{}'));
        } catch {
          resolve({});
        }
      });
      req.on('error', () => resolve({}));
    });

  // GET /status
  if (req.method === 'GET' && url.pathname === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(
      JSON.stringify({
        success: true,
        bot: {
          ...botStatus,
          hasQr: !!latestQrDataUrl,
          qrDataUrl: latestQrDataUrl,
          pairingCode,
        },
      })
    );
  }

  // GET /groups
  if (req.method === 'GET' && url.pathname === '/groups') {
    const force = url.searchParams.get('force') === 'true';
    if (botStatus.isConnected && sock) {
      if (force) {
        refreshGroups(true);
      } else if (cachedGroups.length === 0) {
        // Run group fetch with 2s max wait fallback
        await Promise.race([
          refreshGroups(false),
          new Promise((resolve) => setTimeout(resolve, 2000))
        ]);
      }
    }

    const allItems = [...cachedGroups, ...cachedContacts];
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true, groups: allItems.length > 0 ? allItems : cachedGroups }));
  }

  // POST /pair-code
  if (req.method === 'POST' && url.pathname === '/pair-code') {
    const body = await getBody();
    let phone = (body.phone || '').replace(/[^0-9]/g, '');
    if (!phone) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: 'Phone number required' }));
    }
    if (phone.length === 10) phone = '91' + phone;

    try {
      if (sock && !sock.authState?.creds?.registered) {
        pairingCode = await sock.requestPairingCode(phone);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true, pairingCode }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, message: 'Already registered or socket not ready' }));
      }
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: e.message }));
    }
  }

  // POST /create-group
  if (req.method === 'POST' && url.pathname === '/create-group') {
    const body = await getBody();
    const { name, participants = [] } = body;

    if (!botStatus.isConnected || !sock) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      return res.end(
        JSON.stringify({
          success: false,
          error: 'WhatsApp Bot is not connected yet. Please scan QR code first.',
        })
      );
    }

    try {
      const jids = participants
        .map((p) => {
          if (!p) return null;
          let clean = String(p).replace(/[^0-9]/g, '');
          if (!clean || clean.length < 10) return null;
          if (clean.length === 10) clean = '91' + clean;
          if (clean.length === 11 && clean.startsWith('0')) clean = '91' + clean.slice(1);
          return `${clean}@s.whatsapp.net`;
        })
        .filter(Boolean);

      if (jids.length === 0 && sock?.user?.id) {
        const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        jids.push(botJid);
      }

      console.log(`Creating group "${name}" with ${jids.length} participants:`, jids);
      let group;
      try {
        group = await sock.groupCreate(name || 'New Batch Group', jids);
      } catch (createErr) {
        console.log('groupCreate fallback with bot JID:', createErr.message);
        const botJid = sock.user?.id ? sock.user.id.split(':')[0] + '@s.whatsapp.net' : null;
        group = await sock.groupCreate(name || 'New Batch Group', botJid ? [botJid] : []);
      }

      if (jids.length > 0) {
        try {
          await sock.groupParticipantsUpdate(group.id, jids, 'add');
        } catch (addErr) {
          console.log('Group participants add notice:', addErr.message);
        }
      }

      let inviteCode = '';
      try {
        inviteCode = await sock.groupInviteCode(group.id);
      } catch {}

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(
        JSON.stringify({
          success: true,
          groupId: group.id,
          groupName: name,
          inviteLink: inviteCode ? `https://chat.whatsapp.com/${inviteCode}` : null,
        })
      );
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  // POST /send-message
  if (req.method === 'POST' && url.pathname === '/send-message') {
    const body = await getBody();
    const { target, text } = body;

    if (!botStatus.isConnected || !sock) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      return res.end(
        JSON.stringify({
          success: false,
          error: 'WhatsApp Bot is not connected yet. Please scan QR code first.',
        })
      );
    }

    try {
      let jid = target;
      if (!jid.includes('@')) {
        const clean = target.replace(/[^0-9]/g, '');
        jid = `${clean}@s.whatsapp.net`;
      }

      const sendPromise = sock.sendMessage(jid, { text });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('WhatsApp message send timeout (8s)')), 8000)
      );

      const result = await Promise.race([sendPromise, timeoutPromise]);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, result }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  // POST or GET /reset-auth or /disconnect
  if (
    (req.method === 'POST' || req.method === 'GET') &&
    (url.pathname === '/reset-auth' || url.pathname === '/disconnect' || url.pathname === '/logout')
  ) {
    try {
      console.log('🔄 Disconnect / reset session requested.');
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (sock) {
        try {
          sock.ev.removeAllListeners();
          sock.ws?.removeAllListeners?.();
          sock.ws?.close();
          sock.end();
        } catch (e) {}
        sock = null;
      }

      botStatus = {
        isConnected: false,
        phoneNumber: null,
        userName: null,
        status: 'scan_required',
        lastConnectedAt: null,
      };
      latestQrDataUrl = null;
      latestQrString = null;
      pairingCode = null;

      try {
        if (fs.existsSync(AUTH_DIR)) {
          fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        }
      } catch (e) {
        console.warn('AUTH_DIR clean notice:', e.message);
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Session reset. Generating fresh QR code...' }));

      scheduleRestart(1200);
      return;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Route not found' }));
});

server.listen(PORT, () => {
  console.log(`🚀 Real WhatsApp Baileys Gateway Server running at http://localhost:${PORT}`);
});
