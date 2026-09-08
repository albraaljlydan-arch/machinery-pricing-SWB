import type { Locale } from '../stores/locale';
import type { ProjectStatus } from '../types';

// ============================================================================
//  DICTIONARY — every string on every DASHBOARD screen (Admin, Designer,
//  Factory, Procurement, Accounting) plus the shared AppShell chrome, so the
//  language toggle produces a fully translated screen no matter which role
//  is signed in.
//
//  Arabic entries are written in Modern Standard Arabic (الفصحى) — no
//  colloquial/dialect words (e.g. "هلق", "لسا", "شو", "هيدا").
//
//  The MATERIAL CALCULATOR itself (the Sheet/Profile/Mill/Pipe/Square/Order/
//  Processing tabs a Designer or Procurement user works in when they open a
//  project) is a deliberate exception: it is ALWAYS English/LTR, regardless
//  of this toggle, and its page chrome (Save/Submit/Back buttons, toasts
//  fired from inside it) is hardcoded English directly in those route files
//  rather than pulled from this dictionary — see designer/[id], admin/
//  projects/[id], and procurement/[id]. Nothing in this file should be
//  imported by anything under lib/components/calculator/.
//
//  Simple template placeholders like {n}, {name}, {status} appear in a few
//  strings below — the caller does a plain .replace('{n}', String(n)) after
//  calling t(); there's no templating engine, just a convention.
// ============================================================================
const dict = {
  ar: {
    // ---- shared AppShell chrome ----
    overview: 'نظرة عامة',
    searchPlaceholder: 'بحث',
    signOut: 'تسجيل الخروج',
    notifications: 'التنبيهات',
    darkMode: 'الوضع الداكن',
    lightMode: 'الوضع الفاتح',
    homeSection: 'الرئيسية',
    loading: 'جارٍ التحميل…',
    openAction: 'فتح',
    save: 'حفظ',
    savingGeneric: 'جارٍ الحفظ…',
    underConstruction: 'هذه الصفحة قيد الإنشاء حاليًا، وستكون متاحة قريبًا.',

    // ---- role labels (sidebar brand + profile chip) ----
    admin: 'المدير',
    designer: 'مصمم',
    factory: 'المصنع',
    procurement: 'المشتريات',
    accounting: 'المحاسبة',
    developer: 'مطوّر',
    followup: 'مهندس المتابعة',

    // ---- Follow-up Engineer dashboard ----
    followupHomeTitle: 'تسجيل عمليات التشغيل',
    followupDesc: 'سجّل كل عملية تشغيل (ليزر، تشغيل CNC، خراطة، لحام، تجميع...) ونسبة الإنجاز اليومية لكل عامل.',
    colOperationType: 'نوع العملية',
    colWorkerName: 'اسم العامل',
    colWorkDate: 'التاريخ',
    colCompletion: 'نسبة الإنجاز (%)',
    colNotes: 'ملاحظات',
    selectProjectPlaceholder: 'اختر المشروع',
    selectOperationPlaceholder: 'اختر نوع العملية',
    logOperationBtn: '+ تسجيل عملية',
    operationLoggedSuccess: '✅ تم تسجيل العملية.',
    operationLogErrorPrefix: 'حدث خطأ أثناء التسجيل: ',
    recentOperationsTitle: 'آخر العمليات المسجلة',
    noOperationsYet: 'لا توجد أي عمليات مسجلة بعد.',

    // ---- Factory Progress (Admin, read-only) ----
    factoryProgressDesc: 'سجل عمليات التشغيل الذي أدخله مهندس المتابعة — للقراءة فقط.',
    noMatchingOperations: 'لا توجد عمليات مطابقة.',

    // ---- Users & Roles (Admin) ----
    colFullName: 'الاسم الكامل',
    colRole: 'الدور',
    changeRoleAction: 'تغيير الدور',
    addUserBtn: '+ إضافة مستخدم',
    addUserTitle: 'إضافة مستخدم جديد',
    fullNamePlaceholder: 'الاسم الكامل',
    emailPlaceholder: 'البريد الإلكتروني',
    tempPasswordPlaceholder: 'كلمة مرور مؤقتة',
    createUserBtn: 'إنشاء المستخدم',
    userCreatedSuccess: '✅ تم إنشاء المستخدم.',
    userCreateErrorPrefix: 'حدث خطأ أثناء الإنشاء: ',
    roleUpdatedSuccess: '✅ تم تحديث الدور.',
    roleUpdateErrorPrefix: 'حدث خطأ أثناء تحديث الدور: ',
    searchUsersPlaceholder: 'ابحث باسم المستخدم',
    editUserTitle: 'تعديل بيانات المستخدم',
    editUserAction: 'تعديل',
    newPasswordOptionalPlaceholder: 'كلمة مرور جديدة (اختياري)',
    leaveBlankHint: 'اتركه فارغًا لعدم تغيير كلمة المرور.',
    updateUserBtn: 'حفظ التعديلات',
    userUpdatedSuccess: '✅ تم تحديث بيانات المستخدم.',
    userUpdateErrorPrefix: 'حدث خطأ أثناء التحديث: ',

    // ---- Material Prices ----
    colWholesalePrice: 'السعر الجملة ($/كغ)',
    colRetailPrice: 'السعر المفرّق ($/كغ)',
    materialPricesReadonlyNote: 'عرض للقراءة فقط — التعديل يكون من حساب المشتريات.',
    editMaterialPricesTitle: 'تعديل أسعار المواد',
    pricesSavedToast: '✅ تم حفظ الأسعار.',
    colMaterial: 'المادة',

    // ---- Factory workers + approval workflow ----
    workersTitle: 'العمال',
    addWorkerBtn: '+ إضافة عامل',
    workerNamePlaceholder: 'اسم العامل',
    workerAddedSuccess: '✅ تمت إضافة العامل.',
    workerAddErrorPrefix: 'حدث خطأ أثناء الإضافة: ',
    removeWorkerAction: 'حذف',
    removingWorkerTemplate: 'جارٍ حذف "{name}"…',
    noWorkersYet: 'لا يوجد عمال مسجّلون بعد.',
    pendingApprovalTitle: 'بانتظار الموافقة',
    approveAction: '✅ موافقة',
    rejectAction: '❌ رفض',
    noPendingEntries: 'لا توجد إدخالات بانتظار الموافقة.',
    entryApprovedSuccess: '✅ تمت الموافقة على الإدخال.',
    entryRejectedSuccess: '❌ تم رفض الإدخال.',
    entryActionErrorPrefix: 'حدث خطأ: ',
    factoryProgressByMachine: 'التقدم حسب الماكينة',
    dailyProgressTitle: 'سجل التقدم اليومي',
    searchByProject: 'ابحث بالمشروع',
    selectWorkerPlaceholder: 'اختر العامل',
    colWorker: 'العامل',
    colApprovalStatus: 'الحالة',
    approvalStatusPending: 'بانتظار الموافقة',
    approvalStatusApproved: 'موافَق عليه',
    approvalStatusRejected: 'مرفوض',
    noNotificationsYet: 'لا توجد إشعارات جديدة.',
    markAllReadBtn: 'وضع الكل كمقروء',

    // ---- Reports & Export (Admin) ----
    reportsPageDesc: 'ملخص أداء كل المشاريع، جاهز للتصدير كملف PDF أو Excel.',
    statusBreakdownTitle: 'توزيع الحالات',
    exportPdfBtn: '📄 تصدير PDF',
    exportCsvBtn: '📊 تصدير Excel (CSV)',

    // ---- Developer dashboard (calculator field manager) ----
    editCalcDesigner: 'تعديل الحاسبة — المصمم',
    editCalcProcurement: 'تعديل الحاسبة — المشتريات',
    developerOverviewDesc: 'يمكنك من هذه الصفحة إضافة أعمدة أو حذفها أو إعادة ترتيبها داخل حاسبة المصمم، دون الحاجة إلى لمس الكود. اختر تبويبًا من القائمة الجانبية للبدء.',
    manageFieldsHint: 'تنطبق هذه التعديلات على كل مستخدم يستخدم هذا الجدول، وليس على متصفحك فقط.',
    dragReorderHint: 'اسحب ☰ لإعادة الترتيب — ينطبق على الأعمدة المضافة فيما بينها.',
    newColumnNamePlaceholder: 'اسم العمود الجديد',
    englishNameHint: 'يجب أن يكون الاسم بأحرف إنكليزية، لأنه سيظهر داخل الحاسبة الإنكليزية لدى المصمم.',
    typeText: 'نص',
    typeNumber: 'رقم',
    typeDropdown: 'قائمة منسدلة',
    numberFormatDecimal: 'عشري',
    numberFormatInteger: 'صحيح فقط',
    positiveOnlyLabel: 'أكبر من الصفر',
    allowNegativeLabel: 'يُسمح بالقيم السالبة',
    dropdownOptionsPlaceholder: 'أضف خيارًا واضغط +',
    allowCustomValueLabel: 'يُسمح أيضًا بإدخال قيمة مخصصة يدويًا',
    addColumnBtn: '+ إضافة عمود',
    removeColumnTitle: 'حذف العمود',
    builtinTag: 'أساسي',
    addedTag: 'مضاف',
    livePreviewLabel: 'معاينة حية',
    fieldConfigSaved: '✅ تم حفظ الأعمدة.',
    nameRequiredError: 'أدخل اسم العمود أولاً',
    englishOnlyError: 'يجب أن يكون الاسم بأحرف إنكليزية فقط',
    unitPlaceholder: 'الوحدة (مثال: mm)',
    editingLabel: 'تعديل:',
    cancelBtn: 'إلغاء',

    // ---- project status labels (StatusBadge + filters) ----
    statusDraft: 'مسودة',
    statusPendingAdmin: 'بانتظار المدير',
    statusInProduction: 'قيد التصنيع',
    statusCompleteProduction: 'اكتمل التصنيع',
    statusCompleted: 'مكتمل',
    statusRejected: 'مرفوض',

    // ---- Admin nav ----
    allProjects: 'كل المشاريع',
    pendingApproval: 'بانتظار موافقتك',
    rejectedAtDesigner: 'مرفوضة عند المصمم',
    inProduction: 'قيد التصنيع',
    factoryProgress: 'تقدّم المصنع',
    new: 'جديد',
    usersAndRoles: 'المستخدمون والصلاحيات',
    reportsExport: 'التقارير والتصدير',
    materialPrices: 'أسعار المواد',

    // ---- Admin overview dashboard ----
    liveDataBadge: 'مرتبط ببيانات حقيقية — Supabase',
    loadErrorPrefix: 'تعذّر تحميل المشاريع: ',
    heroGreeting: 'مرحبًا، هذا ملخص مشاريعك اليوم',
    heroPendingTemplate: 'لديك {n} من المشاريع بانتظار موافقتك',
    heroRejectedTemplate: 'و{n} من المشاريع المرفوضة ما تزال لدى المصمم للتصحيح',
    heroCompleteTemplate: 'وقد أنهى المصنع تصنيع {n} من المشاريع وأحالها إلى المشتريات',
    heroValueLabel: 'قيمة المشاريع المعتمدة هذا الشهر',
    sectionIndicators: 'مؤشرات',
    kpiPendingBadge: 'بانتظارك',
    kpiPendingLabel: 'مشاريع بانتظار الموافقة',
    kpiInProdLabel: 'قيد التصنيع في المصنع',
    kpiCompleteProdBadge: 'عند المشتريات',
    kpiCompleteProdLabel: 'جاهزة للتسعير الفعلي',
    kpiCompletedLabel: 'مكتملة (الإجمالي)',
    kpiRejectedBadge: 'للمراجعة',
    kpiRejectedLabel: 'مرفوضة وبانتظار المصمم',
    kpiAllProjectsLabel: 'إجمالي المشاريع',
    panelPendingTitle: 'مشاريع بانتظار موافقتك',
    panelRecentTitle: 'آخر المشاريع المضافة',
    panelRecentTag: 'أحدث 5',
    pendingEmpty: 'لا يوجد أي مشروع بانتظار الموافقة حاليًا 🎉',
    noProjectsAtAll: 'لا توجد أي مشاريع بعد',
    colDesignerName: 'المصمم',
    colEstCost: 'السعر التقديري',
    reviewAction: 'مراجعة',
    sectionSystemMgmt: 'إدارة النظام',
    mgmtAllProjectsDesc: 'جميع المشاريع بكل مراحلها — من مسودة لدى المصمم وحتى التسليم النهائي للمحاسبة.',
    mgmtFactoryProgressDesc: 'تابع كل عملية تشغيل (ليزر، تشغيل CNC، خراطة، لحام، تجميع...) ونسبة الإنجاز اليومية لكل موظف. يمكن البحث بالمشروع أو باسم/مهنة الموظف.',
    comingSoonTag: 'قريبًا',
    dailyProgressReport: 'تقرير إنجاز يومي',
    mgmtUsersDesc: 'المصممون، المصنع، المشتريات، والمحاسبة — حدّد ما يمكن أن يراه وينفّذه كل دور.',
    mgmtMaterialPricesDesc: 'سعر الكيلوغرام جملةً ومفرّقًا لكل مادة — ستانلس ستيل، ألمنيوم، فولاذ، نحاس، وبولي أميد.',
    mgmtProcurementDesc: 'المشاريع الجاهزة للتسعير الفعلي والفواتير قبل وصولها إلى المحاسبة.',
    awaitingCount: 'بالانتظار',
    mgmtReportsDesc: 'أداء المشاريع والقيمة الشهرية، جاهزة للتصدير بصيغة PDF أو Excel في أي وقت.',
    openArrow: 'فتح ←',

    // ---- Admin projects list ----
    projectsWithStatusTemplate: 'مشاريع — {status}',
    clearFilter: '✕ إزالة الفلتر',
    noProjectsPlain: 'لا توجد مشاريع.',
    noProjectsWithStatusTemplate: 'لا توجد مشاريع بالحالة "{status}".',
    colProject: 'المشروع',
    colClient: 'العميل',
    colCost: 'السعر ($)',
    colStatus: 'الحالة',
    colCreated: 'تاريخ الإنشاء',
    colSubmitted: 'تاريخ الإرسال',

    // ---- Designer nav + dashboard ----
    myProjects: 'مشاريعي',
    pendingAdminNav: 'بانتظار المدير',
    rejectedNeedsFix: 'مرفوضة — بحاجة إلى تصحيح',
    settingsAndPrices: 'الإعدادات وأسعار المواد',
    projectsSection: 'المشاريع',
    referenceSection: 'مرجع',
    newProject: '+ مشروع جديد',
    creating: 'جارٍ الإنشاء…',
    noProjectsYet: 'لا توجد مشاريع بعد — اضغط "مشروع جديد" للبدء.',
    deleteProjectTitle: 'حذف المشروع',
    needsNameTag: 'بحاجة إلى اسم',
    projectsCountSuffix: 'مشروع',
    createProjectErrorPrefix: 'حدث خطأ أثناء إنشاء المشروع: ',
    deletingTemplate: 'جارٍ حذف "{name}"…',
    deleteErrorPrefix: 'حدث خطأ أثناء الحذف: ',
    deleteSuccess: '🗑️ تم حذف المشروع.',

    // ---- Designer settings / material prices ----
    settingsTitle: 'الإعدادات',
    safetyFactorLabel: 'عامل الأمان (%)',
    safetyFactorDesc: 'الهامش الافتراضي الذي يُضاف على السعر النهائي في تقرير PDF — ينطبق على جميع مشاريعك، وليس على مشروع واحد فقط.',
    settingsSaved: '✅ تم حفظ الإعدادات.',
    materialPricesStubDesc: 'إدارة أسعار الجملة والمفرّق لكل مادة وسماكة ستكون متاحة في تحديث قادم.',

    // ---- Factory dashboard ----
    factoryHomeTitle: 'نظرة عامة — المصنع',
    factoryQueueDesc: 'المشاريع التي وافق عليها المدير، وهي الآن قيد التصنيع في المصنع.',
    factoryEmpty: 'لا توجد أي مشاريع قيد التصنيع حاليًا.',
    markFinishedAction: '✅ إنهاء التصنيع',
    markFinishedTemplate: 'جارٍ تحديد "{name}" كمكتمل التصنيع وإرسالها إلى المشتريات…',
    markFinishedSuccess: '✅ تم إرسال المشروع إلى المشتريات.',
    markFinishedErrorPrefix: 'حدث خطأ أثناء التحديث: ',

    // ---- Accounting dashboard ----
    accountingHomeTitle: 'نظرة عامة — المحاسبة',
    accountingDesc: 'عرض للقراءة فقط للمشاريع المكتملة بالكامل وقيمتها النهائية.',
    accountingEmpty: 'لا توجد أي مشاريع مكتملة بعد.',
    totalValueLabel: 'إجمالي القيمة',
    colFinalCost: 'التكلفة النهائية ($)',
    colCompletedDate: 'تاريخ الاكتمال',

    // ---- Procurement dashboard ----
    procurementHomeTitle: 'جاهزة للتسعير',
    procurementDesc: 'المشاريع التي أنهى المصنع تصنيعها — أدخل الأسعار والفواتير الفعلية، ثم أرسلها إلى المحاسبة.',
    procurementEmpty: 'لا توجد أي مشاريع بانتظار المشتريات حاليًا.',
    priceItAction: '💲 تسعير',

    // ---- shared Toast component ----
    toastUndo: '↩ تراجع',
    toastClose: 'إغلاق',
  },
  en: {
    // ---- shared AppShell chrome ----
    overview: 'Overview',
    searchPlaceholder: 'Search',
    signOut: 'Sign Out',
    notifications: 'Notifications',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    homeSection: 'Home',
    loading: 'Loading…',
    openAction: 'Open',
    save: 'Save',
    savingGeneric: 'Saving…',
    underConstruction: 'This page is still under construction — it will be available soon.',

    // ---- role labels (sidebar brand + profile chip) ----
    admin: 'Admin',
    designer: 'Designer',
    factory: 'Factory',
    procurement: 'Procurement',
    accounting: 'Accounting',
    developer: 'Developer',
    followup: 'Follow-up Engineer',

    // ---- Follow-up Engineer dashboard ----
    followupHomeTitle: 'Log Operations',
    followupDesc: "Log every operation (laser cutting, CNC machining, turning, welding, assembly...) and each worker's daily completion percentage.",
    colOperationType: 'Operation',
    colWorkerName: 'Worker',
    colWorkDate: 'Date',
    colCompletion: 'Completion (%)',
    colNotes: 'Notes',
    selectProjectPlaceholder: 'Select project',
    selectOperationPlaceholder: 'Select operation type',
    logOperationBtn: '+ Log Operation',
    operationLoggedSuccess: '✅ Operation logged.',
    operationLogErrorPrefix: 'Error logging operation: ',
    recentOperationsTitle: 'Recently Logged Operations',
    noOperationsYet: 'No operations logged yet.',

    // ---- Factory Progress (Admin, read-only) ----
    factoryProgressDesc: "Operations log entered by the Follow-up Engineer — read-only.",
    noMatchingOperations: 'No matching operations.',

    // ---- Users & Roles (Admin) ----
    colFullName: 'Full Name',
    colRole: 'Role',
    changeRoleAction: 'Change role',
    addUserBtn: '+ Add User',
    addUserTitle: 'Add New User',
    fullNamePlaceholder: 'Full name',
    emailPlaceholder: 'Email',
    tempPasswordPlaceholder: 'Temporary password',
    createUserBtn: 'Create User',
    userCreatedSuccess: '✅ User created.',
    userCreateErrorPrefix: 'Error creating user: ',
    roleUpdatedSuccess: '✅ Role updated.',
    roleUpdateErrorPrefix: 'Error updating role: ',
    searchUsersPlaceholder: 'Search by name',
    editUserTitle: 'Edit User',
    editUserAction: 'Edit',
    newPasswordOptionalPlaceholder: 'New password (optional)',
    leaveBlankHint: "Leave blank if you don't want to change the password",
    updateUserBtn: 'Save Changes',
    userUpdatedSuccess: '✅ User updated.',
    userUpdateErrorPrefix: 'Error updating user: ',

    // ---- Material Prices ----
    colWholesalePrice: 'Wholesale ($/kg)',
    colRetailPrice: 'Retail ($/kg)',
    materialPricesReadonlyNote: 'Read-only — editing is done from the Procurement account.',
    editMaterialPricesTitle: 'Edit Material Prices',
    pricesSavedToast: '✅ Prices saved.',
    colMaterial: 'Material',

    // ---- Factory workers + approval workflow ----
    workersTitle: 'Workers',
    addWorkerBtn: '+ Add Worker',
    workerNamePlaceholder: "Worker's name",
    workerAddedSuccess: '✅ Worker added.',
    workerAddErrorPrefix: 'Error adding worker: ',
    removeWorkerAction: 'Remove',
    removingWorkerTemplate: 'Removing "{name}"…',
    noWorkersYet: 'No workers registered yet.',
    pendingApprovalTitle: 'Pending Approval',
    approveAction: '✅ Approve',
    rejectAction: '❌ Reject',
    noPendingEntries: 'No entries pending approval.',
    entryApprovedSuccess: '✅ Entry approved.',
    entryRejectedSuccess: '❌ Entry rejected.',
    entryActionErrorPrefix: 'Error: ',
    factoryProgressByMachine: 'Progress by Machine',
    dailyProgressTitle: 'Daily Progress Log',
    searchByProject: 'Search by project',
    selectWorkerPlaceholder: 'Select worker',
    colWorker: 'Worker',
    colApprovalStatus: 'Status',
    approvalStatusPending: 'Pending Approval',
    approvalStatusApproved: 'Approved',
    approvalStatusRejected: 'Rejected',
    noNotificationsYet: 'No notifications yet.',
    markAllReadBtn: 'Mark all as read',

    // ---- Reports & Export (Admin) ----
    reportsPageDesc: 'A performance summary of every project, ready to export as PDF or Excel.',
    statusBreakdownTitle: 'Status Breakdown',
    exportPdfBtn: '📄 Export PDF',
    exportCsvBtn: '📊 Export Excel (CSV)',

    // ---- Developer dashboard (calculator field manager) ----
    editCalcDesigner: 'Edit calculator — Designer',
    editCalcProcurement: 'Edit calculator — Procurement',
    developerOverviewDesc: 'From here you can add, remove, or reorder columns inside the Designer calculator without touching code. Pick a tab from the list on the side to start.',
    manageFieldsHint: 'Changes here apply to everyone using this table — not just your browser',
    dragReorderHint: 'Drag ☰ to reorder — works among the added columns',
    newColumnNamePlaceholder: 'New column name',
    englishNameHint: 'Name must be in English — it will appear inside the Designer\u2019s English calculator',
    typeText: 'Text',
    typeNumber: 'Number',
    typeDropdown: 'Dropdown',
    numberFormatDecimal: 'Decimal',
    numberFormatInteger: 'Integer only',
    positiveOnlyLabel: 'Must be greater than zero',
    allowNegativeLabel: 'Allow negative values',
    dropdownOptionsPlaceholder: 'Add an option and press +',
    allowCustomValueLabel: 'Allow a custom typed value too',
    addColumnBtn: '+ Add column',
    removeColumnTitle: 'Remove column',
    builtinTag: 'Built-in',
    addedTag: 'Added',
    livePreviewLabel: 'Live preview',
    fieldConfigSaved: '✅ Columns saved.',
    nameRequiredError: 'Enter a column name first',
    englishOnlyError: 'Name must be in English letters only',
    unitPlaceholder: 'Unit (e.g. mm)',
    editingLabel: 'Editing:',
    cancelBtn: 'Cancel',

    // ---- project status labels (StatusBadge + filters) ----
    statusDraft: 'Draft',
    statusPendingAdmin: 'Pending Admin',
    statusInProduction: 'In Production',
    statusCompleteProduction: 'Complete Production',
    statusCompleted: 'Completed',
    statusRejected: 'Rejected',

    // ---- Admin nav ----
    allProjects: 'All Projects',
    pendingApproval: 'Pending Your Approval',
    rejectedAtDesigner: 'Rejected — With Designer',
    inProduction: 'In Production',
    factoryProgress: 'Factory Progress',
    new: 'New',
    usersAndRoles: 'Users & Roles',
    reportsExport: 'Reports & Export',
    materialPrices: 'Material Prices',

    // ---- Admin overview dashboard ----
    liveDataBadge: 'Connected to live data — Supabase',
    loadErrorPrefix: 'Could not load projects: ',
    heroGreeting: "Welcome — here's today's project summary",
    heroPendingTemplate: 'You have {n} project(s) awaiting your approval',
    heroRejectedTemplate: 'and {n} rejected project(s) still with the designer for revision',
    heroCompleteTemplate: 'and the factory has finished {n} project(s), now with procurement',
    heroValueLabel: 'Approved project value this month',
    sectionIndicators: 'Indicators',
    kpiPendingBadge: 'Awaiting you',
    kpiPendingLabel: 'Projects awaiting approval',
    kpiInProdLabel: 'In production at the factory',
    kpiCompleteProdBadge: 'With procurement',
    kpiCompleteProdLabel: 'Ready for real pricing',
    kpiCompletedLabel: 'Completed (total)',
    kpiRejectedBadge: 'Needs review',
    kpiRejectedLabel: 'Rejected — awaiting designer',
    kpiAllProjectsLabel: 'All projects',
    panelPendingTitle: 'Projects Awaiting Your Approval',
    panelRecentTitle: 'Recently Added Projects',
    panelRecentTag: 'Latest 5',
    pendingEmpty: 'No projects awaiting approval right now 🎉',
    noProjectsAtAll: 'No projects yet',
    colDesignerName: 'Designer',
    colEstCost: 'Est. Cost',
    reviewAction: 'Review',
    sectionSystemMgmt: 'System Management',
    mgmtAllProjectsDesc: 'Every project through every stage — from a draft with the designer to final handoff to accounting.',
    mgmtFactoryProgressDesc: 'Track every operation (laser, CNC, turning, welding, assembly...) and each worker\u2019s daily completion rate. Searchable by project or by worker name/role.',
    comingSoonTag: 'Coming Soon',
    dailyProgressReport: 'Daily progress report',
    mgmtUsersDesc: 'Designers, factory, procurement, and accounting — control what each role can see and do.',
    mgmtMaterialPricesDesc: 'Wholesale and retail price per kilogram for each material — stainless steel, aluminum, steel, copper, and polyamide.',
    mgmtProcurementDesc: 'Projects ready for real pricing and invoicing before reaching accounting.',
    awaitingCount: 'awaiting',
    mgmtReportsDesc: 'Project performance and monthly value, ready to export as PDF or Excel anytime.',
    openArrow: 'Open →',

    // ---- Admin projects list ----
    projectsWithStatusTemplate: 'Projects — {status}',
    clearFilter: '✕ Clear filter',
    noProjectsPlain: 'No projects.',
    noProjectsWithStatusTemplate: 'No projects with status "{status}".',
    colProject: 'Project',
    colClient: 'Client',
    colCost: 'Cost ($)',
    colStatus: 'Status',
    colCreated: 'Created',
    colSubmitted: 'Submitted',

    // ---- Designer nav + dashboard ----
    myProjects: 'My Projects',
    pendingAdminNav: 'Pending Admin',
    rejectedNeedsFix: 'Rejected — Needs Fix',
    settingsAndPrices: 'Settings & Material Prices',
    projectsSection: 'Projects',
    referenceSection: 'Reference',
    newProject: '+ New Project',
    creating: 'Creating…',
    noProjectsYet: 'No projects yet — click "New Project" to start.',
    deleteProjectTitle: 'Delete project',
    needsNameTag: 'Needs a name',
    projectsCountSuffix: 'projects',
    createProjectErrorPrefix: 'Error creating project: ',
    deletingTemplate: 'Deleting "{name}"…',
    deleteErrorPrefix: 'Error deleting: ',
    deleteSuccess: '🗑️ Project deleted.',

    // ---- Designer settings / material prices ----
    settingsTitle: 'Settings',
    safetyFactorLabel: 'Safety Factor (%)',
    safetyFactorDesc: 'The default margin added to the final price in the PDF report — applies to all your projects, not just one.',
    settingsSaved: '✅ Settings saved.',
    materialPricesStubDesc: 'Wholesale/retail price management per material and thickness is coming in a future update.',

    // ---- Factory dashboard ----
    factoryHomeTitle: 'Factory Overview',
    factoryQueueDesc: 'Projects approved by the admin and now in production at the factory.',
    factoryEmpty: 'No projects currently in production.',
    markFinishedAction: '✅ Mark Finished',
    markFinishedTemplate: 'Marking "{name}" as finished and sending to procurement…',
    markFinishedSuccess: '✅ Project sent to procurement.',
    markFinishedErrorPrefix: 'Error updating: ',

    // ---- Accounting dashboard ----
    accountingHomeTitle: 'Accounting Overview',
    accountingDesc: 'Read-only view of fully completed projects and their final value.',
    accountingEmpty: 'No completed projects yet.',
    totalValueLabel: 'Total Value',
    colFinalCost: 'Final Cost ($)',
    colCompletedDate: 'Completed',

    // ---- Procurement dashboard ----
    procurementHomeTitle: 'Ready for Purchasing',
    procurementDesc: 'Projects Factory has finished manufacturing — fill in real prices and invoices, then send to Accounting.',
    procurementEmpty: 'No projects waiting on Procurement right now.',
    priceItAction: '💲 Price It',

    // ---- shared Toast component ----
    toastUndo: '↩ Undo',
    toastClose: 'Close',
  },
} as const;

export type DictKey = keyof typeof dict.ar;

/** Takes the locale explicitly (pass `$locale`) rather than reading the
 *  store internally — that's what makes Svelte's compiler correctly treat
 *  every `{t($locale, 'key')}` call in a template as depending on the
 *  locale store, so labels actually re-render the instant someone toggles
 *  the language. A version that read the store internally looked
 *  reactive but silently wasn't: nothing in the calling template
 *  literally referenced `$locale`, so most labels would only update on
 *  the next unrelated re-render, not immediately on toggle. */
export function t(loc: Locale, key: DictKey): string {
  return dict[loc][key];
}

const STATUS_KEY: Record<ProjectStatus, DictKey> = {
  Draft: 'statusDraft',
  'Pending Admin': 'statusPendingAdmin',
  'In Production': 'statusInProduction',
  'Complete Production': 'statusCompleteProduction',
  Completed: 'statusCompleted',
  Rejected: 'statusRejected',
};

/** Translated display label for a raw project status value. Used by
 *  StatusBadge (when it's given a locale) and by any dashboard heading that
 *  echoes a status filter back to the user (e.g. "Projects — Pending
 *  Admin"). Falls back to the raw status string for anything unrecognized,
 *  so it never renders blank. */
export function statusLabel(loc: Locale, status: string): string {
  const key = STATUS_KEY[status as ProjectStatus];
  return key ? t(loc, key) : status;
}
