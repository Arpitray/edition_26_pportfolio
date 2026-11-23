// Every word on the site lives here, so the copy can change without touching a component.

/** A painting and its depth map (made by tools/make-depth.mjs). */
export type Art = { color: string; depth: string; alt: string };

const painting = (name: string, alt: string): Art => ({
  color: `/art/web/${name}.jpg`,
  depth: `/art/web/${name}-depth.png`,
  alt,
});

// Johannes Vermeer, public domain (Wikimedia Commons).
export const art = {
  geographer: painting("geographer", "Johannes Vermeer, The Geographer (1669)"),
  astronomer: painting("astronomer", "Johannes Vermeer, The Astronomer (1668)"),
  artOfPainting: painting("art-of-painting", "Johannes Vermeer, The Art of Painting (c. 1666–68)"),
  pearlEarring: painting("pearl-earring", "Johannes Vermeer, Girl with a Pearl Earring (c. 1665)"),
};

export type Chapter = { id: string; numeral: string; label: string };

export const chapters: Chapter[] = [
  { id: "about", numeral: "I", label: "About" },
  { id: "novafocus", numeral: "II", label: "NovaFocus" },
  { id: "projects", numeral: "III", label: "Projects" },
  { id: "toolkit", numeral: "IV", label: "Toolkit" },
  { id: "education", numeral: "V", label: "Education" },
  { id: "contact", numeral: "VI", label: "Contact" },
];

export const person = {
  name: "Arpit Ray",
  role: "Software Engineer",
  edition: "Edition ’26",
  pitch: "I build web apps, browser extensions and the APIs behind them.",
  email: "rayarpit72@gmail.com",
  links: {
    github: "https://github.com/Arpitray",
    linkedin: "https://linkedin.com/in/arpit-arjun-ray",
    site: "https://arpitray.me",
  },
};

/** The About chapter: who you are, in plain words. Numbers about the work live in NovaFocus. */
export const about = {
  intro: "I’m Arpit, a software engineer in Bangalore.",
  // The line over the About page.
  heading: "What I work on.",
  paragraphs: [
    "I’m a software engineer working across the stack: frontends, backend APIs and the cloud services they run on. I also enjoy the data side of the work, such as product analytics and small machine-learning features.",
    "Since May 2026 I’ve been a Software Engineer at NovaFocus, working on BlockP, an app that helps people block distracting and adult content. I built its website and work on its Chrome extension, which has more than 20,000 users, along with the backend APIs they use.",
    "Alongside work, I’m finishing a Bachelor of Computer Applications at Jain University.",
  ],
  facts: [
    ["Based in", "Bangalore, India"],
    ["Now", "Software Engineer at NovaFocus (BlockP)"],
    ["Studying", "BCA, Jain University · 2024–27"],
    ["Looking for", "Software engineering roles"],
  ],
};

export type Subsection = {
  tagline: string;          // italic serif line, first letter gets the swash initial
  label: string;            // small bold label
  body: string;
  visual: "site" | "extension" | "cloud" | "meter" | "bars" | "funnel" | "scan" | "cards";
};

export const novafocus = {
  title: "NovaFocus",
  tagline: "Software Engineer, BlockP. May 2026 – present.",
  // The feast, everyone on their phones but the bride. It arrives blurred, the way the
  // extension hides an image until its on-device model has checked it.
  art: painting("peasant-wedding", "Pieter Bruegel the Elder, The Peasant Wedding (1567), with phones added"),
  blurNote: "Blurred, the way BlockP hides an image until its on-device NudeNet model has checked it.",
  subsections: [
    {
      tagline: "The BlockP website",
      label: "Next.js · Sanity CMS",
      body: "Built the BlockP website with Next.js and a customised Sanity CMS, including custom schemas, feature pages translated into several languages, and caching that refreshes when content is published. The site gets around 70,000 search impressions a day.",
      visual: "site",
    },
    {
      tagline: "The Chrome extension",
      label: "BlockP for Chrome",
      body: "Work on the BlockP Chrome extension, which has more than 20,000 users. Its features include site blockers, time-delay unlocks, accountability partners, a usage dashboard and premium plans.",
      visual: "extension",
    },
    {
      tagline: "Backend APIs",
      label: "Firebase Cloud Functions · Firestore",
      body: "Built the APIs behind several extension features: time-delay unlock codes, partner approvals by email, and a recovery key that locks after too many wrong attempts. Tested with the Firebase emulator.",
      visual: "cards",
    },
    {
      tagline: "Classify",
      label: "Cloudflare Workers · D1",
      body: "Built an internal service that sorts websites into categories, replacing a paid tool we used and saving the company hundreds of dollars. It combines rules, page data and an LLM, and one lookup API serves the extension and the Windows, macOS and Android apps.",
      visual: "cloud",
    },
    {
      tagline: "On-device image filtering",
      label: "NudeNet · ONNX Runtime",
      body: "Integrated the NudeNet model into the extension, so explicit images are detected and blurred on the user’s device. Sites in safe categories, such as chat and email, are skipped.",
      visual: "scan",
    },
    {
      tagline: "Product analytics",
      label: "PostHog",
      body: "Set up event tracking for the onboarding, login and subscription funnels and helped run paywall A/B tests, without sending browsing data to analytics.",
      visual: "funnel",
    },
  ] satisfies Subsection[],
  alsoShipped: [
    ["Cloud cost fix", "Found most of the Cloudflare bill came from storage writes and changed the caching."],
    ["Firefox port plan", "Manifest, APIs and store-review plan checked against Mozilla’s docs."],
    ["Translations", "Extension interface available in 12 languages."],
    ["Usage dashboard", "Screen time, block events and history, charted for users."],
    ["Email delivery", "Transactional emails for unlock codes and partner requests."],
    ["Page-level checks", "Checks single pages on video sites; only hashed URLs are stored."],
  ],
};

export const projects = {
  title: "Projects",
  tagline: "Personal projects.",
  art: art.astronomer,
  featured: [
    {
      tagline: "Scams, intercepted",
      label: "AI Scam Detection & Intelligence System",
      body: "Backend service with an LLM classifier that scores messages for scam probability across 8+ scam types, falls back to pattern rules when the model is unavailable, and extracts phone numbers, links and payment IDs.",
      link: "https://github.com/Arpitray/ai-scam-backend",
    },
    {
      tagline: "Jewellery photos, styled by AI",
      label: "AI Jewellery Image Pipeline",
      body: "FastAPI service that takes a jewellery product photo, removes the background and generates several styled versions with AI image models. A background worker runs the jobs, results go to Supabase Storage and Postgres, and a Next.js frontend handles uploads. Packaged with Docker.",
      link: "https://github.com/Arpitray/ai-pipeline",
    },
    {
      tagline: "Research, automated",
      label: "AI Research Agent",
      body: "Multi-agent pipeline on FastAPI, LangChain and Mistral that searches, scrapes, writes a structured report and has a critic agent score it.",
      link: "https://github.com/Arpitray/multiagents",
    },
    {
      tagline: "Conversations, in real time",
      label: "Realchat",
      body: "Real-time chat app with encrypted messages and a shared whiteboard that everyone in the room draws on at once.",
      link: "https://github.com/Arpitray/Realchat",
    },
  ],
  alsoBuilt: [
    ["Summore", "E-commerce app on React, Supabase and GSAP."],
    ["CampusTrack", "Campus tracking app built on Next.js."],
    ["EcoTrace", "Plant identification with the PlantNet API."],
    ["3DAR", "3D and AR experiments on the web."],
    ["Exploratory data analysis", "Cleaning, statistics and charts in Pandas, Matplotlib and Seaborn."],
  ],
};

export const toolkit = [
  "/typescript", "/react", "/next.js", "/node", "/sanity", "/chrome-extensions", "/firebase",
  "/cloudflare-workers", "/d1", "/postgresql", "/fastapi", "/python", "/onnx", "/llms", "/langchain",
  "/sql", "/pandas", "/posthog", "/a-b-testing", "/scikit-learn", "/gsap", "/three.js",
];

export const education = {
  school: "Jain University",
  degree: "Bachelor of Computer Applications",
  years: "2024 – 2027",
  detail: "CGPA 7.90 · DBMS, Data Structures & Algorithms, Python, Java, Computer Networks",
};
