/**
 * Country reference data for the destination pages.
 *
 * Everything here was checked against government, ministry or institution
 * sources in late October / early November 2026. Visa rules in particular
 * change often — several of the figures below changed in 2025 and 2026 — so
 * treat this file as a snapshot with a date on it, not a permanent record.
 *
 * Rules for editing:
 *  - Cost figures are indicative bands, never quotes. Every `note` must say
 *    what moves the figure and that the student has to confirm it with the
 *    institution.
 *  - Do not add a world ranking number to a university unless you have
 *    verified it on the ranking publisher's own site. A qualitative note is
 *    preferred.
 *  - Where a rule is uncertain or has just changed, say so in the text.
 *  - Nothing in here describes Study Hub BD's own relationships with any
 *    institution. It describes the countries only.
 *
 * Last reviewed: 1 November 2026.
 */

export type CountryCost = {
  /** Per academic year, international undergraduate. */
  tuitionLow: number;
  tuitionHigh: number;
  /** Per year. */
  livingLow: number;
  livingHigh: number;
  /** ISO-ish currency code as students will see it quoted. */
  currency: string;
  /** What the range covers and what moves it. */
  note: string;
};

export type University = {
  name: string;
  city: string;
  note?: string;
};

export type Country = {
  slug: string;
  name: string;
  flag: string;
  capital: string;
  /** Language(s) of instruction available to international students. */
  language: string;
  /** One line, max 60 characters. */
  tagline: string;
  summary: string;
  culture: string;
  educationSystem: string;
  universities: University[];
  opportunities: string[];
  benefits: string[];
  economy: string;
  intakes: string;
  cost: CountryCost;
};

export const COUNTRIES: Country[] = [
  {
    slug: 'australia',
    name: 'Australia',
    flag: '🇦🇺',
    capital: 'Canberra',
    language: 'English',
    tagline: 'Clear work rights and a defined graduate visa',
    summary:
      'Australia teaches in English, publishes its visa conditions plainly and has a graduate visa that is written into the rules rather than left to employer sponsorship. Degrees are widely recognised, and the main universities are spread across several cities rather than concentrated in one. It is one of the more expensive destinations on this list, so the budget needs to be settled before anything else.',
    culture:
      'Daily life is informal and outdoor, and the climate is warm in most of the student cities, though Melbourne and Canberra get genuinely cold in winter. Sydney and Melbourne have long-established South Asian populations, with Bangladeshi community organisations, grocers and mosques in both. Halal food is easy to find in the larger cities and harder in regional towns.',
    educationSystem:
      'A bachelor\'s degree normally takes three years, or four with honours or in a professional field such as engineering. The academic year runs from late February to November in two semesters, with a mid-year intake in July. Teaching combines lectures with smaller tutorials and continuous assessment. Providers and courses are regulated by the Tertiary Education Quality and Standards Agency (TEQSA) and must be listed on CRICOS before they can enrol international students.',
    universities: [
      { name: 'University of Melbourne', city: 'Melbourne', note: 'Broad research university; students choose a major after entry' },
      { name: 'University of Sydney', city: 'Sydney', note: 'Wide subject range, including health and the built environment' },
      { name: 'Monash University', city: 'Melbourne', note: 'Large international intake; engineering, pharmacy and business' },
      { name: 'University of Queensland', city: 'Brisbane', note: 'Strong in agriculture, environmental and biomedical sciences' },
      { name: 'University of New South Wales', city: 'Sydney', note: 'Engineering and computing, with a three-term teaching year' },
      { name: 'University of Adelaide', city: 'Adelaide', note: 'Smaller city, lower living costs than Sydney or Melbourne' },
    ],
    opportunities: [
      'Student visa (subclass 500) holders may work up to 48 hours per fortnight while the course is in session, and without a limit during scheduled course breaks. An increase to 60 hours per fortnight has been discussed but, as of November 2026, the Department of Home Affairs still states 48.',
      'The Temporary Graduate visa (subclass 485), Post-Higher Education Work stream, gives a stay of usually two to three years depending on the qualification. Applicants must normally be 35 or under, be in Australia when they apply, and meet an English requirement.',
      'Skilled migration is points-tested. Australian study and Australian work experience both earn points, but a graduate visa is not by itself a grant of permanent residence.',
      'Visa costs are significant and have risen: the student visa starts from AUD 2,500 and the Temporary Graduate visa from AUD 5,750. Budget for these separately from tuition.',
    ],
    benefits: [
      'All teaching is in English, so there is no second language to learn before or during the degree.',
      'Post-study work rights are set out in the visa rules rather than depending on finding a sponsor first.',
      'Universities are spread across several cities, so a student who cannot afford Sydney or Melbourne has real alternatives in Adelaide, Brisbane or Perth.',
      'Overseas Student Health Cover is compulsory, which means medical costs are covered for the length of the visa.',
    ],
    economy:
      'Australia has a services-led economy with persistent shortages in healthcare, engineering, construction, teaching and IT, and these are the fields where graduates are most often hired. Mining and agriculture matter to exports but employ fewer graduates directly than the city service sectors do.',
    intakes: 'February and July',
    cost: {
      tuitionLow: 30000,
      tuitionHigh: 50000,
      livingLow: 24000,
      livingHigh: 35000,
      currency: 'AUD',
      note:
        'Indicative only. Fees are set per course, not per university, and are driven by the discipline: classroom subjects sit at the lower end, laboratory, engineering and health subjects at the upper end, and medicine, dentistry and veterinary science well above this band. Living costs depend mainly on the city, with Sydney and Melbourne the most expensive. Study Australia does not publish a national fee table, so confirm the exact annual fee on the course page and in your offer letter before committing.',
    },
  },
  {
    slug: 'canada',
    name: 'Canada',
    flag: '🇨🇦',
    capital: 'Ottawa',
    language: 'English, and French in Quebec',
    tagline: 'Post-study work linked to the length of the course',
    summary:
      'Canada offers English-medium degrees, a post-graduation work permit whose length follows the length of the programme, and immigration routes that count Canadian study and Canadian work experience. The rules tightened in 2024 and 2025: there are now caps on study permits, a language test for the work permit, and a field-of-study restriction for non-degree programmes. Degree students are affected less than college students, but the system is stricter than it was.',
    culture:
      'Winters are long and genuinely cold, with snow from November to March in most student cities, and this is the hardest adjustment for students arriving from Bangladesh. Toronto, Montreal and Vancouver have large, established Bangladeshi communities, with Bengali-speaking grocers, mosques and community associations. Halal food is widely available in the big cities and in most mid-sized ones.',
    educationSystem:
      'Education is run by the provinces, not the federal government, so entry rules, fees and term dates differ between them. A bachelor\'s degree is normally four years, or three in Quebec where students complete CEGEP first. Quality assurance sits with provincial bodies; what matters for the visa is that the institution appears on the federal list of Designated Learning Institutions, and for college programmes that the field of study is on the eligible list.',
    universities: [
      { name: 'University of Toronto', city: 'Toronto', note: 'Large research university across three campuses' },
      { name: 'University of British Columbia', city: 'Vancouver', note: 'Milder winters than most of Canada; strong in forestry and earth sciences' },
      { name: 'McGill University', city: 'Montreal', note: 'English-medium in a mainly French-speaking city' },
      { name: 'University of Waterloo', city: 'Waterloo, Ontario', note: 'Known for co-operative education, with paid work terms built into degrees' },
      { name: 'University of Alberta', city: 'Edmonton', note: 'Engineering and energy-related science' },
      { name: 'Dalhousie University', city: 'Halifax', note: 'Smaller east-coast city with lower living costs; ocean sciences' },
    ],
    opportunities: [
      'Eligible students may work up to 24 hours a week off campus during academic terms, and full time during scheduled breaks. On-campus work is treated separately — confirm with the international office before combining the two.',
      'The Post-Graduation Work Permit normally matches the length of the programme, up to three years. Graduates with a bachelor\'s, master\'s or doctoral degree are exempt from the field-of-study requirement; graduates of college and other non-degree programmes are not.',
      'Since November 2024 every PGWP applicant must prove language ability: CLB 7 for university graduates, CLB 5 for college and other non-university programmes. This is a test result, not a university letter.',
      'From 1 April 2026 students no longer need a separate work permit for a co-op placement or internship that forms a required part of their programme.',
    ],
    benefits: [
      'The work permit is granted on the strength of the qualification, so a graduate can look for work without needing an employer to sponsor them first.',
      'Canadian study and Canadian work experience both count towards Express Entry and the Provincial Nominee Programs.',
      'Teaching is in English almost everywhere outside Quebec, and bilingual options exist in Montreal and Ottawa.',
      'Living costs outside Toronto and Vancouver are substantially lower, and several good universities are in those cheaper cities.',
    ],
    economy:
      'Hiring is strongest in healthcare, information technology, engineering, skilled trades and financial services, and these absorb most international graduates. The labour market has cooled since 2024 and competition for entry-level graduate roles is higher than it was, so graduates should expect a search rather than an immediate offer.',
    intakes: 'January, May and September',
    cost: {
      tuitionLow: 20000,
      tuitionHigh: 45000,
      livingLow: 15000,
      livingHigh: 25000,
      currency: 'CAD',
      note:
        'Indicative only. Fees vary by province, institution and subject: arts and humanities sit near the bottom of the band, engineering and business near the top, and medicine, dentistry and some professional programmes above it. Colleges are generally cheaper than universities. From 1 September 2026 a single study permit applicant outside Quebec must show CAD 23,448 for living expenses in addition to first-year tuition and travel — a visa minimum, not a budget. Confirm the exact fee with the institution.',
    },
  },
  {
    slug: 'italy',
    name: 'Italy',
    flag: '🇮🇹',
    capital: 'Rome',
    language: 'Italian, with a limited number of English-taught degrees',
    tagline: 'Low public tuition, income-linked fees',
    summary:
      'Public universities in Italy charge fees that are scaled to family income, so for many Bangladeshi families the tuition is far lower than in any English-speaking destination. Regional right-to-study grants can reduce it further and add subsidised housing and meals. The trade-off is language: most undergraduate teaching is in Italian, and English-taught bachelor\'s degrees are a small minority.',
    culture:
      'Northern cities such as Milan and Bologna have cold, damp winters; Rome and the south are milder and Mediterranean. Italy has the largest Bangladeshi community in the European Union — official figures put it at roughly 195,000 legal residents at the end of 2024 — concentrated in metropolitan Rome, Lombardy and the Veneto. Halal butchers and Bangladeshi-run grocers are easy to find in Rome\'s Torpignattara and Esquilino districts and along Via Padova in Milan.',
    educationSystem:
      'A bachelor\'s degree (laurea triennale) takes three years and 180 credits. Medicine, law, architecture and a few other fields are single-cycle degrees of five or six years. The year runs in two semesters from late September to July, with examination sessions in January, June and September. Universities are accredited by the ministry on the basis of evaluation by ANVUR, the national agency for the evaluation of universities and research.',
    universities: [
      { name: 'Politecnico di Milano', city: 'Milan', note: 'Engineering, architecture and design; a small number of English-taught bachelor\'s degrees' },
      { name: 'University of Bologna', city: 'Bologna', note: 'The oldest university in the Western world; the widest English-taught offering in Italy' },
      { name: 'Sapienza University of Rome', city: 'Rome', note: 'Very large and broad; most undergraduate teaching is in Italian' },
      { name: 'University of Padua', city: 'Padua', note: 'Medicine, psychology, sciences and engineering' },
      { name: 'Politecnico di Torino', city: 'Turin', note: 'Engineering and architecture, with close links to the motor industry' },
      { name: 'Università Cattolica del Sacro Cuore', city: 'Milan', note: 'Private; English-taught degrees in economics and management' },
    ],
    opportunities: [
      'Students may work up to 20 hours a week, subject to a limit of 1,040 hours across any 52-week period. Hours may be concentrated into fewer weeks provided the annual total is not exceeded.',
      'After graduating, a study permit can be converted into a residence permit to look for work or start a business. Italian law sets this at not less than nine and not more than twelve months. Local practice at the Questura can vary, so confirm the position for a bachelor\'s graduate before relying on it.',
      'Regional right-to-study bodies (DSU/ERSU) award income-tested grants that can combine a fee exemption with subsidised housing and canteen meals. Non-EU students can apply, and these grants are often larger than a university scholarship.',
      'Pre-enrolment through the Universitaly portal is compulsory before a study visa application, and embassy deadlines fall months before the course starts.',
    ],
    benefits: [
      'Public university fees are among the lowest in Western Europe and are calculated from family income rather than charged at a flat international rate.',
      'A three-year bachelor\'s degree is shorter than the four years required in several other destinations on this list.',
      'An established Bangladeshi community in Rome, Milan and the Veneto makes arrival and settling in easier.',
      'An Italian degree is recognised across the European Union, and the residence permit allows travel within the Schengen area.',
    ],
    economy:
      'Engineering and advanced manufacturing in Lombardy, Piedmont and Emilia-Romagna are the clearest routes into work, alongside fashion, tourism, logistics and information technology. Italian language ability is the binding constraint for most roles outside technical engineering, and graduate salaries are lower than in northern Europe.',
    intakes: 'September and February',
    cost: {
      tuitionLow: 160,
      tuitionHigh: 4000,
      livingLow: 9000,
      livingHigh: 16000,
      currency: 'EUR',
      note:
        'Indicative, and for public universities only. Fees are income-assessed: students who document low family income pay only the fixed element, which at several universities is around EUR 157, while those assessed at higher income pay up to the cap shown. The assessment method for families with income abroad differs between universities, so check your own institution\'s fee regulations. Private universities charge several times these amounts. Living costs depend on the city — Milan is well above Bologna or the south — and the study visa requires a separate proof of funds that rose sharply for 2026/27. Confirm the figure with the university.',
    },
  },
  {
    slug: 'malta',
    name: 'Malta',
    flag: '🇲🇹',
    capital: 'Valletta',
    language: 'English',
    tagline: 'An English-speaking EU island, small and walkable',
    summary:
      'Malta is in the European Union and teaches in English, which is one of its two official languages. That combination is unusual and removes the language barrier that limits Italy, Denmark and Cyprus for many students. The system is small — one public university and a handful of other providers — so the choice of subject is narrower than in a larger country.',
    culture:
      'The climate is Mediterranean, with hot dry summers and mild winters that rarely fall below about 5°C, which is an easier adjustment than northern Europe. English is used everywhere alongside Maltese, so daily life does not require a second language. There is a growing South Asian population working in hospitality, delivery and construction; halal food is available in Valletta, Hamrun, Marsa and St Julian\'s, though there is no national halal certification body, so ask at each outlet.',
    educationSystem:
      'A bachelor\'s degree is set at level 6 of the Malta Qualifications Framework and normally takes three years and 180 credits, with some fields taking longer. The academic year runs roughly from October to June. Higher education is licensed and accredited by the Malta Further and Higher Education Authority (MFHEA), and its recognition arm MQRIC decides whether a course counts for work and visa purposes. Check any provider against the MFHEA register of licensed providers before applying.',
    universities: [
      { name: 'University of Malta', city: 'Msida', note: 'The only public university; maritime and international law, ICT, medicine, business' },
      { name: 'Malta College of Arts, Science and Technology (MCAST)', city: 'Paola', note: 'Public vocational college awarding degrees; applied engineering, ICT and the built environment' },
      { name: 'Institute of Tourism Studies', city: 'Luqa', note: 'Public; hospitality, tourism and culinary arts' },
      { name: 'Queen Mary University of London, Malta Campus', city: 'Victoria, Gozo', note: 'Branch campus of a UK university running a five-year medical degree' },
      { name: 'St Martin\'s Institute of Higher Education', city: 'Hamrun', note: 'Private; computing and social science degrees awarded by the University of London' },
    ],
    opportunities: [
      'Students on a recognised full-time higher education course may work up to 20 hours a week across all employers. The employer must obtain an employment licence from Jobsplus before work starts.',
      'Identità\'s own guidance is inconsistent on whether the 20 hours begin in the first year or only after 90 days of study. Assume the 90-day wait and confirm your position with Identità after arrival.',
      'Graduates of a course at MQF level 5 or above may apply for a post-study residence permit of up to nine months to look for work or set up a business. It must be applied for while the student permit is still valid, it is granted once only and it cannot be extended.',
      'The post-study permit does not itself allow employment. Once there is a job offer, the employer must apply for a single permit or employment licence.',
    ],
    benefits: [
      'Teaching and daily life are both in English, so no second language is needed.',
      'A European Union degree, with the travel rights that come with a Maltese residence permit.',
      'A warm climate and short distances, which keeps transport costs low.',
      'The island has a persistent labour shortage and low unemployment, so part-time work in hospitality is generally easy to find.',
    ],
    economy:
      'Online gaming, financial services and fintech are the sectors that hire most readily in English, and they are concentrated around Sliema, St Julian\'s and Birkirkara. Tourism and hospitality employ the largest number of people overall and provide most student part-time work, but the labour market is very small, so a narrow specialisation can be hard to place.',
    intakes: 'October and February',
    cost: {
      tuitionLow: 8500,
      tuitionHigh: 11000,
      livingLow: 9600,
      livingHigh: 15600,
      currency: 'EUR',
      note:
        'Indicative. The University of Malta publishes fees per course rather than one institutional rate; several 2026/27 bachelor\'s pages state EUR 8,500 a year, but some courses are higher, so read the fee line on your own course page. MCAST is cheaper and private providers are generally dearer. Living costs are driven almost entirely by rent: Sliema and St Julian\'s are expensive, Msida, Hamrun and Birkirkara less so, and a shared room is the single biggest saving. A separate proof of funds and health insurance are required for the visa. Confirm the fee with the institution.',
    },
  },
  {
    slug: 'south-korea',
    name: 'South Korea',
    flag: '🇰🇷',
    capital: 'Seoul',
    language: 'Korean, with English-taught programmes at a small number of universities',
    tagline: 'Technology, scholarships and a longer graduate visa',
    summary:
      'South Korea combines moderate tuition at national universities with a well-funded government scholarship and, since late 2025, a job-seeking visa that can run for up to three years. English-taught undergraduate degrees exist but are concentrated in a few places, so most students will need Korean either on arrival or soon after. It suits applicants in engineering, computing and business who are prepared to learn the language.',
    culture:
      'Winters are cold and dry, with sub-zero January averages across most of the country, and summers are hot and humid with a monsoon from late June. Daily life is fast, urban and safe, and public transport is inexpensive. The Bangladeshi population in Korea was 44,721 at the end of September 2026, of whom about 9,200 held degree-study visas; most of the rest are employment-visa holders, so the community is concentrated in industrial towns in Gyeonggi-do rather than near the main universities. Certified halal food is scarce outside Itaewon in Seoul, and students outside the capital should expect to cook for themselves.',
    educationSystem:
      'A bachelor\'s degree takes four years, and six for medicine, dentistry, veterinary medicine, oriental medicine and pharmacy. The academic year begins in March, with a second intake in September, and runs in two semesters with optional summer and winter sessions. Four-year universities are accredited by the Korean University Accreditation Institute under the Korean Council for University Education, and the Ministry of Education separately certifies universities under IEQAS, which affects how readily their students get visas and work permission.',
    universities: [
      { name: 'Seoul National University', city: 'Seoul', note: 'National flagship; teaching is mainly in Korean, with entry via a special admission route' },
      { name: 'KAIST', city: 'Daejeon', note: 'Science and engineering institute that states English as its language of instruction for international students' },
      { name: 'Yonsei University', city: 'Seoul', note: 'Its Underwood International College teaches entirely in English' },
      { name: 'Korea University', city: 'Seoul', note: 'Private; an English-track international studies degree alongside Korean-medium departments' },
      { name: 'POSTECH', city: 'Pohang', note: 'Small research-intensive institute with a new international undergraduate track' },
      { name: 'Handong Global University', city: 'Pohang', note: 'Four areas taught wholly in English, with lower living costs than Seoul' },
    ],
    opportunities: [
      'Part-time work needs a permit from the immigration office before it starts, and a grade average of 2.0 or above. Working without the permit carries a heavy fine.',
      'Hours depend on Korean language level. Undergraduates meeting the required TOPIK level are generally allowed around 25 to 30 hours on weekdays, with no limit at weekends, on holidays and during vacations; those who do not meet it are limited to about 10 hours. University notices differ on the exact figure, so confirm with your international office.',
      'The D-10 job-seeking visa was extended on 29 October 2025. It now runs to a maximum of three years, with an initial grant of up to one year, extendable in one-year steps. A points test applies, with exemptions for recent graduates of Korean universities who hold TOPIK level 4 or above.',
      'Graduates of Korean universities can change from D-10 to the E-7 work visa without prior career experience, provided the job relates to their major and the salary meets the minimum threshold.',
    ],
    benefits: [
      'National and public universities charge noticeably less than private ones, and the Global Korea Scholarship covers airfare, a year of language training, tuition and a monthly allowance.',
      'Strong provision in engineering, computing and the sciences, with close links to large manufacturers.',
      'The job-seeking visa was lengthened rather than shortened, which is unusual among the destinations on this list.',
      'Living costs outside Seoul are materially lower, and several strong institutions are in smaller cities such as Daejeon and Pohang.',
    ],
    economy:
      'Information technology, trade, manufacturing and education are where international graduates are most often placed, with language teaching and translation common early roles. Only about a third of eligible international graduates were employed in Korea in 2024, so Korean language ability is the main factor separating those who stay from those who do not.',
    intakes: 'March and September',
    cost: {
      tuitionLow: 4300000,
      tuitionHigh: 9800000,
      livingLow: 9000000,
      livingHigh: 12000000,
      currency: 'KRW',
      note:
        'Indicative. The official average annual undergraduate fee is about KRW 4.27 million at national and public universities and about KRW 7.63 million at private ones; engineering and arts sit above the private average and medicine higher again, which is where the top of this band comes from. Living costs follow the official guide of KRW 750,000 to 1,000,000 a month, and are lower outside Seoul and lower again in a university dormitory. Korean rental deposits (jeonse and wolse) can require a large lump sum. Confirm the fee with the university.',
    },
  },
  {
    slug: 'united-kingdom',
    name: 'UK',
    flag: '🇬🇧',
    capital: 'London',
    language: 'English',
    tagline: 'Three-year degrees and a shortening graduate visa',
    summary:
      'The United Kingdom offers three-year bachelor\'s degrees, teaching in English and a graduate visa that does not require a job offer. The length of that visa is changing: it is two years for applications made on or before 31 December 2026 and 18 months for applications made on or after 1 January 2027. Anyone planning a UK degree now should understand which side of that date they will fall on.',
    culture:
      'The weather is mild but grey and wet, and winter days are short. Bangladeshi communities are long-established, particularly in east London, Birmingham, Oldham and Luton, and Bengali is widely spoken in parts of them. Halal food, mosques and Bangladeshi grocers are easy to find in most British cities, which makes the practical side of arrival simpler than in much of Europe.',
    educationSystem:
      'A bachelor\'s degree takes three years in England, Wales and Northern Ireland, and four in Scotland. The academic year runs from September or October to June, with a smaller January intake at many universities. Teaching is specialised from the first year, with fewer contact hours and more independent reading than most students expect. Standards are overseen by the Quality Assurance Agency for Higher Education, and providers in England are registered with the Office for Students.',
    universities: [
      { name: 'University of Oxford', city: 'Oxford', note: 'Collegiate structure with weekly small-group tutorials' },
      { name: 'University of Cambridge', city: 'Cambridge', note: 'Collegiate; strong in mathematics and the natural sciences' },
      { name: 'Imperial College London', city: 'London', note: 'Science, engineering, medicine and business only' },
      { name: 'University of Manchester', city: 'Manchester', note: 'Large and broad, in a city with lower living costs than London' },
      { name: 'University of Edinburgh', city: 'Edinburgh', note: 'Four-year Scottish degrees with a broader first two years' },
      { name: 'University of Glasgow', city: 'Glasgow', note: 'Broad research university; engineering and medicine' },
    ],
    opportunities: [
      'Students on a degree-level course may work up to 20 hours a week during term time, across all jobs combined, and full time during official vacations. Courses below degree level are limited to 10 hours.',
      'The Graduate Route allows a stay without a job offer. It lasts two years for applications made on or before 31 December 2026 and 18 months for applications made on or after 1 January 2027. Doctoral graduates keep three years. It cannot be extended.',
      'The Graduate Route is dated from the application, not from the end of the course, so a student finishing in late 2026 who applies in January 2027 receives the shorter period.',
      'Moving from the Graduate Route to a Skilled Worker visa requires a licensed sponsor and a job meeting the salary and skill thresholds, which have been raised in recent years.',
    ],
    benefits: [
      'A three-year degree shortens both the tuition bill and the time away from work compared with four-year systems.',
      'Teaching is in English, and the qualification is recognised internationally.',
      'A large, well-established Bangladeshi community in several cities.',
      'Universities outside London and the south-east are considerably cheaper to live in, and the visa rules recognise this with a lower maintenance requirement.',
    ],
    economy:
      'Health and social care, information technology, engineering, finance and professional services account for most graduate hiring, and several of these appear on the shortage lists. Competition for sponsored graduate roles has increased since the salary thresholds rose, so graduates should plan for a search rather than assume a transfer to a work visa.',
    intakes: 'January and September',
    cost: {
      tuitionLow: 12000,
      tuitionHigh: 38000,
      livingLow: 11000,
      livingHigh: 18000,
      currency: 'GBP',
      note:
        'Indicative. The lower end reflects classroom-based subjects at post-1992 universities; the upper end reflects laboratory, engineering and clinical subjects at the larger research universities. Medicine and dentistry are charged well above this band. For living costs the Home Office currently requires GBP 1,529 a month in London and GBP 1,171 a month elsewhere, for up to nine months — a visa minimum rather than a realistic budget, and London is the main thing that moves the figure. Confirm the exact fee with the university before accepting an offer.',
    },
  },
  {
    slug: 'japan',
    name: 'Japan',
    flag: '🇯🇵',
    capital: 'Tokyo',
    language: 'Japanese, with English-taught degrees at a small number of universities',
    tagline: 'Low national tuition, strong engineering links',
    summary:
      'National universities in Japan charge a fee set by ministerial ordinance, which makes them markedly cheaper than private universities in most English-speaking countries. Several universities run English-taught undergraduate programmes, but they are a narrow niche within a system that teaches overwhelmingly in Japanese. The best post-study work status still requires a high level of Japanese, so the language question cannot be deferred indefinitely.',
    culture:
      'Summers in Tokyo are hot and humid in a way that will feel familiar, but winters are cold and dry, and campuses in Sendai, Akita and further north get heavy snow. Typhoons affect the country from summer into autumn. The Bangladeshi student population is growing quickly — 11,392 in May 2025, up by about half in a year, making it the seventh largest nationality. Halal food and prayer facilities are available around major universities and in Tokyo and Osaka, but Japan has no national halal authority, so certification marks vary.',
    educationSystem:
      'A bachelor\'s degree takes four years and 124 credits, and six years for medicine, dentistry, veterinary medicine and clinical pharmacy. The academic year runs from April to March in two semesters, and the universities with English-taught programmes usually add an autumn intake in September or October. Universities are approved by the education ministry and must undergo certified evaluation and accreditation at least once every seven years by a recognised agency such as NIAD-QE or JUAA.',
    universities: [
      { name: 'Waseda University', city: 'Tokyo', note: 'Private; the widest spread of English-taught undergraduate programmes, from politics to engineering' },
      { name: 'Sophia University', city: 'Tokyo', note: 'Private; a long-running all-English Faculty of Liberal Arts in central Tokyo' },
      { name: 'Ritsumeikan Asia Pacific University', city: 'Beppu', note: 'Private; management, tourism and sustainability taught in English' },
      { name: 'Akita International University', city: 'Akita', note: 'Public; taught entirely in English, with a compulsory year abroad' },
      { name: 'Nagoya University', city: 'Nagoya', note: 'National; English-taught science and engineering, including automotive engineering' },
      { name: 'Tohoku University', city: 'Sendai', note: 'National; a new English-medium college from April 2027 where students choose a specialism after entry' },
    ],
    opportunities: [
      'Students need permission to engage in an activity other than that permitted by their status of residence before working. With it they may work up to 28 hours a week during term, and up to eight hours a day during long vacations. The limit covers all jobs together.',
      'Graduates may stay to look for work on a Designated Activities status, normally six months and renewable once, so up to a year. It requires a recommendation letter from the university and evidence of continuing job-hunting.',
      'The Designated Activities status under Notice 46, which allows a wider range of work than the standard engineer and specialist visa, requires JLPT N1 or an equivalent business Japanese score. This is the single most important language fact for anyone planning to stay.',
      'The J-Find visa of up to two years is limited to graduates of universities ranked in the top 100 of at least two major ranking tables, so it is not a general route for graduates of the universities listed above.',
    ],
    benefits: [
      'The standard national university fee is set by ordinance and is low by international comparison, though some national universities now charge above it.',
      'Many national universities offer partial or full tuition exemptions to self-funded international students.',
      'The government MEXT scholarship covers tuition, return airfare and a monthly allowance for undergraduates, including a preparatory year of Japanese.',
      'Japan met its target of 400,000 international students eight years early, and policy continues to support recruitment and retention.',
    ],
    economy:
      'Official figures for 2024 show that most international graduates who stayed went into non-manufacturing work, with retail and information technology the largest single sectors and translation, interpreting and general management the most common duties. Most joined companies with fewer than 100 employees, and starting salaries are modest, so expectations should be set accordingly.',
    intakes: 'April and October',
    cost: {
      tuitionLow: 535800,
      tuitionHigh: 1300000,
      livingLow: 1000000,
      livingHigh: 1900000,
      currency: 'JPY',
      note:
        'Indicative. JPY 535,800 is the standard annual fee at national universities; institutions may charge up to 120 per cent of it, and the University of Tokyo now charges JPY 642,960. Private universities outside medicine sit near the top of this band, and private medical and dental courses are far above it. A one-off admission fee of about JPY 282,000 is payable in the first year on top of tuition. For living costs the national average reported by JASSO is about JPY 105,000 a month excluding tuition, with Tokyo rents roughly 40 per cent above the national average. Confirm the fee with the university.',
    },
  },
  {
    slug: 'cyprus',
    name: 'Cyprus',
    flag: '🇨🇾',
    capital: 'Nicosia',
    language: 'English at the private universities; Greek at most public undergraduate courses',
    tagline: 'English-taught EU degrees at mid-range cost',
    summary:
      'The Republic of Cyprus is an English-friendly European Union country where the private universities teach in English and the public ones charge a fixed annual fee to non-EU students. It can work well as a route to a recognised EU degree. The post-study position is the thing to understand before applying: the job-search permit is restricted to master\'s level and above, so a bachelor\'s degree here is a qualification route rather than a migration route.',
    culture:
      'The climate is Mediterranean, with hot dry summers and mild wet winters, which is an easy adjustment. English is very widely spoken as a legacy of British administration, although Greek and Turkish are the official languages. Nicosia remains a divided city, with a United Nations buffer zone running through it and a pedestrian crossing at Ledra Street. Halal food is harder to find than in Italy or Malta and is concentrated in parts of Nicosia and Limassol.',
    educationSystem:
      'A bachelor\'s degree takes four years and 240 credits — a year longer than Italy, Malta or England — and medicine takes six, which changes the total cost materially. The year runs in two semesters from September to May or June. Institutions and individual programmes are accredited by the Cyprus Agency of Quality Assurance and Accreditation in Higher Education (CYQAA, also known as DIPAE). Accreditation is granted per programme, so check the specific course on the agency register and not only the university.',
    universities: [
      { name: 'University of Cyprus', city: 'Nicosia', note: 'Public flagship; historically Greek-medium at undergraduate level, now introducing English-taught degrees' },
      { name: 'Cyprus University of Technology', city: 'Limassol', note: 'Public and applied; engineering, health sciences and hotel and tourism management' },
      { name: 'University of Nicosia', city: 'Nicosia', note: 'The largest private university; medicine, business and a digital-currency specialism' },
      { name: 'European University Cyprus', city: 'Nicosia', note: 'Private; medicine, dentistry, veterinary science and health sciences' },
      { name: 'Frederick University', city: 'Nicosia and Limassol', note: 'Private; engineering, architecture, education and maritime studies' },
      { name: 'Neapolis University Pafos', city: 'Paphos', note: 'Private and small; business, architecture and health sciences' },
    ],
    opportunities: [
      'Students may work up to 20 hours a week during term and up to 38 hours a week while classes are interrupted. The employment contract must be approved and stamped by a District Labour Office before work begins.',
      'Work is permitted only in occupations and sectors listed by the Minister of Labour. The list covers manual and service work — catering, cleaning, agriculture, food delivery, care and similar — and does not include office, retail or technical part-time work.',
      'The twelve-month post-study permit to look for work or start a business is restricted by law to graduates at level 7 of the European Qualifications Framework, that is master\'s level or above. A bachelor\'s graduate has no job-search permit and would need an employer-sponsored work permit like any other third-country national.',
      'An increase in the weekly student work limit from 20 to 25 hours was proposed in 2024 but has not been confirmed as enacted. Treat 20 hours as current.',
    ],
    benefits: [
      'The private universities teach in English and most degrees are accessible without Greek.',
      'A European Union qualification, with a residence permit that allows travel in the Schengen area.',
      'Public university fees for non-EU undergraduates are a single published figure, which makes budgeting straightforward.',
      'A warm climate and relatively low crime, in a country where English is widely used in daily life.',
    ],
    economy:
      'Information technology, foreign exchange and brokerage firms, shipping and professional services are concentrated in Limassol and hire multilingual graduates; tourism and hospitality remain the largest employers overall. Note the mismatch: the sectors that hire graduates are not the sectors students are permitted to work in while studying, and the job-search permit is closed to bachelor\'s graduates.',
    intakes: 'September and January',
    cost: {
      tuitionLow: 6834,
      tuitionHigh: 11000,
      livingLow: 9600,
      livingHigh: 12000,
      currency: 'EUR',
      note:
        'Indicative. EUR 6,834 a year is the published fee for non-EU undergraduates at the public universities. Private universities charge roughly EUR 8,000 to 11,000 a year for a typical bachelor\'s degree, and medicine, dentistry and veterinary science cost far more. Remember that a Cypriot bachelor\'s degree takes four years, so multiply accordingly. Private universities often advertise fees after a scholarship discount, so ask for the gross fee and the scholarship separately. Living costs are higher in Limassol than in Nicosia or Larnaca. Confirm the fee with the institution. Be careful not to confuse institutions in the Republic of Cyprus with those in the north, which are outside the European Union and subject to entirely different rules.',
    },
  },
  {
    slug: 'russia',
    name: 'Russia',
    flag: '🇷🇺',
    capital: 'Moscow',
    language: 'Russian, with English-medium programmes mainly in medicine',
    tagline: 'Lower-cost medical and engineering degrees',
    summary:
      'Russia is chosen mainly for medicine and engineering, where fees at regional universities are a fraction of those in Western Europe and government quota scholarships are available through Russian House in Dhaka. It is a qualification route rather than a migration route: there is no dedicated post-study work visa, and employment in Russia effectively requires Russian. Anyone intending to practise medicine in Bangladesh must confirm the Bangladesh Medical and Dental Council\'s recognition and screening requirements before enrolling, not after graduating.',
    culture:
      'Winters are long, dark and well below freezing from roughly November to March, and this is a common cause of first-year difficulty for students from Bangladesh. Halal food is readily available in Moscow and especially in Tatarstan and Bashkortostan, where a large share of the population is Muslim and mosques are numerous. Practical points matter here: foreign-issued Visa and Mastercard do not work inside Russia, so students open a local account and card on arrival, and there is no direct flight from Dhaka to Moscow.',
    educationSystem:
      'A bachelor\'s degree takes four years. Medicine is a six-year single-cycle specialist degree and dentistry five. The academic year begins on 1 September. Most teaching is in Russian, and students without Russian normally take a preparatory faculty year first. Licensing and state accreditation are handled by Rosobrnadzor, the federal supervision service. This matters directly: a university that loses state accreditation can keep teaching but cannot issue state-recognised diplomas, so check a university on the Rosobrnadzor register before enrolling.',
    universities: [
      { name: 'Sechenov University', city: 'Moscow', note: 'Formally I.M. Sechenov First Moscow State Medical University; medicine in Russian and English, priced well above regional universities' },
      { name: 'Volgograd State Medical University', city: 'Volgograd', note: 'Has taught international students since the 1960s; established English-medium medical track' },
      { name: 'Bashkir State Medical University', city: 'Ufa', note: 'English-medium medicine, dentistry and pharmacy in a Muslim-majority republic' },
      { name: 'RUDN University', city: 'Moscow', note: 'Formally Peoples\' Friendship University of Russia; built around international students, renamed in 2023' },
      { name: 'Kazan Federal University', city: 'Kazan', note: 'Large comprehensive university with English-taught programmes outside medicine' },
      { name: 'Peter the Great St Petersburg Polytechnic University', city: 'St Petersburg', note: 'Engineering and technology, with English-taught degrees and a foundation year' },
    ],
    opportunities: [
      'Since a law that took effect in August 2020, international students aged 18 or over who are enrolled full time on a state-accredited programme at a state institution may work without a separate work permit or patent. The employment contract ends when the studies do.',
      'No statutory weekly hour cap for students was found in the law itself, and the 20-hour figure that circulates online could not be confirmed. Confirm the position with the university before taking work. Students on preparatory faculties are not always permitted to work.',
      'There is no dedicated post-study work visa. On graduating, the right to work without a permit ends. A graduate of a full-time state-accredited programme can apply for simplified temporary residence within three years of finishing, and a graduate with an honours diploma can apply for a residence permit directly.',
      'Government quota scholarships are allocated to Bangladesh each year and cover tuition, a monthly stipend and a free preparatory year, but not accommodation, flights or living costs. Applications go through the official portal and Russian House in Dhaka; deadlines fall around December and January for the following September.',
    ],
    benefits: [
      'Tuition for medicine at regional universities is far below the cost of equivalent study in Western Europe or Australia.',
      'University dormitories are heavily subsidised, which keeps total living costs low compared with every other destination on this list.',
      'A substantial number of government quota places are allocated to Bangladesh each year, and the number has risen in recent cycles.',
      'Halal food, mosques and a Muslim-majority environment are straightforward in Kazan and Ufa.',
    ],
    economy:
      'Information technology, energy, engineering and healthcare are the sectors most likely to employ foreign graduates, and employers in energy and IT are the most willing to arrange work permits. Russian fluency is in practice a requirement for employment regardless of whether the degree was taught in English, so most Bangladeshi graduates return home or sit licensing examinations elsewhere.',
    intakes: 'September',
    cost: {
      tuitionLow: 200000,
      tuitionHigh: 1300000,
      livingLow: 150000,
      livingHigh: 400000,
      currency: 'RUB',
      note:
        'Indicative, and in roubles, which move against the taka. The lower end reflects non-medical bachelor\'s degrees and Russian-medium medicine at regional universities, which sit around RUB 260,000 to 400,000 a year; English-medium medicine adds roughly RUB 115,000 to 130,000 a year at the same university. Moscow is the outlier, with Sechenov University several times the cost of a regional medical university. A preparatory year, where needed, costs roughly RUB 210,000 to 362,000 more. Universities reset fees annually and they often rise within a single cohort, so budget for increases rather than a flat six-year figure. Living costs assume a university dormitory; a private flat costs several times more. Confirm the current fee with the university.',
    },
  },
  {
    slug: 'denmark',
    name: 'Denmark',
    flag: '🇩🇰',
    capital: 'Copenhagen',
    language: 'Danish, with English-taught programmes mainly at university colleges and business academies',
    tagline: 'Strong teaching, high cost, shorter stay-back',
    summary:
      'Denmark offers well-funded universities, project-based teaching and a transparent system, but it is expensive and the English-taught options at bachelor level are limited. Non-EU students pay full tuition, and the post-study job-seeking permit was cut from three years to one year for applications made on or after 1 October 2026. It suits a student who wants the quality of teaching and is clear-eyed about the cost and the short stay-back period.',
    culture:
      'Winters are dark rather than extreme: December averages under an hour and a half of sunshine a day, and the annual mean temperature is around 9°C. Daily life does not require Danish, because English is spoken almost universally. The Bangladeshi community is small — official statistics recorded 8,640 people of Bangladeshi origin in Denmark in 2026 — so students should not expect the community support available in London or Toronto. Cycling is the normal way to get around and the cheapest.',
    educationSystem:
      'A university bachelor\'s degree takes three years and 180 credits. A professional bachelor\'s degree at a university college takes three to four and a half years and includes compulsory placements, and a two-year academy profession degree can be topped up to a bachelor\'s in a further eighteen months. The academic year runs from late August or September to June, with examinations in January and June and no teaching in July. The bachelor application deadline is 15 March through optagelse.dk. Accreditation reports are prepared by the Danish Accreditation Institution and decisions are taken by the Accreditation Council.',
    universities: [
      { name: 'University of Copenhagen', city: 'Copenhagen', note: 'Broad research university; most bachelor\'s degrees are taught in Danish' },
      { name: 'Technical University of Denmark', city: 'Kongens Lyngby', note: 'Engineering and applied science; runs a three-year BSc in General Engineering in English' },
      { name: 'Aarhus University', city: 'Aarhus', note: 'Large and broad; English provision is concentrated at master\'s level' },
      { name: 'Aalborg University', city: 'Aalborg', note: 'Known for problem- and project-based learning; engineering, ICT and design' },
      { name: 'Copenhagen Business School', city: 'Frederiksberg', note: 'The widest English-taught bachelor\'s offering of any Danish university, in business and economics' },
      { name: 'VIA University College', city: 'Horsens', note: 'Professional bachelor\'s degrees in engineering, construction, design and business, with placements' },
    ],
    opportunities: [
      'Students from outside the EU may work 90 hours a month from September to May, and full time in June, July and August. The older figure of 20 hours a week applies only to residence cards issued before July 2024, which is why it still appears on many websites.',
      'The post-study job-seeking permit was shortened. Applications made before 1 October 2026 received three years; applications made on or after that date receive one year. Doctoral graduates keep three years. This is a recent change and should be rechecked before any student relies on it.',
      'Students on programmes that are not state-approved, who applied on or after 2 May 2025, receive no work permit at all. Check that the programme is state-approved before applying, particularly with private providers.',
      'The establishment card was abolished in 2023. Any source still advertising a three-year establishment card with no job offer is out of date.',
    ],
    benefits: [
      'Teaching is project-based and closely tied to industry, particularly at Aalborg and the university colleges, and professional bachelor\'s degrees include compulsory placements.',
      'If you pay tuition for a complete programme in Denmark, you do not need to document separate self-support funds for the residence permit.',
      'English is spoken almost universally in daily life, so arrival does not require Danish.',
      'From the summer 2027 intake, 800 new English-taught places are being created at business academies and university colleges, restricted to STEM and IT subjects and to campuses outside Copenhagen and Aarhus.',
    ],
    economy:
      'The official positive lists for higher education and skilled work are the clearest guide to where a work permit is realistic, and they cover natural science and engineering, healthcare, ICT, teaching, economics and administration, and technical work in shipping and aviation. English is workable in research, life sciences, IT and engineering, but public-facing and public-sector roles generally require Danish, and healthcare roles require Danish professional authorisation.',
    intakes: 'August and January',
    cost: {
      tuitionLow: 45000,
      tuitionHigh: 120000,
      livingLow: 80000,
      livingHigh: 165000,
      currency: 'DKK',
      note:
        'Indicative, and this is the band published by the official Study in Denmark service for full-degree students from outside the EU and EEA. Students from the EU, EEA, Switzerland and the Nordic countries pay nothing; Bangladeshi students do not qualify for that exemption. Some programmes sit above the band, and some published figures are for the whole programme rather than one year, so check which basis a quoted fee uses. Living costs are driven by the city: Odense, Esbjerg and Aalborg run well below Copenhagen, and a room in a hall of residence is cheaper than a private rental. The immigration service sets a self-support requirement of DKK 7,426 a month, though students who pay for a complete programme are exempt from documenting it. Confirm the fee with the institution.',
    },
  },
];

export function getCountry(slug: string): Country | undefined {
  return COUNTRIES.find(country => country.slug === slug);
}
