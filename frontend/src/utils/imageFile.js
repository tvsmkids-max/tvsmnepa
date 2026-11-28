// Reads an image file and returns a small PNG/JPEG data URL (max side `max` px)
// so logos stay well under the server's size limit. SVG is not accepted.
export const fileToLogoDataUrl = (file, max = 512) =>
  new Promise((resolve, reject) => {
    if (!file || !/^image\/(png|jpeg|webp)$/.test(file.type)) {
      reject(new Error("Choose a PNG, JPEG or WebP image"));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(img.width * k));
      c.height = Math.max(1, Math.round(img.height * k));
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL(file.type === "image/jpeg" ? "image/jpeg" : "image/png", 0.9));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read this image"));
    };
    img.src = url;
  });
