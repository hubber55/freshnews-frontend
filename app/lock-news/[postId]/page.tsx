'use client';
export const runtime = 'edge';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Lock, Info, CheckCircle2, ShieldCheck, Copy, Check, ExternalLink, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import Header from '@/app/components/header';
import Footer from '@/app/components/footer';
import { createClient } from '@/lib/supabase/client';

export default function LockNewsPage() {
  const { postId } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [post, setPost] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [days, setDays] = useState(1);
  const [discountSettings, setDiscountSettings] = useState({
    per5Days: 5,
    max: 30
  });
  const [rates, setRates] = useState({
    pos2: 500,
    pos8: 400,
    pos16: 300,
    pos24: 200
  });
  const [selectedPos, setSelectedPos] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [upiCopied, setUpiCopied] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);

  const upiId = "fntop@ptyes";
  const whatsappNumber = "+919037242045";
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      try {
        const authRes = await fetch('/api/auth/me');
        const authData = await authRes.json();
        if (authData.name !== null) {
          setUser(authData);
        }
        setLoadingAuth(false);

        const [postRes, settingsRes] = await Promise.all([
          fetch(`/api/posts/${postId}`),
          fetch('/api/admin/settings')
        ]);
        
        const postData = await postRes.json();
        const settingsData = await settingsRes.json();
        
        if (postData.post) setPost(postData.post);
        
        if (settingsData.settings) {
          const s = settingsData.settings;
          const getVal = (key: string, def: number) => {
            const found = s.find((x: any) => x.key === key);
            return found ? parseInt(found.value) : def;
          };
          setRates({
            pos2: getVal('lock_rate_pos_2', 500),
            pos8: getVal('lock_rate_pos_8', 400),
            pos16: getVal('lock_rate_pos_16', 300),
            pos24: getVal('lock_rate_pos_24', 200)
          });
          setDiscountSettings({
            per5Days: getVal('discount_per_5_days', 5),
            max: getVal('max_discount', 30)
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [postId]);

  const calculateTotal = (rate: number) => {
    const discount = Math.min(discountSettings.max, Math.floor(days / 5) * discountSettings.per5Days);
    const subtotal = rate * days;
    const finalAmount = Math.round(subtotal * (1 - discount / 100));
    return { subtotal, discount, finalAmount };
  };

  const startPayment = (pos: number) => {
    if (loadingAuth) return;
    if (!user) {
      router.push(`/login?redirect=/lock-news/${postId}`);
      return;
    }
    const { finalAmount } = calculateTotal(rates[pos === 2 ? 'pos2' : pos === 8 ? 'pos8' : pos === 16 ? 'pos16' : 'pos24']);
    setPaymentData({ pos, amount: finalAmount });
    setShowPayment(true);
  };

  const copyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setUpiCopied(true);
  };

  const submitLockRequest = async () => {
    if (loadingAuth) return;
    if (!user) {
      router.push(`/login?redirect=/lock-news/${postId}`);
      return;
    }
    setProcessing(true);
    try {
      const res = await fetch('/api/admin/payments/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'lock_news',
          targetId: parseInt(postId as string), 
          position: paymentData.pos,
          days: days,
          amount: paymentData.amount
        })
      });
      
      if (res.ok) {
        alert('Payment request submitted! Please share your screenshot on WhatsApp.');
        window.open(`https://wa.me/${whatsappNumber.replace('+', '')}?text=Payment%20Screenshot%20for%20Post%20ID%3A%20${postId}%20(Locked%20Pos%20${paymentData.pos})`, '_blank');
        router.push('/');
      } else {
        const data = await res.json();
        alert('Error: ' + (data.error || 'Failed to submit request'));
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00ffff]"></div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center text-white">Post not found</div>
        <Footer />
      </div>
    );
  }

  const options = [
    { pos: 2, rate: rates.pos2, label: 'Top 2nd Position' },
    { pos: 8, rate: rates.pos8, label: 'Top 8th Position' },
    { pos: 16, rate: rates.pos16, label: 'Top 16th Position' },
    { pos: 24, rate: rates.pos24, label: 'Top 24th Position' },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
      <Header />
      <main className="flex-1 max-w-[1100px] mx-auto w-full px-5 py-10">
        <Link href="/" className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-white mb-8 transition-colors">
          <ChevronLeft size={20} />
          Back to Feed
        </Link>

        <div className="bg-[#161b22] border border-[var(--border)] rounded-3xl p-8 shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#00ffff]/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#ffd42a]/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />

          <div className="relative z-10">
            {!showPayment ? (
              <>
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-4 rounded-2xl bg-[#00ffff]/10">
                    <Lock size={32} className="text-[#00ffff]" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tight">Lock News</h1>
                    <p className="text-[#ffd42a] text-[10px] font-black uppercase tracking-widest">Pin your content on the homepage</p>
                  </div>
                </div>

                <div className="mb-8 p-5 rounded-2xl bg-[#00ffff]/5 border border-[#00ffff]/10 flex items-start gap-4">
                  <HelpCircle size={24} className="text-[#00ffff] shrink-0 mt-0.5" />
                  <p className="text-sm text-white/90 leading-relaxed font-medium">
                    If this news is important and you want this to be seen by all, then you can lock this news on the homepage itself for as many days as you need.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 mb-8">
                  <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">Selected Post</p>
                  <h2 className="text-xl font-bold text-white leading-tight">{post.title}</h2>
                </div>

                <div className="mb-10 p-6 rounded-2xl bg-[#0d1117] border border-[var(--border)]">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-1">Lock Duration</h3>
                      <p className="text-[10px] text-[#ffd42a] font-black uppercase tracking-widest">Select how many days you want to pin this news</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <input 
                        type="range" 
                        min="1" 
                        max="30" 
                        value={days}
                        onChange={(e) => setDays(parseInt(e.target.value))}
                        className="w-48 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#00ffff]"
                      />
                      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 min-w-[100px] justify-center">
                        <span className="text-xl font-black text-[#00ffff]">{days}</span>
                        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Days</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {options.map((opt) => {
                    const { subtotal, discount, finalAmount } = calculateTotal(opt.rate);
                    return (
                      <button
                        key={opt.pos}
                        onClick={() => startPayment(opt.pos)}
                        onMouseEnter={() => setSelectedPos(opt.pos)}
                        disabled={processing}
                        className="group relative flex flex-col items-start p-6 rounded-2xl bg-[#0d1117] border border-[var(--border)] hover:border-[#00ffff] hover:bg-[#00ffff]/5 transition-all text-left overflow-hidden"
                      >
                        <div className="mb-4 p-2 rounded-lg bg-white/5 group-hover:bg-[#00ffff]/10 transition-colors">
                          <CheckCircle2 size={24} className="text-[var(--text-muted)] group-hover:text-[#00ffff] transition-colors" />
                        </div>
                        <div className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1 group-hover:text-white transition-colors">{opt.label}</div>
                        
                        <div className="flex flex-col mb-4">
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-white">₹ {finalAmount}</span>
                            {discount > 0 && (
                              <span className="text-xs font-bold text-gray-500 line-through">₹ {subtotal}</span>
                            )}
                          </div>
                          <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                            {days} day{days > 1 ? 's' : ''} {discount > 0 && <span className="text-[#90ee90] ml-1">({discount}% Off)</span>}
                          </div>
                        </div>

                        <div className="mt-auto w-full py-3 rounded-xl bg-white/5 border border-white/10 text-center text-[11px] font-black uppercase tracking-widest group-hover:bg-[#00ffff] group-hover:text-black group-hover:border-[#00ffff] transition-all">
                          Lock Position {opt.pos}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-12 p-8 rounded-2xl bg-[#00ffff]/5 border border-[#00ffff]/20 flex items-start gap-6">
                  <ShieldCheck size={32} className="text-[#00ffff] shrink-0" />
                  <div>
                    <h4 className="text-xl font-black text-[#00ffff] uppercase tracking-wider mb-3">How it works?</h4>
                    <ul className="text-sm text-white/90 space-y-3 leading-relaxed font-bold">
                      <li className="flex items-start gap-2">
                        <span className="text-[#00ffff] mt-1">•</span>
                        <span>Locked news remains at the selected position regardless of newer posts coming in.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#00ffff] mt-1">•</span>
                        <span>Pricing is based on visibility tiers (higher positions have higher priority).</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#00ffff] mt-1">•</span>
                        <span>Discount applies automatically for longer durations (5% for every 5 days, up to {discountSettings.max}%).</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#00ffff] mt-1">•</span>
                        <span>Your content will stay locked on {selectedPos ? `${selectedPos}${selectedPos === 2 ? 'nd' : 'th'}` : 'the selected'} position exactly for {days} day{days > 1 ? 's' : ''} from activation.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </>
            ) : (
              <div className="max-w-[600px] mx-auto text-center py-10">
                <div className="mb-8">
                  <div className="w-20 h-20 bg-[#ffd42a]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={40} className="text-[#ffd42a]" />
                  </div>
                  <h2 className="text-3xl font-black text-white uppercase tracking-tight mb-2">Complete Payment</h2>
                  <p className="text-[#ffd42a] text-[10px] font-black uppercase tracking-widest">Secure your slot via UPI</p>
                </div>

                <div className="bg-[#0d1117] border border-[var(--border)] rounded-3xl p-8 mb-8 text-left">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest">Amount to Pay</span>
                    <span className="text-3xl font-black text-[#00ffff]">₹ {paymentData.amount}</span>
                  </div>

                  <div className="mb-8">
                    <label className="block text-[10px] font-bold text-[#ffd42a] uppercase tracking-widest mb-3">UPI ID (fntop@ptyes)</label>
                    <div className="flex items-center gap-2 p-4 rounded-xl bg-white/5 border border-white/10 group">
                      <code className="flex-1 text-[#ffd42a] font-mono text-lg">{upiId}</code>
                      <button 
                        onClick={copyUpi}
                        className="p-2 rounded-lg bg-white/5 hover:bg-[#00ffff]/20 text-[var(--text-muted)] hover:text-[#00ffff] transition-all"
                        title="Copy UPI ID"
                      >
                        {upiCopied ? <Check size={20} className="text-[#90ee90]" /> : <Copy size={20} />}
                      </button>
                    </div>
                  </div>

                  {/* Sliding Instructions */}
                  <div className={`overflow-hidden transition-all duration-500 ease-in-out ${upiCopied ? 'max-h-[500px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
                    <div className="p-6 rounded-2xl bg-[#00ffff]/5 border border-[#00ffff]/10">
                      <h3 className="text-[#00ffff] font-black uppercase tracking-widest text-sm mb-4">Instructions</h3>
                      <ol className="text-sm text-white space-y-4 list-decimal pl-4 font-bold">
                        <li>Go to any <span className="text-[#ffd42a]">UPI APP</span> (GPay, PhonePe, Paytm, etc.).</li>
                        <li>Paste the copied ID and enter the exact amount.</li>
                        <li>
                          After payment, share the screenshot to 
                          <a 
                            href={`https://wa.me/${whatsappNumber.replace('+', '')}`} 
                            target="_blank" 
                            className="inline-flex items-center gap-1 mx-1 text-[#00ffff] hover:underline font-bold"
                          >
                            {whatsappNumber} <ExternalLink size={12} />
                          </a>
                        </li>
                        <li className="text-white italic">Invoice will be sent to your WhatsApp ID shortly after verification.</li>
                      </ol>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <button
                    onClick={submitLockRequest}
                    disabled={!upiCopied || processing}
                    className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-lg shadow-xl transition-all ${
                      upiCopied && !processing 
                      ? 'bg-[#00ffff] text-black hover:scale-[1.02] active:scale-95' 
                      : 'bg-white/5 text-white/30 border border-white/10 cursor-not-allowed'
                    }`}
                  >
                    {processing ? 'Processing...' : 'Confirm & Notify Admin'}
                  </button>
                  <button 
                    onClick={() => setShowPayment(false)}
                    className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest hover:text-white transition-colors"
                  >
                    Cancel & Change Position
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
