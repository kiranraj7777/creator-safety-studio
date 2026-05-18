const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'video-promo');
const WIDTH = 1920;
const HEIGHT = 1080;

// Scene definitions for 30-second video
const scenes = [
  {
    text: "Struggling to reach\nthe right customers?",
    subtext: "",
    bgGradient: ["#0F172A", "#1E293B"],
    textColor: "#38BDF8",
    duration: 5,
  },
  {
    text: "Wasting money on ads\nthat don't convert?",
    subtext: "",
    bgGradient: ["#1E1B4B", "#312E81"],
    textColor: "#F472B6",
    duration: 5,
  },
  {
    text: "CloudNine",
    subtext: "Digital Solutions",
    bgGradient: ["#0F172A", "#1E3A5F"],
    textColor: "#38BDF8",
    duration: 5,
  },
  {
    text: "Expert Meta Ads that",
    subtext: "Target • Engage • Convert",
    bgGradient: ["#064E3B", "#065F46"],
    textColor: "#34D399",
    duration: 5,
  },
  {
    text: "More Leads.",
    subtext: "More Sales. Less Wasted Spend.",
    bgGradient: ["#1E1B4B", "#3730A3"],
    textColor: "#A78BFA",
    duration: 5,
  },
  {
    text: "Start Growing Today",
    subtext: "CloudNine Digital Solutions",
    bgGradient: ["#0F172A", "#1E3A5F"],
    textColor: "#38BDF8",
    duration: 5,
  },
];

async function createFrame(scene, frameIndex) {
  const svg = `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${scene.bgGradient[0]}"/>
          <stop offset="100%" style="stop-color:${scene.bgGradient[1]}"/>
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <!-- Background -->
      <rect width="100%" height="100%" fill="url(#bg)"/>
      
      <!-- Decorative circles -->
      <circle cx="200" cy="150" r="100" fill="${scene.textColor}" opacity="0.05"/>
      <circle cx="1700" cy="900" r="150" fill="${scene.textColor}" opacity="0.05"/>
      <circle cx="1600" cy="200" r="80" fill="${scene.textColor}" opacity="0.03"/>
      
      <!-- Accent line -->
      <rect x="860" y="480" width="200" height="4" fill="${scene.textColor}" rx="2" opacity="0.6"/>
      
      <!-- Main text -->
      <text x="960" y="${scene.subtext ? "460" : "540"}" 
            font-family="Arial, sans-serif" 
            font-size="${scene.text.length > 30 ? "64" : "80"}" 
            font-weight="bold"
            fill="${scene.textColor}" 
            text-anchor="middle"
            filter="url(#glow)">
        ${scene.text}
      </text>
      
      ${scene.subtext ? `
      <!-- Subtext -->
      <text x="960" y="620" 
            font-family="Arial, sans-serif" 
            font-size="48" 
            fill="#94A3B8" 
            text-anchor="middle">
        ${scene.subtext}
      </text>
      ` : ''}
      
      <!-- Bottom branding -->
      <text x="960" y="1000" 
            font-family="Arial, sans-serif" 
            font-size="24" 
            fill="#64748B" 
            text-anchor="middle"
            letter-spacing="4">
        CLOUDNINE DIGITAL SOLUTIONS
      </text>
    </svg>
  `;

  const outputPath = path.join(OUTPUT_DIR, `frame_${String(frameIndex).padStart(3, '0')}.png`);
  
  await sharp(Buffer.from(svg))
    .resize(WIDTH, HEIGHT)
    .png()
    .toFile(outputPath);
  
  return outputPath;
}

async function generateFrames() {
  console.log('Generating frames...');
  
  const allFrames = [];
  const fps = 10; // 10 frames per second for smooth animation
  
  for (let s = 0; s < scenes.length; s++) {
    const scene = scenes[s];
    const frameCount = scene.duration * fps;
    
    for (let f = 0; f < frameCount; f++) {
      const frameIndex = allFrames.length;
      const progress = f / frameCount;
      
      // Create slight animation effect by adjusting opacity
      const animatedScene = {
        ...scene,
        bgGradient: scene.bgGradient,
        textColor: scene.textColor,
      };
      
      await createFrame(animatedScene, frameIndex);
      allFrames.push(path.join(OUTPUT_DIR, `frame_${String(frameIndex).padStart(3, '0')}.png`));
    }
    
    console.log(`Scene ${s + 1}/6 complete (${frameCount} frames)`);
  }
  
  console.log(`\nTotal frames generated: ${allFrames.length}`);
  return allFrames;
}

generateFrames().catch(console.error);
