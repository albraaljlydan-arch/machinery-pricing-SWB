<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { locale } from '$lib/stores/locale';
  import { toast } from '$lib/stores/toast';
  import { formatDate } from '$lib/calc/formatDate';

  interface FollowupTask {
    id: string;
    project_id: string;
    project_name_snapshot: string;
    title: string;
    details: string | null;
    remaining_percent: number;
    created_at: string;
    completed_at: string | null;
  }

  interface TaskUpdate {
    id: string;
    task_id: string;
    deducted_percent: number;
    remaining_after: number;
    notes: string | null;
    work_date: string;
    created_at: string;
    followup_tasks: { title: string; project_name_snapshot: string } | null;
  }

  let tasks: FollowupTask[] = [];
  let updates: TaskUpdate[] = [];
  let loading = true;
  let loadError = '';
  let filter: 'active' | 'all' | 'done' = 'active';
  let savingTask: string | null = null;
  let openTask: string | null = null;
  let deductions: Record<string, number | undefined> = {};
  let notes: Record<string, string> = {};

  const today = new Date().toISOString().slice(0, 10);
  const ar = (arabic: string, english: string) => $locale === 'ar' ? arabic : english;

  async function load() {
    loading = true;
    loadError = '';
    const [taskRes, updateRes] = await Promise.all([
      supabase.from('followup_tasks').select('*').order('project_name_snapshot').order('created_at'),
      supabase.from('followup_task_updates')
        .select('*, followup_tasks(title, project_name_snapshot)')
        .order('created_at', { ascending: false })
        .limit(12),
    ]);

    if (taskRes.error) {
      loadError = ar(
        'تعذّر تحميل المهام. تأكد من تشغيل ملف supabase-followup-tasks.sql في Supabase.',
        'Could not load tasks. Make sure supabase-followup-tasks.sql has been run in Supabase.'
      );
    } else {
      tasks = (taskRes.data || []).map((task) => ({
        ...task,
        remaining_percent: Number(task.remaining_percent),
      }));
    }
    if (!updateRes.error) {
      updates = (updateRes.data || []).map((row: any) => ({
        ...row,
        deducted_percent: Number(row.deducted_percent),
        remaining_after: Number(row.remaining_after),
        followup_tasks: Array.isArray(row.followup_tasks) ? row.followup_tasks[0] : row.followup_tasks,
      }));
    }
    loading = false;
  }

  onMount(load);

  $: visibleTasks = tasks.filter((task) =>
    filter === 'all' || (filter === 'active' ? task.remaining_percent > 0 : task.remaining_percent === 0)
  );
  $: grouped = Array.from(
    visibleTasks.reduce((map, task) => {
      const current = map.get(task.project_id) || { id: task.project_id, name: task.project_name_snapshot, tasks: [] as FollowupTask[] };
      current.tasks.push(task);
      map.set(task.project_id, current);
      return map;
    }, new Map<string, { id: string; name: string; tasks: FollowupTask[] }>())
  ).map(([, group]) => group);
  $: activeTasks = tasks.filter((task) => task.remaining_percent > 0).length;
  $: completedTasks = tasks.filter((task) => task.remaining_percent === 0).length;
  $: activeMachines = new Set(tasks.filter((task) => task.remaining_percent > 0).map((task) => task.project_id)).size;
  $: overallDone = tasks.length
    ? Math.round(tasks.reduce((sum, task) => sum + (100 - task.remaining_percent), 0) / tasks.length)
    : 0;
  $: todayDone = updates
    .filter((update) => update.work_date === today)
    .reduce((sum, update) => sum + update.deducted_percent, 0);

  function setDeduction(taskId: string, value: string) {
    deductions = { ...deductions, [taskId]: value === '' ? undefined : Number(value) };
  }

  function setNote(taskId: string, value: string) {
    notes = { ...notes, [taskId]: value };
  }

  async function deduct(task: FollowupTask) {
    const amount = Number(deductions[task.id]);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.notify(ar('أدخل نسبة خصم أكبر من صفر.', 'Enter a deduction greater than zero.'), 'error');
      return;
    }
    if (amount > task.remaining_percent) {
      toast.notify(ar(`المتبقي في المهمة ${task.remaining_percent}% فقط.`, `Only ${task.remaining_percent}% remains in this task.`), 'error');
      return;
    }

    savingTask = task.id;
    const { error } = await supabase.rpc('deduct_followup_task', {
      p_task_id: task.id,
      p_percent: amount,
      p_notes: notes[task.id]?.trim() || null,
    });
    savingTask = null;

    if (error) {
      toast.notify(ar('لم يتم حفظ الخصم: ', 'Could not save deduction: ') + error.message, 'error');
      return;
    }

    toast.notify(
      amount === task.remaining_percent
        ? ar('تم إنجاز المهمة بالكامل ✓', 'Task completed ✓')
        : ar(`تم خصم ${amount}% من المهمة.`, `${amount}% deducted from the task.`),
      'success'
    );
    deductions = { ...deductions, [task.id]: undefined };
    notes = { ...notes, [task.id]: '' };
    openTask = null;
    await load();
  }
</script>

<svelte:head><title>{ar('مهام المتابعة', 'Follow-up tasks')}</title></svelte:head>

<section class="hero">
  <div>
    <span class="eyebrow">{ar('مساحة عمل مهندس المتابعة', 'FOLLOW-UP WORKSPACE')}</span>
    <h2>{ar('مهام التصنيع اليومية', 'Daily manufacturing tasks')}</h2>
    <p>{ar('كل مهمة تبدأ برصيد 100%. سجّل ما أُنجز اليوم ليُخصم مباشرة من المتبقي.', 'Every task starts at 100%. Log today’s work to deduct it from the remaining balance.')}</p>
  </div>
  <div class="hero-ring" style="--progress:{overallDone}">
    <strong class="mono">{overallDone}%</strong>
    <span>{ar('منجز كليًا', 'overall done')}</span>
  </div>
</section>

<section class="stats">
  <article>
    <span class="stat-icon blue">▦</span>
    <div><small>{ar('ماكينات نشطة', 'Active machines')}</small><strong class="mono">{activeMachines}</strong></div>
  </article>
  <article>
    <span class="stat-icon amber">◷</span>
    <div><small>{ar('مهام متبقية', 'Remaining tasks')}</small><strong class="mono">{activeTasks}</strong></div>
  </article>
  <article>
    <span class="stat-icon green">↓</span>
    <div><small>{ar('إنجاز اليوم', 'Completed today')}</small><strong class="mono">{todayDone}%</strong></div>
  </article>
  <article>
    <span class="stat-icon violet">✓</span>
    <div><small>{ar('مهام مكتملة', 'Completed tasks')}</small><strong class="mono">{completedTasks}</strong></div>
  </article>
</section>

<div class="toolbar">
  <div>
    <h3>{ar('قائمة مهامي', 'My task list')}</h3>
    <p>{ar('المهام تصل تلقائيًا عند بدء المصنع بتنفيذ الماكينة.', 'Tasks arrive automatically when the factory starts the machine.')}</p>
  </div>
  <div class="tabs" role="tablist">
    <button class:active={filter === 'active'} on:click={() => filter = 'active'}>{ar('قيد العمل', 'In progress')} <b>{activeTasks}</b></button>
    <button class:active={filter === 'all'} on:click={() => filter = 'all'}>{ar('الكل', 'All')} <b>{tasks.length}</b></button>
    <button class:active={filter === 'done'} on:click={() => filter = 'done'}>{ar('مكتملة', 'Done')} <b>{completedTasks}</b></button>
  </div>
</div>

{#if loading}
  <div class="state-card">{ar('جارٍ تحميل المهام…', 'Loading tasks…')}</div>
{:else if loadError}
  <div class="state-card error"><b>{ar('إعداد قاعدة البيانات مطلوب', 'Database setup required')}</b><span>{loadError}</span></div>
{:else if grouped.length === 0}
  <div class="state-card empty">
    <span class="empty-icon">✓</span>
    <b>{filter === 'active' ? ar('لا توجد مهام متبقية', 'No remaining tasks') : ar('لا توجد مهام هنا', 'No tasks here')}</b>
    <span>{ar('ستظهر المهام تلقائيًا عند بدء تصنيع ماكينة جديدة.', 'Tasks will appear automatically when a new machine enters production.')}</span>
  </div>
{:else}
  <div class="machine-list">
    {#each grouped as machine (machine.id)}
      {@const machineDone = Math.round(machine.tasks.reduce((sum, task) => sum + 100 - task.remaining_percent, 0) / machine.tasks.length)}
      <section class="machine-card">
        <header>
          <div class="machine-mark">M</div>
          <div class="machine-title">
            <small>{ar('الماكينة', 'MACHINE')}</small>
            <h3>{machine.name}</h3>
          </div>
          <div class="machine-progress">
            <div><span>{ar('إنجاز المهام', 'Task progress')}</span><b class="mono">{machineDone}%</b></div>
            <div class="track"><i style="width:{machineDone}%"></i></div>
          </div>
        </header>

        <div class="tasks">
          {#each machine.tasks as task (task.id)}
            {@const done = 100 - task.remaining_percent}
            <article class:completed={task.remaining_percent === 0} class="task">
              <div class="task-main">
                <span class="check">{task.remaining_percent === 0 ? '✓' : ''}</span>
                <div class="task-copy">
                  <h4>{task.title}</h4>
                  {#if task.details}<p>{task.details}</p>{/if}
                  <div class="task-track"><i style="width:{done}%"></i></div>
                </div>
                <div class="balance">
                  <small>{ar('المتبقي', 'REMAINING')}</small>
                  <strong class="mono">{task.remaining_percent}%</strong>
                  <span>{ar(`أُنجز ${done}%`, `${done}% done`)}</span>
                </div>
                {#if task.remaining_percent > 0}
                  <button class="deduct-open" on:click={() => openTask = openTask === task.id ? null : task.id}>
                    <span>−</span>{ar('تسجيل إنجاز', 'Log progress')}
                  </button>
                {:else}
                  <span class="done-pill">{ar('مكتملة', 'Completed')}</span>
                {/if}
              </div>

              {#if openTask === task.id}
                <div class="deduct-form">
                  <div class="form-heading">
                    <div><b>{ar('خصم إنجاز اليوم', 'Deduct today’s progress')}</b><span>{ar(`يمكنك الخصم حتى ${task.remaining_percent}%`, `You can deduct up to ${task.remaining_percent}%`)}</span></div>
                    <button aria-label={ar('إغلاق', 'Close')} on:click={() => openTask = null}>×</button>
                  </div>
                  <div class="form-fields">
                    <label>
                      <span>{ar('نسبة الإنجاز اليوم', 'Progress today')}</span>
                      <div class="percent-input">
                        <input type="number" min="0.01" max={task.remaining_percent} step="0.01"
                          value={deductions[task.id] ?? ''}
                          on:input={(event) => setDeduction(task.id, event.currentTarget.value)}
                          placeholder="0" />
                        <b>%</b>
                      </div>
                    </label>
                    <label class="note-field">
                      <span>{ar('ملاحظة (اختياري)', 'Note (optional)')}</span>
                      <input value={notes[task.id] ?? ''} on:input={(event) => setNote(task.id, event.currentTarget.value)}
                        placeholder={ar('شو تم إنجازه اليوم؟', 'What was completed today?')} />
                    </label>
                    <button class="save" disabled={savingTask === task.id} on:click={() => deduct(task)}>
                      {savingTask === task.id ? ar('جارٍ الحفظ…', 'Saving…') : ar('تأكيد الخصم', 'Confirm deduction')}
                    </button>
                  </div>
                </div>
              {/if}
            </article>
          {/each}
        </div>
      </section>
    {/each}
  </div>
{/if}

<section class="history">
  <div class="section-head">
    <div><h3>{ar('آخر الإنجازات المسجلة', 'Recent progress')}</h3><p>{ar('سجل واضح لكل خصم تم على المهام.', 'A clear log of every task deduction.')}</p></div>
    <span>{updates.length}</span>
  </div>
  {#if updates.length === 0}
    <div class="history-empty">{ar('لا يوجد إنجاز مسجّل بعد.', 'No progress has been logged yet.')}</div>
  {:else}
    <div class="history-list">
      {#each updates as update (update.id)}
        <div class="history-row">
          <span class="history-dot">−{update.deducted_percent}%</span>
          <div>
            <b>{update.followup_tasks?.title || '—'}</b>
            <small>{update.followup_tasks?.project_name_snapshot || '—'} · {formatDate(update.work_date)}</small>
          </div>
          {#if update.notes}<p>{update.notes}</p>{/if}
          <span class="remaining mono">{ar('المتبقي', 'Remaining')} {update.remaining_after}%</span>
        </div>
      {/each}
    </div>
  {/if}
</section>

<style>
  :global(.app-content) { background: #f6f8fb; }
  .hero {
    display: flex; align-items: center; justify-content: space-between; gap: 24px;
    padding: 25px 28px; margin-bottom: 16px; border-radius: 16px; color: #fff;
    background: linear-gradient(125deg, #102a43 0%, #173f67 58%, #176b72 100%);
    box-shadow: 0 12px 32px rgba(16,42,67,.14);
  }
  .eyebrow { color: #78d7d0; font-size: 10px; letter-spacing: 1.6px; font-weight: 800; }
  .hero h2 { margin: 6px 0; font-size: 24px; }
  .hero p { margin: 0; color: #c8d8e7; font-size: 13px; }
  .hero-ring {
    --p: calc(var(--progress) * 1%); flex: 0 0 92px; width: 92px; height: 92px;
    border-radius: 50%; display: grid; place-content: center; text-align: center;
    background: radial-gradient(circle 35px, #173f67 97%, transparent 100%), conic-gradient(#4fd1c5 var(--p), rgba(255,255,255,.15) 0);
  }
  .hero-ring strong { font-size: 21px; }
  .hero-ring span { color: #b9cedd; font-size: 9px; }

  .stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 22px; }
  .stats article {
    display: flex; align-items: center; gap: 12px; padding: 15px; background: var(--card);
    border: 1px solid var(--border); border-radius: 12px; box-shadow: 0 3px 12px rgba(20,40,70,.04);
  }
  .stat-icon { width: 39px; height: 39px; display: grid; place-items: center; border-radius: 10px; font-weight: 800; font-size: 18px; }
  .stat-icon.blue { background:#e7f0fb; color:#27639e; } .stat-icon.amber { background:#fff1d6; color:#a76700; }
  .stat-icon.green { background:#dff5ec; color:#16815f; } .stat-icon.violet { background:#eee8ff; color:#7151b8; }
  .stats article div { display:flex; flex-direction:column; gap:2px; }
  .stats small { font-size: 11px; color: var(--ink-soft); } .stats strong { font-size: 20px; color: var(--ink); }

  .toolbar { display:flex; align-items:end; justify-content:space-between; gap:16px; margin:0 2px 12px; }
  .toolbar h3,.section-head h3 { margin:0 0 3px; font-size:16px; } .toolbar p,.section-head p { margin:0; font-size:11.5px; color:var(--ink-soft); }
  .tabs { display:flex; padding:3px; border:1px solid var(--border); background:var(--card); border-radius:9px; }
  .tabs button { border:0; background:transparent; color:var(--ink-soft); padding:7px 11px; border-radius:6px; font:600 11px inherit; cursor:pointer; }
  .tabs button.active { background:#173f67; color:white; box-shadow:0 2px 7px rgba(23,63,103,.2); }
  .tabs b { margin-inline-start:4px; opacity:.7; }

  .machine-list { display:flex; flex-direction:column; gap:14px; }
  .machine-card { background:var(--card); border:1px solid var(--border); border-radius:14px; overflow:hidden; box-shadow:0 4px 16px rgba(20,40,70,.05); }
  .machine-card>header { display:flex; align-items:center; gap:12px; padding:14px 17px; border-bottom:1px solid var(--border); background:linear-gradient(90deg,#fff,#fafcff); }
  .machine-mark { width:38px; height:38px; display:grid; place-items:center; border-radius:9px; color:#fff; background:#173f67; font-weight:800; }
  .machine-title { flex:1; } .machine-title small { color:#8ba0b5; font-size:8.5px; letter-spacing:1px; font-weight:800; }
  .machine-title h3 { margin:2px 0 0; font-size:14px; }
  .machine-progress { width:210px; }
  .machine-progress>div:first-child { display:flex; justify-content:space-between; font-size:10px; color:var(--ink-soft); margin-bottom:5px; }
  .machine-progress b { color:#176b72; }
  .track,.task-track { height:5px; overflow:hidden; border-radius:8px; background:#e8edf2; }
  .track i,.task-track i { display:block; height:100%; border-radius:inherit; background:linear-gradient(90deg,#1c8b82,#4fc2b1); transition:width .3s; }

  .tasks { padding:0 17px; }
  .task { border-bottom:1px solid var(--border); } .task:last-child { border-bottom:0; }
  .task-main { display:flex; align-items:center; gap:12px; padding:15px 0; }
  .check { width:22px; height:22px; flex:0 0 22px; border:2px solid #cbd5df; border-radius:50%; display:grid; place-items:center; color:white; font-size:12px; }
  .completed .check { background:#25a276; border-color:#25a276; }
  .task-copy { flex:1; min-width:0; } .task-copy h4 { margin:0; font-size:13px; } .task-copy p { margin:3px 0 0; color:var(--ink-soft); font-size:10.5px; }
  .task-track { margin-top:8px; max-width:420px; height:4px; }
  .balance { min-width:82px; text-align:center; display:flex; flex-direction:column; }
  .balance small { color:#8ba0b5; font-size:8px; font-weight:800; letter-spacing:.7px; }
  .balance strong { color:#c27a0a; font-size:16px; } .completed .balance strong { color:#219069; }
  .balance span { color:var(--ink-soft); font-size:9px; }
  .deduct-open { border:0; border-radius:8px; background:#173f67; color:#fff; padding:8px 12px; font:700 11px inherit; cursor:pointer; }
  .deduct-open span { margin-inline-end:5px; font-size:15px; }
  .done-pill { color:#177558; background:#e2f5ed; padding:5px 10px; border-radius:20px; font-size:10px; font-weight:800; }

  .deduct-form { margin:0 -17px; padding:14px 18px 16px; background:#f3f7fa; border-top:1px dashed #c9d5df; }
  .form-heading { display:flex; justify-content:space-between; align-items:start; margin-bottom:10px; }
  .form-heading div { display:flex; flex-direction:column; } .form-heading b { font-size:12px; } .form-heading span { font-size:10px; color:var(--ink-soft); margin-top:2px; }
  .form-heading button { border:0; background:transparent; color:var(--ink-soft); font-size:20px; cursor:pointer; }
  .form-fields { display:grid; grid-template-columns:150px 1fr auto; gap:10px; align-items:end; }
  .form-fields label { display:flex; flex-direction:column; gap:5px; font-size:10px; color:var(--ink-soft); }
  .form-fields input { width:100%; box-sizing:border-box; border:1px solid #cbd6df; background:white; color:var(--ink); border-radius:7px; padding:8px 10px; font:12px inherit; outline:none; }
  .form-fields input:focus { border-color:#2a7f93; box-shadow:0 0 0 3px rgba(42,127,147,.1); }
  .percent-input { position:relative; } .percent-input input { padding-inline-end:30px; } .percent-input b { position:absolute; inset-inline-end:10px; top:8px; color:#8093a6; }
  .save { border:0; border-radius:7px; background:#19836f; color:white; padding:9px 16px; font:700 11px inherit; cursor:pointer; }
  .save:disabled { opacity:.55; cursor:wait; }

  .history { margin-top:18px; background:var(--card); border:1px solid var(--border); border-radius:14px; overflow:hidden; }
  .section-head { display:flex; justify-content:space-between; align-items:center; padding:15px 18px; border-bottom:1px solid var(--border); }
  .section-head>span { background:#eef2f6; color:var(--ink-soft); border-radius:20px; min-width:27px; text-align:center; padding:4px; font-size:10px; }
  .history-list { padding:0 18px; } .history-row { display:flex; align-items:center; gap:12px; padding:12px 0; border-bottom:1px solid var(--border); }
  .history-row:last-child { border:0; } .history-dot { min-width:47px; text-align:center; padding:5px; border-radius:7px; background:#e4f5ef; color:#17815f; font-size:10px; font-weight:800; }
  .history-row>div { min-width:150px; display:flex; flex-direction:column; } .history-row b { font-size:11.5px; } .history-row small { color:var(--ink-soft); font-size:9.5px; }
  .history-row p { flex:1; margin:0; color:var(--ink-soft); font-size:10.5px; } .remaining { font-size:10px; color:#8a6517; }
  .history-empty { padding:24px; text-align:center; color:var(--ink-soft); font-size:12px; }

  .state-card { padding:35px; background:var(--card); border:1px solid var(--border); border-radius:14px; text-align:center; color:var(--ink-soft); font-size:13px; }
  .state-card.error { background:#fff7f5; border-color:#f1c9c0; color:#9a3c2b; display:flex; flex-direction:column; gap:5px; }
  .state-card.empty { display:flex; flex-direction:column; align-items:center; gap:6px; }
  .empty-icon { width:40px; height:40px; display:grid; place-items:center; border-radius:50%; background:#e2f5ed; color:#16815f; font-size:20px; }
  .state-card.empty b { color:var(--ink); }

  @media (max-width: 850px) {
    .stats { grid-template-columns:repeat(2,1fr); }
    .machine-progress { width:150px; }
    .form-fields { grid-template-columns:120px 1fr; } .save { grid-column:1/-1; }
  }
  @media (max-width: 600px) {
    .hero { padding:20px; } .hero-ring { display:none; }
    .stats { grid-template-columns:1fr 1fr; } .stats article { padding:11px; }
    .toolbar { align-items:stretch; flex-direction:column; } .tabs { align-self:stretch; } .tabs button { flex:1; }
    .machine-card>header { flex-wrap:wrap; } .machine-progress { width:100%; }
    .task-main { flex-wrap:wrap; } .task-copy { min-width:calc(100% - 40px); }
    .balance { margin-inline-start:34px; text-align:start; } .deduct-open { margin-inline-start:auto; }
    .form-fields { grid-template-columns:1fr; } .history-row p { display:none; }
  }
</style>
