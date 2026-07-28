import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

// Ensure environment variables are loaded at ES Module import time
dotenv.config();

// Check if credentials are placeholders
const isPlaceholder = 
  process.env.CLOUDINARY_CLOUD_NAME === 'placeholder' ||
  !process.env.CLOUDINARY_CLOUD_NAME ||
  process.env.CLOUDINARY_API_KEY === 'placeholder' ||
  !process.env.CLOUDINARY_API_KEY ||
  process.env.CLOUDINARY_API_SECRET === 'placeholder' ||
  !process.env.CLOUDINARY_API_SECRET;

if (!isPlaceholder) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
} else {
  console.log('⚠️ [Cloudinary] Credentials are placeholders. Falling back to mock uploads.');
}

/**
 * Uploads a file buffer directly to Cloudinary using streams.
 * Supports all file types: images, videos, PDFs, documents.
 * Falls back to a mock URL if Cloudinary credentials are not configured.
 * @param {Buffer} fileBuffer 
 * @param {string} folderName 
 * @param {string} mimeType - original mimetype, used for mock fallback
 * @returns {Promise<{ url: string, publicId: string }>}
 */
export const uploadBuffer = (fileBuffer, folderName = 'projectnest/avatars', mimeType = 'image/png') => {
  return new Promise((resolve, reject) => {
    if (isPlaceholder) {
      // Mock Upload: Return type-appropriate placeholder URL
      const mockId = `mock-${Math.random().toString(36).substring(7)}`;
      let mockUrl;
      if (mimeType.startsWith('image/')) {
        const randomSeed = Math.floor(Math.random() * 1000);
        mockUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${randomSeed}`;
      } else if (mimeType === 'application/pdf' || mimeType.includes('pdf')) {
        // Valid, working public sample PDF file for mock environment
        mockUrl = `https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf`;
      } else if (mimeType.startsWith('video/')) {
        mockUrl = `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4`;
      } else {
        // Generic document mock URL
        mockUrl = `https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf`;
      }
      return resolve({ url: mockUrl, publicId: mockId });
    }

    let resourceType = 'auto';
    if (mimeType.startsWith('image/') || mimeType === 'application/pdf' || mimeType.includes('pdf')) {
      resourceType = 'image'; // Cloudinary natively processes PDFs under image resource type!
    } else if (mimeType.startsWith('video/') || mimeType.startsWith('audio/')) {
      resourceType = 'video';
    } else {
      resourceType = 'raw';
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      { 
        folder: folderName, 
        resource_type: resourceType,
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    // Write file buffer into the upload stream
    uploadStream.end(fileBuffer);
  });
};
