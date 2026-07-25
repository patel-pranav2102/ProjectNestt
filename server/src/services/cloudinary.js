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
 * Fallbacks to generating a placeholder avatar URL if mock mode is active.
 * @param {Buffer} fileBuffer 
 * @param {string} folderName 
 * @returns {Promise<{ url: string, publicId: string }>}
 */
export const uploadBuffer = (fileBuffer, folderName = 'projectnest/avatars') => {
  return new Promise((resolve, reject) => {
    if (isPlaceholder) {
      // Mock Upload: Return a random avatar URL
      const mockId = `mock-${Math.random().toString(36).substring(7)}`;
      const randomSeed = Math.floor(Math.random() * 1000);
      const mockUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${randomSeed}`;
      return resolve({ url: mockUrl, publicId: mockId });
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: folderName, resource_type: 'auto' },
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
