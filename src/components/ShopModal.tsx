import React, { useState } from 'react';
import {
  X,
  Coins,
  Flame,
  Shield,
  Gift,
  Award,
  Sparkles,
  ShoppingBag,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'vi' | 'en';
}

export const ShopModal: React.FC<ShopModalProps> = ({ isOpen, onClose, lang }) => {
  if (!isOpen) return null;

  const [userCoins, setUserCoins] = useState(350);
  const [streakCount, setStreakCount] = useState(14);
  const [freezeCount, setFreezeCount] = useState(2);
  const [lootboxResult, setLootboxResult] = useState<string | null>(null);

  const handleBuyFreeze = () => {
    if (userCoins >= 50) {
      setUserCoins(userCoins - 50);
      setFreezeCount(freezeCount + 1);
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.6 } });
    }
  };

  const handleOpenLootbox = () => {
    if (userCoins >= 100) {
      setUserCoins(userCoins - 100);
      const prizes = [
        'Huy hiệu "Thần Đồng Phát Âm"',
        'Thẻ Nhân Đôi XP Trong 24 Giờ',
        '+150 Xu May Mắn!',
        'Khung Avatar Rồng Vàng Độc Quyền',
        '2 Thẻ Đóng Băng Streak Tối Thượng'
      ];
      const win = prizes[Math.floor(Math.random() * prizes.length)];
      setLootboxResult(win);
      confetti({ particleCount: 100, spread: 90, origin: { y: 0.5 } });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-[16px] border bg-background shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 bg-card">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-amber-500 text-white font-black">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-foreground">
                Cửa Hàng Vật Phẩm & Gamification
              </h2>
              <p className="text-xs text-muted-foreground">
                Đổi xu thưởng tích lũy khi học bài để nâng cấp chuỗi ngày học
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Currency & Streak Status Bar */}
        <div className="bg-muted/40 border-b px-6 py-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
              <Coins className="h-4 w-4" />
              <span>{userCoins} Xu</span>
            </span>
            <span className="flex items-center gap-1.5 font-bold text-red-600 dark:text-red-400">
              <Flame className="h-4 w-4" />
              <span>Streak: {streakCount} ngày</span>
            </span>
            <span className="flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400">
              <Shield className="h-4 w-4" />
              <span>{freezeCount} Đóng băng</span>
            </span>
          </div>
        </div>

        {/* Store Items List */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Item 1: Streak Freeze */}
          <div className="rounded-[12px] border bg-card p-4 flex items-center justify-between shadow-xs hover:border-emerald-500/30 transition-all">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-blue-500/10 text-blue-600 border border-blue-500/20">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">
                  Đóng Băng Chuỗi (Streak Freeze v2)
                </h4>
                <p className="text-xs text-muted-foreground">
                  Tự động bảo vệ chuỗi ngày học nếu bạn bận rộn quên học trong 24 giờ.
                </p>
              </div>
            </div>

            <button
              onClick={handleBuyFreeze}
              disabled={userCoins < 50}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-[8px] bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 disabled:opacity-40"
            >
              <Coins className="h-3.5 w-3.5" />
              <span>50 Xu</span>
            </button>
          </div>

          {/* Item 2: Lootbox Mystery Chest */}
          <div className="rounded-[12px] border bg-gradient-to-r from-purple-500/10 via-card to-amber-500/10 p-5 shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-purple-500/20 text-purple-600 border border-purple-500/30 animate-bounce">
                  <Gift className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-foreground flex items-center gap-1.5">
                    Rương Bí Ẩn Hoàng Kim (Lootbox)
                    <Sparkles className="h-4 w-4 text-amber-500" />
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Cơ hội trúng avatar độc quyền, thẻ x2 XP hoặc hàng trăm xu thưởng.
                  </p>
                </div>
              </div>

              <button
                onClick={handleOpenLootbox}
                disabled={userCoins < 100}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-[8px] bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 disabled:opacity-40 shadow-sm"
              >
                <Coins className="h-3.5 w-3.5" />
                <span>100 Xu</span>
              </button>
            </div>

            {lootboxResult && (
              <div className="rounded-[8px] bg-purple-100 dark:bg-purple-950/60 border border-purple-500/40 p-3 text-center text-xs font-black text-purple-900 dark:text-purple-200 animate-in zoom-in-95">
                🎉 Bạn vừa mở được: <b>{lootboxResult}</b>!
              </div>
            )}
          </div>

          {/* Item 3: Golden Avatar Frame */}
          <div className="rounded-[12px] border bg-card p-4 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-amber-500/10 text-amber-600 border border-amber-500/20">
                <Award className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">
                  Huy Hiệu Học Giả Tinh Hoa
                </h4>
                <p className="text-xs text-muted-foreground">
                  Gắn nhãn đặc biệt trên bảng xếp hạng Ranking và trang cộng đồng Discussion.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                if (userCoins >= 200) {
                  setUserCoins(userCoins - 200);
                  confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
                }
              }}
              disabled={userCoins < 200}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-[8px] bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 disabled:opacity-40"
            >
              <Coins className="h-3.5 w-3.5" />
              <span>200 Xu</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

