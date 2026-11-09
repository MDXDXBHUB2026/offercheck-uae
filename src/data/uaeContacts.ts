// UAE contacts shown in the header hotlines, the result card's portal buttons and the Gov Portals Hub.
// Hotlines and the MoHRE / ICP / Amer / eCrime links: confirmed by owner 2026-11-09 (live in the UAE).
// This file is the only place these values exist. Any other file that shows one of them imports it
// from here (src/lib/authorities.ts included), so a number or link can never appear with two values.
// Abu Dhabi Police Aman's number is not in the confirmed list, so it is not here and not shown.

export type UaeContact = {
  id: "mohre" | "icp" | "amer" | "ecrime";
  name: string;
  arabicName: string;
  // What it is for, short.
  purpose: string;
  // The official website.
  url: string;
  // Digits only, for tel: links.
  hotline: string;
  // As written on screen.
  hotlineLabel: string;
};

export const MOHRE_INQUIRY_URL = "https://www.mohre.gov.ae/en/services/inquiry.aspx";

export const UAE_CONTACTS: readonly UaeContact[] = [
  {
    id: "mohre",
    name: "MoHRE (Ministry of Human Resources and Emiratisation)",
    arabicName: "وزارة الموارد البشرية والتوطين",
    purpose: "Job offers, work permits and labour complaints",
    url: "https://www.mohre.gov.ae",
    hotline: "600590000",
    hotlineLabel: "600 590000",
  },
  {
    id: "icp",
    name: "ICP Smart Services",
    arabicName: "الهيئة الاتحادية للهوية والجنسية",
    purpose: "Entry permits and visas outside Dubai",
    url: "https://smartservices.icp.gov.ae",
    hotline: "600522222",
    hotlineLabel: "600 522222",
  },
  {
    id: "amer",
    name: "Amer (GDRFA Dubai)",
    arabicName: "الإدارة العامة للإقامة وشؤون الأجانب - دبي",
    purpose: "Dubai residency and visa enquiries",
    url: "https://www.gdrfad.gov.ae",
    hotline: "8005111",
    hotlineLabel: "800 5111",
  },
  {
    id: "ecrime",
    name: "Dubai Police eCrime",
    arabicName: "منصة الجرائم الإلكترونية - شرطة دبي",
    purpose: "Report online fraud",
    url: "https://www.ecrime.ae",
    hotline: "901",
    hotlineLabel: "901",
  },
];

// The header's hotlines dropdown, as in the reference app: labour, Dubai visas, online fraud.
export const HEADER_HOTLINE_IDS = ["mohre", "amer", "ecrime"] as const;

export function contact(id: UaeContact["id"]): UaeContact {
  const found = UAE_CONTACTS.find((entry) => entry.id === id);
  if (!found) throw new Error(`Unknown contact ${id}`);
  return found;
}
