// Utility functions for image handling

/**
 * Resize and compress image before converting to base64
 */
const resizeImage = (file: File, maxWidth: number = 1200, maxHeight: number = 1200, quality: number = 0.8): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      if (typeof e.target?.result === 'string') {
        img.src = e.target.result;
      } else {
        reject(new Error('Invalid file data'));
      }
    };
    reader.onerror = () => reject(new Error('Error reading file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Convert a File to base64 data URL with compression
 */
export const fileToBase64 = async (file: File): Promise<string> => {
  try {
    // Resize and compress image if it's an image file
    if (file.type.startsWith('image/')) {
      const compressedBlob = await resizeImage(file, 1200, 1200, 0.85);
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error('Failed to convert file to base64'));
          }
        };
        reader.onerror = () => reject(new Error('Error reading file'));
        reader.readAsDataURL(compressedBlob);
      });
    } else {
      // For non-image files, convert directly
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error('Failed to convert file to base64'));
          }
        };
        reader.onerror = () => reject(new Error('Error reading file'));
        reader.readAsDataURL(file);
      });
    }
  } catch (error) {
    console.error('Error processing image:', error);
    // Fallback to direct conversion if compression fails
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = () => reject(new Error('Error reading file'));
      reader.readAsDataURL(file);
    });
  }
};

/**
 * Convert blob URL to base64 if it's a blob URL, otherwise return as is
 */
export const convertBlobToBase64 = async (blobUrl: string): Promise<string> => {
  // If it's already a base64 data URL or a regular URL, return as is
  if (blobUrl.startsWith('data:') || blobUrl.startsWith('http://') || blobUrl.startsWith('https://')) {
    return blobUrl;
  }

  // If it's a blob URL, fetch and convert to base64
  if (blobUrl.startsWith('blob:')) {
    try {
      const response = await fetch(blobUrl);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error('Failed to convert blob to base64'));
          }
        };
        reader.onerror = () => reject(new Error('Error reading blob'));
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error converting blob to base64:', error);
      return blobUrl; // Return original if conversion fails
    }
  }

  return blobUrl;
};

/**
 * Convert array of image URLs (blob or base64) to base64
 */
export const convertImagesToBase64 = async (images: string[]): Promise<string[]> => {
  const convertedImages = await Promise.all(
    images.map(img => convertBlobToBase64(img))
  );
  return convertedImages;
};

/**
 * Convert a video File to base64 data URL
 * Note: Videos can be large, so consider compression or size limits
 */
export const videoToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Check file size (limit to 50MB for base64 encoding)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      reject(new Error('Video file is too large. Maximum size is 50MB.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert video to base64'));
      }
    };
    reader.onerror = () => reject(new Error('Error reading video file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Check if a media URL is a video (base64 data URL with video type or external video URL)
 */
export const isVideo = (url: string): boolean => {
  if (!url) return false;
  // Check for base64 video
  if (url.startsWith('data:video/')) return true;
  // Check for common video hosting URLs
  const videoDomains = ['youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com', 'video', '.mp4', '.webm', '.ogg'];
  return videoDomains.some(domain => url.toLowerCase().includes(domain));
};

/**
 * Check if a media URL is an image
 */
export const isImage = (url: string): boolean => {
  return url.startsWith('data:image/') || url.startsWith('http') || url.startsWith('blob:');
};
