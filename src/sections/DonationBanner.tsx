import { useState } from 'react';
import { Coffee, X, Headphones, Sparkles } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';

export function DonationBanner() {
  const { settings } = useSettings();
  const [isVisible, setIsVisible] = useState(true);
  const [showPremium, setShowPremium] = useState(false);

  if (!isVisible || settings.hideDonationBanner) return null;

  const handleDonateClick = () => {
    // Open Buy Me a Coffee in new tab
    window.open('https://www.buymeacoffee.com', '_blank');
  };

  const handlePremiumClick = () => {
    setShowPremium(!showPremium);
  };

  return (
    <div className="relative mx-3 mb-2">
      {showPremium ? (
        <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 border border-amber-500/20 rounded-xl p-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-amber-400">RadioX Premium</span>
            </div>
            <button
              onClick={() => setShowPremium(false)}
              className="p-0.5 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-3 h-3 text-gray-500" />
            </button>
          </div>
          <div className="space-y-1.5 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-amber-400" />
              <span className="text-[10px] text-gray-400">HD Audio Quality (320kbps+)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-amber-400" />
              <span className="text-[10px] text-gray-400">Unlimited Favorites</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-amber-400" />
              <span className="text-[10px] text-gray-400">Sleep Timer & Alarm</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-amber-400" />
              <span className="text-[10px] text-gray-400">No Donation Banner</span>
            </div>
          </div>
          <button
            onClick={handleDonateClick}
            className="w-full py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-[11px] font-semibold text-black transition-all"
          >
            Upgrade - Coming Soon
          </button>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-emerald-500/10 border border-emerald-500/20 rounded-xl p-2.5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
            <Headphones className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-gray-300">
              Enjoying RadioX?
            </p>
            <p className="text-[10px] text-gray-500">
              Support us to keep the music free
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handlePremiumClick}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-medium text-amber-400 hover:text-amber-300 transition-all"
            >
              <Sparkles className="w-3 h-3 inline mr-1" />
              Premium
            </button>
            <button
              onClick={handleDonateClick}
              className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-[10px] font-medium text-white transition-all flex items-center gap-1"
            >
              <Coffee className="w-3 h-3" />
              Tip
            </button>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="p-0.5 rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
          >
            <X className="w-3 h-3 text-gray-600" />
          </button>
        </div>
      )}
    </div>
  );
}