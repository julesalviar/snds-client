import { SchoolNeedImage } from '../model/school-need.model';

export class ThumbnailUtils {
  /**
   * Get thumbnail images from a need/contribution object
   * If there are more than 5 images, randomly select 5 for the fanned layout
   */
  static getThumbnailImages(item: any): SchoolNeedImage[] {
    if (!item?.images || !Array.isArray(item.images)) {
      return [];
    }
    const images = item?.images ?? [];
    if (images.length <= 5) {
      return images;
    }

    // Randomly select up to 5 images from the array for the fanned layout
    const shuffled = [...images].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 5);
  }

  /**
   * Handle image error by hiding the broken image
   */
  static onImageError(event: any): void {
    event.target.style.display = 'none';
  }
}

