import React from 'react';
import { Mail, MapPin, Building, Globe, ExternalLink } from 'lucide-react';

interface FooterProps {
  lang: 'vi' | 'en';
  setLang: (lang: 'vi' | 'en') => void;
}

export const Footer: React.FC<FooterProps> = ({ lang, setLang }) => {
  return (
    <footer className="border-t bg-card text-card-foreground text-xs">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Column 1: Brand & Company info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <img src="/logo.svg" alt="OpenQuiz" className="h-8 w-8 rounded-lg shadow-2xs" />
              <span className="text-base font-extrabold tracking-tight">OpenQuiz</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {lang === 'vi'
                ? 'Làm chủ kỹ năng nói ngoại ngữ thông qua flashcard AI và luyện tập hội thoại thực tế.'
                : 'Master speaking foreign languages through AI-powered flashcards and real conversation practice.'}
            </p>

            <div className="space-y-2 text-muted-foreground pt-2">
              <div className="flex items-start gap-2">
                <Building className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                <p>Công ty TNHH OpenQuiz • MST: 2902266403</p>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                <p>Trụ sở: Hưng Nghĩa 4, Lam Thành, Nghệ An, Việt Nam</p>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                <a href="mailto:official@openquiz.ai" className="hover:underline text-foreground font-medium">
                  official@openquiz.ai
                </a>
              </div>
            </div>

            {/* Language switch */}
            <div className="pt-2">
              <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                {lang === 'vi' ? 'Ngôn ngữ hiển thị' : 'Language'}
              </label>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as 'vi' | 'en')}
                className="rounded-[6px] border border-border bg-background px-2.5 py-1 text-xs font-semibold text-foreground"
              >
                <option value="vi">Tiếng Việt (VI)</option>
                <option value="en">English (EN)</option>
              </select>
            </div>
          </div>

          {/* Column 2: Policies */}
          <div>
            <h4 className="text-sm font-bold text-foreground mb-4">
              {lang === 'vi' ? 'Chính sách' : 'Policies'}
            </h4>
            <ul className="space-y-2.5 text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">{lang === 'vi' ? 'Chính sách bảo mật' : 'Privacy Policy'}</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">{lang === 'vi' ? 'Bảo vệ dữ liệu cá nhân' : 'Personal Data Protection'}</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">{lang === 'vi' ? 'Chính sách biểu phí' : 'Pricing Policy'}</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">{lang === 'vi' ? 'Chính sách thanh toán' : 'Payment Policy'}</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">{lang === 'vi' ? 'Chính sách hoàn tiền' : 'Refund Policy'}</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">{lang === 'vi' ? 'Kênh hỗ trợ trực tuyến' : 'Online Support Channels'}</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">{lang === 'vi' ? 'Chính sách dùng thử & gói miễn phí' : 'Free Plan & Trial Policy'}</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">{lang === 'vi' ? 'Chính sách gia hạn / Hủy dịch vụ' : 'Renewal / Cancellation Policy'}</a></li>
            </ul>
          </div>

          {/* Column 3: Terms & Regulations */}
          <div>
            <h4 className="text-sm font-bold text-foreground mb-4">
              {lang === 'vi' ? 'Điều khoản & Quy định' : 'Terms & Regulations'}
            </h4>
            <ul className="space-y-2.5 text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">{lang === 'vi' ? 'Quyền và nghĩa vụ' : 'Rights & Obligations'}</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">{lang === 'vi' ? 'Giải quyết khiếu nại' : 'Complaint Handling'}</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">{lang === 'vi' ? 'Điều kiện & giới hạn dịch vụ' : 'Service Conditions & Limitations'}</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">{lang === 'vi' ? 'Cung cấp dịch vụ' : 'Service Provision'}</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">{lang === 'vi' ? 'Chấm dứt dịch vụ' : 'Service Termination'}</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">{lang === 'vi' ? 'Điều khoản giao dịch' : 'Transaction Terms'}</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">{lang === 'vi' ? 'Miễn trừ trách nhiệm' : 'Disclaimer'}</a></li>
            </ul>
          </div>

          {/* Column 4: Pricing & Payment methods */}
          <div>
            <h4 className="text-sm font-bold text-foreground mb-4">
              {lang === 'vi' ? 'Gói cước Premium' : 'Pricing'}
            </h4>
            <div className="rounded-[10px] border bg-muted/40 p-3 mb-4 space-y-1.5">
              <p className="font-semibold text-foreground">159k/tháng</p>
              <p className="text-muted-foreground">289k/quý • 790k/năm</p>
              <a
                href="#pricing"
                className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold hover:underline pt-1 text-xs"
              >
                <span>openquiz.ai/pricing</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <h4 className="text-sm font-bold text-foreground mb-2">
              {lang === 'vi' ? 'Phương thức thanh toán' : 'Payment methods'}
            </h4>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded border bg-card text-[11px] font-bold text-foreground shadow-2xs">
                QR Pay
              </span>
              <span className="px-2.5 py-1 rounded border bg-card text-[11px] font-bold text-pink-600 shadow-2xs">
                MoMo
              </span>
              <span className="px-2.5 py-1 rounded border bg-card text-[11px] font-bold text-blue-700 shadow-2xs">
                VISA
              </span>
            </div>
          </div>
        </div>

        {/* Legal Disclaimer & Copyright */}
        <div className="mt-12 pt-6 border-t space-y-3 text-[11px] text-muted-foreground">
          <p className="leading-relaxed">
            OpenQuiz là nền tảng độc lập, không liên kết hoặc được tài trợ bởi IELTS, TOEIC, TOEFL, HSK, JLPT, TOPIK hay bất kỳ nhà xuất bản giáo dục nào. Mọi nhãn hiệu thuộc quyền sở hữu của chủ sở hữu tương ứng.
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
            <p>© 2026 OpenQuiz Company Limited. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:underline">Terms of Service</a>
              <a href="#" className="hover:underline">Privacy Policy</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

