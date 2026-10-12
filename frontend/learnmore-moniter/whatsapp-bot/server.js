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
let userRequestedLogout = false;

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
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000))
      ]);
      if (vRes?.version) version = vRes.version;
    } catch (e) {
      console.log('Using fallback Baileys version due to fast startup timeout.');
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
      keepAliveIntervalMs: 15000,
      generateHighQualityLinkPreview: false,
      retryRequestOptions: {
        maxRetries: 5,
        delayMs: 2000,
      },
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
        userRequestedLogout = false;
        botStatus.isConnected = true;
        botStatus.status = 'connected';
        botStatus.phoneNumber = sock?.user?.id ? sock.user.id.split(':')[0] : 'Linked';
        botStatus.userName = sock?.user?.name || 'Admin';
        botStatus.lastConnectedAt = new Date().toISOString();
        console.log('✅ WhatsApp Connected Successfully! Logged in as:', sock?.user?.id);
        setTimeout(() => {
          refreshGroups();
        }, 4000);
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const errorMsg = lastDisconnect?.error?.message || String(lastDisconnect?.error || '');
        const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401;

        if (userRequestedLogout || isLoggedOut) {
          botStatus.isConnected = false;
          botStatus.status = 'scan_required';
          latestQrDataUrl = null;
          latestQrString = null;
          pairingCode = null;

          if (userRequestedLogout) {
            console.log('🚪 Manual user logout requested. Wiping auth session for fresh QR...');
            userRequestedLogout = false;
          } else {
            console.log(`❌ WhatsApp Logged Out | Status: ${statusCode || 401} | Reason: ${errorMsg}. New QR scan required.`);
          }

          try {
            if (fs.existsSync(AUTH_DIR)) {
              fs.rmSync(AUTH_DIR, { recursive: true, force: true });
            }
          } catch (e) {
            console.warn('Auth directory cleanup error:', e.message);
          }
          scheduleRestart(2000);
        } else {
          // Temporary network failure, 515 restartRequired, PM2/process restart, socket drop
          // Retain saved auth credentials in AUTH_DIR and automatically reconnect
          botStatus.status = botStatus.isConnected ? 'reconnecting' : 'initializing';
          const delayMs = statusCode === DisconnectReason.restartRequired ? 1500 : 3000;
          console.log(`⚠️ WhatsApp connection closed | Status: ${statusCode || 'unknown'} | Reason: ${errorMsg}`);
          console.log(`🔄 Reconnecting automatically using saved session in ${delayMs}ms...`);
          scheduleRestart(delayMs);
        }
      }
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
      // Cooldown for 60 seconds
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
      // If error is not-authorized, retrying won't change WhatsApp server permissions
      if (String(err.message).includes('not-authorized') || String(err?.output?.statusCode) === '401') {
        break;
      }
    }
  }
  return { link: null, error: lastErr?.message || 'Could not retrieve invite code' };
}

// Helper: If participants could not be added due to WhatsApp privacy settings (status != 200/201, e.g. 403),
// send them a direct private WhatsApp message containing the group invite link!
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
    } else {
      console.log(`[privacy-notice] Warning: Could not obtain invite link for group ${groupId} to send to restricted users.`);
    }
  }

  return restrictedJids;
}

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
          error: 'WhatsApp Bot is not connected yet. Please scan QR code first.',
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

      // Deduplicate JIDs
      const uniqueJids = Array.from(new Set(jids));

      console.log(`Creating group "${name}" with ${uniqueJids.length} participants:`, uniqueJids);
      let group = null;

      // Strategy 1: Try creating group with all participants
      if (uniqueJids.length > 0) {
        try {
          group = await sock.groupCreate(name || 'New Batch Group', uniqueJids);
        } catch (errAll) {
          console.log('groupCreate with all participants failed:', errAll.message);
        }
      }

      // Strategy 2: If full group creation failed (e.g. >2 participants or invalid numbers),
      // try creating group with individual participants one by one until success
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

      // Strategy 3: If still no group created and multiple JIDs exist, try first 2 JIDs
      if (!group && uniqueJids.length >= 2) {
        try {
          group = await sock.groupCreate(name || 'New Batch Group', uniqueJids.slice(0, 2));
        } catch (errTwo) {
          console.log('groupCreate with first 2 participants failed:', errTwo.message);
        }
      }

      if (!group) {
        // Fallback: Create group using bot's own session fallback if permitted, or fail gracefully
        const botJid = sock.user?.id ? sock.user.id.split(':')[0] + '@s.whatsapp.net' : null;
        if (botJid && uniqueJids.length > 0) {
          try {
            group = await sock.groupCreate(name || 'New Batch Group', [uniqueJids[0]]);
          } catch {}
        }
      }

      if (!group) {
        throw new Error('Could not create WhatsApp group with provided participant numbers. Please verify phone numbers.');
      }

      // Fetch group invite code with retry
      const inviteObj = await getGroupInviteLinkWithRetry(group.id, 3);
      const inviteLink = inviteObj?.link || null;

      // Add all participants to the group safely
      let allUpdateResults = [];
      if (uniqueJids.length > 0) {
        try {
          const resAll = await sock.groupParticipantsUpdate(group.id, uniqueJids, 'add');
          allUpdateResults = Array.isArray(resAll) ? resAll : [resAll].filter(Boolean);
        } catch (batchAddErr) {
          console.log('Batch add participants failed, adding individually:', batchAddErr.message);
          for (const pJid of uniqueJids) {
            try {
              const resSingle = await sock.groupParticipantsUpdate(group.id, [pJid], 'add');
              if (Array.isArray(resSingle)) allUpdateResults.push(...resSingle);
              else if (resSingle) allUpdateResults.push(resSingle);
            } catch (singleAddErr) {
              console.log(`Failed to add participant ${pJid}:`, singleAddErr.message);
              allUpdateResults.push({ jid: pJid, status: '403' });
            }
          }
        }
      }

      // Check for privacy restrictions (e.g. status 403) and send them the invite link directly via PM
      const privacyNotified = await notifyPrivacyRestrictedParticipants(group.id, name, allUpdateResults, inviteLink);

      // Immediately cache newly created group so it's instantly discoverable
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

  // POST /group-invite-link — Fetch invite link for an existing group by groupId or groupName
  if (req.method === 'POST' && url.pathname === '/group-invite-link') {
    const body = await getBody();
    let { groupId, groupName } = body;

    console.log(`🔗 /group-invite-link requested. groupId="${groupId || ''}", groupName="${groupName || ''}"`);

    if (!botStatus.isConnected || !sock) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: 'WhatsApp Bot is not connected yet. Please check bot connection.' }));
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

    // If groupId is not provided or not ending with @g.us, try to resolve by groupName
    if ((!groupId || !groupId.includes('@g.us')) && groupName) {
      let found = matchGroup(cachedGroups, groupName);

      if (!found) {
        console.log(`[group-invite-link] Group "${groupName}" not found in current cache (${cachedGroups.length} items). Fetching live groups...`);
        try {
          await refreshGroups(true);
          found = matchGroup(cachedGroups, groupName);
        } catch (rfErr) {
          console.warn('[group-invite-link] Live refresh warning:', rfErr.message);
        }
      }

      if (found && found.id) {
        groupId = found.id;
        console.log(`[group-invite-link] Successfully resolved "${groupName}" -> ${groupId} ("${found.name || found.subject}")`);
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
      // 1. Inspect actual group metadata & admin rights
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
      } catch (metaErr) {
        console.warn(`[group-invite-link] groupMetadata notice for ${groupId}:`, metaErr.message);
      }

      // 2. Fetch the invite code with retry
      let { link: inviteLink, error: inviteErr } = await getGroupInviteLinkWithRetry(groupId, 2);

      // Fallback: Check if group description contains an invite link
      if (!inviteLink && meta && meta.desc) {
        const linkMatch = meta.desc.match(/https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9_-]+/i);
        if (linkMatch) {
          inviteLink = linkMatch[0];
          console.log(`[group-invite-link] ✅ Extracted invite link from group description: ${inviteLink}`);
        }
      }

      if (!inviteLink) {
        let errorMsg = '';
        if (meta && !isMember) {
          errorMsg = `WhatsApp authorization error: Connected bot account (+${botPhone}) is NOT a member of group "${meta.subject || groupId}". Please add +${botPhone} to the group and promote it to Admin.`;
        } else if (meta && !isAdmin) {
          errorMsg = `WhatsApp authorization error: Connected bot account (+${botPhone}) is a member, but NOT an Admin in group "${meta.subject || groupId}". In WhatsApp, only group admins can retrieve the group invite link. Please make +${botPhone} a Group Admin in WhatsApp.`;
        } else if (String(inviteErr).includes('not-authorized')) {
          errorMsg = `WhatsApp rejected invite code request (not-authorized). Connected bot account (+${botPhone}) lacks Admin rights in group "${meta?.subject || groupId}". Please promote +${botPhone} to Group Admin.`;
        } else {
          errorMsg = `Could not generate WhatsApp invite link: ${inviteErr || 'Unknown error'}. Ensure connected bot (+${botPhone}) is an Admin.`;
        }

        console.error(`[group-invite-link] ❌ Failed for ${groupId}: ${errorMsg}`);
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
      console.error('group-invite-link error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  // GET /group-inspect?groupId=... — Inspect group metadata, participants and permissions
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
        return {
          id: p.id,
          phone: pNum,
          admin: p.admin,
          isBot,
        };
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
          testInviteResult: {
            inviteLink: testInvite,
            error: testInviteError,
          },
          totalParticipants: participants.length,
          admins: participants.filter((p) => p.admin),
        })
      );
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  // POST /group-participants (Add or Remove group members dynamically)
  if (req.method === 'POST' && url.pathname === '/group-participants') {
    const body = await getBody();
    const { groupId, participants = [], action = 'add', groupName } = body;

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
      let resolvedGroupId = groupId;
      if (resolvedGroupId && !resolvedGroupId.includes('@g.us')) {
        const targetClean = resolvedGroupId.toLowerCase().replace(/[^a-z0-9]/g, '');
        const found = cachedGroups.find((g) => {
          const gName = (g.name || g.subject || '').toLowerCase().trim();
          const cleanGName = gName.replace(/[^a-z0-9]/g, '');
          return gName === resolvedGroupId.toLowerCase() || (cleanGName && (cleanGName === targetClean || cleanGName.includes(targetClean) || targetClean.includes(cleanGName)));
        });
        if (found && found.id) {
          resolvedGroupId = found.id;
        }
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

      console.log(`[group-participants] Action: ${action} on ${resolvedGroupId} for:`, jids);
      const updateResult = await sock.groupParticipantsUpdate(resolvedGroupId, jids, action === 'remove' ? 'remove' : 'add');

      // If adding participants, check if any could not be added due to WhatsApp privacy settings
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
      console.error('[group-participants] Error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  // POST /send-message
  if (req.method === 'POST' && url.pathname === '/send-message') {
    const body = await getBody();
    const { target, text, document, fileName, mimeType, image } = body;

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
      let jid = String(target || '').trim();
      if (!jid.includes('@')) {
        const targetClean = jid.toLowerCase().replace(/[^a-z0-9]/g, '');
        // Search in cached groups
        const found = cachedGroups.find((g) => {
          const gName = (g.name || g.subject || '').toLowerCase().trim();
          const cleanGName = gName.replace(/[^a-z0-9]/g, '');
          return gName === jid.toLowerCase() || (cleanGName && (cleanGName === targetClean || cleanGName.includes(targetClean) || targetClean.includes(cleanGName)));
        });

        if (found && found.id) {
          jid = found.id;
          console.log(`[send-msg] Resolved group name "${target}" to group JID: ${jid}`);
        } else {
          const cleanNum = jid.replace(/[^0-9]/g, '');
          jid = cleanNum.length >= 10 ? `${cleanNum.startsWith('91') ? cleanNum : '91' + cleanNum}@s.whatsapp.net` : `${cleanNum}@s.whatsapp.net`;
        }
      }

      console.log(`[send-msg] jid=${jid} | doc=${!!document} | img=${!!image} | txt=${!!text}`);

      let result;

      if (document) {
        const base64Data = document.includes(',') ? document.split(',')[1] : document;
        const docBuffer = Buffer.from(base64Data, 'base64');
        const resolvedMime = mimeType || 'application/octet-stream';
        const resolvedFileName = fileName || 'document';
        console.log(`[send-msg] Sending doc: ${resolvedFileName} | mime: ${resolvedMime} | size: ${docBuffer.length} bytes`);

        if (text) {
          await sock.sendMessage(jid, { text });
          console.log('[send-msg] Text sent, now sending document...');
        }
        result = await sock.sendMessage(jid, {
          document: docBuffer,
          fileName: resolvedFileName,
          mimetype: resolvedMime,
        });
        console.log(`[send-msg] Document sent OK to ${jid}`);
      } else if (image) {
        const base64Data = image.includes(',') ? image.split(',')[1] : image;
        const imgBuffer = Buffer.from(base64Data, 'base64');
        console.log(`[send-msg] Sending image size: ${imgBuffer.length} bytes`);
        result = await sock.sendMessage(jid, {
          image: imgBuffer,
          caption: text || '',
        });
        console.log(`[send-msg] Image sent OK to ${jid}`);
      } else if (text) {
        result = await sock.sendMessage(jid, { text });
        console.log(`[send-msg] Text sent OK to ${jid}`);
      } else {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, error: 'No text, document, or image provided.' }));
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, result }));
    } catch (err) {
      console.error('[send-msg] ERROR:', err.message, err.stack?.split('\n')[1] || '');
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
      console.log('🔄 Manual Disconnect / reset session requested by user.');
      userRequestedLogout = true;
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
