const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
  makeCacheableSignalKeyStore,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const http = require('http');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 5002;
const AUTH_DIR = path.join(__dirname, 'auth_info_baileys');
const BACKUP_CREDS_FILE = path.join(__dirname, 'creds_backup.json');
const GROUPS_CACHE_FILE = path.join(__dirname, 'groups_cache.json');
const PENDING_QUEUE_FILE = path.join(__dirname, 'pending_messages.json');
const SENT_CACHE_FILE = path.join(__dirname, 'sent_messages_cache.json');

if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. ATOMIC & VALIDATED CREDENTIAL BACKUP / RESTORE
// ─────────────────────────────────────────────────────────────────────────────

function saveCredsBackupAtomic() {
  try {
    const primaryCreds = path.join(AUTH_DIR, 'creds.json');
    if (!fs.existsSync(primaryCreds) || fs.statSync(primaryCreds).size < 50) return;
    const raw = fs.readFileSync(primaryCreds, 'utf8');
    const parsed = JSON.parse(raw);
    // Only back up if credentials represent a genuine registered account
    if (parsed && parsed.registered && parsed.me && parsed.me.id) {
      const tmpFile = BACKUP_CREDS_FILE + '.tmp';
      fs.writeFileSync(tmpFile, raw, 'utf8');
      fs.renameSync(tmpFile, BACKUP_CREDS_FILE);
      console.log('💾 [backup] Verified persistent backup of WhatsApp session saved.');
    }
  } catch (e) {
    // Non-critical background save, ignore parse or file errors
  }
}



// ─────────────────────────────────────────────────────────────────────────────
// 2. DURABLE ATTENDANCE & MESSAGE RETRY QUEUE WITH IDEMPOTENCY
// ─────────────────────────────────────────────────────────────────────────────

let sentMessagesCache = new Set();

function loadSentMessagesCache() {
  try {
    if (fs.existsSync(SENT_CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(SENT_CACHE_FILE, 'utf8'));
      if (Array.isArray(data)) {
        sentMessagesCache = new Set(data.slice(-2000)); // keep last 2000 IDs
      }
    }
  } catch (e) {}
}

function markMessageSent(idempotencyKey) {
  if (!idempotencyKey) return;
  sentMessagesCache.add(idempotencyKey);
  try {
    const arr = Array.from(sentMessagesCache).slice(-2000);
    fs.writeFileSync(SENT_CACHE_FILE, JSON.stringify(arr), 'utf8');
  } catch (e) {}
}

loadSentMessagesCache();

function loadPendingQueue() {
  try {
    if (fs.existsSync(PENDING_QUEUE_FILE)) {
      const data = JSON.parse(fs.readFileSync(PENDING_QUEUE_FILE, 'utf8'));
      if (Array.isArray(data)) return data;
    }
  } catch (e) {}
  return [];
}

function savePendingQueue(queue) {
  try {
    fs.writeFileSync(PENDING_QUEUE_FILE, JSON.stringify(queue, null, 2), 'utf8');
  } catch (e) {}
}

function enqueuePendingMessage(msgData) {
  const queue = loadPendingQueue();
  const id = msgData.idempotencyKey || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  // Check if already in queue or already sent
  if (sentMessagesCache.has(id) || queue.some((m) => m.idempotencyKey === id)) {
    return { enqueued: false, idempotencyKey: id, alreadyExists: true };
  }
  queue.push({
    ...msgData,
    idempotencyKey: id,
    attempts: 0,
    createdAt: new Date().toISOString(),
  });
  savePendingQueue(queue);
  console.log(`📥 [queue] Enqueued message ${id} for target ${msgData.target} (queue size: ${queue.length})`);
  return { enqueued: true, idempotencyKey: id };
}

let isProcessingQueue = false;

async function processPendingQueue() {
  if (isProcessingQueue || !botStatus.isConnected || !sock) return;
  const queue = loadPendingQueue();
  if (queue.length === 0) return;

  isProcessingQueue = true;
  console.log(`⚡ [queue] Processing ${queue.length} pending message(s)...`);

  const remaining = [];
  for (const item of queue) {
    if (!botStatus.isConnected || !sock) {
      remaining.push(item);
      continue;
    }

    if (item.idempotencyKey && sentMessagesCache.has(item.idempotencyKey)) {
      // Already sent
      continue;
    }

    try {
      let jid = item.target;
      if (!jid.includes('@')) {
        const cleanNum = jid.replace(/[^0-9]/g, '');
        jid = cleanNum.length >= 10 ? `${cleanNum.startsWith('91') ? cleanNum : '91' + cleanNum}@s.whatsapp.net` : `${cleanNum}@s.whatsapp.net`;
      }

      await sock.sendMessage(jid, { text: item.text });
      markMessageSent(item.idempotencyKey);
      console.log(`✅ [queue] Successfully delivered pending message ${item.idempotencyKey} to ${jid}`);
      await new Promise((r) => setTimeout(r, 1200)); // Rate limiting between retries
    } catch (err) {
      item.attempts = (item.attempts || 0) + 1;
      item.lastError = err.message;
      console.warn(`⚠️ [queue] Retry failed for ${item.idempotencyKey} (attempt ${item.attempts}):`, err.message);
      if (item.attempts < 5) {
        remaining.push(item);
      } else {
        console.error(`❌ [queue] Dropping message ${item.idempotencyKey} after 5 failed attempts.`);
      }
    }
  }

  savePendingQueue(remaining);
  isProcessingQueue = false;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. PERMANENT CONNECTION MANAGER
//
// Design goals:
//   • Auto-connect on boot if saved credentials exist on disk
//   • NEVER stop reconnecting unless the user explicitly calls /disconnect
//   • Survive network drops, 515 restarts, conflicts — always come back
//   • Only a deliberate /disconnect call stops the reconnect loop
// ─────────────────────────────────────────────────────────────────────────────

let sock = null;
let activeGeneration = 0;
let isStarting = false;
let reconnectTimer = null;
let reconnectAttempts = 0;
let userRequestedLogout = false; // only true when user calls /disconnect
let pendingRestartReason = null;

let latestQrString = null;
let latestQrDataUrl = null;
let pairingCode = null;

let botStatus = {
  isConnected: false,
  phoneNumber: null,
  userName: null,
  status: 'idle',
  lastConnectedAt: null,
};

// Check if saved session credentials exist on disk
function hasSavedSession() {
  try {
    const credsFile = path.join(AUTH_DIR, 'creds.json');
    if (!fs.existsSync(credsFile)) return false;
    const raw = fs.readFileSync(credsFile, 'utf8');
    const parsed = JSON.parse(raw);
    return !!(parsed && parsed.me && parsed.me.id);
  } catch (e) {
    return false;
  }
}

function scheduleRestart(delayMs = 3000, reason = 'reconnect') {
  if (userRequestedLogout) {
    console.log(`⛔ [reconnect] Skipping reconnect — user requested disconnect.`);
    return;
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  // Exponential backoff: 3s → 5s → 8s → 12s → 18s → 27s → 40s → 60s (cap), then stays at 60s
  reconnectAttempts++;
  const base = Math.min(60000, Math.round(3000 * Math.pow(1.5, Math.min(reconnectAttempts - 1, 8))));
  const jitter = Math.floor(Math.random() * 2000);
  const finalDelay = base + jitter;

  console.log(`🔄 [reconnect] Attempt #${reconnectAttempts} in ${Math.round(finalDelay / 1000)}s | Reason: ${reason}`);

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (!userRequestedLogout) startWhatsApp(reason);
  }, finalDelay);
}

async function startWhatsApp(triggerReason = 'boot') {
  if (userRequestedLogout) {
    console.log(`⛔ [conn-manager] Start blocked — user requested logout.`);
    return;
  }
  if (isStarting) {
    console.log(`⚡ [conn-manager] Startup in progress; queued: ${triggerReason}`);
    pendingRestartReason = triggerReason;
    return;
  }

  isStarting = true;
  const currentGen = ++activeGeneration;
  console.log(`\n🚀 [conn-manager:gen#${currentGen}] Starting WhatsApp socket (reason: ${triggerReason})...`);

  try {
    // Tear down old socket cleanly
    if (sock) {
      const oldSock = sock;
      sock = null;
      try {
        oldSock.ev.removeAllListeners();
        oldSock.ws?.removeAllListeners?.();
        oldSock.ws?.close();
        oldSock.end?.();
      } catch (e) {}
    }

    const authLogger = pino({ level: 'silent' });
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    // Fetch latest Baileys version with 5s timeout
    let version = [2, 3000, 1015901307];
    try {
      const vRes = await Promise.race([
        fetchLatestBaileysVersion(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
      ]);
      if (vRes?.version) version = vRes.version;
    } catch (e) {
      console.log('ℹ️ [conn-manager] Using bundled Baileys version (CDN timeout).');
    }

    if (currentGen !== activeGeneration) {
      console.log(`⚡ [conn-manager:gen#${currentGen}] Superseded, aborting.`);
      return;
    }

    const newSock = makeWASocket({
      version,
      logger: authLogger,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, authLogger),
      },
      browser: Browsers.ubuntu('Chrome'),
      syncFullHistory: false,
      markOnlineOnConnect: true,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 10000,   // ping every 10s — more aggressive, catches drops faster
      generateHighQualityLinkPreview: false,
      retryRequestOptions: { maxRetries: 5, delayMs: 2000 },
    });

    sock = newSock;

    newSock.ev.on('creds.update', async () => {
      if (currentGen !== activeGeneration) return;
      await saveCreds();
      saveCredsBackupAtomic();
    });

    newSock.ev.on('connection.update', async (update) => {
      if (currentGen !== activeGeneration) return;

      const { connection, lastDisconnect, qr } = update;

      // ── QR Code ready for scanning ──
      if (qr) {
        latestQrString = qr;
        try {
          latestQrDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 8 });
        } catch (e) {
          console.error('QR render error:', e.message);
        }
        botStatus.status = 'scan_required';
        botStatus.isConnected = false;
        console.log(`📱 [conn-manager:gen#${currentGen}] QR code ready. Scan with WhatsApp.`);
      }

      // ── Successfully connected ──
      if (connection === 'open') {
        latestQrString = null;
        latestQrDataUrl = null;
        pairingCode = null;
        reconnectAttempts = 0; // reset backoff counter on successful connect
        pendingRestartReason = null;

        botStatus.isConnected = true;
        botStatus.status = 'connected';
        botStatus.phoneNumber = newSock?.user?.id ? newSock.user.id.split(':')[0] : 'Linked';
        botStatus.userName = newSock?.user?.name || 'Admin';
        botStatus.lastConnectedAt = new Date().toISOString();

        console.log(`✅ [conn-manager:gen#${currentGen}] WhatsApp connected as ${newSock?.user?.id}`);
        saveCredsBackupAtomic();

        setTimeout(() => processPendingQueue(), 2000);
        setTimeout(() => refreshGroups(), 4000);
      }

      // ── Connection dropped ──
      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const errorMsg = lastDisconnect?.error?.message || String(lastDisconnect?.error || '');
        const is401 = statusCode === DisconnectReason.loggedOut || statusCode === 401;
        const isConflict = String(errorMsg).toLowerCase().includes('conflict');
        const isRestartRequired = statusCode === DisconnectReason.restartRequired || statusCode === 515;

        botStatus.isConnected = false;
        console.log(`⚠️ [conn-manager:gen#${currentGen}] Closed | code=${statusCode ?? 'unknown'} | ${errorMsg}`);

        // ── User manually disconnected — stop everything ──
        if (userRequestedLogout) {
          botStatus.status = 'idle';
          latestQrDataUrl = null;
          latestQrString = null;
          pairingCode = null;
          userRequestedLogout = false;
          console.log('🚪 [conn-manager] Disconnected by user. Stopped reconnect loop.');
          // Auth files already deleted by the /disconnect endpoint handler
          return;
        }

        // ── WhatsApp revoked our session (logged out from phone) ──
        // Still reconnect — this will show a QR to re-link
        if (is401) {
          console.warn(`🔑 [conn-manager:gen#${currentGen}] Session revoked by WhatsApp (401). Will show QR for re-linking.`);
          botStatus.status = 'scan_required';
          latestQrDataUrl = null;
          latestQrString = null;
          pairingCode = null;
          // Reconnect so Baileys generates a fresh QR — do NOT stop the loop
          scheduleRestart(3000, '401-relink');
          return;
        }

        // ── Stream conflict: another WhatsApp Web session opened ──
        // Wait longer before reconnecting to let the other session settle
        if (isConflict) {
          console.warn(`⚡ [conn-manager:gen#${currentGen}] Stream conflict detected. Waiting 8s then reconnecting...`);
          botStatus.status = 'reconnecting';
          scheduleRestart(8000, 'conflict');
          return;
        }

        // ── Baileys internal restart signal (515) ──
        if (isRestartRequired) {
          botStatus.status = 'reconnecting';
          console.log(`🔄 [conn-manager:gen#${currentGen}] 515 RestartRequired. Reconnecting in 1.5s...`);
          scheduleRestart(1500, '515-restart');
          return;
        }

        // ── All other disconnects: network drop, timeout, server-side kick, etc. ──
        botStatus.status = 'reconnecting';
        scheduleRestart(3000, 'network-drop');
      }
    });

  } catch (err) {
    console.error(`❌ [conn-manager:gen#${currentGen}] Init error: ${err.message}`);
    botStatus.status = 'reconnecting';
    scheduleRestart(5000, 'init-error');
  } finally {
    isStarting = false;
    if (pendingRestartReason && !userRequestedLogout) {
      const q = pendingRestartReason;
      pendingRestartReason = null;
      console.log(`🔄 [conn-manager] Running queued restart: ${q}`);
      scheduleRestart(1000, q);
    }
  }
}

// ── Auto-connect on server boot if saved session exists ──
if (hasSavedSession()) {
  console.log('🔐 [boot] Saved WhatsApp session found — auto-connecting...');
  botStatus.status = 'connecting';
  startWhatsApp('boot-resume');
} else {
  console.log('ℹ️ [boot] No saved session. Use POST /connect or scan QR from UI to connect.');
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. GROUP SYNCHRONIZATION AND DISK CACHE
// ─────────────────────────────────────────────────────────────────────────────

let cachedGroups = [];
let lastGroupsFetchTime = 0;
let isFetchingGroups = false;
let lastGroupFetchAttempt = 0;

try {
  if (fs.existsSync(GROUPS_CACHE_FILE)) {
    cachedGroups = JSON.parse(fs.readFileSync(GROUPS_CACHE_FILE, 'utf8'));
    console.log(`📁 Loaded ${cachedGroups.length} groups from disk cache.`);
  }
} catch (e) {}

async function refreshGroups(force = false) {
  if (!botStatus.isConnected || !sock) return cachedGroups;

  const now = Date.now();
  if (!force && now - lastGroupFetchAttempt < 45000) {
    return cachedGroups;
  }

  if (isFetchingGroups) {
    let waited = 0;
    while (isFetchingGroups && waited < 4000) {
      await new Promise((r) => setTimeout(r, 200));
      waited += 200;
    }
    if (cachedGroups.length > 0) return cachedGroups;
  }

  isFetchingGroups = true;
  lastGroupFetchAttempt = now;

  try {
    console.log('🔄 Querying participating groups from WhatsApp...');
    const groupData = await sock.groupFetchAllParticipating();
    const list = Object.values(groupData).map((g) => ({
      id: g.id,
      name: g.subject,
      size: g.participants?.length || 0,
      creation: g.creation,
      owner: g.owner,
    }));

    if (list.length > 0) {
      cachedGroups = list;
      lastGroupsFetchTime = Date.now();
      try {
        fs.writeFileSync(GROUPS_CACHE_FILE, JSON.stringify(cachedGroups, null, 2));
      } catch (e) {}
      console.log(`✅ Loaded & cached ${cachedGroups.length} WhatsApp groups successfully!`);
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

// Helper: Fetch Group Invite Code with Retry
async function getGroupInviteLinkWithRetry(groupId, maxRetries = 3) {
  if (!sock) return { link: null, error: 'WhatsApp socket is not connected' };
  let lastErr = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await new Promise((r) => setTimeout(r, attempt === 1 ? 600 : 1200));
      const code = await sock.groupInviteCode(groupId);
      if (code) {
        return { link: `https://chat.whatsapp.com/${code}`, error: null };
      }
    } catch (err) {
      lastErr = err;
      console.log(`[invite-code] Attempt ${attempt} failed for ${groupId}:`, err.message);
      if (String(err.message).includes('not-authorized') || String(err?.output?.statusCode) === '401') {
        break;
      }
    }
  }
  return { link: null, error: lastErr?.message || 'Could not retrieve invite code' };
}

// Helper: If participants restricted by WhatsApp privacy, send them the invite link directly via PM
async function notifyPrivacyRestrictedParticipants(groupId, groupName, updateResult, cachedInviteLink = null) {
  if (!sock) return [];
  const restrictedJids = [];

  const results = Array.isArray(updateResult) ? updateResult : [updateResult].filter(Boolean);
  for (const item of results) {
    if (!item) continue;
    const st = String(item.status || item.code || '');
    if (st && st !== '200' && st !== '201') {
      const targetJid = item.jid || item.content?.attrs?.jid || item.attrs?.jid;
      if (targetJid && !restrictedJids.includes(targetJid)) {
        restrictedJids.push(targetJid);
      }
    }
  }

  if (restrictedJids.length > 0) {
    console.log(`[privacy-notice] ${restrictedJids.length} participant(s) blocked by privacy in "${groupName}":`, restrictedJids);
    let link = cachedInviteLink;
    if (!link) {
      const inviteRes = await getGroupInviteLinkWithRetry(groupId);
      link = typeof inviteRes === 'string' ? inviteRes : inviteRes?.link;
    }

    if (link) {
      const inviteMsg = [
        `👋 *Hello! Welcome to LearnMore Technologies.*`,
        ``,
        `You have been enrolled in batch: *${groupName}* 📚`,
        `⚠️ Due to your WhatsApp privacy settings, we could not add you directly to the batch group.`,
        ``,
        `👉 *Please tap this link to join your batch group:*`,
        `${link}`,
        ``,
        `_All daily class schedules and study materials will be shared in this group._ 🚀`,
      ].join('\n');

      for (const jid of restrictedJids) {
        try {
          await sock.sendMessage(jid, { text: inviteMsg });
          console.log(`[privacy-notice] Successfully sent direct invite link to ${jid}`);
        } catch (sendErr) {
          console.error(`[privacy-notice] Failed to send private invite to ${jid}:`, sendErr.message);
        }
      }
    }
  }

  return restrictedJids;
}

// Periodically refresh groups in background every 3 minutes
setInterval(() => {
  if (botStatus.isConnected && sock) {
    refreshGroups();
  }
}, 3 * 60 * 1000);

// Periodically process pending message queue if any messages remained
setInterval(() => {
  if (botStatus.isConnected && sock) {
    processPendingQueue();
  }
}, 30 * 1000);

// ─────────────────────────────────────────────────────────────────────────────
// 5. HTTP API SERVER (PORT 5002)
// ─────────────────────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const MAX_BODY_SIZE = 50 * 1024 * 1024; // 50 MB

  const getBody = () =>
    new Promise((resolve) => {
      const chunks = [];
      let totalSize = 0;
      req.on('data', (chunk) => {
        totalSize += chunk.length;
        if (totalSize > MAX_BODY_SIZE) {
          req.destroy();
          resolve({});
          return;
        }
        chunks.push(chunk);
      });
      req.on('end', () => {
        try {
          const body = Buffer.concat(chunks).toString('utf8');
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
          pendingQueueCount: loadPendingQueue().length,
        },
      })
    );
  }

  // GET /groups
  if (req.method === 'GET' && url.pathname === '/groups') {
    const force = url.searchParams.get('force') === 'true';
    if (botStatus.isConnected && sock) {
      if (force) {
        await refreshGroups(true);
      } else if (cachedGroups.length === 0) {
        await Promise.race([
          refreshGroups(false),
          new Promise((resolve) => setTimeout(resolve, 2000)),
        ]);
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true, groups: cachedGroups }));
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
          error: `WhatsApp Bot is not connected yet (status: ${botStatus.status}). Please link WhatsApp first.`,
        })
      );
    }

    try {
      const jids = (Array.isArray(participants) ? participants : [])
        .map((p) => {
          if (!p) return null;
          let clean = String(p).replace(/[^0-9]/g, '');
          if (!clean || clean.length < 10) return null;
          if (clean.length === 10) clean = '91' + clean;
          if (clean.length === 11 && clean.startsWith('0')) clean = '91' + clean.slice(1);
          return `${clean}@s.whatsapp.net`;
        })
        .filter(Boolean);

      const uniqueJids = Array.from(new Set(jids));
      console.log(`Creating group "${name}" with ${uniqueJids.length} participants:`, uniqueJids);
      let group = null;

      if (uniqueJids.length > 0) {
        try {
          group = await sock.groupCreate(name || 'New Batch Group', uniqueJids);
        } catch (errAll) {
          console.log('groupCreate with all participants failed:', errAll.message);
        }
      }

      if (!group && uniqueJids.length > 0) {
        for (const pJid of uniqueJids) {
          try {
            group = await sock.groupCreate(name || 'New Batch Group', [pJid]);
            console.log(`Successfully created group using participant ${pJid}`);
            break;
          } catch (errSingle) {
            console.log(`groupCreate with participant ${pJid} failed:`, errSingle.message);
          }
        }
      }

      if (!group && uniqueJids.length >= 2) {
        try {
          group = await sock.groupCreate(name || 'New Batch Group', uniqueJids.slice(0, 2));
        } catch (errTwo) {
          console.log('groupCreate with first 2 participants failed:', errTwo.message);
        }
      }

      if (!group) {
        throw new Error('Could not create WhatsApp group with provided participant numbers. Please verify phone numbers.');
      }

      const inviteObj = await getGroupInviteLinkWithRetry(group.id, 3);
      const inviteLink = inviteObj?.link || null;

      let allUpdateResults = [];
      if (uniqueJids.length > 0) {
        try {
          const resAll = await sock.groupParticipantsUpdate(group.id, uniqueJids, 'add');
          allUpdateResults = Array.isArray(resAll) ? resAll : [resAll].filter(Boolean);
        } catch (batchAddErr) {
          for (const pJid of uniqueJids) {
            try {
              const resSingle = await sock.groupParticipantsUpdate(group.id, [pJid], 'add');
              if (Array.isArray(resSingle)) allUpdateResults.push(...resSingle);
              else if (resSingle) allUpdateResults.push(resSingle);
            } catch (singleAddErr) {
              allUpdateResults.push({ jid: pJid, status: '403' });
            }
          }
        }
      }

      const privacyNotified = await notifyPrivacyRestrictedParticipants(group.id, name, allUpdateResults, inviteLink);

      cachedGroups.unshift({
        id: group.id,
        name: name || 'New Batch Group',
        size: uniqueJids.length + 1,
        creation: Math.floor(Date.now() / 1000),
      });
      try {
        fs.writeFileSync(GROUPS_CACHE_FILE, JSON.stringify(cachedGroups, null, 2));
      } catch (e) {}

      refreshGroups(true).catch(() => {});

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(
        JSON.stringify({
          success: true,
          groupId: group.id,
          groupName: name,
          inviteLink: inviteLink || null,
          privacyNotified,
        })
      );
    } catch (err) {
      console.error('Group creation endpoint error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  // POST /group-invite-link
  if (req.method === 'POST' && url.pathname === '/group-invite-link') {
    const body = await getBody();
    let { groupId, groupName } = body;

    console.log(`🔗 /group-invite-link requested. groupId="${groupId || ''}", groupName="${groupName || ''}"`);

    if (!botStatus.isConnected || !sock) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: `WhatsApp Bot is not connected yet (status: ${botStatus.status}).` }));
    }

    const matchGroup = (list, target) => {
      if (!target) return null;
      const cleanTarget = target.toLowerCase().replace(/[^a-z0-9]/g, '');
      return list.find((g) => {
        const gName = (g.name || g.subject || '').toLowerCase().trim();
        const cleanGName = gName.replace(/[^a-z0-9]/g, '');
        return (
          gName === target.toLowerCase() ||
          (cleanGName && cleanTarget && (cleanGName === cleanTarget || cleanGName.includes(cleanTarget) || cleanTarget.includes(cleanGName)))
        );
      });
    };

    if ((!groupId || !groupId.includes('@g.us')) && groupName) {
      let found = matchGroup(cachedGroups, groupName);
      if (!found) {
        try {
          await refreshGroups(true);
          found = matchGroup(cachedGroups, groupName);
        } catch (rfErr) {}
      }
      if (found && found.id) {
        groupId = found.id;
      }
    }

    if (!groupId) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        success: false,
        error: `WhatsApp group "${groupName || 'Unknown'}" was not found on connected WhatsApp account. You can paste the link manually.`
      }));
    }

    try {
      let meta = null;
      let isMember = false;
      let isAdmin = false;
      const botJidRaw = sock.user?.id || '';
      const botPhone = botJidRaw.split(':')[0].replace(/[^0-9]/g, '');
      const botLidRaw = sock.user?.lid || '';
      const botLidClean = botLidRaw.split(':')[0].replace(/[^0-9]/g, '');

      try {
        meta = await sock.groupMetadata(groupId);
        if (meta && Array.isArray(meta.participants)) {
          const selfP = meta.participants.find((p) => {
            const pNum = (p.id || p.jid || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
            const pLid = (p.lid || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
            return (botPhone && pNum === botPhone) || (botLidClean && pLid === botLidClean);
          });
          if (selfP) {
            isMember = true;
            isAdmin = selfP.admin === 'admin' || selfP.admin === 'superadmin';
          }
        }
      } catch (metaErr) {}

      let { link: inviteLink, error: inviteErr } = await getGroupInviteLinkWithRetry(groupId, 2);

      if (!inviteLink && meta && meta.desc) {
        const linkMatch = meta.desc.match(/https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9_-]+/i);
        if (linkMatch) {
          inviteLink = linkMatch[0];
        }
      }

      if (!inviteLink) {
        let errorMsg = '';
        if (meta && !isMember) {
          errorMsg = `WhatsApp authorization error: Connected bot account (+${botPhone}) is NOT a member of group "${meta.subject || groupId}". Please add +${botPhone} to the group and promote it to Admin.`;
        } else if (meta && !isAdmin) {
          errorMsg = `WhatsApp authorization error: Connected bot account (+${botPhone}) is a member, but NOT an Admin in group "${meta.subject || groupId}". Only group admins can retrieve the invite link.`;
        } else {
          errorMsg = `Could not generate WhatsApp invite link: ${inviteErr || 'Unknown error'}. Ensure connected bot (+${botPhone}) is an Admin.`;
        }

        res.writeHead(403, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: false,
          error: errorMsg,
          groupId,
          groupName: meta?.subject || groupName || '',
          connectedPhone: botPhone,
          isMember,
          isAdmin,
        }));
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        success: true,
        groupId,
        groupName: meta?.subject || groupName || '',
        inviteLink,
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  // GET /group-inspect
  if (req.method === 'GET' && url.pathname === '/group-inspect') {
    const targetGid = url.searchParams.get('groupId') || url.searchParams.get('id');
    if (!targetGid) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: 'groupId query parameter is required' }));
    }
    if (!botStatus.isConnected || !sock) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: 'WhatsApp Bot not connected' }));
    }

    try {
      const meta = await sock.groupMetadata(targetGid);
      const botJidRaw = sock.user?.id || '';
      const botPhone = botJidRaw.split(':')[0].replace(/[^0-9]/g, '');
      const botLidRaw = sock.user?.lid || '';
      const botLidClean = botLidRaw.split(':')[0].replace(/[^0-9]/g, '');

      const participants = (meta.participants || []).map((p) => {
        const pNum = (p.id || p.jid || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
        const pLid = (p.lid || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
        const isBot = (botPhone && pNum === botPhone) || (botLidClean && pLid === botLidClean);
        return { id: p.id, phone: pNum, admin: p.admin, isBot };
      });

      const botParticipant = participants.find((p) => p.isBot);
      const isMember = !!botParticipant;
      const isAdmin = botParticipant?.admin === 'admin' || botParticipant?.admin === 'superadmin';

      let testInvite = null;
      let testInviteError = null;
      try {
        const code = await sock.groupInviteCode(targetGid);
        if (code) testInvite = `https://chat.whatsapp.com/${code}`;
      } catch (err) {
        testInviteError = err.message;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(
        JSON.stringify({
          success: true,
          groupId: targetGid,
          subject: meta.subject,
          owner: meta.owner || meta.subjectOwner,
          creation: meta.creation,
          connectedBot: {
            phone: botPhone,
            jid: botJidRaw,
            isMember,
            isAdmin,
            adminRole: botParticipant?.admin || null,
          },
          testInviteResult: { inviteLink: testInvite, error: testInviteError },
          totalParticipants: participants.length,
          admins: participants.filter((p) => p.admin),
        })
      );
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  // POST /group-participants
  if (req.method === 'POST' && url.pathname === '/group-participants') {
    const body = await getBody();
    const { groupId, participants = [], action = 'add', groupName } = body;

    if (!botStatus.isConnected || !sock) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: 'WhatsApp Bot is not connected yet.' }));
    }

    try {
      let resolvedGroupId = groupId;
      if (resolvedGroupId && !resolvedGroupId.includes('@g.us')) {
        const targetClean = resolvedGroupId.toLowerCase().replace(/[^a-z0-9]/g, '');
        const found = cachedGroups.find((g) => {
          const gName = (g.name || g.subject || '').toLowerCase().trim();
          const cleanGName = gName.replace(/[^a-z0-9]/g, '');
          return gName === resolvedGroupId.toLowerCase() || (cleanGName && (cleanGName === targetClean || cleanGName.includes(targetClean) || targetClean.includes(cleanGName)));
        });
        if (found && found.id) resolvedGroupId = found.id;
      }

      const jids = (Array.isArray(participants) ? participants : [participants])
        .map((p) => {
          if (!p) return null;
          let clean = String(p).replace(/[^0-9]/g, '');
          if (!clean || clean.length < 10) return null;
          if (clean.length === 10) clean = '91' + clean;
          if (clean.length === 11 && clean.startsWith('0')) clean = '91' + clean.slice(1);
          return `${clean}@s.whatsapp.net`;
        })
        .filter(Boolean);

      if (!resolvedGroupId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, error: 'groupId is required' }));
      }

      if (jids.length === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, error: 'No valid participant phone numbers provided' }));
      }

      const updateResult = await sock.groupParticipantsUpdate(resolvedGroupId, jids, action === 'remove' ? 'remove' : 'add');
      let privacySent = [];
      if (action === 'add') {
        const groupObj = cachedGroups.find((g) => g.id === resolvedGroupId);
        const resolvedName = groupName || groupObj?.name || groupObj?.subject || 'Batch Group';
        privacySent = await notifyPrivacyRestrictedParticipants(resolvedGroupId, resolvedName, updateResult);
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(
        JSON.stringify({
          success: true,
          groupId: resolvedGroupId,
          action,
          result: updateResult,
          inviteSentToPrivacy: privacySent,
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
    const { target, text, document, fileName, mimeType, image, idempotencyKey, queueIfOffline } = body;

    // Deduplication check: if idempotency key was already delivered, return success immediately
    if (idempotencyKey && sentMessagesCache.has(idempotencyKey)) {
      console.log(`ℹ️ [send-msg] Skipping duplicate message with idempotency key: ${idempotencyKey}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, alreadySent: true, message: 'Message already delivered' }));
    }

    if (!botStatus.isConnected || !sock) {
      if (queueIfOffline && text) {
        const enq = enqueuePendingMessage({ target, text, idempotencyKey });
        res.writeHead(202, { 'Content-Type': 'application/json' });
        return res.end(
          JSON.stringify({
            success: true,
            queued: true,
            idempotencyKey: enq.idempotencyKey,
            message: 'WhatsApp Bot is currently offline/reconnecting. Message queued for automatic delivery upon reconnection.',
          })
        );
      }

      res.writeHead(503, { 'Content-Type': 'application/json' });
      return res.end(
        JSON.stringify({
          success: false,
          error: `WhatsApp Bot is not connected yet (current status: ${botStatus.status}). Please link WhatsApp.`,
        })
      );
    }

    try {
      let jid = String(target || '').trim();
      if (!jid.includes('@')) {
        const targetClean = jid.toLowerCase().replace(/[^a-z0-9]/g, '');
        const found = cachedGroups.find((g) => {
          const gName = (g.name || g.subject || '').toLowerCase().trim();
          const cleanGName = gName.replace(/[^a-z0-9]/g, '');
          return gName === jid.toLowerCase() || (cleanGName && (cleanGName === targetClean || cleanGName.includes(targetClean) || targetClean.includes(cleanGName)));
        });

        if (found && found.id) {
          jid = found.id;
        } else {
          const cleanNum = jid.replace(/[^0-9]/g, '');
          jid = cleanNum.length >= 10 ? `${cleanNum.startsWith('91') ? cleanNum : '91' + cleanNum}@s.whatsapp.net` : `${cleanNum}@s.whatsapp.net`;
        }
      }

      let result;

      if (document) {
        const base64Data = document.includes(',') ? document.split(',')[1] : document;
        const docBuffer = Buffer.from(base64Data, 'base64');
        const resolvedMime = mimeType || 'application/octet-stream';
        const resolvedFileName = fileName || 'document';

        if (text) {
          await sock.sendMessage(jid, { text });
        }
        result = await sock.sendMessage(jid, {
          document: docBuffer,
          fileName: resolvedFileName,
          mimetype: resolvedMime,
        });
      } else if (image) {
        const base64Data = image.includes(',') ? image.split(',')[1] : image;
        const imgBuffer = Buffer.from(base64Data, 'base64');
        result = await sock.sendMessage(jid, {
          image: imgBuffer,
          caption: text || '',
        });
      } else if (text) {
        result = await sock.sendMessage(jid, { text });
      } else {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, error: 'No text, document, or image provided.' }));
      }

      if (idempotencyKey) {
        markMessageSent(idempotencyKey);
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, result }));
    } catch (err) {
      console.error('[send-msg] ERROR:', err.message);

      // If network transient failure on a text message, queue it
      if (queueIfOffline && text) {
        const enq = enqueuePendingMessage({ target, text, idempotencyKey });
        res.writeHead(202, { 'Content-Type': 'application/json' });
        return res.end(
          JSON.stringify({
            success: true,
            queued: true,
            idempotencyKey: enq.idempotencyKey,
            message: 'Transient send failure. Message queued for automatic delivery upon reconnection.',
          })
        );
      }

      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  // POST or GET /reset-auth or /disconnect or /logout
  if (
    (req.method === 'POST' || req.method === 'GET') &&
    (url.pathname === '/reset-auth' || url.pathname === '/disconnect' || url.pathname === '/logout')
  ) {
    try {
      console.log('🔄 Manual Disconnect requested by user.');
      // Stop the reconnect loop FIRST before closing socket
      userRequestedLogout = true;
      pendingRestartReason = null;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (sock) {
        try {
          sock.ev.removeAllListeners();
          sock.ws?.removeAllListeners?.();
          sock.ws?.close();
          sock.end?.();
        } catch (e) {}
        sock = null;
      }

      botStatus = {
        isConnected: false,
        phoneNumber: null,
        userName: null,
        status: 'idle',
        lastConnectedAt: null,
      };
      latestQrDataUrl = null;
      latestQrString = null;
      pairingCode = null;

      // Delete session so next /connect starts fresh with a QR
      try {
        if (fs.existsSync(AUTH_DIR)) fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        if (fs.existsSync(BACKUP_CREDS_FILE)) fs.unlinkSync(BACKUP_CREDS_FILE);
      } catch (e) {}

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Disconnected. Use POST /connect to reconnect.' }));
      return;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  // POST /connect — start/resume WhatsApp connection manually
  if (req.method === 'POST' && url.pathname === '/connect') {
    if (botStatus.isConnected) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, message: 'Already connected.', bot: botStatus }));
    }
    if (isStarting) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, message: 'Connection already in progress...' }));
    }
    console.log('📲 Manual /connect requested.');
    userRequestedLogout = false; // allow reconnects
    reconnectAttempts = 0;
    botStatus.status = 'connecting';
    startWhatsApp('manual-connect');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true, message: 'Connecting to WhatsApp... Poll /status for QR code.' }));
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Route not found' }));
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use by another running bot process!`);
    console.error('Stopping this duplicate instance to prevent WhatsApp session conflicts.');
    process.exit(1);
  } else {
    console.error('Server error:', err);
  }
});

// Process safety
process.on('uncaughtException', (err) => {
  console.error('Bot Uncaught Exception:', err?.message || err);
});
process.on('unhandledRejection', (err) => {
  console.error('Bot Unhandled Rejection:', err?.message || err);
});

process.on('SIGINT', () => {
  console.log('Shutting down WhatsApp bot gracefully...');
  if (sock) {
    try { sock.ws?.close(); } catch (e) {}
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down WhatsApp bot gracefully...');
  if (sock) {
    try { sock.ws?.close(); } catch (e) {}
  }
  process.exit(0);
});

server.listen(PORT, () => {
  console.log(`🚀 Real WhatsApp Baileys Gateway Server running at http://localhost:${PORT}`);
});
