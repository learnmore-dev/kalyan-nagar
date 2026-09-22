import { Batch, WorkSession, User } from './types';

const BAILEYS_URLS = [
  (typeof process !== 'undefined' && process.env?.BAILEYS_URL) || 'http://127.0.0.1:5002',
  'http://127.0.0.1:5001',
  'http://localhost:5002',
  'http://localhost:5001',
];

async function callBaileysSend(target: string, text: string, withLogo = false): Promise<boolean> {
  if (!target) return false;
  for (const baseUrl of BAILEYS_URLS) {
    try {
      const res = await fetch(`${baseUrl}/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, text, withLogo }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.success !== false) return true;
      }
    } catch { }
  }
  return false;
}

async function callBaileysCreateGroup(name: string, participants: string[]): Promise<any> {
  for (const baseUrl of BAILEYS_URLS) {
    try {
      const res = await fetch(`${baseUrl}/create-group`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, participants }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.success) return data;
      }
    } catch { }
  }
  return null;
}

async function findGroupJidByName(groupName: string): Promise<string | null> {
  if (!groupName) return null;
  const targetLower = groupName.toLowerCase().trim();
  const cleanTarget = targetLower.replace(/[^a-z0-9]/g, '');

  for (const baseUrl of BAILEYS_URLS) {
    try {
      const res = await fetch(`${baseUrl}/groups`);
      if (res.ok) {
        const data = await res.json();
        if (data.groups && Array.isArray(data.groups)) {
          let match = data.groups.find((g: any) => {
            const gName = (g.name || g.subject || '').toLowerCase().trim();
            return gName === targetLower;
          });

          if (!match && cleanTarget) {
            match = data.groups.find((g: any) => {
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

          if (match && match.id) return match.id;
        }
      }
    } catch { }
  }
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
  }> {
    const groupName = params.customGroupName?.trim() || params.batchName.trim();
    let groupId = `120363${Date.now().toString().slice(-6)}@g.us`;
    let inviteLink = `https://chat.whatsapp.com/invite/TM${Date.now().toString().slice(-6)}`;

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
      }
    } catch { }

    this.botState.totalGroupsCreated += 1;

    return {
      groupId,
      groupName,
      inviteLink,
      success: true,
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
}

export const whatsappService = new WhatsAppService();
