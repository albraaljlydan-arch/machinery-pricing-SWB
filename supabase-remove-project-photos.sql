-- ============================================================================
--  SWB Manufacturing System — Remove the old "project-photos" experiment
-- ============================================================================
--
--  هاد كان تجربة قديمة بتطبيق الموبايل (الأدمن يرفع صورة للمشروع يدويًا)،
--  انلغت واستُبدلت بميزة render_image_url الجديدة (صورة المصمم المرندرة،
--  إجبارية قبل الإرسال — شوف supabase-render-image.sql). ما إلها علاقة
--  بعمود render_image_url ولا بـ bucket project-renders الجديد إطلاقًا —
--  بكيفن منفصلين تمامًا.
--
--  This was a mobile-app experiment (Admin manually uploading a project
--  photo) that's being retired in favor of the new render_image_url feature
--  (the Designer's required rendered image — see supabase-render-image.sql).
--  Unrelated to and separate from the new render_image_url column /
--  project-renders bucket.
--
--  ⚠️ سوبابيز صار يمنع حذف صفوف storage.objects / storage.buckets مباشرة
--  بـ SQL ("Direct deletion from storage tables is not allowed. Use the
--  Storage API instead.") — فحذف الملفات والـ bucket لازم يصير من
--  الداشبورد، مش من هون. اللي تحت SQL بس للجزء المسموح (السياسات).
--
--  ⚠️ Supabase now blocks deleting storage.objects / storage.buckets rows
--  directly via SQL ("Direct deletion from storage tables is not allowed.
--  Use the Storage API instead."). Deleting the files and the bucket has to
--  happen from the Dashboard, not here. The SQL below only covers the part
--  that's actually allowed (the policies).
-- ============================================================================

-- ---------------------------------------------------------------------------
--  ١) امسح الملفات والـ bucket من الداشبورد (مش SQL)
--  1) Delete the files and the bucket from the Dashboard (not SQL)
--
--  Storage -> project-photos -> حدد كل الملفات -> Delete
--  Storage -> project-photos -> select all files -> Delete
--
--  وبعدين / then:
--  Storage -> project-photos -> ... (الثلاث نقاط بجانب اسم الـ bucket) -> Delete bucket
--  Storage -> project-photos -> ... (the three-dot menu next to the bucket name) -> Delete bucket
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
--  ٢) سياسات RLS القديمة يلي كانت مربوطة فيه (هاي اختيارية)
--     Old RLS policies that were wired to it (this part is optional)
--
--  بعد ما تحذف الـ bucket، أي policy قديمة بتصير عديمة الفائدة تلقائيًا —
--  مافي أي صف بـ bucket_id = 'project-photos' تقدر تطبّق عليه، فمش لازم
--  تلاحقها. بس إذا بدك تنضفها: شغّل الاستعلام هاد أول شي تشوف أسماءها
--  (هاي كانت متعملة يدويًا من الداشبورد مش من SQL، فما إلها اسم معروف
--  مسبقًا)، وبعدين احذفهن إما من Storage -> Policies بالداشبورد، أو
--  بـ "drop policy" هون (drop policy مسموحة، بعكس delete من الصفوف).
--
--  Once the bucket is deleted, any leftover policy becomes inert — there's
--  no row with bucket_id = 'project-photos' left for it to match, so there's
--  nothing to chase. If you still want it gone: run this to see its name
--  (it was hand-made from the Dashboard, not SQL, so the name isn't known
--  ahead of time), then remove it from Storage -> Policies in the Dashboard,
--  or with "drop policy" here (drop policy is allowed — only deleting the
--  underlying rows isn't).
-- ---------------------------------------------------------------------------
select policyname, cmd, qual
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and (qual ilike '%project-photos%' or with_check ilike '%project-photos%');

-- شيل التعليق عن السطر وحط الاسم بعد ما تشوفه بنتيجة الاستعلام فوق:
-- remove the comment and fill in the name once you see it in the query above:
-- drop policy "<policyname>" on storage.objects;
