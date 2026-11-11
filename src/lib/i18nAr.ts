import { UAE_CONTACTS } from "@/data/uaeContacts";

// Arabic interface text, keyed by the English text (see i18n.ts). Written for this app and not yet
// reviewed by a native speaker; the interface says so while Arabic is on (ArabicNote.tsx).
// Interface text only: offer text, quoted evidence, the reply draft and official names in English
// are never looked up here. Numbers stay as Western digits, and counts use "label: N" wording where
// Arabic plural forms would otherwise change with the number. No entry claims an offer, sender or
// company is safe, real or checked by an authority.
const ENTRIES: Record<string, string> = {
  // Shell, navigation and page states
  "Analyzer": "المحلل",
  "Radar": "الرادار",
  "Portals": "البوابات",
  "Vault": "الخزنة",
  "Legal": "الإرشادات",
  "Main": "التنقل الرئيسي",
  "Main (compact)": "التنقل الرئيسي (مختصر)",
  "Arabic": "العربية",
  "English": "الإنجليزية",
  "Fixed rules, no AI scoring": "قواعد ثابتة، دون تقييم بالذكاء الاصطناعي",
  "UAE Hotlines": "أرقام الإمارات الساخنة",
  "UAE hotlines": "أرقام الإمارات الساخنة",
  "Official UAE hotlines": "الأرقام الساخنة الرسمية في الإمارات",
  "UAE job offer scam check": "فحص عروض العمل الاحتيالية في الإمارات",
  "Loading": "جارٍ التحميل",
  "Page not found": "الصفحة غير موجودة",
  "There is no page at this address.": "لا توجد صفحة على هذا العنوان.",
  "Go to the offer check": "انتقل إلى فحص العرض",
  "Something went wrong": "حدث خطأ",
  "This page could not be shown. Offer Check did not save your text.":
    "تعذّر عرض هذه الصفحة. لم يحفظ Offer Check النص الذي أدخلته.",
  "Offer Check could not be shown. Offer Check did not save your text.":
    "تعذّر عرض Offer Check. لم يحفظ Offer Check النص الذي أدخلته.",
  "Try again": "أعد المحاولة",
  "The Arabic text has not been reviewed by a native speaker. Offer text, quoted words and official names are shown as written.":
    "لم يراجع النص العربي متحدثٌ أصلي باللغة العربية. يُعرض نص العرض والكلمات المقتبسة والأسماء الرسمية كما كُتبت.",
  "Official places to confirm and to report": "الجهات الرسمية للتأكد والإبلاغ",
  "Official portals": "البوابات الرسمية",
  "Report fraud": "الإبلاغ عن احتيال",
  "Dubai Police eCrime": "منصة الجرائم الإلكترونية لشرطة دبي",
  "Dubai Police eCrime ({0})": "منصة الجرائم الإلكترونية لشرطة دبي ({0})",
  "Dubai Police eCrime website": "موقع منصة الجرائم الإلكترونية لشرطة دبي",
  "UAE Government: where to report cybercrime (lists Aman, Abu Dhabi Police)":
    "حكومة الإمارات: أين تبلّغ عن الجرائم الإلكترونية (تذكر خدمة أمان، شرطة أبوظبي)",
  "UAE Government: where to report cybercrime (lists the MoI eCrimes platform)":
    "حكومة الإمارات: أين تبلّغ عن الجرائم الإلكترونية (تذكر منصة الجرائم الإلكترونية لوزارة الداخلية)",
  "Offer Check does not report anything for you and does not give legal advice. These are official UAE channels; use the official page for current details.":
    "لا يبلّغ Offer Check عن أي شيء نيابةً عنك ولا يقدّم استشارة قانونية. هذه قنوات رسمية في الإمارات؛ ارجع إلى الصفحة الرسمية لمعرفة التفاصيل الحالية.",
  "A free, rule-based check for warning signs in UAE job offers.":
    "فحص مجاني قائم على قواعد ثابتة لعلامات التحذير في عروض العمل في الإمارات.",
  "Prototype. Use synthetic or redacted offers only. Offer Check's server does not store offer text. If you choose translation, Google Cloud Translation receives it. Save Encrypted keeps an encrypted copy in this browser only.":
    "نموذج أولي. استخدم عروضًا مصطنعة أو منقّحة فقط. لا يخزّن خادم Offer Check نص العرض. إذا اخترت الترجمة، يستلمه Google Cloud Translation. ميزة \"حفظ مشفّر\" تحفظ نسخة مشفّرة في هذا المتصفح فقط.",
  "Made-up examples written for this app. No real company or person.":
    "أمثلة مختلقة كُتبت لهذا التطبيق. لا تخص أي شركة أو شخص حقيقي.",
  "Offer Check is an early prototype that checks English text. Text in other languages can be machine translated first, and a translation can lose or change meaning. A low score, or \"No risk indicators found\", does not mean an offer is genuine.":
    "Offer Check نموذج أولي مبكر يفحص النص الإنجليزي. يمكن ترجمة النص المكتوب بلغات أخرى آليًا أولًا، وقد تُفقد الترجمة المعنى أو تغيّره. الدرجة المنخفضة، أو عبارة \"لم يُعثر على مؤشرات خطر\"، لا تعني أن العرض حقيقي.",
  "Encrypted Vault data stays in this browser": "بيانات الخزنة المشفّرة تبقى في هذا المتصفح",

  // Hero (check page)
  "Check a job offer before you pay or share anything.": "افحص عرض العمل قبل أن تدفع أو تشارك أي شيء.",
  "{0} rules, every finding quoted": "عدد القواعد: {0}، وكل نتيجة مقتبسة",
  "Rule-based score: the same English text gives the same score.":
    "درجة قائمة على القواعد: النص الإنجليزي نفسه يعطي الدرجة نفسها.",
  "Low, medium or high risk indicators": "مؤشرات خطر منخفضة أو متوسطة أو مرتفعة",
  "Paste a job offer to check it against {0} fixed rules. The rules read English. Other languages can be translated by Google Cloud Translation if you agree. Offer Check's server does not store your text.":
    "الصق عرض عمل لفحصه وفق القواعد الثابتة (عددها {0}). تقرأ القواعد اللغة الإنجليزية. يمكن ترجمة اللغات الأخرى عبر Google Cloud Translation إذا وافقت. لا يخزّن خادم Offer Check النص الذي تدخله.",
  "Example findings": "أمثلة على النتائج",
  "{0} EXAMPLES": "الأمثلة: {0}",
  "Demo data, not your text": "بيانات تجريبية، وليست نصك",
  "Demo animation": "رسوم تجريبية",
  "Pause radar": "إيقاف الرادار مؤقتًا",
  "Pause animations": "إيقاف الحركة مؤقتًا",
  "Resume animations": "استئناف الحركة",
  "Resume radar": "استئناف الرادار",
  "Glow: Max": "التوهج: أقصى",
  "Glow: Normal": "التوهج: عادي",
  "Dubai": "دبي",
  "Abu Dhabi": "أبوظبي",
  "Sharjah": "الشارقة",
  "Ajman": "عجمان",
  "UAE wide": "على مستوى الإمارات",
  "Chat task job": "وظيفة مهام عبر الدردشة",
  "Visa fee before joining": "رسوم تأشيرة قبل الالتحاق",
  "Look-alike sender": "مرسل منتحل",
  "Standard offer letter": "خطاب عرض عادي",
  "Deposit and bank documents": "عربون ومستندات بنكية",
  "fee asked": "طلب رسوم",
  "check on MoHRE": "تحقق عبر الوزارة",
  "free e-mail sender": "مرسل ببريد مجاني",
  "WhatsApp code request": "طلب رمز عبر واتساب",

  // Offer checker
  "Try a synthetic sample": "جرّب عينة مصطنعة",
  "Load sample": "تحميل العينة",
  "Where the offer came from": "مصدر العرض",
  "Email": "البريد الإلكتروني",
  "Offer Letter PDF": "خطاب عرض بصيغة PDF",
  "Paste the {0} message as text.": "الصق رسالة {0} كنص.",
  "Paste the WhatsApp message, email, LinkedIn message or offer letter text here":
    "الصق هنا رسالة واتساب أو البريد الإلكتروني أو رسالة LinkedIn أو نص خطاب العرض",
  "Job offer text": "نص عرض العمل",
  "Auto-Redact on": "الإخفاء التلقائي مفعّل",
  "Auto-Redact off": "الإخفاء التلقائي متوقف",
  "Auto-Redact is on: Emirates ID, passport and IBAN numbers are masked in this browser before the text is checked or translated.":
    "الإخفاء التلقائي مفعّل: تُخفى أرقام الهوية الإماراتية وجواز السفر والآيبان في هذا المتصفح قبل فحص النص أو ترجمته.",
  "Auto-Redact is off: the text is checked as typed.": "الإخفاء التلقائي متوقف: يُفحص النص كما كُتب.",
  "Clear text": "مسح النص",
  "Check offer": "افحص العرض",
  "Checking...": "جارٍ الفحص...",
  "Translating...": "جارٍ الترجمة...",
  "Paste an offer or choose a sample, then check it.": "الصق عرضًا أو اختر عينة، ثم افحصه.",
  "Paste an offer to check.": "الصق عرضًا لفحصه.",
  "Paste an offer, then check it.": "الصق عرضًا، ثم افحصه.",
  "Cleaning the text": "تنظيف النص",
  "Running {0} fixed rules": "تشغيل القواعد الثابتة (عددها {0})",
  "Building the score": "حساب الدرجة",
  "Result cleared because the text changed.": "مُسحت النتيجة لأن النص تغيّر.",
  "Send to Google and translate": "أرسل إلى Google وترجم",
  "Check original anyway (not checked)": "افحص الأصل على أي حال (دون فحص الأجزاء غير الإنجليزية)",
  "Nothing was sent for translation. You can check the original text; the parts not in English will not be checked.":
    "لم يُرسل شيء للترجمة. يمكنك فحص النص الأصلي؛ لن تُفحص الأجزاء غير المكتوبة بالإنجليزية.",
  "To translate, Offer Check sends the text in the box to Google Cloud Translation, a machine translation service run by Google. Offer Check does not store it; Google's terms apply to the text it receives. Remove names, phone numbers and other personal details first.":
    "للترجمة، يرسل Offer Check النص الموجود في المربع إلى Google Cloud Translation، وهي خدمة ترجمة آلية تديرها Google. لا يخزّنه Offer Check؛ وتسري شروط Google على النص الذي تستلمه. احذف الأسماء وأرقام الهواتف والتفاصيل الشخصية الأخرى أولًا.",
  "This text does not look like English, or only part of it does. The rules read English only. You can have it machine translated to English first, or check the original, where the parts in other languages will not be checked.":
    "لا يبدو هذا النص مكتوبًا بالإنجليزية، أو أن جزءًا منه فقط كذلك. تقرأ القواعد الإنجليزية فقط. يمكنك ترجمته آليًا إلى الإنجليزية أولًا، أو فحص الأصل، ولن تُفحص فيه الأجزاء المكتوبة بلغات أخرى.",
  "This text does not look like English, or only part of it does. The rules read English only, so the parts in other languages will not be checked.":
    "لا يبدو هذا النص مكتوبًا بالإنجليزية، أو أن جزءًا منه فقط كذلك. تقرأ القواعد الإنجليزية فقط، لذا لن تُفحص الأجزاء المكتوبة بلغات أخرى.",
  "We could not confirm that all of this text is in English. The rules read English only. You can have it machine translated first, or check the original; parts that are not English will not be checked.":
    "لم نتمكن من التأكد من أن هذا النص كله بالإنجليزية. تقرأ القواعد الإنجليزية فقط. يمكنك ترجمته آليًا أولًا، أو فحص الأصل؛ ولن تُفحص الأجزاء غير الإنجليزية.",
  "If you agree, text in other languages is sent to Google Cloud Translation, a machine translation service, and the rules read the English it returns. Scam wording can be lost or softened in translation. How well each language is translated has not been measured.":
    "إذا وافقت، يُرسل النص المكتوب بلغات أخرى إلى Google Cloud Translation، وهي خدمة ترجمة آلية، وتقرأ القواعد النص الإنجليزي الذي تعيده. قد تضيع صياغة الاحتيال أو تخفّ في الترجمة. لم تُقَس جودة ترجمة كل لغة.",
  "Offer text is too long": "نص العرض طويل جدًا",
  "Offer text must be 20,000 characters or fewer.": "يجب ألا يتجاوز نص العرض 20,000 حرف.",
  "Could not reach the server": "تعذّر الوصول إلى الخادم",
  "You appear to be offline": "يبدو أنك غير متصل بالإنترنت",
  "Something went wrong on the server": "حدث خطأ في الخادم",
  "The reply could not be read": "تعذّرت قراءة الرد",
  "The check could not run": "تعذّر إجراء الفحص",
  "The check did not complete. Your text is still in the box. Try again.":
    "لم يكتمل الفحص. نصك ما زال في المربع. أعد المحاولة.",
  "The check did not complete. Your text is still in the box. Try again in a moment.":
    "لم يكتمل الفحص. نصك ما زال في المربع. أعد المحاولة بعد قليل.",
  "The check needs a connection. Your text is still in the box. Reconnect, then try again.":
    "يحتاج الفحص إلى اتصال. نصك ما زال في المربع. أعد الاتصال، ثم أعد المحاولة.",
  "The server sent a reply this page cannot read. Your text is still in the box. Try again.":
    "أرسل الخادم ردًا لا تستطيع هذه الصفحة قراءته. نصك ما زال في المربع. أعد المحاولة.",
  "The server could not read the request. Try again.": "تعذّر على الخادم قراءة الطلب. أعد المحاولة.",
  "Results ready. {0}": "النتائج جاهزة. {0}",
  "Results ready. Checked an English translation. Score {0} of 100: {1}.":
    "النتائج جاهزة. فُحصت ترجمة إنجليزية. الدرجة {0} من 100: {1}.",
  "Results ready. Score {0} of 100: {1}.": "النتائج جاهزة. الدرجة {0} من 100: {1}.",

  // Coverage notices, labels and summaries
  "Most of this text is not in English. This check reads English only, so the text was not checked and no score is shown.":
    "معظم هذا النص ليس بالإنجليزية. يقرأ هذا الفحص الإنجليزية فقط، لذا لم يُفحص النص ولا تُعرض أي درجة.",
  "Part of this text is not in English. This check reads English only, so those parts were not checked.":
    "جزء من هذا النص ليس بالإنجليزية. يقرأ هذا الفحص الإنجليزية فقط، لذا لم تُفحص تلك الأجزاء.",
  "This result is based on a machine translation by Google Cloud Translation. It may be inexact: a translation can lose or change meaning, so a warning sign in the original can be missed.":
    "تستند هذه النتيجة إلى ترجمة آلية من Google Cloud Translation. قد تكون غير دقيقة: قد تُفقد الترجمة المعنى أو تغيّره، فقد تفوت علامة تحذير موجودة في الأصل.",
  "This text has no clear signs of a job offer, such as a role, a salary or an employer. Offer Check is built for job offers, so a low score here says little.":
    "لا يحمل هذا النص علامات واضحة على عرض عمل، مثل وظيفة أو راتب أو صاحب عمل. صُمّم Offer Check لعروض العمل، لذا فالدرجة المنخفضة هنا لا تعني الكثير.",
  "Not checked": "لم يُفحص",
  "Not checked.": "لم يُفحص.",
  "Not checked: most of the text is not in English": "لم يُفحص: معظم النص ليس بالإنجليزية",
  "Not checked: most of the text is not in English.": "لم يُفحص: معظم النص ليس بالإنجليزية.",
  "Not checked: most of the text is not in English. Rules matched in its English words: {0}.":
    "لم يُفحص: معظم النص ليس بالإنجليزية. قواعد تطابقت في كلماته الإنجليزية: {0}.",
  "Score 0 on the English part. Part of the text was not checked.":
    "الدرجة 0 على الجزء الإنجليزي. لم يُفحص جزء من النص.",
  "Score 0. This text does not look like a job offer.": "الدرجة 0. لا يبدو هذا النص عرض عمل.",
  "Score 0 on the English translation. A translation can change the meaning.":
    "الدرجة 0 على الترجمة الإنجليزية. قد تغيّر الترجمة المعنى.",
  "Score {0} of 100 on the English translation. A translation can change the meaning.":
    "الدرجة {0} من 100 على الترجمة الإنجليزية. قد تغيّر الترجمة المعنى.",
  "Score {0} of 100 on the English part. Part of the text was not checked.":
    "الدرجة {0} من 100 على الجزء الإنجليزي. لم يُفحص جزء من النص.",
  "Score {0} of 100. This text does not look like a job offer.": "الدرجة {0} من 100. لا يبدو هذا النص عرض عمل.",
  "Score {0} of 100: {1}": "الدرجة {0} من 100: {1}",
  "Score {0} of 100: {1}.": "الدرجة {0} من 100: {1}.",
  "Score {0} / 100": "الدرجة {0} / 100",
  "High risk indicators": "مؤشرات خطر مرتفعة",
  "Medium risk indicators": "مؤشرات خطر متوسطة",
  "Low risk indicators": "مؤشرات خطر منخفضة",
  "No risk indicators found": "لم يُعثر على مؤشرات خطر",
  "Low, review the findings below": "منخفضة، راجع النتائج أدناه",
  "High": "مرتفع",
  "Medium": "متوسط",
  "Low": "منخفض",
  "high": "مرتفع",
  "medium": "متوسط",
  "low": "منخفض",
  "Most of the text is not in English and was not checked.": "معظم النص ليس بالإنجليزية ولم يُفحص.",
  "Part of the text is not in English and was not checked.": "جزء من النص ليس بالإنجليزية ولم يُفحص.",
  "A translation can change the meaning.": "قد تغيّر الترجمة المعنى.",
  "Most of this text is not in English, so the rules could not check it. This does not confirm that the offer is genuine.":
    "معظم هذا النص ليس بالإنجليزية، لذا لم تتمكن القواعد من فحصه. هذا لا يؤكد أن العرض حقيقي.",
  "None of the rules matched. This does not confirm that the offer is genuine.":
    "لم تتطابق أي قاعدة. هذا لا يؤكد أن العرض حقيقي.",
  "None of the rules matched. This does not confirm that the offer is genuine. Part of the text is not in English and was not checked.":
    "لم تتطابق أي قاعدة. هذا لا يؤكد أن العرض حقيقي. جزء من النص ليس بالإنجليزية ولم يُفحص.",
  "None of the rules matched. This does not confirm that the offer is genuine. The rules checked a machine translation, which can change the meaning.":
    "لم تتطابق أي قاعدة. هذا لا يؤكد أن العرض حقيقي. فحصت القواعد ترجمة آلية، وقد تغيّر الترجمة المعنى.",
  "{0} risk indicators: {1} warning signs matched. These are risk indicators, not a verdict on any company.":
    "مؤشرات الخطر ({0}): علامات التحذير المتطابقة: {1}. هذه مؤشرات خطر، وليست حكمًا على أي شركة.",
  "{0} risk indicators: {1} warning signs matched. These are risk indicators, not a verdict on any company. Part of the text is not in English and was not checked.":
    "مؤشرات الخطر ({0}): علامات التحذير المتطابقة: {1}. هذه مؤشرات خطر، وليست حكمًا على أي شركة. جزء من النص ليس بالإنجليزية ولم يُفحص.",
  "{0} risk indicators: {1} warning signs matched. These are risk indicators, not a verdict on any company. The rules checked a machine translation, which can change the meaning.":
    "مؤشرات الخطر ({0}): علامات التحذير المتطابقة: {1}. هذه مؤشرات خطر، وليست حكمًا على أي شركة. فحصت القواعد ترجمة آلية، وقد تغيّر الترجمة المعنى.",
  "{0} risk indicators: {1} warning sign matched. These are risk indicators, not a verdict on any company.":
    "مؤشرات الخطر ({0}): علامات التحذير المتطابقة: {1}. هذه مؤشرات خطر، وليست حكمًا على أي شركة.",
  "{0} risk indicators: {1} warning sign matched. These are risk indicators, not a verdict on any company. Part of the text is not in English and was not checked.":
    "مؤشرات الخطر ({0}): علامات التحذير المتطابقة: {1}. هذه مؤشرات خطر، وليست حكمًا على أي شركة. جزء من النص ليس بالإنجليزية ولم يُفحص.",
  "{0} risk indicators: {1} warning sign matched. These are risk indicators, not a verdict on any company. The rules checked a machine translation, which can change the meaning.":
    "مؤشرات الخطر ({0}): علامات التحذير المتطابقة: {1}. هذه مؤشرات خطر، وليست حكمًا على أي شركة. فحصت القواعد ترجمة آلية، وقد تغيّر الترجمة المعنى.",
  "{0} warning sign matched. Review it below. These are risk indicators, not a verdict on any company.":
    "علامات التحذير المتطابقة: {0}. راجعها أدناه. هذه مؤشرات خطر، وليست حكمًا على أي شركة.",
  "{0} warning sign matched. Review it below. These are risk indicators, not a verdict on any company. Part of the text is not in English and was not checked.":
    "علامات التحذير المتطابقة: {0}. راجعها أدناه. هذه مؤشرات خطر، وليست حكمًا على أي شركة. جزء من النص ليس بالإنجليزية ولم يُفحص.",
  "{0} warning sign matched. Review it below. These are risk indicators, not a verdict on any company. The rules checked a machine translation, which can change the meaning.":
    "علامات التحذير المتطابقة: {0}. راجعها أدناه. هذه مؤشرات خطر، وليست حكمًا على أي شركة. فحصت القواعد ترجمة آلية، وقد تغيّر الترجمة المعنى.",
  "{0} warning signs matched. Review them below. These are risk indicators, not a verdict on any company.":
    "علامات التحذير المتطابقة: {0}. راجعها أدناه. هذه مؤشرات خطر، وليست حكمًا على أي شركة.",
  "{0} warning signs matched. Review them below. These are risk indicators, not a verdict on any company. Part of the text is not in English and was not checked.":
    "علامات التحذير المتطابقة: {0}. راجعها أدناه. هذه مؤشرات خطر، وليست حكمًا على أي شركة. جزء من النص ليس بالإنجليزية ولم يُفحص.",
  "{0} warning signs matched. Review them below. These are risk indicators, not a verdict on any company. The rules checked a machine translation, which can change the meaning.":
    "علامات التحذير المتطابقة: {0}. راجعها أدناه. هذه مؤشرات خطر، وليست حكمًا على أي شركة. فحصت القواعد ترجمة آلية، وقد تغيّر الترجمة المعنى.",
  "These are risk indicators, not a verdict on any company.": "هذه مؤشرات خطر، وليست حكمًا على أي شركة.",
  "This does not confirm that the offer is genuine.": "هذا لا يؤكد أن العرض حقيقي.",
  "If you think it is a scam, report it: {0}.": "إذا ظننت أنه احتيال، فأبلغ عنه: {0}.",

  // Result card
  "Risk indicators": "مؤشرات الخطر",
  "{0} red flag": "علامات الخطر: {0}",
  "{0} red flags": "علامات الخطر: {0}",
  "{0} number removed before checking": "أرقام حُذفت قبل الفحص: {0}",
  "{0} numbers removed before checking": "أرقام حُذفت قبل الفحص: {0}",
  "Checked a machine translation into English, made by Google Cloud Translation.":
    "فُحصت ترجمة آلية إلى الإنجليزية أعدّها Google Cloud Translation.",
  "Checked a machine translation into English from {0}, made by Google Cloud Translation.":
    "فُحصت ترجمة آلية إلى الإنجليزية من {0}، أعدّها Google Cloud Translation.",
  "Evidence basis:": "أساس الأدلة:",
  "no rule matched, so there is nothing to quote.": "لم تتطابق أي قاعدة، لذا لا يوجد ما يُقتبس.",
  "{0} matched rule, each with the exact words quoted from the text.":
    "القواعد المتطابقة: {0}، ولكل منها الكلمات نفسها مقتبسة من النص.",
  "{0} matched rules, each with the exact words quoted from the text.":
    "القواعد المتطابقة: {0}، ولكل منها الكلمات نفسها مقتبسة من النص.",
  "Rule groups": "مجموعات القواعد",
  "Indicator found": "وُجد مؤشر",
  "No indicator found": "لم يوجد مؤشر",
  "Money asked for": "طلب المال",
  "Codes, cards or documents": "رموز أو بطاقات أو مستندات",
  "Pressure to act fast": "ضغط للتصرف بسرعة",
  "Sender's email address": "عنوان البريد الإلكتروني للمرسل",
  "MoHRE reference": "مرجع وزارة الموارد البشرية والتوطين",
  "Stop": "إيقاف",
  "Listen": "استمع",
  "Export PDF": "تصدير PDF",
  "Save Encrypted": "حفظ مشفّر",
  "New Audit": "فحص جديد",
  "Points": "النقاط",
  "Bands": "الفئات",
  "{0}, capped at {1}": "{0}، بحد أقصى {1}",
  "{0}, raised to {1} because a high-severity rule matched": "{0}، رُفعت إلى {1} لأن قاعدة عالية الخطورة تطابقت",
  "{0} points from 1 rule": "{0} نقطة من قاعدة واحدة",
  "Each matched rule adds points. Bands: high {0} or more, medium {1} to {2}, low below {3}.":
    "كل قاعدة متطابقة تضيف نقاطًا. الفئات: مرتفعة من {0} فأكثر، متوسطة من {1} إلى {2}، منخفضة أقل من {3}.",
  "These are risk indicators, not a verdict on any company. Before you pay or share anything, confirm the offer through official government channels.":
    "هذه مؤشرات خطر، وليست حكمًا على أي شركة. قبل أن تدفع أو تشارك أي شيء، تأكد من العرض عبر القنوات الحكومية الرسمية.",
  "If you think this is a scam, see the official places to report it.":
    "إذا ظننت أن هذا احتيال، فاطّلع على الجهات الرسمية للإبلاغ عنه.",
  "Findings": "النتائج",
  "Result view": "عرض النتيجة",
  "Documented red flags ({0})": "علامات الخطر المقتبسة ({0})",
  "Highlights in your text": "التمييز في نصك",
  "{0} rule, +{1} points": "قاعدة {0}، +{1} نقطة",
  "Quoted from the offer": "مقتبس من العرض",
  "Rule {0}": "القاعدة {0}",
  "Copy quote": "نسخ الاقتباس",
  "Copied": "تم النسخ",
  "Add to Threat Radar": "أضف إلى رادار التهديدات",
  "Your browser did not allow copying. Select the quote and copy it yourself.":
    "لم يسمح متصفحك بالنسخ. حدّد الاقتباس وانسخه بنفسك.",
  "The {0} rules read English only, so they could not check most of this text. This does not confirm that the offer is genuine.":
    "تقرأ القواعد (عددها {0}) الإنجليزية فقط، لذا لم تتمكن من فحص معظم هذا النص. هذا لا يؤكد أن العرض حقيقي.",
  "None of the {0} rules matched in the English part. Part of the text was not checked, and this does not confirm that the offer is genuine.":
    "لم تتطابق أي من القواعد (عددها {0}) في الجزء الإنجليزي. لم يُفحص جزء من النص، وهذا لا يؤكد أن العرض حقيقي.",
  "None of the {0} rules matched in the English translation. A translation can change the meaning, so this does not confirm that the offer is genuine.":
    "لم تتطابق أي من القواعد (عددها {0}) في الترجمة الإنجليزية. قد تغيّر الترجمة المعنى، لذا هذا لا يؤكد أن العرض حقيقي.",
  "None of the {0} rules matched. This text has no clear signs of a job offer, and this does not confirm that the offer is genuine.":
    "لم تتطابق أي من القواعد (عددها {0}). لا يحمل هذا النص علامات واضحة على عرض عمل، وهذا لا يؤكد أن العرض حقيقي.",
  "None of the {0} rules matched. This does not confirm that the offer is genuine.":
    "لم تتطابق أي من القواعد (عددها {0}). هذا لا يؤكد أن العرض حقيقي.",
  "None of the {0} rules counted toward the score. The text mentions {1} only in a warning, shown below. This does not confirm that the offer is genuine.":
    "لم تُحتسب أي من القواعد (عددها {0}) في الدرجة. يذكر النص موضوعات في سياق تحذير فقط (عددها {1})، وهي معروضة أدناه. هذا لا يؤكد أن العرض حقيقي.",
  "{0} topic": "{0}",
  "{0} topics": "{0}",
  "Mentioned in a warning, not counted in the score": "مذكور في تحذير، ولا يُحتسب في الدرجة",
  "The text the rules read, with ID, passport and IBAN numbers removed. Each quoted warning sign is marked.":
    "النص الذي قرأته القواعد، بعد حذف أرقام الهوية وجواز السفر والآيبان. كل علامة تحذير مقتبسة مميّزة.",
  "The text the rules read. Each quoted warning sign is marked.":
    "النص الذي قرأته القواعد. كل علامة تحذير مقتبسة مميّزة.",
  "Check it yourself": "تحقق بنفسك",
  "{0} / {1} done": "المنجز: {0} / {1}",
  "If it looks like a scam, report it": "إذا بدا احتيالًا، فأبلغ عنه",
  "Call": "اتصل",
  "Direct Government Portals": "البوابات الحكومية المباشرة",
  "Confirm the employer and the offer yourself, on the official sites.":
    "تأكد بنفسك من صاحب العمل ومن العرض على المواقع الرسمية.",
  "All hotlines and reporting channels": "جميع الأرقام الساخنة وقنوات الإبلاغ",
  "How this was checked": "كيف جرى الفحص",
  "MoHRE offer enquiry": "استعلام عن العرض لدى وزارة الموارد البشرية والتوطين",
  "MoHRE website": "موقع وزارة الموارد البشرية والتوطين",
  "Red flags: {0}.": "علامات الخطر: {0}.",

  // Rule labels and notes (checks)
  "Asks you to pay a fee or money": "يطلب منك دفع رسوم أو مال",
  "Asks for a code, password or card details": "يطلب رمزًا أو كلمة مرور أو بيانات بطاقة",
  "Asks for identity or bank documents": "يطلب مستندات هوية أو مستندات بنكية",
  "Pressure to act quickly": "ضغط للتصرف بسرعة",
  "Uses a free email address": "يستخدم عنوان بريد إلكتروني مجانيًا",
  "Company name used from a free email address": "اسم شركة مستخدم من عنوان بريد إلكتروني مجاني",
  "Fee mentioned in a warning": "رسوم مذكورة في تحذير",
  "Code or password mentioned in a warning": "رمز أو كلمة مرور مذكورة في تحذير",
  "Documents mentioned in a warning": "مستندات مذكورة في تحذير",
  "Urgency mentioned in a warning": "استعجال مذكور في تحذير",
  "Being asked to pay before you start work is a common pattern in recruitment scams.":
    "طلب الدفع قبل بدء العمل نمط شائع في احتيالات التوظيف.",
  "An employer has no need for your passwords, one-time codes or card details.":
    "لا يحتاج صاحب العمل إلى كلمات مرورك أو رموزك لمرة واحدة أو بيانات بطاقتك.",
  "Sending identity or bank documents before a verified written offer can expose you to fraud.":
    "إرسال مستندات الهوية أو المستندات البنكية قبل الحصول على عرض مكتوب ومؤكَّد قد يعرّضك للاحتيال.",
  "Pressure to act fast leaves you less time to check the offer.":
    "الضغط للتصرف بسرعة يترك لك وقتًا أقل لفحص العرض.",
  "Recruiters for a registered company usually write from the company's own domain.":
    "عادةً ما يراسلك مسؤولو التوظيف في الشركات المسجّلة من نطاق بريد الشركة نفسها.",

  // Agent run and audit trail
  "Agent run": "تشغيل الوكلاء",
  "Manager": "المدير",
  "Intake (text cleaning only)": "الاستلام (تنظيف النص فقط)",
  "Red-flag": "علامات الخطر",
  "Verification": "التحقق",
  "Official channel": "القناة الرسمية",
  "Risk aggregator": "مجمّع المخاطر",
  "Completed": "مكتمل",
  "Not implemented yet": "لم يُنفّذ بعد",
  "Not run": "لم يُشغّل",
  "Ran {0} steps and merged the results": "نُفّذت الخطوات ({0}) ودُمجت النتائج",
  "Cleaned {0} characters, removed {1} hidden": "نُظّفت الأحرف ({0})، وحُذفت المخفية ({1})",
  "{0} of {1} rules matched": "تطابقت {0} من {1} قواعد",
  "Audit trail": "سجل التدقيق",
  "This browser could not add the latest step to the audit trail.": "تعذّر على هذا المتصفح إضافة الخطوة الأخيرة إلى سجل التدقيق.",
  "{0} entry": "الإدخالات: {0}",
  "{0} entries": "الإدخالات: {0}",
  "checking the chain": "جارٍ فحص السلسلة",
  "chain verified": "السلسلة سليمة",
  "chain broken at entry {0}": "السلسلة منقطعة عند الإدخال {0}",

  // Translation panels
  "Machine translation": "ترجمة آلية",
  "Original text": "النص الأصلي",
  "Original text ({0})": "النص الأصلي ({0})",
  "English translation that was checked": "الترجمة الإنجليزية التي فُحصت",
  "Translation did not work, so nothing was checked.": "لم تنجح الترجمة، لذا لم يُفحص شيء.",
  "Translation is not available right now, so nothing was checked.": "الترجمة غير متاحة الآن، لذا لم يُفحص شيء.",
  "The translation request could not be read. Try again, or check the original text; the parts not in English will not be checked.":
    "تعذّرت قراءة طلب الترجمة. أعد المحاولة، أو افحص النص الأصلي؛ لن تُفحص الأجزاء غير المكتوبة بالإنجليزية.",
  "The translation request was refused. Try again, or check the original text; the parts not in English will not be checked.":
    "رُفض طلب الترجمة. أعد المحاولة، أو افحص النص الأصلي؛ لن تُفحص الأجزاء غير المكتوبة بالإنجليزية.",
  "The translation service did not return a translation. Try again, or check the original text; the parts not in English will not be checked.":
    "لم تُعِد خدمة الترجمة أي ترجمة. أعد المحاولة، أو افحص النص الأصلي؛ لن تُفحص الأجزاء غير المكتوبة بالإنجليزية.",
  "The translation service is busy. Try again, or check the original text; the parts not in English will not be checked.":
    "خدمة الترجمة مشغولة. أعد المحاولة، أو افحص النص الأصلي؛ لن تُفحص الأجزاء غير المكتوبة بالإنجليزية.",
  "The translation service refused the request. Try again, or check the original text; the parts not in English will not be checked.":
    "رفضت خدمة الترجمة الطلب. أعد المحاولة، أو افحص النص الأصلي؛ لن تُفحص الأجزاء غير المكتوبة بالإنجليزية.",
  "The translation service took too long to answer. Try again, or check the original text; the parts not in English will not be checked.":
    "استغرقت خدمة الترجمة وقتًا طويلًا للرد. أعد المحاولة، أو افحص النص الأصلي؛ لن تُفحص الأجزاء غير المكتوبة بالإنجليزية.",
  "The translation was not confirmed. Try again, or check the original text; the parts not in English will not be checked.":
    "لم تُؤكَّد الترجمة. أعد المحاولة، أو افحص النص الأصلي؛ لن تُفحص الأجزاء غير المكتوبة بالإنجليزية.",
  "Too many translations in a short time. Wait a minute, then try again, or check the original text.":
    "طلبات ترجمة كثيرة في وقت قصير. انتظر دقيقة، ثم أعد المحاولة، أو افحص النص الأصلي.",
  "Translation takes up to 5,000 characters. Shorten the text, or check the original text; the parts not in English will not be checked.":
    "تقبل الترجمة حتى 5,000 حرف. اختصر النص، أو افحص النص الأصلي؛ لن تُفحص الأجزاء غير المكتوبة بالإنجليزية.",

  // Language names
  "Bengali": "البنغالية",
  "German": "الألمانية",
  "Spanish": "الإسبانية",
  "Persian": "الفارسية",
  "Filipino": "الفلبينية",
  "French": "الفرنسية",
  "Gujarati": "الغوجاراتية",
  "Hindi": "الهندية",
  "Indonesian": "الإندونيسية",
  "Italian": "الإيطالية",
  "Kannada": "الكنادية",
  "Malayalam": "المالايالامية",
  "Marathi": "الماراثية",
  "Malay": "الملايوية",
  "Nepali": "النيبالية",
  "Punjabi": "البنجابية",
  "Pashto": "البشتوية",
  "Portuguese": "البرتغالية",
  "Russian": "الروسية",
  "Sinhala": "السنهالية",
  "Tamil": "التاميلية",
  "Telugu": "التيلوغوية",
  "Tagalog": "التاغالوغية",
  "Turkish": "التركية",
  "Urdu": "الأردية",
  "Chinese": "الصينية",

  // Approval panel
  "Draft reply": "مسودة الرد",
  "Draft discarded.": "حُذفت المسودة.",
  "Offer Check can prepare a careful reply for you to review.": "يمكن لـ Offer Check إعداد رد حذر لتراجعه.",
  "Nothing is sent until you approve. Offer Check never sends messages for you.":
    "لا يُرسل شيء حتى توافق. لا يرسل Offer Check أي رسائل نيابةً عنك.",
  "Prepare draft reply": "إعداد مسودة رد",
  "Your approval needed": "مطلوب موافقتك",
  "Reply approved": "تمت الموافقة على الرد",
  "Reply approved and copied. Offer Check has not sent this reply draft anywhere.":
    "تمت الموافقة على الرد ونسخه. لم يرسل Offer Check مسودة الرد هذه إلى أي جهة.",
  "Reply approved. Offer Check has not sent this reply draft anywhere.":
    "تمت الموافقة على الرد. لم يرسل Offer Check مسودة الرد هذه إلى أي جهة.",
  "Reply copied. Paste it yourself if you want to use it.": "نُسخ الرد. الصقه بنفسك إن أردت استخدامه.",
  "Your browser did not allow copying. Select the text below and copy it yourself.":
    "لم يسمح متصفحك بالنسخ. حدّد النص أدناه وانسخه بنفسك.",
  "Reply to copy": "الرد المراد نسخه",
  "Approve and copy reply": "وافق وانسخ الرد",
  "Edit draft": "تعديل المسودة",
  "Discard": "حذف",
  "Write the reply before you approve.": "اكتب الرد قبل أن توافق.",
  "Replace {0} with the real text before you approve.": "استبدل {0} بالنص الفعلي قبل أن توافق.",
  "Replace {0} with the real details before you approve.": "استبدل {0} بالتفاصيل الفعلية قبل أن توافق.",
  "Choose Edit draft and replace {0} with the real text before you approve.":
    "اختر \"تعديل المسودة\" واستبدل {0} بالنص الفعلي قبل أن توافق.",
  "Choose Edit draft and replace {0} with the real details before you approve.":
    "اختر \"تعديل المسودة\" واستبدل {0} بالتفاصيل الفعلية قبل أن توافق.",
  "and": "و",

  // Limitations
  "What this check cannot do": "ما لا يستطيع هذا الفحص فعله",
  "Risk indicators, not a verdict. It has been tested on synthetic offers only, not validated on real scam data.":
    "مؤشرات خطر، وليست حكمًا. اختُبر على عروض مصطنعة فقط، ولم يُختبر على بيانات احتيال حقيقية.",
  "A low score does not confirm an offer is genuine. Offer Check does not report anything for you and does not give legal advice. A translation can lose or change meaning.":
    "الدرجة المنخفضة لا تؤكد أن العرض حقيقي. لا يبلّغ Offer Check عن أي شيء نيابةً عنك ولا يقدّم استشارة قانونية. قد تُفقد الترجمة المعنى أو تغيّره.",
  "Other languages typed in English letters are only partly detected.":
    "اللغات الأخرى المكتوبة بحروف إنجليزية لا تُكتشف إلا جزئيًا.",
  "A word check catches common Hindi, Urdu, Arabic, Tagalog, Malayalam, Bengali, Tamil and French words written in English letters, and then shows the text as not checked. Messages under 6 words, and languages it has no words for, can still look like English to the check, and then no translation is offered.":
    "يلتقط فحص الكلمات كلمات شائعة من الهندية والأردية والعربية والتاغالوغية والمالايالامية والبنغالية والتاميلية والفرنسية مكتوبة بحروف إنجليزية، ثم يعرض النص على أنه لم يُفحص. قد تبدو الرسائل التي تقل عن 6 كلمات، واللغات التي لا يعرف كلماتها، إنجليزيةً للفحص، وعندها لا تُعرض الترجمة.",
  "The language check uses simple cut-offs.": "يستخدم فحص اللغة حدودًا بسيطة.",
  "Text counts as not English when at least half of its letters come from another alphabet, or when too few of its words are common English words or too many are common words from other languages. Fewer such letters or words, but still some, mark it as partly English. Very short non-English text, such as a single name, may get no notice. The cut-offs are a design choice and have not been tested on real offers.":
    "يُعدّ النص غير إنجليزي إذا كان نصف حروفه على الأقل من أبجدية أخرى، أو إذا قلّت فيه الكلمات الإنجليزية الشائعة أو كثرت فيه الكلمات الشائعة من لغات أخرى. وإذا وُجد عدد أقل من هذه الحروف أو الكلمات، لكنه ليس صفرًا، يُعدّ النص إنجليزيًا جزئيًا. قد لا يظهر أي تنبيه لنص قصير جدًا غير إنجليزي، مثل اسم واحد. هذه الحدود خيار تصميمي ولم تُختبر على عروض حقيقية.",
  "A few of them stay below the cut-off, so no notice is shown.": "بعضها يبقى تحت الحد، فلا يظهر أي تنبيه.",
  "Look-alike letters can hide words.": "قد تُخفي الحروف المتشابهة بعض الكلمات.",
  "Some letters from other alphabets look like English letters. If a message uses them, the check can miss the words they appear in.":
    "بعض حروف الأبجديات الأخرى تشبه الحروف الإنجليزية. إذا استخدمتها رسالة، فقد يفوت الفحص الكلمات التي تظهر فيها.",
  "Look-alike letters can also keep the language notice away.": "قد تمنع الحروف المتشابهة أيضًا ظهور تنبيه اللغة.",
  "A request for a code can be missed.": "قد يفوت الفحص طلب رمز.",
  "It may not be flagged when it is worded indirectly, such as asking what number you received by text message, or when it asks you to type the code into a form without mentioning a link.":
    "قد لا يُرصد الطلب إذا صيغ بشكل غير مباشر، مثل السؤال عن الرقم الذي وصلك برسالة نصية، أو طلب كتابة الرمز في نموذج دون ذكر رابط.",
  "A request for a photo of a card can be missed.": "قد يفوت الفحص طلب صورة لبطاقة.",
  "It may not be flagged if it does not say which kind of card, such as a bank, debit or credit card, and does not mention a card detail, such as the CVV, the expiry date or both sides, in the same sentence. A request for a video of a card can also be missed.":
    "قد لا يُرصد الطلب إذا لم يذكر نوع البطاقة، مثل البطاقة البنكية أو بطاقة الخصم أو البطاقة الائتمانية، ولم يذكر أحد بياناتها، مثل رمز CVV أو تاريخ الانتهاء أو الوجهين، في الجملة نفسها. وقد يفوت الفحص أيضًا طلب مقطع فيديو لبطاقة.",
  "Some honest offers can score high.": "قد تحصل بعض العروض الصادقة على درجة مرتفعة.",
  "Unusual wording about who pays a fee can still be flagged as a fee request, for example when an offer says the company \"sponsors\" or \"arranges\" your visa and medical fees, or names the company in an earlier sentence.":
    "قد تُرصد صياغة غير معتادة حول من يدفع الرسوم على أنها طلب رسوم، مثلًا عندما يقول العرض إن الشركة \"تكفل\" أو \"ترتّب\" رسوم تأشيرتك وفحصك الطبي، أو عندما يُذكر اسم الشركة في جملة سابقة.",
  "The check is built for job offers.": "صُمّم الفحص لعروض العمل.",
  "When a low-scoring text shows no sign of a job offer, such as a role, a salary or an employer, a notice says so. The score still comes only from the fixed rules.":
    "عندما لا يحمل نص منخفض الدرجة أي علامة على عرض عمل، مثل وظيفة أو راتب أو صاحب عمل، يظهر تنبيه بذلك. وتبقى الدرجة ناتجة عن القواعد الثابتة وحدها.",

  // Reference helper and portals
  "Offer letter or work permit reference": "مرجع خطاب العرض أو تصريح العمل",
  "Prepare to check": "تجهيز للفحص",
  "Open the MoHRE enquiry page": "افتح صفحة الاستعلام لدى وزارة الموارد البشرية والتوطين",
  "Offer Check cannot tell whether a reference is real. Only MoHRE can confirm it.":
    "لا يستطيع Offer Check معرفة ما إذا كان المرجع حقيقيًا. وحدها وزارة الموارد البشرية والتوطين تستطيع تأكيده.",
  "Ready to check on the MoHRE site": "جاهز للفحص على موقع الوزارة",
  "Copy reference": "نسخ المرجع",
  "Official sources only": "مصادر رسمية فقط",
  "Gov Portals Hub": "مركز البوابات الحكومية",
  "Confirm an offer, a visa or an employer yourself, on the official UAE sites and hotlines. Offer Check is not part of any of them.":
    "تأكد بنفسك من العرض أو التأشيرة أو صاحب العمل عبر المواقع والأرقام الساخنة الرسمية في الإمارات. Offer Check ليس جزءًا من أي منها.",
  "Check an offer reference with MoHRE": "افحص مرجع العرض لدى وزارة الموارد البشرية والتوطين",
  "A genuine offer comes through MoHRE. Ask the employer for the reference, then look it up on the MoHRE site.":
    "يصدر العرض الحقيقي عبر وزارة الموارد البشرية والتوطين. اطلب المرجع من صاحب العمل، ثم ابحث عنه في موقع الوزارة.",
  "Hotlines and portals": "الأرقام الساخنة والبوابات",
  "Job offers": "عروض العمل",
  "Visas": "التأشيرات",
  "Federal": "اتحادي",
  "How to verify": "كيف تتأكد",
  "Open the official site with the button below, not from a link in the message you received.":
    "افتح الموقع الرسمي من الزر أدناه، وليس من رابط في الرسالة التي وصلتك.",
  "If what you were told does not match, call the hotline before you pay or share anything.":
    "إذا لم يتطابق ما قيل لك، فاتصل بالرقم الساخن قبل أن تدفع أو تشارك أي شيء.",
  "Open portal": "افتح البوابة",
  "If you think it is a scam": "إذا ظننت أنه احتيال",
  "Job offers, work permits and labour complaints.": "عروض العمل وتصاريح العمل وشكاوى العمال.",
  "Entry permits and visas outside Dubai.": "أذونات الدخول والتأشيرات خارج دبي.",
  "Dubai residency and visa enquiries.": "استفسارات الإقامة والتأشيرات في دبي.",
  "Report online fraud.": "الإبلاغ عن الاحتيال الإلكتروني.",
  "Job offers, work permits and labour complaints": "عروض العمل وتصاريح العمل وشكاوى العمال",
  "Entry permits and visas outside Dubai": "أذونات الدخول والتأشيرات خارج دبي",
  "Dubai residency and visa enquiries": "استفسارات الإقامة والتأشيرات في دبي",
  "Report online fraud": "الإبلاغ عن الاحتيال الإلكتروني",
  "MoHRE Portal": "بوابة وزارة الموارد البشرية والتوطين",
  "Amer (GDRFA Dubai)": "آمر (الإدارة العامة للإقامة وشؤون الأجانب - دبي)",
  "GDRFA Dubai (Amer)": "الإدارة العامة للإقامة وشؤون الأجانب - دبي (آمر)",
  "ICP Smart Services": "الخدمات الذكية للهيئة الاتحادية للهوية والجنسية",
  "Ministry of Human Resources and Emiratisation (MOHRE)": "وزارة الموارد البشرية والتوطين",
  "MoHRE (Ministry of Human Resources and Emiratisation)": "وزارة الموارد البشرية والتوطين",

  // Legal page and warning signs
  "Offline library": "مكتبة دون اتصال",
  "Legal Guidelines": "الإرشادات القانونية",
  "Eight signs that a job offer in the UAE may be fake or risky, and what to do about each one. Not legal advice.":
    "ثماني علامات على أن عرض العمل في الإمارات قد يكون مزيفًا أو محفوفًا بالمخاطر، وما يجب فعله حيال كل منها. ليست استشارة قانونية.",
  "Warning signs": "علامات التحذير",
  "Warning signs with the words that matched": "علامات التحذير مع الكلمات التي تطابقت",
  "Why it matters": "لماذا يهم ذلك",
  "What to do:": "ماذا تفعل:",
  "Source:": "المصدر:",
  ", page last updated": "، آخر تحديث للصفحة",
  "About Offer Check UAE": "عن Offer Check UAE",
  "Offer Check UAE is a free tool that looks for common warning signs in a job offer before you pay or share anything.":
    "Offer Check UAE أداة مجانية تبحث عن علامات التحذير الشائعة في عرض العمل قبل أن تدفع أو تشارك أي شيء.",
  "Where to report a job scam": "أين تبلّغ عن احتيال وظيفي",
  "The problem": "المشكلة",
  "What it does": "ماذا يفعل",
  "What it does not do": "ما لا يفعله",
  "Who it is for": "لمن هو",
  "Your privacy": "خصوصيتك",
  "Example offers and legal advice": "أمثلة العروض والاستشارة القانونية",
  "Some job offers sent in the UAE by WhatsApp, email or LinkedIn are fake or risky. They may ask you to pay a fee, share a code or send your identity documents before you have a real job.":
    "بعض عروض العمل المرسلة في الإمارات عبر واتساب أو البريد الإلكتروني أو LinkedIn مزيفة أو محفوفة بالمخاطر. قد تطلب منك دفع رسوم أو مشاركة رمز أو إرسال مستندات هويتك قبل أن تحصل على وظيفة فعلية.",
  "It reads the offer text you paste and points out warning signs in plain words, with the words that matched. It shows how worrying the signs are as low, medium or high. These are warning signs, not a verdict on any company.":
    "يقرأ نص العرض الذي تلصقه ويشير إلى علامات التحذير بكلمات بسيطة، مع الكلمات التي تطابقت. ويبيّن مدى خطورة العلامات: منخفضة أو متوسطة أو مرتفعة. هذه علامات تحذير، وليست حكمًا على أي شركة.",
  "It does not check whether a company, a sender or an offer is real.":
    "لا يفحص ما إذا كانت الشركة أو المرسل أو العرض حقيقيًا.",
  "It does not contact anyone or send any message for you.": "لا يتواصل مع أي أحد ولا يرسل أي رسالة نيابةً عنك.",
  "Its server does not store your text.": "لا يخزّن خادمه النص الذي تدخله.",
  "It does not use an AI model to score your text.": "لا يستخدم نموذج ذكاء اصطناعي لتقييم نصك.",
  "It reads English only. Words in other languages are not checked unless you choose machine translation first.":
    "يقرأ الإنجليزية فقط. لا تُفحص الكلمات المكتوبة بلغات أخرى ما لم تختر الترجمة الآلية أولًا.",
  "It does not give legal advice.": "لا يقدّم استشارة قانونية.",
  "People in the UAE who receive a job offer by WhatsApp, email or LinkedIn and want to check it for warning signs, such as a request for a fee, a code or identity documents.":
    "الأشخاص في الإمارات الذين يتلقون عرض عمل عبر واتساب أو البريد الإلكتروني أو LinkedIn ويريدون فحصه بحثًا عن علامات تحذير، مثل طلب رسوم أو رمز أو مستندات هوية.",
  "Offer Check's server does not store the text you paste. Your text is sent to Google, for machine translation, only if you press “{0}”. Save Encrypted keeps an encrypted copy in this browser only, locked with a passphrase that is not stored.":
    "لا يخزّن خادم Offer Check النص الذي تلصقه. يُرسل نصك إلى Google للترجمة الآلية فقط إذا ضغطت \"{0}\". ميزة \"حفظ مشفّر\" تحفظ نسخة مشفّرة في هذا المتصفح فقط، مقفلة بعبارة مرور لا تُخزَّن.",
  "You are asked to pay recruitment fees": "يُطلب منك دفع رسوم توظيف",
  "Treat this as a red flag. The UAE Government Portal says the employer is responsible for recruitment expenses under the UAE Labour Law.":
    "اعتبر هذا علامة خطر. تقول البوابة الرسمية لحكومة الإمارات إن صاحب العمل مسؤول عن نفقات التوظيف بموجب قانون العمل الإماراتي.",
  "Do not pay recruitment fees to get a job.": "لا تدفع رسوم توظيف للحصول على وظيفة.",
  "No MoHRE offer letter": "لا يوجد خطاب عرض من وزارة الموارد البشرية والتوطين",
  "A genuine job offer comes as an offer letter issued through the Ministry of Human Resources and Emiratisation (MoHRE) and signed by an authorised manager.":
    "يأتي عرض العمل الحقيقي في صورة خطاب عرض صادر عبر وزارة الموارد البشرية والتوطين وموقّع من مدير مفوَّض.",
  "Ask the employer for this offer letter before you accept anything.": "اطلب خطاب العرض هذا من صاحب العمل قبل أن تقبل أي شيء.",
  "The reference number is not checked": "لم يُفحص الرقم المرجعي",
  "An offer letter issued through MoHRE has a reference number, and MoHRE's application status enquiry service lets you look it up yourself.":
    "لخطاب العرض الصادر عبر وزارة الموارد البشرية والتوطين رقم مرجعي، وتتيح لك خدمة الاستعلام عن حالة الطلب في الوزارة البحث عنه بنفسك.",
  "Check the offer's reference number through MoHRE's application status enquiry service.":
    "افحص الرقم المرجعي للعرض عبر خدمة الاستعلام عن حالة الطلب في وزارة الموارد البشرية والتوطين.",
  "The company cannot be found": "لا يمكن العثور على الشركة",
  "You can look up a company in the National Economic Register to see whether it is registered.":
    "يمكنك البحث عن الشركة في السجل الاقتصادي الوطني لمعرفة ما إذا كانت مسجّلة.",
  "Search the company's English and Arabic names in the National Economic Register.":
    "ابحث عن اسم الشركة بالإنجليزية والعربية في السجل الاقتصادي الوطني.",
  "The entry permit comes from an unexpected source": "إذن الدخول يأتي من مصدر غير متوقع",
  "The UAE Government Portal names UAE-based airlines, licensed hotels and licensed travel agencies as legitimate sources. It also suggests comparing any Dubai visa or permit fees with the published price list, so you do not overpay.":
    "تذكر البوابة الرسمية لحكومة الإمارات شركات الطيران العاملة في الإمارات والفنادق المرخّصة ووكالات السفر المرخّصة مصادرَ معتمدة. وتنصح أيضًا بمقارنة أي رسوم لتأشيرات أو أذونات دبي بقائمة الأسعار المنشورة، حتى لا تدفع أكثر من اللازم.",
  "Get an entry permit only through those sources, and check the fees against the published list.":
    "احصل على إذن الدخول من تلك المصادر فقط، وقارن الرسوم بالقائمة المنشورة.",
  "The entry permit is not checked after signing": "لم يُفحص إذن الدخول بعد التوقيع",
  "After you sign, you can verify your entry permit: Dubai permits through GDRFA, and permits of the other emirates through ICP eChannels.":
    "بعد التوقيع، يمكنك التأكد من إذن دخولك: أذونات دبي عبر الإدارة العامة للإقامة وشؤون الأجانب، وأذونات الإمارات الأخرى عبر القنوات الإلكترونية للهيئة الاتحادية للهوية والجنسية.",
  "Check your entry permit through GDRFA for Dubai or ICP eChannels for the other emirates.":
    "افحص إذن دخولك عبر الإدارة العامة للإقامة وشؤون الأجانب في دبي، أو عبر القنوات الإلكترونية للهيئة الاتحادية للهوية والجنسية في الإمارات الأخرى.",
  "A residency visa is promised while you are abroad": "تُوعَد بتأشيرة إقامة وأنت خارج الدولة",
  "A residency visa cannot be processed while you are outside the UAE. You first enter on a valid entry permit and stay in the country while it is processed.":
    "لا يمكن إنجاز تأشيرة الإقامة وأنت خارج الإمارات. تدخل أولًا بإذن دخول ساري المفعول وتبقى في الدولة أثناء إنجازها.",
  "Be cautious of any offer that promises a residency visa before you arrive.":
    "احذر من أي عرض يَعِد بتأشيرة إقامة قبل وصولك.",
  "Work on a visit or tourist visa": "العمل بتأشيرة زيارة أو سياحة",
  "A visit or tourist visa does not give you the right to work in the UAE. Working on one can lead to fines and legal liability.":
    "لا تمنحك تأشيرة الزيارة أو السياحة حق العمل في الإمارات. وقد يؤدي العمل بها إلى غرامات ومسؤولية قانونية.",
  "Do not start work in the UAE on a visit or tourist visa.": "لا تبدأ العمل في الإمارات بتأشيرة زيارة أو سياحة.",
  "Print": "طباعة",

  // Threat Radar and report modal
  "Threat Radar": "رادار التهديدات",
  "Sample reports (demo data)": "بلاغات نموذجية (بيانات تجريبية)",
  "Common job-scam patterns, shown with made-up examples. These are not real reports and are not live data.":
    "أنماط شائعة لاحتيال الوظائف، معروضة بأمثلة مختلقة. هذه ليست بلاغات حقيقية وليست بيانات مباشرة.",
  "Search the reports": "ابحث في البلاغات",
  "Search by words or emirate": "ابحث بالكلمات أو الإمارة",
  "Filter by type": "التصفية حسب النوع",
  "All": "الكل",
  "Advance fee": "رسوم مقدّمة",
  "Document harvesting": "جمع المستندات",
  "Your reports (this tab only, not sent anywhere)": "بلاغاتك (في هذه النافذة فقط، ولم تُرسل إلى أي جهة)",
  "None of your reports match.": "لا يطابق أي من بلاغاتك.",
  "Your report": "بلاغك",
  "Demo data": "بيانات تجريبية",
  "No sample report matches.": "لا يطابق أي بلاغ نموذجي.",
  "Visa fee asked before any interview": "طلب رسوم تأشيرة قبل أي مقابلة",
  "A made-up example: an email offers a hotel job with a high salary, skips the interview, and asks for a visa processing fee paid to a travel agent.":
    "مثال مختلق: رسالة بريد إلكتروني تعرض وظيفة في فندق براتب مرتفع، دون مقابلة، وتطلب رسوم معالجة تأشيرة تُدفع لوكيل سفر.",
  "Part-time online job asks for a phone code": "وظيفة إلكترونية بدوام جزئي تطلب رمز الهاتف",
  "A made-up example: a chat message offers daily pay for simple online tasks and asks for the one-time code sent to the phone to open an account.":
    "مثال مختلق: رسالة دردشة تعرض أجرًا يوميًا مقابل مهام إلكترونية بسيطة وتطلب الرمز لمرة واحدة المرسل إلى الهاتف لفتح حساب.",
  "Deposit and bank statement to reserve a role": "عربون وكشف حساب بنكي لحجز وظيفة",
  "A made-up example: a recruiter asks for a refundable deposit, an Emirates ID copy and a bank statement before any written offer.":
    "مثال مختلق: مسؤول توظيف يطلب عربونًا مستردًا ونسخة من الهوية الإماراتية وكشف حساب بنكي قبل أي عرض مكتوب.",
  "A made-up example: a message uses a company-sounding name but is sent from a free email address instead of the company's own domain.":
    "مثال مختلق: رسالة تستخدم اسمًا يشبه اسم شركة لكنها مرسلة من عنوان بريد إلكتروني مجاني بدلًا من نطاق الشركة نفسها.",
  "Close": "إغلاق",
  "Added to this tab's Threat Radar": "أُضيف إلى رادار التهديدات في هذه النافذة",
  "It was not sent anywhere and is gone after a reload. To report a scam, use the official channels in the Gov Portals Hub.":
    "لم يُرسل إلى أي جهة ويختفي بعد إعادة التحميل. للإبلاغ عن احتيال، استخدم القنوات الرسمية في مركز البوابات الحكومية.",
  "This stays in this browser tab only. Offer Check does not send reports to anyone.":
    "يبقى هذا في نافذة المتصفح هذه فقط. لا يرسل Offer Check البلاغات إلى أي أحد.",
  "Title": "العنوان",
  "Type": "النوع",
  "Emirate": "الإمارة",
  "Quoted text": "النص المقتبس",
  "How it works": "طريقة العمل",
  "Add a title and a description.": "أضف عنوانًا ووصفًا.",
  "Cancel": "إلغاء",
  "Add to this tab": "أضف إلى هذه النافذة",

  // Samples
  "A chat job offer that asks for the code sent to your phone.": "عرض عمل عبر الدردشة يطلب الرمز المرسل إلى هاتفك.",
  "A large salary, no interview, and a visa fee to pay to an agent first.":
    "راتب كبير، دون مقابلة، ورسوم تأشيرة تُدفع لوكيل أولًا.",
  "A message asking for a refundable deposit and your bank details.": "رسالة تطلب عربونًا مستردًا وبياناتك البنكية.",
  "A plain offer that says the employer pays all visa costs.": "عرض عادي يذكر أن صاحب العمل يدفع جميع تكاليف التأشيرة.",

  // Vault
  "Encrypt and save in this browser": "شفّر واحفظ في هذا المتصفح",
  "Saved. Open it from the Encrypted Vault tab with the same passphrase.":
    "حُفظ. افتحه من تبويب الخزنة المشفّرة بعبارة المرور نفسها.",
  "The result is encrypted with AES-256-GCM in this browser and kept only here. The passphrase is not stored; if you forget it, the saved records cannot be opened.":
    "تُشفّر النتيجة باستخدام AES-256-GCM في هذا المتصفح وتُحفظ هنا فقط. لا تُخزَّن عبارة المرور؛ وإذا نسيتها، لا يمكن فتح السجلات المحفوظة.",
  "Passphrase": "عبارة المرور",
  "That passphrase does not open the vault already saved in this browser.":
    "عبارة المرور هذه لا تفتح الخزنة المحفوظة مسبقًا في هذا المتصفح.",
  "This browser did not allow saving.": "لم يسمح هذا المتصفح بالحفظ.",
  "Encrypt and save": "شفّر واحفظ",
  "AES-256-GCM, in this browser only": "AES-256-GCM، في هذا المتصفح فقط",
  "Encrypted Vault": "الخزنة المشفّرة",
  "Results you save with Save Encrypted stay in this browser, encrypted with your passphrase. They are never sent anywhere. The passphrase is not stored: without it the records cannot be opened.":
    "النتائج التي تحفظها بميزة \"حفظ مشفّر\" تبقى في هذا المتصفح، مشفّرة بعبارة مرورك. لا تُرسل إلى أي جهة. لا تُخزَّن عبارة المرور: ومن دونها لا يمكن فتح السجلات.",
  "Lock": "قفل",
  "Open the vault": "افتح الخزنة",
  "Show passphrase": "إظهار عبارة المرور",
  "Open": "فتح",
  "That passphrase does not open the vault saved in this browser.": "عبارة المرور هذه لا تفتح الخزنة المحفوظة في هذا المتصفح.",
  "This browser did not allow reading the vault.": "لم يسمح هذا المتصفح بقراءة الخزنة.",
  "With nothing saved yet, any passphrase opens an empty vault.": "ما دام لم يُحفظ شيء بعد، تفتح أي عبارة مرور خزنة فارغة.",
  "The vault is empty. Check an offer, then choose Save Encrypted on the result.":
    "الخزنة فارغة. افحص عرضًا، ثم اختر \"حفظ مشفّر\" في النتيجة.",
  "Saved results": "النتائج المحفوظة",
  "Delete all": "حذف الكل",
  "saved {0}": "حُفظ في {0}",
  "{0} risk indicators, {1}": "مؤشرات الخطر ({0})، {1}",
  "Checked text": "النص المفحوص",
  "Copy text": "نسخ النص",
  "Delete": "حذف",
  "This browser did not allow that.": "لم يسمح هذا المتصفح بذلك.",
  "No saved results yet": "لا توجد نتائج محفوظة بعد",
  "Saved results are kept only in this browser. They are lost if this browser's data is cleared, and they are not available on another device or browser.":
    "تُحفظ النتائج في هذا المتصفح فقط. وتضيع إذا مُسحت بيانات هذا المتصفح، ولا تتوفر على جهاز أو متصفح آخر.",
  "Run a check, then choose Save Encrypted on the result. You will choose your passphrase there. Offer Check cannot recover it.":
    "أجرِ فحصًا، ثم اختر \"حفظ مشفّر\" في النتيجة. ستختار عبارة المرور هناك. لا يستطيع Offer Check استعادتها.",
  "The checked text was not kept with this result. Only the result was saved.":
    "لم يُحفظ النص المفحوص مع هذه النتيجة. حُفظت النتيجة فقط.",
  "Also keep the checked text (it may contain personal details)":
    "احفظ النص المفحوص أيضًا (قد يحتوي على بيانات شخصية)",
  "Go to the Offer Analyzer": "انتقل إلى محلل العروض",
  "Saved results: {0}": "النتائج المحفوظة: {0}",
  "Offer Check cannot recover a forgotten passphrase.": "لا يستطيع Offer Check استعادة عبارة مرور منسية.",
  "Lock vault": "قفل الخزنة",
  "Delete all saved results? This cannot be undone.": "حذف جميع النتائج المحفوظة؟ لا يمكن التراجع عن ذلك.",
  "Keep them": "إبقاؤها",
  "Delete this saved result? This cannot be undone.": "حذف هذه النتيجة المحفوظة؟ لا يمكن التراجع عن ذلك.",
  "Keep it": "إبقاؤها",
  "Notes": "ملاحظات",
  "View result": "عرض النتيجة",
  "This result was saved before View result was added, so it cannot be opened in the analyzer.":
    "حُفظت هذه النتيجة قبل إضافة \"عرض النتيجة\"، لذا لا يمكن فتحها في المحلل.",
  "Notes (optional)": "ملاحظات (اختياري)",
  "Confirm passphrase": "تأكيد عبارة المرور",
  "At least {0} characters.": "الحد الأدنى لعدد الأحرف: {0}.",
  "A vault is already saved in this browser. Use the passphrase you chose for it.":
    "توجد خزنة محفوظة مسبقًا في هذا المتصفح. استخدم عبارة المرور التي اخترتها لها.",
  "Enter a passphrase.": "أدخل عبارة مرور.",
  "The passphrase needs at least {0} characters.": "عبارة المرور أقصر من اللازم. الحد الأدنى لعدد الأحرف: {0}.",
  "The two passphrases do not match.": "عبارتا المرور غير متطابقتين.",
  "That passphrase does not open the vault already saved in this browser. Nothing was changed.":
    "عبارة المرور هذه لا تفتح الخزنة المحفوظة مسبقًا في هذا المتصفح. لم يتغير شيء.",
  "You choose this passphrase. Offer Check cannot recover it. If you forget it, saved results cannot be opened.":
    "أنت من يختار عبارة المرور هذه. لا يستطيع Offer Check استعادتها. وإذا نسيتها، لا يمكن فتح النتائج المحفوظة.",
  "Saved to your vault in this browser.": "حُفظ في خزنتك في هذا المتصفح.",
  "Open the Encrypted Vault": "افتح الخزنة المشفّرة",
  "Opened from your Encrypted Vault. Saved {0}.": "فُتح من خزنتك المشفّرة. تاريخ الحفظ: {0}.",
};

// Official names: in Arabic, each contact shows its own official Arabic name (src/data/uaeContacts.ts).
for (const contact of UAE_CONTACTS) {
  ENTRIES[contact.name] ??= contact.arabicName;
}

export const AR: Record<string, string> = ENTRIES;
