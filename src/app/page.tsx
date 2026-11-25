import Hero from "@/components/Hero";
import ChapterIndex from "@/components/ChapterIndex";
import AtlasPlate from "@/components/AtlasPlate";
import AtlasIntro from "@/components/AtlasIntro";
import ChartBackdrop from "@/components/ChartBackdrop";
import LogoCloud from "@/components/LogoCloud";
import { ChapterOpener, Subsection, FeatureList, Tagline, Reveal } from "@/components/Chapter";
import { person, about, novafocus, projects, toolkit, education, art } from "@/content/site";

export default function Home() {
  return (
    <main>
      <ChapterIndex />
      <Hero />

      {/* I · About: its painting tears in under the hero, then the page. */}
      <section id="about">
        {/* Rembrandt, Aristotle with a Bust of Homer (1653): a thinker in golden light. */}
        <ChapterOpener title="About" tagline={about.intro} art={art.aristotle} from="image" seed={29} />
        <div className="relative bg-paper px-6 py-[14vh] lg:pl-[16rem] md:pr-12">
          {/* Cellarius, the Copernican system (1660), faded behind the text. */}
          <ChartBackdrop src="/art/backgrounds/cellarius-copernicus.jpg" />
          <div className="relative grid gap-12 md:grid-cols-12">
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
        <ChapterOpener title={novafocus.title} tagline={novafocus.tagline} art={novafocus.art} scene={novafocus.scene} blurNote={novafocus.blurNote} seed={13} />
        {/* Six plates from Hevelius' star atlas, three by two; each travels down to its write-up. */}
        <AtlasIntro tagline="Six things I built at BlockP." plates={novafocus.subsections.map((s) => s.sky)} cols={3}
          backdrop={{ src: "/art/backgrounds/cellarius-boreale.jpg", alt: "" }} />
        <div className="bg-paper px-6 lg:pl-[16rem] md:pr-12">
          {novafocus.subsections.map((s) => (
            <Subsection key={s.tagline} tagline={s.tagline} label={s.label} body={s.body} visual={<AtlasPlate sky={s.sky} />} />
          ))}
          <FeatureList heading="Also shipped" items={novafocus.alsoShipped} />
        </div>
      </section>

      {/* III · Projects */}
      <section id="projects">
        {/* No painting here: the four star-atlas plates, two by two, travel down to their projects. */}
        <AtlasIntro title={projects.title} tagline={projects.tagline} plates={projects.featured.map((p) => p.sky)}
          backdrop={{ src: "/art/backgrounds/cellarius-scenographia.jpg", alt: "" }} />
        <div className="bg-paper px-6 lg:pl-[16rem] md:pr-12">
          {/* Alternating: text then plate, plate then text. */}
          {projects.featured.map((p, i) => (
            <Subsection key={p.label} tagline={p.tagline} label={p.label} body={p.body} link={p.link} visual={<AtlasPlate sky={p.sky} />} flip={i % 2 === 1} />
          ))}
          <FeatureList heading="Also built" items={projects.alsoBuilt} />
        </div>
      </section>

      {/* IV · Toolkit */}
      <section id="toolkit" className="relative bg-paper px-6 py-[12vh] lg:pl-[16rem] md:pr-12">
        {/* Cellarius, the Copernican planisphere (1660), faded behind the logos. */}
        <ChartBackdrop src="/art/backgrounds/cellarius-planisphaerium.jpg" />
        <div className="relative">
          <h2 className="font-display text-[clamp(56px,10vw,160px)] font-bold leading-[0.85] tracking-[-0.04em] text-ink">Toolkit</h2>
          <LogoCloud items={toolkit.items} also={toolkit.also} />
        </div>
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
        {/* Velázquez, Juan de Pareja (1650): looking straight at you. */}
        <ChapterOpener title="Contact" tagline="Let’s build something worth measuring." art={art.pareja} seed={67} />
        <div className="relative bg-paper px-6 py-[12vh] lg:pl-[16rem] md:pr-12">
          {/* Cellarius, the southern sky with ships and astronomers (1660), faded behind. */}
          <ChartBackdrop src="/art/backgrounds/cellarius-australe.jpg" />
          <div className="relative">
          <a href={`mailto:${person.email}`} className="font-display text-[clamp(28px,4vw,64px)] font-bold tracking-[-0.03em] text-ink underline decoration-magenta decoration-4 underline-offset-8">
            {person.email}
          </a>
          <div className="mt-10 flex flex-wrap gap-3 font-display text-[13px]">
            {Object.entries(person.links).map(([name, href]) => (
              <a key={name} href={href} target="_blank" rel="noreferrer" className="rounded-full border border-ink/20 px-4 py-2 capitalize text-ink hover:bg-ink hover:text-paper">{name} ↗</a>
            ))}
            <a href="/Arpit_Ray_Resume.pdf" className="rounded-full bg-magenta px-4 py-2 text-white">Download résumé</a>
          </div>
          <p className="mt-24 font-display text-[11px] text-ink/50">Paintings: Rembrandt and Diego Velázquez (The Metropolitan Museum of Art), Pieter Bruegel the Elder and Johannes Vermeer, public domain. Star charts: Andreas Cellarius, Harmonia Macrocosmica (1660), and Johannes Hevelius, Firmamentum Sobiescianum (1690). The four project plates were made for this site in the style of Hevelius.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
