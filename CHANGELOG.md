# سجل التغييرات / Changelog

كل التعديلات المهمة عالموقع، الأحدث فوق. أي حدا/أداة (كلود، Codex، أو غيرهن)
عمل تعديل حقيقي على السلوك أو قاعدة البيانات لازم يضيف سطر هون — هاد المكان
الوحيد يلي أي حدا فاتح الريبو بيقدر يفهم منّو "شو تغيّر ومتى" بدون ما يحتاج
يقرا الكود أو يشغّل git log.

All notable changes to this website, newest first. Any tool/person (Claude,
Codex, or otherwise) making a real behavior or database change should add a
line here — this is the one place anyone opening the repo can see "what
changed and when" without reading the code or running git log.

## 2026-09-24

- **صفحة مشروع المصمم: لا حفظ إجباري، وحفظ على الجهاز عند ضعف الاتصال / Designer project page: no forced save, and offline saving**:
  صارت الأزرار الثلاثة (رجوع، حفظ المسودة، إرسال إلى المدير) متجاورة في
  بداية السطر (يمين بالعربية، يسار بالإنجليزية). الخروج من المشروع لم يعد يحفظ
  تلقائيًا؛ إن وُجدت تعديلات غير محفوظة يظهر إشعار أعلى الصفحة فيه زر "حفظ"
  لمدة 3 ثوانٍ ثم يختفي، ويسأل المتصفح قبل إغلاق التبويب. وإذا ضعف الاتصال عند
  الحفظ تُحفظ التعديلات على الجهاز وتُرفع تلقائيًا عند عودته، دون أن تكتب فوق
  مشروع أُرسل إلى المدير في الأثناء. كما صُحّحت آخر النصوص العامية إلى الفصحى.
  The three actions now sit together at the reading start. Leaving no longer
  auto-saves: with unsaved edits, a top toast offers "Save" for 3 seconds and
  then disappears, and the browser asks before closing the tab. Saves made on
  a weak connection are kept on the device and upload automatically when it
  returns, never overwriting a project submitted in the meantime. The last
  colloquial Arabic strings were rewritten in Modern Standard Arabic.

- **باقات سماكة الصاج / Sheet thickness bands**:
  صار تبويب الصاج في صفحة الأسعار مقسّمًا حسب السماكة (افتراضيًا: حتى 5 مم،
  من 5 إلى 10 مم، أكثر من 10 مم)، ولكل باقة سعر جملة ومفرّق بالدولار لكل مادة.
  زر "إعدادات السماكات" يسمح للمشتريات بإضافة باقة أو حذفها أو تغيير حدودها،
  والباقة الجديدة تبدأ بأسعار الباقة التي انقسمت منها. الحاسبة تختار الباقة
  حسب سماكة كل سطر صاج. يلزم تشغيل
  [supabase-sheet-thickness-bands.sql](supabase-sheet-thickness-bands.sql)
  بعد ملف أسعار الأنواع.
  The Sheet Metal price tab is now split by thickness band (default ≤5 mm,
  5–10 mm, >10 mm), each with USD wholesale and retail prices per material.
  A "Thickness bands" panel lets Procurement add, delete or re-limit bands (a
  new band starts with the prices of the band it splits), and the calculator
  picks the band from each sheet row's thickness. Run the SQL file after the
  category-prices one.

- **أسعار المواد بالتبويبات وربطها بحاسبة المصمم / Material prices by tab, now driving the designer's calculator**:
  صارت صفحة أسعار المشتريات مقسّمة إلى تبويبات: الصاج، البروفيلات، الميّال،
  البواري والبوش، التربيعات والبلاطات، ولكل تبويب سعر جملة ومفرّق. كانت الحاسبة
  سابقًا لا تقرأ أسعار المشتريات إطلاقًا (تأخذها من ذاكرة متصفح كل مصمم)؛
  الآن تقرأها من قاعدة البيانات عند الدخول وتتحدّث فور الحفظ، وكل تبويب في
  الحاسبة يأخذ سعر تبويبه. صار المصمم والمدير يريان الأسعار نفسها للقراءة فقط.
  يلزم تشغيل [supabase-material-category-prices.sql](supabase-material-category-prices.sql)
  في Supabase (يعبّئ الجدول بالأسعار الحالية).
  Procurement's price page now has one tab per calculator category, each with
  wholesale and retail prices. The calculator previously never read these
  prices (it used each designer's browser storage); it now loads them at
  sign-in, stays live, and applies each tab's price to the matching calculator
  tab. Designer and Admin see the same prices read-only. Requires running the
  SQL file in Supabase (seeded from the current prices).

- **تحسينات صفحة الدخول والقائمة / Sign-in page and sidebar polish**:
  صار شعار صفحة الدخول يظهر مباشرة بدل اللوحة البيضاء (ويتفتّح بالوضع
  الداكن)، وأُضيف زر فاتح/داكن بجانب اللغة، وكلاهما ثابت على اليسار. أُزيلت
  شارة الدور من فوق الشعار في القائمة الجانبية لأنها تظهر في بطاقة المستخدم،
  وصُلّح بقاء "نظرة عامة" مفعّلة في كل صفحات القسم لكل المستخدمين.
  The sign-in logo now shows directly (lifted in dark mode) instead of on a
  white plate, with a light/dark toggle beside the language switch, both
  pinned to the left. The role tag no longer overlaps the sidebar logo, and
  the section's Overview link no longer stays highlighted on every page.

- **صفحة الإعدادات / New Settings page**:
  صار لكل مستخدم صفحة إعدادات تفتح من بطاقته أسفل القائمة الجانبية، فيها
  معلومات الحساب، وتغيير كلمة المرور بعد التحقق من الحالية، واختيار اللغة
  والمظهر، وتسجيل الخروج من هذا الجهاز أو من كل الأجهزة. أُزيل الإيميل وزر
  الخروج وتبديل اللغة من الشريط العلوي، وبقي فيه الوضع الداكن والإشعارات فقط.
  Every user now has a Settings page, opened from their card at the bottom of
  the sidebar: account details, password change (current password required),
  language and appearance, and sign-out from this device or all devices. The
  topbar now keeps only the dark-mode toggle and notifications.

- **إصلاح تبديل اللغة في المتابعة والمشتريات / Fixed language switching on Follow-up and Procurement**:
  بعد تبديل اللغة كانت بعض النصوص تبقى باللغة السابقة حتى إعادة تحميل الصفحة
  في صفحة المتابعة وطلبات الشراء، وكذلك حالة الموافقة في تقدّم المصنع وتفاصيل
  الماكينة. صارت كل النصوص تتبدّل فورًا.
  Some labels on the Follow-up, Purchase Requests, Factory Progress and Machine
  Detail screens stayed in the previous language until a reload; they now
  switch immediately.

- **إصلاح وميض شاشة تسجيل الدخول / Fixed sign-in screen flashing after login**:
  بعد إدخال الحساب وكلمة المرور كانت ترجع شاشة تسجيل الدخول للحظة بين شاشة
  التحميل والواجهة؛ صارت شاشة التحميل تبقى ظاهرة حتى تفتح الواجهة مباشرة.
  After signing in, the login form briefly reappeared between the loading
  screen and the dashboard; the loading screen now stays until the dashboard
  opens.

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
