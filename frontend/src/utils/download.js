/**
 * Converts a base64 Data URI into a binary Blob and triggers a local file download.
 * @param {string} base64Data - Base64 Data URI or raw base64 string.
 * @param {string} fileName - Target download filename.
 */
export function downloadBase64File(base64Data, fileName = "document.pdf") {
  try {
    if (!base64Data) return;

    // Separate content type and data block
    const parts = base64Data.split(";base64,");
    const contentType = parts[0].includes(":") ? parts[0].split(":")[1] : "application/pdf";
    const rawData = parts[1] || parts[0];

    const byteCharacters = atob(rawData);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    const blob = new Blob(byteArrays, { type: contentType });
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error("Failed to download file:", error);
  }
}
