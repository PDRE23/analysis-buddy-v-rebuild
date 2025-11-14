/**
 * Mobile Camera Integration
 * Document capture using device camera
 */

export interface CameraCaptureOptions {
  quality?: number; // 0-1
  maxWidth?: number;
  maxHeight?: number;
  allowEditing?: boolean;
}

export interface CameraResult {
  file: File;
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * Capture photo using device camera
 */
export async function capturePhoto(
  options: CameraCaptureOptions = {}
): Promise<CameraResult | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment"; // Use back camera on mobile
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        resolve(null);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        
        // Create image to get dimensions
        const img = new Image();
        img.onload = () => {
          // Resize if needed
          const { quality = 0.8, maxWidth = 1920, maxHeight = 1920 } = options;
          
          let finalWidth = img.width;
          let finalHeight = img.height;
          
          if (finalWidth > maxWidth || finalHeight > maxHeight) {
            const ratio = Math.min(maxWidth / finalWidth, maxHeight / finalHeight);
            finalWidth = finalWidth * ratio;
            finalHeight = finalHeight * ratio;
          }

          // Create canvas and resize
          const canvas = document.createElement("canvas");
          canvas.width = finalWidth;
          canvas.height = finalHeight;
          const ctx = canvas.getContext("2d");
          
          if (ctx) {
            ctx.drawImage(img, 0, 0, finalWidth, finalHeight);
            
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  const resizedFile = new File(
                    [blob],
                    file.name,
                    { type: file.type || "image/jpeg" }
                  );
                  
                  resolve({
                    file: resizedFile,
                    dataUrl: canvas.toDataURL("image/jpeg", quality),
                    width: finalWidth,
                    height: finalHeight,
                  });
                } else {
                  resolve(null);
                }
              },
              file.type || "image/jpeg",
              quality
            );
          } else {
            resolve({
              file,
              dataUrl,
              width: img.width,
              height: img.height,
            });
          }
        };
        
        img.src = dataUrl;
      };
      
      reader.readAsDataURL(file);
    };

    input.click();
  });
}

/**
 * Capture document (optimized for documents)
 */
export async function captureDocument(): Promise<CameraResult | null> {
  return capturePhoto({
    quality: 0.9,
    maxWidth: 2048,
    maxHeight: 2048,
    allowEditing: false,
  });
}

/**
 * Check if device has camera
 */
export async function hasCamera(): Promise<boolean> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return false;
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some(device => device.kind === "videoinput");
  } catch {
    return false;
  }
}

/**
 * Get camera stream for live preview
 */
export async function getCameraStream(
  videoElement: HTMLVideoElement,
  facingMode: "user" | "environment" = "environment"
): Promise<MediaStream | null> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode,
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
    });

    videoElement.srcObject = stream;
    return stream;
  } catch (error) {
    console.error("Error accessing camera:", error);
    return null;
  }
}

/**
 * Stop camera stream
 */
export function stopCameraStream(stream: MediaStream | null): void {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
}

