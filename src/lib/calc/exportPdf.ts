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

const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const MARGIN_MM = 12;
const CONTENT_WIDTH_MM = PAGE_WIDTH_MM - MARGIN_MM * 2;
const MAX_CONTENT_HEIGHT_MM = PAGE_HEIGHT_MM - MARGIN_MM * 2;
const SECTION_GAP_MM = 4;

export async function exportReportToPdf(reportEl: HTMLElement, fileName: string): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const { default: html2canvas } = await import('html2canvas');

  const sections = Array.from(reportEl.querySelectorAll<HTMLElement>('[data-report-page="true"]'));
  if (sections.length === 0) {
    alert('No data to export.');
    return;
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
      windowWidth: 860,
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
