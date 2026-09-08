<script lang="ts">
  // Ported 1:1 from the React StatusBadge's displayStatusFor logic: everyone
  // except Admin sees 'Complete Production' simply as 'Completed' — the
  // Designer/Factory don't need to track the Procurement/Accounting handoff,
  // only Admin does. The underlying status value is untouched; this only
  // changes what text renders.
  import type { Locale } from '$lib/stores/locale';
  import { statusLabel } from '$lib/i18n/dict';

  export let status: string;
  export let userRole: string | undefined = undefined;
  // Optional — only pages that are part of a DASHBOARD (not the material
  // calculator, which is always English) pass this, so the pill translates
  // along with the rest of the screen. Left undefined, this renders exactly
  // as before: the raw English status string, which is what every
  // calculator-context page (designer/[id], admin/projects/[id],
  // procurement/[id]) relies on — none of them import/pass locale.
  export let locale: Locale | undefined = undefined;

  const CLASS_MAP: Record<string, string> = {
    Draft: 'status-draft',
    'Pending Admin': 'status-pending',
    'In Production': 'status-inprod',
    'Complete Production': 'status-completeprod',
    Completed: 'status-completed',
    Rejected: 'status-rejected',
  };

  // Developer sees the same granular detail as Admin — per spec it has
  // full access to anything with tabs/options, same as Admin, everywhere.
  $: rawLabel = status === 'Complete Production' && userRole !== 'admin' && userRole !== 'developer' ? 'Completed' : status;
  $: displayLabel = locale ? statusLabel(locale, rawLabel) : rawLabel;
  $: cls = CLASS_MAP[status] ?? 'status-draft';
</script>

<span class="status-pill {cls}">{displayLabel}</span>
