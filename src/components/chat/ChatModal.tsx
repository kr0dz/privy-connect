import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Lock, Sparkles, Gem } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { useModals } from "@/contexts/ModalContext";
import { useChat } from "@/hooks/useChat";
import useWallet from "@/hooks/useWallet";
import { authService } from "@/services/auth/authService";
import { Message } from "@/types/chat";
import { toast } from "sonner";
import TipModal from "@/components/chat/TipModal";
import BuyCoinsModal from "@/components/modals/BuyCoinsModal";

interface ChatModalProps {
	open: boolean;
	onClose: () => void;
	creatorId?: string;
	creatorName: string;
	creatorInitial: string;
}

const ChatModal = ({ open, onClose, creatorId, creatorName, creatorInitial }: ChatModalProps) => {
	const [input, setInput] = useState("");
	const [isTyping, setIsTyping] = useState(false);
	const [userId, setUserId] = useState<string | null>(null);
	const [tipOpen, setTipOpen] = useState(false);
	const [buyCoinsOpen, setBuyCoinsOpen] = useState(false);
	const scrollRef = useRef<HTMLDivElement>(null);
	const { openUnlock, trackClick } = useModals();
	 const { balance, buyCoins, deductCoins, refreshBalance } = useWallet();
	const {
		messages,
		paymentState,
		startCheckout,
		unlockMessage,
		clearPaymentError,
		confirmMessageUnlocked,
		loadConversation,
		subscribeToConversation,
		sendMessageWithMemory,
	} = useChat(creatorId ?? null, userId);

	useEffect(() => {
		let mounted = true;
		authService.getSession()
			.then((session) => {
				if (mounted) {
					setUserId(session?.user.id ?? null);
				}
			})
			.catch(() => {
				if (mounted) {
					setUserId(null);
				}
			});
		return () => {
			mounted = false;
		};
	}, []);

	// Reset on open
	useEffect(() => {
		if (!open) {
			return;
		}

		setInput("");
		clearPaymentError();
		setIsTyping(false);
	}, [open, clearPaymentError]);

	useEffect(() => {
		if (!open || !creatorId || !userId) {
			return;
		}

		let active = true;
		setIsTyping(true);
		void loadConversation(80).finally(() => {
			if (active) {
				setIsTyping(false);
			}
		});

		const unsubscribe = subscribeToConversation();
		return () => {
			active = false;
			unsubscribe();
		};
	}, [open, creatorId, userId, loadConversation, subscribeToConversation]);

	useEffect(() => {
		if (!open || typeof window === "undefined") {
			return;
		}

		const params = new URLSearchParams(window.location.search);
		const success = params.get("stripe_success") || params.get("session_id");
		const messageId = params.get("message_id");

		if (success && messageId) {
			confirmMessageUnlocked(messageId);
			void loadConversation(80);
		}

		if (success && messageId) {
			params.delete("stripe_success");
			params.delete("session_id");
			params.delete("message_id");
			const next = params.toString();
			const nextUrl = `${window.location.pathname}${next ? `?${next}` : ""}${window.location.hash}`;
			window.history.replaceState({}, "", nextUrl);
		}
	}, [open, confirmMessageUnlocked, loadConversation]);

	// Auto-scroll
	useEffect(() => {
		scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
	}, [messages, isTyping]);

	const handleSend = async () => {
		const content = input.trim();
		if (!content || !creatorId || !userId) {
			return;
		}

		setInput("");
		setIsTyping(true);
		trackClick("chat_message_sent");

		try {
			const result = await sendMessageWithMemory(content, "text");
			if (result.error) {
				if (result.error.includes("Insufficient coins")) {
					toast.error(result.error, {
						description: "Compra monedas para seguir enviando mensajes premium.",
					});
				}
				return;
			}

			if (result.coinsSpent && result.coinsSpent > 0) {
				deductCoins(result.coinsSpent);
				void refreshBalance();
			}
		} finally {
			setIsTyping(false);
		}
	};

	const handleUnlock = async (message: Message) => {
		if (!message.locked) {
			return;
		}

		const unlockResult = await unlockMessage(message.id, message.price ?? 0);
		if (!unlockResult.ok) {
			return;
		}

		if (!unlockResult.requiresCheckout) {
			confirmMessageUnlocked(message.id);
			void loadConversation(80);
			return;
		}

		const currentUrl = typeof window !== "undefined" ? window.location.href : "";
		const checkoutResult = await startCheckout({
			amount: unlockResult.amount ?? message.price ?? 0,
			currency: "usd",
			description: `Unlock de mensaje con ${creatorName}`,
			messageId: message.id,
			metadata: {
				messageId: message.id,
				creatorName,
			},
			successUrl: `${currentUrl.split("?")[0]}?session_id={CHECKOUT_SESSION_ID}&message_id=${encodeURIComponent(message.id)}`,
			cancelUrl: `${currentUrl.split("?")[0]}?stripe_canceled=1`,
		});

		if (checkoutResult.ok && checkoutResult.checkoutUrl) {
			window.open(checkoutResult.checkoutUrl, "_blank", "noopener,noreferrer");
		}
	};

	return (
		<AnimatePresence>
			{open && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-background/80 backdrop-blur-sm"
					onClick={onClose}
				>
					<motion.div
						initial={{ opacity: 0, y: 40 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 40 }}
						transition={{ type: "spring", damping: 25, stiffness: 300 }}
						className="w-full sm:max-w-md h-[85vh] sm:h-[600px] bg-card border border-border/50 sm:rounded-2xl flex flex-col shadow-elevated overflow-hidden"
						onClick={(e) => e.stopPropagation()}
					>
						{/* Header */}
						<div className="flex items-center justify-between p-4 border-b border-border/50">
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-full bg-muted border-2 border-primary/20 flex items-center justify-center text-sm font-bold text-primary">
									{creatorInitial}
								</div>
								<div>
									<h4 className="text-sm font-semibold text-foreground">{creatorName}</h4>
									<div className="flex items-center gap-1.5">
										<div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
										<span className="text-xs text-muted-foreground">Active now</span>
									</div>
								</div>
							</div>
							<div className="flex items-center gap-2">
								<div className="text-xs px-2 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary">
									Coins: {Math.floor(balance)}
								</div>
							<Button size="sm" variant="gold-outline" onClick={() => setBuyCoinsOpen(true)}>
									Buy Coins
								</Button>
								<button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
									<X className="w-5 h-5" />
								</button>
							</div>
						</div>

						{/* Messages */}
						<div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
							{messages.map((msg) => (
								<motion.div
									key={msg.id}
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									className={`flex ${msg.senderId === userId ? "justify-end" : "justify-start"}`}
								>
									{msg.locked && !msg.paid ? (
										<div className="w-full bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
											<Lock className="w-5 h-5 text-primary mx-auto mb-2" />
											<p className="text-sm text-foreground mb-3">{msg.content}</p>
											<div className="flex flex-col gap-2">
												{msg.locked ? (
													<Button
														variant="gold"
														size="sm"
														onClick={() => void handleUnlock(msg)}
														disabled={paymentState.inProgress}
													>
														<Lock className="w-3.5 h-3.5 mr-1" />
														{paymentState.inProgress ? "Procesando pago..." : `Unlock Reply — $${msg.price ?? 3}`}
													</Button>
												) : null}
												<Button
													variant="gold-outline"
													size="sm"
													onClick={() => {
														onClose();
														setTimeout(() => openUnlock({ title: "Custom Request", price: "$10", description: `Request something personal from ${creatorName}` }), 200);
													}}
												>
													<Sparkles className="w-3.5 h-3.5 mr-1" /> Request Something — $10
												</Button>
												{paymentState.error ? (
													<p className="text-xs text-destructive mt-1">{paymentState.error}</p>
												) : null}
											</div>
										</div>
									) : (
										<div
											className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
												msg.senderId === userId
													? "bg-primary text-primary-foreground rounded-br-md"
													: "bg-secondary text-foreground rounded-bl-md"
											}`}
										>
											{msg.content}
										</div>
									)}
								</motion.div>
							))}

							{/* Typing indicator */}
							{isTyping && (
								<motion.div
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									className="flex items-center gap-1 px-4 py-2.5 bg-secondary rounded-2xl rounded-bl-md w-fit"
								>
									<div className="flex gap-1">
										{[0, 1, 2].map((i) => (
											<motion.div
												key={i}
												className="w-2 h-2 rounded-full bg-muted-foreground"
												animate={{ y: [0, -4, 0] }}
												transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
											/>
										))}
									</div>
								</motion.div>
							)}
						</div>

						{/* Input */}
						<div className="p-4 border-t border-border/50">
							{balance <= 5 ? (
								<p className="text-xs text-amber-400 mb-2">Saldo bajo de monedas. Compra mas para seguir chateando.</p>
							) : null}
							<div className="flex gap-2">
								<Button
									variant="ghost"
									size="icon"
									className="shrink-0 rounded-xl text-primary hover:bg-primary/10"
									title="Enviar propina"
									disabled={!creatorId || !userId}
									onClick={() => setTipOpen(true)}
								>
									<Gem className="w-4 h-4" />
								</Button>
								<input
									type="text"
									value={input}
									onChange={(e) => setInput(e.target.value)}
									onKeyDown={(e) => e.key === "Enter" && void handleSend()}
									placeholder="Type a message…"
									className="flex-1 bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
									disabled={!creatorId || !userId || paymentState.inProgress}
								/>
								<Button variant="gold" size="icon" onClick={() => void handleSend()} className="shrink-0 rounded-xl" disabled={!creatorId || !userId}>
									<Send className="w-4 h-4" />
								</Button>
							</div>
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
		{creatorId && userId ? (
			<TipModal
				open={tipOpen}
				onClose={() => setTipOpen(false)}
				creatorId={creatorId}
				creatorName={creatorName}
				fanId={userId}
			/>
		) : null}
		<BuyCoinsModal open={buyCoinsOpen} onClose={() => setBuyCoinsOpen(false)} />
	);
};

export default ChatModal;
