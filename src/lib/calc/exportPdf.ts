// ============================================================================
//  PDF export — same smart pagination as the original: before placing each
//  report section, check if it fits in the space remaining on the current
//  page. If not, and it fits a full page, start a fresh page. If it's too
//  tall even for a full page, scale it down as a whole rather than cutting
//  it (this only ever happens with something marked data-no-split, i.e. the
//  Grand Summary box).
//
//  Simplification vs. the original: an oversized SHEET SECTION (a table with
//  far more rows than fit one page) would there be split row-by-row across
//  pages. That row-level splitter isn't ported here yet — with normal-sized
//  projects a category table fitting one A4 page is the overwhelmingly
//  common case, and this covers it correctly; a very long table will simply
//  get scaled down to fit one page instead of spanning several.
// ============================================================================

//  ---- Why the PDF comes out light even when the screen is dark ----
//  html2canvas does not read our CSS and decide colours; it rasterises what
//  is actually rendered. So a dark report on screen would export as a dark
//  PDF, which is useless on paper and burns toner.
//
//  It does, however, clone the document into a hidden iframe and rasterise
//  the CLONE. `onclone` hands us that clone before it is drawn, so pinning
//  data-theme="light" there gives the capture a light report while the real
//  page on screen is never touched — no flicker, no restore step, and no
//  chance of leaving the UI stuck in the wrong theme if the export throws.
/** A4 content width in CSS pixels — the width the report is LAID OUT at for
 *  the PDF, regardless of how wide it happens to be on screen.
 *
 *  The report used to be clamped to this on screen too, which is why the
 *  material tables looked cramped in the preview. It is imposed here instead,
 *  on the clone html2canvas rasterises, so the two can differ: full width to
 *  read, A4 to print. */
const PDF_CONTENT_PX = 860;

const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const MARGIN_MM = 12;
const CONTENT_WIDTH_MM = PAGE_WIDTH_MM - MARGIN_MM * 2;
const MAX_CONTENT_HEIGHT_MM = PAGE_HEIGHT_MM - MARGIN_MM * 2;
const SECTION_GAP_MM = 4;

/** Thrown when there is nothing to rasterise. The caller owns the user-facing
 *  message, because only it has the locale — this module has no UI. */
export class NothingToExportError extends Error {}

export async function exportReportToPdf(reportEl: HTMLElement, fileName: string): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const { default: html2canvas } = await import('html2canvas');

  const sections = Array.from(reportEl.querySelectorAll<HTMLElement>('[data-report-page="true"]'));
  if (sections.length === 0) {
    throw new NothingToExportError('no sections to export');
  }

  const pdf = new jsPDF('p', 'mm', 'a4');
  let currentY = MARGIN_MM;

  for (const section of sections) {
    const noSplit = section.getAttribute('data-no-split') === 'true';

    const canvas = await html2canvas(section, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: PDF_CONTENT_PX,
      onclone: (clonedDoc) => {
        // Pin the cloned report to A4 content width. windowWidth alone sizes
        // the offscreen viewport, but the report's own ancestors can still be
        // wider than that; setting the width on the report root itself makes
        // the captured layout deterministic and independent of the browser
        // window the export happens to be run from.
        clonedDoc.querySelectorAll<HTMLElement>('.report-root').forEach((el) => {
          el.style.width = `${PDF_CONTENT_PX}px`;
          el.style.maxWidth = `${PDF_CONTENT_PX}px`;
        });
        // Force the light palette on the copy that gets rasterised. Both the
        // attribute and the report's own opt-out are set: the attribute
        // covers the app tokens, and data-report-theme="light" covers the
        // report's local palette in FullReport.svelte, which may have been
        // pinned dark independently of the app theme.
        clonedDoc.documentElement.setAttribute('data-theme', 'light');
        clonedDoc.querySelectorAll<HTMLElement>('[data-report-theme]').forEach((el) => {
          el.setAttribute('data-report-theme', 'light');
        });
      },
    });

    const pxPerMm = canvas.width / CONTENT_WIDTH_MM;
    const sectionH_MM = canvas.height / pxPerMm;
    const spaceLeft = PAGE_HEIGHT_MM - MARGIN_MM - currentY;
    const imgData = canvas.toDataURL('image/png', 1.0);

    if (sectionH_MM <= spaceLeft) {
      pdf.addImage(imgData, 'PNG', MARGIN_MM, currentY, CONTENT_WIDTH_MM, sectionH_MM);
      currentY += sectionH_MM + SECTION_GAP_MM;
    } else if (sectionH_MM <= MAX_CONTENT_HEIGHT_MM) {
      pdf.addPage();
      currentY = MARGIN_MM;
      pdf.addImage(imgData, 'PNG', MARGIN_MM, currentY, CONTENT_WIDTH_MM, sectionH_MM);
      currentY += sectionH_MM + SECTION_GAP_MM;
    } else {
      // Too tall for any single page — scale the whole block down rather
      // than splitting it (matches the original's handling of an oversized
      // data-no-split block).
      pdf.addPage();
      currentY = MARGIN_MM;
      const scale = MAX_CONTENT_HEIGHT_MM / sectionH_MM;
      const scaledW = CONTENT_WIDTH_MM * scale;
      const xOffset = MARGIN_MM + (CONTENT_WIDTH_MM - scaledW) / 2;
      pdf.addImage(imgData, 'PNG', xOffset, currentY, scaledW, MAX_CONTENT_HEIGHT_MM);
      currentY += MAX_CONTENT_HEIGHT_MM + SECTION_GAP_MM;
      void noSplit; // acknowledged — see note above about the row-level splitter
    }
  }

  pdf.save(fileName);
}
