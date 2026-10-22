export type MarketCategory = "stocks" | "etf" | "crypto" | "forex" | "commodities";
export type ChartRange = "1D" | "1W" | "1M" | "1Y";

export interface Instrument {
  symbol: string;
  displaySymbol: string;
  name: string;
  englishName: string;
  category: MarketCategory;
  categoryLabel: string;
  exchange: string;
  region: string;
  sector: string;
  currency: "USD";
  basePrice: number;
  previousClose: number;
  volatility: number;
  spreadBps: number;
  decimals: number;
  volume: number;
  description: string;
  riskNote: string;
  accent: string;
}

export interface Quote {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  change: number;
  changePct: number;
  volume: number;
  updatedAt: number;
  simulated: true;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export const CATEGORY_FILTERS: Array<{ id: "all" | MarketCategory; label: string }> = [
  { id: "all", label: "كل الأسواق" },
  { id: "stocks", label: "أسهم" },
  { id: "etf", label: "صناديق" },
  { id: "crypto", label: "رقمية" },
  { id: "forex", label: "عملات" },
  { id: "commodities", label: "سلع" },
];

export const INSTRUMENTS: Instrument[] = [
  {
    symbol: "AAPL", displaySymbol: "AAPL", name: "آبل", englishName: "Apple Inc.", category: "stocks", categoryLabel: "سهم أمريكي",
    exchange: "NASDAQ", region: "الولايات المتحدة", sector: "التكنولوجيا", currency: "USD", basePrice: 228.64, previousClose: 225.91,
    volatility: 1, spreadBps: 2, decimals: 2, volume: 48_200_000, accent: "#dce6e8",
    description: "شركة عالمية للأجهزة والخدمات الرقمية، يجمع نموذجها بين مبيعات الأجهزة وإيرادات الخدمات المتكررة.",
    riskNote: "يتأثر السعر بدورات إطلاق المنتجات والإنفاق الاستهلاكي وتقييم قطاع التكنولوجيا.",
  },
  {
    symbol: "NVDA", displaySymbol: "NVDA", name: "إنفيديا", englishName: "NVIDIA Corp.", category: "stocks", categoryLabel: "سهم أمريكي",
    exchange: "NASDAQ", region: "الولايات المتحدة", sector: "أشباه الموصلات", currency: "USD", basePrice: 182.31, previousClose: 179.88,
    volatility: 1.65, spreadBps: 3, decimals: 2, volume: 171_400_000, accent: "#b8ef62",
    description: "رائدة معالجات الرسوميات والبنية التحتية للذكاء الاصطناعي ومراكز البيانات والحوسبة المتسارعة.",
    riskNote: "سهم مرتفع الحساسية لتوقعات الطلب على الذكاء الاصطناعي وسلاسل التوريد والتقييمات.",
  },
  {
    symbol: "MSFT", displaySymbol: "MSFT", name: "مايكروسوفت", englishName: "Microsoft Corp.", category: "stocks", categoryLabel: "سهم أمريكي",
    exchange: "NASDAQ", region: "الولايات المتحدة", sector: "البرمجيات والسحابة", currency: "USD", basePrice: 512.84, previousClose: 509.16,
    volatility: 0.8, spreadBps: 2, decimals: 2, volume: 21_800_000, accent: "#78b9ff",
    description: "منظومة برمجيات وسحابة وأدوات إنتاجية، مع إيرادات مؤسسية متنوعة عبر Azure وMicrosoft 365.",
    riskNote: "ترتبط التحركات بالإنفاق السحابي وعائد استثمارات الذكاء الاصطناعي وأسعار الفائدة.",
  },
  {
    symbol: "AMZN", displaySymbol: "AMZN", name: "أمازون", englishName: "Amazon.com Inc.", category: "stocks", categoryLabel: "سهم أمريكي",
    exchange: "NASDAQ", region: "الولايات المتحدة", sector: "تجارة وسحابة", currency: "USD", basePrice: 231.48, previousClose: 228.72,
    volatility: 1.15, spreadBps: 2, decimals: 2, volume: 39_600_000, accent: "#ffc56e",
    description: "منصة تجارة إلكترونية ولوجستيات عالمية، وتدير AWS إحدى أكبر منصات الحوسبة السحابية.",
    riskNote: "هوامش التجارة والإنفاق الاستهلاكي ونمو AWS من أهم محركات التقلب.",
  },
  {
    symbol: "TSLA", displaySymbol: "TSLA", name: "تسلا", englishName: "Tesla Inc.", category: "stocks", categoryLabel: "سهم أمريكي",
    exchange: "NASDAQ", region: "الولايات المتحدة", sector: "سيارات وطاقة", currency: "USD", basePrice: 341.27, previousClose: 348.4,
    volatility: 2.1, spreadBps: 4, decimals: 2, volume: 88_300_000, accent: "#ff8a86",
    description: "مصنّع للسيارات الكهربائية وأنظمة تخزين الطاقة، مع استثمارات في القيادة المساعدة والروبوتات.",
    riskNote: "أداة عالية التقلب وتتأثر بالمنافسة وأسعار السيارات والتوقعات بعيدة المدى.",
  },
  {
    symbol: "TSM", displaySymbol: "TSM", name: "تايوان لأشباه الموصلات", englishName: "Taiwan Semiconductor ADR", category: "stocks", categoryLabel: "سهم عالمي",
    exchange: "NYSE", region: "تايوان", sector: "أشباه الموصلات", currency: "USD", basePrice: 243.62, previousClose: 239.51,
    volatility: 1.25, spreadBps: 3, decimals: 2, volume: 14_700_000, accent: "#e996aa",
    description: "أكبر مصنّع تعاقدي للرقائق المتقدمة، وتخدم شركات التكنولوجيا والحوسبة حول العالم.",
    riskNote: "تتضمن المخاطر دورة أشباه الموصلات والطاقة الإنتاجية والعوامل الجيوسياسية.",
  },
  {
    symbol: "ASML", displaySymbol: "ASML", name: "إيه إس إم إل", englishName: "ASML Holding ADR", category: "stocks", categoryLabel: "سهم عالمي",
    exchange: "NASDAQ", region: "هولندا", sector: "معدات الرقائق", currency: "USD", basePrice: 812.45, previousClose: 806.18,
    volatility: 1.1, spreadBps: 4, decimals: 2, volume: 1_240_000, accent: "#8ca7ff",
    description: "مورّد متخصص لأنظمة الطباعة الحجرية المستخدمة في صناعة أشباه الموصلات الأكثر تقدماً.",
    riskNote: "الطلبيات الكبيرة والقيود التجارية ودورات إنفاق المصنّعين قد تسبب تحركات حادة.",
  },
  {
    symbol: "BABA", displaySymbol: "BABA", name: "علي بابا", englishName: "Alibaba Group ADR", category: "stocks", categoryLabel: "سهم عالمي",
    exchange: "NYSE", region: "الصين", sector: "تجارة وتكنولوجيا", currency: "USD", basePrice: 152.76, previousClose: 154.1,
    volatility: 1.45, spreadBps: 4, decimals: 2, volume: 17_900_000, accent: "#ffab68",
    description: "مجموعة صينية للتجارة الإلكترونية والسحابة والخدمات اللوجستية والمدفوعات الرقمية.",
    riskNote: "تتأثر بالنمو الاستهلاكي الصيني والسياسات التنظيمية وتحركات العملة.",
  },
  {
    symbol: "VOO", displaySymbol: "VOO", name: "فانغارد S&P 500", englishName: "Vanguard S&P 500 ETF", category: "etf", categoryLabel: "صندوق مؤشر",
    exchange: "NYSE Arca", region: "الولايات المتحدة", sector: "سوق واسع", currency: "USD", basePrice: 628.22, previousClose: 626.71,
    volatility: 0.45, spreadBps: 1, decimals: 2, volume: 4_850_000, accent: "#7ed6b1",
    description: "صندوق يتبع أداء 500 من كبرى الشركات الأمريكية ويوفر تنويعاً واسعاً بأداة واحدة.",
    riskNote: "يقلل التنويع مخاطر الشركة الواحدة لكنه لا يلغي مخاطر هبوط السوق كله.",
  },
  {
    symbol: "QQQ", displaySymbol: "QQQ", name: "إنفيسكو ناسداك 100", englishName: "Invesco QQQ Trust", category: "etf", categoryLabel: "صندوق مؤشر",
    exchange: "NASDAQ", region: "الولايات المتحدة", sector: "نمو وتكنولوجيا", currency: "USD", basePrice: 565.18, previousClose: 561.44,
    volatility: 0.65, spreadBps: 1, decimals: 2, volume: 31_500_000, accent: "#9ba7ff",
    description: "صندوق يتبع ناسداك 100 ويركز على كبرى شركات النمو غير المالية المدرجة في ناسداك.",
    riskNote: "التركيز المرتفع في التكنولوجيا قد يزيد التقلب مقارنة بالسوق الواسع.",
  },
  {
    symbol: "BTCUSD", displaySymbol: "BTC/USD", name: "بيتكوين", englishName: "Bitcoin / US Dollar", category: "crypto", categoryLabel: "عملة رقمية",
    exchange: "سوق تجريبي 24/7", region: "عالمي", sector: "أصول رقمية", currency: "USD", basePrice: 118420, previousClose: 116840,
    volatility: 2.4, spreadBps: 8, decimals: 2, volume: 38_400_000_000, accent: "#ffb55f",
    description: "أصل رقمي لامركزي بمعروض محدود برمجياً، يتم تداوله على مدار الساعة عبر منصات عالمية.",
    riskNote: "تقلب مرتفع وسيولة متفاوتة؛ لا توجد أرباح أو تدفقات نقدية تدعم التقييم.",
  },
  {
    symbol: "ETHUSD", displaySymbol: "ETH/USD", name: "إيثيريوم", englishName: "Ethereum / US Dollar", category: "crypto", categoryLabel: "عملة رقمية",
    exchange: "سوق تجريبي 24/7", region: "عالمي", sector: "عقود ذكية", currency: "USD", basePrice: 4286.4, previousClose: 4212.75,
    volatility: 2.8, spreadBps: 9, decimals: 2, volume: 19_700_000_000, accent: "#a8a4ff",
    description: "شبكة عقود ذكية تدعم التطبيقات اللامركزية والأصول المرمزة، وتستخدم ETH لرسوم التنفيذ.",
    riskNote: "تتأثر بنشاط الشبكة والترقيات والمنافسة والتنظيم، مع قفزات سعرية محتملة.",
  },
  {
    symbol: "SOLUSD", displaySymbol: "SOL/USD", name: "سولانا", englishName: "Solana / US Dollar", category: "crypto", categoryLabel: "عملة رقمية",
    exchange: "سوق تجريبي 24/7", region: "عالمي", sector: "بنية بلوك تشين", currency: "USD", basePrice: 198.62, previousClose: 202.1,
    volatility: 3.5, spreadBps: 12, decimals: 2, volume: 5_800_000_000, accent: "#72efd0",
    description: "شبكة عقود ذكية عالية الإنتاجية تستخدم في المدفوعات والتطبيقات والأصول الرقمية.",
    riskNote: "من الأعلى تقلباً في القائمة؛ راجع حجم المركز واستخدم حداً واضحاً للمخاطرة.",
  },
  {
    symbol: "EURUSD", displaySymbol: "EUR/USD", name: "يورو / دولار", englishName: "Euro / US Dollar", category: "forex", categoryLabel: "زوج عملات",
    exchange: "سوق العملات التجريبي", region: "أوروبا / أمريكا", sector: "عملات رئيسية", currency: "USD", basePrice: 1.1684, previousClose: 1.1649,
    volatility: 0.25, spreadBps: 1, decimals: 4, volume: 184_000_000_000, accent: "#83b6ff",
    description: "أكثر أزواج العملات تداولاً، ويعبّر عن قيمة اليورو الواحد بالدولار الأمريكي.",
    riskNote: "قرارات الفائدة والبيانات الاقتصادية قد تسبب فجوات واتساع فروق الأسعار.",
  },
  {
    symbol: "GBPUSD", displaySymbol: "GBP/USD", name: "جنيه إسترليني / دولار", englishName: "British Pound / US Dollar", category: "forex", categoryLabel: "زوج عملات",
    exchange: "سوق العملات التجريبي", region: "بريطانيا / أمريكا", sector: "عملات رئيسية", currency: "USD", basePrice: 1.3528, previousClose: 1.3492,
    volatility: 0.3, spreadBps: 2, decimals: 4, volume: 72_000_000_000, accent: "#d5a4ff",
    description: "زوج رئيسي يقيس قيمة الجنيه الإسترليني بالدولار ويتفاعل مع السياسة النقدية للبلدين.",
    riskNote: "بيانات التضخم والوظائف وخطابات صناع السياسة محركات أساسية للسعر.",
  },
  {
    symbol: "XAUUSD", displaySymbol: "XAU/USD", name: "الذهب الفوري", englishName: "Gold Spot / US Dollar", category: "commodities", categoryLabel: "معدن ثمين",
    exchange: "سوق السلع التجريبي", region: "عالمي", sector: "معادن ثمينة", currency: "USD", basePrice: 3358.7, previousClose: 3337.2,
    volatility: 0.7, spreadBps: 4, decimals: 2, volume: 186_400_000, accent: "#f3d36d",
    description: "سعر أونصة الذهب بالدولار، ويُتابع كأصل دفاعي ومؤشر لتوقعات الفائدة الحقيقية والعملة.",
    riskNote: "لا يدر دخلاً، وقد يتحرك بقوة مع الدولار والفائدة الحقيقية والضغوط الجيوسياسية.",
  },
  {
    symbol: "XAGUSD", displaySymbol: "XAG/USD", name: "الفضة الفورية", englishName: "Silver Spot / US Dollar", category: "commodities", categoryLabel: "معدن ثمين",
    exchange: "سوق السلع التجريبي", region: "عالمي", sector: "معادن صناعية وثمينة", currency: "USD", basePrice: 38.42, previousClose: 37.95,
    volatility: 1.1, spreadBps: 6, decimals: 2, volume: 74_800_000, accent: "#d4e0e6",
    description: "سعر أونصة الفضة، وتجمع بين الطلب الاستثماري واستخدامات صناعية واسعة.",
    riskNote: "حساسية مزدوجة للدورة الصناعية والمعادن الثمينة تجعل تقلبها أعلى من الذهب غالباً.",
  },
  {
    symbol: "WTIUSD", displaySymbol: "WTI/USD", name: "خام غرب تكساس", englishName: "WTI Crude Oil Spot", category: "commodities", categoryLabel: "طاقة",
    exchange: "سوق السلع التجريبي", region: "عالمي", sector: "طاقة", currency: "USD", basePrice: 64.83, previousClose: 65.26,
    volatility: 1.4, spreadBps: 5, decimals: 2, volume: 312_600_000, accent: "#e4a884",
    description: "مرجع سعري للنفط الخام الأمريكي الخفيف، يتأثر بالمخزونات والإنتاج والطلب العالمي.",
    riskNote: "قرارات المنتجين والمخزونات والأحداث الجيوسياسية قد تصنع تحركات مفاجئة.",
  },
];

export const INSTRUMENT_MAP = new Map(INSTRUMENTS.map((instrument) => [instrument.symbol, instrument]));

export function getInstrument(symbol: string): Instrument | undefined {
  return INSTRUMENT_MAP.get(symbol.toUpperCase());
}

function hashSymbol(symbol: string): number {
  let hash = 2166136261;
  for (let index = 0; index < symbol.length; index += 1) {
    hash ^= symbol.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function random(seed: number): number {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

export function getQuote(symbol: string, at = Date.now()): Quote {
  const instrument = getInstrument(symbol);
  if (!instrument) throw new Error("Unknown instrument");
  const seed = hashSymbol(instrument.symbol);
  const tick = Math.floor(at / 5000);
  const microNoise = (random(seed + tick * 17) - 0.5) * 0.00075 * instrument.volatility;
  const broadWave = Math.sin(at / 96000 + seed % 31) * 0.00125 * instrument.volatility;
  const fineWave = Math.sin(at / 27000 + seed % 13) * 0.00045 * instrument.volatility;
  const price = Math.max(instrument.basePrice * 0.05, instrument.basePrice * (1 + microNoise + broadWave + fineWave));
  const halfSpread = instrument.spreadBps / 20000;
  const open = instrument.previousClose * (1 + (random(seed + 91) - 0.5) * 0.004 * instrument.volatility);
  const high = Math.max(price, open, instrument.basePrice) * (1 + 0.0025 * instrument.volatility + random(seed + tick % 11) * 0.001);
  const low = Math.min(price, open, instrument.basePrice) * (1 - 0.0022 * instrument.volatility - random(seed + 8) * 0.0008);
  const change = price - instrument.previousClose;
  return {
    symbol: instrument.symbol,
    price,
    bid: price * (1 - halfSpread),
    ask: price * (1 + halfSpread),
    open,
    high,
    low,
    previousClose: instrument.previousClose,
    change,
    changePct: (change / instrument.previousClose) * 100,
    volume: Math.round(instrument.volume * (0.94 + random(seed + Math.floor(at / 60000)) * 0.12)),
    updatedAt: at,
    simulated: true,
  };
}

export function getQuotes(at = Date.now()): Quote[] {
  return INSTRUMENTS.map((instrument) => getQuote(instrument.symbol, at));
}

const RANGE_CONFIG: Record<ChartRange, { points: number; step: number; amplitude: number }> = {
  "1D": { points: 72, step: 20 * 60 * 1000, amplitude: 0.018 },
  "1W": { points: 70, step: 2.4 * 60 * 60 * 1000, amplitude: 0.045 },
  "1M": { points: 66, step: 12 * 60 * 60 * 1000, amplitude: 0.09 },
  "1Y": { points: 72, step: 5 * 24 * 60 * 60 * 1000, amplitude: 0.24 },
};

export function getCandles(symbol: string, range: ChartRange = "1D", at = Date.now()): Candle[] {
  const instrument = getInstrument(symbol);
  if (!instrument) throw new Error("Unknown instrument");
  const config = RANGE_CONFIG[range];
  const quote = getQuote(symbol, at);
  const seed = hashSymbol(`${symbol}-${range}`);
  const candles: Candle[] = [];
  let previous = instrument.previousClose;
  for (let index = 0; index < config.points; index += 1) {
    const progress = index / (config.points - 1);
    const amplitude = config.amplitude * Math.max(0.35, instrument.volatility);
    const trend = (progress - 0.5) * (quote.changePct / 100) * (range === "1D" ? 0.5 : 2.2);
    const cycle = Math.sin(index * 0.19 + seed % 23) * amplitude * 0.28;
    const slowCycle = Math.sin(index * 0.067 + seed % 7) * amplitude * 0.35;
    const noise = (random(seed + index * 29) - 0.5) * amplitude * 0.38;
    let close = instrument.basePrice * (1 + trend + cycle + slowCycle + noise);
    if (index === config.points - 1) close = quote.price;
    const open = index === 0 ? close * (1 - noise * 0.2) : previous;
    const wick = Math.max(close * 0.0005, Math.abs(close - open) * 0.35 + close * amplitude * random(seed + index * 43) * 0.055);
    candles.push({
      time: at - (config.points - 1 - index) * config.step,
      open,
      high: Math.max(open, close) + wick,
      low: Math.max(0.000001, Math.min(open, close) - wick * 0.88),
      close,
      volume: Math.round((instrument.volume / config.points) * (0.45 + random(seed + index * 61) * 1.25)),
    });
    previous = close;
  }
  return candles;
}

export function isChartRange(value: string | null): value is ChartRange {
  return value === "1D" || value === "1W" || value === "1M" || value === "1Y";
}
