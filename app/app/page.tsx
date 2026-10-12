 "use client";

import "./workspace.css";
import { parseContactImport } from "@/lib/contact-import.mjs";
import { normalizeSavedContacts } from "@/lib/contact-storage.mjs";
import { normalizeTransactionHistory } from "@/lib/transaction-history.mjs";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount, useDisconnect, useSwitchChain } from "wagmi";
import {
  Activity, ArrowLeftRight, ArrowRight, ArrowUpRight, AudioLines,
  Bell, ChartNoAxesCombined, Check, ChevronDown, CircleHelp, Command,
  Copy, Download, ExternalLink, Eye, EyeOff, FileUp, Globe2, History, LayoutDashboard,
  LockKeyhole, Mic, MoreHorizontal, Plus, Search, Send, Settings2,
  ShieldCheck, Sparkles, TrendingDown, TrendingUp, Wallet, X, Zap, RefreshCw
} from "lucide-react";

type Message = { role: "assistant" | "user"; text: string };
type SavedContact = { id: string; name: string; address: string; createdAt: number };
type Intent = { recipient: string; recipientLabel?: string; amount: string; asset: string; network: string; reason: string };
type WalletBalances = { native: string | null; status: string; updatedAt: number | null };
type PaymentTx = { hash: string; status: "submitted" | "confirmed" | "failed" | "pending"; detail: string };
type StoredTransaction = { hash: string; from: string; to: string; amount: string; asset: string; network: string; status: "submitted" | "confirmed" | "failed" | "pending"; detail: string; createdAt: number; updatedAt: number; blockNumber?: string; note?: string; policySummary?: string };
const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const SUPPORTED_DRAFT_ASSETS = new Set(["USDC"]);
type Eip1193Provider = { request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>; on?: (event: string, handler: (...args: unknown[]) => void) => void; removeListener?: (event: string, handler: (...args: unknown[]) => void) => void };
type SpeechRecognitionLike = { lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number; onresult: ((event: { results?: ArrayLike<ArrayLike<{ transcript?: string }> & { isFinal?: boolean }> }) => void) | null; onerror: ((event: { error?: string }) => void) | null; onend: (() => void) | null; start: () => void; stop: () => void };
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type SpeechWindow = Window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };
const ARC_TESTNET_CHAIN_ID = 5042002;

const markets = [
  { symbol: "ETH", name: "Ethereum", mark: "Ξ" },
  { symbol: "SOL", name: "Solana", mark: "◎" },
  { symbol: "BTC", name: "Bitcoin", mark: "₿" },
  { symbol: "USDC", name: "USD Coin", mark: "$" },
];
type MarketQuote = { symbol: string; name: string; priceUsd: number; change24h: number };
type MarketApiResponse = { assets?: MarketQuote[]; source?: string; updatedAt?: string; error?: string };
type SwapCapabilityResponse = { provider?: { name?: string }; status?: "not_ready" | "ready"; quoteAvailable?: boolean; executionAvailable?: boolean; reason?: string; supportedEnvironment?: { arcTestnet?: { supportedTokens?: string[]; caveat?: string } } };
type RiskPreflightResponse = { status?: "blocked" | "review" | "clear"; allowedToContinue?: boolean; checks?: Array<{ code: string; severity: "block" | "warning"; message: string }>; disclaimer?: string; error?: string };

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: value >= 100 ? 2 : value >= 1 ? 4 : 6 }).format(value);
}

const starters = [
  { icon: ArrowUpRight, label: "Send money", prompt: "Prepare to send 25 USDC to Alex for lunch" },
  { icon: ArrowLeftRight, label: "Swap tokens", prompt: "Help me swap 100 USDC for SOL" },
  { icon: ChartNoAxesCombined, label: "Market check", prompt: "Give me a quick crypto market overview" },
  { icon: ShieldCheck, label: "Check a wallet", prompt: "What should I check before sending crypto to a new address?" },
];


export default function SonusWorkspace() {
  const [active, setActive] = useState("Overview");
  const [currentDateLabel, setCurrentDateLabel] = useState("");
  const [greeting, setGreeting] = useState("Hello");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: "Hey. I’m Sonus. What would you like to do with your crypto today?" }
  ]);
  const messagesRef = useRef<Message[]>(messages);
  const [intent, setIntent] = useState<Intent | null>(null);
  const intentRef = useRef<Intent | null>(intent);
  const [savedContacts, setSavedContacts] = useState<SavedContact[]>([]);
  const [contactsReady, setContactsReady] = useState(false);
  const [contactNameInput, setContactNameInput] = useState("");
  const [contactAddressInput, setContactAddressInput] = useState("");
  const [contactFormError, setContactFormError] = useState("");
  const [contactImportBusy, setContactImportBusy] = useState(false);
  const contactImportRef = useRef<HTMLInputElement | null>(null);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [notice, setNotice] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<Eip1193Provider | undefined>();
  const [walletChainId, setWalletChainId] = useState<number | null>(null);
  const [walletBusy, setWalletBusy] = useState(false);
  const [balanceBusy, setBalanceBusy] = useState(false);
  const [paymentTx, setPaymentTx] = useState<PaymentTx | null>(null);
  const [transactionHistory, setTransactionHistory] = useState<StoredTransaction[]>([]);
  const [historyReady, setHistoryReady] = useState(false);
  const [historyRefreshing, setHistoryRefreshing] = useState(false);
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("all");
  const [spendingRules, setSpendingRules] = useState({ enabled: false, maxSingleUsdc: "100", dailyCapUsdc: "500", requireSavedRecipient: false });
  const [spendingRulesReady, setSpendingRulesReady] = useState(false);
  const [spendingRulesStorageError, setSpendingRulesStorageError] = useState(false);
  const [assistantBusy, setAssistantBusy] = useState(false);
  const [walletBalances, setWalletBalances] = useState<WalletBalances>({ native: null, status: "Not loaded", updatedAt: null });
  const [marketQuotes, setMarketQuotes] = useState<MarketQuote[]>([]);
  const [marketLoading, setMarketLoading] = useState(true);
  const [marketError, setMarketError] = useState("");
  const [marketUpdatedAt, setMarketUpdatedAt] = useState<string | null>(null);
  const [marketRefreshNonce, setMarketRefreshNonce] = useState(0);
  const [swapCapabilities, setSwapCapabilities] = useState<SwapCapabilityResponse | null>(null);
  const [swapCapabilitiesError, setSwapCapabilitiesError] = useState("");
  const [riskRecipientInput, setRiskRecipientInput] = useState("");
  const [riskAmountInput, setRiskAmountInput] = useState("25");
  const [riskCheckBusy, setRiskCheckBusy] = useState(false);
  const [riskCheckResult, setRiskCheckResult] = useState<RiskPreflightResponse | null>(null);
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const voiceConversationEnabled = useRef(false);
  const voiceReplyEnabled = useRef(false);
  const voiceRestartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceSubmitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const realtimePeer = useRef<RTCPeerConnection | null>(null);
  const realtimeStream = useRef<MediaStream | null>(null);
  const realtimeChannel = useRef<RTCDataChannel | null>(null);
  const realtimeAudio = useRef<HTMLAudioElement | null>(null);
  const realtimeMode = useRef(false);
  const realtimeAssistantAudioText = useRef("");
  const realtimeAssistantPlainText = useRef("");
  const paymentSubmissionLock = useRef(false);
  const { address: connectedAddress, chainId: connectedChainId, isConnected, connector } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const { openConnectModal } = useConnectModal();

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    intentRef.current = intent;
  }, [intent]);

  useEffect(() => {
    return () => {
      voiceConversationEnabled.current = false;
      voiceReplyEnabled.current = false;
      if (voiceRestartTimer.current) clearTimeout(voiceRestartTimer.current);
      if (voiceSubmitTimer.current) clearTimeout(voiceSubmitTimer.current);
      recognition.current?.stop();
      stopRealtimeVoice();
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
  }, []);

  const visibleTransactions = transactionHistory.filter(item => {
    const query = historyQuery.trim().toLowerCase();
    const matchesQuery = !query || [item.to, item.from, item.amount, item.asset, item.network, item.hash, item.note || ""].some(value => value.toLowerCase().includes(query));
    const matchesStatus = historyStatusFilter === "all" || item.status === historyStatusFilter;
    return matchesQuery && matchesStatus;
  });

  const spendingDayStart = new Date();
  spendingDayStart.setUTCHours(0, 0, 0, 0);
  const spendingUsedToday = walletAddress ? transactionHistory
    .filter(item => item.from.toLowerCase() === walletAddress.toLowerCase() && item.network === "Arc Testnet" && item.asset === "USDC" && item.status !== "failed" && item.createdAt >= spendingDayStart.getTime())
    .reduce((sum, item) => sum + Number(item.amount), 0) : 0;
  const spendingRemainingToday = Math.max(0, Number(spendingRules.dailyCapUsdc) - spendingUsedToday);

  const marketRows = markets.map(asset => {
    const quote = marketQuotes.find(item => item.symbol === asset.symbol);
    return {
      ...asset,
      price: quote ? formatUsd(quote.priceUsd) : marketLoading ? "Loading…" : "Unavailable",
      change: quote ? (quote.change24h > 0 ? "+" : "") + quote.change24h.toFixed(2) + "%" : "—",
      up: quote ? quote.change24h >= 0 : true
    };
  });

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("sonus:transactions:v1");
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setTransactionHistory(normalizeTransactionHistory(parsed) as StoredTransaction[]);
        }
      }
    } catch {
      setNotice("Saved transaction history could not be read from this browser.");
    } finally {
      setHistoryReady(true);
    }
  }, []);

  useEffect(() => {
    if (!historyReady) return;
    try {
      window.localStorage.setItem("sonus:transactions:v1", JSON.stringify(transactionHistory.slice(0, 100)));
    } catch {
      setNotice("Transaction history could not be saved. Check available browser storage.");
    }
  }, [transactionHistory, historyReady]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("sonus:spending-rules:v1");
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (parsed && typeof parsed === "object") {
          const rules = parsed as { enabled?: unknown; maxSingleUsdc?: unknown; dailyCapUsdc?: unknown; requireSavedRecipient?: unknown };
          const validLimit = (value: unknown) => typeof value === "string" && value.length <= 12 && /^\d+(?:\.\d{1,6})?$/.test(value) && Number.isFinite(Number(value)) && Number(value) > 0 && Number(value) <= 1000000000;
          if (typeof rules.enabled === "boolean" && validLimit(rules.maxSingleUsdc) && validLimit(rules.dailyCapUsdc) && (rules.requireSavedRecipient === undefined || typeof rules.requireSavedRecipient === "boolean")) {
            setSpendingRules({ enabled: rules.enabled, maxSingleUsdc: rules.maxSingleUsdc as string, dailyCapUsdc: rules.dailyCapUsdc as string, requireSavedRecipient: rules.requireSavedRecipient === true });
          } else {
            setSpendingRulesStorageError(true);
            setNotice("Saved spending rules are invalid. Payments are paused until you correct and save the rules.");
          }
        }
      }
    } catch {
      setSpendingRulesStorageError(true);
      setNotice("Spending rules could not be read from this browser. Sending is paused until the rules can be saved.");
    } finally {
      setSpendingRulesReady(true);
    }
  }, []);

  useEffect(() => {
    function syncSpendingRules(event: StorageEvent) {
      if (event.key !== "sonus:spending-rules:v1") return;
      if (!event.newValue) {
        setSpendingRulesStorageError(true);
        setNotice("Spending rules were removed in another tab. Sending is paused until you save the rules again.");
        return;
      }
      try {
        const parsed: unknown = JSON.parse(event.newValue);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid rule object");
        const rules = parsed as { enabled?: unknown; maxSingleUsdc?: unknown; dailyCapUsdc?: unknown; requireSavedRecipient?: unknown };
        const validLimit = (value: unknown) => typeof value === "string" && value.length <= 12 && /^\d+(?:\.\d{1,6})?$/.test(value) && Number.isFinite(Number(value)) && Number(value) > 0 && Number(value) <= 1000000000;
        if (typeof rules.enabled !== "boolean" || !validLimit(rules.maxSingleUsdc) || !validLimit(rules.dailyCapUsdc) || (rules.requireSavedRecipient !== undefined && typeof rules.requireSavedRecipient !== "boolean")) {
          throw new Error("invalid rule values");
        }
        setSpendingRules({ enabled: rules.enabled, maxSingleUsdc: rules.maxSingleUsdc as string, dailyCapUsdc: rules.dailyCapUsdc as string, requireSavedRecipient: rules.requireSavedRecipient === true });
        setSpendingRulesStorageError(false);
        setNotice("Spending rules updated from another Sonus tab.");
      } catch {
        setSpendingRulesStorageError(true);
        setNotice("Spending rules changed to an invalid configuration in another tab. Sending is paused until you save valid rules.");
      }
    }
    window.addEventListener("storage", syncSpendingRules);
    return () => window.removeEventListener("storage", syncSpendingRules);
  }, []);

  useEffect(() => {
    if (!spendingRulesReady) return;
    const validLimit = (value: string) => /^\d+(?:\.\d{1,6})?$/.test(value) && Number.isFinite(Number(value)) && Number(value) > 0 && Number(value) <= 1000000000;
    if (!validLimit(spendingRules.maxSingleUsdc) || !validLimit(spendingRules.dailyCapUsdc)) return;
    try {
      window.localStorage.setItem("sonus:spending-rules:v1", JSON.stringify(spendingRules));
    } catch {
      setSpendingRulesStorageError(true);
      setNotice("Spending rules could not be saved. Sending is paused until browser storage works.");
    }
  }, [spendingRules, spendingRulesReady]);

  useEffect(() => {
    const now = new Date();
    setCurrentDateLabel(new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(now).toUpperCase());
    setGreeting(now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening");
  }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("sonus:contacts:v1");
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setSavedContacts(normalizeSavedContacts(parsed) as SavedContact[]);
        }
      }
    } catch {
      setContactFormError("Saved contacts could not be read from this browser.");
    } finally {
      setContactsReady(true);
    }
  }, []);

  useEffect(() => {
    if (!contactsReady) return;
    try {
      window.localStorage.setItem("sonus:contacts:v1", JSON.stringify(savedContacts));
    } catch {
      setContactFormError("Contacts could not be saved. Check available browser storage.");
    }
  }, [savedContacts, contactsReady]);

  useEffect(() => {
    let active = true;
    fetch("/api/swap/capabilities", { cache: "no-store" })
      .then(async response => {
        const data = await response.json() as SwapCapabilityResponse;
        if (!response.ok) throw new Error("Swap provider status is unavailable.");
        if (active) { setSwapCapabilities(data); setSwapCapabilitiesError(""); }
      })
      .catch(error => { if (active) setSwapCapabilitiesError(error instanceof Error ? error.message : "Swap provider status is unavailable."); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    let requestController: AbortController | null = null;
    const loadMarket = async () => {
      requestController?.abort();
      const controller = new AbortController();
      requestController = controller;
      setMarketLoading(true);
      try {
        const response = await fetch("/api/market", { signal: controller.signal, cache: "no-store" });
        const data = await response.json() as MarketApiResponse;
        if (!response.ok || !Array.isArray(data.assets)) throw new Error(data.error || "Market data is unavailable.");
        if (!active) return;
        setMarketQuotes(data.assets.filter(item => Number.isFinite(item.priceUsd) && Number.isFinite(item.change24h)));
        setMarketUpdatedAt(data.updatedAt || new Date().toISOString());
        setMarketError("");
      } catch (error) {
        if (!active || (error instanceof Error && error.name === "AbortError")) return;
        setMarketQuotes([]);
        setMarketUpdatedAt(null);
        setMarketError(error instanceof Error ? error.message : "Market data is unavailable.");
      } finally {
        if (active && requestController === controller) setMarketLoading(false);
      }
    };
    void loadMarket();
    const timer = window.setInterval(loadMarket, 60_000);
    return () => {
      active = false;
      requestController?.abort();
      window.clearInterval(timer);
    };
  }, [marketRefreshNonce]);

  useEffect(() => {
    let active = true;
    setSelectedProvider(undefined);
    if (!isConnected || !connector) return () => { active = false; };
    void connector.getProvider()
      .then(provider => { if (active) setSelectedProvider(provider as Eip1193Provider); })
      .catch(() => {
        if (active) {
          setSelectedProvider(undefined);
          setNotice("Could not access the selected wallet provider. Disconnect and choose the wallet again.");
        }
      });
    return () => { active = false; };
  }, [connector, isConnected]);

  useEffect(() => {
    const address = isConnected && connectedAddress ? connectedAddress : null;
    const chain = isConnected && typeof connectedChainId === "number" ? connectedChainId : null;
    setWalletAddress(address);
    setWalletChainId(chain);
    setWalletBalances({ native: null, status: address ? "Refresh required" : "Not connected", updatedAt: null });
  }, [connectedAddress, connectedChainId, isConnected]);

  function connectWallet() {
    if (walletAddress) {
      setNotice("Wallet connected: " + walletAddress + (walletChainId ? " · Chain ID " + walletChainId : "") + ". Sonus has not requested a signature or moved funds.");
      return;
    }
    if (!openConnectModal) {
      setNotice("The wallet selector is unavailable. Refresh Sonus and try again.");
      return;
    }
    openConnectModal();
  }

  async function switchToArcTestnet() {
    if (!isConnected || !walletAddress) { setNotice("Choose and connect a wallet before switching networks."); return; }
    try {
      await switchChainAsync({ chainId: ARC_TESTNET_CHAIN_ID });
      setNotice("Network switch requested for the selected wallet. Verify Arc Testnet is active before proceeding.");
    } catch (error) {
      setNotice("Network switch cancelled or failed: " + (error instanceof Error ? error.message : "request failed") + ". No transaction was sent.");
    }
  }

  async function refreshWalletBalances() {
    const provider = selectedProvider;
    if (!provider || !walletAddress) { setNotice("Connect a browser wallet before reading balances."); return; }
    setBalanceBusy(true);
    setWalletBalances(current => ({ ...current, status: "Reading wallet…" }));
    try {
      const chainValue = await provider.request({ method: "eth_chainId" }) as string;
      const chainId = Number.parseInt(chainValue, 16);
      if (chainId !== ARC_TESTNET_CHAIN_ID) {
        setWalletChainId(Number.isFinite(chainId) ? chainId : null);
        setWalletBalances({ native: null, status: "Switch to Arc Testnet to read native USDC.", updatedAt: null });
        return;
      }
      const accounts = await provider.request({ method: "eth_accounts" }) as string[];
      const account = accounts?.[0];
      if (!account || account.toLowerCase() !== walletAddress.toLowerCase()) {
        setWalletBalances({ native: null, status: "Wallet account changed. Reconnect and retry.", updatedAt: null });
        return;
      }
      const raw = await provider.request({ method: "eth_getBalance", params: [account, "latest"] }) as string;
      const wei = BigInt(raw);
      const whole = wei / 1000000000000000000n;
      const fractional = (wei % 1000000000000000000n) / 1000000000000n;
      const fractionalText = fractional.toString().padStart(6, "0").replace(/0+$/, "");
      const balance = Number(whole).toLocaleString() + (fractionalText ? "." + fractionalText : "");
      setWalletChainId(chainId);
      setWalletBalances({ native: balance, status: "Live native USDC balance · Arc Testnet", updatedAt: Date.now() });
    } catch (error) {
      setWalletBalances({ native: null, status: "Could not read balance: " + (error instanceof Error ? error.message : "request failed"), updatedAt: null });
    } finally { setBalanceBusy(false); }
  }

  async function runRecipientPreflight() {
    if (!walletAddress) {
      setNotice("Connect the wallet you intend to send from before running the payment preflight.");
      return;
    }
    setRiskCheckBusy(true);
    setRiskCheckResult(null);
    try {
      const response = await fetch("/api/risk/preflight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: walletAddress,
          recipient: riskRecipientInput.trim(),
          amount: riskAmountInput.trim(),
          asset: "USDC",
          network: "Arc Testnet",
          chainId: walletChainId ?? 0
        })
      });
      const data = await response.json() as RiskPreflightResponse;
      if (!response.ok) throw new Error(data.error || "The preflight service could not check this payment.");
      setRiskCheckResult(data);
    } catch (error) {
      setRiskCheckResult({ status: "blocked", allowedToContinue: false, checks: [{ code: "preflight_unavailable", severity: "block", message: error instanceof Error ? error.message : "The preflight service is unavailable." }], disclaimer: "No transaction was sent." });
    } finally {
      setRiskCheckBusy(false);
    }
  }


  function exportTransactionHistory() {
    if (!transactionHistory.length) { setNotice("There are no transaction records to export yet."); return; }
    try {
      const payload = JSON.stringify({ exportedAt: new Date().toISOString(), source: "Sonus browser-local transaction memory", transactions: transactionHistory }, null, 2);
      const blob = new Blob([payload], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "sonus-transaction-memory-" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice("Export prepared from this browser. The JSON file includes transaction hashes, addresses, and your personal notes; store it carefully.");
    } catch {
      setNotice("Could not export transaction memory from this browser.");
    }
  }

  async function refreshTransactionStatuses() {
    const unresolved = transactionHistory.filter(item => item.status === "submitted" || item.status === "pending");
    if (!unresolved.length) { setNotice("There are no pending transaction records to refresh."); return; }
    setHistoryRefreshing(true);
    try {
      let refreshed = 0;
      let stillPending = 0;
      for (const item of unresolved) {
        if (item.network !== "Arc Testnet" || item.asset !== "USDC") continue;
        const response = await fetch("/api/transactions/receipt?hash=" + encodeURIComponent(item.hash), {
          cache: "no-store",
          headers: { Accept: "application/json" }
        });
        const payload: unknown = await response.json();
        if (!response.ok || !payload || typeof payload !== "object") {
          throw new Error("Receipt service could not verify " + item.hash.slice(0, 10) + "…");
        }
        const receipt = payload as { status?: unknown; blockNumber?: unknown; confirmations?: unknown; detail?: unknown };
        const blockNumber = typeof receipt.blockNumber === "string" ? receipt.blockNumber : undefined;
        if (receipt.status === "pending") { stillPending++; continue; }
        if (receipt.status === "reorged") {
          recordTransaction({
            hash: item.hash, from: item.from, to: item.to, amount: item.amount, asset: item.asset, network: item.network,
            status: "pending",
            detail: typeof receipt.detail === "string" ? receipt.detail : "Receipt block no longer matches the canonical block. Recheck before taking action.",
            ...(blockNumber ? { blockNumber } : {})
          });
          stillPending++;
          continue;
        }
        if (receipt.status !== "confirmed" && receipt.status !== "failed") {
          throw new Error("Receipt service returned an unrecognized status.");
        }
        const success = receipt.status === "confirmed";
        const confirmations = typeof receipt.confirmations === "number" ? receipt.confirmations : 0;
        const detail = success
          ? "Mined successfully in block " + (blockNumber || "unknown") + " (" + confirmations + " confirmation" + (confirmations === 1 ? "" : "s") + " observed). Verify Arcscan for finality."
          : "The network reports that this transaction reverted. Verify Arcscan before taking further action.";
        recordTransaction({ hash: item.hash, from: item.from, to: item.to, amount: item.amount, asset: item.asset, network: item.network, status: success ? "confirmed" : "failed", detail, ...(blockNumber ? { blockNumber } : {}) });
        refreshed++;
      }
      const parts = [];
      if (refreshed) parts.push("Updated " + refreshed + " mined transaction" + (refreshed === 1 ? "" : "s"));
      if (stillPending) parts.push(stillPending + " still pending");
      setNotice(parts.length ? parts.join("; ") + ". Verify important states in Arcscan; a receipt is a point-in-time snapshot." : "No eligible Arc Testnet USDC transaction records were found to refresh.");
    } catch (error) {
      setNotice("Could not refresh transaction status: " + (error instanceof Error ? error.message : "receipt service unavailable") + ". Pending records were not marked as failed.");
    } finally { setHistoryRefreshing(false); }
  }

  function recordTransaction(update: Omit<StoredTransaction, "createdAt" | "updatedAt"> & { createdAt?: number }) {
    const now = Date.now();
    setTransactionHistory(current => {
      const existing = current.find(item => item.hash.toLowerCase() === update.hash.toLowerCase());
      const record: StoredTransaction = { ...update, note: update.note ?? existing?.note, policySummary: update.policySummary ?? existing?.policySummary, createdAt: existing?.createdAt ?? update.createdAt ?? now, updatedAt: now };
      return [record, ...current.filter(item => item.hash.toLowerCase() !== update.hash.toLowerCase())].slice(0, 100);
    });
  }

  async function sendArcTestnetPayment(intentOverride?: Intent | null) {
    const paymentIntent = intentOverride || intentRef.current || intent;
    if (!paymentIntent) return;
    const provider = selectedProvider;
    if (!provider || !walletAddress) { setNotice("Connect a wallet before sending."); return; }
    if (paymentIntent.network !== "Arc Testnet" || paymentIntent.asset !== "USDC") { setNotice("Sending is enabled only for native USDC on Arc Testnet in this V1 preview."); return; }
    if (!EVM_ADDRESS_RE.test(paymentIntent.recipient)) { setNotice("Recipient must be a wallet address. Names are not resolved yet."); return; }
    const match = paymentIntent.amount.match(/^(\d+)(?:\.(\d{1,6}))?$/);
    if (!match) { setNotice("Enter a positive USDC amount with up to 6 decimal places."); return; }
    const amountUnits6 = BigInt(match[1]) * 1000000n + BigInt((match[2] || "").padEnd(6, "0") || "0");
    if (amountUnits6 <= 0n) { setNotice("Enter an amount greater than zero."); return; }
    const value = amountUnits6 * 1000000000000n;
    if (paymentSubmissionLock.current) { setNotice("A payment attempt is already in progress. Wait for its status before trying again."); return; }
    paymentSubmissionLock.current = true;
    setBalanceBusy(true);
    let submittedHash: string | null = null;
    let transactionSender: string | null = null;
    setNotice("Checking the payment, then opening your wallet for approval.");
    try {
      let chain = await provider.request({ method: "eth_chainId" }) as string;
      if (Number.parseInt(chain, 16) !== ARC_TESTNET_CHAIN_ID) {
        try { await switchChainAsync({ chainId: ARC_TESTNET_CHAIN_ID }); }
        catch { setNotice("Please switch your wallet to Arc Testnet to continue. Nothing was sent."); return; }
        const switchedChain = await provider.request({ method: "eth_chainId" }) as string;
        if (Number.parseInt(switchedChain, 16) !== ARC_TESTNET_CHAIN_ID) { setNotice("Your wallet is not on Arc Testnet yet. Nothing was sent."); return; }
        chain = switchedChain;
      }
      const accounts = await provider.request({ method: "eth_accounts" }) as string[];
      const from = accounts?.[0];
      if (!from || from.toLowerCase() !== walletAddress.toLowerCase()) { setNotice("The active wallet account changed. Reconnect before sending."); return; }
      transactionSender = from;
      if (!spendingRulesReady) { setNotice("Payment rules are still loading. No transaction was sent; try again."); return; }
      if (spendingRulesStorageError) { setNotice("Payment rules could not be read or saved. No transaction was sent; check browser storage and save the rules again."); return; }
      if (spendingRules.requireSavedRecipient) {
        if (!contactsReady || !savedContacts.some(contact => contact.address.toLowerCase() === paymentIntent.recipient.toLowerCase())) {
          setNotice("Recipient rule blocked this payment: this recipient is not in your saved contacts. Save and verify the exact address in Contacts, or disable the saved-recipient rule in Settings.");
          return;
        }
      }
      if (spendingRules.enabled) {
        const maxSingle = Number(spendingRules.maxSingleUsdc);
        const dailyCap = Number(spendingRules.dailyCapUsdc);
        if (!Number.isFinite(maxSingle) || maxSingle <= 0 || !Number.isFinite(dailyCap) || dailyCap <= 0) {
          setNotice("Your spending rules are invalid. Update them in Settings before sending.");
          return;
        }
        const requested = Number(paymentIntent.amount);
        if (requested > maxSingle) {
          setNotice("Spending rule blocked this payment: " + paymentIntent.amount + " USDC exceeds your per-payment limit of " + spendingRules.maxSingleUsdc + " USDC. Change the limit in Settings if you intend to allow it.");
          return;
        }
        const utcDayStart = new Date();
        utcDayStart.setUTCHours(0, 0, 0, 0);
        const alreadyRecordedToday = transactionHistory
          .filter(item => item.from.toLowerCase() === from.toLowerCase() && item.network === "Arc Testnet" && item.asset === "USDC" && item.status !== "failed" && item.createdAt >= utcDayStart.getTime())
          .reduce((sum, item) => sum + Number(item.amount), 0);
        if (alreadyRecordedToday + requested > dailyCap) {
          setNotice("Spending rule blocked this payment: recorded Arc Testnet USDC activity today is " + alreadyRecordedToday.toFixed(2) + " USDC, and this payment would exceed your daily cap of " + spendingRules.dailyCapUsdc + " USDC. This check only sees Sonus records stored in this browser.");
          return;
        }
      }
      const preflightResponse = await fetch("/api/risk/preflight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender: from, recipient: paymentIntent.recipient, amount: paymentIntent.amount, asset: paymentIntent.asset, network: paymentIntent.network, chainId: Number.parseInt(chain, 16) }),
        cache: "no-store",
      });
      if (!preflightResponse.ok) { setNotice("Transaction preflight is unavailable. No transaction was sent; try again later."); return; }
      const preflight = await preflightResponse.json() as { status: string; allowedToContinue: boolean; checks?: { severity: string; message: string }[]; disclaimer?: string };
      if (!preflight.allowedToContinue) {
        const blocking = (preflight.checks || []).filter(check => check.severity === "block").map(check => check.message);
        setNotice("Preflight blocked this payment: " + blocking.join(" "));
        return;
      }
      if (from.toLowerCase() === paymentIntent.recipient.toLowerCase()) { setNotice("Recipient and sender are the same wallet. Check the address before proceeding."); return; }
      const balanceHex = await provider.request({ method: "eth_getBalance", params: [from, "latest"] }) as string;
      if (BigInt(balanceHex) < value) { setNotice("Your wallet balance may not cover this amount. Nothing was sent."); return; }
      const policyLines = [spendingRules.enabled ? "Per-payment limit: " + spendingRules.maxSingleUsdc + " USDC; daily cap: " + spendingRules.dailyCapUsdc + " USDC" : "Amount limits: off", spendingRules.enabled ? "Recorded today before this payment: " + spendingUsedToday.toLocaleString(undefined, { maximumFractionDigits: 6 }) + " USDC" : "", spendingRules.requireSavedRecipient ? "Saved-recipient rule: exact address matched" : "Saved-recipient rule: off"].filter(Boolean);
      const finalChain = await provider.request({ method: "eth_chainId" }) as string;
      if (Number.parseInt(finalChain, 16) !== ARC_TESTNET_CHAIN_ID) { setNotice("Network changed. Please keep your wallet on Arc Testnet and try again."); return; }
      const finalAccounts = await provider.request({ method: "eth_accounts" }) as string[];
      if (!finalAccounts?.[0] || finalAccounts[0].toLowerCase() !== from.toLowerCase()) { setNotice("Your active wallet account changed. Reconnect and try again."); return; }
      setNotice("Your wallet is opening. Review the recipient, amount, and fee there; approve only if correct.");
      const hash = await provider.request({ method: "eth_sendTransaction", params: [{ from, to: paymentIntent.recipient, value: "0x" + value.toString(16) }] }) as string;
      if (!/^0x[a-fA-F0-9]{64}$/.test(hash)) throw new Error("Wallet returned an invalid transaction hash.");
      submittedHash = hash;
      recordTransaction({ hash, from, to: paymentIntent.recipient, amount: paymentIntent.amount, asset: paymentIntent.asset, network: paymentIntent.network, status: "submitted", detail: "Submitted to Arc Testnet. Waiting for a transaction receipt.", policySummary: policyLines.join("; ") });
      setPaymentTx({ hash, status: "submitted", detail: "Submitted to your wallet. Waiting for Arc Testnet confirmation." });
      setNotice("Transaction submitted. Your wallet approved it; waiting for on-chain status.");
      for (let attempt = 0; attempt < 25; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const receipt = await provider.request({ method: "eth_getTransactionReceipt", params: [hash] }) as { status?: string; blockNumber?: string } | null;
        if (receipt) {
          const success = receipt.status === "0x1";
          const blockNumber = receipt.blockNumber ? BigInt(receipt.blockNumber).toString() : undefined;
          const detail = success ? "Confirmed in block " + (blockNumber || "unknown") + "." : "The network reported a failed transaction.";
          recordTransaction({ hash, from, to: paymentIntent.recipient, amount: paymentIntent.amount, asset: paymentIntent.asset, network: paymentIntent.network, status: success ? "confirmed" : "failed", detail, ...(blockNumber ? { blockNumber } : {}) });
          setPaymentTx({ hash, status: success ? "confirmed" : "failed", detail });
          setNotice(success ? "Arc Testnet payment confirmed." : "Transaction was mined but failed. Check the explorer for details.");
          if (success) { setIntent(null); void refreshWalletBalances(); }
          return;
        }
      }
      recordTransaction({ hash, from, to: paymentIntent.recipient, amount: paymentIntent.amount, asset: paymentIntent.asset, network: paymentIntent.network, status: "pending", detail: "No receipt was found during the initial polling window. Check Arcscan before retrying." });
      setPaymentTx({ hash, status: "pending", detail: "Still pending. You can check the transaction on Arcscan." });
      setNotice("Transaction is still pending. Do not resend until you check its status.");
    } catch (error) {
      if (submittedHash && transactionSender) {
        recordTransaction({ hash: submittedHash, from: transactionSender, to: paymentIntent.recipient, amount: paymentIntent.amount, asset: paymentIntent.asset, network: paymentIntent.network, status: "pending", detail: "Status polling was interrupted. Check Arcscan before retrying." });
        setPaymentTx({ hash: submittedHash, status: "pending", detail: "Status polling was interrupted. Check Arcscan before retrying." });
      }
      setNotice("Payment was not confirmed as submitted: " + (error instanceof Error ? error.message : "wallet request failed") + ". Check your wallet and transaction history before retrying.");
    } finally { paymentSubmissionLock.current = false; setBalanceBusy(false); }
  }

  function saveContact(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = contactNameInput.trim().replace(/\\s+/g, " ");
    const address = contactAddressInput.trim();
    if (name.length < 1 || name.length > 50) { setContactFormError("Use a contact name between 1 and 50 characters."); return; }
    if (!EVM_ADDRESS_RE.test(address) || /^0x0{40}$/i.test(address)) { setContactFormError("Enter a valid, non-zero EVM address."); return; }
    if (savedContacts.some(contact => contact.name.toLowerCase() === name.toLowerCase() && contact.address.toLowerCase() !== address.toLowerCase())) {
      setContactFormError("That name already exists. Remove or rename the existing contact first."); return;
    }
    const existing = savedContacts.find(contact => contact.name.toLowerCase() === name.toLowerCase() || contact.address.toLowerCase() === address.toLowerCase());
    const next: SavedContact = { id: existing?.id || (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now())), name, address, createdAt: existing?.createdAt || Date.now() };
    setSavedContacts(current => existing ? current.map(contact => contact.id === existing.id ? next : contact) : [...current, next].slice(-200));
    setContactNameInput("");
    setContactAddressInput("");
    setContactFormError("");
    setNotice("Saved “" + name + "” in this browser only. The address is not identity-verified.");
  }

  function exportContacts() {
    if (!savedContacts.length) {
      setNotice("There are no saved contacts to export yet.");
      return;
    }
    const backup = {
      format: "sonus-contacts-v1",
      exportedAt: new Date().toISOString(),
      contacts: savedContacts.map(({ name, address }) => ({ name, address }))
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "sonus-contacts-backup.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    setNotice("Exported a local JSON backup. Keep it private because it contains recipient addresses.");
  }

  async function importContacts(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setContactFormError("");
    setContactImportBusy(true);
    try {
      if (file.size > 2_000_000) throw new Error("Choose a contacts file under 2 MB.");
      const result = parseContactImport(await file.text(), file.name) as {
        contacts: Array<{ name: string; address: string }>;
        rejected: number;
      };
      const merged = [...savedContacts];
      let added = 0;
      let duplicates = 0;
      let conflicts = 0;
      for (const imported of result.contacts) {
        const addressMatch = merged.find(contact => contact.address.toLowerCase() === imported.address.toLowerCase());
        const nameMatch = merged.find(contact => contact.name.toLowerCase() === imported.name.toLowerCase());
        if (addressMatch) {
          duplicates += 1;
          continue;
        }
        if (nameMatch) {
          conflicts += 1;
          continue;
        }
        if (merged.length >= 200) break;
        const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now() + added);
        merged.push({ id, name: imported.name, address: imported.address, createdAt: Date.now() });
        added += 1;
      }
      setSavedContacts(merged);
      const capacitySkipped = Math.max(0, result.contacts.length - added - duplicates - conflicts);
      setNotice(`Imported ${added} contact${added === 1 ? "" : "s"}. ${duplicates} duplicate address(es), ${conflicts} name conflict(s), ${result.rejected} invalid row(s), and ${capacitySkipped} over-capacity row(s) skipped.`);
      if (!added && result.contacts.length === 0) setContactFormError("No valid contacts were found. Check the file's name and address columns.");
    } catch (error) {
      setContactFormError(error instanceof Error ? error.message : "Could not import this contacts file.");
    } finally {
      setContactImportBusy(false);
    }
  }

  function removeContact(contact: SavedContact) {
    setSavedContacts(current => current.filter(item => item.id !== contact.id));
    setNotice("Removed “" + contact.name + "” from this browser’s address book.");
  }

  function resolveSavedRecipient(value: string) {
    const exact = savedContacts.find(contact => contact.name.toLowerCase() === value.trim().toLowerCase());
    return exact?.address || value;
  }

  function disconnectWalletView() {
    disconnect();
    setWalletAddress(null);
    setWalletChainId(null);
    setWalletBalances({ native: null, status: "Not connected", updatedAt: null });
    setNotice("Wallet disconnected from this Sonus view. To revoke site access completely, manage connected sites in your wallet.");
  }

  const sectionSubtitle = useMemo(() => ({
    Overview: "Your money, in context.",
    Portfolio: "A clearer view of what you hold.",
    Activity: "Every move, in one place.",
    Swap: "Plan an exchange with confidence.",
    Bridge: "Move assets across networks.",
    Stake: "Put eligible assets to work.",
    Intelligence: "Signals, context, and wallet safety.",
    Settings: "Make Sonus work your way."
  } as Record<string, string>)[active] || "Your money, in context.", [active]);

  function speakAssistantReply(text: string) {
    if (!voiceReplyEnabled.current || realtimeMode.current || typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) {
      setNotice("Voice replies are not supported in this browser. Sonus can still show text replies.");
      if (voiceConversationEnabled.current) voiceRestartTimer.current = setTimeout(() => beginVoiceCapture(), 250);
      return;
    }
    window.speechSynthesis.cancel();
    if (voiceRestartTimer.current) clearTimeout(voiceRestartTimer.current);
    const spokenText = text.replace(/0x[a-fA-F0-9]{40}/g, address => savedContacts.find(contact => contact.address.toLowerCase() === address.toLowerCase())?.name || "the recipient address");
    const utterance = new SpeechSynthesisUtterance(spokenText.replace(/\n+/g, ". "));
    utterance.lang = "en-US";
    utterance.rate = 1.04;
    utterance.pitch = 1;
    utterance.onstart = () => setSpeaking(true);
    utterance.onerror = () => {
      setSpeaking(false);
      if (voiceConversationEnabled.current) voiceRestartTimer.current = setTimeout(() => beginVoiceCapture(), 250);
    };
    utterance.onend = () => {
      setSpeaking(false);
      if (voiceConversationEnabled.current) voiceRestartTimer.current = setTimeout(() => beginVoiceCapture(), 250);
    };
    window.speechSynthesis.speak(utterance);
  }

  function appendAssistantReply(text: string) {
    setMessages(current => [...current, { role: "assistant", text }]);
    speakAssistantReply(text);
  }

  async function submitMessage(value = input) {
    const clean = value.trim();
    if (!clean) return;
    const approvalPhrase = /^(?:(?:yes|yeah|yep|approved?|confirmed?|confirm|i approve|i confirm|send it|go ahead|do it|proceed|looks good|correct|okay|ok)(?:[ ,]+(?:please|now|then|it|ahead|that|the|payment|transaction|transfer|send|approve|confirm))*)[.! ]*$/i.test(clean);
    const pendingIntent = intentRef.current;
    if (pendingIntent && approvalPhrase) {
      setInput("");
      setMessages(current => [...current, { role: "user", text: clean }]);
      appendAssistantReply("Opening your wallet now. Check the payment details and approve it there if everything looks right.");
      void sendArcTestnetPayment(pendingIntent);
      return;
    }
    if (assistantBusy) return;
    setInput("");
    setActive("Overview");
    setIntent(null);
    setAssistantBusy(true);
    setMessages(current => [...current, { role: "user", text: clean }]);

    const isLocalMemoryQuestion = /\b(?:payment history|transaction history|recent payments|recent transactions|show me my payments|list my transactions|what did i (?:pay|send)|what was (?:that|the|my) payment for|what was \d+(?:\.\d+)?\s*(?:USDC|USDT|ETH|SOL) for|why did i pay|find (?:my )?(?:payment|transaction))\b/i.test(clean);
    if (isLocalMemoryQuestion) {
      const hashMatch = clean.match(/0x[a-fA-F0-9]{64}/);
      const amountMatch = clean.match(/\b(\d+(?:\.\d+)?)\s*(USDC|USDT|ETH|SOL)\b/i) || clean.match(/\b(?:pay|send|payment of|amount of)\s+(\d+(?:\.\d+)?)(?![a-fA-F0-9])/i);
      const queryTerms = clean.toLowerCase().match(/[a-z0-9]{3,}/g)?.filter(term => !["what", "did", "pay", "send", "was", "that", "the", "for", "why", "show", "list", "find", "recent", "payments", "payment", "transactions", "transaction", "history", "mine", "my"].includes(term) && !["usdc", "usdt", "eth", "sol"].includes(term)) || [];
      let matches = [...transactionHistory];
      if (hashMatch) {
        matches = matches.filter(item => item.hash.toLowerCase() === hashMatch[0].toLowerCase());
      } else if (amountMatch) {
        matches = matches.filter(item => Number(item.amount) === Number(amountMatch[1]) && (!amountMatch[2] || item.asset.toLowerCase() === amountMatch[2].toLowerCase()));
      } else if (queryTerms.length) {
        matches = matches.filter(item => queryTerms.some(term => (item.note || "").toLowerCase().includes(term)));
      } else if (/recent|history|show me|list/i.test(clean)) {
        matches = matches.slice(0, 3);
      } else {
        matches = matches.filter(item => Boolean(item.note));
      }
      const answer = matches.length
        ? "I found these matching records in this browser's Sonus history:\n\n" + matches.slice(0, 3).map(item => "• " + item.amount + " " + item.asset + " to " + item.to.slice(0, 10) + "…" + item.to.slice(-6) + " · " + item.status + " · " + new Date(item.createdAt).toLocaleDateString() + "\n  Note: " + (item.note?.trim() || "No personal note saved.") + "\n  Hash: " + item.hash.slice(0, 12) + "…").join("\n\n") + (matches.length > 3 ? "\n\nShowing 3 of " + matches.length + " matches. Open Activity to search the full local list." : "")
        : transactionHistory.length
          ? "I couldn't find a matching transaction note in this browser's Sonus history. Try a payment amount or a word from its note, or open Activity to search your saved records. Sonus only knows transactions submitted through this browser; this isn't your complete wallet history."
          : "There are no Sonus transaction records in this browser yet. After a wallet-approved Arc Testnet payment is recorded, you can add a note in Activity and ask me about it here.";
      appendAssistantReply(answer);
      setAssistantBusy(false);
      setNotice("Answered from browser-local transaction memory. Transaction records and notes were not sent to the assistant API.");
      return;
    }

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: clean, history: messagesRef.current.slice(-8).map(message => ({ role: message.role, content: message.text })), contacts: savedContacts.map(({ name }) => name) })
      });
      const data = await response.json() as {
        reply?: string;
        intent?: { action?: string; amount?: string | null; asset?: string | null; recipient?: string | null; recipientLabel?: string | null; chain?: string | null; purpose?: string | null; needsClarification?: boolean; clarificationQuestion?: string | null };
        mode?: "ai" | "fallback";
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "Assistant request failed.");
      appendAssistantReply(data.reply || "I couldn't produce a useful response. Please try rephrasing that.");
      const parsed = data.intent;
      if (parsed?.action === "transfer" && parsed.amount && parsed.recipient && parsed.asset && SUPPORTED_DRAFT_ASSETS.has(parsed.asset.toUpperCase())) {
        const resolvedRecipient = resolveSavedRecipient(parsed.recipient);
        if (resolvedRecipient !== parsed.recipient) setNotice("Resolved the name using your local saved contact. This does not verify who controls the address.");
        setIntent({
          recipient: resolvedRecipient,
          recipientLabel: parsed.recipientLabel || savedContacts.find(contact => contact.address.toLowerCase() === resolvedRecipient.toLowerCase())?.name,
          amount: parsed.amount,
          asset: "USDC",
          network: "Arc Testnet",
          reason: parsed.purpose || "Not specified"
        });
        setPaymentTx(null);
      } else if (parsed?.action === "transfer" && (parsed.amount || parsed.recipient)) {
        setNotice(parsed.clarificationQuestion || "Sonus identified a possible transfer, but the draft is incomplete. Provide a valid amount, asset, recipient, and network.");
      }
      if (data.mode === "fallback") setNotice("Sonus is running in limited mode because its AI connection is not configured. Add a valid AI provider key to enable natural conversation.");
    } catch (error) {
      console.error("Sonus assistant request failed", error);
      let health: { configured?: boolean; provider?: string; model?: string } | null = null;
      try { const status = await fetch("/api/assistant", { cache: "no-store" }); health = await status.json(); } catch { /* status check is best-effort */ }
      appendAssistantReply("Sorry, I couldn’t reach my assistant service just now. Please try again in a moment.");
      setNotice(health?.configured ? "Sonus couldn’t connect to " + (health.provider || "the AI provider") + " using " + (health.model || "the configured model") + ". Check the server AI settings." : "No AI provider key is configured on the server. Add it to your deployment environment and restart.");
      setAssistantBusy(false);
    }
  }

  function beginVoiceCapture(startNotice = "Listening… browser voice mode. Replies may have a short pause; tap the mic to end voice mode.") {
    if (typeof window === "undefined" || !voiceConversationEnabled.current) return;
    const speechWindow = window as SpeechWindow;
    const SpeechRecognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      voiceConversationEnabled.current = false;
      voiceReplyEnabled.current = false;
      setNotice("Voice input is not supported in this browser. Try a recent version of Chrome.");
      return;
    }
    const engine = new SpeechRecognition();
    engine.lang = "en-US";
    engine.continuous = true;
    engine.interimResults = true;
    engine.maxAlternatives = 1;
    let currentTranscript = "";
    let latestIsFinal = false;
    engine.onresult = (event) => {
      const results = event.results;
      if (!results) return;
      const finalParts: string[] = [];
      const interimParts: string[] = [];
      for (let index = 0; index < results.length; index++) {
        const result = results[index];
        const transcript = result?.[0]?.transcript?.trim() || "";
        if (!transcript) continue;
        if (result?.isFinal) finalParts.push(transcript);
        else interimParts.push(transcript);
      }
      const finalTranscript = finalParts.join(" ").trim();
      const interimTranscript = interimParts.join(" ").trim();
      currentTranscript = [finalTranscript, interimTranscript].filter(Boolean).join(" ").trim();
      latestIsFinal = Boolean(finalTranscript) && !interimTranscript;
      if (currentTranscript) setInput(currentTranscript);

      if (voiceSubmitTimer.current) clearTimeout(voiceSubmitTimer.current);
      if (latestIsFinal) {
        voiceSubmitTimer.current = setTimeout(() => {
          if (!voiceConversationEnabled.current || !currentTranscript.trim()) return;
          const submitted = currentTranscript.trim();
          currentTranscript = "";
          latestIsFinal = false;
          setListening(false);
          try { engine.stop(); } catch { /* recognition may already have ended */ }
          submitMessage(submitted);
        }, 2300);
      }
    };
    engine.onerror = (event: { error?: string }) => {
      setListening(false);
      if (!voiceConversationEnabled.current) return;
      if (event.error === "no-speech" && voiceConversationEnabled.current) {
        voiceRestartTimer.current = setTimeout(() => beginVoiceCapture(), 350);
        return;
      }
      voiceConversationEnabled.current = false;
      voiceReplyEnabled.current = false;
      setNotice(event.error === "not-allowed"
        ? "Microphone access was denied. Allow microphone access in browser settings and try again."
        : "Voice capture stopped (" + (event.error || "unknown error") + "). Tap the mic to try again.");
    };
    engine.onend = () => setListening(false);
    recognition.current = engine;
    setListening(true);
    setNotice(startNotice);
    try { engine.start(); }
    catch {
      setListening(false);
      voiceConversationEnabled.current = false;
      voiceReplyEnabled.current = false;
      setNotice("Could not start the microphone. Check browser permissions and try again.");
    }
  }

  function stopRealtimeVoice() {
    realtimeMode.current = false;
    realtimeChannel.current?.close();
    realtimePeer.current?.close();
    realtimeStream.current?.getTracks().forEach(track => track.stop());
    if (realtimeAudio.current) {
      realtimeAudio.current.pause();
      realtimeAudio.current.srcObject = null;
    }
    realtimeChannel.current = null;
    realtimePeer.current = null;
    realtimeStream.current = null;
    realtimeAudio.current = null;
    realtimeAssistantAudioText.current = "";
    realtimeAssistantPlainText.current = "";
  }

  async function prepareRealtimePaymentDraft(transcript: string) {
    const latestUserTurn = messagesRef.current.filter(message => message.role === "user").slice(-1)[0]?.text || "";
    const explicitPaymentRequest = /\b(?:send|pay|transfer)\b/i.test(transcript);
    const hasPaymentContext = Boolean(intentRef.current) || /\b(?:send|pay|transfer)\b/i.test(latestUserTurn);
    const likelyPaymentFollowUp = hasPaymentContext && (
      /\d|\b(?:to|for|make it|change|same|recipient|amount|instead|use|that address)\b/i.test(transcript) ||
      savedContacts.some(contact => transcript.toLowerCase().includes(contact.name.toLowerCase()))
    );
    if (!explicitPaymentRequest && !likelyPaymentFollowUp) return;
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: transcript, history: messagesRef.current.slice(-8).map(message => ({ role: message.role, content: message.text })), contacts: savedContacts.map(({ name }) => name) })
      });
      const data = await response.json() as {
        intent?: { action?: string; amount?: string | null; asset?: string | null; recipient?: string | null; recipientLabel?: string | null; chain?: string | null; purpose?: string | null; needsClarification?: boolean; clarificationQuestion?: string | null };
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "Could not prepare a payment draft.");
      const parsed = data.intent;
      if (parsed?.action !== "transfer") return;
      if (parsed.amount && parsed.recipient && parsed.asset && SUPPORTED_DRAFT_ASSETS.has(parsed.asset.toUpperCase())) {
        const resolvedRecipient = resolveSavedRecipient(parsed.recipient);
        setIntent({
          recipient: resolvedRecipient,
          recipientLabel: parsed.recipientLabel || savedContacts.find(contact => contact.address.toLowerCase() === resolvedRecipient.toLowerCase())?.name,
          amount: parsed.amount,
          asset: "USDC",
          network: "Arc Testnet",
          reason: parsed.purpose || "Not specified"
        });
        setPaymentTx(null);
        setNotice("Voice request prepared a payment draft. Review the recipient, asset, network, and amount before approving anything.");
      } else {
        setNotice(parsed.clarificationQuestion || "I heard a possible payment request, but the draft needs more details. Check the chat before continuing.");
      }
    } catch (error) {
      setNotice("I heard your payment request, but couldn't prepare its draft: " + (error instanceof Error ? error.message : "assistant unavailable"));
    }
  }

  async function startRealtimeVoice() {
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined") {
        throw new Error("This browser does not support WebRTC microphone access.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!voiceConversationEnabled.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      const peer = new RTCPeerConnection();
      realtimePeer.current = peer;
      realtimeStream.current = stream;
      stream.getTracks().forEach(track => peer.addTrack(track, stream));
      peer.ontrack = event => {
        const audio = new Audio();
        audio.autoplay = true;
        audio.srcObject = event.streams[0];
        realtimeAudio.current = audio;
        void audio.play().catch(() => setNotice("Voice is connected, but browser audio playback was blocked. Check the tab's sound settings."));
      };
      peer.onconnectionstatechange = () => {
        if (peer.connectionState === "failed" && voiceConversationEnabled.current) {
          voiceConversationEnabled.current = false;
          voiceReplyEnabled.current = false;
          stopRealtimeVoice();
          setListening(false);
          setSpeaking(false);
          setNotice("Realtime voice connection dropped. Tap the microphone to start a new session.");
        }
      };
      const channel = peer.createDataChannel("oai-events");
      realtimeChannel.current = channel;
      channel.onopen = () => {
        if (!voiceConversationEnabled.current) return;
        realtimeMode.current = true;
        setListening(true);
        setNotice("Realtime voice connected. Speak naturally and interrupt when you need to.");
      };
      channel.onmessage = event => {
        let payload: { type?: string; transcript?: string; delta?: string; error?: { message?: string } };
        try { payload = JSON.parse(String(event.data)); } catch { return; }
        if (payload.type === "conversation.item.input_audio_transcription.completed" && payload.transcript?.trim()) {
          const transcript = payload.transcript.trim();
          setMessages(current => [...current, { role: "user", text: transcript }]);
          const approval = /^(?:(?:yes|yeah|yep|approved?|confirmed?|confirm|i approve|i confirm|send it|go ahead|do it|proceed|looks good|correct|okay|ok)(?:[ ,]+(?:please|now|then|it|ahead|that|the|payment|transaction|transfer|send|approve|confirm))*)[.! ]*$/i.test(transcript);
          if (approval && intentRef.current) {
            setMessages(current => [...current, { role: "assistant", text: "Opening your wallet now. Check the payment details and approve it there if everything looks right." }]);
            void sendArcTestnetPayment(intentRef.current);
          } else {
            void prepareRealtimePaymentDraft(transcript);
          }
        } else if (payload.type === "response.output_audio_transcript.delta" && payload.delta) {
          realtimeAssistantAudioText.current += payload.delta;
        } else if (payload.type === "response.output_audio_transcript.done" && payload.transcript) {
          realtimeAssistantAudioText.current = payload.transcript;
        } else if (payload.type === "response.output_text.delta" && payload.delta) {
          realtimeAssistantPlainText.current += payload.delta;
        } else if (payload.type === "response.created") {
          setSpeaking(true);
        } else if (payload.type === "input_audio_buffer.speech_started") {
          setSpeaking(false);
          if (realtimeChannel.current?.readyState === "open") {
            try { realtimeChannel.current.send(JSON.stringify({ type: "response.cancel" })); } catch { /* session may already be idle */ }
          }
        } else if (payload.type === "response.done") {
          setSpeaking(false);
          const assistantText = (realtimeAssistantAudioText.current || realtimeAssistantPlainText.current).trim().replace(/0x[a-fA-F0-9]{40}/g, address => savedContacts.find(contact => contact.address.toLowerCase() === address.toLowerCase())?.name || "the recipient address");
          if (assistantText) setMessages(current => [...current, { role: "assistant", text: assistantText }]);
          realtimeAssistantAudioText.current = "";
          realtimeAssistantPlainText.current = "";
        } else if (payload.type === "error") {
          setNotice(payload.error?.message || "Realtime voice reported an error. Try reconnecting.");
        }
      };

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      await new Promise<void>(resolve => {
        if (peer.iceGatheringState === "complete") return resolve();
        const onGathering = () => {
          if (peer.iceGatheringState === "complete") {
            peer.removeEventListener("icegatheringstatechange", onGathering);
            resolve();
          }
        };
        peer.addEventListener("icegatheringstatechange", onGathering);
        setTimeout(() => {
          peer.removeEventListener("icegatheringstatechange", onGathering);
          resolve();
        }, 1800);
      });
      if (!voiceConversationEnabled.current) {
        stopRealtimeVoice();
        return;
      }
      const response = await fetch("/api/voice/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sdp: peer.localDescription?.sdp || offer.sdp, contacts: savedContacts.map(({ name }) => name), history: messagesRef.current.slice(-8).map(message => ({ role: message.role, content: message.text })) })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(errorData.error || "Realtime voice session could not start.");
      }
      const answer = await response.text();
      await peer.setRemoteDescription({ type: "answer", sdp: answer });
      if (!voiceConversationEnabled.current) stopRealtimeVoice();
    } catch (error) {
      stopRealtimeVoice();
      if (!voiceConversationEnabled.current) return;
      beginVoiceCapture("Realtime voice unavailable: " + (error instanceof Error ? error.message : "connection failed") + ". Using browser voice; responses may be slower.");
    }
  }

  async function startVoice() {
    if (typeof window === "undefined") return;
    if (voiceConversationEnabled.current && speaking && !realtimeMode.current) {
      window.speechSynthesis?.cancel();
      setSpeaking(false);
      if (voiceRestartTimer.current) clearTimeout(voiceRestartTimer.current);
      beginVoiceCapture("Stopped speaking. Go ahead; I’m listening.");
      return;
    }
    if (voiceConversationEnabled.current) {
      voiceConversationEnabled.current = false;
      voiceReplyEnabled.current = false;
      if (voiceRestartTimer.current) clearTimeout(voiceRestartTimer.current);
      if (voiceSubmitTimer.current) clearTimeout(voiceSubmitTimer.current);
      recognition.current?.stop();
      window.speechSynthesis?.cancel();
      stopRealtimeVoice();
      setListening(false);
      setSpeaking(false);
      setNotice("Voice conversation ended.");
      return;
    }
    voiceConversationEnabled.current = true;
    voiceReplyEnabled.current = true;
    window.speechSynthesis?.cancel();
    try {
      const response = await fetch("/api/voice/session", { cache: "no-store" });
      const capability = await response.json() as { enabled?: boolean; reason?: string };
      if (!voiceConversationEnabled.current) return;
      if (capability.enabled) {
        await startRealtimeVoice();
        return;
      }
      if (voiceConversationEnabled.current) {
        beginVoiceCapture((capability.reason || "Realtime voice is not enabled.") + " Using browser voice; responses may be slower.");
      }
      return;
    } catch {
      // The browser voice path remains available if the realtime capability check fails.
    }
    if (voiceConversationEnabled.current) beginVoiceCapture("Could not check realtime voice availability. Using browser voice; responses may be slower.");
  }

  function navigate(label: string) {
    setActive(label);
    setIntent(null);
  }

  return (
    <main className="ws-root">
      <aside className="ws-sidebar">
        <Link href="/" className="ws-brand" aria-label="Sonus home">
          <span className="ws-brand-mark"><i /><i /><i /></span><span>SONUS<span className="ws-brand-period">.</span></span>
        </Link>
        <div className="ws-workspace-label">WORKSPACE <ChevronDown size={13} /></div>
        <nav className="ws-nav" aria-label="Workspace navigation">
          <p className="ws-nav-caption">YOUR SPACE</p>
          {[
            { label: "Overview", icon: LayoutDashboard },
            { label: "Portfolio", icon: Wallet },
            { label: "Activity", icon: History },
          ].map(({ label, icon: Icon }) => <button key={label} className={active === label ? "ws-nav-item active" : "ws-nav-item"} onClick={() => navigate(label)}><Icon size={17} /><span>{label}</span>{label === "Activity" && <span className="ws-nav-count">{transactionHistory.length}</span>}</button>)}
          <p className="ws-nav-caption ws-nav-caption-gap">EXPLORE</p>
          {[
            { label: "Swap", icon: ArrowLeftRight },
            { label: "Bridge", icon: Globe2 },
            { label: "Stake", icon: Zap },
            { label: "Intelligence", icon: Sparkles },
          ].map(({ label, icon: Icon }) => <button key={label} className={active === label ? "ws-nav-item active" : "ws-nav-item"} onClick={() => navigate(label)}><Icon size={17} /><span>{label}</span>{["Bridge", "Stake"].includes(label) && <span className="ws-soon">SOON</span>}</button>)}
        </nav>
        <div className="ws-sidebar-bottom">
          <div className="ws-network-status"><span className="ws-status-dot" /><div><strong>{walletChainId === ARC_TESTNET_CHAIN_ID ? "Arc testnet" : walletChainId ? "Chain " + walletChainId : "Wallet not connected"}</strong><small>{walletAddress ? walletChainId === ARC_TESTNET_CHAIN_ID ? "Connected · testnet" : "Connected · network unverified" : "Connect to begin"}</small></div><MoreHorizontal size={16} /></div>
          <button className="ws-nav-item" onClick={() => navigate("Settings")}><Settings2 size={17} /><span>Settings</span></button>
          <button className="ws-help-link" onClick={() => setNotice("Sonus V1 preview. Native USDC transfers are enabled on Arc Testnet only, after explicit review and wallet approval.")}><CircleHelp size={16} /> Help & feedback <ArrowUpRight size={13} /></button>
          <div className="ws-profile"><div className="ws-avatar">O</div><div><strong>Offline</strong><small>Personal workspace</small></div><MoreHorizontal size={17} /></div>
        </div>
      </aside>

      <section className="ws-main">
        <header className="ws-topbar">
          <div className="ws-breadcrumb"><span>Workspace</span><span className="ws-slash">/</span><strong>{active}</strong></div>
          <div className="ws-top-actions">
            <button className="ws-icon-btn" aria-label="Search" onClick={() => setSearchOpen(v => !v)}><Search size={17} /></button>
            <button className="ws-icon-btn" aria-label="Notifications" onClick={() => setNotice("You’re all caught up.")}><Bell size={17} /><i /></button>
            <span className="ws-top-divider" />
            <button className="ws-connect-btn" onClick={walletAddress ? disconnectWalletView : connectWallet} disabled={walletBusy}><Wallet size={15} /> {walletBusy ? "Connecting…" : walletAddress ? walletAddress.slice(0, 6) + "…" + walletAddress.slice(-4) : "Connect wallet"} {walletAddress ? <X size={13} /> : <ArrowUpRight size={13} />}</button>
          </div>
        </header>

        {searchOpen && <div className="ws-search-pop"><Search size={16} /><input autoFocus placeholder="Search assets, activity, or ask Sonus…" onKeyDown={e => { if (e.key === "Enter") { submitMessage((e.target as HTMLInputElement).value); setSearchOpen(false); } }} /><button onClick={() => setSearchOpen(false)} aria-label="Close search"><X size={15} /></button></div>}
        {notice && <div className="ws-notice" role="status"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss notice"><X size={14} /></button></div>}

        <div className="ws-content">
          <div className="ws-page-heading">
            <div><p className="ws-eyebrow"><span /> YOUR FINANCIAL OVERVIEW</p><h1>{active === "Overview" ? <>{greeting}<span className="ws-period">.</span></> : active}<span className="ws-period">{active === "Overview" ? "" : "."}</span></h1><p>{sectionSubtitle}</p></div>
            <div className="ws-date"><span className="ws-live-dot" /> {currentDateLabel || "YOUR LOCAL DATE"}</div>
          </div>

          {active === "Overview" ? <>
            <div className="ws-overview-grid">
              <section className="ws-balance-panel">
                <div className="ws-panel-top"><span>ARC TESTNET NATIVE USDC</span><button onClick={() => setBalanceVisible(v => !v)} aria-label={balanceVisible ? "Hide balance" : "Show balance"}>{balanceVisible ? <Eye size={16} /> : <EyeOff size={16} />}</button></div>
                <div className="ws-balance-number">{balanceVisible ? (walletAddress ? walletBalances.native ?? "—" : "Connect wallet") : "••••••"}{balanceVisible && walletBalances.native !== null ? <span className="ws-balance-usd"> USDC</span> : null}</div>
                <div className="ws-balance-change"><span><Activity size={14} /> Testnet balance only</span><small>{walletBalances.native !== null ? "Live RPC read · not real funds" : "Connect and refresh to load balance"}</small></div>
                {walletAddress && <div className="ws-chain-balance"><div><span>WALLET READ STATUS</span><strong>{walletBalances.status}</strong></div><button onClick={walletChainId === ARC_TESTNET_CHAIN_ID ? refreshWalletBalances : switchToArcTestnet} disabled={balanceBusy}>{balanceBusy ? "Reading…" : walletChainId === ARC_TESTNET_CHAIN_ID ? "Refresh live balance" : "Switch to Arc Testnet"} <ArrowRight size={12} /></button><small>{walletBalances.updatedAt ? "Last read " + new Date(walletBalances.updatedAt).toLocaleTimeString() : "No live balance has been read yet."}</small></div>}
                <div className="ws-chart" aria-label="Illustrative portfolio performance chart">
                  <div className="ws-chart-grid"><i /><i /><i /><i /></div>
                  <svg viewBox="0 0 720 135" preserveAspectRatio="none" role="img" aria-label="Illustrative upward portfolio line"><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#a8d7c4" stopOpacity=".2" /><stop offset="100%" stopColor="#a8d7c4" stopOpacity="0" /></linearGradient></defs><path d="M0 108 C24 104 32 88 52 93 S87 108 108 86 S139 75 160 82 S187 55 210 66 S245 83 266 58 S301 70 323 52 S359 68 380 41 S418 58 439 45 S471 60 495 35 S529 47 548 29 S581 49 603 22 S642 38 661 17 S696 23 720 7 L720 135 L0 135Z" fill="url(#chartFill)" /><path d="M0 108 C24 104 32 88 52 93 S87 108 108 86 S139 75 160 82 S187 55 210 66 S245 83 266 58 S301 70 323 52 S359 68 380 41 S418 58 439 45 S471 60 495 35 S529 47 548 29 S581 49 603 22 S642 38 661 17 S696 23 720 7" fill="none" stroke="#a8d7c4" strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg>
                </div>
                <div className="ws-chart-labels"><span>SEP 12</span><span>SEP 19</span><span>SEP 26</span><span>OCT 03</span><span>OCT 11</span></div>
              </section>
              <section className="ws-actions-panel">
                <div className="ws-panel-top"><span>QUICK ACTIONS</span><span className="ws-mini-label">YOUR CALL</span></div>
                <div className="ws-action-grid">
                  <button onClick={() => { setInput("Prepare to send 25 USDC to Alex for lunch"); document.getElementById("ws-assistant-input")?.focus(); }}><span className="ws-action-icon"><ArrowUpRight size={18} /></span><strong>Send</strong><small>Transfer assets</small></button>
                  <button onClick={() => navigate("Swap")}><span className="ws-action-icon"><ArrowLeftRight size={18} /></span><strong>Swap</strong><small>Exchange tokens</small></button>
                  <button onClick={() => navigate("Bridge")}><span className="ws-action-icon"><Globe2 size={18} /></span><strong>Bridge</strong><small>Move networks</small></button>
                  <button onClick={() => navigate("Portfolio")}><span className="ws-action-icon"><Plus size={18} /></span><strong>Receive</strong><small>Get an address</small></button>
                </div>
                <div className="ws-safety-note"><ShieldCheck size={16} /><span><strong>You’re in control.</strong> Every transaction should be reviewed before approval.</span></div>
              </section>
            </div>

            <div className="ws-lower-grid">
              <section className="ws-market-panel">
                <div className="ws-section-heading"><div><h2>Market watch</h2><p>A quick read on selected assets</p></div><div className="ws-section-actions"><button className="ws-view-link" onClick={() => { setMarketLoading(true); setMarketRefreshNonce(value => value + 1); }} disabled={marketLoading} aria-label="Refresh live market data"><RefreshCw size={13} /> Refresh</button><button className="ws-view-link" onClick={() => navigate("Intelligence")}>View intelligence <ArrowRight size={14} /></button></div></div>
                <div className="ws-market-table"><div className="ws-table-head"><span>ASSET</span><span>PRICE</span><span>24H</span><span /></div>{marketRows.map(asset => <div className="ws-market-row" key={asset.symbol}><span className={"ws-coin ws-coin-" + asset.symbol.toLowerCase()}>{asset.mark}</span><div className="ws-asset-name"><strong>{asset.symbol}</strong><small>{asset.name}</small></div><strong className="ws-asset-price">{asset.price}</strong><span className={asset.up ? "ws-change up" : "ws-change down"}>{asset.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}{asset.change}</span><button className="ws-row-more" aria-label={"More about " + asset.symbol} onClick={() => { setInput("Give me a quick crypto market overview"); document.getElementById("ws-assistant-input")?.focus(); }}><ArrowUpRight size={14} /></button></div>)}</div>
                <p className="ws-data-disclaimer"><Activity size={12} /> {marketError ? marketError + " Market prices are not available." : marketLoading ? "Loading live market quotes…" : "Live prices from CoinGecko · refreshes every 60 seconds."}{marketUpdatedAt && !marketError ? " Updated " + new Date(marketUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + "." : ""}</p>
              </section>

              <section className="ws-activity-panel">
                <div className="ws-section-heading"><div><h2>Recent activity</h2><p>Your latest moves</p></div><button className="ws-icon-btn ws-subtle-icon" aria-label="Activity options" onClick={() => navigate("Activity")}><ArrowUpRight size={16} /></button></div>
                <div className="ws-activity-list">{transactionHistory.slice(0, 3).map((item, index) => <div className="ws-activity-row" key={item.hash}><span className={"ws-activity-icon " + (item.status === "failed" ? "failed" : item.status === "confirmed" ? "sent" : "swap")}><ArrowUpRight size={15} /></span><div className="ws-activity-info"><strong>Sent to {item.to.slice(0, 8)}…{item.to.slice(-5)}</strong><small>{new Date(item.createdAt).toLocaleString()} · {item.network} · {item.status}</small></div><div className={"ws-activity-amount " + (item.status === "failed" ? "failed" : "sent")}>− {item.amount} {item.asset}</div>{index < Math.min(transactionHistory.length, 3) - 1 && <span className="ws-activity-divider" />}</div>)}{transactionHistory.length === 0 && <div className="ws-contact-empty"><History size={17} /><span>No wallet-approved transactions recorded on this browser yet. Sonus will add a record after your wallet returns a transaction hash.</span></div>}</div>
                <button className="ws-full-activity" onClick={() => navigate("Activity")}>View transaction history <ArrowRight size={14} /></button>
              </section>
            </div>

            <section className="ws-contacts-panel" aria-labelledby="ws-contacts-title">
              <div className="ws-section-heading"><div><h2 id="ws-contacts-title">Saved recipients</h2><p>Resolve names you have explicitly saved on this browser</p></div><span className="ws-contact-count">{savedContacts.length} / 200</span></div>
              <input ref={contactImportRef} type="file" accept=".csv,.json,application/json,text/csv" onChange={importContacts} hidden />
              <div className="ws-contact-import-row"><button type="button" disabled={contactImportBusy || savedContacts.length >= 200} onClick={() => contactImportRef.current?.click()}><FileUp size={14} /> {contactImportBusy ? "Importing…" : "Import contacts"}</button><button type="button" disabled={!savedContacts.length} onClick={exportContacts}><Download size={14} /> Export backup</button><span>CSV or JSON · processed locally</span></div>
              <form className="ws-contact-form" onSubmit={saveContact}>
                <label><span>CONTACT NAME</span><input id="ws-contact-name-field" value={contactNameInput} onChange={event => setContactNameInput(event.target.value)} maxLength={50} placeholder="e.g. Alex" autoComplete="off" required /></label>
                <label><span>EVM WALLET ADDRESS</span><input value={contactAddressInput} onChange={event => setContactAddressInput(event.target.value)} placeholder="0x…" autoComplete="off" spellCheck={false} required /></label>
                <button type="submit"><Plus size={14} /> Save contact</button>
              </form>
              {contactFormError && <p className="ws-contact-error" role="alert">{contactFormError}</p>}
              {savedContacts.length ? <div className="ws-contact-list">{savedContacts.map(contact => <div className="ws-contact-row" key={contact.id}><span className="ws-contact-avatar">{contact.name.slice(0, 1).toUpperCase()}</span><div className="ws-contact-info"><strong>{contact.name}</strong><small>{contact.address.slice(0, 10) + "…" + contact.address.slice(-8)}</small></div><button type="button" onClick={() => { setInput("Send 25 USDC to " + contact.name); document.getElementById("ws-assistant-input")?.focus(); setNotice("Prepared a prompt for “" + contact.name + "”. Review the resolved address before any transaction."); }} aria-label={"Prepare payment to " + contact.name}><ArrowUpRight size={14} /> Pay</button><button type="button" className="ws-contact-remove" onClick={() => removeContact(contact)} aria-label={"Remove " + contact.name}><X size={14} /></button></div>)}</div> : <div className="ws-contact-empty"><Wallet size={17} /><span>No saved recipients yet. Add a name and address to reuse it in payment requests.</span></div>}
              <p className="ws-contact-disclaimer"><LockKeyhole size={12} /> Stored only in this browser’s local storage. Contacts are not synced or identity-verified. Double-check addresses before sending.</p>
            </section>

            <section className="ws-assistant-panel" id="ws-assistant">
              <div className="ws-assistant-heading"><div className="ws-assistant-symbol"><AudioLines size={19} /></div><div><span className="ws-eyebrow">YOUR PAYMENT INTELLIGENCE</span><h2>Ask Sonus<span className="ws-period">.</span></h2><p>Type it or say it. Start with what you want to do.</p></div><span className="ws-assistant-beta">PREVIEW</span></div>
              <div className="ws-chat-window" aria-live="polite">{messages.slice(-4).map((message, i) => <div key={messages.length + "-" + i} className={"ws-message " + message.role}><span className="ws-message-avatar">{message.role === "assistant" ? <AudioLines size={14} /> : "O"}</span><p>{message.text}</p></div>)}{assistantBusy && <div className="ws-message assistant"><span className="ws-message-avatar"><AudioLines size={14} /></span><p>Thinking through your request…</p></div>}</div>
              {intent && <div className="ws-intent-card"><div className="ws-intent-header"><span><ShieldCheck size={15} /> PAYMENT DRAFT</span><span>NOT SENT</span></div><div className="ws-intent-main"><div><small>FROM WALLET</small><strong>{walletAddress ? walletAddress.slice(0, 9) + "…" + walletAddress.slice(-7) : "Connect wallet"}</strong>{walletAddress && <button className="ws-copy-address" onClick={async () => { try { await navigator.clipboard.writeText(walletAddress); setNotice("Connected wallet address copied."); } catch { setNotice("Could not copy automatically. Wallet address: " + walletAddress); } }}><Copy size={11} /> Copy address</button>}</div><div><small>RECIPIENT</small><strong>{intent.recipientLabel || (EVM_ADDRESS_RE.test(intent.recipient) ? intent.recipient.slice(0, 10) + "…" + intent.recipient.slice(-6) : intent.recipient)}</strong><small className={EVM_ADDRESS_RE.test(intent.recipient) ? "ws-recipient-status valid" : "ws-recipient-status"}>{EVM_ADDRESS_RE.test(intent.recipient) ? (savedContacts.some(contact => contact.address.toLowerCase() === intent.recipient.toLowerCase()) ? "Saved contact address · not identity-verified" : "Address format only · not verified") : "Unresolved name · address required"}</small>{EVM_ADDRESS_RE.test(intent.recipient) && !savedContacts.some(contact => contact.address.toLowerCase() === intent.recipient.toLowerCase()) && <button type="button" className="ws-recipient-save" onClick={() => { setContactAddressInput(intent.recipient); setContactNameInput(""); document.getElementById("ws-contact-name-field")?.focus(); setNotice("Add a recognizable name for this address in Saved recipients. Verify the address independently before saving."); }}> <Plus size={11} /> Save to address book</button>}{EVM_ADDRESS_RE.test(intent.recipient) && intent.network === "Arc Testnet" && <a className="ws-explorer-link" href={"https://testnet.arcscan.app/address/" + intent.recipient} target="_blank" rel="noreferrer">View address on Arcscan <ExternalLink size={11} /></a>}</div><div><small>AMOUNT</small><strong>{intent.amount} {intent.asset}</strong></div><div><small>NETWORK</small><strong>Arc Testnet</strong></div><div><small>NOTE</small><strong>{intent.reason}</strong></div></div><div className="ws-preview-checks"><strong>Before this can be sent</strong><span><Check size={13} /> Confirm the recipient address through a trusted channel</span><span><Check size={13} /> Confirm token and network compatibility</span><span><Check size={13} /> Your wallet will show the network fee before approval</span><span><Check size={13} /> Review the exact transaction in your wallet</span></div><p><LockKeyhole size={13} /> {paymentTx?.status === "submitted" || paymentTx?.status === "pending" ? "Transaction submitted; do not resend while its status is pending. Check the transaction status below." : "This payment is ready for your wallet. Say “confirm” or “send it” to open the wallet, then approve there. Only native USDC on Arc Testnet is supported."}</p><div className="ws-intent-buttons"><button onClick={() => { setNotice("Payment draft dismissed."); setIntent(null); }}>Dismiss draft</button><span className="ws-wallet-approval-hint">Say “confirm” to open your wallet for approval.</span></div></div>}
              {paymentTx && <div className={"ws-payment-result " + paymentTx.status} role="status" aria-live="polite"><div><span className="ws-eyebrow">ON-CHAIN TRANSACTION</span><strong>{paymentTx.status === "confirmed" ? "Payment confirmed" : paymentTx.status === "failed" ? "Transaction failed" : paymentTx.status === "pending" ? "Confirmation pending" : "Transaction submitted"}</strong><small>{paymentTx.detail}</small><a href={"https://testnet.arcscan.app/tx/" + paymentTx.hash} target="_blank" rel="noreferrer">View transaction on Arcscan <ExternalLink size={12} /></a></div><button onClick={() => navigator.clipboard.writeText(paymentTx.hash).then(() => setNotice("Transaction hash copied.")).catch(() => setNotice(paymentTx.hash))} aria-label="Copy transaction hash"><Copy size={15} /></button></div>}<div className="ws-prompt-chips">{starters.map(({ icon: Icon, label, prompt }) => <button key={label} onClick={() => submitMessage(prompt)}><Icon size={14} />{label}<ArrowUpRight size={12} /></button>)}</div>
              <form className="ws-composer" onSubmit={e => { e.preventDefault(); submitMessage(); }}><button type="button" className={voiceConversationEnabled.current || speaking ? "ws-mic-btn listening" : "ws-mic-btn"} aria-label={voiceConversationEnabled.current ? "End voice conversation" : "Start voice conversation"} title={speaking ? "Speaking. Tap to end voice mode." : listening ? "Listening. Tap to end voice mode." : "Start hands-free voice conversation"} onClick={startVoice}><Mic size={17} /></button><input id="ws-assistant-input" value={input} onChange={e => setInput(e.target.value)} placeholder="Ask Sonus to send, swap, or explain…" aria-label="Message Sonus" /><span className="ws-composer-hint"><Command size={11} /> Enter</span><button type="submit" className="ws-send-btn" aria-label="Send message" disabled={!input.trim() || assistantBusy}><Send size={16} /></button></form>
              <div className="ws-assistant-foot"><span><LockKeyhole size={12} /> You review before anything moves.</span><span>{speaking ? "Sonus is speaking…" : realtimeMode.current ? "Realtime voice connected." : listening ? "Listening (browser voice)…" : "Voice uses your browser’s speech recognition."}</span></div>
            </section>
            <footer className="ws-footer"><span>SONUS / PRIVATE WORKSPACE</span><span>BUILT FOR CLARITY. DESIGNED FOR CONTROL.</span><button onClick={() => setNotice("Dashboard prices and portfolio examples are illustrative. Native USDC transfers are connected on Arc Testnet only; swaps, bridges, and other networks are not live.")}>What’s live? <ExternalLink size={12} /></button></footer>
          </> : active === "Portfolio" ? <section className="ws-portfolio-page">
            <div className="ws-portfolio-heading">
              <span className="ws-eyebrow">SONUS / PORTFOLIO SNAPSHOT</span>
              <h2>Your portfolio<span className="ws-period">.</span></h2>
              <p>A live read of your connected wallet on Arc Testnet, with separate market-price snapshots. This is not a multi-chain portfolio valuation.</p>
            </div>
            <div className="ws-portfolio-primary">
              <div className="ws-portfolio-balance">
                <span>ARC TESTNET · NATIVE USDC</span>
                <strong>{walletAddress ? (walletBalances.native ?? "—") : "Connect wallet"}</strong>
                <small>{walletAddress ? walletBalances.status : "Connect a wallet to read your balance."}</small>
                <div className="ws-portfolio-actions">
                  {walletAddress && <button type="button" onClick={walletChainId === ARC_TESTNET_CHAIN_ID ? refreshWalletBalances : switchToArcTestnet} disabled={balanceBusy}>{balanceBusy ? "Refreshing…" : walletChainId === ARC_TESTNET_CHAIN_ID ? "Refresh balance" : "Switch to Arc Testnet"}</button>}
                  <button type="button" onClick={() => setMarketRefreshNonce(value => value + 1)} disabled={marketLoading}>{marketLoading ? "Refreshing market…" : "Refresh market data"}</button>
                </div>
                {walletBalances.updatedAt && <small>Balance checked {new Date(walletBalances.updatedAt).toLocaleString()}</small>}
              </div>
              <div className="ws-portfolio-wallet">
                <span>CONNECTED WALLET</span>
                <strong>{walletAddress ? walletAddress.slice(0, 12) + "…" + walletAddress.slice(-8) : "Not connected"}</strong>
                <small>{walletChainId === ARC_TESTNET_CHAIN_ID ? "Arc Testnet connected" : walletAddress ? "Wrong network for the live balance read" : "Connect your wallet from Overview"}</small>
                {walletAddress && <a href={"https://testnet.arcscan.app/address/" + walletAddress} target="_blank" rel="noreferrer">View on Arcscan <ExternalLink size={12} /></a>}
              </div>
            </div>
            <div className="ws-portfolio-market-heading"><div><span className="ws-eyebrow">MARKET WATCH</span><h3>Spot prices</h3></div><span>{marketUpdatedAt ? "Updated " + new Date(marketUpdatedAt).toLocaleTimeString() : marketLoading ? "Loading live data…" : "Live data unavailable"}</span></div>
            {marketError && <p className="ws-portfolio-error" role="status">{marketError} Prices are not replaced with sample values.</p>}
            <div className="ws-portfolio-markets">{marketRows.map(asset => <article className="ws-portfolio-market" key={asset.symbol}><span>{asset.symbol}</span><strong>{asset.price}</strong><small className={asset.up ? "positive" : "negative"}>{asset.change} <span>24h</span></small></article>)}</div>
            <div className="ws-portfolio-disclaimer"><LockKeyhole size={14} /><p>Only native USDC on Arc Testnet is currently read from your wallet. BTC, ETH, SOL and USDC market prices are informational spot snapshots, not your holdings. Testnet funds have no real-world value. Other chains, tokens, NFTs, DeFi positions, and historical portfolio performance are not indexed.</p></div>
          </section> : active === "Intelligence" ? <section className="ws-intelligence-page">
            <div className="ws-intelligence-heading">
              <span className="ws-eyebrow">SONUS / PAYMENT INTELLIGENCE</span>
              <h2>See the full picture<span className="ws-period">.</span></h2>
              <p>Live market context and deterministic transaction checks. Sonus clearly separates basic validation from real security scanning.</p>
            </div>
            <div className="ws-intelligence-market-header"><div><span className="ws-eyebrow">LIVE MARKET SNAPSHOT</span><h3>Market watch</h3></div><button type="button" onClick={() => setMarketRefreshNonce(value => value + 1)} disabled={marketLoading}>{marketLoading ? "Loading…" : "Refresh prices"}</button></div>
            {marketError && <p className="ws-portfolio-error" role="status">{marketError} Current prices could not be verified.</p>}
            <div className="ws-portfolio-markets">{marketRows.map(asset => <article className="ws-portfolio-market" key={asset.symbol}><span>{asset.symbol}</span><strong>{asset.price}</strong><small className={asset.up ? "positive" : "negative"}>{asset.change} <span>24h</span></small></article>)}</div>
            <p className="ws-intelligence-updated">{marketUpdatedAt ? "Market snapshot updated " + new Date(marketUpdatedAt).toLocaleString() : marketLoading ? "Loading market data…" : "No verified market snapshot available."}</p>
            <section className="ws-intelligence-check" aria-labelledby="ws-risk-check-title">
              <div><span className="ws-eyebrow">TRANSACTION RISK PREFLIGHT</span><h3 id="ws-risk-check-title">Check a payment before you send</h3><p>This validates address format, sender/recipient mismatch, amount, and supported route. It does not scan scams or prove who owns an address.</p></div>
              <form onSubmit={event => { event.preventDefault(); void runRecipientPreflight(); }}>
                <label><span>RECIPIENT EVM ADDRESS</span><input value={riskRecipientInput} onChange={event => { setRiskRecipientInput(event.target.value); setRiskCheckResult(null); }} placeholder="0x…" spellCheck={false} autoComplete="off" required /></label>
                <label><span>AMOUNT (NATIVE USDC)</span><input value={riskAmountInput} onChange={event => { setRiskAmountInput(event.target.value); setRiskCheckResult(null); }} inputMode="decimal" placeholder="25" required /></label>
                <div className="ws-intelligence-sender"><span>SENDING FROM</span><strong>{walletAddress ? walletAddress.slice(0, 12) + "…" + walletAddress.slice(-8) : "Connect a wallet first"}</strong><small>{walletChainId === ARC_TESTNET_CHAIN_ID ? "Arc Testnet" : walletChainId ? "Wrong network · switch to Arc Testnet" : "No connected network"}</small></div>
                <button type="submit" disabled={riskCheckBusy || !walletAddress}>{riskCheckBusy ? "Checking parameters…" : "Run preflight check"}</button>
              </form>
              {riskCheckResult && <div className={"ws-risk-result " + (riskCheckResult.allowedToContinue ? "review" : "blocked")} role="status">
                <strong>{riskCheckResult.status === "blocked" ? "Blocked by parameter checks" : riskCheckResult.status === "review" ? "Basic checks passed · review warnings" : "Checks complete"}</strong>
                {riskCheckResult.checks?.map((check, index) => <p key={check.code + index}><span>{check.severity === "block" ? "BLOCK" : "WARNING"}</span>{check.message}</p>)}
                {riskCheckResult.disclaimer && <small>{riskCheckResult.disclaimer}</small>}
              </div>}
            </section>
            <div className="ws-portfolio-disclaimer"><LockKeyhole size={14} /><p>Price snapshots are informational, not trading advice. The preflight is deterministic parameter validation only: it is not an address reputation service, phishing scanner, transaction simulation, or guarantee of safety. Your wallet must still review and authorize every transaction.</p></div>
          </section> : active === "Settings" ? <section className="ws-settings-page"><div className="ws-settings-heading"><span className="ws-eyebrow">SONUS / PAYMENT CONTROL</span><h2>Spending rules<span className="ws-period">.</span></h2><p>Optional browser-local guardrails for Arc Testnet native USDC payments. Rules are checked before wallet approval.</p><div className={"ws-settings-storage " + (spendingRulesStorageError ? "error" : "")}><span />{spendingRulesStorageError ? "Storage problem · payments paused" : spendingRulesReady ? "Rules loaded · " + (spendingRules.enabled || spendingRules.requireSavedRecipient ? "guardrails active" : "guardrails disabled") : "Loading saved rules…"}</div></div><div className="ws-settings-panel"><label className="ws-settings-toggle"><span><strong>Enable spending guardrails</strong><small>Block payments that exceed either limit below.</small></span><input type="checkbox" checked={spendingRules.enabled} onChange={event => setSpendingRules(current => ({ ...current, enabled: event.target.checked }))} /></label><label className="ws-settings-toggle"><span><strong>Only pay saved recipients</strong><small>Block recipients not in your local Contacts address book. Contact names are not identity-verified.</small></span><input type="checkbox" checked={spendingRules.requireSavedRecipient} onChange={event => setSpendingRules(current => ({ ...current, requireSavedRecipient: event.target.checked }))} /></label><label className="ws-settings-field"><span><strong>Maximum per payment</strong><small>Largest single USDC payment Sonus will allow.</small></span><span className="ws-settings-input"><input type="number" min="0.000001" max="1000000000" step="0.01" value={spendingRules.maxSingleUsdc} onChange={event => setSpendingRules(current => ({ ...current, maxSingleUsdc: event.target.value }))} /><b>USDC</b></span></label><label className="ws-settings-field"><span><strong>Daily recorded spending cap</strong><small>UTC calendar day; counts non-failed Sonus records for the active sender.</small></span><span className="ws-settings-input"><input type="number" min="0.000001" max="1000000000" step="0.01" value={spendingRules.dailyCapUsdc} onChange={event => setSpendingRules(current => ({ ...current, dailyCapUsdc: event.target.value }))} /><b>USDC</b></span></label><button className="ws-settings-save" type="button" onClick={() => { const valid = (value: string) => /^\d+(?:\.\d{1,6})?$/.test(value) && Number.isFinite(Number(value)) && Number(value) > 0 && Number(value) <= 1000000000; if (!valid(spendingRules.maxSingleUsdc) || !valid(spendingRules.dailyCapUsdc)) { setNotice("Enter positive limits up to 1,000,000,000 USDC with no more than 6 decimal places."); return; } setSpendingRulesReady(true); try { window.localStorage.setItem("sonus:spending-rules:v1", JSON.stringify(spendingRules)); setSpendingRulesStorageError(false); setNotice("Spending rules saved in this browser."); } catch { setSpendingRulesStorageError(true); setNotice("Could not save spending rules to browser storage. Payments are paused until storage works."); } }}>Save spending rules</button><div className="ws-settings-usage"><div><span>RECORDED TODAY</span><strong>{walletAddress ? spendingUsedToday.toLocaleString(undefined, { maximumFractionDigits: 6 }) + " USDC" : "Connect wallet to view"}</strong></div><div><span>REMAINING UNDER CAP</span><strong>{walletAddress ? spendingRemainingToday.toLocaleString(undefined, { maximumFractionDigits: 6 }) + " USDC" : "—"}</strong></div><small>Based only on locally saved Sonus records for the connected address and today in UTC.</small></div></div><div className="ws-settings-disclaimer"><LockKeyhole size={14} /><p>These are convenience guardrails, not on-chain permissions. Browser storage can be edited or cleared, and the daily total only includes up to 100 Sonus transaction records visible in this browser. They do not protect other wallet apps or transactions made elsewhere. Always review the amount, recipient, network, and fee in your wallet.</p></div></section> : active === "Activity" ? <section className="ws-history-page"><div className="ws-history-heading"><span className="ws-eyebrow">SONUS / LOCAL TRANSACTION MEMORY</span><h2>Transaction history<span className="ws-period">.</span></h2><p>Records of transactions submitted through this Sonus browser. This is not a full wallet indexer.</p><button className="ws-history-refresh" type="button" onClick={() => void refreshTransactionStatuses()} disabled={historyRefreshing || !transactionHistory.some(item => item.status === "pending" || item.status === "submitted")}>{historyRefreshing ? <RefreshCw size={13} className="ws-spin" /> : <RefreshCw size={13} />}{historyRefreshing ? "Checking receipts…" : "Refresh pending status"}</button><button className="ws-history-refresh" type="button" onClick={exportTransactionHistory} disabled={!transactionHistory.length}><Download size={13} /> Export memory</button><div className="ws-history-tools"><label className="ws-history-search"><Search size={14} /><input value={historyQuery} onChange={event => setHistoryQuery(event.target.value)} placeholder="Search recipient, note, amount, or hash" aria-label="Search transaction history" /><button type="button" aria-label="Clear transaction search" onClick={() => setHistoryQuery("")} disabled={!historyQuery}><X size={13} /></button></label><label className="ws-history-filter"><span>STATUS</span><select value={historyStatusFilter} onChange={event => setHistoryStatusFilter(event.target.value)} aria-label="Filter transactions by status"><option value="all">All statuses</option><option value="confirmed">Confirmed</option><option value="pending">Pending</option><option value="submitted">Submitted</option><option value="failed">Failed</option></select></label></div><div className="ws-history-summary"><div><span>RECORDED</span><strong>{transactionHistory.length}</strong></div><div><span>CONFIRMED</span><strong>{transactionHistory.filter(item => item.status === "confirmed").length}</strong></div><div><span>NEEDS CHECK</span><strong>{transactionHistory.filter(item => item.status === "pending" || item.status === "submitted").length}</strong></div></div></div>{visibleTransactions.length ? <div className="ws-history-list">{visibleTransactions.map(item => <article className="ws-history-card" key={item.hash}><div className="ws-history-card-top"><span className={"ws-history-status " + item.status}>{item.status}</span><time>{new Date(item.createdAt).toLocaleString()}</time></div><div className="ws-history-transfer"><div><small>TO</small><strong>{item.to.slice(0, 12) + "…" + item.to.slice(-8)}</strong></div><div><small>AMOUNT</small><strong>{item.amount} {item.asset}</strong></div><div><small>NETWORK</small><strong>{item.network}</strong></div></div><p>{item.detail}</p>{item.policySummary && <small className="ws-history-block">Policy at submission: {item.policySummary}</small>}{item.blockNumber && <small className="ws-history-block">Block {item.blockNumber}</small>}<label className="ws-history-note"><span><span>PAYMENT NOTE</span><small>Private to this browser · never sent on-chain</small></span><textarea value={item.note || ""} maxLength={240} rows={2} placeholder="What was this payment for? (optional)" onChange={event => setTransactionHistory(current => current.map(record => record.hash === item.hash ? { ...record, note: event.target.value.slice(0, 240), updatedAt: Date.now() } : record))} /></label><div className="ws-history-actions"><button onClick={() => { void navigator.clipboard.writeText(item.hash).then(() => setNotice("Transaction hash copied.")).catch(() => setNotice(item.hash)); }}><Copy size={13} /> Copy hash</button><a href={"https://testnet.arcscan.app/tx/" + item.hash} target="_blank" rel="noreferrer">Open in Arcscan <ExternalLink size={13} /></a></div></article>)}</div> : <div className="ws-history-empty"><History size={24} /><h3>{transactionHistory.length ? "No matching transactions" : "No transactions recorded yet"}</h3><p>{transactionHistory.length ? "Try another search or choose a different status filter." : "Once you approve an Arc Testnet payment in your wallet, Sonus will save its transaction hash and update the record as confirmation is checked."}</p><button className="ws-connect-btn" onClick={() => navigate("Overview")}><ArrowRight size={15} /> Prepare a payment</button></div>}<p className="ws-history-disclaimer"><LockKeyhole size={13} /> Saved in this browser only under local storage. Records can be cleared with browser data and are not synced. Status reflects Sonus’s initial RPC polling; verify the latest status in Arcscan before retrying a pending payment.</p></section> : active === "Portfolio" ? <section className="ws-history-page"><div className="ws-history-heading"><span className="ws-eyebrow">SONUS / LIVE WALLET SNAPSHOT</span><h2>Portfolio overview<span className="ws-period">.</span></h2><p>Live native USDC balance on Arc Testnet, plus current market snapshots. This is not a complete multi-chain portfolio.</p><div className="ws-history-refresh-row"><button className="ws-history-refresh" type="button" onClick={() => walletAddress ? (walletChainId === ARC_TESTNET_CHAIN_ID ? void refreshWalletBalances() : void switchToArcTestnet()) : void connectWallet()} disabled={walletBusy || balanceBusy}>{balanceBusy || walletBusy ? <RefreshCw size={13} className="ws-spin" /> : <RefreshCw size={13} />}{!walletAddress ? "Connect wallet" : walletChainId === ARC_TESTNET_CHAIN_ID ? "Refresh live balance" : "Switch to Arc Testnet"}</button><button className="ws-history-refresh" type="button" onClick={() => { setMarketLoading(true); setMarketRefreshNonce(value => value + 1); }} disabled={marketLoading}>{marketLoading ? <RefreshCw size={13} className="ws-spin" /> : <RefreshCw size={13} />}Refresh market data</button></div></div><div className="ws-history-summary"><div><span>NETWORK</span><strong>{walletChainId === ARC_TESTNET_CHAIN_ID ? "Arc Testnet" : walletChainId ? "Unverified chain" : "Not connected"}</strong></div><div><span>NATIVE USDC BALANCE</span><strong>{walletBalances.native !== null ? walletBalances.native + " USDC" : "Unavailable"}</strong></div><div><span>LAST BALANCE READ</span><strong>{walletBalances.updatedAt ? new Date(walletBalances.updatedAt).toLocaleTimeString() : "Not checked"}</strong></div></div><article className="ws-history-card"><div className="ws-history-card-top"><span className={"ws-history-status " + (walletAddress ? "confirmed" : "pending")}>{walletAddress ? "Wallet connected" : "Wallet disconnected"}</span><span>{walletAddress ? walletAddress.slice(0, 10) + "…" + walletAddress.slice(-8) : "Connect a wallet to begin"}</span></div><div className="ws-history-transfer"><div><small>ASSET</small><strong>Native USDC</strong></div><div><small>NETWORK</small><strong>Arc Testnet · 5042002</strong></div><div><small>READ STATUS</small><strong>{walletBalances.status}</strong></div></div><p>The balance is read from the connected wallet’s current RPC provider. Sonus does not request a signature to read it. Testnet balances are not real funds.</p>{walletAddress && <div className="ws-history-actions"><button type="button" onClick={() => { void navigator.clipboard.writeText(walletAddress).then(() => setNotice("Wallet address copied.")).catch(() => setNotice(walletAddress)); }}><Copy size={13} /> Copy receive address</button></div>}</article><div className="ws-history-heading ws-portfolio-market-heading"><span className="ws-eyebrow">MARKET SNAPSHOT</span><h3>Spot prices</h3><p>{marketUpdatedAt ? "Updated " + new Date(marketUpdatedAt).toLocaleString() + " · Source: CoinGecko" : marketError || "Waiting for market data."}</p></div><div className="ws-market-table"><div className="ws-table-head"><span>ASSET</span><span>PRICE</span><span>24H</span><span /></div>{markets.map(asset => { const quote = marketQuotes.find(item => item.symbol === asset.symbol); return <div className="ws-market-row" key={asset.symbol}><span className={"ws-coin ws-coin-" + asset.symbol.toLowerCase()}>{asset.mark}</span><div className="ws-asset-name"><strong>{asset.symbol}</strong><small>{asset.name}</small></div><strong>{quote ? formatUsd(quote.priceUsd) : marketLoading ? "Loading…" : "Unavailable"}</strong><span className={quote && quote.change24h < 0 ? "negative" : "positive"}>{quote ? (quote.change24h > 0 ? "+" : "") + quote.change24h.toFixed(2) + "%" : "—"}</span></div>; })}</div><p className="ws-history-disclaimer"><LockKeyhole size={13} /> This view shows one connected wallet’s native Arc Testnet balance and market reference prices only. It does not index ERC-20 tokens, other networks, NFTs, DeFi positions, or assets held in other wallets. Prices are informational and do not represent the value of testnet funds.</p></section> : <section className="ws-placeholder-page"><div className="ws-placeholder-icon">{active === "Portfolio" ? <Wallet size={24} /> : active === "Activity" ? <History size={24} /> : active === "Intelligence" ? <Sparkles size={24} /> : active === "Settings" ? <Settings2 size={24} /> : <ArrowLeftRight size={24} />}</div><span className="ws-eyebrow">SONUS / V1 PREVIEW</span><h2>{active}<span className="ws-period">.</span></h2><p>{active === "Portfolio" ? "Your assets will appear here after wallet connections and live balance indexing are integrated." : active === "Activity" ? "Your confirmed transactions will appear here after wallet and chain indexing are connected." : active === "Swap" ? (swapCapabilities?.reason || (swapCapabilitiesError ? "Arc/Circle swap status could not be loaded. No swap quote or execution is available." : "Checking Arc/Circle swap readiness…")) : active === "Bridge" ? "Cross-chain routes, bridge providers, fee estimates, and settlement tracking will be integrated here." : active === "Stake" ? "Staking opportunities, protocol risk information, and position tracking will appear here when supported integrations are selected." : active === "Intelligence" ? "A home for market context, wallet-risk signals, transaction explanations, and portfolio insights. Live BTC, ETH, SOL, and USDC spot-price snapshots are connected; portfolio and wallet-risk intelligence still need integrations." : "Manage wallet connections, networks, permissions, privacy, and spending rules as those controls are implemented."}</p><div className="ws-placeholder-status"><span className="ws-status-dot" /> {active === "Swap" ? (swapCapabilities?.quoteAvailable && swapCapabilities?.executionAvailable ? "Arc/Circle swap ready" : swapCapabilitiesError ? "Provider status unavailable" : "Arc/Circle provider unverified · Not ready") : "Interface scaffolded"} <span className="ws-status-separator">·</span> {active === "Swap" ? (swapCapabilities?.supportedEnvironment?.arcTestnet?.supportedTokens ? "Arc Testnet pairs: " + swapCapabilities.supportedEnvironment.arcTestnet.supportedTokens.join(", ") : "No live quote") : "Integration pending"}</div><button className="ws-connect-btn" onClick={() => navigate("Overview")}><ArrowRight size={15} /> Back to overview</button></section>}
        </div>
      </section>
    </main>
  );
}
