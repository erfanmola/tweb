
export class MediaEditorFilterUtils {
  static enhance(pixels: Uint8ClampedArray, width: number, height: number, amount: number): Uint8ClampedArray {
    const brightnessAmount = 1 + 0.1 * amount;
    pixels = this.brightness(pixels, brightnessAmount);

    const contrastAmount = 10 * amount;
    pixels = this.contrast(pixels, contrastAmount);

    const saturationAmount = 1 + 0.2 * amount;
    pixels = this.saturation(pixels, saturationAmount);

    const vignetteAmount = 0.1 * amount;
    pixels = this.vignette(pixels, width, height, vignetteAmount);

    return pixels;
  }

  static brightness(pixels: Uint8ClampedArray, amount: number): Uint8ClampedArray {
    for(let i = 0; i < pixels.length; i += 4) {
      pixels[i] = Math.min(pixels[i] * amount, 255) | 0;
      pixels[i + 1] = Math.min(pixels[i + 1] * amount, 255) | 0;
      pixels[i + 2] = Math.min(pixels[i + 2] * amount, 255) | 0;
    }
    return pixels;
  }

  static contrast(pixels: Uint8ClampedArray, amount: number): Uint8ClampedArray {
    const factor = (259 * (amount + 255)) / (255 * (259 - amount));
    for(let i = 0; i < pixels.length; i += 4) {
      pixels[i] = Math.min(Math.max(factor * (pixels[i] - 128) + 128, 0), 255) | 0;
      pixels[i + 1] = Math.min(Math.max(factor * (pixels[i + 1] - 128) + 128, 0), 255) | 0;
      pixels[i + 2] = Math.min(Math.max(factor * (pixels[i + 2] - 128) + 128, 0), 255) | 0;
    }
    return pixels;
  }

  static saturation(pixels: Uint8ClampedArray, amount: number): Uint8ClampedArray {
    const RW = 0.2989, RG = 0.587, RB = 0.114;
    for(let i = 0; i < pixels.length; i += 4) {
      const gray = (RW * pixels[i] + RG * pixels[i + 1] + RB * pixels[i + 2]) | 0;

      pixels[i] = Math.min(Math.max(gray + amount * (pixels[i] - gray), 0), 255) | 0;
      pixels[i + 1] = Math.min(Math.max(gray + amount * (pixels[i + 1] - gray), 0), 255) | 0;
      pixels[i + 2] = Math.min(Math.max(gray + amount * (pixels[i + 2] - gray), 0), 255) | 0;
    }
    return pixels;
  }

  static warmth(pixels: Uint8ClampedArray, amount: number): Uint8ClampedArray {
    for(let i = 0; i < pixels.length; i += 4) {
      pixels[i] = Math.min(pixels[i] + amount, 255) | 0;
      pixels[i + 2] = Math.max(pixels[i + 2] - amount, 0) | 0;
    }
    return pixels;
  }

  static fade(pixels: Uint8ClampedArray, amount: number): Uint8ClampedArray {
    for(let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];

      const gray = 0.2989 * r + 0.587 * g + 0.114 * b;

      pixels[i] = Math.min(Math.max((1 - amount) * r + amount * gray, 0), 255) | 0;
      pixels[i + 1] = Math.min(Math.max((1 - amount) * g + amount * gray, 0), 255) | 0;
      pixels[i + 2] = Math.min(Math.max((1 - amount) * b + amount * gray, 0), 255) | 0;
    }
    return pixels;
  }

  static highlights(pixels: Uint8ClampedArray, amount: number): Uint8ClampedArray {
    for(let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];

      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

      if(brightness > 128) {
        pixels[i] = Math.min(Math.max(r + amount * (255 - r), 0), 255) | 0;
        pixels[i + 1] = Math.min(Math.max(g + amount * (255 - g), 0), 255) | 0;
        pixels[i + 2] = Math.min(Math.max(b + amount * (255 - b), 0), 255) | 0;
      }
    }
    return pixels;
  }

  static shadows(pixels: Uint8ClampedArray, amount: number): Uint8ClampedArray {
    amount = Math.max(-1, Math.min(1, amount));

    for(let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];

      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

      if(brightness < 128) {
        pixels[i] = Math.min(Math.max(r + amount * r, 0), 255) | 0;
        pixels[i + 1] = Math.min(Math.max(g + amount * g, 0), 255) | 0;
        pixels[i + 2] = Math.min(Math.max(b + amount * b, 0), 255) | 0;
      }
    }
    return pixels;
  }

  static vignette(pixels: Uint8ClampedArray, width: number, height: number, amount: number): Uint8ClampedArray {
    const centerX = width / 2;
    const centerY = height / 2;
    const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);

    for(let y = 0; y < height; y++) {
      for(let x = 0; x < width; x++) {
        const offset = (y * width + x) * 4;
        const r = pixels[offset];
        const g = pixels[offset + 1];
        const b = pixels[offset + 2];

        const distance = Math.sqrt((x - centerX) * (x - centerX) + (y - centerY) * (y - centerY));
        const vignetteEffect = 1 - Math.min(distance / maxDistance * amount, 1);

        pixels[offset] = Math.min(Math.max(r * vignetteEffect, 0), 255) | 0;
        pixels[offset + 1] = Math.min(Math.max(g * vignetteEffect, 0), 255) | 0;
        pixels[offset + 2] = Math.min(Math.max(b * vignetteEffect, 0), 255) | 0;
      }
    }
    return pixels;
  }

  static grain(pixels: Uint8ClampedArray, width: number, height: number, amount: number): Uint8ClampedArray {
    for(let y = 0; y < height; y++) {
      for(let x = 0; x < width; x++) {
        const offset = (y * width + x) * 4;
        const r = pixels[offset];
        const g = pixels[offset + 1];
        const b = pixels[offset + 2];

        const noise = (Math.random() - 0.5) * 255 * amount;

        pixels[offset] = Math.min(Math.max(r + noise, 0), 255) | 0;
        pixels[offset + 1] = Math.min(Math.max(g + noise, 0), 255) | 0;
        pixels[offset + 2] = Math.min(Math.max(b + noise, 0), 255) | 0;
      }
    }
    return pixels;
  }

  static sharpen(pixels: Uint8ClampedArray, width: number, height: number, amount: number): Uint8ClampedArray {
    const originalPixels = new Uint8ClampedArray(pixels);

    function getPixel(x: number, y: number, offset: number = 0): number {
      if(x < 0 || x >= width || y < 0 || y >= height) {
        return 0;
      }
      return originalPixels[(y * width + x) * 4 + offset];
    }

    for(let y = 0; y < height; y++) {
      for(let x = 0; x < width; x++) {
        const offset = (y * width + x) * 4;

        const r = (
          -getPixel(x - 1, y, 0) +
                  -getPixel(x, y - 1, 0) +
                  5 * getPixel(x, y, 0) +
                  -getPixel(x, y + 1, 0) +
                  -getPixel(x + 1, y, 0)
        );
        const g = (
          -getPixel(x - 1, y, 1) +
                  -getPixel(x, y - 1, 1) +
                  5 * getPixel(x, y, 1) +
                  -getPixel(x, y + 1, 1) +
                  -getPixel(x + 1, y, 1)
        );
        const b = (
          -getPixel(x - 1, y, 2) +
                  -getPixel(x, y - 1, 2) +
                  5 * getPixel(x, y, 2) +
                  -getPixel(x, y + 1, 2) +
                  -getPixel(x + 1, y, 2)
        );

        pixels[offset] = Math.min(Math.max((1 - amount) * getPixel(x, y, 0) + amount * r, 0), 255) | 0;
        pixels[offset + 1] = Math.min(Math.max((1 - amount) * getPixel(x, y, 1) + amount * g, 0), 255) | 0;
        pixels[offset + 2] = Math.min(Math.max((1 - amount) * getPixel(x, y, 2) + amount * b, 0), 255) | 0;
      }
    }

    return pixels;
  }
}

export class MediaEditorCropUtils {
  static flip(pixels: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
    const flippedPixels = new Uint8ClampedArray(pixels.length);
    for(let y = 0; y < height; y++) {
      for(let x = 0; x < width; x++) {
        for(let c = 0; c < 4; c++) {
          flippedPixels[(y * width + x) * 4 + c] = pixels[(y * width + (width - x - 1)) * 4 + c];
        }
      }
    }
    return flippedPixels;
  }

  static rotate(pixels: Uint8ClampedArray, degree: number, width: number, height: number): { pixels: Uint8ClampedArray, width: number, height: number } {
    const radians = degree * Math.PI / 180;
    const sin = Math.sin(radians);
    const cos = Math.cos(radians);

    const newWidth = Math.abs(Math.ceil(width * cos + height * sin));
    const newHeight = Math.abs(Math.ceil(width * sin + height * cos));

    const rotatedPixels = new Uint8ClampedArray(newWidth * newHeight * 4);

    const x0 = width / 2;
    const y0 = height / 2;
    const x0New = newWidth / 2;
    const y0New = newHeight / 2;

    for(let y = 0; y < newHeight; y++) {
      for(let x = 0; x < newWidth; x++) {
        const xOld = Math.cos(radians) * (x - x0New) - Math.sin(radians) * (y - y0New) + x0;
        const yOld = Math.sin(radians) * (x - x0New) + Math.cos(radians) * (y - y0New) + y0;

        const xOldInt = Math.floor(xOld);
        const yOldInt = Math.floor(yOld);

        if(xOldInt >= 0 && xOldInt < width && yOldInt >= 0 && yOldInt < height) {
          for(let c = 0; c < 4; c++) {
            rotatedPixels[(y * newWidth + x) * 4 + c] = pixels[(yOldInt * width + xOldInt) * 4 + c];
          }
        }
      }
    }

    return {
      pixels: rotatedPixels,
      width: newWidth,
      height: newHeight
    };
  }
}

export class MediaEditorSVGUtils {
  static getPathPoints(path: SVGPathElement, numSamples: number = 100): { x: number, y: number }[] {
    const length = path.getTotalLength();
    const points = [];
    for(let i = 0; i <= numSamples; i++) {
      const point = path.getPointAtLength((i / numSamples) * length);
      points.push({x: point.x, y: point.y});
    }
    return points;
  }

  static doLineSegmentsIntersect(p1: { x: number, y: number }, p2: { x: number, y: number }, p3: { x: number, y: number }, p4: { x: number, y: number }): boolean {
    const d1 = (p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x);
    const d2 = (p4.x - p3.x) * (p2.y - p3.y) - (p4.y - p3.y) * (p2.x - p3.x);
    const d3 = (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
    const d4 = (p2.x - p1.x) * (p4.y - p1.y) - (p2.y - p1.y) * (p4.x - p1.x);

    if(((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
      return true;
    }
    return (d1 == 0 && this.isOnSegment(p3, p4, p1)) ||
             (d2 == 0 && this.isOnSegment(p3, p4, p2)) ||
             (d3 == 0 && this.isOnSegment(p1, p2, p3)) ||
             (d4 == 0 && this.isOnSegment(p1, p2, p4));
  }

  static isOnSegment(p1: { x: number, y: number }, p2: { x: number, y: number }, p: { x: number, y: number }): boolean {
    return p.x <= Math.max(p1.x, p2.x) && p.x >= Math.min(p1.x, p2.x) &&
             p.y <= Math.max(p1.y, p2.y) && p.y >= Math.min(p1.y, p2.y);
  }

  static arePathsIntersecting(path1: SVGPathElement, path2: SVGPathElement): boolean {
    const points1 = this.getPathPoints(path1);
    const points2 = this.getPathPoints(path2);

    for(let i = 0; i < points1.length - 1; i++) {
      for(let j = 0; j < points2.length - 1; j++) {
        if(this.doLineSegmentsIntersect(points1[i], points1[i + 1], points2[j], points2[j + 1])) {
          return true;
        }
      }
    }

    return false;
  }
}
