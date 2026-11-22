// Curated modern avatar presets
export const PRESET_AVATARS = [
  { id: "felix", label: "Felix", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Felix" },
  { id: "aneka", label: "Aneka", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka" },
  { id: "caleb", label: "Caleb", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Caleb" },
  { id: "zoe", label: "Zoe", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Zoe" },
  { id: "cyber", label: "Cyber", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Cyber" },
  { id: "spark", label: "Spark", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Spark" },
  { id: "bella", label: "Bella", url: "https://api.dicebear.com/7.x/lorelei/svg?seed=Bella" },
  { id: "leo", label: "Leo", url: "https://api.dicebear.com/7.x/lorelei/svg?seed=Leo" },
  { id: "sam", label: "Sam", url: "https://api.dicebear.com/7.x/notionists/svg?seed=Sam" },
  { id: "maya", label: "Maya", url: "https://api.dicebear.com/7.x/notionists/svg?seed=Maya" },
  { id: "alex", label: "Alex", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex" },
  { id: "oliver", label: "Oliver", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver" }
];

export const getRandomAvatar = () => {
  const seeds = ["Aria", "Kai", "Milo", "Nova", "Luna", "Orion", "Leo", "Iris", "Atlas", "Zara"];
  const styles = ["adventurer", "bottts", "lorelei", "notionists"];
  const randomSeed = seeds[Math.floor(Math.random() * seeds.length)] + Math.floor(Math.random() * 1000);
  const randomStyle = styles[Math.floor(Math.random() * styles.length)];
  return `https://api.dicebear.com/7.x/${randomStyle}/svg?seed=${randomSeed}`;
};

/**
 * Compresses an image file to a base64 data URL to keep payload lightweight
 */
export const compressImage = (file, maxWidth = 300, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      return reject(new Error("Selected file must be an image"));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image"));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

export const getInitials = (name = "") => {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};
