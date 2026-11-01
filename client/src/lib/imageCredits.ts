/**
 * Credits for every photograph bundled under `client/public/images`.
 *
 * Each picture was downloaded from Wikimedia Commons under a licence that permits
 * commercial use, and re-encoded to JPEG (max 1600px on the long edge, quality 82).
 * Attribution for the CC BY files is a licence condition, so these lines must stay
 * visible on any page that renders the images.
 *
 * None of these photographs show Study Hub BD's own office, staff or students.
 * They show the world the consultancy works in. Do not caption them otherwise.
 */

export type ImageCredit = {
  file: string; // public path as the page references it, e.g. "/images/world/australia.jpg"
  title: string;
  creator: string;
  licence: string; // e.g. "CC BY 2.0"
  licenceUrl: string;
  sourceUrl: string; // the Commons/Openverse page, not the image file
  subject: string; // e.g. "Australia", "Tangail", "slot: classroom"
};

export const IMAGE_CREDITS: ImageCredit[] = [
  // ----- Destination countries -----
  {
    file: '/images/world/australia.jpg',
    title: 'Sydney Opera House Close up HDR Sydney Australia',
    creator: 'Hai Linh Truong',
    licence: 'CC BY 2.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/2.0/',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Sydney_Opera_House_Close_up_HDR_Sydney_Australia.jpg',
    subject: 'Australia',
  },
  {
    file: '/images/world/canada.jpg',
    title: 'Château Frontenac, Quebec city, Canada',
    creator: 'Wilfredor',
    licence: 'CC0 1.0',
    licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Ch%C3%A2teau_Frontenac,_Quebec_city,_Canada.jpg',
    subject: 'Canada',
  },
  {
    file: '/images/world/italy.jpg',
    title: 'Colosseum of Rome, Italy',
    creator: 'Wilfredor',
    licence: 'CC0 1.0',
    licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Colosseum_of_Rome,_Italy.jpg',
    subject: 'Italy',
  },
  {
    file: '/images/world/malta.jpg',
    title: 'Marsaxlokk Boat',
    creator: 'Vlad beu',
    licence: 'Public domain',
    licenceUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Marsaxlokk_Boat.JPG',
    subject: 'Malta',
  },
  {
    file: '/images/world/south-korea.jpg',
    title: 'Gyeongbokgung Palace, Seoul, South Korea Aug 24, 2025 09-04-51 AM',
    creator: 'Grandmaster Huon',
    licence: 'CC0 1.0',
    licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Gyeongbokgung_Palace,_Seoul,_South_Korea_Aug_24,_2025_09-04-51_AM.jpeg',
    subject: 'South Korea',
  },
  {
    file: '/images/world/united-kingdom.jpg',
    title: 'Tower Bridge London 2016',
    creator: 'Photo2023',
    licence: 'CC BY 4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Tower_Bridge_London_2016.jpg',
    subject: 'United Kingdom',
  },
  {
    file: '/images/world/japan.jpg',
    title: 'Mount Fuji at sunset, March 2025',
    creator: 'Romain Guy',
    licence: 'CC0 1.0',
    licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mount_Fuji_at_sunset,_March_2025.jpg',
    subject: 'Japan',
  },
  {
    file: '/images/world/cyprus.jpg',
    title: 'Petra Tou Romiou (Rock of the Greek), or Aphrodites Rock',
    creator: 'Michal Osmenda',
    licence: 'CC BY 2.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/2.0/',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Petra_Tou_Romiou_(Rock_of_the_Greek),_or_Aphrodites_Rock_(8010193601).jpg',
    subject: 'Cyprus',
  },
  {
    file: '/images/world/russia.jpg',
    title: "Moscow - 2025 - Daytime view of St. Basil's Cathedral from Vasilyevsky Spusk",
    creator: 'Юрий Д.К.',
    licence: 'CC BY 4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Moscow_-_2025_-_Daytime_view_of_St._Basil's_Cathedral_from_Vasilyevsky_Spusk.jpg",
    subject: 'Russia',
  },
  {
    file: '/images/world/denmark.jpg',
    title: 'Nyhavn 17 Copenhagen Denmark',
    creator: 'Jebulon',
    licence: 'CC0 1.0',
    licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Nyhavn_17_Copenhagen_Denmark.jpg',
    subject: 'Denmark',
  },

  // ----- Tangail, Bangladesh: the town the consultancy works from -----
  {
    file: '/images/tangail/atia-mosque.jpg',
    title: 'Atia Mosque, Tangail, Bangladesh',
    creator: 'John Pavelka',
    licence: 'CC BY 2.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/2.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Atia_Mosque,_Tangail,_Bangladesh.jpg',
    subject: 'Tangail',
  },
  {
    file: '/images/tangail/dc-lake.jpg',
    title: 'DC Lake, Tangail 04',
    creator: 'Kryesmin',
    licence: 'CC0 1.0',
    licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:DC_Lake,_Tangail_04.jpg',
    subject: 'Tangail',
  },
  {
    file: '/images/tangail/dc-lake-sign.jpg',
    title: 'Tangail DC Lake, Bangladesh 05',
    creator: 'Kryesmin',
    licence: 'CC0 1.0',
    licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Tangail_DC_Lake,_Bangladesh_05.jpg',
    subject: 'Tangail',
  },
  {
    file: '/images/tangail/shamsul-haq-toran.jpg',
    title: 'Shamsul Haq Toran, Tangail',
    creator: 'P.K.Niyogi',
    licence: 'Public domain',
    licenceUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:BD_Tangail_5.JPG',
    subject: 'Tangail',
  },
  {
    file: '/images/tangail/handloom-weaver.jpg',
    title: 'A weaver in Berabuchina village, Tangail',
    creator: 'P.K.Niyogi',
    licence: 'Public domain',
    licenceUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:BD_Tangail_4.JPG',
    subject: 'Tangail',
  },
  {
    file: '/images/tangail/dyed-yarn-drying.jpg',
    title: 'Coloured cotton thread left to dry in Aloa village, Tangail',
    creator: 'P.K.Niyogi',
    licence: 'Public domain',
    licenceUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:BD_Tangail_3.JPG',
    subject: 'Tangail',
  },

  // ----- Inline text slots (cropped very small and wide) -----
  {
    file: '/images/slots/classroom.jpg',
    title: 'Rows of Desks in Lecture Theatre',
    creator: 'Paul The Writer',
    licence: 'CC0 1.0',
    licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Rows_of_Desks_in_Lecture_Theatre.jpg',
    subject: 'slot: classroom',
  },
  {
    file: '/images/slots/japanese-signage.jpg',
    title: 'Takanawa Gateway Station Signage',
    creator: 'Real Estate Japan',
    licence: 'CC BY 2.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/2.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Takanawa_Gateway_Station_Signage.jpg',
    subject: 'slot: Japanese signage',
  },
  {
    file: '/images/slots/passport-stamps.jpg',
    title: 'Brazil, Iceland, UK, US passport stamps',
    creator: 'Jon Evans',
    licence: 'CC BY 2.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/2.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Brazil,_Iceland,_UK,_US_passport_stamps.jpg',
    subject: 'slot: passport stamps',
  },
  {
    file: '/images/slots/paperwork.jpg',
    title: 'The write thing Project 365(2) Day 12',
    creator: 'Keith Williamson',
    licence: 'CC BY 2.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/2.0/',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:The_write_thing_Project_365(2)_Day_12_(4355765412).jpg',
    subject: 'slot: paperwork',
  },

  // ----- Country page heroes (wide, 16:9) -----
  {
    file: '/images/country/australia.jpg',
    title: 'Aerial panorama of South Yarra facing the Melbourne skyline. September 2023',
    creator: 'Bob Tan',
    licence: 'CC BY 4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Aerial_panorama_of_South_Yarra_facing_the_Melbourne_skyline._September_2023.jpg',
    subject: 'country page: Australia',
  },
  {
    file: '/images/country/canada.jpg',
    title: 'UBC from the Air 8788',
    creator: 'ImagePerson',
    licence: 'CC BY 4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:UBC_from_the_Air_8788.jpg',
    subject: 'country page: Canada',
  },
  {
    file: '/images/country/italy.jpg',
    title: 'Florence panorama as seen from The Piazza Michelangelo',
    creator: 'Ray in Manila',
    licence: 'CC BY 2.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/2.0',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Florence_panorama_as_seen_from_The_Piazza_Michelangelo.jpg',
    subject: 'country page: Italy',
  },
  {
    file: '/images/country/malta.jpg',
    title: "Valletta's Armada Stands Ready",
    creator: 'TerryDOtt',
    licence: 'CC BY 4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Valletta's_Armada_Stands_Ready.jpg",
    subject: 'country page: Malta',
  },
  {
    file: '/images/country/south-korea.jpg',
    title: 'Han River Seoul skyline Pixabay 1214950',
    creator: 'USAGI_POST',
    licence: 'CC0 1.0',
    licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Han_River_Seoul_skyline_Pixabay_1214950.jpg',
    subject: 'country page: South Korea',
  },
  {
    file: '/images/country/united-kingdom.jpg',
    title: 'Newcastle Quayside with bridges',
    creator: 'Wilka Hudson',
    licence: 'CC BY 2.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/2.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Newcastle_Quayside_with_bridges.jpg',
    subject: 'country page: United Kingdom',
  },
  {
    file: '/images/country/japan.jpg',
    title:
      'Shinjuku Park Tower, NTT East, and Tokyo Opera City, view from the Tokyo Metropolitan Government Building No.2',
    creator: 'Jason Goh',
    licence: 'CC0 1.0',
    licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Shinjuku_Park_Tower,_NTT_East,_and_Tokyo_Opera_City,_view_from_the_Tokyo_Metropolitan_Government_Building_No.2_(2013-06-07_by_Jason_Goh_@Pixabay_217878).jpg',
    subject: 'country page: Japan',
  },
  {
    file: '/images/country/cyprus.jpg',
    title: 'Old Town of Paphos, Paphos, Cyprus - panoramio (15)',
    creator: 'greglaskiewicz',
    licence: 'CC BY 3.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/3.0',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Old_Town_of_Paphos,_Paphos,_Cyprus_-_panoramio_(15).jpg',
    subject: 'country page: Cyprus',
  },
  {
    file: '/images/country/russia.jpg',
    title: 'Moscow State University, Northern residential building, Autumn in Moscow, Russia',
    creator: 'Vyacheslav Argenberg',
    licence: 'CC BY 4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Moscow_State_University,_Northern_residential_building,_Autumn_in_Moscow,_Russia.jpg',
    subject: 'country page: Russia',
  },
  {
    file: '/images/country/denmark.jpg',
    title: 'Aula Aarhus University seen from the university park in light snow Aarhus Denmark 2021',
    creator: 'Ciara Ní Riain',
    licence: 'CC BY 4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Aula_Aarhus_University_seen_from_the_university_park_in_light_snow_Aarhus_Denmark_2021.jpg',
    subject: 'country page: Denmark',
  },
];

/** Every picture here comes from Wikimedia Commons. */
export const IMAGE_CREDIT_SOURCE = 'Wikimedia Commons';
