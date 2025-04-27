import { toPng } from 'html-to-image';

export const captureScreenshot = async (element: HTMLElement): Promise<string | null> => {
   if (!element) return null;

   try {
      const resizeHandle = element.querySelector('[data-resize-handle]');
      const originalHandleDisplay = resizeHandle instanceof HTMLElement ? resizeHandle.style.display : '';
      if (resizeHandle instanceof HTMLElement) {
         resizeHandle.style.display = 'none';
      }

      const images = element.getElementsByTagName('img');
      await Promise.all(Array.from(images).map(img => {
         if (img.complete) return Promise.resolve();
         return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
         });
      }));

      const contentElem = element.querySelector('[data-content]');
      let originalOverflow = '';
      if (contentElem instanceof HTMLElement) {
         originalOverflow = contentElem.style.overflow;
         contentElem.style.overflow = 'visible';
      }

      const dataUrl = await toPng(element, {
         width: element.offsetWidth,
         height: element.offsetHeight,
         pixelRatio: 2,
         skipAutoScale: false,
         cacheBust: true,
      });

      if (contentElem instanceof HTMLElement) {
         contentElem.style.overflow = originalOverflow;
      }
      if (resizeHandle instanceof HTMLElement) {
         resizeHandle.style.display = originalHandleDisplay || 'flex';
      }

      return dataUrl;
   } catch (error) {
      console.error('Screenshot failed:', error);
      const resizeHandle = element.querySelector('[data-resize-handle]');
      if (resizeHandle instanceof HTMLElement) {
         resizeHandle.style.display = 'flex';
      }
      const contentElem = element.querySelector('[data-content]');
      if (contentElem instanceof HTMLElement) {
         contentElem.style.overflow = '';
      }
      return null;
   }
};

export async function getPngSize(dataUrl: string): Promise<{ w: number; h: number }> {
   return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = (e) => reject(e);
      img.src = dataUrl;
   });
}

export async function downscalePng(
   dataUrl: string,
   maxW = 960,
   maxH = 540
): Promise<string> {
   return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
         const scale = Math.min(
            maxW / img.naturalWidth,
            maxH / img.naturalHeight,
            1
         );

         const w = Math.round(img.naturalWidth * scale);
         const h = Math.round(img.naturalHeight * scale);
         const canvas = document.createElement('canvas');
         canvas.width = w;
         canvas.height = h;

         const ctx = canvas.getContext('2d')!;
         ctx.imageSmoothingEnabled = true;
         ctx.imageSmoothingQuality = 'high';
         ctx.drawImage(img, 0, 0, w, h);

         resolve(canvas.toDataURL('image/png', 1.0));
      };
      img.onerror = (e) => reject(e);
      img.src = dataUrl;
   });
}