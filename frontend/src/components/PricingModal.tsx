import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { X, Loader2, ShieldCheck, Zap } from 'lucide-react';

interface PricingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function PricingModal({ isOpen, onClose }: PricingModalProps) {
    const { user, userData } = useAuth();
    const [loadingPack, setLoadingPack] = useState<string | null>(null);

    if (!isOpen) return null;

    const handlePurchase = async (packId: string) => {
        if (!user) {
            alert("Please login first to buy credits!");
            return;
        }

        setLoadingPack(packId);
        try {
            // 1. Get an order ID from backend
            const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${API}/api/payments/create-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pack_id: packId, user_id: user.uid }),
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.detail || 'Failed to create order');

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error Razorpay is loaded via external script
            const rzp = new window.Razorpay({
                key: data.key_id,
                amount: data.amount,
                currency: data.currency,
                name: "AtmosLofi",
                description: "Purchase Credits",
                order_id: data.order_id,
                handler: async function (response: Record<string, string>) {
                    try {
                        const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                        const verifyRes = await fetch(`${API}/api/payments/verify`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                pack_id: packId,
                                user_id: user.uid
                            }),
                        });
                        const vData = await verifyRes.json();
                        if (verifyRes.ok) {
                            alert(`Success! Check your new balance.`);
                            onClose();
                        } else {
                            alert(`Verification failed: ${vData.detail}`);
                        }
                    } catch (e) {
                        alert(`Error verifying payment: ${e}`);
                    }
                },
                prefill: {
                    name: user.displayName || 'Customer',
                    email: user.email || '',
                },
                theme: {
                    color: "#6366f1"
                }
            });

            rzp.on('payment.failed', function (response: { error: { description: string } }) {
                alert(`Payment Failed: ${response.error.description}`);
            });

            rzp.open();
        } catch (error) {
            console.error(error);
            alert("Checkout Error: " + error);
        } finally {
            setLoadingPack(null);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="relative w-full max-w-2xl bg-[#0a0a0a] rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
                <div className="p-6 md:p-8">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <h2 className="text-3xl font-display font-semibold mb-2">Buy Credits</h2>
                    <p className="text-white/60 mb-6">
                        Unlock premium features like <strong className="text-emerald-400">Copyright-Free Mode</strong> and priority processing.
                        Current Balance: <strong className="text-white">{userData?.credits || 0} Credits</strong>
                    </p>

                    <div className="grid md:grid-cols-2 gap-4">
                        {/* Pack 1 */}
                        <div className="p-6 rounded-2xl border border-white/10 bg-white/5 hover:border-indigo-500/50 transition-all flex flex-col">
                            <h3 className="text-xl font-medium mb-1">Starter Pack</h3>
                            <div className="text-3xl font-bold mb-4 font-display">₹99</div>
                            <ul className="space-y-3 mb-6 flex-1 text-sm text-white/80">
                                <li className="flex items-center gap-2"><Zap className="w-4 h-4 text-indigo-400" /> 20 Premium Conversions</li>
                                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-400" /> Copyright-Free Generation</li>
                            </ul>
                            <button
                                onClick={() => handlePurchase('pack_20')}
                                disabled={loadingPack !== null}
                                className="w-full py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-medium transition-colors flex items-center justify-center"
                            >
                                {loadingPack === 'pack_20' ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Buy 20 Credits'}
                            </button>
                        </div>

                        {/* Pack 2 */}
                        <div className="p-6 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 hover:border-indigo-500/80 transition-all flex flex-col relative overflow-hidden">
                            <div className="absolute top-0 right-0 bg-indigo-500 text-xs font-bold px-3 py-1 rounded-bl-lg">POPULAR</div>
                            <h3 className="text-xl font-medium mb-1">Creator Pack</h3>
                            <div className="text-3xl font-bold mb-4 font-display">₹199</div>
                            <ul className="space-y-3 mb-6 flex-1 text-sm text-white/80">
                                <li className="flex items-center gap-2"><Zap className="w-4 h-4 text-indigo-400" /> 50 Premium Conversions</li>
                                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-400" /> Copyright-Free Generation</li>
                            </ul>
                            <button
                                onClick={() => handlePurchase('pack_50')}
                                disabled={loadingPack !== null}
                                className="w-full py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-medium transition-colors flex items-center justify-center"
                            >
                                {loadingPack === 'pack_50' ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Buy 50 Credits'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
