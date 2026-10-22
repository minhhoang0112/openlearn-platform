import React, { useState } from 'react';
import {
  X,
  CreditCard,
  QrCode,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Zap,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'vi' | 'en';
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  lang
}) => {
  if (!isOpen) return null;

  const [selectedPlan, setSelectedPlan] = useState<'month' | 'quarter' | 'year'>('year');
  const [isPaid, setIsPaid] = useState(false);

  interface PlanInfo {
    price: string;
    usd: string;
    label: string;
    perMonth: string;
    badge?: string;
  }

  const plans: Record<'month' | 'quarter' | 'year', PlanInfo> = {
    month: { price: '199.000 ₫', usd: '$7.98', label: '1 Tháng', perMonth: '199.000 ₫/tháng' },
    quarter: { price: '679.000 ₫', usd: '$26.99', label: '3 Tháng (Quý)', perMonth: '226.000 ₫/tháng' },
    year: { price: '1.320.000 ₫', usd: '$52.98', label: '1 Năm (Best Value)', perMonth: '110.000 ₫/tháng', badge: 'Tiết kiệm 45%' }
  };

  const handleSimulatePayment = () => {
    setIsPaid(true);
    confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-[16px] border bg-background shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 bg-card">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-emerald-600 text-white font-black">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-foreground">
                Nâng Cấp Gói OpenQuiz Premium VIP
              </h2>
              <p className="text-xs text-muted-foreground">
                Mở khóa không giới hạn AI Speaking, chấm điểm PronScore và phòng hội thoại
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {!isPaid ? (
            <>
              {/* Plan Selection */}
              <div className="grid gap-3 sm:grid-cols-3">
                {(['month', 'quarter', 'year'] as const).map((key) => {
                  const p = plans[key];
                  const isSelected = selectedPlan === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedPlan(key)}
                      className={`relative rounded-[12px] border p-4 text-left transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-500/5 ring-2 ring-emerald-500/20 shadow-sm'
                          : 'bg-card hover:border-border'
                      }`}
                    >
                      {p.badge && (
                        <span className="absolute -top-2.5 right-3 rounded-full bg-emerald-600 text-white px-2 py-0.5 text-[9px] font-black uppercase">
                          {p.badge}
                        </span>
                      )}
                      <p className="text-xs font-bold text-muted-foreground">{p.label}</p>
                      <p className="text-lg font-black text-foreground mt-1">{p.price}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{p.perMonth}</p>
                    </button>
                  );
                })}
              </div>

              {/* VietQR Bank Transfer Details */}
              <div className="rounded-[12px] border bg-card p-5 space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-2">
                    <QrCode className="h-5 w-5 text-emerald-600" />
                    <span className="text-xs font-bold text-foreground">
                      Thanh toán chuyển khoản quét mã VietQR tự động
                    </span>
                  </div>
                  <span className="text-xs font-black text-emerald-600">
                    {plans[selectedPlan].price}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6 justify-center py-2">
                  {/* QR Image Box */}
                  <div className="relative flex flex-col items-center justify-center p-3 rounded-[12px] border bg-white shadow-xs">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=2902266403-OPENQUIZ-${selectedPlan}`}
                      alt="VietQR Payment Code"
                      className="h-36 w-36 object-contain"
                    />
                    <span className="text-[10px] font-bold text-zinc-600 mt-2">
                      Quét bằng app ngân hàng bất kỳ
                    </span>
                  </div>

                  {/* Transfer Specs */}
                  <div className="space-y-2 text-xs w-full max-w-xs">
                    <div>
                      <span className="text-muted-foreground">Ngân hàng:</span>
                      <p className="font-bold text-foreground">MB Bank (Quân Đội)</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Số tài khoản:</span>
                      <p className="font-mono font-bold text-foreground">0388999888</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Chủ tài khoản:</span>
                      <p className="font-bold text-foreground">CONG TY TNHH OPENQUIZ</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Nội dung chuyển khoản:</span>
                      <p className="font-mono font-black text-emerald-600 bg-muted/60 p-1.5 rounded">
                        OPQ VIP {selectedPlan.toUpperCase()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleSimulatePayment}
                    className="w-full flex items-center justify-center gap-2 rounded-[8px] bg-emerald-600 hover:bg-emerald-700 text-white py-3 text-xs font-bold shadow-md transition-all active:scale-95"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span>Giả lập thanh toán thành công (Test Webhook)</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-10 space-y-4 animate-in zoom-in-95">
              <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-black text-foreground">
                Thanh Toán Thành Công!
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Tài khoản của bạn đã được nâng cấp lên <b>OpenQuiz Premium VIP</b>. Bạn hiện có quyền truy cập không giới hạn vào tất cả khóa học và AI Speaking Coach.
              </p>
              <button
                onClick={onClose}
                className="rounded-[8px] bg-primary text-primary-foreground px-6 py-2.5 text-xs font-bold hover:bg-primary/90"
              >
                Bắt đầu học ngay
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
