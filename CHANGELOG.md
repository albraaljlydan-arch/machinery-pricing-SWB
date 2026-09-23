# سجل التغييرات / Changelog

كل التعديلات المهمة عالموقع، الأحدث فوق. أي حدا/أداة (كلود، Codex، أو غيرهن)
عمل تعديل حقيقي على السلوك أو قاعدة البيانات لازم يضيف سطر هون — هاد المكان
الوحيد يلي أي حدا فاتح الريبو بيقدر يفهم منّو "شو تغيّر ومتى" بدون ما يحتاج
يقرا الكود أو يشغّل git log.

All notable changes to this website, newest first. Any tool/person (Claude,
Codex, or otherwise) making a real behavior or database change should add a
line here — this is the one place anyone opening the repo can see "what
changed and when" without reading the code or running git log.

## 2026-09-23

- **دعوة الموظف ليختار كلمة مروره / Staff email invitation and self-set password**:
  صار المصنع يرسل دعوة بريدية مع الاسم والدور دون معرفة كلمة مرور الموظف؛
  يفتح الموظف الرابط ويختار كلمة مروره من صفحة مخصصة. تظهر رسالة واضحة
  للرابط المنتهي، ويبقى منح الدور محصورًا بالأدوار التشغيلية داخل دالة الخادم.
  يلزم نشر الموقع ودالة create-user والسماح برابط /accept-invite في إعدادات
  Supabase حتى تعمل الدعوات الحية. أُضيف إعداد Worker ليعيد صفحة التطبيق
  عند فتح رابط الدعوة مباشرة.
  Factory now sends staff invitations without setting a password. The invited
  user chooses one on a dedicated page, expired links show a clear message,
  and the server still restricts Factory to operational roles. Deploy the site
  and create-user function, then allow the /accept-invite redirect in Supabase.
  The Worker configuration serves the app on direct invitation-link navigation.

- **منع المصنع من إنشاء مدير أو مطور / Factory can no longer create Admin or Developer accounts**:
  حُذفت الأدوار العليا من شاشة إنشاء الموظفين، وأُضيف قيد RLS على إدخال
  الملفات الشخصية، مع مصدر متعقب لدالتي إنشاء وتعديل المستخدمين يتحقق من
  هوية المستدعي ودوره على الخادم. يلزم نشر الدالتين وتشغيل
  [supabase-factory-role-restriction.sql](supabase-factory-role-restriction.sql)
  في Supabase حتى يسري المنع خارج الواجهة.
  Factory staff can now provision operational roles only. The database policy
  and the tracked Edge Functions enforce that rule for direct API calls as
  well; deployment and the SQL Editor step are required for live protection.

- **تحويل طلبات الشراء إلى مهام كميات فعلية / Rebuilt purchase requests as quantity-based procurement tasks**:
  عند بدء تصنيع الماكينة تصل كل موادها تلقائيًا إلى المشتريات بكامل كمياتها؛
  يسجّل المهندس الكمية المشتراة والمورد والسعر وموعد الوصول، ويقدر يتابعها
  حسب الماكينة أو المورد ويؤكد الاستلام. التقدّم ينحسب تلقائيًا من الكميات
  ويبقى متوافقًا مع تقارير الإدارة الحالية. أُضيفت جداول وRLS ودوال ذرّية
  وتعبئة للمشاريع الموجودة في
  [supabase-procurement-tasks.sql](supabase-procurement-tasks.sql).
  When production starts, every material row now becomes a full-balance
  procurement task. The engineer records bought quantities, supplier, price
  and arrival date, can work by machine or supplier, and confirms delivery;
  progress is quantity-derived and still feeds the existing management reports.

## 2026-09-22

- **صورة مرندرة إجبارية قبل تسليم المشروع**: المصمم لازم يرفع صورة مرندرة
  للمشروع قبل ما يقدر يرسلو للمدير — ممنوع إرسال تقرير من غير صورة، مفروض
  بقاعدة البيانات نفسها (trigger)، مو بس بالواجهة. شوف
  [supabase-render-image.sql](supabase-render-image.sql).
- **إصلاح باغ خطير: التقرير كان يضل قابل للتعديل بعد الإرسال** — كل جداول
  الحساب (صاج، مقاطع...) كانت تضل قابلة للكتابة حتى بعد ما يصير المشروع
  "Pending Admin" أو أي حالة تانية غير Draft/Rejected. صلّحناها بـ
  [Calculator.svelte](src/lib/components/calculator/Calculator.svelte).
- **مشاريع الـ Draft صارت خاصة بصاحبها بس** — المدير والمصنع والمشتريات ما
  عادوا يشوفوا مشروع لسا مسودة. شوف [supabase-hide-drafts.sql](supabase-hide-drafts.sql).
- ملف [supabase-reset-projects-customers.sql](supabase-reset-projects-customers.sql)
  لمسح بيانات المشاريع والزبائن التجريبية والبدء من جديد.
- شلنا "Draft" من إحصائيات صفحة admin/reports (كانت رح تصير دايمًا صفر بعد
  التعديل السابق).
