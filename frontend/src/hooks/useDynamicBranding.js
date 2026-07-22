import { useState, useEffect, useRef } from "react";
import { FastAverageColor } from "fast-average-color";

// Default DID mint/cyan theme palette fallback
export const DEFAULT_DID_THEME = {
  primary: "#11a7b3",
  secondary: "#2FBF9B",
  accent: "#22D3EE",
  isExtracted: false,
};

function applyThemeToCssVariables(primary, secondary, accent) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--primary-color", primary);
  root.style.setProperty("--secondary-color", secondary);
  root.style.setProperty("--accent-color", accent);
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Extracts a professional 3-color palette (Primary, Secondary, Accent)
 * from a logo image URL and applies CSS variables dynamically to :root.
 */
export function useDynamicBranding(imageUrl) {
  const [theme, setTheme] = useState(DEFAULT_DID_THEME);
  const facRef = useRef(null);

  useEffect(() => {
    if (!imageUrl) {
      setTheme(DEFAULT_DID_THEME);
      applyThemeToCssVariables(DEFAULT_DID_THEME.primary, DEFAULT_DID_THEME.secondary, DEFAULT_DID_THEME.accent);
      return;
    }

    let cancelled = false;
    let objectUrl = null;

    if (!facRef.current) {
      facRef.current = new FastAverageColor();
    }

    async function extractColors() {
      try {
        let srcToLoad = imageUrl;
        try {
          const res = await fetch(imageUrl, { mode: "cors" });
          if (res.ok) {
            const blob = await res.blob();
            objectUrl = URL.createObjectURL(blob);
            srcToLoad = objectUrl;
          }
        } catch {
          // fallback to original URL if fetch fails
        }

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = srcToLoad;

        img.onload = () => {
          if (cancelled) return;
          try {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            canvas.width = 100;
            canvas.height = 100;
            ctx.drawImage(img, 0, 0, 100, 100);
            const imageData = ctx.getImageData(0, 0, 100, 100).data;

            const colorBins = new Map();
            for (let i = 0; i < imageData.length; i += 4) {
              const r = imageData[i];
              const g = imageData[i + 1];
              const b = imageData[i + 2];
              const a = imageData[i + 3];

              if (a < 128) continue;
              if (r > 240 && g > 240 && b > 240) continue;
              if (r < 15 && g < 15 && b < 15) continue;

              const qr = Math.round(r / 16) * 16;
              const qg = Math.round(g / 16) * 16;
              const qb = Math.round(b / 16) * 16;
              const key = `${qr},${qg},${qb}`;

              colorBins.set(key, (colorBins.get(key) || 0) + 1);
            }

            const sortedBins = Array.from(colorBins.entries())
              .sort((a, b) => b[1] - a[1])
              .map(([key]) => key.split(",").map(Number));

            let primaryHex, secondaryHex, accentHex;

            if (sortedBins.length >= 2) {
              const pRgb = sortedBins[0];
              const sRgb = sortedBins[1];

              primaryHex = `#${pRgb.map(c => c.toString(16).padStart(2, '0')).join('')}`;
              secondaryHex = `#${sRgb.map(c => c.toString(16).padStart(2, '0')).join('')}`;

              if (sortedBins.length >= 3) {
                const aRgb = sortedBins[2];
                accentHex = `#${aRgb.map(c => c.toString(16).padStart(2, '0')).join('')}`;
              } else {
                const [h, s, l] = rgbToHsl(...pRgb);
                accentHex = hslToHex((h + 30) % 360, Math.min(s, 80), Math.min(l + 20, 90));
              }
            } else if (sortedBins.length === 1) {
              const pRgb = sortedBins[0];
              const [h, s, l] = rgbToHsl(...pRgb);
              primaryHex = `#${pRgb.map(c => c.toString(16).padStart(2, '0')).join('')}`;
              secondaryHex = hslToHex(h, Math.min(s, 85), Math.max(l - 25, 15));
              accentHex = hslToHex((h + 40) % 360, Math.min(s + 10, 90), Math.min(l + 20, 85));
            } else {
              const facResult = facRef.current.getColor(img, {
                algorithm: "dominant",
                ignoredColor: [
                  [255, 255, 255, 255],
                  [0, 0, 0, 255],
                ],
              });

              if (facResult && facResult.value) {
                const [r, g, b] = facResult.value;
                const [h, s, l] = rgbToHsl(r, g, b);
                primaryHex = facResult.hex;
                secondaryHex = hslToHex(h, Math.min(s, 70), Math.max(l - 20, 15));
                accentHex = hslToHex((h + 40) % 360, Math.min(s + 10, 90), Math.min(l + 15, 85));
              } else {
                setTheme(DEFAULT_DID_THEME);
                applyThemeToCssVariables(DEFAULT_DID_THEME.primary, DEFAULT_DID_THEME.secondary, DEFAULT_DID_THEME.accent);
                return;
              }
            }

            const generatedTheme = {
              primary: primaryHex,
              secondary: secondaryHex,
              accent: accentHex,
              isExtracted: true,
            };

            setTheme(generatedTheme);
            applyThemeToCssVariables(primaryHex, secondaryHex, accentHex);
          } catch {
            if (!cancelled) {
              setTheme(DEFAULT_DID_THEME);
              applyThemeToCssVariables(DEFAULT_DID_THEME.primary, DEFAULT_DID_THEME.secondary, DEFAULT_DID_THEME.accent);
            }
          }
        };

        img.onerror = () => {
          if (!cancelled) {
            setTheme(DEFAULT_DID_THEME);
            applyThemeToCssVariables(DEFAULT_DID_THEME.primary, DEFAULT_DID_THEME.secondary, DEFAULT_DID_THEME.accent);
          }
        };
      } catch {
        if (!cancelled) {
          setTheme(DEFAULT_DID_THEME);
          applyThemeToCssVariables(DEFAULT_DID_THEME.primary, DEFAULT_DID_THEME.secondary, DEFAULT_DID_THEME.accent);
        }
      }
    }

    extractColors();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageUrl]);

  return theme;
}