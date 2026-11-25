// Every word on the site lives here, so the copy can change without touching a component.
import type { Sky, SkyProject } from "@/components/AtlasPlate";
import type { ToolIcon } from "@/content/toolIcons";
import type { LayeredScene } from "@/components/LayerScene";

/** A painting and its depth map (made by tools/make-depth.mjs). */
/** `focus`: the point kept in view when the painting is cropped to the screen (like CSS
 *  object-position, 0..1 from its left and top); the centre if not given. */
export type Art = { color: string; depth: string; alt: string; focus?: [number, number] };

const painting = (name: string, alt: string, focus?: [number, number]): Art => ({
  color: `/art/web/${name}.jpg`,
  depth: `/art/web/${name}-depth.png`,
  alt,
  focus,
});

// Public domain: Johannes Vermeer (Wikimedia Commons); Rembrandt and Velázquez (The Metropolitan
// Museum of Art, Open Access).
export const art = {
  // On a wide screen keep his face and his hand on Homer's bust.
  aristotle: painting("rembrandt-aristotle", "Rembrandt, Aristotle with a Bust of Homer (1653)", [0.45, 0.3]),
  // On a wide screen keep his face in the upper half, above the chapter title.
  pareja: painting("velazquez-pareja", "Diego Velázquez, Juan de Pareja (1650)", [0.55, 0.34]),
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
  sky: Sky;                 // its star-atlas plate (components/AtlasPlate)
};

export const novafocus = {
  title: "NovaFocus",
  tagline: "Software Engineer, BlockP. May 2026 – present.",
  // The feast, everyone on their phones but the bride. It arrives blurred, the way the
  // extension hides an image until its on-device model has checked it.
  art: painting("peasant-wedding", "Pieter Bruegel the Elder, The Peasant Wedding (1567), with phones added"),
  // The same painting in layers: guests cut out of it (tools/cut-people.mjs), each over its
  // own spot, moving out of the painting as the chapter scrolls. Their places
  // come from public/art/scenes/feast/layers.json.
  scene: {
    background: "/art/scenes/feast/bg.webp",
    layers: [
      // The child on the floor, eyes on her phone: lifts and drifts toward you.
      { src: "/art/scenes/feast/child.webp", anchor: "background", x: 0.3506, y: 0.8733, h: 0.2534, z: 0.06,
        detach: { x: 0.05, y: 0.1, z: 0.3, rot: -0.04, at: 0 } },
      // The bagpiper: comes straight toward you out of the painting. Coming closer also pushes
      // him outward on screen; the small shift right holds him over his own spot, so the gap
      // he leaves in the painting stays hidden behind him.
      { src: "/art/scenes/feast/piper.webp", anchor: "background", x: 0.2469, y: 0.4501, h: 0.6008, z: 0.1,
        detach: { x: 0.08, y: 0.01, z: 0.34, rot: 0, at: 0.1 } },
      // The two men carrying the tray of phones and the laptop: they walk on to the right,
      // the way they are already heading, at the same depth (no coming forward).
      { src: "/art/scenes/feast/carriers.webp", anchor: "background", x: 0.6826, y: 0.6358, h: 0.6267, z: 0.08,
        detach: { x: 0.16, y: 0, z: 0, rot: 0, at: 0.05 } },
    ],
  } satisfies LayeredScene,
  blurNote: "Blurred, the way BlockP hides an image until its on-device NudeNet model has checked it.",
  subsections: [
    {
      tagline: "The BlockP website",
      label: "Next.js · Sanity CMS",
      body: "Built the BlockP website with Next.js and a customised Sanity CMS, including custom schemas, feature pages translated into several languages, and caching that refreshes when content is published. The site gets around 70,000 search impressions a day.",
      sky: "pegasus",
    },
    {
      tagline: "The Chrome extension",
      label: "BlockP for Chrome",
      body: "Work on the BlockP Chrome extension, which has more than 20,000 users. Its features include site blockers, time-delay unlocks, accountability partners, a usage dashboard and premium plans.",
      sky: "canismajor",
    },
    {
      tagline: "Backend APIs",
      label: "Firebase Cloud Functions · Firestore",
      body: "Built the APIs behind several extension features: time-delay unlock codes, partner approvals by email, and a recovery key that locks after too many wrong attempts. Tested with the Firebase emulator.",
      sky: "draco",
    },
    {
      tagline: "Classify",
      label: "Cloudflare Workers · D1",
      body: "Built an internal service that sorts websites into categories, replacing a paid tool we used and saving the company hundreds of dollars. It combines rules, page data and an LLM, and one lookup API serves the extension and the Windows, macOS and Android apps.",
      sky: "libra",
    },
    {
      tagline: "On-device image filtering",
      label: "NudeNet · ONNX Runtime",
      body: "Integrated the NudeNet model into the extension, so explicit images are detected and blurred on the user’s device. Sites in safe categories, such as chat and email, are skipped.",
      sky: "perseus",
    },
    {
      tagline: "Product analytics",
      label: "PostHog",
      body: "Set up event tracking for the onboarding, login and subscription funnels and helped run paywall A/B tests, without sending browsing data to analytics.",
      sky: "sextans",
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
  // Each is illustrated by a star-atlas plate in the style of Hevelius (1690), its figure in
  // colour (components/AtlasPlate): `sky` is the plate.
  featured: [
    {
      tagline: "Scams, intercepted",
      label: "AI Scam Detection & Intelligence System",
      body: "Backend service with an LLM classifier that scores messages for scam probability across 8+ scam types, falls back to pattern rules when the model is unavailable, and extracts phone numbers, links and payment IDs.",
      link: "https://github.com/Arpitray/ai-scam-backend",
      sky: "scutum",
    },
    {
      tagline: "Jewellery photos, styled by AI",
      label: "AI Jewellery Image Pipeline",
      body: "FastAPI service that takes a jewellery product photo, removes the background and generates several styled versions with AI image models. A background worker runs the jobs, results go to Supabase Storage and Postgres, and a Next.js frontend handles uploads. Packaged with Docker.",
      link: "https://github.com/Arpitray/ai-pipeline",
      sky: "gemma",
    },
    {
      tagline: "Research, automated",
      label: "AI Research Agent",
      body: "Multi-agent pipeline on FastAPI, LangChain and Mistral that searches, scrapes, writes a structured report and has a critic agent score it.",
      link: "https://github.com/Arpitray/multiagents",
      sky: "noctua",
    },
    {
      tagline: "Conversations, in real time",
      label: "Realchat",
      body: "Real-time chat app with encrypted messages and a shared whiteboard that everyone in the room draws on at once.",
      link: "https://github.com/Arpitray/Realchat",
      sky: "columbae",
    },
  ] satisfies SkyProject[],
  alsoBuilt: [
    ["Summore", "E-commerce app on React, Supabase and GSAP."],
    ["CampusTrack", "Campus tracking app built on Next.js."],
    ["EcoTrace", "Plant identification with the PlantNet API."],
    ["3DAR", "3D and AR experiments on the web."],
    ["Exploratory data analysis", "Cleaning, statistics and charts in Pandas, Matplotlib and Seaborn."],
  ],
};

// Each with its logo (src/content/toolIcons.ts); the skills with no logo of their own are
// listed after the grid.
export const toolkit = {
  items: [
    { name: "TypeScript", icon: "typescript" }, { name: "React", icon: "react" },
    { name: "Next.js", icon: "nextdotjs" }, { name: "Node.js", icon: "nodedotjs" },
    { name: "Python", icon: "python" }, { name: "FastAPI", icon: "fastapi" },
    { name: "PostgreSQL", icon: "postgresql" }, { name: "Supabase", icon: "supabase" },
    { name: "Firebase", icon: "firebase" }, { name: "Cloudflare Workers", icon: "cloudflareworkers" },
    { name: "Cloudflare D1", icon: "cloudflare" }, { name: "Sanity", icon: "sanity" },
    { name: "Chrome Extensions", icon: "googlechrome" }, { name: "ONNX", icon: "onnx" },
    { name: "LangChain", icon: "langchain" }, { name: "Pandas", icon: "pandas" },
    { name: "scikit-learn", icon: "scikitlearn" }, { name: "PostHog", icon: "posthog" },
    { name: "GSAP", icon: "greensock" }, { name: "Three.js", icon: "threedotjs" },
    { name: "Tailwind CSS", icon: "tailwindcss" }, { name: "Docker", icon: "docker" },
    { name: "Git", icon: "git" }, { name: "GitHub", icon: "github" },
  ] satisfies { name: string; icon: ToolIcon }[],
  also: ["SQL", "LLMs", "A/B testing"],
};

export const education = {
  school: "Jain University",
  degree: "Bachelor of Computer Applications",
  years: "2024 – 2027",
  detail: "CGPA 7.90 · DBMS, Data Structures & Algorithms, Python, Java, Computer Networks",
};
