// Closed until authenticated owned storage and delivery are independently verified.
// Existing saved URLs are rendered unchanged; this service never contacts Cloudinary.
export const uploadsEnabled = false;
export async function uploadScreenshot(_file: File): Promise<string> {
  throw new Error('New uploads are disabled pending verified, authenticated owned media storage. Existing image links are preserved.');
}
