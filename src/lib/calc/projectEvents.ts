import { supabase } from '$lib/supabaseClient';
import type { ProjectEvent, ProjectEventType } from '$lib/types';

/** Appends one row to the project's audit trail. Deliberately fire-and-forget
 *  and never throws: a status change that already succeeded must not be
 *  reported as failed just because its log entry didn't land, and the caller
 *  has already navigated away by the time this resolves. */
export async function logProjectEvent(
  projectId: string | undefined,
  eventType: ProjectEventType,
  actorId: string | undefined | null,
  note?: string
): Promise<void> {
  if (!projectId || !actorId) return;
  await supabase.from('project_events').insert({ project_id: projectId, event_type: eventType, actor_id: actorId, note: note ?? null });
}

/** Every event for one project, oldest first — the order the timeline reads in. */
export async function loadProjectTimeline(projectId: string): Promise<ProjectEvent[]> {
  const { data, error } = await supabase.from('project_events').select('*').eq('project_id', projectId).order('created_at', { ascending: true });
  return error ? [] : ((data as ProjectEvent[]) ?? []);
}

export interface DesignerPerformance {
  /** Projects this designer created. */
  created: number;
  /** Times they handed a project to Admin (a resubmission counts again). */
  submitted: number;
  approved: number;
  rejected: number;
  /** Median-free simple average, in days, from a project's 'created' event to
   *  its FIRST 'submitted' event. Only projects that were actually submitted
   *  count — an unfinished draft isn't a slow delivery, it's an open one. */
  avgDaysToDeliver: number | null;
  /** rejected / submitted, as a percentage. */
  rejectionRate: number;
}

/** Rolls a designer's raw event rows up into the figures Admin looks at.
 *  Kept here rather than in the page so the same numbers can't drift between
 *  the person page and anywhere else that shows them later. */
export function summarizeDesignerPerformance(events: ProjectEvent[]): DesignerPerformance {
  const created = events.filter((e) => e.event_type === 'created');
  const submitted = events.filter((e) => e.event_type === 'submitted');
  const approved = events.filter((e) => e.event_type === 'approved');
  const rejected = events.filter((e) => e.event_type === 'rejected');

  const createdAtByProject = new Map(created.map((e) => [e.project_id, e.created_at]));
  const firstSubmitByProject = new Map<string, string>();
  for (const e of submitted) {
    const existing = firstSubmitByProject.get(e.project_id);
    if (!existing || e.created_at < existing) firstSubmitByProject.set(e.project_id, e.created_at);
  }

  const deliveryDays: number[] = [];
  for (const [projectId, submittedAt] of firstSubmitByProject) {
    const createdAt = createdAtByProject.get(projectId);
    if (!createdAt) continue;
    const days = (new Date(submittedAt).getTime() - new Date(createdAt).getTime()) / 86_400_000;
    if (days >= 0) deliveryDays.push(days);
  }

  return {
    created: created.length,
    submitted: submitted.length,
    approved: approved.length,
    rejected: rejected.length,
    avgDaysToDeliver: deliveryDays.length ? deliveryDays.reduce((sum, d) => sum + d, 0) / deliveryDays.length : null,
    rejectionRate: submitted.length ? Math.round((rejected.length / submitted.length) * 100) : 0,
  };
}
