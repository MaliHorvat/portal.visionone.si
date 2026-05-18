/** Izvoz DOM elementa platna sheme v PNG (html2canvas). */
export async function exportSchemaCanvasPng(root: HTMLElement, filename: string): Promise<void> {
  const { default: html2canvas } = await import("html2canvas");
  const canvas = await html2canvas(root, {
    backgroundColor: "#0b1220",
    scale: Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 1.5 : 1.5),
    useCORS: true,
    logging: false,
    allowTaint: true,
  });
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".png") ? filename : `${filename}.png`;
  a.click();
}
