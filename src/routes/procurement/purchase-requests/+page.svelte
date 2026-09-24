<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { locale } from '$lib/stores/locale';
  import { toast } from '$lib/stores/toast';
  import { subscribeToTable } from '$lib/realtime';
  import { formatDate } from '$lib/calc/formatDate';
  import { formatTaskQuantity, procurementCategoryLabel, procurementProgress, procurementTaskDetails, procurementTaskStatus, procurementTaskTitle } from '$lib/calc/procurementTasks';
  import type { ProcurementTask, ProcurementTaskCategory, ProcurementTaskUpdate } from '$lib/types';

  let tasks: ProcurementTask[] = [];
  let updates: ProcurementTaskUpdate[] = [];
  let loading = true;
  let loadError = false;
  let view: 'machine' | 'supplier' = 'machine';
  let selected: ProcurementTask | null = null;
  let saving = false;
  let receiving: string | null = null;
  let quantity: number | undefined;
  let supplier = '';
  let unitPrice: number | undefined;
  let arrivalDate = '';
  let receivedNow = false;
  let notes = '';

  const today = new Date().toISOString().slice(0, 10);
  const categoryOrder: ProcurementTaskCategory[] = ['sheets', 'profiles', 'mills', 'pipes', 'squares', 'orders'];
  // Reactive so every label re-renders when the language is switched; a
  // plain const kept the first language until the page was reloaded.
  $: tr = (ar: string, en: string) => $locale === 'ar' ? ar : en;

  async function load() {
    loading = tasks.length === 0;
    loadError = false;
    const [taskRes, updateRes] = await Promise.all([
      supabase.from('procurement_tasks').select('*').order('project_name_snapshot').order('created_at'),
      supabase.from('procurement_task_updates').select('*').order('created_at', { ascending: false }).limit(200),
    ]);
    if (taskRes.error) loadError = true;
    else tasks = (taskRes.data || []).map((row: any) => ({ ...row, source_data: row.source_data || {}, total_quantity: Number(row.total_quantity), purchased_quantity: Number(row.purchased_quantity), received_quantity: Number(row.received_quantity) }));
    if (!updateRes.error) updates = (updateRes.data || []).map((row: any) => ({ ...row, quantity: Number(row.quantity), unit_price: row.unit_price === null ? null : Number(row.unit_price) }));
    loading = false;
  }

  let offTasks: (() => void) | null = null;
  let offUpdates: (() => void) | null = null;
  onMount(() => {
    load();
    offTasks = subscribeToTable('procurement_tasks', load);
    offUpdates = subscribeToTable('procurement_task_updates', load);
  });
  onDestroy(() => { offTasks?.(); offUpdates?.(); });

  $: machines = Array.from(tasks.reduce((map, task) => {
    const item = map.get(task.project_id) || { id: task.project_id, name: task.project_name_snapshot, tasks: [] as ProcurementTask[] };
    item.tasks.push(task); map.set(task.project_id, item); return map;
  }, new Map<string, { id: string; name: string; tasks: ProcurementTask[] }>())).map(([, item]) => item);

  $: suppliers = Array.from(updates.reduce((map, update) => {
    const rows = map.get(update.supplier) || [] as ProcurementTaskUpdate[];
    rows.push(update); map.set(update.supplier, rows); return map;
  }, new Map<string, ProcurementTaskUpdate[]>())).map(([name, rows]) => ({
    name, rows,
    projects: new Set(rows.map((row) => row.project_id)).size,
    items: new Set(rows.map((row) => row.task_id)).size,
    total: rows.reduce((sum, row) => sum + row.quantity * (row.unit_price || 0), 0),
  }));

  $: activeMachines = new Set(tasks.filter((task) => task.received_quantity < task.total_quantity).map((task) => task.project_id)).size;
  $: remainingItems = tasks.filter((task) => task.purchased_quantity < task.total_quantity).length;
  $: shippingItems = tasks.filter((task) => task.purchased_quantity > task.received_quantity).length;
  $: completedItems = tasks.filter((task) => task.received_quantity >= task.total_quantity).length;
  $: totalRequired = tasks.reduce((sum, task) => sum + task.total_quantity, 0);
  $: totalPurchased = tasks.reduce((sum, task) => sum + task.purchased_quantity, 0);
  $: overall = totalRequired ? Math.round(totalPurchased / totalRequired * 100) : 0;
  $: todayBought = updates.filter((row) => row.work_date === today).reduce((sum, row) => sum + row.quantity, 0);
  $: supplierNames = Array.from(new Set(updates.map((row) => row.supplier))).sort();

  function categories(rows: ProcurementTask[]) {
    return categoryOrder.map((category) => ({ category, tasks: rows.filter((task) => task.source_category === category) })).filter((group) => group.tasks.length);
  }
  function progress(rows: ProcurementTask[]) {
    const total = rows.reduce((sum, task) => sum + task.total_quantity, 0);
    return total ? Math.round(rows.reduce((sum, task) => sum + task.purchased_quantity, 0) / total * 100) : 0;
  }
  function taskFor(update: ProcurementTaskUpdate) { return tasks.find((task) => task.id === update.task_id); }
  function latest(taskId: string) { return updates.find((row) => row.task_id === taskId); }
  $: money = (value: number) => new Intl.NumberFormat($locale === 'ar' ? 'ar' : 'en', { style: 'currency', currency: 'USD' }).format(value);

  function openPurchase(task: ProcurementTask) {
    selected = task;
    quantity = task.total_quantity - task.purchased_quantity;
    supplier = ''; unitPrice = undefined; arrivalDate = ''; receivedNow = false; notes = '';
  }

  async function savePurchase() {
    if (!selected) return;
    const amount = Number(quantity);
    const remaining = selected.total_quantity - selected.purchased_quantity;
    if (!Number.isFinite(amount) || amount <= 0 || amount > remaining) {
      toast.notify(tr(`أدخل كمية بين 0 و ${formatTaskQuantity(remaining)}.`, `Enter a quantity between 0 and ${formatTaskQuantity(remaining)}.`), 'error'); return;
    }
    if (!supplier.trim()) { toast.notify(tr('اكتب اسم المورد.', 'Enter the supplier.'), 'error'); return; }
    saving = true;
    const { error } = await supabase.rpc('record_procurement_purchase', {
      p_task_id: selected.id, p_quantity: amount, p_supplier: supplier.trim(),
      p_unit_price: unitPrice === undefined || Number(unitPrice) < 0 ? null : Number(unitPrice),
      p_expected_arrival_date: arrivalDate || null, p_received: receivedNow, p_notes: notes.trim() || null,
    });
    saving = false;
    if (error) { toast.notify(tr('تعذّر تسجيل الشراء: ', 'Could not record purchase: ') + error.message, 'error'); return; }
    selected = null; toast.notify(tr('تم تسجيل الشراء وتحديث الرصيد.', 'Purchase recorded and balance updated.'), 'success'); await load();
  }

  async function markReceived(task: ProcurementTask) {
    receiving = task.id;
    const { error } = await supabase.rpc('mark_procurement_task_received', { p_task_id: task.id });
    receiving = null;
    if (error) toast.notify(tr('تعذّر تأكيد الاستلام: ', 'Could not confirm receipt: ') + error.message, 'error');
    else { toast.notify(tr('تم تأكيد وصول الكمية.', 'Delivery confirmed.'), 'success'); await load(); }
  }
</script>

<section class="hero">
  <div><small>{tr('مساحة عمل المشتريات', 'PROCUREMENT WORKSPACE')}</small><h2>{tr('ما الذي يجب شراؤه اليوم؟', 'What needs buying today?')}</h2><p>{tr('الكميات تصل تلقائيًا عند بدء التصنيع، وينقص الرصيد مع كل عملية شراء.', 'Quantities arrive automatically when production starts and decrease with every purchase.')}</p></div>
  <div class="ring" style="--value:{overall}"><b>{overall}%</b><span>{tr('تم تأمينه', 'secured')}</span></div>
</section>

<section class="stats">
  <article><span>▦</span><div><small>{tr('ماكينات نشطة', 'Active machines')}</small><b>{activeMachines}</b></div></article>
  <article><span>□</span><div><small>{tr('بنود متبقية', 'Items to buy')}</small><b>{remainingItems}</b></div></article>
  <article><span>⇢</span><div><small>{tr('قيد التوريد', 'In transit')}</small><b>{shippingItems}</b></div></article>
  <article><span>✓</span><div><small>{tr('مكتملة', 'Completed')}</small><b>{completedItems}</b><em>{formatTaskQuantity(todayBought)} {tr('اليوم', 'today')}</em></div></article>
</section>

<div class="toolbar">
  <div><h3>{tr('قائمة الشراء', 'Purchase list')}</h3><p>{tr('النسبة محسوبة من الكميات وليست إدخالًا يدويًا.', 'Progress is calculated from quantities, never typed manually.')}</p></div>
  <div class="switch"><button class:active={view === 'machine'} on:click={() => view = 'machine'}>{tr('حسب الماكينة', 'By machine')}</button><button class:active={view === 'supplier'} on:click={() => view = 'supplier'}>{tr('حسب المورد', 'By supplier')}</button></div>
</div>

{#if loading}
  <div class="state">{tr('جارٍ تحميل المهام…', 'Loading tasks…')}</div>
{:else if loadError}
  <div class="state error"><b>{tr('إعداد قاعدة البيانات مطلوب', 'Database setup required')}</b><span>{tr('تعذّر تحميل المهام. شغّل ملف supabase-procurement-tasks.sql أولًا.', 'Could not load tasks. Run supabase-procurement-tasks.sql first.')}</span></div>
{:else if tasks.length === 0}
  <div class="state empty"><b>✓</b><strong>{tr('لا توجد مواد مطلوبة حاليًا', 'No materials are required')}</strong><span>{tr('ستظهر البنود تلقائيًا عند بدء تصنيع ماكينة.', 'Items appear when a machine enters production.')}</span></div>
{:else if view === 'machine'}
  <div class="machines">
    {#each machines as machine (machine.id)}
      {@const machineProgress = progress(machine.tasks)}
      <section class="machine">
        <header><span class="machine-icon">M</span><div class="machine-name"><small>{tr('الماكينة', 'MACHINE')}</small><h3>{machine.name}</h3><p>{machine.tasks.length} {tr('بند شراء', 'purchase items')}</p></div><div class="machine-progress"><div class="progress-label"><span>{tr('المؤمّن', 'Secured')}</span><b>{machineProgress}%</b></div><div class="track"><i style="width:{machineProgress}%"></i></div></div></header>
        {#each categories(machine.tasks) as group (group.category)}
          <div class="category"><b>▤ {procurementCategoryLabel($locale, group.category)}</b><span>{group.tasks.filter((task) => task.purchased_quantity >= task.total_quantity).length}/{group.tasks.length} {tr('تم شراؤها', 'bought')}</span></div>
          <div class="rows">
            {#each group.tasks as task (task.id)}
              {@const status = procurementTaskStatus(task)}
              {@const remaining = task.total_quantity - task.purchased_quantity}
              {@const last = latest(task.id)}
              <article class="row {status}">
                <span class="status">{status === 'complete' ? '✓' : status === 'shipping' ? '⇢' : '◷'}</span>
                <div class="item"><b>{procurementTaskTitle($locale, task)}</b><small>{procurementTaskDetails(task)}{last ? ` · ${last.supplier}` : ''}</small></div>
                <div class="qty"><small>{status === 'complete' ? tr('تم الاستلام', 'Received') : tr('المتبقي', 'Remaining')}</small><b>{formatTaskQuantity(status === 'complete' ? task.received_quantity : remaining)} <em>/ {formatTaskQuantity(task.total_quantity)} {task.unit_label}</em></b></div>
                <div class="progress"><div class="track"><i style="width:{procurementProgress(task)}%"></i></div><span>{procurementProgress(task)}%</span></div>
                {#if task.purchased_quantity > task.received_quantity}
                  <button class="receive" disabled={receiving === task.id} on:click={() => markReceived(task)}>{receiving === task.id ? '…' : tr('تأكيد الاستلام', 'Confirm receipt')}</button>
                {:else if remaining > 0}
                  <button class="buy" on:click={() => openPurchase(task)}>− {tr('تسجيل شراء', 'Record purchase')}</button>
                {:else}
                  <span class="done">✓ {tr('مكتمل', 'Complete')}</span>
                {/if}
                {#if task.purchased_quantity > task.received_quantity && remaining > 0}<button class="buy-more" on:click={() => openPurchase(task)}>{tr('شراء كمية أخرى', 'Buy more')}</button>{/if}
                {#if status === 'shipping' && last?.expected_arrival_date}<span class="arrival">{tr('الوصول', 'Arrival')} {formatDate(last.expected_arrival_date)}</span>{/if}
              </article>
            {/each}
          </div>
        {/each}
      </section>
    {/each}
  </div>
{:else}
  <div class="supplier-view">
    <div class="notice">ⓘ {tr('تجميع مشتريات كل الماكينات حسب المورد.', 'Purchases from all machines grouped by supplier.')}</div>
    {#if suppliers.length === 0}<div class="state">{tr('لم يُسجّل أي مورد بعد.', 'No suppliers recorded yet.')}</div>{/if}
    {#each suppliers as group (group.name)}
      <section class="supplier">
        <header><div><small>{tr('المورد', 'SUPPLIER')}</small><h3>{group.name}</h3><p>{group.projects} {tr('ماكينات', 'machines')} · {group.items} {tr('بنود', 'items')}</p></div><b>{money(group.total)}</b></header>
        {#each group.rows as update (update.id)}
          {@const task = taskFor(update)}
          <div class="supplier-row"><div><b>{task ? procurementTaskTitle($locale, task) : '—'}</b><small>{task?.project_name_snapshot || '—'}</small></div><span>{formatTaskQuantity(update.quantity)} {task?.unit_label || ''}</span><span>{update.expected_arrival_date ? formatDate(update.expected_arrival_date) : '—'}</span><strong class:received={!!update.received_at}>{update.received_at ? tr('تم الاستلام', 'Received') : tr('قيد التوريد', 'In transit')}</strong></div>
        {/each}
      </section>
    {/each}
  </div>
{/if}

{#if selected}
  <button class="backdrop" aria-label={tr('إغلاق نافذة الشراء', 'Close purchase panel')} on:click={() => !saving && (selected = null)}></button>
  <aside class="drawer">
    <header><div><small>{selected.project_name_snapshot}</small><h3>{tr('تسجيل شراء اليوم', 'Record today’s purchase')}</h3></div><button on:click={() => !saving && (selected = null)}>×</button></header>
    <div class="product"><span>▤</span><div><b>{procurementTaskTitle($locale, selected)}</b><small>{procurementTaskDetails(selected)}</small></div></div>
    <div class="balance"><div><small>{tr('المطلوب', 'Required')}</small><b>{formatTaskQuantity(selected.total_quantity)}</b></div><div><small>{tr('تم شراؤه', 'Bought')}</small><b>{formatTaskQuantity(selected.purchased_quantity)}</b></div><div><small>{tr('المتبقي', 'Remaining')}</small><b>{formatTaskQuantity(selected.total_quantity - selected.purchased_quantity)}</b></div></div>
    <label>{tr('الكمية المشتراة اليوم', 'Quantity bought today')}<input type="number" min="0.001" max={selected.total_quantity - selected.purchased_quantity} step="0.001" bind:value={quantity}></label>
    <label>{tr('المورد', 'Supplier')}<input list="suppliers" bind:value={supplier} placeholder={tr('اسم المورد', 'Supplier name')}></label>
    <datalist id="suppliers">{#each supplierNames as name}<option value={name}></option>{/each}</datalist>
    <div class="form-row"><label>{tr('سعر الوحدة ($)', 'Unit price ($)')}<input type="number" min="0" step="0.01" bind:value={unitPrice}></label><label>{tr('موعد الوصول', 'Arrival date')}<input type="date" min={today} bind:value={arrivalDate}></label></div>
    <label class="check"><input type="checkbox" bind:checked={receivedNow}><span>{tr('تم استلام الكمية مباشرة', 'Received immediately')}</span></label>
    <label>{tr('ملاحظة (اختياري)', 'Note (optional)')}<textarea rows="3" bind:value={notes}></textarea></label>
    <div class="after"><span>{tr('المتبقي بعد الحفظ', 'Remaining after save')}</span><b>{formatTaskQuantity(Math.max(0, selected.total_quantity - selected.purchased_quantity - (Number(quantity) || 0)))} {selected.unit_label}</b><div class="track"><i style="width:{Math.min(100, Math.round((selected.purchased_quantity + (Number(quantity) || 0)) / selected.total_quantity * 100))}%"></i></div></div>
    <button class="confirm" disabled={saving} on:click={savePurchase}>{saving ? tr('جارٍ الحفظ…', 'Saving…') : tr('تأكيد تسجيل الشراء', 'Confirm purchase')}</button>
  </aside>
{/if}

<style>
:global(.app-content){background:#f6f8fb}.hero{display:flex;justify-content:space-between;align-items:center;gap:20px;padding:24px 27px;margin-bottom:15px;border-radius:15px;color:#fff;background:linear-gradient(125deg,#102a43,#173f67 58%,#176b72)}.hero small{color:#78d7d0;font-size:10px;letter-spacing:1px}.hero h2{margin:5px 0;font-size:23px}.hero p{margin:0;color:#c8d8e7;font-size:12px}.ring{--p:calc(var(--value)*1%);width:86px;height:86px;border-radius:50%;display:grid;place-content:center;text-align:center;background:radial-gradient(circle 32px,#173f67 97%,transparent 100%),conic-gradient(#4fd1c5 var(--p),rgba(255,255,255,.15) 0)}.ring b{font-size:19px}.ring span{font-size:8px;color:#c8d8e7}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:11px;margin-bottom:20px}.stats article{display:flex;align-items:center;gap:10px;padding:14px;background:var(--card);border:1px solid var(--border);border-radius:11px}.stats article>span{width:36px;height:36px;border-radius:9px;display:grid;place-items:center;background:#e7f0fb;color:#27639e;font-size:17px}.stats article:nth-child(2)>span{background:#fff1d6;color:#a76700}.stats article:nth-child(3)>span{background:#eee8ff;color:#7151b8}.stats article:nth-child(4)>span{background:#dff5ec;color:#16815f}.stats article div{display:flex;flex-direction:column}.stats small{font-size:10px;color:var(--ink-soft)}.stats b{font-size:19px}.stats em{font-size:8px;color:var(--ink-soft);font-style:normal}
.toolbar{display:flex;justify-content:space-between;align-items:end;gap:12px;margin-bottom:11px}.toolbar h3{margin:0;font-size:15px}.toolbar p{margin:3px 0 0;color:var(--ink-soft);font-size:10px}.switch{display:flex;padding:3px;background:var(--card);border:1px solid var(--border);border-radius:8px}.switch button{border:0;background:transparent;color:var(--ink-soft);padding:7px 11px;border-radius:6px;font:600 10px inherit}.switch button.active{background:#173f67;color:#fff}
.machines{display:flex;flex-direction:column;gap:13px}.machine,.supplier{background:var(--card);border:1px solid var(--border);border-radius:13px;overflow:hidden;box-shadow:0 4px 15px rgba(20,40,70,.05)}.machine>header{display:flex;align-items:center;gap:11px;padding:13px 16px;border-bottom:1px solid var(--border)}.machine-icon{width:36px;height:36px;border-radius:9px;background:#173f67;color:#fff;display:grid;place-items:center;font-weight:800}.machine-name{flex:1}.machine-name small,.supplier header small{font-size:8px;color:#8ba0b5}.machine-name h3,.supplier h3{margin:2px 0;font-size:13px}.machine-name p,.supplier header p{margin:0;font-size:8px;color:var(--ink-soft)}.machine-progress{width:190px}.machine-progress .progress-label{display:flex;justify-content:space-between;font-size:9px;color:var(--ink-soft);margin-bottom:4px}.machine-progress b{color:#176b72}.track{height:5px;border-radius:8px;background:#e8edf2;overflow:hidden}.track i{display:block;height:100%;background:linear-gradient(90deg,#1c8b82,#4fc2b1)}
.category{display:flex;justify-content:space-between;padding:8px 16px;background:#f3f6f8;font-size:10px}.category span{color:var(--ink-soft);font-size:8px}.rows{padding:0 16px}.row{position:relative;display:flex;align-items:center;gap:10px;padding:12px 0;border-bottom:1px solid var(--border)}.row:last-child{border:0}.status{width:23px;height:23px;flex:0 0 23px;border-radius:50%;display:grid;place-items:center;background:#fff1d6;color:#a76700;font-size:10px}.row.shipping .status{background:#eee8ff;color:#7151b8}.row.complete .status{background:#dff5ec;color:#16815f}.item{flex:1;min-width:0;display:flex;flex-direction:column}.item b{font-size:11px}.item small{font-size:8.5px;color:var(--ink-soft)}.row.complete .item b{text-decoration:line-through;color:var(--ink-soft)}.qty{min-width:105px;text-align:center;display:flex;flex-direction:column}.qty small{font-size:7px;color:var(--ink-soft)}.qty b{font-size:12px}.qty em{font-size:8px;color:var(--ink-soft);font-style:normal}.progress{width:78px;display:flex;align-items:center;gap:5px}.progress .track{flex:1;height:4px}.progress span{font-size:8px;color:var(--ink-soft)}.buy,.receive{border:0;border-radius:7px;padding:7px 9px;color:#fff;font:700 9px inherit;white-space:nowrap}.buy{background:#173f67}.receive{background:#7151b8}.done{font-size:8px;padding:5px 8px;border-radius:20px;background:#dff5ec;color:#16815f}.buy-more,.arrival{position:absolute;inset-inline-end:0;bottom:1px;font-size:7px}.buy-more{border:0;background:transparent;color:#176b72}.arrival{color:#7151b8}
.notice{padding:9px 12px;background:#eaf3fb;color:#27639e;border-radius:8px;font-size:10px}.supplier-view{display:flex;flex-direction:column;gap:11px}.supplier>header{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#f3f6f8}.supplier>header div{display:flex;flex-direction:column}.supplier>header>b{color:#176b72}.supplier-row{display:grid;grid-template-columns:1fr 90px 95px 80px;gap:10px;padding:11px 16px;border-top:1px solid var(--border);align-items:center;font-size:9px}.supplier-row>div{display:flex;flex-direction:column}.supplier-row small{color:var(--ink-soft)}.supplier-row>span{color:var(--ink-soft)}.supplier-row>strong{color:#7151b8}.supplier-row>strong.received{color:#16815f}
.state{padding:34px;text-align:center;background:var(--card);border:1px solid var(--border);border-radius:13px;color:var(--ink-soft);font-size:12px}.state.error,.state.empty{display:flex;flex-direction:column;align-items:center;gap:5px}.state.error{background:#fff7f5;color:#9a3c2b}.state.empty>b{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:#dff5ec;color:#16815f;font-size:19px}.state.empty strong{color:var(--ink)}
.backdrop{position:fixed;border:0;padding:0;inset:0;z-index:80;background:rgba(9,23,34,.38)}.drawer{position:fixed;z-index:81;top:0;inset-inline-end:0;width:min(390px,100%);height:100%;overflow:auto;background:var(--card);padding:21px;box-shadow:-12px 0 35px rgba(0,0,0,.18)}.drawer>header{display:flex;justify-content:space-between;border-bottom:1px solid var(--border);padding-bottom:13px}.drawer header small{font-size:8px;color:var(--ink-soft)}.drawer header h3{margin:3px 0;font-size:16px}.drawer header button{border:0;background:var(--paper);color:var(--ink);width:30px;height:30px;border-radius:7px;font-size:18px}.product{display:flex;align-items:center;gap:9px;padding:15px 0}.product>span{width:36px;height:36px;border-radius:8px;display:grid;place-items:center;background:#e7f0fb;color:#27639e}.product div{display:flex;flex-direction:column}.product b{font-size:11px}.product small{font-size:9px;color:var(--ink-soft)}.balance{display:grid;grid-template-columns:repeat(3,1fr);padding:10px;background:var(--paper);border-radius:9px;margin-bottom:14px}.balance div{display:flex;flex-direction:column;align-items:center;border-inline-end:1px solid var(--border)}.balance div:last-child{border:0}.balance small{font-size:8px;color:var(--ink-soft)}.balance b{font-size:15px}.drawer label{display:flex;flex-direction:column;gap:5px;margin-bottom:11px;font-size:9px;color:var(--ink-soft)}.drawer input,.drawer textarea{border:1px solid var(--border);background:var(--paper);color:var(--ink);border-radius:7px;padding:8px;font:11px inherit}.form-row{display:grid;grid-template-columns:1fr 1fr;gap:9px}.check{flex-direction:row!important;align-items:center;padding:9px;background:var(--paper);border-radius:7px}.check input{width:auto}.after{padding:10px;margin-bottom:12px;background:#e7f6f2;border-radius:8px}.after span{font-size:8px;color:#55746d}.after>b{float:left;color:#176b72;font-size:10px}.after .track{clear:both;margin-top:7px}.confirm{width:100%;border:0;border-radius:8px;background:#19836f;color:#fff;padding:10px;font:700 11px inherit}
@media(max-width:800px){.stats{grid-template-columns:repeat(2,1fr)}.machine-progress{width:130px}.row{flex-wrap:wrap}.item{min-width:calc(100% - 35px)}.qty{margin-inline-start:33px;text-align:start}.progress{display:none}.supplier-row{grid-template-columns:1fr 75px 80px}.supplier-row>strong{display:none}}
@media(max-width:560px){.hero{padding:19px}.ring{display:none}.toolbar{align-items:stretch;flex-direction:column}.switch button{flex:1}.machine>header{flex-wrap:wrap}.machine-progress{width:100%}.stats article{padding:10px}.supplier-row{grid-template-columns:1fr auto}.supplier-row>span:nth-child(3){display:none}.form-row{grid-template-columns:1fr}}
</style>
