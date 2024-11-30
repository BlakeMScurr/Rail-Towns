import type { Site, SocialObjects } from "./types";

export const SITE: Site = {
  website: "https://blakemscurr.github.io",
  author: "Blake McAlevey-Scurr",
  profile: "",
  desc: "A Plan for our Housing Crisis",
  title: "Dunedin Rail Towns",
  ogImage: "astropaper-og.jpg",
  lightAndDarkMode: true,
  postPerIndex: 4,
  postPerPage: 10,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showArchives: false,
  editPost: {
    url: "https://github.com/blakemscurr/Rail-Towns/edit/main/src/content/blog",
    text: "Suggest Changes",
    appendFilePath: true,
  },
};

export const LOCALE = {
  lang: "en", // html lang code. Set this empty and default will be "en"
  langTag: ["en-EN"], // BCP 47 Language Tags. Set this empty [] to use the environment default
} as const;

export const LOGO_IMAGE = {
  enable: false,
  svg: true,
  width: 216,
  height: 46,
};

export const SOCIALS: SocialObjects = [
  {
    name: "Facebook",
    href: "https://github.com/blakemscurr/rail-towns",
    linkTitle: `${SITE.title} on Facebook`,
    active: true,
  },
  {
    name: "Github",
    href: "https://github.com/blakemscurr/rail-towns",
    linkTitle: ` ${SITE.title} on Github`,
    active: true,
  },
  {
    name: "Mail",
    href: "mailto:yourmail@gmail.com",
    linkTitle: `Send an email to ${SITE.title}`,
    active: true,
  },
];
