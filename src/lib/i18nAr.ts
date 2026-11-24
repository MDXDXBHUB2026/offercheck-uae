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
  "Portals": "البوابات",
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
  "The Arabic interface text was written with an AI tool and has not been reviewed by a native speaker.":
    "كُتب نص الواجهة العربية بأداة ذكاء اصطناعي ولم يراجعه متحدث أصلي باللغة العربية.",
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
  // [review] Auto-Redact always on (2026-11-11): the sentence about hidden numbers is new.
  "Prototype. Use synthetic or redacted offers only. Emirates ID, passport and UAE IBAN numbers in common formats are hidden in your browser before the text is sent. Offer Check's server does not store offer text. If you choose translation, Google Cloud Translation receives it.":
    "نموذج أولي. استخدم عروضًا مصطنعة أو منقّحة فقط. تُخفى أرقام الهوية الإماراتية وجواز السفر والآيبان الإماراتي بالصيغ الشائعة في متصفحك قبل إرسال النص. لا يخزّن خادم Offer Check نص العرض. إذا اخترت الترجمة، يستلمه Google Cloud Translation.",
  "Made-up examples written for this app. No real company or person.":
    "أمثلة مختلقة كُتبت لهذا التطبيق. لا تخص أي شركة أو شخص حقيقي.",
  "Offer Check is an early prototype that checks English text. Text in other languages can be machine translated first, and a translation can lose or change meaning. A low score, or \"No risk indicators found\", does not mean an offer is genuine.":
    "Offer Check نموذج أولي مبكر يفحص النص الإنجليزي. يمكن ترجمة النص المكتوب بلغات أخرى آليًا أولًا، وقد تُفقد الترجمة المعنى أو تغيّره. الدرجة المنخفضة، أو عبارة \"لم يُعثر على مؤشرات خطر\"، لا تعني أن العرض حقيقي.",

  // Hero (check page)
  "Check a job offer before you pay or share anything.": "افحص عرض العمل قبل أن تدفع أو تشارك أي شيء.",
  "{0} rules, every finding quoted": "عدد القواعد: {0}، وكل نتيجة مقتبسة",
  "Rule-based score: the same English text gives the same score.":
    "درجة قائمة على القواعد: النص الإنجليزي نفسه يعطي الدرجة نفسها.",
  "Low, medium or high risk indicators": "مؤشرات خطر منخفضة أو متوسطة أو مرتفعة",
  "Paste a job offer to check it against {0} fixed rules. The rules read English. Other languages can be translated by Google Cloud Translation if you agree. Offer Check's server does not store your text.":
    "الصق عرض عمل لفحصه وفق القواعد الثابتة (عددها {0}). تقرأ القواعد اللغة الإنجليزية. يمكن ترجمة اللغات الأخرى عبر Google Cloud Translation إذا وافقت. لا يخزّن خادم Offer Check النص الذي تدخله.",
  "Example findings": "أمثلة على النتائج",
  // [review] Phase 5 (2026-11-23): the missed-scam link, its note, the privacy lines about the form and the daily totals.
  "Offer Check missed a scam? Tell us what it did, without pasting the offer.": "لم يكتشف Offer Check عملية احتيال؟ أخبرنا بما فعله، من دون لصق العرض.",
  "The link opens a Google Form in a new tab. Google receives what you type there. Offer Check does not send any offer text to the form.":
    "يفتح الرابط نموذج Google في علامة تبويب جديدة. تستلم Google ما تكتبه هناك. لا يرسل Offer Check أي نص عرض إلى النموذج.",
  "If Offer Check missed a scam": "إذا لم يكتشف Offer Check عملية احتيال",
  "The link under a result, and on the About and Privacy pages, opens a Google Form in a new tab. Google receives what you type there, under Google's terms. Offer Check does not send the form any offer text, result or other data from the app, and the form is not part of this app.":
    "يفتح الرابط الظاهر تحت النتيجة وفي صفحتي «حول» و«الخصوصية» نموذج Google في علامة تبويب جديدة. تستلم Google ما تكتبه هناك، وتسري عليه شروطها. لا يرسل Offer Check إلى النموذج أي نص عرض أو نتيجة أو بيانات أخرى من التطبيق، والنموذج ليس جزءًا من هذا التطبيق.",
  "Please do not paste the offer into the form: say what Offer Check did and what it missed.": "يُرجى عدم لصق العرض في النموذج: اكتب ما فعله Offer Check وما لم يكتشفه.",
  "We keep daily totals of how many checks, rejected inputs, errors and limit hits happened, with no text and nothing that identifies you.":
    "نحتفظ بإجماليات يومية لعدد الفحوص والمدخلات المرفوضة والأخطاء ومرات بلوغ الحدّ، من دون أي نص ومن دون أي شيء يعرّف بك.",
  "{0} EXAMPLES": "الأمثلة: {0}",
  "Example only, not your text": "مثال فقط، وليس نصك",
  "Animation only": "رسوم متحركة فقط",
  "Pause radar": "إيقاف الرادار مؤقتًا",
  "Skip to content": "انتقل إلى المحتوى",
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
  // [review] hero "Example findings" rows, values read from the "Visa fee before joining" sample (2026-11-11).
  "Fee asked before joining": "رسوم مطلوبة قبل الالتحاق بالعمل",
  // [review]
  "Free email sender": "مرسل ببريد مجاني",
  // [review] {0} is the sender's domain, such as gmail.com.
  "{0} address": "عنوان {0}",
  // [review]
  "check on the MoHRE site": "تحقق عبر موقع وزارة الموارد البشرية والتوطين",
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
  "Clear text": "مسح النص",
  "Check offer": "افحص العرض",
  "Checking...": "جارٍ الفحص...",
  // Phase 4b (2026-11-11): strings found with no Arabic (over the limit, the checking panel title, a
  // dropped file). The string for the old off state was removed with the redaction toggle.
  "over the limit": "تجاوز الحد",
  "Checking the offer": "جارٍ فحص العرض",
  "Paste the text of the letter. Offer Check does not read files or images.":
    "الصق نص الخطاب. لا يقرأ Offer Check الملفات أو الصور.",
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
  "Offer text is too long": "نص العرض طويل جدًا",
  "Offer text must be 20,000 characters or fewer.": "يجب ألا يتجاوز نص العرض 20,000 حرف.",
  "Could not reach the server": "تعذّر الوصول إلى الخادم",
  "You appear to be offline": "يبدو أنك غير متصل بالإنترنت",
  "Something went wrong on the server": "حدث خطأ في الخادم",
  "The reply could not be read": "تعذّرت قراءة الرد",
  "The check could not run": "تعذّر إجراء الفحص",
  // [review] Phase 2 per-visitor limit on checks (2026-11-15).
  "Too many checks": "عمليات فحص كثيرة",
  // [review]
  "Too many checks in a short time. Your text is still in the box. Wait a minute, then try again.":
    "عمليات فحص كثيرة في وقت قصير. نصك ما زال في المربع. انتظر دقيقة، ثم أعد المحاولة.",
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
  // [review] new group label for the result card's action buttons (2026-11-11).
  "Result actions": "إجراءات النتيجة",
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
  // [review] "How this was checked": each matched rule's plain name, points and ID (2026-11-11).
  "Rules that matched": "القواعد المتطابقة",
  // [review]
  "+{0} points": "+{0} نقطة",
  "Copy quote": "نسخ الاقتباس",
  "Copied": "تم النسخ",
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
  // [review] Auto-Redact always on (2026-11-11): shown only when a number was hidden.
  "ID, passport and bank numbers are hidden before the text is sent. A reference number in a similar format may also be hidden. Your original text is still in the box.":
    "تُخفى أرقام الهوية وجواز السفر والحسابات المصرفية قبل إرسال النص. وقد يُخفى أيضًا رقم مرجعي بصيغة مشابهة. نصك الأصلي ما زال في المربع.",
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
  // [review] Phase 2 daily translation limit per visitor (2026-11-15).
  "You have reached today's limit for translations. Try again tomorrow, or check the original text; the parts not in English will not be checked.":
    "بلغت الحد اليومي للترجمة. أعد المحاولة غدًا، أو افحص النص الأصلي؛ لن تُفحص الأجزاء غير المكتوبة بالإنجليزية.",
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

  // Footer disclaimer lines (the "What this check cannot do" section and its 9 items were removed 2026-11-11, LIMITS-2)
  "Risk indicators, not a verdict. It has been tested on synthetic offers only, not validated on real scam data.":
    "مؤشرات خطر، وليست حكمًا. اختُبر على عروض مصطنعة فقط، ولم يُختبر على بيانات احتيال حقيقية.",
  "A low score does not confirm an offer is genuine. Offer Check does not report anything for you and does not give legal advice. A translation can lose or change meaning.":
    "الدرجة المنخفضة لا تؤكد أن العرض حقيقي. لا يبلّغ Offer Check عن أي شيء نيابةً عنك ولا يقدّم استشارة قانونية. قد تُفقد الترجمة المعنى أو تغيّره.",

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
    "أداة Offer Check UAE مجانية، تبحث عن علامات التحذير الشائعة في عرض العمل قبل أن تدفع أو تشارك أي شيء.",
  "Where to report a job scam": "أين تبلّغ عن احتيال وظيفي",
  // Warning signs (src/lib/warningSigns.ts). Phase 4d, 2026-11-11: checked against the official
  // Arabic page the English was paraphrased from, UAE Government Portal, "التحقق من صحة عقود العمل،
  // وأذونات الدخول والتأشيرات", https://u.ae/ar/information-and-services/visa-and-emirates-id/Visa-information/tips-to-avoid-labour-and-visa-fraud
  // (updated 24 سبتمبر 2026, read 2026-11-11). Each entry is marked:
  //   [official]          the page's own Arabic sentence, word for word;
  //   [official, adapted] the page's wording, joined or shortened to match the English;
  //   [review]            no matching sentence on the page: our wording, kept, needs a native speaker.
  // Nothing is added beyond the page: no fine, fee, law article or number.

  // [review] heading, not on the page
  "You are asked to pay recruitment fees": "يُطلب منك دفع رسوم توظيف",
  // [official, adapted] page, point 5: "ينبغي العلم أن صاحب العمل هو المسؤول عن دفع جميع مصاريف عملية
  // التوظيف بموجب قانون العمل لدولة الإمارات العربية المتحدة." The first sentence is ours [review].
  "Treat this as a red flag. The UAE Government Portal says the employer is responsible for recruitment expenses under the UAE Labour Law.":
    "اعتبر هذا علامة خطر. تذكر البوابة الرسمية لحكومة الإمارات أن صاحب العمل هو المسؤول عن دفع جميع مصاريف عملية التوظيف بموجب قانون العمل لدولة الإمارات العربية المتحدة.",
  // [review] action, not on the page
  "Do not pay recruitment fees to get a job.": "لا تدفع رسوم توظيف للحصول على وظيفة.",
  // [review] heading, not on the page
  "No MoHRE offer letter": "لا يوجد عرض عمل صادر من وزارة الموارد البشرية والتوطين",
  // [official, adapted] page, point 1: "لابد أن يقدم لك عرض عمل صادر من وزارة الموارد البشرية والتوطين
  // بدولة الإمارات، ويجب أن يحمل توقيع المدير المسؤول."
  "A genuine job offer comes as an offer letter issued through the Ministry of Human Resources and Emiratisation (MoHRE) and signed by an authorised manager.":
    "عرض العمل الحقيقي يكون صادرًا من وزارة الموارد البشرية والتوطين بدولة الإمارات، ويجب أن يحمل توقيع المدير المسؤول.",
  // [review] action, not on the page
  "Ask the employer for this offer letter before you accept anything.": "اطلب عرض العمل هذا من صاحب العمل قبل أن تقبل أي شيء.",
  // [review] heading, not on the page
  "The reference number is not checked": "لم يُتحقق من رقم عرض العمل",
  // [official, adapted] page, point 2: "يمكنك استخدام رقم عرض العمل للتحقق من صحة الطلب عبر الموقع
  // الإلكتروني لوزارة الموارد البشرية والتوطين ( خدمات الاستعلام – حالة الطلب )."
  "An offer letter issued through MoHRE has a reference number, and MoHRE's application status enquiry service lets you look it up yourself.":
    "يمكنك استخدام رقم عرض العمل للتحقق من صحة الطلب بنفسك عبر الموقع الإلكتروني لوزارة الموارد البشرية والتوطين (خدمات الاستعلام – حالة الطلب).",
  // [official, adapted] same point 2, as an instruction
  "Check the offer's reference number through MoHRE's application status enquiry service.":
    "تحقق من رقم عرض العمل عبر الموقع الإلكتروني لوزارة الموارد البشرية والتوطين (خدمات الاستعلام – حالة الطلب).",
  // [review] heading, not on the page
  "The company cannot be found": "لا يمكن العثور على الشركة",
  // [official, adapted] page, point 6: "تأكد من أن الشركة لها وجود وقائمة قانوناً."
  "You can look up a company in the National Economic Register to see whether it is registered.":
    "يمكنك البحث في موقع السجل الاقتصادي الوطني للتأكد من أن الشركة لها وجود وقائمة قانونًا.",
  // [official, adapted] page, point 6: "يمكنك البحث عن اسم الشركة باللغة الإنجليزية والعربية في موقع
  // السجل الاقتصادي الوطني"
  "Search the company's English and Arabic names in the National Economic Register.":
    "ابحث عن اسم الشركة باللغة الإنجليزية والعربية في موقع السجل الاقتصادي الوطني.",
  // [review] heading, not on the page
  "The entry permit comes from an unexpected source": "إذن الدخول يأتي من مصدر غير متوقع",
  // [official, adapted] page, points 10 and 11: "تصدر أذونات الدخول بغرض السياحة عن شركات الطيران القائمة
  // في دولة الإمارات ... كما تصدر ... عن الفنادق ووكالات السفر المرخصة في دولة الإمارات." and "حتى لا تدفع
  // أكثر من المستحق، تعرف على رسوم التأشيرات وأذونات الدخول الصادرة من دبي." [review] The page says
  // these sources issue tourist entry permits; the English says "legitimate sources" without "tourist".
  "The UAE Government Portal names UAE-based airlines, licensed hotels and licensed travel agencies as legitimate sources. It also suggests comparing any Dubai visa or permit fees with the published price list, so you do not overpay.":
    "تذكر البوابة الرسمية لحكومة الإمارات أن أذونات الدخول تصدر عن شركات الطيران القائمة في دولة الإمارات، والفنادق ووكالات السفر المرخصة في دولة الإمارات. وتنصح بالتعرف على رسوم التأشيرات وأذونات الدخول الصادرة من دبي، حتى لا تدفع أكثر من المستحق.",
  // [review] action, not on the page
  "Get an entry permit only through those sources, and check the fees against the published list.":
    "احصل على إذن الدخول من تلك المصادر فقط، وقارن الرسوم بالقائمة المنشورة.",
  // [review] heading, not on the page
  "The entry permit is not checked after signing": "لم يُتحقق من إذن الدخول بعد التوقيع",
  // [official, adapted] page, points 3, 8 and 9: "بعد قيامك بتوقيع عرض العمل"; "يمكنك التحقق من صحته عبر
  // الموقع الإلكتروني للإدارة العامة للإقامة وشؤون الأجانب"; "عبر المنصة الإلكترونية eChannels التابعة
  // للهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ".
  "After you sign, you can verify your entry permit: Dubai permits through GDRFA, and permits of the other emirates through ICP eChannels.":
    "بعد قيامك بتوقيع عرض العمل، يمكنك التحقق من صحة إذن الدخول: الصادر من دبي عبر الموقع الإلكتروني للإدارة العامة للإقامة وشؤون الأجانب، والصادر من الإمارات الأخرى عبر المنصة الإلكترونية eChannels التابعة للهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ.",
  // [official, adapted] same points 8 and 9, as an instruction
  "Check your entry permit through GDRFA for Dubai or ICP eChannels for the other emirates.":
    "تحقق من إذن دخولك عبر الموقع الإلكتروني للإدارة العامة للإقامة وشؤون الأجانب في دبي، أو عبر المنصة الإلكترونية eChannels التابعة للهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ في الإمارات الأخرى.",
  // [review] heading, not on the page
  "A residency visa is promised while you are abroad": "تُوعَد بتأشيرة إقامة وأنت خارج الدولة",
  // [official] page, point 14, word for word
  "A residency visa cannot be processed while you are outside the UAE. You first enter on a valid entry permit and stay in the country while it is processed.":
    "لا يمكن إتمام إجراءات تأشيرة الإقامة لأي شخص لا يزال خارج دولة الإمارات، حيث لا بد من دخول صاحب الطلب إلى الدولة بموجب إذن دخول ساري، وبقائه فيها حتى اكتمال إجراءات إصدار تأشيرة الإقامة.",
  // [review] action, not on the page
  "Be cautious of any offer that promises a residency visa before you arrive.":
    "احذر من أي عرض يَعِد بتأشيرة إقامة قبل وصولك.",
  // [review] heading, not on the page
  "Work on a visit or tourist visa": "العمل بتأشيرة زيارة أو سياحة",
  // [official] page, point 4, word for word
  "A visit or tourist visa does not give you the right to work in the UAE. Working on one can lead to fines and legal liability.":
    "لا يعطيك إذن الدخول بغرض السياحة أو الزيارة الحق في العمل داخل دولة الإمارات. وفي حالة قيامك بالعمل بعد دخول الدولة بتأشيرة سياحة أو زيارة، فإنك قد تتعرض لغرامات ومساءلة قانونية.",
  // [review] action, not on the page
  "Do not start work in the UAE on a visit or tourist visa.": "لا تبدأ العمل في الإمارات بتأشيرة زيارة أو سياحة.",
  "Print": "طباعة",

  // Shared words (kept: Title, Cancel)
  "Title": "العنوان",
  "Cancel": "إلغاء",
  "How it works": "طريقة العمل",
  // [review] added 2026-11-23 (Phase 5b): the five-pattern guide on /about
  "Five common job-scam patterns": "خمسة أنماط شائعة لاحتيال الوظائف",
  "These are the five warning signs Offer Check's fixed rules look for. One sign does not prove a scam, and finding none does not mean an offer is real.":
    "هذه هي علامات التحذير الخمس التي تبحث عنها قواعد Offer Check الثابتة. وجود علامة واحدة لا يثبت أنه احتيال، وعدم وجود أي علامة لا يعني أن العرض حقيقي.",
  "A fee before you join": "رسوم قبل أن تنضم",
  "You are asked to pay for a visa, training, a uniform, a medical test or \"processing\" before you start work.":
    "يُطلب منك دفع مبلغ لتأشيرة أو تدريب أو زي موحّد أو فحص طبي أو «معالجة» قبل أن تبدأ العمل.",
  "Do not pay. Confirm the offer yourself on the official sites first.": "لا تدفع. تأكد من العرض بنفسك أولًا على المواقع الرسمية.",
  "A request for card or login details": "طلب بيانات البطاقة أو بيانات الدخول",
  "You are asked for a one-time code, a password, a card number or an online banking login, for example to \"set up your salary account\".":
    "يُطلب منك رمز لمرة واحدة أو كلمة مرور أو رقم بطاقة أو بيانات الدخول إلى الخدمة المصرفية عبر الإنترنت، مثلًا «لإعداد حساب راتبك».",
  "Do not share them with anyone who contacted you first.": "لا تشاركها مع أي شخص تواصل معك أولًا.",
  "Identity documents sent early": "إرسال وثائق الهوية مبكرًا",
  "You are asked for a passport, an Emirates ID or a bank statement before you have a written offer or contract.":
    "يُطلب منك جواز سفر أو هوية إماراتية أو كشف حساب بنكي قبل أن يكون لديك عرض أو عقد مكتوب.",
  "Wait until you have confirmed the employer. Send only what is needed, and hide numbers you do not need to show.":
    "انتظر حتى تتأكد من صاحب العمل. أرسل ما يلزم فقط، وأخفِ الأرقام التي لا حاجة لإظهارها.",
  "Pressure to act today": "ضغط للتصرف اليوم",
  "The message says the offer ends tonight, or that you must reply or pay within hours.":
    "تقول الرسالة إن العرض ينتهي الليلة، أو إن عليك الرد أو الدفع خلال ساعات.",
  "Slow down. Take time to check, and ask someone you trust before you reply.": "تمهّل. خذ وقتك في التحقق، واسأل شخصًا تثق به قبل أن ترد.",
  "A free email sender": "مرسل ببريد إلكتروني مجاني",
  "A named company writes to you from a free address such as Gmail or Yahoo, not from the address of its own website.":
    "شركة معروفة بالاسم تراسلك من عنوان مجاني مثل Gmail أو Yahoo، لا من عنوان موقعها الخاص.",
  "Look up the company's own website yourself and compare the address. Do not use contact details from the message.":
    "ابحث بنفسك عن موقع الشركة الرسمي وقارن العنوان. لا تستخدم بيانات الاتصال الواردة في الرسالة.",
  "What it looks like:": "كيف يبدو:",
  "Check an offer in the Offer Analyzer": "افحص عرضًا في فاحص العروض",
  "Report a scam": "الإبلاغ عن احتيال",
  "Official UAE places to report a suspected job scam:": "جهات رسمية في الإمارات للإبلاغ عن احتيال وظيفي مشتبه به:",
  // [review] added 2026-11-23 (Phase 5b): the line under the result actions

  // Samples
  "A chat job offer that asks for the code sent to your phone.": "عرض عمل عبر الدردشة يطلب الرمز المرسل إلى هاتفك.",
  "A large salary, no interview, and a visa fee to pay to an agent first.":
    "راتب كبير، دون مقابلة، ورسوم تأشيرة تُدفع لوكيل أولًا.",
  "A message asking for a refundable deposit and your bank details.": "رسالة تطلب عربونًا مستردًا وبياناتك البنكية.",
  "A plain offer that says the employer pays all visa costs.": "عرض عادي يذكر أن صاحب العمل يدفع جميع تكاليف التأشيرة.",

  // [review] Verification and Official channel (2026-11-11): every entry below, written with an AI
  // tool, not reviewed by a native speaker.
  "Verification (text only, no outside lookups)": "التحقق (من النص فقط، دون أي بحث خارجي)",
  "{0} of {1} cross-checks matched": "تطابق من الفحوص المتقاطعة: {0} من {1}",
  "No official step applies to these findings": "لا تنطبق أي خطوة رسمية على هذه النتائج",
  "{0} official steps for {1} findings": "الخطوات الرسمية: {0}، للنتائج: {1}",
  "{0} official step for {1} finding": "الخطوات الرسمية: {0}، للنتائج: {1}",
  "{0} official steps for {1} finding": "الخطوات الرسمية: {0}، للنتائج: {1}",
  "{0} official step for {1} findings": "الخطوات الرسمية: {0}، للنتائج: {1}",
  "Cross-checks on the offer": "فحوص متقاطعة على العرض",
  "Official steps for these findings": "خطوات رسمية لهذه النتائج",
  "These cross-checks read only the text you checked. Nothing is looked up outside Offer Check, and they do not change the score.":
    "تقرأ هذه الفحوص المتقاطعة النص الذي فحصته فقط. لا يُبحث عن أي شيء خارج Offer Check، ولا تغيّر هذه الفحوص الدرجة.",
  "{0} cross-checks ran and none matched. This does not confirm that the offer is genuine.":
    "نُفّذت الفحوص المتقاطعة ({0}) ولم يتطابق أي منها. هذا لا يؤكد أن العرض حقيقي.",
  "Official pages and services that apply to these findings. Use the official page for current details.":
    "صفحات وخدمات رسمية تنطبق على هذه النتائج. استخدم الصفحة الرسمية للاطلاع على أحدث التفاصيل.",
  "For: {0}": "تخص: {0}",
  "Last checked": "آخر مراجعة",
  "Official source": "المصدر الرسمي",
  "Cross-checks that matched": "الفحوص المتقاطعة المتطابقة",
  "Not counted in the score": "لا تُحتسب في الدرجة",
  "Free email address for a named company or government body": "بريد إلكتروني مجاني لشركة أو جهة حكومية مذكورة",
  "Presents itself as a UAE authority, with no official address": "يقدّم نفسه على أنه جهة إماراتية رسمية، دون عنوان رسمي",
  "Shortened link": "رابط مختصر",
  "Link to a numeric address": "رابط إلى عنوان رقمي",
  "Address that looks like an official one": "عنوان يشبه عنوانًا رسميًا",
  "Asks to continue only on a messaging app": "يطلب المتابعة عبر تطبيق مراسلة فقط",
  "Asks for a payment and also says there are no fees": "يطلب دفع مبلغ ويقول أيضًا إنه لا توجد رسوم",
  "Salary in more than one currency": "الراتب بأكثر من عملة",
  "The text names a company or a government body, but gives a free email address.":
    "يذكر النص شركة أو جهة حكومية، لكنه يعطي عنوان بريد إلكتروني مجانيًا.",
  "The text presents itself as coming from, or acting for, a UAE authority, but gives no address on an official UAE government website from Offer Check's list, or ties an address that is not on that list to the authority.":
    "يقدّم النص نفسه على أنه صادر عن جهة إماراتية رسمية أو يعمل باسمها، لكنه لا يعطي أي عنوان على موقع حكومي إماراتي رسمي من قائمة Offer Check، أو ينسب إلى هذه الجهة عنوانًا ليس في تلك القائمة.",
  // [review] V-02 narrowed and authority mentions (2026-11-11): written with an AI tool, not reviewed.
  "MoHRE is named in the text": "النص يذكر وزارة الموارد البشرية والتوطين",
  "ICP is named in the text": "النص يذكر الهيئة الاتحادية للهوية والجنسية",
  "GDRFA or Amer is named in the text": "النص يذكر الإدارة العامة للإقامة وشؤون الأجانب أو مراكز آمر",
  "{0} official step for a UAE authority named in the text": "الخطوات الرسمية: {0}، لجهة إماراتية رسمية مذكورة في النص",
  "{0} official steps for a UAE authority named in the text": "الخطوات الرسمية: {0}، لجهة إماراتية رسمية مذكورة في النص",
  "{0}, and {1} official step for a UAE authority named in the text": "{0}، والخطوات الرسمية: {1}، لجهة إماراتية رسمية مذكورة في النص",
  "{0}, and {1} official steps for a UAE authority named in the text": "{0}، والخطوات الرسمية: {1}، لجهة إماراتية رسمية مذكورة في النص",
  "A shortened link hides the website it opens.": "الرابط المختصر يُخفي الموقع الذي يفتحه.",
  "The link goes to a numeric address instead of a website name.": "يؤدي الرابط إلى عنوان رقمي بدلًا من اسم موقع.",
  "An email address or link uses the name of an official UAE government website, but is not on that website.":
    "يستخدم عنوان بريد إلكتروني أو رابط اسم موقع حكومي إماراتي رسمي، لكنه ليس على ذلك الموقع.",
  "The text asks you to continue on WhatsApp or Telegram, with no other way to reply.":
    "يطلب النص منك المتابعة عبر واتساب أو تيليجرام، دون أي طريقة أخرى للرد.",
  "The text asks you to pay and also says there are no fees.": "يطلب النص منك الدفع ويقول أيضًا إنه لا توجد رسوم.",
  "The salary is given in more than one currency.": "الراتب مذكور بأكثر من عملة.",
  "Report cybercrime such as online fraud. Available in the MoI UAE app.":
    "الإبلاغ عن الجرائم الإلكترونية مثل الاحتيال عبر الإنترنت. متاح في تطبيق MoI UAE.",
  "Verify a job offer by its reference number through the MOHRE enquiry service, and contact MOHRE through its official channels.":
    "تحقّق من عرض العمل برقمه المرجعي عبر خدمة الاستعلام في وزارة الموارد البشرية والتوطين، وتواصل مع الوزارة عبر قنواتها الرسمية.",

  // Production hardening Phase 3 (2026-11-15): the grouped header, the footer's site links, and the
  // About, Privacy and Terms pages. Every entry in this block is [review]: written for this app, not
  // yet reviewed by a native speaker. The operator line is in src/lib/siteConfig.ts, not here.
  // [review] header groups, tab and footer labels
  "Tools": "الأدوات",
  "Information": "معلومات",
  "Guidelines": "الإرشادات",
  "About": "حول",
  "About this site": "عن هذا الموقع",
  "Privacy": "الخصوصية",
  "Terms": "الشروط",
  // [review] About page (/about)
  "What it is for, and who it is for": "الغرض منه، ولمن هو",
  "Some job offers sent in the UAE by WhatsApp, email or LinkedIn are fake or risky. They may ask you to pay a fee, share a code or send your identity documents before you have a real job.":
    "بعض عروض العمل المرسلة في الإمارات عبر واتساب أو البريد الإلكتروني أو LinkedIn مزيفة أو محفوفة بالمخاطر. قد تطلب منك دفع رسوم أو مشاركة رمز أو إرسال مستندات هويتك قبل أن تحصل على وظيفة فعلية.",
  // [review] audience sentence rewritten (2026-11-16): covers people abroad as well as in the UAE.
  "It is for anyone who has received a job offer for work in the UAE, whether they are already in the country or still abroad, and wants to check it for warning signs before they pay or share anything.":
    "إنه لكل من تلقى عرض عمل للعمل في الإمارات، سواء كان داخل الدولة بالفعل أو لا يزال في الخارج، ويريد فحصه بحثًا عن علامات التحذير قبل أن يدفع أو يشارك أي شيء.",
  "You paste the text of an offer: a message, an email or a post. Emirates ID, passport and UAE IBAN numbers in common formats are hidden in your browser before the text is sent.":
    "تلصق نص العرض: رسالة أو بريدًا إلكترونيًا أو منشورًا. تُخفى أرقام الهوية الإماراتية وجواز السفر والآيبان الإماراتي بالصيغ الشائعة في متصفحك قبل إرسال النص.",
  "Five fixed rules read the text for warning signs: a request to pay a fee or money; a request for a code, password or card details; a request for identity or bank documents; pressure to act quickly; and a free email address.":
    "تقرأ خمس قواعد ثابتة النص بحثًا عن علامات التحذير: طلب دفع رسوم أو مال؛ وطلب رمز أو كلمة مرور أو بيانات بطاقة؛ وطلب مستندات هوية أو مستندات بنكية؛ والضغط للتصرف بسرعة؛ وعنوان بريد إلكتروني مجاني.",
  "Each sign found adds 20 or 40 points, by how serious it is, up to 100. A request to pay, or for a code, password or card details, puts the score at 60 or more on its own. 0 to 29 is low, 30 to 59 is medium, 60 and over is high.":
    "كل علامة يُعثر عليها تضيف 20 أو 40 نقطة بحسب خطورتها، حتى 100. طلب الدفع، أو طلب رمز أو كلمة مرور أو بيانات بطاقة، يرفع الدرجة وحده إلى 60 أو أكثر. من 0 إلى 29 منخفضة، ومن 30 إلى 59 متوسطة، و60 فأكثر مرتفعة.",
  "Each finding quotes the words in your text that matched, so you can see why it was flagged.":
    "تقتبس كل نتيجة الكلمات التي تطابقت في نصك، لترى سبب الإشارة إليها.",
  "Cross-checks point out other things in the text, such as a shortened link or a request to continue only on WhatsApp. They do not change the score.":
    "تشير الفحوص المتقاطعة إلى أمور أخرى في النص، مثل رابط مختصر أو طلب المتابعة عبر واتساب فقط. ولا تغيّر الدرجة.",
  "Official steps tell you which UAE government channel to use to confirm the offer yourself.":
    "تخبرك الخطوات الرسمية بالقناة الحكومية الإماراتية التي تستخدمها للتأكد من العرض بنفسك.",
  "It does not use an AI model to score your text.": "لا يستخدم نموذج ذكاء اصطناعي لتقييم نصك.",
  "Fixed rules set the score, so the same English text always gets the same score.":
    "تحدد القواعد الثابتة الدرجة، لذا يحصل النص الإنجليزي نفسه دائمًا على الدرجة نفسها.",
  "What it cannot do": "ما لا يستطيع فعله",
  "The rules look for known patterns only. An offer worded another way can be missed.":
    "تبحث القواعد عن أنماط معروفة فقط. قد يفوتها عرض مكتوب بصياغة أخرى.",
  "The rules read English. Text in other languages is checked only if you choose machine translation first, and a translation can lose or change meaning.":
    "تقرأ القواعد الإنجليزية. لا يُفحص النص المكتوب بلغات أخرى إلا إذا اخترت الترجمة الآلية أولًا، وقد تُفقد الترجمة المعنى أو تغيّره.",
  "It has been tested on made-up example offers only, not validated on real scams.":
    "اختُبر على عروض مثال مصطنعة فقط، ولم يُختبر على حالات احتيال حقيقية.",
  "A low score does not mean an offer is genuine.": "الدرجة المنخفضة لا تعني أن العرض حقيقي.",
  "Cross-checks read only the text you paste. No company, website or offer number is looked up anywhere.":
    "تقرأ الفحوص المتقاطعة النص الذي تلصقه فقط. لا يُبحث عن أي شركة أو موقع أو رقم عرض في أي مكان.",
  "Your privacy": "خصوصيتك",
  "Offer Check's server does not store or log the text you check. Text is sent to Google only if you choose translation. The Action & Report Kit is built in this browser and nothing in it is sent. There are no advertising or tracking scripts.":
    "لا يخزّن خادم Offer Check النص الذي تفحصه ولا يسجّله. لا يُرسل النص إلى Google إلا إذا اخترت الترجمة. تُنشأ حزمة الإجراء والبلاغ في هذا المتصفح، ولا يُرسل أي شيء منها. لا توجد نصوص برمجية للإعلانات أو التتبع.",
  "Read the privacy notice": "اقرأ إشعار الخصوصية",
  "Read the terms of use": "اقرأ شروط الاستخدام",
  "Who runs it": "من يديره",
  "Offer Check UAE is not affiliated with any government body. It does not report anything for you and does not give legal advice.":
    "لا يتبع Offer Check UAE أي جهة حكومية. لا يبلّغ عن أي شيء نيابةً عنك ولا يقدّم استشارة قانونية.",
  "Contact:": "التواصل:",
  // [review] Privacy page (/privacy)
  "Privacy notice": "إشعار الخصوصية",
  "Last updated:": "آخر تحديث:",
  "What Offer Check sends, keeps and does not keep when you use it.":
    "ما يرسله Offer Check وما يحتفظ به وما لا يحتفظ به عند استخدامك له.",
  "When you check an offer": "عند فحص عرض",
  "Your browser sends Offer Check's server the text in the box and, if you translated it first, whether the translation worked and which language was detected. Like any web request, it also carries your network (IP) address.":
    "يرسل متصفحك إلى خادم Offer Check النص الموجود في المربع، وإذا ترجمته أولًا، ما إذا نجحت الترجمة واللغة التي اكتُشفت. ومثل أي طلب ويب، يحمل الطلب أيضًا عنوان شبكتك (IP).",
  "The server runs the check and sends the result back. It does not store the text or the result, and Offer Check's code does not write them to any log.":
    "يجري الخادم الفحص ويعيد النتيجة. لا يخزّن النص ولا النتيجة، ولا تكتبهما شيفرة Offer Check في أي سجل.",
  "Numbers hidden in your browser": "أرقام تُخفى في متصفحك",
  "Before any text leaves your browser, Emirates ID numbers, UAE IBANs and passport numbers written as one letter and 7 or 8 digits are replaced with a mask.":
    "قبل أن يغادر أي نص متصفحك، تُستبدل بقناع أرقام الهوية الإماراتية وأرقام الآيبان الإماراتية وأرقام جوازات السفر المكتوبة بحرف واحد و7 أو 8 أرقام.",
  "Not caught: IBANs from other countries, other passport formats, an Emirates ID written with dots, and numbers in Arabic-Indic digits. Remove names, phone numbers and other personal details yourself.":
    "لا يُلتقط: أرقام الآيبان من دول أخرى، وصيغ جوازات السفر الأخرى، ورقم الهوية الإماراتية المكتوب بنقاط، والأرقام المكتوبة بالأرقام العربية الهندية. احذف الأسماء وأرقام الهواتف والتفاصيل الشخصية الأخرى بنفسك.",
  "Translation, only if you choose it": "الترجمة، فقط إذا اخترتها",
  "Text that is not in English can be translated first. The text is sent only when you press “{0}”, each time you press it, and the page says so next to the button before you do.":
    "يمكن ترجمة النص غير المكتوب بالإنجليزية أولًا. لا يُرسل النص إلا عندما تضغط \"{0}\"، في كل مرة تضغط فيها، وتذكر الصفحة ذلك بجانب الزر قبل أن تضغط.",
  "Offer Check's server passes the text to Google Cloud Translation, a machine translation service run by Google. Offer Check does not store it; Google's terms apply to the text it receives.":
    "يمرّر خادم Offer Check النص إلى Google Cloud Translation، وهي خدمة ترجمة آلية تديرها Google. لا يخزّنه Offer Check؛ وتسري شروط Google على النص الذي تستلمه.",
  "Where it is processed": "أين تجري المعالجة",
  "Checks and translations run in Vercel functions in Mumbai, India.":
    "تعمل عمليات الفحص والترجمة في دوال Vercel في مومباي بالهند.",
  "Rate-limit counters": "عدّادات حدود الاستخدام",
  "To limit how often one visitor can check or translate, the server keeps counters. Each counter is keyed by a salted hash of your network address and a time window, never the address itself, and holds only a number.":
    "للحد من عدد مرات الفحص أو الترجمة لكل زائر، يحتفظ الخادم بعدّادات. يُعرَّف كل عدّاد بتجزئة مملّحة (salted hash) لعنوان شبكتك وبفترة زمنية، وليس بالعنوان نفسه أبدًا، ولا يحمل إلا رقمًا.",
  "Each counter expires on its own: after 2 minutes for a per-minute limit, after 25 hours for a daily one. They are kept in an Upstash Redis store in Mumbai.":
    "تنتهي صلاحية كل عدّاد تلقائيًا: بعد دقيقتين لحد الدقيقة، وبعد 25 ساعة للحد اليومي. وتُحفظ في مخزن Upstash Redis في مومباي.",
  "What stays in your browser": "ما يبقى في متصفحك",
  // [review] Phase 4a (2026-11-16): the Settings choices, Clear my data, the
  // installed app and the offline copy are new or rewritten.
  "Your choices in Settings: language, animations and text size, and whether you dismissed the install hint.":
    "اختياراتك في الإعدادات: اللغة والحركة وحجم النص، وما إذا كنت أخفيت تلميح التثبيت.",
  "To clear them: open Settings and use Clear my data on this device. It removes every choice, and any results that an earlier version of Offer Check saved in this browser. Clearing this site's data in your browser's settings does the same.":
    "لمسحها: افتح الإعدادات واستخدم \"امسح بياناتي على هذا الجهاز\". يُزيل ذلك كل الاختيارات، وأي نتائج حفظتها نسخة سابقة من Offer Check في هذا المتصفح. ومسح بيانات هذا الموقع من إعدادات متصفحك يفعل الشيء نفسه.",
  "Pages kept for offline reading": "صفحات محفوظة للقراءة دون اتصال",
  "After your first visit, your browser keeps a copy of the Check page and the About, Guidelines, Portals, Privacy and Terms pages, with the files they need, so you can read them offline.":
    "بعد زيارتك الأولى، يحتفظ متصفحك بنسخة من صفحة الفحص وصفحات حول والإرشادات والبوابات والخصوصية والشروط، مع الملفات التي تحتاجها، لتقرأها دون اتصال.",
  "The copy holds only these public pages and the app's own files. It never holds the text you paste, a result, or any reply from Offer Check's server to a check or a translation.":
    "لا تحتوي النسخة إلا على هذه الصفحات العامة وملفات التطبيق نفسه. ولا تحتوي أبدًا على النص الذي تلصقه، ولا على نتيجة، ولا على أي رد من خادم Offer Check على فحص أو ترجمة.",
  "Each new version of the site replaces the copy. Clearing this site's data in your browser's settings removes it.":
    "كل إصدار جديد من الموقع يستبدل النسخة. ومسح بيانات هذا الموقع من إعدادات متصفحك يُزيلها.",
  "The hosting provider": "مزوّد الاستضافة",
  "Offer Check runs on Vercel. Vercel keeps its own infrastructure logs of requests, under its own terms.":
    "يعمل Offer Check على Vercel. تحتفظ Vercel بسجلات البنية التحتية الخاصة بها للطلبات، وفق شروطها.",
  "No advertising or tracking": "لا إعلانات ولا تتبع",
  "Offer Check has no advertising, analytics or tracking scripts, and its code sets no cookies.":
    "لا يحتوي Offer Check على نصوص برمجية للإعلانات أو التحليلات أو التتبع، ولا تضع شيفرته أي ملفات تعريف ارتباط (cookies).",
  "Contact": "التواصل",
  "Questions about this notice:": "أسئلة حول هذا الإشعار:",
  // [review] Terms page (/terms)
  "Terms of use": "شروط الاستخدام",
  "The terms for using Offer Check UAE.": "شروط استخدام Offer Check UAE.",
  "An early prototype": "نموذج أولي مبكر",
  "Offer Check UAE is an early prototype. It has been tested on made-up example offers only, not validated on real scams. It may change, stop working or be wrong.":
    "هذا نموذج أولي مبكر من Offer Check UAE. اختُبر على عروض مثال مصطنعة فقط، ولم يُختبر على حالات احتيال حقيقية. قد يتغيّر أو يتوقف عن العمل أو يخطئ.",
  "Risk indicators, not a verdict": "مؤشرات خطر، وليست حكمًا",
  "A result shows risk indicators found in the text you paste. It is not a verdict on any offer, sender or company, and it is not legal advice.":
    "تعرض النتيجة مؤشرات الخطر الموجودة في النص الذي تلصقه. وهي ليست حكمًا على أي عرض أو مرسل أو شركة، وليست استشارة قانونية.",
  "A low score, or “No risk indicators found”, does not mean an offer is genuine.":
    "الدرجة المنخفضة، أو \"لم يُعثر على مؤشرات خطر\"، لا تعني أن العرض حقيقي.",
  "No guarantee of accuracy": "لا ضمان للدقة",
  "Offer Check gives no guarantee that a result is accurate or complete. It can miss warning signs, and it can flag an honest offer. A machine translation can lose or change meaning.":
    "لا يقدّم Offer Check أي ضمان بأن النتيجة دقيقة أو كاملة. قد تفوته علامات تحذير، وقد يشير إلى عرض نزيه. وقد تُفقد الترجمة الآلية المعنى أو تغيّره.",
  "Confirm through official channels": "تأكّد عبر القنوات الرسمية",
  "Before you pay, share documents or accept an offer, confirm it yourself through the official UAE channels listed in the Gov Portals Hub. Offer Check does not report anything for you.":
    "قبل أن تدفع أو تشارك مستندات أو تقبل عرضًا، تأكّد منه بنفسك عبر القنوات الرسمية الإماراتية المدرجة في مركز البوابات الحكومية. لا يبلّغ Offer Check عن أي شيء نيابةً عنك.",
  "Open the Gov Portals Hub": "افتح مركز البوابات الحكومية",
  "Acceptable use": "الاستخدام المقبول",
  "Use Offer Check to check job offers for yourself or for someone you are helping.":
    "استخدم Offer Check لفحص عروض العمل لنفسك أو لشخص تساعده.",
  "Do not send checks or translations with scripts or other automated tools, try to get around the limits, or try to disrupt the service.":
    "لا ترسل عمليات فحص أو ترجمة بنصوص برمجية أو أدوات آلية أخرى، ولا تحاول تجاوز الحدود أو تعطيل الخدمة.",
  "Do not paste unlawful content.": "لا تلصق محتوى غير قانوني.",
  "Limits and changes to the service": "حدود الخدمة وتغييراتها",
  "The operator may limit, change or stop the service, or any part of it, at any time. Limits on how often you can check or translate already apply.":
    "يجوز للمشغّل تقييد الخدمة أو تغييرها أو إيقافها، أو أي جزء منها، في أي وقت. وتسري بالفعل حدود على عدد مرات الفحص أو الترجمة.",
  "Questions about these terms:": "أسئلة حول هذه الشروط:",

  // Production hardening Phase 4a (2026-11-16): Settings, installable app, offline.
  // Every entry in this block is [review]: written for this app, not yet reviewed by a native speaker.
  // [review] Settings dialog
  "Settings": "الإعدادات",
  "Close settings": "إغلاق الإعدادات",
  "These choices are kept in this browser only.": "تُحفظ هذه الاختيارات في هذا المتصفح فقط.",
  "Text size": "حجم النص",
  "Standard": "عادي",
  "Large": "كبير",
  "Animations": "الحركة",
  "On": "تعمل",
  "Paused": "متوقفة",
  "Language": "اللغة",
  "Theme": "المظهر",
  "System": "حسب النظام",
  "Dark": "داكن",
  "Light": "فاتح",
  "App": "التطبيق",
  "Clear my data on this device": "امسح بياناتي على هذا الجهاز",
  "Removes every choice saved in this browser (language, animations, text size, theme), and any results saved here by an earlier version. Nothing is stored on Offer Check's server.":
    "يحذف كل اختيار محفوظ في هذا المتصفح (اللغة والحركة وحجم النص والمظهر)، وأي نتائج حفظتها نسخة سابقة هنا. لا يُخزَّن شيء على خادم Offer Check.",
  "Clear all Offer Check data on this device? Your choices, and any results saved here by an earlier version, will be permanently deleted. This cannot be undone.":
    "هل تريد مسح كل بيانات Offer Check على هذا الجهاز؟ ستُحذف اختياراتك، وأي نتائج حفظتها نسخة سابقة هنا، نهائيًا. لا يمكن التراجع عن ذلك.",
  "Delete everything": "احذف كل شيء",
  "Clear my data": "امسح بياناتي",
  "Your Offer Check data was removed from this browser.": "أُزيلت بيانات Offer Check من هذا المتصفح.",
  // [review] Install app and the iPhone / iPad hint
  "Install app": "ثبّت التطبيق",
  "Dismiss": "إخفاء",
  "To install on iPhone or iPad: tap Share, then Add to Home Screen.":
    "للتثبيت على iPhone أو iPad: اضغط على مشاركة، ثم على إضافة إلى الشاشة الرئيسية.",
  "Offer Check is installed on this device.": "Offer Check مثبّت على هذا الجهاز.",
  "This browser does not offer to install the app.": "هذا المتصفح لا يتيح تثبيت التطبيق.",
  // [review] Check page while offline
  "You are offline. Checking an offer needs a connection. Your text stays in the box.":
    "أنت غير متصل بالإنترنت. فحص العرض يحتاج إلى اتصال. يبقى نصك في المربع.",

  // [review] Phase 6 (2026-11-23): the Action & Report Kit replaces the saved-results feature. Every entry below is new
  // and written for this app, not yet reviewed by a native speaker. In logical reading order.
  "Nothing you check is saved. The Action & Report Kit is built in this browser.":
    "لا يُحفظ شيء مما تفحصه. تُنشأ حزمة الإجراء والبلاغ في هذا المتصفح.",
  "The Action & Report Kit": "حزمة الإجراء والبلاغ",
  "Action & Report Kit":
    "حزمة الإجراء والبلاغ",
  "Made in this browser from the check you just ran. Nothing is sent, saved or opened for you. The text never includes the offer text, names, phone numbers or email addresses unless you type them yourself.":
    "تُنشأ في هذا المتصفح من الفحص الذي أجريته للتو. لا يُرسل أو يُحفظ أو يُفتح أي شيء نيابةً عنك. لا يتضمن النص نص العرض ولا الأسماء ولا أرقام الهاتف ولا عناوين البريد الإلكتروني، إلا إذا كتبتها أنت بنفسك.",
  "Report text":
    "نص البلاغ",
  "Fixed wording you can paste into a report to the cybercrime channels or to MOHRE.":
    "صياغة ثابتة يمكنك لصقها في بلاغ إلى قنوات الجرائم الإلكترونية أو إلى MOHRE.",
  "Where did the offer come from?":
    "من أين وصل العرض؟",
  "Offer letter or PDF":
    "خطاب العرض أو ملف PDF",
  "Other":
    "أخرى",
  "Your own details (optional)":
    "تفاصيلك الخاصة (اختياري)",
  "Whatever you type here is added to the copied text and the download. Leave out anything you do not want to share.":
    "كل ما تكتبه هنا يُضاف إلى النص المنسوخ وإلى الملف المنزَّل. لا تكتب ما لا تريد مشاركته.",
  "Copy report text":
    "انسخ نص البلاغ",
  "Download this summary":
    "نزّل هذا الملخص",
  "WhatsApp replies":
    "ردود واتساب",
  "Three fixed replies. Copying one opens nothing and sends nothing; you paste it yourself.":
    "ثلاثة ردود ثابتة. نسخ أي رد لا يفتح شيئًا ولا يرسل شيئًا؛ أنت من يلصقه.",
  "Copy reply: decline politely":
    "انسخ الرد: الاعتذار بلطف",
  "Thank you for getting in touch about this role. I have decided not to go ahead, so please do not send me any more messages about it.":
    "شكرًا لتواصلك معي بشأن هذه الوظيفة. قررت عدم المتابعة، لذا أرجو ألا ترسل إليّ أي رسائل أخرى عنها.",
  "Copy reply: ask for the MOHRE offer reference number":
    "انسخ الرد: طلب الرقم المرجعي للعرض لدى MOHRE",
  "Thank you for the offer. Before I go any further, please send me the MOHRE offer reference number for this job, so that I can check it on the MOHRE enquiry service.":
    "شكرًا على العرض. قبل أن أتابع، أرجو أن ترسل إليّ الرقم المرجعي للعرض لدى MOHRE لهذه الوظيفة، لأتحقق منه عبر خدمة الاستعلام في MOHRE.",
  "Copy reply: continue only through official channels":
    "انسخ الرد: المتابعة عبر القنوات الرسمية فقط",
  "I would like to continue only through official channels. Please confirm the offer through the company's official website and MOHRE. I will not send documents or make any payment before that.":
    "أود المتابعة عبر القنوات الرسمية فقط. أرجو تأكيد العرض عبر الموقع الرسمي للشركة وعبر MOHRE. لن أرسل مستندات ولن أدفع أي مبلغ قبل ذلك.",
  "Official links":
    "روابط رسمية",
  "Copied.":
    "تم النسخ.",
  "Your browser did not allow copying. Select the text and copy it yourself.":
    "لم يسمح متصفحك بالنسخ. حدّد النص وانسخه بنفسك.",
  "The summary was saved to your device.":
    "حُفظ الملخص على جهازك.",
  "Your browser did not allow the download.":
    "لم يسمح متصفحك بالتنزيل.",
  "Job offer check summary, made with Offer Check UAE":
    "ملخص فحص عرض عمل، أُعدّ باستخدام Offer Check UAE",
  "This is a summary of warning signs found by fixed rules. It is not a verdict, and it is not an official report form.":
    "هذا ملخص لعلامات تحذير وجدتها قواعد ثابتة. وهو ليس حكمًا، وليس نموذج بلاغ رسميًا.",
  "This browser did not allow that.":
    "لم يسمح هذا المتصفح بذلك.",
  "Result":
    "النتيجة",
  "Warning signs found":
    "علامات التحذير التي وُجدت",
  "None of the fixed rules matched.":
    "لم تتطابق أي من القواعد الثابتة.",
  "The offer reached me by":
    "وصلني العرض عبر",
  "In my own words":
    "بكلماتي",
  "(nothing added)":
    "(لم تُضف أي تفاصيل)",
  "Where to report or check an offer":
    "أين تُبلّغ أو تتحقق من عرض",
  "These checks flagged nothing more. This is not a clearance: never pay a fee or send documents before you have confirmed the employer through official channels.":
    "لم تُظهر هذه الفحوص شيئًا آخر. هذا ليس إبراءً: لا تدفع أي رسوم ولا ترسل أي مستندات قبل أن تؤكد جهة العمل عبر القنوات الرسمية.",
  "The Action & Report Kit under each result is created on your device from the check you just ran. Nothing in it is sent to Offer Check or anywhere else, and Offer Check does not store it. It is text you copy or save to your device yourself.":
    "تُنشأ حزمة الإجراء والبلاغ تحت كل نتيجة على جهازك من الفحص الذي أجريته للتو. لا يُرسل أي شيء منها إلى Offer Check أو إلى أي جهة أخرى، ولا يخزّنها Offer Check. هي نص تنسخه أو تحفظه على جهازك بنفسك.",
  "If you download the summary, the file is saved where your browser puts downloads. Offer Check keeps no copy.":
    "إذا نزّلت الملخص، يُحفظ الملف حيث يضع متصفحك التنزيلات. ولا يحتفظ Offer Check بأي نسخة منه.",
  "The Action & Report Kit under each result is created on your device from the check you just ran, and nothing in it is sent. It is not an official report form, and Offer Check does not report anything for you. What you copy, save or send from it is your choice.":
    "تُنشأ حزمة الإجراء والبلاغ تحت كل نتيجة على جهازك من الفحص الذي أجريته للتو، ولا يُرسل أي شيء منها. وهي ليست نموذج بلاغ رسميًا، ولا يبلّغ Offer Check عنك عن أي شيء. ما تنسخه أو تحفظه أو ترسله منها أمرٌ يعود إليك.",
};

// Official names: in Arabic, each contact shows its own official Arabic name (src/data/uaeContacts.ts).
for (const contact of UAE_CONTACTS) {
  ENTRIES[contact.name] ??= contact.arabicName;
}

export const AR: Record<string, string> = ENTRIES;
