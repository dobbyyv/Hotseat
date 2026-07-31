import { useCallback } from 'react';

const sounds = {
  click: new Audio('/sounds/click.mp3'),
  thock: new Audio('/sounds/thock.mp3'),
  success: new Audio('/sounds/success.mp3'),
  woosh: new Audio('/sounds/woosh.mp3'),
  keypress: new Audio('/sounds/keypress.mp3'),
};

Object.values(sounds).forEach(audio => {
  audio.volume = 0.6; 
});

export default function useSFX() {
  const play = useCallback((soundName) => {
    const audio = sounds[soundName];
    if (audio) {
      const clone = audio.cloneNode(true);
      clone.volume = audio.volume;
      clone.currentTime = 0;
      clone.play().catch(e => console.warn(`SFX Error for ${soundName}:`, e));
    } else {
      console.warn(`SFX Engine: "${soundName}" not found in memory.`);
    }
  }, []);

  return play;
}