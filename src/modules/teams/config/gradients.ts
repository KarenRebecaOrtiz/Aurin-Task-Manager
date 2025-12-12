/**
 * Teams Module - Gradient Configuration
 *
 * Predefined gradients for team avatars.
 * Inspired by gradientscss.vercel.app
 */

export interface GradientOption {
  id: string;
  name: string;
  from: string;
  to: string;
  via?: string;
  className: string;
}

export const TEAM_GRADIENTS: GradientOption[] = [
  {
    id: 'ocean',
    name: 'Ocean',
    from: '#667eea',
    to: '#764ba2',
    className: 'bg-gradient-to-br from-[#667eea] to-[#764ba2]',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    from: '#f093fb',
    to: '#f5576c',
    className: 'bg-gradient-to-br from-[#f093fb] to-[#f5576c]',
  },
  {
    id: 'forest',
    name: 'Forest',
    from: '#11998e',
    to: '#38ef7d',
    className: 'bg-gradient-to-br from-[#11998e] to-[#38ef7d]',
  },
  {
    id: 'flamingo',
    name: 'Flamingo',
    from: '#f7797d',
    to: '#FBD786',
    via: '#C6FFDD',
    className: 'bg-gradient-to-br from-[#f7797d] via-[#FBD786] to-[#C6FFDD]',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    from: '#232526',
    to: '#414345',
    className: 'bg-gradient-to-br from-[#232526] to-[#414345]',
  },
  {
    id: 'peach',
    name: 'Peach',
    from: '#ffecd2',
    to: '#fcb69f',
    className: 'bg-gradient-to-br from-[#ffecd2] to-[#fcb69f]',
  },
  {
    id: 'aqua',
    name: 'Aqua',
    from: '#00d2ff',
    to: '#3a7bd5',
    className: 'bg-gradient-to-br from-[#00d2ff] to-[#3a7bd5]',
  },
  {
    id: 'cosmic',
    name: 'Cosmic',
    from: '#ff00cc',
    to: '#333399',
    className: 'bg-gradient-to-br from-[#ff00cc] to-[#333399]',
  },
  {
    id: 'lime',
    name: 'Lime',
    from: '#a8e063',
    to: '#56ab2f',
    className: 'bg-gradient-to-br from-[#a8e063] to-[#56ab2f]',
  },
  {
    id: 'royal',
    name: 'Royal',
    from: '#141e30',
    to: '#243b55',
    className: 'bg-gradient-to-br from-[#141e30] to-[#243b55]',
  },
  {
    id: 'candy',
    name: 'Candy',
    from: '#ff9a9e',
    to: '#fecfef',
    className: 'bg-gradient-to-br from-[#ff9a9e] to-[#fecfef]',
  },
  {
    id: 'aurora',
    name: 'Aurora',
    from: '#00c6fb',
    to: '#005bea',
    className: 'bg-gradient-to-br from-[#00c6fb] to-[#005bea]',
  },
  {
    id: 'lavender',
    name: 'Lavender',
    from: '#e0c3fc',
    to: '#8ec5fc',
    className: 'bg-gradient-to-br from-[#e0c3fc] to-[#8ec5fc]',
  },
  {
    id: 'fire',
    name: 'Fire',
    from: '#f12711',
    to: '#f5af19',
    className: 'bg-gradient-to-br from-[#f12711] to-[#f5af19]',
  },
  {
    id: 'steel',
    name: 'Steel',
    from: '#485563',
    to: '#29323c',
    className: 'bg-gradient-to-br from-[#485563] to-[#29323c]',
  },
  {
    id: 'citrus',
    name: 'Citrus',
    from: '#FDC830',
    to: '#F37335',
    className: 'bg-gradient-to-br from-[#FDC830] to-[#F37335]',
  },
];

export const DEFAULT_GRADIENT_ID = 'ocean';

export const getGradientById = (id: string): GradientOption => {
  return TEAM_GRADIENTS.find((g) => g.id === id) || TEAM_GRADIENTS[0];
};

export const getGradientStyle = (id: string): React.CSSProperties => {
  const gradient = getGradientById(id);
  if (gradient.via) {
    return {
      background: `linear-gradient(135deg, ${gradient.from} 0%, ${gradient.via} 50%, ${gradient.to} 100%)`,
    };
  }
  return {
    background: `linear-gradient(135deg, ${gradient.from} 0%, ${gradient.to} 100%)`,
  };
};
