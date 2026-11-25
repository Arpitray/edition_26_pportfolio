/*
 * A historical chart laid faintly behind a paper section: faded well back into the paper so
 * the content stays in front, and dissolving into plain paper at the top and bottom so the
 * section joins the ones around it. The parent must be `relative`; put its content above it
 * (also `relative`). Used behind the plate grids and the About text.
 */
export default function ChartBackdrop({ src }: { src: string }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" loading="lazy" draggable={false}
        className="h-full w-full select-none object-cover opacity-[0.3] mix-blend-multiply simple:opacity-[0.16] [filter:sepia(0.35)_saturate(0.75)_contrast(0.9)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,var(--color-paper)_0%,transparent_22%,transparent_78%,var(--color-paper)_100%)]" />
    </div>
  );
}
