import { Batch } from './types';

export interface TrainerDemoMeeting {
  id: string | number;
  enquiry_id?: string | null;
  title: string;
  meeting_link: string;
  scheduled_time: string;
  notes?: string;
  trainer_name?: string;
}

export function resolveBranchName(rawBranch?: string | null, fallback = 'N/A'): string {
  if (!rawBranch) return fallback;
  const clean = rawBranch.trim();
  if (!clean) return fallback;
  return clean;
}

function batchToDemoMeeting(batch: Batch, trainerName: string): TrainerDemoMeeting {
  const branchName =
    batch.branch ||
    (batch as any).branch_name ||
    (batch as any).location ||
    (batch as any).center ||
    (batch as any).institute_branch ||
    'N/A';

  const notes = [
    `Student Name: ${batch.student_name || batch.name.replace(/^DEMO-/, '').split('-')[0] || 'Student'}`,
    `Course: ${batch.course_name || 'General'}`,
    `Status: ${batch.demo_status || 'Scheduled'}`,
    `Training Mode: ${(batch.name || '').toLowerCase().includes('onl') ? 'Online' : 'Offline'}`,
    `Branch: ${branchName}`,
    'Assign Counsellor: Admin',
    `Demo Status: ${batch.demo_status || 'Scheduled'}`,
  ].join('\n');

  return {
    id: batch.id,
    enquiry_id: batch.enquiry_id,
    title: batch.name || `Demo: ${batch.student_name || 'Student'}`,
    meeting_link: batch.demo_link || '',
    scheduled_time: batch.start_date
      ? `${batch.start_date} ${batch.timing || ''}`.trim()
      : new Date().toISOString(),
    notes,
    trainer_name: batch.trainer_name || trainerName,
  };
}

function getEnquiryId(meeting: TrainerDemoMeeting): string {
  const noteMatch = meeting.notes?.match(/^enquiry_id:(.+)$/m);
  return String(meeting.enquiry_id || noteMatch?.[1] || '').trim();
}

export function mergeTrainerDemoRecords(
  meetings: TrainerDemoMeeting[],
  batches: Batch[],
  trainerName: string,
): TrainerDemoMeeting[] {
  const merged = [...meetings];
  const meetingIndexByEnquiry = new Map<string, number>();

  merged.forEach((meeting, index) => {
    const enquiryId = getEnquiryId(meeting);
    if (enquiryId) meetingIndexByEnquiry.set(enquiryId, index);
  });

  batches.filter((batch) => batch.batch_type === 'demo').forEach((batch) => {
    const demoBatch = batchToDemoMeeting(batch, trainerName);
    const enquiryId = getEnquiryId(demoBatch);
    const existingIndex = enquiryId ? meetingIndexByEnquiry.get(enquiryId) : undefined;

    if (existingIndex === undefined) {
      merged.push(demoBatch);
      if (enquiryId) meetingIndexByEnquiry.set(enquiryId, merged.length - 1);
      return;
    }

    const existingMeeting = merged[existingIndex];
    merged[existingIndex] = {
      ...demoBatch,
      ...existingMeeting,
      enquiry_id: enquiryId,
      meeting_link: existingMeeting.meeting_link || demoBatch.meeting_link,
      scheduled_time: existingMeeting.scheduled_time || demoBatch.scheduled_time,
      notes: existingMeeting.notes || demoBatch.notes,
      trainer_name: existingMeeting.trainer_name || demoBatch.trainer_name,
    };
  });

  return merged;
}