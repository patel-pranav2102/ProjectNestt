/**
 * Ensures a filename ends with the appropriate file extension.
 * If fileType is 'pdf' or contains 'pdf', guarantees '.pdf' extension.
 */
export const ensureFileExtension = (name = '', fileType = '', mimeType = '', url = '') => {
  let cleanName = (name || 'document').trim();
  const lowerName = cleanName.toLowerCase();
  const lowerUrl = (url || '').toLowerCase();
  const lowerMime = (mimeType || '').toLowerCase();

  const isPdf = fileType === 'pdf' || 
                lowerName.endsWith('.pdf') || 
                lowerUrl.includes('.pdf') || 
                lowerMime.includes('pdf');

  if (isPdf && !lowerName.endsWith('.pdf')) {
    cleanName += '.pdf';
  } else if ((fileType === 'spreadsheet' || lowerMime.includes('excel') || lowerMime.includes('spreadsheet')) && !/\.(xlsx|xls|csv)$/i.test(cleanName)) {
    cleanName += '.xlsx';
  } else if ((fileType === 'presentation' || lowerMime.includes('presentation') || lowerMime.includes('powerpoint')) && !/\.(pptx|ppt)$/i.test(cleanName)) {
    cleanName += '.pptx';
  } else if ((fileType === 'image' || lowerMime.startsWith('image/')) && !/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(cleanName)) {
    cleanName += '.png';
  }

  return cleanName;
};

/**
 * Downloads a file ensuring the browser saves it in PDF (or original) format with the correct .pdf extension.
 * 
 * @param {string} fileUrl - The URL of the file to download
 * @param {string} fileName - The desired filename
 * @param {string} fileType - Optional fileType hint (e.g. 'pdf')
 */
export const downloadFileWithOriginalName = async (fileUrl, fileName, fileType = '') => {
  if (!fileUrl) return;

  // Clean URL of any invalid transformation flags
  let cleanUrl = fileUrl
    .replace('/raw/upload/fl_inline/', '/raw/upload/')
    .replace('/image/upload/fl_inline/', '/image/upload/');

  try {
    const response = await fetch(cleanUrl);
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    const originalBlob = await response.blob();
    
    // Ensure final name has correct extension (.pdf for PDFs)
    const finalFileName = ensureFileExtension(fileName, fileType, originalBlob.type, cleanUrl);

    // Determine correct MIME type for Blob creation
    let blobMime = originalBlob.type;
    if (finalFileName.endsWith('.pdf') || fileType === 'pdf') {
      blobMime = 'application/pdf';
    }

    // Force exact Blob type so OS recognizes format
    const typedBlob = new Blob([originalBlob], { type: blobMime });

    // Create same-origin Blob URL so browser 100% enforces finalFileName & .pdf extension
    const blobUrl = URL.createObjectURL(typedBlob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = finalFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up Blob memory after short delay
    setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
  } catch (err) {
    console.warn('Blob fetch failed, falling back to direct download link:', err);
    const finalFileName = ensureFileExtension(fileName, fileType, '', cleanUrl);
    const link = document.createElement('a');
    link.href = cleanUrl;
    link.target = '_blank';
    link.download = finalFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
