# سجل التغييرات / Changelog

كل التعديلات المهمة عالموقع، الأحدث فوق. أي حدا/أداة (كلود، Codex، أو غيرهن)
عمل تعديل حقيقي على السلوك أو قاعدة البيانات لازم يضيف سطر هون — هاد المكان
الوحيد يلي أي حدا فاتح الريبو بيقدر يفهم منّو "شو تغيّر ومتى" بدون ما يحتاج
يقرا الكود أو يشغّل git log.

All notable changes to this website, newest first. Any tool/person (Claude,
Codex, or otherwise) making a real behavior or database change should add a
line here — this is the one place anyone opening the repo can see "what
changed and when" without reading the code or running git log.

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
