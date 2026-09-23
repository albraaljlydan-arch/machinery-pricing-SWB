import type { Locale } from '../stores/locale';
import type { ProjectStatus, UserRole, CustomerRequestStatus, ProjectEventType } from '../types';

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
    customer: 'زبون',

    // ---- Follow-up Engineer dashboard ----
    followupHomeTitle: 'تسجيل عمليات التشغيل',
    followupDesc: 'سجّل كل عملية تشغيل (ليزر، تشغيل CNC، خراطة، لحام، تجميع...) ونسبة الإنجاز اليومية لكل عامل.',
    colOperationType: 'نوع العملية',
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
    operationsProgressNav: 'تقدّم المصنع والمشتريات',
    mgmtUnifiedProgressDesc: 'شاهد إنجاز المتابعة والمشتريات يومياً والتقدّم التراكمي لكل ماكينة.',
    filterByDay: 'حسب اليوم',
    filterByMachine: 'حسب الماكينة',
    showAllDays: 'عرض كل الأيام',
    allMachines: 'كل الماكينات',
    followupEngineerDaily: 'إنجاز مهندس المتابعة',
    procurementEngineerDaily: 'إنجاز مهندس المشتريات',
    approvedEntries: 'سجل معتمد',
    purchasedPieces: 'قطعة مشتراة',
    machineProgressToDate: 'التقدّم التراكمي حسب الماكينة',
    machineProgressToDateDesc: 'ما تم إنجازه حتى الآن في المتابعة والمشتريات لكل ماكينة.',
    unifiedDailyProgress: 'الإنجاز اليومي الموحّد',
    unifiedDailyProgressDesc: 'سجل واحد يجمع عمل مهندس المتابعة ومهندس المشتريات.',
    noProgressForFilters: 'لا يوجد إنجاز معتمد مطابق لليوم والماكينة المحددين.',
    machineLabel: 'الماكينة',
    departmentLabel: 'القسم',
    engineerLabel: 'المهندس',
    achievementDetails: 'تفاصيل الإنجاز',
    dailyAchievement: 'إنجاز اليوم',
    cumulativeAchievement: 'الإنجاز حتى الآن',
    purchasedMaterials: 'شراء مواد',
    pieceUnit: 'قطعة',
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
    inviteUserBtn: '+ دعوة موظف',
    inviteUserTitle: 'دعوة موظف جديد',
    inviteUserHint: 'ستصل إلى الموظف رسالة بريد ليختار كلمة مروره بنفسه.',
    inviteSendBtn: 'إرسال الدعوة',
    inviteSentSuccess: '✅ أُرسلت الدعوة إلى بريد الموظف.',
    inviteSendErrorPrefix: 'تعذّر إرسال الدعوة: ',
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

    // ---- Factory approval workflow ----
    //  The worker roster is gone: progress is tracked per MACHINE, which is
    //  what both the factory and the Admin plan against. Its keys
    //  (workersTitle, noWorkersYet, colWorker…) were removed with it rather
    //  than left behind as dead entries.
    pendingApprovalTitle: 'الموافقة على طلبات المتابعة',
    approveAction: '✅ موافقة',
    rejectAction: '❌ رفض',
    noPendingEntries: 'لا توجد إدخالات بانتظار الموافقة.',
    entryApprovedSuccess: '✅ تمت الموافقة على الإدخال.',
    entryRejectedSuccess: '❌ تم رفض الإدخال.',
    entryActionErrorPrefix: 'حدث خطأ: ',
    factoryProgressByMachine: 'التقدم حسب الماكينة',
    dailyProgressTitle: 'سجل التقدم اليومي',
    searchByProject: 'ابحث بالمشروع',
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
    statusAwaitingProduction: 'قيد الانتظار',
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

    // ---- Admin dashboard widgets ----
    addWidgetBtn: 'إضافة عنصر',
    exportBtn: 'تصدير',
    addWidgetDrawerTitle: 'إضافة عنصر',
    vsLastMonth: 'مقارنة بالشهر الماضي',
    trendCardTitle: 'قيمة المشاريع المعتمدة',
    trendCurrentLabel: 'هذا الشهر',
    trendPreviousLabel: 'الشهر الماضي',
    workforceTitle: 'توزيع الفريق',
    workforceProduction: 'الإنتاج (المصنع والمتابعة)',
    workforceDesignProc: 'التصميم والمشتريات',
    workforceAdminAcc: 'الإدارة والمحاسبة',
    busiestDayTitle: 'أكثر الأيام نشاطًا',
    busiestDaySubtitle: 'عدد المشاريع الجديدة حسب يوم الأسبوع',
    completionRateTitle: 'نسبة الإنجاز الناجح',
    completionRateSub: 'مكتملة مقابل مرفوضة',
    topProjectsTitle: 'أعلى المشاريع قيمة',
    aiAssistantTitle: 'المساعد الذكي',
    aiAssistantDesc: 'مساعد ذكي لتحليل بيانات لوحة التحكم والإجابة عن أسئلتك.',
    aiAssistantComingSoon: 'سيتم تفعيل المساعد الذكي قريبًا.',
    tagAnalytics: 'تحليلات',
    widgetTrendDesc: 'رسم بياني لقيمة المشاريع المعتمدة يوميًا، مقارنةً بالفترة السابقة.',
    widgetWorkforceDesc: 'توزيع العاملين حسب القسم: الإنتاج، التصميم والمشتريات، الإدارة والمحاسبة.',
    widgetBusiestDesc: 'أكثر أيام الأسبوع استقبالًا لمشاريع جديدة.',
    widgetGaugeDesc: 'نسبة المشاريع المكتملة مقابل المرفوضة.',
    widgetTopProjectsDesc: 'أعلى خمسة مشاريع من حيث القيمة التقديرية.',

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

    // ---- Purchase requests (Procurement -> Factory approval) ----
    purchaseRequestsNav: 'مهام المشتريات',
    purchaseRequestsTitle: 'طلبات الشراء اليومية',
    purchaseRequestsDesc: 'حدّد اليوم أي مواد من مشروع "قيد التصنيع" تشتريها، وأرسلها للمصنع للموافقة. النسبة المئوية تُحسب تلقائيًا من عدد القطع.',
    purchaseRequestsEmpty: 'لا توجد أي مشاريع قيد التصنيع حاليًا.',
    colCumulativePercent: 'النسبة التراكمية',
    colTodayStatus: 'حالة اليوم',
    purchaseStatusNotSubmitted: 'لم تُرسل اليوم',
    purchaseStatusPending: 'بانتظار موافقة المصنع',
    purchaseStatusApprovedToday: 'تمت الموافقة اليوم',
    purchaseStatusRejectedToday: 'مرفوض — أعد الإرسال',
    backToPurchaseRequests: '← رجوع لطلبات الشراء',
    purchaseChecklistHint: 'حدّد بجانب كل سطر المواد التي تشتريها اليوم. الأسطر المؤكّدة من طلب سابق موافَق عليه تظهر محدّدة ومقفلة.',
    piecesTodayLabel: 'قطع اليوم',
    piecesCumulativeLabel: 'الإجمالي التراكمي',
    totalPiecesLabel: 'إجمالي قطع المشروع',
    sendToFactoryAction: '📤 إرسال للمصنع',
    noRowsSelectedError: 'حدّد سطرًا واحدًا على الأقل قبل الإرسال.',
    purchaseRequestSubmitted: '✅ تم إرسال طلب الشراء إلى المصنع.',
    purchaseRequestSubmitError: 'حدث خطأ أثناء الإرسال: ',
    awaitingFactoryApprovalNote: 'طلب اليوم بانتظار موافقة المصنع — سيُفتح جدول الاختيار من جديد بعد المعالجة.',

    // ---- Factory: approve purchase requests ----
    approvePurchaseRequestsNav: 'الموافقة على طلبات الشراء',
    approvePurchaseRequestsDesc: 'طلبات شراء المواد المُرسلة من المشتريات، بانتظار موافقة المصنع قبل اعتبارها مؤمَّنة.',
    noPendingPurchaseRequests: 'لا توجد طلبات شراء بانتظار الموافقة.',
    colPiecesToday: 'قطع اليوم',
    rejectionNotePlaceholder: 'سبب الرفض (اختياري)…',
    confirmRejectAction: 'تأكيد الرفض',
    cancelAction: 'إلغاء',

    // ---- Admin: purchase progress (read-only) ----
    purchaseProgressNav: 'تقدّم المشتريات',
    purchaseProgressDesc: 'طلبات الشراء التي وافق عليها المصنع — النسبة اليومية والتراكمية لكل مشروع.',
    mgmtPurchaseProgressDesc: 'تابع كم من مواد كل مشروع تم شراؤها فعليًا، يومًا بيوم، بعد موافقة المصنع.',
    todayLabel: 'اليوم',
    byPersonTitle: 'حسب الشخص (المشتريات)',
    colPersonName: 'الاسم',
    colTodayPieces: 'قطع اليوم',
    colAvgCumulative: 'متوسط النسبة التراكمية',

    // ---- Project detail pages ----
    //  These are the CHROME around the calculator: top bars, meta cards,
    //  notices, toasts, confirms. The calculator's own tables (column
    //  headers, material names, tab names) stay English by design — that is
    //  the shop-floor vocabulary — but nothing else on those screens has any
    //  reason to be, and it read as a bug when an English toast landed on an
    //  otherwise fully Arabic dashboard.
    backToDashboard: '← رجوع إلى لوحة التحكم',
    backToProjects: '← رجوع إلى المشاريع',
    couldNotLoadProject: 'تعذّر تحميل هذا المشروع.',
    noPermissionView: 'لا تملك صلاحية عرض هذا المشروع.',
    viewingLabel: 'معاينة:',
    reviewingLabel: 'مراجعة:',
    readOnlyStatusTemplate: 'للقراءة فقط — {status}',
    estimatedCostLabel: 'التكلفة التقديرية',
    submittedLabel: 'تاريخ الإرسال',

    // ---- Factory: project detail ----
    markAsFinishedAction: '✅ إنهاء التصنيع',
    confirmMarkFinishedTemplate: 'تحديد "{name}" كمكتمل التصنيع؟',
    markedFinishedToast: '✅ تم تحديد المشروع كمكتمل التصنيع.',
    couldNotUpdatePrefix: 'تعذّر التحديث: ',

    // ---- Designer: project detail ----
    submitToAdminAction: '📤 إرسال إلى المدير',
    submittingGeneric: 'جارٍ الإرسال…',
    draftSavedToast: '💾 تم حفظ المسودة.',
    draftSavedBeforeLeaving: '💾 تم حفظ تعديلاتك كمسودة قبل الخروج.',
    savedAsNameTemplate: '💾 تم الحفظ باسم "{name}" — لم يُعطَ اسم بعد، ويمكنك تغييره في أي وقت قبل الإرسال.',
    savedAsNameShortTemplate: '💾 تم الحفظ باسم "{name}" — لم يُعطَ اسم بعد، ويمكنك تغييره في أي وقت.',
    autoSaveErrorPrefix: 'خطأ في الحفظ التلقائي: ',
    errorSavingPrefix: 'حدث خطأ أثناء الحفظ: ',
    needRealNameBeforeSubmit: '⚠️ أعطِ المشروع اسمًا حقيقيًا قبل إرساله إلى المدير.',
    errorSubmittingPrefix: 'حدث خطأ أثناء الإرسال: ',
    saveDraftAction: '💾 حفظ المسودة',
    submittingToAdminConfirm: 'جارٍ الإرسال إلى المدير للمراجعة…',
    readOnlyLockedTemplate: '🔒 للقراءة فقط — الحالة: {status}',
    rejectNoticeTemplate: '🚫 رفض المدير هذا المشروع — {n} من السطور بحاجة إلى تصحيح. ابحث عن النقطة الحمراء على التبويب، ثم السطر المظلَّل داخله.',
    renderImageLabel: '🖼️ صورة المشروع المرندرة',
    renderImageHint: 'ارفع صورة مرندرة حلوة للمشروع بدل ما تبعت ملف الماكيت — لازم قبل الإرسال للمدير.',
    uploadImageAction: '📤 رفع صورة',
    replaceImageAction: '📤 تغيير الصورة',
    removeImageAction: '✕ إزالة',
    uploadingImage: 'جارٍ الرفع…',
    imageUploadedToast: '🖼️ تم رفع الصورة.',
    imageUploadErrorPrefix: 'خطأ برفع الصورة: ',
    needImageBeforeSubmit: '⚠️ ارفع صورة مرندرة للمشروع قبل إرساله إلى المدير.',

    // ---- Admin: review screen ----
    approveAndSendFactory: '✅ موافقة وإرسال إلى المصنع',
    rejectWithCountTemplate: '❌ رفض ({n} سطر معلَّم)',
    tickAtLeastOneRow: '⚠️ علّم سطرًا واحدًا على الأقل لتحديد ما يحتاج تصحيحًا قبل الرفض.',
    flagRowsHint: 'علّم المربع بجانب أي سطر في أي جدول أدناه، ثم اكتب السبب — سيرى المصمم هذا السطر وهذا السبب بالتحديد عند إعادة فتح المشروع.',

    // ---- Procurement: purchase file ----
    saveProgressAction: '💾 حفظ التقدّم',
    completeAndSendAccounting: '✅ إنهاء وإرسال إلى المحاسبة',
    resetFromSpecAction: '↺ إعادة التعيين من المواصفة',
    startBlankAction: '⌫ البدء من ملف فارغ',
    resetFromSpecTitle: 'إعادة نسخ صفوف المصمم مع تصفير كل الأسعار',
    startBlankTitle: 'حذف كل الصفوف والبدء من الصفر',
    purchaseFileTab: '🛒 ملف الشراء',
    purchaseFileTabSub: 'الأسعار الحقيقية — أنت من يعبّئها',
    designerEstimateTab: '📐 تقدير المصمم',
    designerEstimateTabSub: 'مرجع للقراءة فقط',
    unpricedRowsNoticeTemplate: '⚠ ما زال {n} من صفوف المواد بدون سعر للكيلوغرام — تظهر بعلامة "—" وتُحسب صفرًا في الإجمالي.',
    designerEstimateNotice: '👁️ ملف المصمم كما أرسله بالضبط — مُسعَّر من جدول أسعار المواد، أي أن هذه <strong>تقديرات</strong>. للقراءة فقط: يبقى كما هو مهما أدخلت في ملف الشراء.',
    designerEstimatedTotal: 'الإجمالي التقديري للمصمم',
    purchaseFileSaved: '💾 تم حفظ ملف الشراء.',
    errorCompletingPrefix: 'حدث خطأ أثناء الإنهاء: ',
    confirmResetFromSpec: 'استبدال ملف الشراء بنسخة جديدة من مواصفات المصمم؟ سيُمسح كل سعر أدخلته. تبقى الفواتير المسجّلة كما هي.',
    confirmStartBlank: 'تفريغ ملف الشراء بالكامل؟ سيُحذف كل صف وكل سعر. تبقى الفواتير المسجّلة كما هي.',
    unpricedBlockSendTemplate: '⚠️ ما زال {n} سطرًا بلا سعر حقيقي للكيلوغرام، وتُحسب قيمتها صفرًا. يجب إدخال جميع الأسعار الحقيقية قبل إرسال الملف إلى المحاسبة.',

    // ---- Accounting: purchase file preview ----
    readOnlyPreviewTag: '🔒 معاينة للقراءة فقط',
    noPurchaseFileYet: 'لم تُنشئ المشتريات ملف شراء لهذا المشروع بعد، فلا يوجد ما يُعاين. التقدير الظاهر في لوحة التحكم ما زال تقدير المصمم.',
    actualCostLabel: 'التكلفة الفعلية (المشتريات)',
    invoicesLoggedLabel: 'الفواتير المسجّلة',
    unpricedSentWarnTemplate: '⚠ أُرسل {n} من صفوف المواد بدون سعر للكيلوغرام. تُحسب صفرًا، أي أن الإجمالي أعلاه أقل من الحقيقي.',
    supplierInvoicesTitle: 'فواتير الموردين',
    colInvoiceNo: 'رقم الفاتورة',
    colInvoiceClient: 'الجهة / المحل',
    colInvoiceValue: 'القيمة',
    colInvoiceFile: 'الملف',
    openLinkLabel: 'فتح ↗',

    // ---- PDF export ----
    noDataToExport: 'لا توجد بيانات للتصدير.',
    pdfExportFailedPrefix: 'فشل تصدير PDF: ',

    // ---- Follow-up Engineer ----
    //  He may only report against machines the factory is CURRENTLY building.
    noProjectsInProduction: 'لا توجد ماكينات قيد التصنيع حاليًا',
    inProductionOnlyHint: 'تظهر هنا الماكينات قيد التصنيع فقط. إذا كانت القائمة فارغة، فلا يوجد ما يُسجَّل عليه اليوم.',
    loadProjectsErrorPrefix: 'تعذّر تحميل الماكينات: ',
    customOperationOption: '✍️ عملية مخصصة…',
    customOperationPlaceholder: 'اكتب اسم العملية',
    cancelCustomOperation: '↩ رجوع إلى القائمة',
    cancelCustomOperationTitle: 'إلغاء العملية المخصصة والرجوع إلى العمليات الجاهزة',
    customOperationNeedsName: 'اكتب اسم العملية المخصصة، أو ارجع إلى القائمة.',

    // ---- Factory: progress monitoring (its own copy of Admin's view) ----
    factoryOwnProgressDesc: 'العمليات التي وافقت عليها — هذا هو السجل الذي يصل إلى المدير.',

    // ---- Global search ----
    searchPeopleGroup: 'الأشخاص',
    searchProjectsGroup: 'الماكينات والمشاريع',
    searchNoResults: 'لا توجد نتائج مطابقة.',
    searchTypeToStart: 'اكتب حرفين على الأقل لبدء البحث.',
    searchAllResults: 'عرض جميع النتائج',
    searchResultsTitle: 'نتائج البحث',
    searchResultsForTemplate: 'نتائج البحث عن «{q}»',
    searchHitsCountTemplate: '{n} نتيجة',

    // ---- Person profile (Admin) ----
    personProfileTitle: 'ملف الموظف',
    viewProfileAction: 'عرض الملف',
    personProjectsCreated: 'المشاريع المُنشأة',
    personProjectsSubmitted: 'مرات التسليم',
    personProjectsApproved: 'المعتمدة',
    personProjectsRejected: 'المرفوضة',
    personAvgDelivery: 'متوسط مدة التسليم',
    personRejectionRate: 'نسبة الرفض',
    personDaysUnit: 'يوم',
    personNoProjects: 'لا توجد مشاريع مسجَّلة لهذا الموظف.',
    personRecentProjects: 'أحدث المشاريع',
    personActivityLog: 'سجلّ النشاط',
    personNoActivity: 'لا يوجد نشاط مسجَّل بعد.',
    backToSearch: 'عودة إلى النتائج',

    // ---- Machine 360 view (Admin) ----
    machineOverviewTitle: 'بطاقة الماكينة',
    machineTimeline: 'المسار الزمني',
    machineNoTimeline: 'لا توجد أحداث مسجَّلة لهذه الماكينة بعد.',
    machineEstimateVsActual: 'التقدير مقابل التكلفة الفعلية',
    machineEstimatedCost: 'التكلفة التقديرية',
    machineActualCost: 'التكلفة الفعلية',
    machineOperationsLog: 'عمليات التشغيل المسجَّلة',
    machineNoOperations: 'لا توجد عمليات تشغيل مسجَّلة.',
    machinePurchaseLog: 'طلبات الشراء',
    machineNoPurchases: 'لا توجد طلبات شراء مسجَّلة.',
    machineOpenFullReport: 'فتح التقرير الكامل',

    // ---- Project event labels (timeline) ----
    eventCreated: 'إنشاء المشروع',
    eventSubmitted: 'تسليم للمراجعة',
    eventApproved: 'اعتماد وإحالة إلى المصنع',
    eventRejected: 'رفض وإعادة للمصمم',
    eventProductionStarted: 'بدء التصنيع',
    eventProductionFinished: 'انتهاء التصنيع',
    eventCompleted: 'إغلاق وتسعير نهائي',
    eventFlaggedRowsTemplate: '{n} سطرًا بحاجة إلى تصحيح',
    startProductionAction: '⚙️ بدء التصنيع',
    startProductionConfirmTemplate: 'بدء تصنيع "{name}"؟',
    startedProductionToast: '⚙️ تم بدء التصنيع.',
    awaitingProductionQueueTitle: 'بانتظار بدء التصنيع',
    awaitingProductionEmpty: 'لا توجد ماكينات بانتظار بدء التصنيع.',
    progressLabel: 'التقدم',

    // ---- Customer intake: request status labels ----
    statusRequestNew: 'جديد',
    statusRequestAssigned: 'معيّن لمصمم',
    statusRequestRejected: 'مرفوض',
    statusRequestClosed: 'مغلق',

    // ---- Customer self-registration ----
    signupHeading: 'إنشاء حساب زبون',
    signupFullNameLabel: 'الاسم الكامل',
    signupCompanyLabel: 'اسم الشركة (اختياري)',
    signupPhoneLabel: 'رقم الهاتف',
    signupPhoneHint: 'يُرجى التأكد من أنّ هذا الرقم مفعَّل على واتساب.',
    signupSubmit: 'إنشاء الحساب',
    signupSubmitting: 'جارٍ إنشاء الحساب…',
    signupErrorPrefix: 'تعذّر إنشاء الحساب: ',
    signupCheckEmailNotice: 'تم إنشاء الحساب. يرجى تفقد بريدك الإلكتروني لتأكيده ثم تسجيل الدخول.',
    signupHaveAccountLink: 'لديك حساب؟ تسجيل الدخول',
    loginNoAccountLink: 'زبون جديد؟ إنشاء حساب',

    // ---- Customer dashboard ----
    myRequests: 'طلباتي',
    newRequestBtn: 'طلب جديد',
    requestsCountSuffix: 'طلب',
    noRequestsYet: 'لا توجد طلبات بعد.',
    colRequestTitle: 'عنوان الطلب',
    colMachineType: 'نوع الماكينة',
    newRequestTitle: 'طلب جديد',
    machineTypeLabel: 'نوع الماكينة',
    quantityLabel: 'الكمية',
    descriptionLabel: 'وصف ومواصفات مبدئية',
    submitRequestBtn: 'إرسال الطلب',
    requestSubmittedSuccess: 'تم إرسال الطلب بنجاح.',
    requestSubmitErrorPrefix: 'تعذّر إرسال الطلب: ',
    notAssignedYet: 'لم يتم تعيين مصمم بعد.',
    backToRequests: 'عودة إلى الطلبات',
    specDetailsLabel: 'المواصفات المبدئية',

    // ---- Factory: customer requests ----
    customerRequestsNav: 'طلبات الزبائن',
    assignDesignerLabel: 'تعيين مصمم',
    selectDesignerPlaceholder: 'اختر مصممًا',
    assignBtn: 'تعيين',
    assignedSuccessToast: 'تم تعيين المصمم بنجاح.',
    assignErrorPrefix: 'تعذّر التعيين: ',
    rejectRequestBtn: 'رفض الطلب',
    factoryNoteLabel: 'ملاحظة المصنع (اختياري)',
    noRequestsPlain: 'لا توجد طلبات.',

    // ---- Designer: assigned requests ----
    assignedRequestsNav: 'الطلبات المعيّنة لي',

    // ---- Customer/Designer chat ----
    chatTitle: 'المحادثة',
    chatMessagePlaceholder: 'اكتب رسالة…',
    sendBtn: 'إرسال',
    noMessagesYet: 'لا توجد رسائل بعد.',
    chatAvailableAfterAssignment: 'ستتوفر المحادثة بعد تعيين مصمم لهذا الطلب.',
    youLabel: 'أنت',

    // ---- Sign-in screen ----
    loginHeading: 'تسجيل الدخول إلى حسابك',
    loginEmailLabel: 'البريد الإلكتروني',
    loginPasswordLabel: 'كلمة المرور',
    loginSubmit: 'تسجيل الدخول',
    loginSubmitting: 'جارٍ تسجيل الدخول…',
    acceptInviteHeading: 'إعداد حساب الموظف',
    acceptInviteDescription: 'اختر كلمة مرور لحسابك لإكمال قبول الدعوة.',
    inviteInvalidLink: 'رابط الدعوة غير صالح أو انتهت صلاحيته. اطلب دعوة جديدة من المصنع.',
    inviteMissingRole: 'لم يُربط هذا الحساب بدور موظف. اطلب من المصنع إعادة الدعوة.',
    invitePasswordLabel: 'كلمة المرور الجديدة',
    inviteConfirmPasswordLabel: 'تأكيد كلمة المرور',
    invitePasswordShort: 'استخدم 8 أحرف على الأقل.',
    invitePasswordMismatch: 'كلمتا المرور غير متطابقتين.',
    inviteSetPasswordButton: 'حفظ كلمة المرور',
    inviteSavingPassword: 'جارٍ الحفظ…',
    invitePasswordSet: 'تم إعداد الحساب. يمكنك تسجيل الدخول الآن.',
    inviteBackToLogin: 'العودة إلى تسجيل الدخول',

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
    customer: 'Customer',

    // ---- Follow-up Engineer dashboard ----
    followupHomeTitle: 'Log Operations',
    followupDesc: "Log every operation (laser cutting, CNC machining, turning, welding, assembly...) and each worker's daily completion percentage.",
    colOperationType: 'Operation',
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
    operationsProgressNav: 'Factory & Purchase Progress',
    mgmtUnifiedProgressDesc: 'See daily follow-up and procurement output with cumulative progress for every machine.',
    filterByDay: 'By day',
    filterByMachine: 'By machine',
    showAllDays: 'Show all days',
    allMachines: 'All machines',
    followupEngineerDaily: 'Follow-up engineer output',
    procurementEngineerDaily: 'Procurement engineer output',
    approvedEntries: 'approved entries',
    purchasedPieces: 'purchased pieces',
    machineProgressToDate: 'Cumulative progress by machine',
    machineProgressToDateDesc: 'Work completed to date in follow-up and procurement for every machine.',
    unifiedDailyProgress: 'Unified daily progress',
    unifiedDailyProgressDesc: 'One log combining the Follow-up and Procurement engineers work.',
    noProgressForFilters: 'No approved progress matches the selected day and machine.',
    machineLabel: 'Machine',
    departmentLabel: 'Department',
    engineerLabel: 'Engineer',
    achievementDetails: 'Achievement details',
    dailyAchievement: 'Daily progress',
    cumulativeAchievement: 'Progress to date',
    purchasedMaterials: 'Material purchasing',
    pieceUnit: 'pcs',
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
    inviteUserBtn: '+ Invite Staff',
    inviteUserTitle: 'Invite New Staff Member',
    inviteUserHint: 'The staff member will receive an email and choose their own password.',
    inviteSendBtn: 'Send Invitation',
    inviteSentSuccess: '✅ Invitation sent to the staff member.',
    inviteSendErrorPrefix: 'Could not send invitation: ',
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

    // ---- Factory approval workflow ----
    pendingApprovalTitle: 'Approve Follow-up Requests',
    approveAction: '✅ Approve',
    rejectAction: '❌ Reject',
    noPendingEntries: 'No entries pending approval.',
    entryApprovedSuccess: '✅ Entry approved.',
    entryRejectedSuccess: '❌ Entry rejected.',
    entryActionErrorPrefix: 'Error: ',
    factoryProgressByMachine: 'Progress by Machine',
    dailyProgressTitle: 'Daily Progress Log',
    searchByProject: 'Search by project',
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
    statusAwaitingProduction: 'Awaiting Production',
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

    // ---- Admin dashboard widgets ----
    addWidgetBtn: 'Add Widget',
    exportBtn: 'Export',
    addWidgetDrawerTitle: 'Add Widget',
    vsLastMonth: 'vs last month',
    trendCardTitle: 'Approved Project Value',
    trendCurrentLabel: 'This month',
    trendPreviousLabel: 'Last month',
    workforceTitle: 'Workforce',
    workforceProduction: 'Production (Factory & Follow-up)',
    workforceDesignProc: 'Design & Procurement',
    workforceAdminAcc: 'Admin & Accounting',
    busiestDayTitle: 'Busiest Day',
    busiestDaySubtitle: 'New projects by weekday',
    completionRateTitle: 'Successful Completion Rate',
    completionRateSub: 'Completed vs rejected',
    topProjectsTitle: 'Top Projects by Value',
    aiAssistantTitle: 'AI Assistant',
    aiAssistantDesc: 'A smart assistant to analyze your dashboard data and answer your questions.',
    aiAssistantComingSoon: 'The AI assistant will be enabled soon.',
    tagAnalytics: 'Analytics',
    widgetTrendDesc: 'Daily approved project value, compared with the previous period.',
    widgetWorkforceDesc: 'Staff breakdown by department: production, design & procurement, admin & accounting.',
    widgetBusiestDesc: 'Which weekday receives the most new projects.',
    widgetGaugeDesc: 'Share of completed projects vs rejected ones.',
    widgetTopProjectsDesc: 'The five highest-value projects by estimated cost.',

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

    // ---- Purchase requests (Procurement -> Factory approval) ----
    purchaseRequestsNav: 'Procurement Tasks',
    purchaseRequestsTitle: 'Daily Purchase Requests',
    purchaseRequestsDesc: 'Pick which materials from an "In Production" project you’re buying today, and send them to the factory for approval. The percentage is computed automatically from piece counts.',
    purchaseRequestsEmpty: 'No projects are currently in production.',
    colCumulativePercent: 'Cumulative %',
    colTodayStatus: "Today's Status",
    purchaseStatusNotSubmitted: 'Not submitted today',
    purchaseStatusPending: 'Awaiting factory approval',
    purchaseStatusApprovedToday: 'Approved today',
    purchaseStatusRejectedToday: 'Rejected — resubmit',
    backToPurchaseRequests: '← Back to Purchase Requests',
    purchaseChecklistHint: 'Check the materials you are buying today next to each row. Rows already approved in a previous request show checked and locked.',
    piecesTodayLabel: 'Pieces today',
    piecesCumulativeLabel: 'Cumulative total',
    totalPiecesLabel: 'Total project pieces',
    sendToFactoryAction: '📤 Send to Factory',
    noRowsSelectedError: 'Select at least one row before sending.',
    purchaseRequestSubmitted: '✅ Purchase request sent to the factory.',
    purchaseRequestSubmitError: 'Error sending request: ',
    awaitingFactoryApprovalNote: "Today's request is awaiting factory approval — the checklist reopens once it's handled.",

    // ---- Factory: approve purchase requests ----
    approvePurchaseRequestsNav: 'Approve Purchase Requests',
    approvePurchaseRequestsDesc: 'Material purchase requests submitted by Procurement, awaiting factory approval before they count as secured.',
    noPendingPurchaseRequests: 'No purchase requests pending approval.',
    colPiecesToday: 'Pieces Today',
    rejectionNotePlaceholder: 'Reason for rejection (optional)…',
    confirmRejectAction: 'Confirm Reject',
    cancelAction: 'Cancel',

    // ---- Admin: purchase progress (read-only) ----
    purchaseProgressNav: 'Purchase Progress',
    purchaseProgressDesc: "Purchase requests the factory has approved — each project's daily and cumulative percentage.",
    mgmtPurchaseProgressDesc: 'Track how much of each project’s materials have actually been purchased, day by day, once the factory approves.',
    todayLabel: 'Today',
    byPersonTitle: 'By Person (Procurement)',
    colPersonName: 'Name',
    colTodayPieces: 'Pieces Today',
    colAvgCumulative: 'Avg. Cumulative %',

    // ---- Project detail pages ----
    backToDashboard: '← Back to Dashboard',
    backToProjects: '← Back to Projects',
    couldNotLoadProject: 'Could not load this project.',
    noPermissionView: "You don't have permission to view this project.",
    viewingLabel: 'Viewing:',
    reviewingLabel: 'Reviewing:',
    readOnlyStatusTemplate: 'Read-only — {status}',
    estimatedCostLabel: 'Estimated Cost',
    submittedLabel: 'Submitted',

    // ---- Factory: project detail ----
    markAsFinishedAction: '✅ Mark as Finished',
    confirmMarkFinishedTemplate: 'Mark "{name}" as finished?',
    markedFinishedToast: '✅ Marked as finished.',
    couldNotUpdatePrefix: 'Could not update: ',

    // ---- Designer: project detail ----
    submitToAdminAction: '📤 Submit to Admin',
    submittingGeneric: 'Submitting…',
    draftSavedToast: '💾 Draft saved.',
    draftSavedBeforeLeaving: '💾 Your changes were saved as a draft before leaving.',
    savedAsNameTemplate: '💾 Saved as "{name}" — no name was given yet; you can rename it anytime before submitting.',
    savedAsNameShortTemplate: '💾 Saved as "{name}" — no name was given yet; you can rename it anytime.',
    autoSaveErrorPrefix: 'Auto-save error: ',
    errorSavingPrefix: 'Error saving: ',
    needRealNameBeforeSubmit: '⚠️ Please give the project a real name before submitting it to Admin.',
    errorSubmittingPrefix: 'Error submitting: ',
    saveDraftAction: '💾 Save Draft',
    submittingToAdminConfirm: 'Submitting to Admin for review…',
    readOnlyLockedTemplate: '🔒 Read-only — status is {status}',
    rejectNoticeTemplate: '🚫 Admin rejected this project — {n} row(s) need fixing. Look for the red dot on the tab, then the highlighted row inside it.',
    renderImageLabel: '🖼️ Rendered Project Image',
    renderImageHint: 'Upload a nice rendered image of the project instead of sending the raw mockup file — required before submitting to Admin.',
    uploadImageAction: '📤 Upload Image',
    replaceImageAction: '📤 Replace Image',
    removeImageAction: '✕ Remove',
    uploadingImage: 'Uploading…',
    imageUploadedToast: '🖼️ Image uploaded.',
    imageUploadErrorPrefix: 'Error uploading image: ',
    needImageBeforeSubmit: '⚠️ Please upload a rendered project image before submitting it to Admin.',

    // ---- Admin: review screen ----
    approveAndSendFactory: '✅ Approve & Send to Factory',
    rejectWithCountTemplate: '❌ Reject ({n} flagged)',
    tickAtLeastOneRow: '⚠️ Please tick at least one row above to mark what needs fixing before rejecting.',
    flagRowsHint: 'Tick the box on any row, in any table below, then write why — the Designer will see exactly that row and reason when they reopen it.',

    // ---- Procurement: purchase file ----
    saveProgressAction: '💾 Save Progress',
    completeAndSendAccounting: '✅ Complete & Send to Accounting',
    resetFromSpecAction: '↺ Reset from Spec',
    startBlankAction: '⌫ Start Blank',
    resetFromSpecTitle: "Re-copy the designer's rows and clear all prices",
    startBlankTitle: 'Remove every row and start from nothing',
    purchaseFileTab: '🛒 Purchase File',
    purchaseFileTabSub: 'Real prices — yours to fill in',
    designerEstimateTab: '📐 Designer Estimate',
    designerEstimateTabSub: 'Read-only reference',
    unpricedRowsNoticeTemplate: '⚠ {n} material row(s) still have no $/kg — they show “—” and count as $0 in the total.',
    designerEstimateNotice:
      "👁️ The designer's own file, exactly as submitted — priced from the material price table, so these are <strong>estimates</strong>. Read-only: it stays untouched no matter what you enter in the purchase file.",
    designerEstimatedTotal: "Designer's Estimated Total",
    purchaseFileSaved: '💾 Purchase file saved.',
    errorCompletingPrefix: 'Error completing: ',
    confirmResetFromSpec: "Replace the purchase file with a fresh copy of the designer's specs? Every price you have entered will be cleared. Logged invoices are kept.",
    confirmStartBlank: 'Empty the purchase file completely? Every row and price will be removed. Logged invoices are kept.',
    unpricedBlockSendTemplate: '⚠️ {n} row(s) still have no $/kg entered, so they count as $0. Fill in every real price before sending this file to Accounting.',

    // ---- Accounting: purchase file preview ----
    readOnlyPreviewTag: '🔒 Read-only preview',
    noPurchaseFileYet: "Procurement has not created a purchase file for this project yet, so there is nothing to preview. The estimate on the dashboard is still the designer's.",
    actualCostLabel: 'Actual Cost (Procurement)',
    invoicesLoggedLabel: 'Invoices Logged',
    unpricedSentWarnTemplate: '⚠ {n} material row(s) were sent with no $/kg entered. They count as $0, so the total above is understated.',
    supplierInvoicesTitle: 'Supplier Invoices',
    colInvoiceNo: 'Invoice #',
    colInvoiceClient: 'Client / Shop',
    colInvoiceValue: 'Value',
    colInvoiceFile: 'File',
    openLinkLabel: 'Open ↗',

    // ---- PDF export ----
    noDataToExport: 'No data to export.',
    pdfExportFailedPrefix: 'PDF export failed: ',

    // ---- Follow-up Engineer ----
    noProjectsInProduction: 'No machines are currently in production',
    inProductionOnlyHint: 'Only machines currently in production appear here. An empty list means there is nothing to log against today.',
    loadProjectsErrorPrefix: 'Could not load machines: ',
    customOperationOption: '✍️ Custom operation…',
    customOperationPlaceholder: 'Type the operation name',
    cancelCustomOperation: '↩ Back to the list',
    cancelCustomOperationTitle: 'Discard the custom operation and go back to the preset list',
    customOperationNeedsName: 'Type a name for the custom operation, or go back to the list.',

    // ---- Factory: progress monitoring (its own copy of Admin's view) ----
    factoryOwnProgressDesc: 'The operations you have approved — this is the log that reaches the Admin.',

    // ---- Global search ----
    searchPeopleGroup: 'People',
    searchProjectsGroup: 'Machines & Projects',
    searchNoResults: 'No matching results.',
    searchTypeToStart: 'Type at least two characters to search.',
    searchAllResults: 'View all results',
    searchResultsTitle: 'Search Results',
    searchResultsForTemplate: 'Results for “{q}”',
    searchHitsCountTemplate: '{n} result(s)',

    // ---- Person profile (Admin) ----
    personProfileTitle: 'Employee Profile',
    viewProfileAction: 'View Profile',
    personProjectsCreated: 'Projects Created',
    personProjectsSubmitted: 'Submissions',
    personProjectsApproved: 'Approved',
    personProjectsRejected: 'Rejected',
    personAvgDelivery: 'Avg. Delivery Time',
    personRejectionRate: 'Rejection Rate',
    personDaysUnit: 'days',
    personNoProjects: 'No projects recorded for this employee.',
    personRecentProjects: 'Recent Projects',
    personActivityLog: 'Activity Log',
    personNoActivity: 'No recorded activity yet.',
    backToSearch: 'Back to results',

    // ---- Machine 360 view (Admin) ----
    machineOverviewTitle: 'Machine Card',
    machineTimeline: 'Timeline',
    machineNoTimeline: 'No events recorded for this machine yet.',
    machineEstimateVsActual: 'Estimate vs. Actual Cost',
    machineEstimatedCost: 'Estimated Cost',
    machineActualCost: 'Actual Cost',
    machineOperationsLog: 'Logged Operations',
    machineNoOperations: 'No operations logged.',
    machinePurchaseLog: 'Purchase Requests',
    machineNoPurchases: 'No purchase requests recorded.',
    machineOpenFullReport: 'Open full report',

    // ---- Project event labels (timeline) ----
    eventCreated: 'Project created',
    eventSubmitted: 'Submitted for review',
    eventApproved: 'Approved and sent to factory',
    eventRejected: 'Rejected, returned to designer',
    eventProductionStarted: 'Production started',
    eventProductionFinished: 'Manufacturing finished',
    eventCompleted: 'Closed and finally priced',
    eventFlaggedRowsTemplate: '{n} row(s) need fixing',
    startProductionAction: '⚙️ Start Production',
    startProductionConfirmTemplate: 'Start production on "{name}"?',
    startedProductionToast: '⚙️ Production started.',
    awaitingProductionQueueTitle: 'Awaiting Production Start',
    awaitingProductionEmpty: 'No machines awaiting production start.',
    progressLabel: 'Progress',

    // ---- Customer intake: request status labels ----
    statusRequestNew: 'New',
    statusRequestAssigned: 'Assigned',
    statusRequestRejected: 'Rejected',
    statusRequestClosed: 'Closed',

    // ---- Customer self-registration ----
    signupHeading: 'Create a Customer Account',
    signupFullNameLabel: 'Full Name',
    signupCompanyLabel: 'Company Name (optional)',
    signupPhoneLabel: 'Phone Number',
    signupPhoneHint: 'Make sure this number is reachable on WhatsApp.',
    signupSubmit: 'Create Account',
    signupSubmitting: 'Creating account…',
    signupErrorPrefix: 'Could not create the account: ',
    signupCheckEmailNotice: 'Account created. Please check your email to confirm it, then sign in.',
    signupHaveAccountLink: 'Already have an account? Sign in',
    loginNoAccountLink: 'New customer? Create an account',

    // ---- Customer dashboard ----
    myRequests: 'My Requests',
    newRequestBtn: 'New Request',
    requestsCountSuffix: 'requests',
    noRequestsYet: 'No requests yet.',
    colRequestTitle: 'Request Title',
    colMachineType: 'Machine Type',
    newRequestTitle: 'New Request',
    machineTypeLabel: 'Machine Type',
    quantityLabel: 'Quantity',
    descriptionLabel: 'Description / Initial Specs',
    submitRequestBtn: 'Submit Request',
    requestSubmittedSuccess: 'Request submitted successfully.',
    requestSubmitErrorPrefix: 'Could not submit the request: ',
    notAssignedYet: 'No designer assigned yet.',
    backToRequests: 'Back to Requests',
    specDetailsLabel: 'Initial Specs',

    // ---- Factory: customer requests ----
    customerRequestsNav: 'Customer Requests',
    assignDesignerLabel: 'Assign Designer',
    selectDesignerPlaceholder: 'Select a designer',
    assignBtn: 'Assign',
    assignedSuccessToast: 'Designer assigned successfully.',
    assignErrorPrefix: 'Could not assign: ',
    rejectRequestBtn: 'Reject Request',
    factoryNoteLabel: 'Factory note (optional)',
    noRequestsPlain: 'No requests.',

    // ---- Designer: assigned requests ----
    assignedRequestsNav: 'Requests Assigned to Me',

    // ---- Customer/Designer chat ----
    chatTitle: 'Chat',
    chatMessagePlaceholder: 'Type a message…',
    sendBtn: 'Send',
    noMessagesYet: 'No messages yet.',
    chatAvailableAfterAssignment: 'Chat will be available once a designer is assigned to this request.',
    youLabel: 'You',

    // ---- Sign-in screen ----
    loginHeading: 'Sign in to your account',
    loginEmailLabel: 'Email address',
    loginPasswordLabel: 'Password',
    loginSubmit: 'Sign In',
    loginSubmitting: 'Signing in…',
    acceptInviteHeading: 'Set Up Your Staff Account',
    acceptInviteDescription: 'Choose a password to finish accepting your invitation.',
    inviteInvalidLink: 'This invitation link is invalid or has expired. Ask Factory for a new invitation.',
    inviteMissingRole: 'This account has no staff role. Ask Factory to send the invitation again.',
    invitePasswordLabel: 'New password',
    inviteConfirmPasswordLabel: 'Confirm password',
    invitePasswordShort: 'Use at least 8 characters.',
    invitePasswordMismatch: 'The passwords do not match.',
    inviteSetPasswordButton: 'Save password',
    inviteSavingPassword: 'Saving…',
    invitePasswordSet: 'Your account is ready. You can sign in now.',
    inviteBackToLogin: 'Back to sign in',

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

const ROLE_KEY: Record<UserRole, DictKey> = {
  admin: 'admin',
  designer: 'designer',
  factory: 'factory',
  procurement: 'procurement',
  accounting: 'accounting',
  followup: 'followup',
  developer: 'developer',
  customer: 'customer',
};

/** Translated name of a role. Used for the sidebar tag and profile chip, so
 *  those read the SIGNED-IN user's role.
 *
 *  Each dashboard layout used to hand AppShell a hardcoded label for its own
 *  section — `roleLabel={t($locale, 'admin')}` in admin/+layout, and so on.
 *  That was fine only as long as nobody could open a section that wasn't
 *  theirs; the moment they could, the profile chip confidently displayed
 *  "accounting@swb.com / المدير". The label was describing the URL, not the
 *  person. */
export function roleLabel(loc: Locale, role: UserRole | null): string {
  if (!role) return '';
  return t(loc, ROLE_KEY[role]);
}

const STATUS_KEY: Record<ProjectStatus, DictKey> = {
  Draft: 'statusDraft',
  'Pending Admin': 'statusPendingAdmin',
  'Awaiting Production': 'statusAwaitingProduction',
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

const REQUEST_STATUS_KEY: Record<CustomerRequestStatus, DictKey> = {
  New: 'statusRequestNew',
  Assigned: 'statusRequestAssigned',
  Rejected: 'statusRequestRejected',
  Closed: 'statusRequestClosed',
};

/** Translated display label for a raw customer_requests.status value. */
export function requestStatusLabel(loc: Locale, status: string): string {
  const key = REQUEST_STATUS_KEY[status as CustomerRequestStatus];
  return key ? t(loc, key) : status;
}

const EVENT_KEY: Record<ProjectEventType, DictKey> = {
  created: 'eventCreated',
  submitted: 'eventSubmitted',
  approved: 'eventApproved',
  rejected: 'eventRejected',
  production_started: 'eventProductionStarted',
  production_finished: 'eventProductionFinished',
  completed: 'eventCompleted',
};

/** Translated label for one project_events row type — used by Admin's machine
 *  timeline and the per-person activity log. */
export function eventLabel(loc: Locale, eventType: string): string {
  const key = EVENT_KEY[eventType as ProjectEventType];
  return key ? t(loc, key) : eventType;
}
