// LANG-4: texts used to set and pin the "clearly English" cut-off in src/lib/coverage.ts.
// Every text here is SYNTHETIC, written for this test, and NOT validated by a native speaker. They
// are a small sample: the measured results describe these texts only, not real offers or languages.
// Imported by the coverage tests and, since roadmap Phase 3, by src/lib/labData.ts, which shows the
// state each text gets on the Test Lab page. Nothing sends these texts to the browser or the network.

export const SYNTHETIC_NOTE = "synthetic, not native-speaker validated";

export type LanguageSample = { id: string; language: string; text: string };

// The romanised Arabic fee scam that read as English (score 20, Low) before LANG-4.
export const ROMAN_ARABIC_FEE_SCAM: LanguageSample = {
  id: "AR-sample",
  language: "romanised Arabic",
  text: "Mabrook! Tm qabulak lil amal ka muhasib fi Dubai. Yajib an tadfa3 rusoom al visa 500 dirham al yawm 3an tareeq al tahweel al bankee wa tursil soorat jawaz safarak wa ramz al tahaqquq. Al 3ard yantahi khilal 24 saa3a. Email: hr.jobs.dubai.demo@gmail.com",
};

// English offers heavy with Arabic, Indian, Filipino and African names, AED amounts, hashtags,
// abbreviations and job jargon.
export const ENGLISH_EDGE_CASES: LanguageSample[] = [
  { id: "EN-01", language: "English", text: "Dear Mohammed Al Mansoori, Emirates NBD is pleased to confirm your role as Relationship Manager in Deira. Basic AED 12,500 plus HRA and transport. Report to Ms. Fatima Al Hashimi at 9 am on Sunday." },
  { id: "EN-02", language: "English", text: "Hi Rajesh Kumar Nair, ref your CV for the MEP Supervisor post at Al Naboodah, Jebel Ali. CTC AED 8k pm, OT as per UAE labour law, 30 days AL, return ticket yearly. Pls confirm by EOD." },
  { id: "EN-03", language: "English", text: "#Hiring #DubaiJobs #UAEJobs Urgent req: HVAC techs, MEP foremen, QA/QC inspectors for Abu Dhabi site. Salary AED 3500-5000 + acc + trans. DM or WhatsApp +971 55 000 0000. #NoAgentFees" },
  { id: "EN-04", language: "English", text: "Congrats Priya Venkataraman! Your offer for Sr. Data Analyst (SQL, Power BI, Python) at Majid Al Futtaim is attached. CTC AED 216k p.a., 22 WD leave, medical Cat A. Joining Dubai Hills HQ 1 Dec." },
  { id: "EN-05", language: "English", text: "Dear Ahmed Bin Rashid Al Nuaimi, kindly find the LOI for HSE Officer, Ruwais. Package: AED 9,000 basic, AED 3,000 HRA, AED 1,000 TA. Pls submit EID copy, passport copy, NOC and attested degree to HR." },
  { id: "EN-06", language: "English", text: "Sajid Hussain Qureshi, Muhammad Usman Tariq and Abdul Rehman Siddiqui: shortlisted for the LPG tanker driver post, Sharjah. Heavy licence req. Salary AED 4,200 + OT. Medical at Al Qusais clinic Tues 8am." },
  { id: "EN-07", language: "English", text: "Hi Joy Mae Dela Cruz, ADNOC Distribution contractor is hiring cashiers for ENOC and EPPCO stations. AED 2,800 all-in, shared accom in Al Quoz, 2-yr contract. Interview at JLT Cluster D, Thurs 10 am." },
  { id: "EN-08", language: "English", text: "KPIs, SLAs and OKRs are owned by the PMO lead. B2B SaaS AE role, OTE AED 30k pm, base AED 18k, ESOP vesting 4 yrs, DIFC office, hybrid 3/2. Hiring manager: Karthik Subramaniam. ATS ref #AE-2291." },
  { id: "EN-09", language: "English", text: "Salam Mr. Abdullah, Tasheel and Amer typing centre fees for your visa are covered by the employer. Do not pay any agent. Your MOHRE offer letter ref MB123456AE will come via SMS from MOHRE. Regards, Noura." },
  { id: "EN-10", language: "English", text: "Yusuf Olamide Adeyemi, Chidi Okonkwo and Thandiwe Nkosi: Emaar Hospitality F&B roles at Vida Downtown and Address Boulevard. Tips + svc charge, AED 3,200 base, accom in Al Nahda. Bring CV, EID, MOL card." },
];

// Offers in other languages typed in Latin letters, each with a fee request.
export const LATIN_NON_ENGLISH: LanguageSample[] = [
  { id: "TL-01", language: "Tagalog", text: "Congrats po! Napili kayo bilang waitress sa Dubai. Kailangan po magbayad ng 800 dirham para sa processing ng visa bago Biyernes. Ipadala po sa GCash at i-send ang litrato ng pasaporte." },
  { id: "MS-01", language: "Malay", text: "Tahniah! Anda telah dipilih sebagai juruteknik di Dubai. Sila bayar yuran visa sebanyak 500 dirham hari ini melalui pindahan bank dan hantar salinan pasport anda kepada kami." },
  { id: "ID-01", language: "Indonesian", text: "Selamat! Anda diterima bekerja sebagai sopir di Abu Dhabi. Harap segera membayar biaya visa sebesar 600 dirham hari ini lewat transfer bank, lalu kirim foto paspor dan kode verifikasi." },
  { id: "FR-01", language: "French", text: "Félicitations, vous êtes retenu pour le poste de comptable à Dubaï. Merci de régler les frais de visa de 500 dirhams aujourd'hui par virement et d'envoyer une copie de votre passeport." },
  { id: "ES-01", language: "Spanish", text: "Felicidades, usted ha sido seleccionado como recepcionista en Dubái. Debe pagar hoy la tasa de visado de 500 dirhams por transferencia bancaria y enviar una foto de su pasaporte y el código." },
  { id: "HI-01", language: "Hinglish (romanised Hindi)", text: "Badhai ho! Aapka selection Dubai mein driver ke liye ho gaya hai. Visa fees 700 dirham aaj hi bhejiye, nahi to seat cancel ho jayegi. Passport ki photo aur OTP bhi WhatsApp par bhejo." },
  { id: "UR-01", language: "romanised Urdu", text: "Mubarak ho, aap ki job Sharjah mein pakki ho gayi hai. Visa ki fees 600 dirham foran jama karwayen aur apne passport ki tasveer bhejen, warna aap ki jagah kisi aur ko de di jayegi." },
  { id: "AR-01", language: "romanised Arabic", text: "Ahlan ya akhi, mabrook al wazifa fi Dubai. Lazim tidfa3 flous al visa 400 dirham al yom, ba3dain tirsil soorat al basbor wa al code. Law ma dafa3t al yom, al wazifa tiruh." },
  { id: "AR-02", language: "romanised Arabic", text: "Marhaba, inta maqbool fi al shughl ka sawwaq. Yalla idfa3 rusoom al iqama 750 dirham bisur3a 3ala hatha al hisab wa ib3ath al raqam al sirri, al fursa mahdooda jiddan." },
  { id: "ML-01", language: "romanised Malayalam", text: "Ningalkku Dubai il joli kitti. Visa fees aayi 900 dirham innu thanne ayachu tharanam, passport copy um OTP um WhatsApp il ayakkuka, illenkil ee avasaram nashtappedum." },
  { id: "TA-01", language: "romanised Tamil", text: "Vazhthukkal! Ungalukku Dubai la velai kidaichirukku. Visa kattanam 800 dirham inniku anuppunga, passport photo vum OTP vum WhatsApp la anuppunga, illana velai poyidum." },
  { id: "SW-01", language: "Swahili", text: "Hongera! Umechaguliwa kufanya kazi ya ulinzi huko Dubai. Tafadhali lipa ada ya visa dirham 500 leo kupitia M-Pesa na utume picha ya pasipoti yako na namba ya siri." },
  { id: "HG-01", language: "Hinglish (mostly English)", text: "Hello sir, aapka offer letter ready hai for Dubai warehouse job. Bas 1500 AED registration charges abhi transfer karo, uske baad visa process start hoga. Jaldi reply karo, limited seats hain." },
  { id: "TL-02", language: "Tagalog", text: "Magandang balita! Tanggap ka na bilang housekeeping sa hotel sa Abu Dhabi. Magbayad ka muna ng 1,200 dirham para sa medical at visa, ipadala sa account na ito ngayong araw." },
  { id: "FR-02", language: "French", text: "Bonjour Monsieur, suite à votre entretien, nous vous proposons un contrat de chauffeur à Sharjah. Un dépôt de garantie de 700 dirhams est exigé avant l'envoi du visa. Payez par Western Union." },
];
