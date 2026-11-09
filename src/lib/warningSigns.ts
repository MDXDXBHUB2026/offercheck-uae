// The Warning signs page (/guide). Eight signs, each paraphrased from one official page: no fine,
// fee, law or number is added beyond what that page says. Owner-approved ids and entries, 2026-11-09.

export type WarningSign = {
  id: string;
  // The sign, as a short heading.
  sign: string;
  // Why it matters: one or two plain sentences.
  why: string;
  // What to do: one sentence.
  whatToDo: string;
};

export const WARNING_SIGNS_SOURCE = {
  publisher: "UAE Government Portal",
  title: "Tips to avoid labour and visa fraud",
  updated: "24 Sep 2026",
  verified: "2026-11-09",
  url: "https://u.ae/en/information-and-services/visa-and-emirates-id/Visa-information/tips-to-avoid-labour-and-visa-fraud",
} as const;

export const WARNING_SIGNS: readonly WarningSign[] = [
  {
    id: "offer-letter",
    sign: "No MoHRE offer letter",
    why: "A genuine job offer comes as an offer letter issued through the Ministry of Human Resources and Emiratisation (MoHRE) and signed by an authorised manager.",
    whatToDo: "Ask the employer for this offer letter before you accept anything.",
  },
  {
    id: "reference-number",
    sign: "The reference number is not checked",
    why: "An offer letter issued through MoHRE has a reference number, and MoHRE's application status enquiry service lets you look it up yourself.",
    whatToDo: "Check the offer's reference number through MoHRE's application status enquiry service.",
  },
  {
    id: "entry-permit-check",
    sign: "The entry permit is not checked after signing",
    why: "After you sign, you can verify your entry permit: Dubai permits through GDRFA, and permits of the other emirates through ICP eChannels.",
    whatToDo: "Check your entry permit through GDRFA for Dubai or ICP eChannels for the other emirates.",
  },
  {
    id: "tourist-visa",
    sign: "Work on a visit or tourist visa",
    why: "A visit or tourist visa does not give you the right to work in the UAE. Working on one can lead to fines and legal liability.",
    whatToDo: "Do not start work in the UAE on a visit or tourist visa.",
  },
  {
    id: "recruitment-fees",
    sign: "You are asked to pay recruitment fees",
    why: "Treat this as a red flag. The UAE Government Portal says the employer is responsible for recruitment expenses under the UAE Labour Law.",
    whatToDo: "Do not pay recruitment fees to get a job.",
  },
  {
    id: "company-lookup",
    sign: "The company cannot be found",
    why: "You can look up a company in the National Economic Register to see whether it is registered.",
    whatToDo: "Search the company's English and Arabic names in the National Economic Register.",
  },
  {
    id: "permit-source",
    sign: "The entry permit comes from an unexpected source",
    why: "The UAE Government Portal names UAE-based airlines, licensed hotels and licensed travel agencies as legitimate sources. It also suggests comparing any Dubai visa or permit fees with the published price list, so you do not overpay.",
    whatToDo: "Get an entry permit only through those sources, and check the fees against the published list.",
  },
  {
    id: "residency-abroad",
    sign: "A residency visa is promised while you are abroad",
    why: "A residency visa cannot be processed while you are outside the UAE. You first enter on a valid entry permit and stay in the country while it is processed.",
    whatToDo: "Be cautious of any offer that promises a residency visa before you arrive.",
  },
];
