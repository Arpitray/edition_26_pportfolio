import Hero from "@/components/Hero";
import ChapterIndex from "@/components/ChapterIndex";
import { ChapterOpener, Subsection, FeatureList, Tagline, Reveal } from "@/components/Chapter";
import { WordCloud, ScoreMeter, CostBars, Funnel, ScanReveal, GlowCards, StatPanel } from "@/components/Visuals";
import { person, about, novafocus, projects, toolkit, education, art } from "@/content/site";
import { aboutScene } from "@/content/aboutScene";

// Category names from the classify taxonomy, floating in the "Domains, classified" beat.
const CATEGORIES = [
  "Social Networks", "Video Streaming", "Online Shopping", "Casino & Betting", "News", "Banking",
  "Forums & Communities", "AI Tools", "Education", "Cloud & Hosting", "Phishing", "Dating",
  "Music & Audio", "Search Engines", "Marketplaces", "Cryptocurrency", "Travel", "Sports",
];

const visualFor = {
  site: <StatPanel stats={[{ value: 70, suffix: "K", label: "search impressions a day" }]} note="Next.js · Sanity CMS" />,
  extension: <StatPanel stats={[{ value: 20, suffix: "K+", label: "users" }]} note="Chrome Web Store" />,
  cloud: <WordCloud words={CATEGORIES} />,
  meter: <ScoreMeter />,
  bars: <CostBars />,
  funnel: <Funnel />,
  scan: <ScanReveal src={art.pearlEarring.color} />,
  cards: <GlowCards />,
};

export default function Home() {
  return (
    <main>
      <ChapterIndex />
      <Hero />

      {/* I · About: its painting tears in under the hero, then the page. */}
      <section id="about">
        <ChapterOpener title="About" tagline={about.intro} scene={aboutScene} from="image" seed={29} />
        <div className="bg-paper px-6 py-[14vh] lg:pl-[16rem] md:pr-12">
          <div className="grid gap-12 md:grid-cols-12">
            <Reveal className="md:col-span-7">
              <h3 className="text-[clamp(34px,4vw,60px)] leading-[1.02] text-ink"><Tagline text={about.heading} /></h3>
              <div className="mt-10">
                {about.paragraphs.map((text) => (
                  <p key={text.slice(0, 24)} className="mb-5 max-w-2xl font-serif text-[clamp(18px,1.4vw,22px)] leading-[1.4] text-ink/90">{text}</p>
                ))}
              </div>
            </Reveal>
            <Reveal className="md:col-span-5 md:pt-4">
              <dl className="border-t border-ink/15">
                {about.facts.map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[110px_1fr] gap-4 border-b border-ink/15 py-4">
                    <dt className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/50">{label}</dt>
                    <dd className="font-display text-[14px] font-semibold text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-8 flex flex-wrap gap-3 font-display text-[13px]">
                <a href="/Arpit_Ray_Resume.pdf" className="rounded-full bg-magenta px-4 py-2 text-white hover:bg-ink">Résumé ↗</a>
                <a href={person.links.github} target="_blank" rel="noreferrer" className="rounded-full border border-ink/20 px-4 py-2 text-ink hover:bg-ink hover:text-paper">GitHub ↗</a>
                <a href={person.links.linkedin} target="_blank" rel="noreferrer" className="rounded-full border border-ink/20 px-4 py-2 text-ink hover:bg-ink hover:text-paper">LinkedIn ↗</a>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* II · NovaFocus */}
      <section id="novafocus">
        <ChapterOpener title={novafocus.title} tagline={novafocus.tagline} art={novafocus.art} drawn={false} blurNote={novafocus.blurNote} seed={13} />
        <div className="bg-paper px-6 lg:pl-[16rem] md:pr-12">
          {novafocus.subsections.map((s) => (
            <Subsection key={s.tagline} {...s} visual={visualFor[s.visual]} />
          ))}
          <FeatureList heading="Also shipped" items={novafocus.alsoShipped} />
        </div>
      </section>

      {/* III · Projects */}
      <section id="projects">
        <ChapterOpener title={projects.title} tagline={projects.tagline} art={projects.art} seed={41} />
        <div className="bg-paper px-6 lg:pl-[16rem] md:pr-12">
          {projects.featured.map((p) => (
            <Subsection key={p.label} {...p} />
          ))}
          <FeatureList heading="Also built" items={projects.alsoBuilt} />
        </div>
      </section>

      {/* IV · Toolkit */}
      <section id="toolkit" className="bg-paper px-6 py-[12vh] lg:pl-[16rem] md:pr-12">
        <h2 className="font-display text-[clamp(56px,10vw,160px)] font-bold leading-[0.85] tracking-[-0.04em] text-ink">Toolkit</h2>
        <WordCloud words={toolkit} tall />
      </section>

      {/* V · Education */}
      <section id="education" className="bg-paper px-6 pb-[14vh] lg:pl-[16rem] md:pr-12">
        <Reveal className="border-t border-ink/15 pt-16">
          <h3 className="text-[clamp(34px,4vw,60px)] leading-none text-ink"><Tagline text="Education" /></h3>
          <p className="mt-8 font-display text-[14px] font-semibold text-ink">{education.school} · {education.degree} · {education.years}</p>
          <p className="mt-2 font-serif text-[20px] text-ink/90">{education.detail}</p>
        </Reveal>
      </section>

      {/* VI · Contact */}
      <section id="contact">
        <ChapterOpener title="Contact" tagline="Let’s build something worth measuring." art={art.pearlEarring} seed={67} />
        <div className="bg-paper px-6 py-[12vh] lg:pl-[16rem] md:pr-12">
          <a href={`mailto:${person.email}`} className="font-display text-[clamp(28px,4vw,64px)] font-bold tracking-[-0.03em] text-ink underline decoration-magenta decoration-4 underline-offset-8">
            {person.email}
          </a>
          <div className="mt-10 flex flex-wrap gap-3 font-display text-[13px]">
            {Object.entries(person.links).map(([name, href]) => (
              <a key={name} href={href} target="_blank" rel="noreferrer" className="rounded-full border border-ink/20 px-4 py-2 capitalize text-ink hover:bg-ink hover:text-paper">{name} ↗</a>
            ))}
            <a href="/Arpit_Ray_Resume.pdf" className="rounded-full bg-magenta px-4 py-2 text-white">Download résumé</a>
          </div>
          <p className="mt-24 font-display text-[11px] text-ink/50">Paintings: Johannes Vermeer, public domain (via Wikimedia Commons).</p>
        </div>
      </section>
    </main>
  );
}
