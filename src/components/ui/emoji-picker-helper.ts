// components/emoji-picker-helper.ts
export const emojiCategories = {
    'Smileys & Emotion': '😀',
    'People & Body': '🙋',
    Component: '🧩',
    'Animals & Nature': '🐶',
    'Food & Drink': '🍕',
    'Travel & Places': '🗽',
    Activities: '⚽',
    Objects: '💡',
    Symbols: '♻️',
    Flags: '🇺🇳',
  } as const;
  
  type EmojiCategory = keyof typeof emojiCategories;
  type EmojiValue = (typeof emojiCategories)[EmojiCategory];
  
  export type Emoji = {
    code: string[];
    emoji: string;
    name: string;
  };
  
  type EmojisByCategoryRaw = {
    '@version': string;
    '@author': string;
    '@copyright': string;
    '@see': string;
    '@license': string;
    emojis: Record<EmojiCategory, Emoji>;
  };
  
  export type EmojisByCategory = {
    '@version': string;
    '@author': string;
    '@copyright': string;
    '@see': string;
    '@license': string;
    emojis: Record<EmojiValue, Emoji>;
  };
  
  function convertRawToByEmoji(raw: EmojisByCategoryRaw): EmojisByCategory {
    const converted: EmojisByCategory = {
      '@version': raw['@version'],
      '@author': raw['@author'],
      '@copyright': raw['@copyright'],
      '@see': raw['@see'],
      '@license': raw['@license'],
      emojis: {} as Record<EmojiValue, Emoji>,
    };
  
    for (const key in raw.emojis) {
      const category = key as EmojiCategory;
      const emojiData = raw.emojis[category];
  
      let emojiKey: EmojiValue;
  
      switch (category) {
        case 'Smileys & Emotion':
          emojiKey = '😀';
          break;
        case 'People & Body':
          emojiKey = '🙋';
          break;
        case 'Component':
          emojiKey = '🧩';
          break;
        case 'Animals & Nature':
          emojiKey = '🐶';
          break;
        case 'Food & Drink':
          emojiKey = '🍕';
          break;
        case 'Travel & Places':
          emojiKey = '🗽';
          break;
        case 'Activities':
          emojiKey = '⚽';
          break;
        case 'Objects':
          emojiKey = '💡';
          break;
        case 'Symbols':
          emojiKey = '♻️';
          break;
        case 'Flags':
          emojiKey = '🇺🇳';
          break;
        default:
          throw new Error(`Unknown category: ${category}`);
      }
  
      converted.emojis[emojiKey] = emojiData;
    }
  
    return converted;
  }
  
  export async function loadEmojiData() {
    try {
      const response = await fetch('/emojis-by-category.json');
      if (!response.ok) {
        throw new Error('Failed to load emoji data');
      }
      const data: EmojisByCategoryRaw = await response.json();
      return convertRawToByEmoji(data);
    } catch (error) {
      console.error('Error loading emoji data:', error);
    }
  }