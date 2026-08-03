import React from 'react';

/**
 * Official EMBELLISH HOME SVG Brand Emblem & Logo Component
 * Recreates the oval 'EH' monogram, serif title, and diamond tagline separator.
 */
export const Logo = ({ size = 'md', variant = 'vertical', mode = 'dark', className = '' }) => {
  // Dimensions and scaling based on size
  const sizes = {
    sm: { width: 140, emblemSize: 32, fontSizeTitle: 'text-xs', fontSizeSub: 'text-[8px]' },
    md: { width: 180, emblemSize: 44, fontSizeTitle: 'text-sm', fontSizeSub: 'text-[9px]' },
    lg: { width: 220, emblemSize: 60, fontSizeTitle: 'text-base', fontSizeSub: 'text-[10px]' },
    xl: { width: 280, emblemSize: 84, fontSizeTitle: 'text-xl', fontSizeSub: 'text-[12px]' },
  };

  const currentSize = sizes[size] || sizes.md;

  const strokeColor = mode === 'light' ? '#6E5235' : '#B59573';
  const textColor = mode === 'light' ? '#3B2A1A' : '#F3E9DD';
  const subtextColor = mode === 'light' ? '#6E5235' : '#B59573';

  if (variant === 'horizontal') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {/* Emblem Badge Icon */}
        <svg
          width={currentSize.emblemSize}
          height={currentSize.emblemSize * 1.3}
          viewBox="0 0 100 130"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0 drop-shadow-sm"
        >
          {/* Oval frame */}
          <rect
            x="5"
            y="5"
            width="90"
            height="120"
            rx="45"
            stroke={strokeColor}
            strokeWidth="3.5"
            fill="none"
          />
          {/* E Monogram */}
          <text
            x="36"
            y="65"
            fontFamily="Cormorant Garamond, Georgia, serif"
            fontSize="52"
            fontWeight="600"
            fill={strokeColor}
            textAnchor="middle"
          >
            E
          </text>
          {/* H Monogram */}
          <text
            x="64"
            y="95"
            fontFamily="Cormorant Garamond, Georgia, serif"
            fontSize="52"
            fontWeight="600"
            fill={strokeColor}
            textAnchor="middle"
          >
            H
          </text>
        </svg>

        <div className="flex flex-col">
          <span
            className={` tracking-[0.2em] font-semibold ${currentSize.fontSizeTitle}`}
            style={{ color: textColor }}
          >
            EMBELL
          </span>
          <div className="flex items-center gap-1.5 my-0.5">
            <div className="h-[1px] w-6 bg-brand-500/40"></div>
            <div className="w-1.5 h-1.5 rotate-45 bg-brand-500 shrink-0"></div>
            <div className="h-[1px] w-6 bg-brand-500/40"></div>
          </div>
          <span
            className={`tracking-[0.15em] uppercase font-sans font-medium ${currentSize.fontSizeSub}`}
            style={{ color: subtextColor }}
          >
            LUXURY CURTAIN DESIGNING & PRODUCTION
          </span>
        </div>
      </div>
    );
  }

  // Vertical (Card/Hero) Layout
  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      {/* Oval Emblem Frame */}
      <svg
        width={currentSize.emblemSize * 1.5}
        height={currentSize.emblemSize * 2.0}
        viewBox="0 0 120 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="mb-3 drop-shadow-md"
      >
        <rect
          x="6"
          y="6"
          width="108"
          height="148"
          rx="54"
          stroke={strokeColor}
          strokeWidth="3.5"
          fill="none"
        />
        {/* E Monogram */}
        <text
          x="44"
          y="78"
          fontFamily="Cormorant Garamond, Georgia, serif"
          fontSize="66"
          fontWeight="600"
          fill={strokeColor}
          textAnchor="middle"
        >
          E
        </text>
        {/* H Monogram */}
        <text
          x="76"
          y="114"
          fontFamily="Cormorant Garamond, Georgia, serif"
          fontSize="66"
          fontWeight="600"
          fill={strokeColor}
          textAnchor="middle"
        >
          H
        </text>
      </svg>

      {/* Main Title */}
      <h2
        className={` tracking-[0.25em] font-semibold uppercase ${currentSize.fontSizeTitle}`}
        style={{ color: textColor }}
      >
        EMBELLISH HOME
      </h2>

      {/* Diamond Divider */}
      <div className="flex items-center gap-2 my-2 w-full justify-center max-w-[200px]">
        <div className="h-[1px] flex-1 bg-brand-500/40"></div>
        <div className="w-2 h-2 rotate-45 bg-brand-500 shrink-0"></div>
        <div className="h-[1px] flex-1 bg-brand-500/40"></div>
      </div>

      {/* Tagline */}
      <p
        className={`tracking-[0.2em] uppercase font-sans font-medium ${currentSize.fontSizeSub}`}
        style={{ color: subtextColor }}
      >
        CURTAIN DESIGNING & PRODUCTION
      </p>
    </div>
  );
};

export default Logo;
