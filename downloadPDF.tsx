import jsPDF from "jspdf";
import html2canvas from "html2canvas";
 
export async function downloadResumePDF(
  elementId: string,
  filename: string = "resume"
): Promise<void> {
  const element = document.getElementById(elementId);
 
  if (!element) {
    console.error(`Element #${elementId} not found`);
    alert("Resume element not found. Please try again.");
    return;
  }
 
  try {
    // Show loading state — call this from your component
    console.log("📄 Generating PDF...");
 
    // Capture the element as a canvas
    const canvas = await html2canvas(element, {
      scale: 2,               // high resolution
      useCORS: true,          // allow external fonts/images
      letterRendering: true,
      backgroundColor: "#ffffff",
      logging: false,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });
 
    const imgData = canvas.toDataURL("image/jpeg", 0.98);
 
    // A4 dimensions in mm
    const PDF_WIDTH  = 210;
    const PDF_HEIGHT = 297;
    const MARGIN     = 10;
 
    const usableWidth  = PDF_WIDTH  - MARGIN * 2;
    const usableHeight = PDF_HEIGHT - MARGIN * 2;
 
    // Calculate how many pages we need
    const imgWidth  = usableWidth;
    const imgHeight = (canvas.height * usableWidth) / canvas.width;
 
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
 
    let heightLeft = imgHeight;
    let position   = MARGIN;
    let pageNumber = 0;
 
    // First page
    pdf.addImage(imgData, "JPEG", MARGIN, position, imgWidth, imgHeight);
    heightLeft -= usableHeight;
 
    // Additional pages if resume is long
    while (heightLeft > 0) {
      position = heightLeft - imgHeight + MARGIN;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", MARGIN, position, imgWidth, imgHeight);
      heightLeft -= usableHeight;
      pageNumber++;
    }
 
    // Save with candidate name in filename
    const safeName = filename
      .replace(/[^a-z0-9\s-]/gi, "")
      .replace(/\s+/g, "-")
      .toLowerCase();
 
    pdf.save(`${safeName || "resume"}-voicecv.pdf`);
    console.log("✅ PDF downloaded");
 
  } catch (err: any) {
    console.error("PDF generation error:", err);
    alert("PDF generation failed. Please try again.");
  }
}