import type { Locale } from '../stores/locale';

// ============================================================================
//  NOTIFICATION TEXT — TRANSLATED AT READ TIME, NOT WRITE TIME
//
//  Notifications used to be composed as finished English sentences and
//  INSERTed into notifications.message, e.g.
//      `Your project "Gearbox" was approved and sent to the factory.`
//  That put untranslatable English inside the database: the bell panel had
//  no way to show it in Arabic, because by the time it was read the sentence
//  had already been built. It also meant a recipient's language was decided
//  by whoever happened to trigger the event.
//
//  So the row now stores a small structured payload instead of prose, and
//  the sentence is composed when it is DISPLAYED, in the reader's own
//  language. Same text column, no migration needed.
//
//  renderNotification() is deliberately tolerant: rows written before this
//  change hold plain English prose, which is returned verbatim rather than
//  showing an error or a blank line.
// ============================================================================

export type NotifKey =
  | 'projectSubmitted'
  | 'projectApproved'
  | 'projectRejected'
  | 'manufacturingFinished'
  | 'progressPendingApproval'
  | 'progressApproved'
  | 'progressRejected'
  | 'purchaseRequestPendingApproval'
  | 'purchaseRequestApproved'
  | 'purchaseRequestRejected'
  | 'newCustomerRequest'
  | 'designerAssignedToYou'
  | 'designerAssignedToRequest'
  | 'designerAssignedNotifyAdmin'
  | 'newChatMessage';

interface NotifPayload {
  /** Short marker so a payload row is unmistakable next to legacy prose. */
  k: NotifKey;
  p?: Record<string, string | number>;
}

type Template = (p: Record<string, string | number>) => string;

const TEMPLATES: Record<Locale, Record<NotifKey, Template>> = {
  ar: {
    projectSubmitted: (p) => `تم إرسال مشروع جديد للمراجعة: «${p.name}».`,
    projectApproved: (p) => `تمت الموافقة على مشروعك «${p.name}» وإحالته إلى المصنع.`,
    projectRejected: (p) => `تم رفض مشروعك «${p.name}» — ${p.count} من السطور بحاجة إلى تصحيح.`,
    manufacturingFinished: (p) => `انتهى تصنيع «${p.name}» وأصبح جاهزًا للتسعير.`,
    progressPendingApproval: (p) => `إدخال تقدُّم جديد على «${p.name}» بانتظار موافقتك.`,
    progressApproved: (p) => `تمت الموافقة على إدخال التقدُّم الخاص بـ «${p.name}».`,
    progressRejected: (p) => `تم رفض إدخال التقدُّم الخاص بـ «${p.name}».`,
    purchaseRequestPendingApproval: (p) => `طلب شراء جديد على «${p.name}» بانتظار موافقتك.`,
    purchaseRequestApproved: (p) => `تمت الموافقة على طلب الشراء الخاص بـ «${p.name}».`,
    purchaseRequestRejected: (p) => `تم رفض طلب الشراء الخاص بـ «${p.name}».`,
    newCustomerRequest: (p) => `طلب زبون جديد: «${p.name}».`,
    designerAssignedToYou: (p) => `تم تعيينك مصممًا لطلب «${p.name}».`,
    designerAssignedToRequest: (p) => `تم تعيين مصمم لطلبك «${p.name}».`,
    designerAssignedNotifyAdmin: (p) => `المصنع عيّن ${p.designer} مصممًا لطلب «${p.name}».`,
    newChatMessage: (p) => `رسالة جديدة بخصوص «${p.name}».`,
  },
  en: {
    projectSubmitted: (p) => `New project "${p.name}" was submitted for review.`,
    projectApproved: (p) => `Your project "${p.name}" was approved and sent to the factory.`,
    projectRejected: (p) => `Your project "${p.name}" was rejected — ${p.count} row(s) need fixing.`,
    manufacturingFinished: (p) => `"${p.name}" has finished manufacturing and is ready for pricing.`,
    progressPendingApproval: (p) => `A new progress entry for "${p.name}" is pending your approval.`,
    progressApproved: (p) => `The progress entry for "${p.name}" was approved.`,
    progressRejected: (p) => `The progress entry for "${p.name}" was rejected.`,
    purchaseRequestPendingApproval: (p) => `A new purchase request for "${p.name}" is pending your approval.`,
    purchaseRequestApproved: (p) => `The purchase request for "${p.name}" was approved.`,
    purchaseRequestRejected: (p) => `The purchase request for "${p.name}" was rejected.`,
    newCustomerRequest: (p) => `New customer request: "${p.name}".`,
    designerAssignedToYou: (p) => `You were assigned as designer for the request "${p.name}".`,
    designerAssignedToRequest: (p) => `A designer was assigned to your request "${p.name}".`,
    designerAssignedNotifyAdmin: (p) => `Factory assigned ${p.designer} as designer for the request "${p.name}".`,
    newChatMessage: (p) => `New message about "${p.name}".`,
  },
};

/** Builds the value to store in notifications.message. */
export function encodeNotification(key: NotifKey, params: Record<string, string | number> = {}): string {
  return JSON.stringify({ k: key, p: params } satisfies NotifPayload);
}

/** Turns a stored message into a sentence in the reader's language.
 *  Anything that isn't a recognised payload — legacy English prose, or a
 *  key this build doesn't know — is passed straight through, so the panel
 *  always shows something readable. */
export function renderNotification(loc: Locale, message: string): string {
  if (!message) return '';
  const trimmed = message.trim();
  if (!trimmed.startsWith('{')) return message;
  try {
    const parsed = JSON.parse(trimmed) as NotifPayload;
    const template = TEMPLATES[loc]?.[parsed?.k];
    if (!template) return message;
    return template(parsed.p ?? {});
  } catch {
    return message;
  }
}
