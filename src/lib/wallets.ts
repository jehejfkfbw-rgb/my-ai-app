export const WALLETS = [
  { number: "01503724381", label: "محفظة التحويل الأولى", short: "01", note: "متاحة لتسجيل طلبات مراجعة التحويل" },
  { number: "01213783090", label: "محفظة التحويل الثانية", short: "02", note: "اخترها إذا حوّلت إلى هذا الرقم" },
] as const;

export const WALLET_NUMBERS = WALLETS.map((wallet) => wallet.number);
