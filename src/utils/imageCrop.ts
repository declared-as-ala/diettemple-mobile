/**
 * Crop image to 4:5 ratio (center crop) and compress. Uses expo-image-manipulator.
 */
import { Image } from 'react-native';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const TARGET_ASPECT = 4 / 5;
const COMPRESS_QUALITY = 0.95;

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
}

export async function cropAndCompress(uri: string): Promise<string> {
  try {
    const { width, height } = await getImageSize(uri);
    const currentAspect = width / height;
    let cropWidth: number;
    let cropHeight: number;
    let originX: number;
    let originY: number;
    if (currentAspect > TARGET_ASPECT) {
      cropHeight = height;
      cropWidth = Math.round(height * TARGET_ASPECT);
      originX = Math.round((width - cropWidth) / 2);
      originY = 0;
    } else {
      cropWidth = width;
      cropHeight = Math.round(width / TARGET_ASPECT);
      originX = 0;
      originY = Math.round((height - cropHeight) / 2);
    }
    const context = ImageManipulator.manipulate(uri);
    context.crop({ originX, originY, width: cropWidth, height: cropHeight });
    const imageRef = await context.renderAsync();
    const result = await imageRef.saveAsync({
      compress: COMPRESS_QUALITY,
      format: SaveFormat.JPEG,
    });
    return result?.uri ?? uri;
  } catch {
    return uri;
  }
}
