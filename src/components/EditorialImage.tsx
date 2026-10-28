import React, { useState } from 'react';
import { getCategoryBySlug } from '../config/site.ts';

interface EditorialImageProps {
  src?: string | null;
  alt: string;
  categorySlug?: string;
  sourceName?: string;
  attribution?: string | null;
  aspectClass?: string;
  className?: string;
  showCaption?: boolean;
}

export const EditorialImage: React.FC<EditorialImageProps> = ({
  src,
  alt,
  categorySlug = 'world',
  sourceName = 'Primary Wire',
  attribution,
  aspectClass = 'aspect-[16/9]',
  className = '',
  showCaption = false,
}) => {
  const [hasError, setHasError] = useState(false);
  const category = getCategoryBySlug(categorySlug);

  const showFallback = !src || hasError;

  return (
    <figure className={`w-full ${className}`}>
      <div
        className={`relative w-full overflow-hidden bg-[#EBE6DF] dark:bg-slate-900 border border-stone-200/80 dark:border-slate-800 ${aspectClass}`}
      >
        {!showFallback ? (
          <img
            src={src!}
            alt={alt}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setHasError(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.01]"
          />
        ) : (
          <div className="w-full h-full flex flex-col justify-between p-5 bg-gradient-to-br from-[#F3EFE6] via-[#EBE6DF] to-[#E2DCD0] dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 text-stone-700 dark:text-slate-300 select-none">
            <div className="flex items-center justify-between text-[11px] font-mono-tabular tracking-wider uppercase text-stone-500 dark:text-slate-400 border-b border-stone-300/70 dark:border-slate-800 pb-2">
              <span>{category.shortName} Desk</span>
              <span>·</span>
              <span className="truncate max-w-[180px]">{sourceName}</span>
            </div>
            <div className="my-auto py-2">
              <p className="font-editorial text-sm sm:text-base font-medium leading-snug text-stone-800 dark:text-slate-200 line-clamp-3">
                {alt}
              </p>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono-tabular text-stone-500 dark:text-slate-500 pt-2 border-t border-stone-300/60 dark:border-slate-800/80">
              <span>Verified Wire Dispatch</span>
              <span>Text-First Edition</span>
            </div>
          </div>
        )}
      </div>
      {showCaption && (attribution || sourceName) && (
        <figcaption className="text-xs font-serif italic text-stone-500 dark:text-slate-400 mt-2">
          {attribution || `Source dispatch via ${sourceName}`}
        </figcaption>
      )}
    </figure>
  );
};
