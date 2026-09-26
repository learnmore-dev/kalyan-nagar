import { Batch, WorkSession, User } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// All Baileys calls go through the Django backend proxy (/api/whatsapp/bot)
// so that HTTPS → loopback (127.0.0.1) CORS blocks are avoided.
// ─────────────────────────────────────────────────────────────────────────────
const DJANGO_WA_PROXY = '/api/whatsapp/bot';

async function callBaileysSend(
  target: string,
  text: string,
  _withLogo = false,
  attachment?: { document?: string; fileName?: string; mimeType?: string; image?: string }
): Promise<boolean> {
  if (!target) return false;
  try {
    const body: Record<string, unknown> = { action: 'send_message', target, text };
    if (attachment?.document) {
      body.document = attachment.document;
      body.fileName = attachment.fileName || 'document';
      body.mimeType = attachment.mimeType || 'application/octet-stream';
    }
    if (attachment?.image) {
      body.image = attachment.image;
    }
    const res = await fetch(DJANGO_WA_PROXY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json();
      return data?.success === true;
    }
  } catch { }
  return false;
}

async function callBaileysCreateGroup(name: string, participants: string[]): Promise<any> {
  try {
    const res = await fetch(DJANGO_WA_PROXY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_group', name, participants }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.success) return data;
    }
  } catch { }
  return null;
}

async function findGroupJidByName(groupName: string): Promise<string | null> {
  if (!groupName) return null;
  const targetLower = groupName.toLowerCase().trim();
  const cleanTarget = targetLower.replace(/[^a-z0-9]/g, '');

  try {
    // 1. Try GET /api/whatsapp/bot first
    let groups: any[] = [];
    const getRes = await fetch(DJANGO_WA_PROXY);
    if (getRes.ok) {
      const data = await getRes.json();
      groups = data.bot?.availableGroups || data.groups || [];
    }

    // 2. If empty, try POST get_groups
    if (!groups.length) {
      const postRes = await fetch(DJANGO_WA_PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_groups' }),
      });
      if (postRes.ok) {
        const data = await postRes.json();
        groups = data.groups || [];
      }
    }

    if (Array.isArray(groups) && groups.length > 0) {
      let match = groups.find((g: any) => {
        const gName = (g.name || g.subject || '').toLowerCase().trim();
        return gName === targetLower;
      });
      if (!match && cleanTarget) {
        match = groups.find((g: any) => {
          const gName = (g.name || g.subject || '').toLowerCase().trim();
          const cleanGName = gName.replace(/[^a-z0-9]/g, '');
          if (!cleanGName) return false;
          return (
            cleanGName === cleanTarget ||
            cleanGName.includes(cleanTarget) ||
            cleanTarget.includes(cleanGName)
          );
        });
      }
      if (match?.id) return match.id;
    }
  } catch { }
  return null;
}



export function formatTimeSafely(timeStr?: string | null): string {
  if (!timeStr) return '--:--';
  const str = String(timeStr).trim();
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  if (str.includes(':')) {
    const parts = str.split(':');
    const hours = parseInt(parts[0], 10);
    const mins = parseInt(parts[1], 10);
    if (!isNaN(hours) && !isNaN(mins)) {
      const today = new Date();
      today.setHours(hours, mins, 0, 0);
      return today.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
  }
  return str;
}

export function formatDateSafely(dateStr?: string | null): string {
  if (!dateStr) {
    return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  const str = String(dateStr).trim();
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  return str;
}

export interface WhatsAppBotState {
  isConnected: boolean;
  phoneNumber: string;
  botName: string;
  batteryLevel?: number;
  lastSyncAt: string;
  totalGroupsCreated: number;
  totalMessagesDelivered: number;
}

class WhatsAppService {
  private botState: WhatsAppBotState = {
    isConnected: true,
    phoneNumber: '+91 98765 43210',
    botName: 'TrainerMonitor Official Bot',
    batteryLevel: 98,
    lastSyncAt: new Date().toISOString(),
    totalGroupsCreated: 5,
    totalMessagesDelivered: 24,
  };

  private attendanceGroup = {
    id: '',
    name: '',
  };

  public async syncAttendanceGroupWithServer() {
    try {
      const res = await fetch('/api/whatsapp/bot');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.bot?.attendanceGroup?.id) {
          this.attendanceGroup = {
            id: data.bot.attendanceGroup.id,
            name: data.bot.attendanceGroup.name || 'Attendance Group',
          };
        }
      }
    } catch {}
    return this.attendanceGroup;
  }

  public getStatus(): WhatsAppBotState {
    this.botState.lastSyncAt = new Date().toISOString();
    return this.botState;
  }

  public connect(): WhatsAppBotState {
    this.botState.isConnected = true;
    this.botState.lastSyncAt = new Date().toISOString();
    return this.botState;
  }

  public disconnect(): WhatsAppBotState {
    this.botState.isConnected = false;
    this.botState.lastSyncAt = new Date().toISOString();
    return this.botState;
  }

  public async getAttendanceGroup() {
    await this.syncAttendanceGroupWithServer();
    return this.attendanceGroup;
  }

  public setAttendanceGroup(groupId: string, groupName: string) {
    this.attendanceGroup = { id: groupId, name: groupName };
    return this.attendanceGroup;
  }

  public async createBatchGroup(params: {
    batchName: string;
    customGroupName?: string;
    trainer?: User | null;
    students?: Array<{ name: string; phone?: string }>;
  }): Promise<{
    groupId: string;
    groupName: string;
    inviteLink: string;
    success: boolean;
    realGroupCreated: boolean;
  }> {
    const groupName = params.customGroupName?.trim() || params.batchName.trim();
    let groupId = '';        // empty = no real group yet
    let inviteLink = '';
    let realGroupCreated = false;

    const participantsList: string[] = [];
    if (params.trainer?.phone) participantsList.push(params.trainer.phone);
    if (params.students && params.students.length > 0) {
      params.students.forEach((s) => {
        if (s.phone && s.phone.replace(/[^0-9]/g, '').length >= 10) {
          participantsList.push(s.phone);
        }
      });
    }

    try {
      const data = await callBaileysCreateGroup(groupName, participantsList);
      if (data && data.success && data.groupId) {
        groupId = data.groupId;
        if (data.inviteLink) inviteLink = data.inviteLink;
        realGroupCreated = true;
      }
    } catch { }

    if (realGroupCreated) {
      this.botState.totalGroupsCreated += 1;
    }

    return {
      groupId,
      groupName,
      inviteLink,
      success: realGroupCreated,
      realGroupCreated,
    };
  }

  public async sendBatchWelcomeMessage(params: {
    batch: Batch;
    trainer?: User | null;
  }): Promise<{ success: boolean; messageText: string }> {
    const { batch, trainer } = params;
    const welcomeMessage = [
      `🎓 *LEARNMORE TECHNOLOGIES*`,
      `🎉 *WELCOME TO NEW BATCH!*`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `📚 *Batch:* ${batch.name}`,
      `👨‍🏫 *Trainer:* ${trainer?.name || 'Faculty'}`,
      `📅 *Start Date:* ${batch.start_date || 'Today'}`,
      `⏰ *Timing:* ${batch.timing || 'Daily Class'}`,
      `📍 *Lab:* ${batch.classroom || 'Institute Campus'}`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `Daily attendance and class topic updates will be shared in this group automatically.`,
    ].join('\n');

    let targetJid = batch.whatsapp_group_id;
    if (!targetJid || !targetJid.includes('@g.us')) {
      const liveGroupJid = await findGroupJidByName(batch.whatsapp_group_name || batch.name);
      if (liveGroupJid) targetJid = liveGroupJid;
    }

    if (targetJid && targetJid.includes('@g.us')) {
      try {
        await callBaileysSend(targetJid, welcomeMessage, false);
      } catch { }
    }

    this.botState.totalMessagesDelivered += 1;
    return { success: true, messageText: welcomeMessage };
  }

  public async sendSessionUpdate(params: {
    batch: Batch;
    session: WorkSession;
    trainer?: User | null;
  }): Promise<{
    success: boolean;
    messageText: string;
    deliveredTo: string;
  }> {
    const { batch, session, trainer } = params;

    let topicsSummary = session.description?.trim() || (session.selected_topics || []).join(', ') || 'Session completed';

    const attendanceGroupMessage = [
      `📖 *Work Status / Class Session Logged*`,
      `👨‍🏫 Trainer: ${trainer?.name || session.trainer_name || 'Trainer'}`,
      `🏷️ Batch: ${batch.name}`,
      `⏱️ Duration: ${session.hours_taken} Hours`,
      `📌 Topic / Work Status:`,
      `${topicsSummary}`,
    ].join('\n');

    let delivered = false;
    if (batch.whatsapp_group_id && batch.whatsapp_group_id.includes('@g.us')) {
      try {
        delivered = await callBaileysSend(batch.whatsapp_group_id, attendanceGroupMessage, false);
      } catch { }
    }

    if (!delivered) {
      const liveGroupJid = await findGroupJidByName(batch.whatsapp_group_name || batch.name);
      if (liveGroupJid) {
        try {
          delivered = await callBaileysSend(liveGroupJid, attendanceGroupMessage, false);
        } catch { }
      }
    }

    this.botState.totalMessagesDelivered += 1;

    return {
      success: true,
      messageText: attendanceGroupMessage,
      deliveredTo: delivered ? (batch.whatsapp_group_name || batch.name) : 'Pending Delivery',
    };
  }

  public async sendTaskUpdate(params: {
    trainerName: string;
    title: string;
    action: 'started' | 'completed';
    category?: string;
    durationMinutes?: number;
    notes?: string;
  }): Promise<void> {
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const formattedTaskMsg = [
      `📋 *Work Task ${params.action === 'started' ? 'Started 🚀' : 'Completed ✅'}*`,
      `👨‍🏫 Trainer: ${params.trainerName}`,
      `📌 Task: ${params.title}`,
      params.durationMinutes ? `⏱️ Duration: ${params.durationMinutes} mins` : null,
      params.notes ? `📝 Notes: ${params.notes}` : null,
      `⏰ Time: ${timeStr}`,
    ].filter(Boolean).join('\n');

    if (this.attendanceGroup.id) {
      try {
        await callBaileysSend(this.attendanceGroup.id, formattedTaskMsg, false);
      } catch { }
    }
  }

  public async sendStatusUpdateNotification(params: {
    trainerName: string;
    status: string;
    currentTaskTitle?: string;
    batchName?: string;
  }): Promise<void> {
    const statusLabel =
      params.status === 'in_class'
        ? 'In Class 👨‍🏫'
        : params.status === 'working_task'
          ? 'Working on Task 💻'
          : params.status === 'break'
            ? 'On Break ☕'
            : 'Idle ⏸️';

    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const msg = [
      `🔄 *Trainer Work Status Updated*`,
      `👨‍🏫 Trainer: ${params.trainerName}`,
      `📌 Status: ${statusLabel}`,
      params.batchName ? `🏷️ Batch: ${params.batchName}` : null,
      params.currentTaskTitle ? `📝 Activity: ${params.currentTaskTitle}` : null,
      `⏰ Time: ${timeStr}`,
    ].filter(Boolean).join('\n');

    if (this.attendanceGroup.id) {
      try {
        await callBaileysSend(this.attendanceGroup.id, msg, false);
      } catch { }
    }
  }

  public async sendBatchAssignment(params: {
    batch: Batch;
    trainer: User;
  }): Promise<void> {
    const formattedAssignmentMsg = [
      `📚 *New Batch Assigned to Trainer*`,
      `👨‍🏫 Trainer: ${params.trainer.name}`,
      `🏷️ Batch: ${params.batch.name}`,
      `📖 Course: ${params.batch.course_name || 'Technical Course'}`,
      `⏱️ Total Hours: ${params.batch.total_hours} Hours`,
      `👥 Total Students: ${params.batch.total_students || 0}`,
      `📅 Start Date: ${params.batch.start_date || 'Immediate'}`,
    ].join('\n');

    let targetJid = params.batch.whatsapp_group_id;
    if (!targetJid || !targetJid.includes('@g.us')) {
      const matched = await findGroupJidByName(params.batch.whatsapp_group_name || params.batch.name);
      if (matched) targetJid = matched;
    }

    if (targetJid && targetJid.includes('@g.us')) {
      try {
        await callBaileysSend(targetJid, formattedAssignmentMsg, false);
      } catch { }
    }
  }



  public async sendAttendanceCheckIn(params: {
    trainer: User;
    checkInTime: string;
    locationName?: string;
    latitude?: string | number | null;
    longitude?: string | number | null;
  }): Promise<{ success: boolean; messageText: string }> {
    await this.syncAttendanceGroupWithServer();
    const { trainer, checkInTime } = params;

    const formattedTime = formatTimeSafely(checkInTime);
    const formattedDate = formatDateSafely(checkInTime);

    const desig = trainer.designation ? ` (${trainer.designation})` : '';
    const checkInMessage = [
      `Trainer Name: ${trainer.name}${desig}`,
      `WhatsApp: ${trainer.phone || '+91 9876543210'}`,
      `Login Time: ${formattedTime}`,
      `Date: ${formattedDate}`,
      params.locationName ? `Location: ${params.locationName}` : null,
    ].filter(Boolean).join('\n');

    let sent = false;
    if (this.attendanceGroup.id) {
      try {
        sent = await callBaileysSend(this.attendanceGroup.id, checkInMessage, false);
      } catch { }
    }

    if (!sent) {
      const fallbackJid = await findGroupJidByName(this.attendanceGroup.name || 'Login');
      if (fallbackJid) {
        try {
          sent = await callBaileysSend(fallbackJid, checkInMessage, false);
        } catch { }
      }
    }

    this.botState.totalMessagesDelivered += 1;
    return { success: true, messageText: checkInMessage };
  }

  public async sendAttendanceCheckOut(params: {
    trainer: User;
    checkInTime: string;
    checkOutTime: string;
    totalMinutesWorked: number;
    locationName?: string;
    latitude?: string | number | null;
    longitude?: string | number | null;
  }): Promise<{ success: boolean; messageText: string; isCompleted9h: boolean }> {
    await this.syncAttendanceGroupWithServer();
    const { trainer, checkInTime, checkOutTime, totalMinutesWorked } = params;

    const inTimeFormatted = formatTimeSafely(checkInTime);
    const outTimeFormatted = formatTimeSafely(checkOutTime);
    const formattedDate = formatDateSafely(checkOutTime);
    const desig = trainer.designation ? ` (${trainer.designation})` : '';

    const h = Math.floor(totalMinutesWorked / 60);
    const m = totalMinutesWorked % 60;

    const checkOutMessage = [
      `Trainer Name: ${trainer.name}${desig}`,
      `WhatsApp: ${trainer.phone || '+91 9876543210'}`,
      `Login Time: ${inTimeFormatted}`,
      `Logout Time: ${outTimeFormatted}`,
      `Date: ${formattedDate}`,
      `Working Hours: ${h}h ${m}m`,
      params.locationName ? `Location: ${params.locationName}` : null,
    ].filter(Boolean).join('\n');

    let sent = false;
    if (this.attendanceGroup.id) {
      try {
        sent = await callBaileysSend(this.attendanceGroup.id, checkOutMessage, false);
      } catch { }
    }

    if (!sent) {
      const fallbackJid = await findGroupJidByName(this.attendanceGroup.name || 'Login');
      if (fallbackJid) {
        try {
          sent = await callBaileysSend(fallbackJid, checkOutMessage, false);
        } catch { }
      }
    }

    this.botState.totalMessagesDelivered += 1;
    return { success: true, messageText: checkOutMessage, isCompleted9h: totalMinutesWorked >= 540 };
  }

  public async sendLeaveNotification(params: {
    trainerName: string;
    phone?: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    reason: string;
    status: string;
  }): Promise<{ success: boolean; messageText: string }> {
    const formattedMessage = [
      `👨‍🏫 *Trainer Name:* ${params.trainerName}`,
      `📱 *Phone:* ${params.phone || '+91 98765 43210'}`,
      `📅 *Date:* ${params.startDate === params.endDate ? params.startDate : `${params.startDate} to ${params.endDate}`}`,
      `🏷️ *Type:* ${params.leaveType.toUpperCase().replace('_', ' ')}`,
      `📝 *Reason:* "${params.reason}"`,
    ].join('\n');

    if (this.attendanceGroup.id) {
      try {
        await callBaileysSend(this.attendanceGroup.id, formattedMessage, false);
      } catch { }
    }

    this.botState.totalMessagesDelivered += 1;
    return { success: true, messageText: formattedMessage };
  }

  public async sendWeekoffOrLeaveToBatchGroups(params: {
    trainer: User;
    leaveType: string;
    startDate: string;
    endDate: string;
    reason: string;
  }): Promise<{ totalNotified: number }> {
    return { totalNotified: 0 };
  }

  public async sendJoinClassNotice(batch: Batch): Promise<{ success: boolean; messageText: string; deliveredTo?: string }> {
    const text = 'hi guys please join meeting';
    let targetJid = batch.whatsapp_group_id;

    if (!targetJid || !targetJid.includes('@g.us')) {
      const liveGroupJid = await findGroupJidByName(batch.whatsapp_group_name || batch.name);
      if (liveGroupJid) targetJid = liveGroupJid;
    }

    if (!targetJid) {
      targetJid = batch.whatsapp_group_name || batch.name;
    }

    let sent = false;
    if (targetJid) {
      try {
        sent = await callBaileysSend(targetJid, text, false);
      } catch {}
    }

    if (sent) {
      this.botState.totalMessagesDelivered += 1;
    }

    return {
      success: sent,
      messageText: text,
      deliveredTo: sent ? (batch.whatsapp_group_name || batch.name) : undefined,
    };
  }

  public async sendBatchTopicAndDocument(params: {
    batch: Batch;
    topicCovered: string;
    date: string;
    attachment?: { document?: string; fileName?: string; mimeType?: string };
  }): Promise<{ success: boolean; deliveredTo?: string; messageText: string }> {
    const formattedMessage = [
      `🏷️ *Batch:* ${params.batch.name}`,
      `📅 *Date:* ${params.date}`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `📌 *Topic Covered Today:*`,
      `${params.topicCovered.trim()}`,
    ].join('\n');

    let targetJid = params.batch.whatsapp_group_id;
    if (!targetJid || !targetJid.includes('@g.us')) {
      const liveGroupJid = await findGroupJidByName(params.batch.whatsapp_group_name || params.batch.name);
      if (liveGroupJid) targetJid = liveGroupJid;
    }

    if (!targetJid) {
      targetJid = params.batch.whatsapp_group_name || params.batch.name;
    }

    let sent = false;
    if (targetJid) {
      try {
        sent = await callBaileysSend(targetJid, formattedMessage, false, params.attachment);
      } catch {}
    }

    if (sent) {
      this.botState.totalMessagesDelivered += 1;
    }

    return {
      success: sent,
      deliveredTo: sent ? (params.batch.whatsapp_group_name || params.batch.name) : undefined,
      messageText: formattedMessage,
    };
  }
}

export const whatsappService = new WhatsAppService();
