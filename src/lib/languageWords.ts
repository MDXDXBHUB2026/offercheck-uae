// Batch B Stage 1: two hand-written word lists for the offline language check (src/lib/coverage.ts).
// No dependency and no data file. Lower-case ASCII words only. Data, not rules: nothing here is
// read by the rules or the scoring.

function words(list: string): ReadonlySet<string> {
  return new Set(list.trim().split(/\s+/));
}

// Common English words, plus words that are usual in UAE job offers and recruitment messages.
// A text with too few of them is not read as English.
export const ENGLISH_WORDS: ReadonlySet<string> = words(`
a about above accept accepted access according account accounts accommodation across act action actually add added
address admin administration advance after again against age agency agent ago agree agreement air airport airline
all allowance allowances almost alone along already also although always am amount an and annual another answer any
anyone anything apartment apply applied applying application applications appointment approval approve approved
april are area arrange arranged arrival arrive as ask asked assist assistant at attach attached attend august
available away back bank based basic be because become been before begin being below benefit benefits best better
between bill board bonus both box branch bring business but buy by call called can candidate candidates cannot card
cards care career cash center centre certificate change charge charges check checked city claim class clear client
clients close code come comes company companies complete completed confirm confirmation confirmed contact contract
copy cost costs could country course cover current customer customers daily data date day days dear december
decision deposit department description details did direct director do document documents does done down driver
driving due during duties duty each early easy education either else email emails employee employees employer
employment end english enter entry even evening every everything exam example excellent executive experience expire
expiry extra facility family fee fees female few file fill final finance find first five flight follow following
food for form forward four free friday from full further get give given go going good got government group guest
had half hand happy has have he head health hello help her here hi high him his hold holiday home hope hospital
hotel hour hours house housing how however hr id if immediate immediately important in include included including
income information inside insurance interest interested interview into is issue issued it its job jobs join
joining july june just keep kind know labour labor language last later least leave left less letter level license
licence life like limited line link list little local location long look made mail main make male manager march
many may me medical meet meeting member message might minimum mobile monday money month monthly months more morning
most much must my name national near need needed new next night no not note nothing notice november now number
october of off offer offered offers office officer official often ok okay old on once one online only open
operator or order other our out over overtime own page paid part passport pay payable payment people per period
permit person personal phone photo place please plus position possible post pre private probation process
processing product provide provided public put qualification quickly rate reach read ready reason receive received
recent recruitment reference regards register registration regular related remain reply report request required
requirement requirements residence resume return right role room salary sales same saturday schedule second
secure security see selected selection send sent september service services set shall share she shift short
should show sign since site slot slots so some someone soon staff start started starting status stay still
submit such sunday supervisor support sure system take team technician terms than thank thanks that the their them
then there these they thing this those three through thursday ticket time to today together total training
transfer transport transportation travel tuesday two under until up upon urgent urgently us use used valid
verify verification very via visa visit wage wages wait want was we wednesday week weekly weeks welcome well
were what when where whether which while who whole why will with within without work worker workers working
would write year years yes yet you your yours
accountant cleaner cook electrician engineer helper labourer mason nurse plumber receptionist salesman
storekeeper waiter warehouse welder cashier chef barista housekeeping merchandiser
aed dirham dirhams dubai sharjah abu dhabi ajman uae emirates whatsapp telegram linkedin gmail
`);

// Common words of the first languages (decision 7: Arabic, Hindi, Urdu, Malayalam, Tagalog, Bengali)
// as typed in English letters, plus Hinglish, romanised Tamil and French. Words that are also
// English, common names, brands or UAE places (al, el, du, le, la, de, po, na, sa, ana, salam,
// marhaba, pour, est, hum, sab, par, hindi, amar, naukri) are left out on purpose, so an English offer
// that uses them is never counted foreign.
export const FOREIGN_MARKERS: ReadonlySet<string> = words(`
aap aapka aapki aapko aapke apna apni apne hai hain hoga hogi hona ho gaya gayi gaye kya kyun kaise kab
kaha kahan kar karo karna karein karen kijiye mein mujhe mera meri mere tum tumhara tumhe hamara humko
nahi nahin abhi jaldi bhejo bhejna bhejiye bhai bhaiya ji liye wala wali warna jayega jayegi milega milegi
paisa paise rupaye kaam theek accha acha haan bilkul lekin aur ke ki ka ko se phir sirf bahut
habibi yalla inshallah wallah khalas tamam mafi mushkila flous wazifa shukran akhi akhoy ahlan
kayfa haluk ayza ayez abghi mumkin
magandang araw kailangan ninyo kayo ikaw ako namin natin magbayad bayad ng mga salamat opo ito iyan
lang naman pera trabaho agad sige kumusta
ningal ningalude ningalkku joli aanu aayi ippol thanne ayakkanam illenkil illa venam venda undu alle
enikku njan avide ivide
apnar tumi chakri hoyeche bavod ekhon diben hobe korben korte dite jonno kintu
naa kodukka vendum ungal unga enna romba seekiram panam velai
bonjour nous vous avons avez devez payer les frais avant lundi poste plaisir offrir merci votre notre
emploi salaire envoyer
`);
