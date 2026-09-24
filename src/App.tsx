import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CURRENCY_LIST } from './currencies';
import { isNative, setupKeyboard, getAppVersion, setStatusBar, onResume, compareVersions, UPDATE_CONFIG_URL, WEB_VERSION } from './native';
import blueIcon from "./assets/f072ca8afcdc379b-mCurrency_blue_mC_middle.png";
import appIcon from "./assets/icon-app.png";
import icon1024 from "./assets/5d5bc5e9757134af-Icon-1024.png";

// Round flag images (circle-flags, MIT licence) - same look on every device
const FLAG_FILES = import.meta.glob('./assets/flags/*.svg', { eager: true, import: 'default' }) as Record<string, string>;
const FLAG_BY_CODE: Record<string, string> = { ...Object.fromEntries(CURRENCY_LIST), XAU:'xau', XAG:'xag' };
const flagSrc = (code: string) => FLAG_FILES[`./assets/flags/${FLAG_BY_CODE[code]}.svg`];

type CurrencyCode = string;
type ThemeOpt = 'auto'|'light'|'dark';
type Lang = 'en'|'zh-TW'|'zh-CN'|'ja'|'ko'|'id'|'hi'|'th';
type Tab = 'convert'|'chart';
type Timeframe = '1W'|'1M'|'3M'|'6M'|'1Y'|'2Y';
const TIMEFRAMES: Timeframe[] = ['1W','1M','3M','6M','1Y','2Y'];
const TF_DAYS: Record<Timeframe, number> = { '1W':7,'1M':31,'3M':92,'6M':183,'1Y':366,'2Y':731 };

// Precious metals (price per troy ounce). Rates come from fawazahmed0 currency-api.
const METALS = ['XAU','XAG'];
const isMetal = (code: string) => METALS.includes(code);
const METAL_NAMES: Record<string, Record<string,string>> = {
  XAU: { en:'Gold (oz)', 'zh-TW':'黃金（盎司）', 'zh-CN':'黄金（盎司）', ja:'金（オンス）', ko:'금 (온스)', id:'Emas (ons)', hi:'सोना (औंस)', th:'ทองคำ (ออนซ์)' },
  XAG: { en:'Silver (oz)', 'zh-TW':'白銀（盎司）', 'zh-CN':'白银（盎司）', ja:'銀（オンス）', ko:'은 (온스)', id:'Perak (ons)', hi:'चांदी (औंस)', th:'เงิน (ออนซ์)' },
};

interface Currency {
  code: CurrencyCode;
  flag: string;
  symbol: string;
  name: Record<Lang,string>;
  rate: number; // relative to AUD
}

const SEED: Currency[] = [
  { code:'AUD', flag:'🇦🇺', symbol:'$', name:{en:'Australian Dollar','zh-TW':'澳幣','zh-CN':'澳元',ja:'豪ドル',ko:'호주 달러',id:'Dolar Australia',hi:'ऑस्ट्रेलियाई डॉलर',th:'ดอลลาร์ออสเตรเลีย'}, rate:1 },
  { code:'HKD', flag:'🇭🇰', symbol:'$', name:{en:'Hong Kong Dollar','zh-TW':'港幣','zh-CN':'港币',ja:'香港ドル',ko:'홍콩 달러',id:'Dolar Hong Kong',hi:'हांगकांग डॉलर',th:'ดอลลาร์ฮ่องกง'}, rate:5.5877 },
  { code:'JPY', flag:'🇯🇵', symbol:'¥', name:{en:'Japanese Yen','zh-TW':'日圓','zh-CN':'日元',ja:'日本円',ko:'일본 엔',id:'Yen Jepang',hi:'जापानी येन',th:'เยนญี่ปุ่น'}, rate:112.18 },
  { code:'THB', flag:'🇹🇭', symbol:'฿', name:{en:'Thai Baht','zh-TW':'泰銖','zh-CN':'泰铢',ja:'タイバーツ',ko:'태국 바트',id:'Baht Thailand',hi:'थाई बात',th:'บาทไทย'}, rate:23.672 },
  { code:'USD', flag:'🇺🇸', symbol:'$', name:{en:'US Dollar','zh-TW':'美元','zh-CN':'美元',ja:'米ドル',ko:'미국 달러',id:'Dolar AS',hi:'अमेरिकी डॉलर',th:'ดอลลาร์สหรัฐ'}, rate:0.71232 },
  { code:'CNY', flag:'🇨🇳', symbol:'¥', name:{en:'Chinese Yuan','zh-TW':'人民幣','zh-CN':'人民币',ja:'人民元',ko:'위안',id:'Yuan Tiongkok',hi:'चीनी युआन',th:'หยวนจีน'}, rate:4.7697 },
  { code:'TWD', flag:'🇹🇼', symbol:'NT$', name:{en:'New Taiwan Dollar','zh-TW':'新台幣','zh-CN':'新台币',ja:'ニュー台湾ドル',ko:'신 대만 달러',id:'Dolar Taiwan',hi:'ताइवानी डॉलर',th:'ดอลลาร์ไต้หวัน'}, rate:22.566 },
  { code:'CAD', flag:'🇨🇦', symbol:'$', name:{en:'Canadian Dollar','zh-TW':'加幣','zh-CN':'加元',ja:'カナダドル',ko:'캐나다 달러',id:'Dolar Kanada',hi:'कैनेडियन डॉलर',th:'ดอลลาร์แคนาดา'}, rate:0.90041 },
  { code:'EUR', flag:'🇪🇺', symbol:'€', name:{en:'Euro','zh-TW':'歐元','zh-CN':'欧元',ja:'ユーロ',ko:'유로',id:'Euro',hi:'यूरो',th:'ยูโร'}, rate:0.6215 },
  { code:'GBP', flag:'🇬🇧', symbol:'£', name:{en:'British Pound','zh-TW':'英鎊','zh-CN':'英镑',ja:'英ポンド',ko:'영국 파운드',id:'Pound Inggris',hi:'ब्रिटिश पाउंड',th:'ปอนด์อังกฤษ'}, rate:0.5321 },
  { code:'SGD', flag:'🇸🇬', symbol:'$', name:{en:'Singapore Dollar','zh-TW':'新加坡幣','zh-CN':'新加坡元',ja:'シンガポールドル',ko:'싱가포르 달러',id:'Dolar Singapura',hi:'सिंगापुर डॉलर',th:'ดอลลาร์สิงคโปร์'}, rate:0.9175 },
  { code:'INR', flag:'🇮🇳', symbol:'₹', name:{en:'Indian Rupee','zh-TW':'印度盧比','zh-CN':'印度卢比',ja:'インドルピー',ko:'인도 루피',id:'Rupee India',hi:'भारतीय रुपया',th:'รูปีอินเดีย'}, rate:59.234 },
  { code:'IDR', flag:'🇮🇩', symbol:'Rp', name:{en:'Indonesian Rupiah','zh-TW':'印尼盾','zh-CN':'印尼盾',ja:'インドネシアルピア',ko:'인도네시아 루피아',id:'Rupiah Indonesia',hi:'इंडोनेशियाई रुपिया',th:'รูเปียห์อินโดนีเซีย'}, rate:11500.45 },
];
const SEED_BY_CODE: Record<string, Currency> = Object.fromEntries(SEED.map(c=>[c.code,c]));

// Localised currency names + symbols, generated from the browser's own data
const DISPLAY: Record<Lang, Intl.DisplayNames|null> = (()=>{
  const out: any = {};
  (['en','zh-TW','zh-CN','ja','ko','id','hi','th'] as Lang[]).forEach(l=>{
    try { out[l] = new Intl.DisplayNames([l], { type: 'currency' }); } catch { out[l] = null; }
  });
  return out;
})();
function nameFor(code: string, lang: Lang): string {
  const seed = SEED_BY_CODE[code];
  if (seed && seed.name[lang]) return seed.name[lang];
  try { const n = DISPLAY[lang]?.of(code); if (n && n !== code) return n; } catch {}
  try { const n = DISPLAY['en']?.of(code); if (n && n !== code) return n; } catch {}
  return code;
}
function symbolFor(code: string): string {
  const seed = SEED_BY_CODE[code];
  if (seed) return seed.symbol;
  try {
    const parts = new Intl.NumberFormat('en', { style:'currency', currency: code, currencyDisplay:'narrowSymbol' }).formatToParts(1);
    const sym = parts.find(p=>p.type==='currency')?.value;
    if (sym) return sym;
  } catch {}
  return '';
}
const CURRENCIES: Currency[] = [
  ...CURRENCY_LIST.map(([code, cc])=>({
    code,
    flag: cc,
    symbol: symbolFor(code),
    name: Object.fromEntries((['en','zh-TW','zh-CN','ja','ko','id','hi','th'] as Lang[]).map(l=>[l, nameFor(code,l)])) as Record<Lang,string>,
    rate: SEED_BY_CODE[code]?.rate ?? 0,
  })),
  ...METALS.map(code=>({ code, flag: code.toLowerCase(), symbol: '', name: METAL_NAMES[code] as Record<Lang,string>, rate: 0 })),
];
const FX_CODES = CURRENCIES.filter(c=>!isMetal(c.code)).map(c=>c.code);

const I18N: Record<Lang, any> = {
  en:{ updateTitle:'Update required', updateMsg:'A new version of mCurrency is available. Please update to keep using the app.', updateBtn:'Update now', general:'General', supportAbout:'Support & About', currencies:'Currencies', metals:'Precious Metals', metalNote:'Metal prices are for reference only', noChart:'No chart data for now', loadingChart:'Loading…', currency_title:'Currency', baseCurrency:'Base Currency', editAmount:'Edit Amount', editCurrencies:'Edit Currencies', settings:'Settings', convert:'Convert', chart:'Chart', search:'Search', theme:'Theme', language:'Language', about:'About mStudio', auto:'Auto', light:'Light', dark:'Dark', version:'mCurrency v1.0 by mStudio', addCurrency:'Add Currency', selectBase:'Select Base', done:'Done', swap:'Swap', rateApp:'Rate App', privacy:'Privacy Policy', selectCurrency:'Select Currency' },
  'zh-TW':{ updateTitle:'需要更新', updateMsg:'mCurrency 有新版本，請更新後繼續使用。', updateBtn:'立即更新', general:'一般', supportAbout:'支援與關於', currencies:'貨幣', metals:'貴金屬', metalNote:'金屬價格僅供參考', noChart:'暫時未有圖表數據', loadingChart:'載入中…', currency_title:'貨幣', baseCurrency:'基準貨幣', editAmount:'編輯金額', editCurrencies:'編輯貨幣', settings:'設定', convert:'兌換', chart:'圖表', search:'搜尋', theme:'主題', language:'語言', about:'關於 mStudio', auto:'自動', light:'淺色', dark:'深色', version:'mCurrency v1.0 by mStudio', addCurrency:'新增貨幣', selectBase:'選擇基準', done:'完成', swap:'交換', rateApp:'評價 App', privacy:'私隱政策', selectCurrency:'選擇貨幣' },
  'zh-CN':{ updateTitle:'需要更新', updateMsg:'mCurrency 有新版本，请更新后继续使用。', updateBtn:'立即更新', general:'通用', supportAbout:'支持与关于', currencies:'货币', metals:'贵金属', metalNote:'金属价格仅供参考', noChart:'暂时没有图表数据', loadingChart:'加载中…', currency_title:'货币', baseCurrency:'基准货币', editAmount:'编辑金额', editCurrencies:'编辑货币', settings:'设置', convert:'兑换', chart:'图表', search:'搜索', theme:'主题', language:'语言', about:'关于 mStudio', auto:'自动', light:'浅色', dark:'深色', version:'mCurrency v1.0 by mStudio', addCurrency:'新增货币', selectBase:'选择基准', done:'完成', swap:'交换', rateApp:'评价 App', privacy:'隐私政策', selectCurrency:'选择货币' },
  ja:{ updateTitle:'アップデートが必要です', updateMsg:'mCurrency の新しいバージョンがあります。引き続きご利用いただくにはアップデートしてください。', updateBtn:'今すぐアップデート', general:'一般', supportAbout:'サポートと情報', currencies:'通貨', metals:'貴金属', metalNote:'金属価格は参考値です', noChart:'チャートデータがありません', loadingChart:'読み込み中…', currency_title:'通貨', baseCurrency:'基準通貨', editAmount:'金額を編集', editCurrencies:'通貨を編集', settings:'設定', convert:'変換', chart:'チャート', search:'検索', theme:'テーマ', language:'言語', about:'mStudioについて', auto:'自動', light:'ライト', dark:'ダーク', version:'mCurrency v1.0 by mStudio', addCurrency:'通貨を追加', selectBase:'基準を選択', done:'完了', swap:'入れ替え', rateApp:'Appを評価', privacy:'プライバシー', selectCurrency:'通貨を選択' },
  ko:{ updateTitle:'업데이트 필요', updateMsg:'mCurrency의 새 버전이 있습니다. 계속 사용하려면 업데이트하세요.', updateBtn:'지금 업데이트', general:'일반', supportAbout:'지원 및 정보', currencies:'통화', metals:'귀금속', metalNote:'금속 가격은 참고용입니다', noChart:'차트 데이터가 없습니다', loadingChart:'불러오는 중…', currency_title:'통화', baseCurrency:'기준 통화', editAmount:'금액 편집', editCurrencies:'통화 편집', settings:'설정', convert:'변환', chart:'차트', search:'검색', theme:'테마', language:'언어', about:'mStudio 소개', auto:'자동', light:'라이트', dark:'다크', version:'mCurrency v1.0 by mStudio', addCurrency:'통화 추가', selectBase:'기준 선택', done:'완료', swap:'바꾸기', rateApp:'앱 평가', privacy:'개인정보', selectCurrency:'통화 선택' },
  id:{ updateTitle:'Pembaruan diperlukan', updateMsg:'Versi baru mCurrency tersedia. Perbarui untuk terus menggunakan aplikasi.', updateBtn:'Perbarui sekarang', general:'Umum', supportAbout:'Dukungan & Tentang', currencies:'Mata Uang', metals:'Logam Mulia', metalNote:'Harga logam hanya sebagai referensi', noChart:'Belum ada data grafik', loadingChart:'Memuat…', currency_title:'Mata Uang', baseCurrency:'Mata Uang Dasar', editAmount:'Edit Jumlah', editCurrencies:'Edit Mata Uang', settings:'Pengaturan', convert:'Konversi', chart:'Grafik', search:'Cari', theme:'Tema', language:'Bahasa', about:'Tentang mStudio', auto:'Otomatis', light:'Terang', dark:'Gelap', version:'mCurrency v1.0 oleh mStudio', addCurrency:'Tambah Mata Uang', selectBase:'Pilih Dasar', done:'Selesai', swap:'Tukar', rateApp:'Beri Rating', privacy:'Kebijakan Privasi', selectCurrency:'Pilih Mata Uang' },
  hi:{ updateTitle:'अपडेट आवश्यक है', updateMsg:'mCurrency का नया संस्करण उपलब्ध है। ऐप का उपयोग जारी रखने के लिए कृपया अपडेट करें।', updateBtn:'अभी अपडेट करें', general:'सामान्य', supportAbout:'सहायता और जानकारी', currencies:'मुद्राएँ', metals:'कीमती धातुएँ', metalNote:'धातु की कीमतें केवल संदर्भ के लिए हैं', noChart:'अभी चार्ट डेटा नहीं है', loadingChart:'लोड हो रहा है…', currency_title:'मुद्रा', baseCurrency:'आधार मुद्रा', editAmount:'राशि संपादित करें', editCurrencies:'मुद्राएँ संपादित करें', settings:'सेटिंग्स', convert:'कन्वर्ट', chart:'चार्ट', search:'खोजें', theme:'थीम', language:'भाषा', about:'mStudio के बारे में', auto:'ऑटो', light:'लाइट', dark:'डार्क', version:'mCurrency v1.0 by mStudio', addCurrency:'मुद्रा जोड़ें', selectBase:'आधार चुनें', done:'हो गया', swap:'बदलें', rateApp:'ऐप रेट करें', privacy:'गोपनीयता', selectCurrency:'मुद्रा चुनें' },
  th:{ updateTitle:'จำเป็นต้องอัปเดต', updateMsg:'มี mCurrency เวอร์ชันใหม่ กรุณาอัปเดตเพื่อใช้งานต่อ', updateBtn:'อัปเดตเลย', general:'ทั่วไป', supportAbout:'การสนับสนุนและเกี่ยวกับ', currencies:'สกุลเงิน', metals:'โลหะมีค่า', metalNote:'ราคาโลหะใช้เพื่ออ้างอิงเท่านั้น', noChart:'ยังไม่มีข้อมูลกราฟ', loadingChart:'กำลังโหลด…', currency_title:'สกุลเงิน', baseCurrency:'สกุลเงินหลัก', editAmount:'แก้ไขจำนวน', editCurrencies:'แก้ไขสกุลเงิน', settings:'การตั้งค่า', convert:'แปลง', chart:'กราฟ', search:'ค้นหา', theme:'ธีม', language:'ภาษา', about:'เกี่ยวกับ mStudio', auto:'อัตโนมัติ', light:'สว่าง', dark:'มืด', version:'mCurrency v1.0 by mStudio', addCurrency:'เพิ่มสกุลเงิน', selectBase:'เลือกสกุลหลัก', done:'เสร็จสิ้น', swap:'สลับ', rateApp:'ให้คะแนนแอป', privacy:'นโยบายความเป็นส่วนตัว', selectCurrency:'เลือกสกุลเงิน' },
};

const LANG_FLAGS: Record<Lang, string> = {
  en:'🇺🇸',
  'zh-TW':'🇭🇰',
  'zh-CN':'🇨🇳',
  ja:'🇯🇵',
  ko:'🇰🇷',
  id:'🇮🇩',
  hi:'🇮🇳',
  th:'🇹🇭',
};
const LANG_LABEL: Record<Lang, string> = {
  en:'English',
  'zh-TW':'繁體中文',
  'zh-CN':'简体中文',
  ja:'日本語',
  ko:'한국어',
  id:'Bahasa Indonesia',
  hi:'हिन्दी',
  th:'ไทย',
};

// v10 BLUE: primary #07AD00 - large blue pill = fixed 3 decimals (e.g. 5.587, 1.000, 0.712)
function formatRate(v: number): string {
  if (!isFinite(v)) return '-';
  return v.toFixed(4);
}
function formatPill(v: number, code?: string): string {
  if (!isFinite(v)) return '-';
  // metals: 1 AUD is a tiny part of an ounce, so show more decimals
  if (code && isMetal(code) && Math.abs(v) < 1) return v.toFixed(6);
  return v.toFixed(4);
}
// precise 7 decimals for small gray
function formatPrecise7(v: number): string {
  if (!isFinite(v)) return '0.0000000';
  // keep 7 decimals, even if large
  return v.toFixed(7);
}

const BLUE = '#07AD00';
const BLUE_DARK_BG = '#0C2500'; // dark blue for secondary pills / badges
const BLUE_DARK_BG_2 = '#10300A';
const BLUE_PILL_DARK = '#0C2500';

// Saved settings on this device (localStorage)
const STORE_KEY = 'mcurrency:settings:v1';
const RATES_KEY = 'mcurrency:rates:v1';
const SAVED: Record<string, any> = (()=>{
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}') || {}; } catch { return {}; }
})();
const VALID_CODES = CURRENCIES.map(c=>c.code) as string[];
function saved<T>(key: string, fallback: T, ok: (v:any)=>boolean = ()=>true): T {
  const v = SAVED[key];
  return v !== undefined && v !== null && ok(v) ? v as T : fallback;
}

// fetch JSON with a timeout; returns null on any failure
async function getJSON(url: string, ms = 8000): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(()=>ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if(!res.ok) return null;
    return await res.json();
  } catch { return null; }
  finally { clearTimeout(timer); }
}
// fawazahmed0 currency-api: jsDelivr first, Cloudflare as fallback (as the author recommends)
async function fetchFawaz(): Promise<{rates: Record<string,number>, date: string|null}|null> {
  const urls = [
    'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/aud.min.json',
    'https://latest.currency-api.pages.dev/v1/currencies/aud.min.json',
  ];
  for(const u of urls){
    const d = await getJSON(u);
    if(d && d.aud && typeof d.aud === 'object') return { rates: d.aud, date: typeof d.date === 'string' ? d.date : null };
  }
  return null;
}

export default function App(){
  const [themeOpt,setThemeOpt] = useState<ThemeOpt>(()=>saved<ThemeOpt>('themeOpt','dark',v=>['auto','light','dark'].includes(v)));
  const [systemDark,setSystemDark] = useState(true);
  const [lang,setLang] = useState<Lang>(()=>saved<Lang>('lang','en',v=>v in I18N));
  const [tab,setTab] = useState<Tab>(()=>saved<Tab>('tab','convert',v=>v==='convert'||v==='chart'));
  const [addTab,setAddTab] = useState<'fx'|'metal'>('fx');
  const [base,setBase] = useState<CurrencyCode>(()=>saved<CurrencyCode>('base','AUD',v=>VALID_CODES.includes(v)));
  const [amount,setAmount] = useState<number>(()=>saved<number>('amount',1,v=>typeof v==='number' && isFinite(v)));
  const [currList,setCurrList] = useState<CurrencyCode[]>(()=>saved<CurrencyCode[]>('currList',['AUD','HKD','JPY','THB','USD','CNY'],v=>Array.isArray(v) && v.length>0 && v.every((x:any)=>VALID_CODES.includes(x))));
  const [calcOpen,setCalcOpen] = useState(false);
  const [calcDisplay,setCalcDisplay] = useState('1');
  const [calcPrev,setCalcPrev] = useState<number|null>(null);
  const [calcOp,setCalcOp] = useState<string|null>(null);
  const [waiting,setWaiting] = useState(false);
  const [addOpen,setAddOpen] = useState(false);
  const [baseSelectOpen,setBaseSelectOpen] = useState(false);
  const [settingsOpen,setSettingsOpen] = useState(false);
  const [showAboutPage,setShowAboutPage] = useState(false);
  const [showPrivacyPage,setShowPrivacyPage] = useState(false);

  // App version: real version from Xcode in the iOS app, WEB_VERSION on the web
  const [appVersion,setAppVersion] = useState<string>(WEB_VERSION);
  useEffect(()=>{ getAppVersion().then(setAppVersion); },[]);
  useEffect(()=>{ setupKeyboard(); },[]);

  // Forced update (iOS app only). If the config can't be read (offline etc.) the app works as normal.
  const [updateUrl,setUpdateUrl] = useState<string|null>(null);
  useEffect(()=>{
    if(!isNative) return;
    const check = async ()=>{
      const cfg = await getJSON(UPDATE_CONFIG_URL);
      const current = await getAppVersion();
      if(cfg && typeof cfg.minVersion==='string' && typeof cfg.storeUrl==='string' && compareVersions(current, cfg.minVersion) < 0){
        setUpdateUrl(cfg.storeUrl);
      }
    };
    check();
    return onResume(check);
  },[]);
  const [search,setSearch] = useState('');
  const [chartFrom,setChartFrom] = useState<CurrencyCode>(()=>saved<CurrencyCode>('chartFrom','EUR',v=>FX_CODES.includes(v)));
  const [chartTo,setChartTo] = useState<CurrencyCode>(()=>saved<CurrencyCode>('chartTo','USD',v=>FX_CODES.includes(v)));
  const [timeframe,setTimeframe] = useState<Timeframe>(()=>saved<Timeframe>('timeframe','3M',v=>TIMEFRAMES.includes(v)));
  const [toast,setToast] = useState<string|null>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  // editing and chart picker
  const [editingCode,setEditingCode] = useState<CurrencyCode>('AUD');
  const [chartPickerOpen,setChartPickerOpen] = useState(false);
  const [chartPickerSide,setChartPickerSide] = useState<'from'|'to'>('from');
  const [chartSearch,setChartSearch] = useState('');
  // Full edit page
  const [showEditPage,setShowEditPage] = useState(false);
  const [editDraft,setEditDraft] = useState<CurrencyCode[]>([]);
  const [dragIdx,setDragIdx] = useState<number|null>(null);
  const [dragOverIdx,setDragOverIdx] = useState<number|null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const t = I18N[lang];

  useEffect(()=>{
    const m = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemDark(m.matches);
    const h = (e: MediaQueryListEvent)=>setSystemDark(e.matches);
    m.addEventListener('change',h);
    return ()=>m.removeEventListener('change',h);
  },[]);

  const resolvedTheme = themeOpt==='auto' ? (systemDark?'dark':'light') : themeOpt;
  const isDark = resolvedTheme==='dark';
  useEffect(()=>{ setStatusBar(isDark); },[isDark]);

  // Remember settings on this device
  useEffect(()=>{
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ themeOpt, lang, tab, base, amount, currList, chartFrom, chartTo, timeframe }));
    } catch {}
  },[themeOpt,lang,tab,base,amount,currList,chartFrom,chartTo,timeframe]);

  // Page background behind the app (also fills the iPhone status bar area)
  useEffect(()=>{
    const mobile = window.matchMedia('(max-width: 639px)').matches;
    const bg = isDark ? (mobile ? '#000000' : '#0a0a0a') : (mobile ? '#07AD00' : '#e8e8ea');
    document.documentElement.style.backgroundColor = bg;
    document.body.style.backgroundColor = bg;
  },[isDark]);

  // ---- Live exchange rates (ExchangeRate-API open endpoint, no key) ----
  const [liveRates,setLiveRates] = useState<Record<string,number>|null>(()=>{
    try { const v = JSON.parse(localStorage.getItem(RATES_KEY)||'null'); return v && v.rates ? v.rates : null; } catch { return null; }
  });
  const [ratesTime,setRatesTime] = useState<number|null>(()=>{
    try { const v = JSON.parse(localStorage.getItem(RATES_KEY)||'null'); return v && v.time ? v.time : null; } catch { return null; }
  });
  const [ratesLoading,setRatesLoading] = useState(false);
  const [rateSource,setRateSource] = useState<string|null>(()=>{
    try { const v = JSON.parse(localStorage.getItem(RATES_KEY)||'null'); return v && v.source ? v.source : null; } catch { return null; }
  });
  const [ratesError,setRatesError] = useState(false);
  const [now,setNow] = useState(()=>Date.now());

  const [rateDate,setRateDate] = useState<string|null>(()=>{
    try { const v = JSON.parse(localStorage.getItem(RATES_KEY)||'null'); return v && v.date ? v.date : null; } catch { return null; }
  });

  const fetchRates = async () => {
    setRatesLoading(true);
    let map: Record<string,number>|null = null;
    let date: string|null = null;
    let source: string|null = null;

    const collect = (obj: any) => {
      const out: Record<string,number> = { AUD: 1 };
      Object.keys(obj).forEach(k=>{ const v = obj[k]; if(typeof v === 'number' && isFinite(v)) out[k.toUpperCase()] = v; });
      return out;
    };

    // Fetch Frankfurter and currency-api at the same time
    const [frank, fawaz] = await Promise.all([
      getJSON('https://api.frankfurter.dev/v2/rates?base=AUD'),
      fetchFawaz(),
    ]);

    // 1) Frankfurter - free, no key, official sources (central banks).
    //    Returns an array of { date, base, quote, rate } rows.
    if(Array.isArray(frank) && frank.length > 5){
      const out: Record<string,number> = { AUD: 1 };
      let newest = '';
      frank.forEach((row:any)=>{
        if(row && typeof row.quote === 'string' && typeof row.rate === 'number' && isFinite(row.rate)){
          out[row.quote.toUpperCase()] = row.rate;
          if(typeof row.date === 'string' && row.date > newest) newest = row.date;
        }
      });
      if(Object.keys(out).length > 5){ map = out; date = newest || null; source = 'Frankfurter'; }
    }

    // 2) Backup: fawazahmed0 currency-api (free, no key)
    if(!map && fawaz){
      map = collect(fawaz.rates); date = fawaz.date; source = 'Currency-API';
    }

    // 3) Last backup: ExchangeRate-API open endpoint
    if(!map){
      const data = await getJSON('https://open.er-api.com/v6/latest/AUD');
      if(data && data.result==='success' && data.rates){
        map = collect(data.rates);
        date = data.time_last_update_utc ? new Date(data.time_last_update_utc).toISOString().slice(0,10) : null;
        source = 'ExchangeRate-API';
      }
    }

    // Gold and silver always come from currency-api (Frankfurter has no metals)
    if(map && fawaz){
      METALS.forEach(m=>{
        const v = fawaz.rates[m.toLowerCase()];
        if(typeof v === 'number' && isFinite(v) && v > 0) map![m] = v;
      });
    }

    if(map && Object.keys(map).length > 5){
      const time = Date.now();
      setLiveRates(map); setRatesTime(time); setRateDate(date); setRateSource(source); setRatesError(false);
      try { localStorage.setItem(RATES_KEY, JSON.stringify({ rates: map, time, date, source })); } catch {}
    } else {
      setRatesError(true);
    }
    setRatesLoading(false);
  };

  const ratesTimeRef = useRef<number|null>(ratesTime);
  useEffect(()=>{ ratesTimeRef.current = ratesTime; },[ratesTime]);

  useEffect(()=>{
    const maybeFetch = ()=>{ if(!ratesTimeRef.current || Date.now()-ratesTimeRef.current > 60*60*1000) fetchRates(); };
    maybeFetch();
    const iv = setInterval(maybeFetch, 5*60*1000);
    const tick = setInterval(()=>setNow(Date.now()), 30*1000);
    const onVisible = ()=>{ if(document.visibilityState==='visible'){ setNow(Date.now()); maybeFetch(); } };
    document.addEventListener('visibilitychange', onVisible);
    return ()=>{ clearInterval(iv); clearInterval(tick); document.removeEventListener('visibilitychange', onVisible); };
  },[]);

  const rateOf = (code: CurrencyCode) => (liveRates && liveRates[code]) || (isMetal(code) ? NaN : (CURRENCIES.find(c=>c.code===code)?.rate || 1));
  const baseRate = useMemo(()=> rateOf(base),[base,liveRates]);
  const getConverted = (code: CurrencyCode) => amount * (rateOf(code) / baseRate);

  const updatedLabel = useMemo(()=>{
    if(ratesLoading && !ratesTime) return 'Updating rates…';
    if(!ratesTime) return ratesError ? 'Offline - using saved rates' : 'Updating rates…';
    const mins = Math.max(0, Math.floor((now - ratesTime)/60000));
    if(mins < 2) return 'Updated a moment ago';
    if(mins < 60) return `Updated ${mins} minutes ago`;
    const hrs = Math.floor(mins/60);
    if(hrs < 24) return `Updated ${hrs} hour${hrs>1?'s':''} ago`;
    const days = Math.floor(hrs/24);
    return `Updated ${days} day${days>1?'s':''} ago`;
  },[ratesTime,now,ratesLoading,ratesError]);

  // Chart header uses the same live rates as the Convert page
  const chartRate = useMemo(()=> rateOf(chartTo) / rateOf(chartFrom), [chartFrom,chartTo,liveRates]);

  // Real history from Frankfurter time series
  type Point = { date: string; rate: number };
  const chartCache = useRef<Record<string, Point[]>>({});
  const [chartSeries,setChartSeries] = useState<Point[]|null>(null);
  const [chartLoading,setChartLoading] = useState(false);
  useEffect(()=>{
    if(tab!=='chart') return;
    const key = `${chartFrom}-${chartTo}-${timeframe}`;
    if(chartCache.current[key]){ setChartSeries(chartCache.current[key]); return; }
    let cancelled = false;
    setChartLoading(true);
    (async()=>{
      let pts: Point[] = [];
      if(chartFrom===chartTo){
        pts = [{date:'',rate:1},{date:'',rate:1}];
      } else {
        const start = new Date(Date.now() - TF_DAYS[timeframe]*86400000).toISOString().slice(0,10);
        const group = (timeframe==='1Y'||timeframe==='2Y') ? '&group=week' : '';
        const data = await getJSON(`https://api.frankfurter.dev/v2/rates?base=${chartFrom}&quotes=${chartTo}&from=${start}${group}`);
        if(Array.isArray(data)){
          pts = data
            .filter((r:any)=> r && r.quote===chartTo && typeof r.rate==='number' && isFinite(r.rate) && typeof r.date==='string')
            .map((r:any)=>({ date: r.date, rate: r.rate }))
            .sort((x:Point,y:Point)=> x.date < y.date ? -1 : 1);
        }
      }
      if(cancelled) return;
      if(pts.length>=2) chartCache.current[key] = pts;
      setChartSeries(pts.length>=2 ? pts : null);
      setChartLoading(false);
    })();
    return ()=>{ cancelled = true; };
  },[tab,chartFrom,chartTo,timeframe]);

  const chartData = useMemo(()=>{
    if(!chartSeries) return null;
    const arr = chartSeries.map(p=>p.rate);
    const min = Math.min(...arr), max = Math.max(...arr);
    const first = arr[0], last = arr[arr.length-1];
    const change = first ? ((last-first)/first)*100 : 0;
    return { arr, min, max, change, from: chartSeries[0].date, to: chartSeries[chartSeries.length-1].date };
  },[chartSeries]);

  const showToast = (msg:string)=>{ setToast(msg); setTimeout(()=>setToast(null),2200); };


  // calculator logic
  const inputDigit = (d:string)=>{
    if(waiting){
      setCalcDisplay(d==='.'?'0.':d);
      setWaiting(false);
    }else{
      if(d==='.' && calcDisplay.includes('.')) return;
      if(calcDisplay==='0' && d!==' . ' && d!=='.') setCalcDisplay(d);
      else setCalcDisplay(prev=> prev.length>12?prev: prev+d);
    }
  };
  const clearCalc = ()=>{ setCalcDisplay('0'); setCalcPrev(null); setCalcOp(null); setWaiting(false); };
  const handleOperator = (nextOp:string)=>{
    const inputVal = parseFloat(calcDisplay);
    if(calcPrev===null){ setCalcPrev(inputVal); }
    else if(calcOp){
      const res = calculate(calcPrev,inputVal,calcOp);
      setCalcPrev(res); setCalcDisplay(String(res));
    }
    setWaiting(true); setCalcOp(nextOp);
  };
  const calculate = (a:number,b:number,op:string)=>{
    switch(op){
      case '+': return a+b;
      case '-': return a-b;
      case '×': case '*': return a*b;
      case '÷': case '/': return b!==0? a/b : 0;
      default: return b;
    }
  };
  const handleEquals = ()=>{
    if(calcOp && calcPrev!==null){
      const res = calculate(calcPrev, parseFloat(calcDisplay), calcOp);
      setCalcDisplay(String(res));
      setCalcPrev(null); setCalcOp(null); setWaiting(true);
    }
  };
  const openCalcWithAmount = (val:number, code?: CurrencyCode)=>{
    const c = code || base;
    setEditingCode(c);
    // v10: calculator initial display = large pill number (3 decimals)
    const pillStr = isFinite(val) ? val.toFixed(3) : '0.000';
    setCalcDisplay(pillStr);
    setCalcOpen(true);
  };

  const visibleList = currList;

  // in Edit page, compare with the list being edited (so removed items can be added back straight away)
  const listInUse = showEditPage ? editDraft : currList;
  const filteredAdd = CURRENCIES.filter(c=> !listInUse.includes(c.code) && (addTab==='metal' ? isMetal(c.code) : !isMetal(c.code)) && (c.code.toLowerCase().includes(search.toLowerCase()) || c.name[lang].toLowerCase().includes(search.toLowerCase()) || c.name.en.toLowerCase().includes(search.toLowerCase())));

  // icons
  const IconConvert = ()=>(<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 16V4M7 4L3 8M7 4l4 4M17 8v12M17 20l-4-4M17 20l4-4"/></svg>);
  const IconChart = ()=>(<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 6-8"/></svg>);

  // chart picker filtered
  const filteredChart = useMemo(()=> CURRENCIES.filter(c=> !isMetal(c.code) && (
    c.code.toLowerCase().includes(chartSearch.toLowerCase()) || 
    c.name[lang].toLowerCase().includes(chartSearch.toLowerCase()) ||
    c.name.en.toLowerCase().includes(chartSearch.toLowerCase()))
  ),[chartSearch, lang]);

  // edit sheet helpers
  const openEditSheet = ()=>{
    setEditDraft([...currList]);
    setDragIdx(null);
    setDragOverIdx(null);
    setShowEditPage(true);
  };
  const moveItem = (from:number, to:number)=>{
    if(from===to) return;
    const arr = [...editDraft];
    const [moved] = arr.splice(from,1);
    arr.splice(to,0,moved);
    setEditDraft(arr);
  };
  const handleDragStart = (idx:number)=> {
    setDragIdx(idx);
    setDragOverIdx(idx);
  };
  const handleDragOver = (idx:number)=>{
    if(dragIdx===null) return;
    if(idx!==dragOverIdx){
      setDragOverIdx(idx);
    }
  };
  const handleDrop = (idx:number)=>{
    if(dragIdx!==null){
      moveItem(dragIdx, idx);
    }
    setDragIdx(null);
    setDragOverIdx(null);
  };
  const handleDragEnd = ()=>{
    if(dragIdx!==null && dragOverIdx!==null && dragIdx!==dragOverIdx){
      moveItem(dragIdx, dragOverIdx);
    }
    setDragIdx(null); setDragOverIdx(null);
  };
  // pointer/touch drag for mobile
  const handlePointerMove = (e: React.PointerEvent | React.TouchEvent)=>{
    if(dragIdx===null) return;
    let clientY: number;
    if('touches' in e){ clientY = e.touches[0].clientY; } else { clientY = (e as React.PointerEvent).clientY; }
    if(!listRef.current) return;
    const items = Array.from(listRef.current.querySelectorAll('[data-row]')) as HTMLElement[];
    for(let i=0;i<items.length;i++){
      const rect = items[i].getBoundingClientRect();
      if(clientY >= rect.top && clientY <= rect.bottom){
        if(i!==dragOverIdx) setDragOverIdx(i);
        break;
      }
    }
  };

  return (
    <div className={`fixed inset-0 w-full flex pt-[env(safe-area-inset-top)] sm:static sm:inset-auto sm:h-auto sm:min-h-screen sm:items-center sm:justify-center sm:p-6 ${isDark?'bg-black sm:bg-[#0a0a0a]':'bg-[#07AD00] sm:bg-[#e8e8ea]'}`} style={{fontFamily:"-apple-system, BlinkMacSystemFont, system-ui, 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif"}}>
      {/* Phone */}
      <div ref={phoneRef} className={`relative w-full h-full sm:w-[390px] sm:h-[844px] sm:rounded-[54px] overflow-hidden sm:shadow-[0_0_0_10px_#0a0a0a,0_40px_80px_rgba(0,0,0,0.6)] ${isDark?'bg-black':'bg-white'} flex flex-col`}>

        {/* Header - buttons on top right, large title underneath */}
        <div className={`px-4 pt-3 ${isDark?'bg-black':'bg-white'}`}>
          <div className="flex justify-end">
            <div className={`flex items-center rounded-full p-1 ${isDark?'bg-[#1C1C1E]':'bg-[#F2F2F7]'} shadow-sm`}>
              <button onClick={()=>setAddOpen(true)} className={`w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition ${isDark?'text-white':'text-black'}`}>
                <span className="text-[30px] leading-none font-light">+</span>
              </button>
              <button onClick={()=>setSettingsOpen(true)} aria-label="Settings" className={`w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition ${isDark?'text-white':'text-black'}`}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3.2" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
            </div>
          </div>
          <h1 className="text-[38px] font-bold tracking-tight leading-[1.1] pb-3 text-[#4695F4]">mCurrency</h1>
        </div>

        {/* Separator */}
        <div className={`h-[1px] mx-4 ${isDark?'bg-[#2A2A2C]':'bg-[#E5E5EA]'}`} />

        {/* Main */}
        <div className={`flex-1 overflow-y-auto no-scrollbar relative ${isDark?'bg-black':'bg-white'}`}>
          {tab==='convert' ? (
            <div className="px-0">
              {visibleList.map((code, idx)=>{
                const c = CURRENCIES.find(x=>x.code===code)!;
                const isBase = code===base;
                const conv = getConverted(code);
                const pillBg = isBase ? 'bg-[#07AD00]' : 'bg-[#0C2500]';
                const pillText = isBase ? 'text-white' : 'text-[#07AD00]';
                return (
                  <div key={code} className="relative">
                    <div className={`flex items-center justify-between px-4 py-[14px] active:bg-[#111] transition group`}>
                      <button onClick={()=>{
                        if(isBase){
                          setBaseSelectOpen(true);
                        } else {
                          openCalcWithAmount(conv, code);
                        }
                      }} className="flex items-center gap-[14px] text-left flex-1 min-w-0 pr-2">
                        <img src={flagSrc(c.code)} alt={c.code} className="w-12 h-12 rounded-full shrink-0 select-none" draggable={false} />
                        <div className="flex flex-col min-w-0 leading-tight">
                          <span className={`text-[20px] font-normal truncate ${isDark?'text-white':'text-black'}`}>{c.name[lang]}</span>
                          <span className="text-[15px] text-[#5E5E62] mt-[1px]">{c.code}</span>
                        </div>
                      </button>
                      <button onClick={()=>openCalcWithAmount(isBase?amount:conv, code)} className={`${pillBg} ${pillText} rounded-[10px] px-3 py-[8px] shrink-0 ml-2 text-right font-medium text-[20px] active:scale-95 transition tabular-nums leading-none`}>
                        {isBase ? `${c.symbol}${formatPill(amount, code)}` : `${c.symbol}${formatPill(conv, code)}`}
                      </button>
                    </div>
                    {idx < visibleList.length-1 && <div className={`h-[1px] ml-4 mr-4 ${isDark?'bg-[#2A2A2C]':'bg-[#E5E5EA]'}`} />}
                  </div>
                );
              })}

            </div>
          ) : (
            /* Chart tab */
            <div className="px-5 pt-2 pb-6">
              {/* chart header swap */}
              <div className="flex justify-between items-start">
                <div>
                  <p className={`text-[13px] ${isDark?'text-[#8E8E93]':'text-[#8E8E93]'}`}>{chartTo} per 1 {chartFrom}</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className={`text-[28px] font-bold tracking-tight tabular-nums ${isDark?'text-white':'text-black'}`}>{formatRate(chartRate)}</span>
                    {chartData && (
                      <span className={`text-[13px] font-semibold px-2 py-0.5 rounded-full ${chartData.change>=0 ? 'text-[#07AD00] bg-[#0C2500]' : 'text-[#FF453A] bg-[#3A0D0B]'}`}>{chartData.change>=0?'+':''}{chartData.change.toFixed(2)}%</span>
                    )}
                  </div>
                </div>
                <button onClick={()=>{ const f=chartFrom; setChartFrom(chartTo); setChartTo(f); }} className={`w-9 h-9 rounded-full flex items-center justify-center ${isDark?'bg-[#1C1C1E] text-white':'bg-[#F2F2F7] text-black'}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 16V4M7 4L3 8M7 4l4 4M17 8v12M17 20l-4-4M17 20l4-4"/></svg>
                </button>
              </div>

              {/* chart svg - real Frankfurter history */}
              <div className="mt-6 h-[180px] w-full relative">
                {chartData ? (
                  <svg viewBox="0 0 300 120" className="w-full h-full">
                    <defs>
                      <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#07AD00" stopOpacity="0.35"/>
                        <stop offset="100%" stopColor="#07AD00" stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    {(() => {
                      const { arr, min, max } = chartData;
                      const range = max - min || 1;
                      const line = arr.map((v,i)=>{
                        const x = (i/(arr.length-1))*300;
                        const y = 100 - ((v-min)/range)*80;
                        return `${i===0?'M':'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
                      }).join(' ');
                      const area = `${line} L300 120 L0 120 Z`;
                      return (
                        <>
                          <path d={area} fill="url(#g)" />
                          <path d={line} fill="none" stroke="#07AD00" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </>
                      )
                    })()}
                  </svg>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[17px] text-[#8E8E93]">{chartLoading ? t.loadingChart : t.noChart}</div>
                )}
                {chartData && chartLoading && <div className="absolute top-0 right-0 text-[12px] text-[#8E8E93]">{t.loadingChart}</div>}
              </div>
              {chartData && chartData.from && (
                <div className="flex justify-between text-[12px] text-[#8E8E93] mt-1 tabular-nums"><span>{chartData.from}</span><span>{chartData.to}</span></div>
              )}

              {/* timeframe */}
              <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar">
                {TIMEFRAMES.map(tf=>(
                  <button key={tf} onClick={()=>setTimeframe(tf)} className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition ${timeframe===tf ? 'bg-[#07AD00] text-white shadow-[0_2px_8px_rgba(70,149,244,0.35)]' : (isDark?'bg-[#1C1C1E] text-[#8E8E93]':'bg-[#F2F2F7] text-[#8E8E93]')}`}>{tf}</button>
                ))}
              </div>

              {/* selectors - FIXED to be tappable */}
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button onClick={()=>{setChartPickerSide('from'); setChartPickerOpen(true);}} className={`h-[68px] rounded-[16px] flex items-center gap-3 px-4 border ${isDark?'bg-[#1C1C1E] border-white/5':'bg-[#F2F2F7] border-black/5'} active:scale-[0.98] transition`}>
                  <img src={flagSrc(chartFrom)} alt={chartFrom} className="w-8 h-8 rounded-full" />
                  <div className="text-left leading-tight">
                    <div className={`text-[15px] font-semibold flex items-center gap-1 ${isDark?'text-white':'text-black'}`}>{chartFrom} <span className="text-[10px] text-[#8E8E93]">▼</span></div>
                    <div className="text-[12px] text-[#8E8E93] truncate max-w-[90px]">{CURRENCIES.find(c=>c.code===chartFrom)?.name[lang]}</div>
                  </div>
                </button>
                <button onClick={()=>{setChartPickerSide('to'); setChartPickerOpen(true);}} className={`h-[68px] rounded-[16px] flex items-center gap-3 px-4 border ${isDark?'bg-[#1C1C1E] border-white/5':'bg-[#F2F2F7] border-black/5'} active:scale-[0.98] transition`}>
                  <img src={flagSrc(chartTo)} alt={chartTo} className="w-8 h-8 rounded-full" />
                  <div className="text-left leading-tight">
                    <div className={`text-[15px] font-semibold flex items-center gap-1 ${isDark?'text-white':'text-black'}`}>{chartTo} <span className="text-[10px] text-[#8E8E93]">▼</span></div>
                    <div className="text-[12px] text-[#8E8E93] truncate max-w-[90px]">{CURRENCIES.find(c=>c.code===chartTo)?.name[lang]}</div>
                  </div>
                </button>
              </div>

              <div className={`mt-6 rounded-2xl p-4 ${isDark?'bg-[#1C1C1E]':'bg-[#F2F2F7]'}`}>
                <div className="flex justify-between text-[13px] text-[#8E8E93]"><span>Low</span><span>High</span></div>
                <div className="flex justify-between mt-1"><span className={`font-semibold tabular-nums ${isDark?'text-white':'text-black'}`}>{chartData ? formatRate(chartData.min) : '-'}</span><span className={`font-semibold tabular-nums ${isDark?'text-white':'text-black'}`}>{chartData ? formatRate(chartData.max) : '-'}</span></div>
              </div>
            </div>
          )}

          
        </div>

        {/* Bottom bar: tabs, then the rates status underneath */}
        <div className={`shrink-0 z-20 flex flex-col items-center gap-1 pt-0 pb-[calc(env(safe-area-inset-bottom)+6px)] ${isDark?'bg-black':'bg-white'}`}>
          <div className="flex items-center gap-1 p-1.5 rounded-full bg-[#141414] shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
            <button onClick={()=>setTab('convert')} className={`flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[15px] font-semibold transition ${tab==='convert' ? 'bg-[#353535] text-[#22C71B]' : 'text-[#F3F3F3]'}`}>
              <IconConvert/> {t.convert}
            </button>
            <button onClick={()=>setTab('chart')} className={`flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[15px] font-semibold transition ${tab==='chart' ? 'bg-[#353535] text-[#22C71B]' : 'text-[#F3F3F3]'}`}>
              <IconChart/> {t.chart}
            </button>
          </div>
          <button onClick={()=>fetchRates()} className="flex flex-col items-center active:opacity-60 px-4">
            <span className="text-[13px] text-[#8E8E93] font-medium">{ratesLoading ? 'Updating rates...' : updatedLabel}</span>
            <span className="text-[11px] text-[#5A5A5F] mt-[1px]">
              {ratesError && !rateSource ? 'No connection - tap to retry'
                : `${rateSource ?? 'Rates'}${rateDate ? ' - ' + rateDate : ''} - tap to refresh`}
            </span>
          </button>
        </div>

        {/* Home indicator */}
        <div className="hidden sm:block absolute bottom-2 left-1/2 -translate-x-1/2 w-[134px] h-[5px] rounded-full bg-white/80 z-20" />

        {/* Add Currency Sheet */}
        {addOpen && (
          <div className="absolute inset-0 z-[85] flex flex-col justify-end">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={()=>setAddOpen(false)} />
            <div className={`relative rounded-t-[28px] max-h-[78%] flex flex-col ${isDark?'bg-[#1C1C1E]':'bg-white'} animate-[slideUp_0.3s]`}>
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <h3 className={`text-[18px] font-bold ${isDark?'text-white':'text-black'}`}>{t.addCurrency}</h3>
                <button onClick={()=>setAddOpen(false)} className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark?'bg-[#2C2C2E] text-white':'bg-[#F2F2F7] text-black'}`}>✕</button>
              </div>
              {/* Currencies | Precious Metals */}
              <div className="px-5 pb-3">
                <div className={`flex p-[3px] rounded-[10px] ${isDark?'bg-[#2C2C2E]':'bg-[#F2F2F7]'}`}>
                  {(['fx','metal'] as const).map(k=>(
                    <button key={k} onClick={()=>setAddTab(k)} className={`flex-1 py-[7px] rounded-[8px] text-[16px] font-semibold transition ${addTab===k ? (isDark?'bg-[#636366] text-white':'bg-white text-black shadow-sm') : 'text-[#8E8E93]'}`}>{k==='fx' ? t.currencies : t.metals}</button>
                  ))}
                </div>
              </div>
              <div className="px-5 pb-3">
                <div className={`flex items-center gap-2 px-3 h-9 rounded-full ${isDark?'bg-[#2C2C2E]':'bg-[#F2F2F7]'}`}>
                  <span className="text-[#8E8E93]">🔍</span>
                  <input value={search} type="search" enterKeyHint="search" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} onChange={e=>setSearch(e.target.value)} placeholder={t.search} className={`bg-transparent outline-none text-[16px] flex-1 placeholder:text-[#8E8E93] ${isDark?'text-white':'text-black'}`}/>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-2 pb-8">
                {filteredAdd.map(c=>(
                  <button key={c.code} onClick={()=>{
                    // if we are in edit page, add to draft instead
                    if(showEditPage){
                      if(!editDraft.includes(c.code)){
                        setEditDraft(prev=>[...prev,c.code]);
                      }
                      setAddOpen(false); setSearch('');
                    } else {
                      setCurrList(prev=>[...prev,c.code]); setAddOpen(false); setSearch('');
                    }
                  }} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl active:bg-[#2C2C2E]`}>
                    <img src={flagSrc(c.code)} alt={c.code} className="w-10 h-10 rounded-full shrink-0" />
                    <div className="text-left leading-tight"><div className={`text-[16px] font-medium ${isDark?'text-white':'text-black'}`}>{c.code} - {c.name[lang]}</div><div className="text-[12px] text-[#8E8E93]">{`${c.symbol}${formatPill(rateOf(c.code), c.code)}`}</div></div>
                  </button>
                ))}
                {filteredAdd.length===0 && <div className="text-center py-10 text-[#8E8E93] text-[14px]">No results</div>}
                {addTab==='metal' && <div className="text-center px-4 pt-3 text-[13px] text-[#8E8E93]">{t.metalNote}</div>}
              </div>
            </div>
          </div>
        )}

        {/* Full-screen Edit Page - replaces old sheet */}
        {showEditPage && (
          <div className={`absolute inset-0 z-[70] flex flex-col ${isDark?'bg-black':'bg-[#F2F2F7]'} animate-[slideIn_0.28s]`}>
            {/* Header */}
            <div className={`h-[52px] flex items-center justify-between px-4 shrink-0 ${isDark?'bg-black border-b border-white/10':'bg-white border-b border-black/10'}`}>
              <button
                onClick={()=>{ setShowEditPage(false); }}
                className={`w-9 h-9 rounded-full flex items-center justify-center text-[18px] active:scale-90 transition ${isDark?'bg-[#1C1C1E] text-white':'bg-[#F2F2F7] text-black'}`}
              >✕</button>
              <h2 className={`text-[17px] font-bold tracking-tight ${isDark?'text-white':'text-black'}`}>{t.editCurrencies}</h2>
              <button
                onClick={()=>{
                  if(editDraft.length===0){ showToast('Add at least 1'); return; }
                  setCurrList(editDraft);
                  // first item becomes new base automatically
                  if(editDraft.length>0){ setBase(editDraft[0]); }
                  setShowEditPage(false);
                  showToast('Saved');
                }}
                className="w-9 h-9 rounded-full bg-[#07AD00] text-white flex items-center justify-center text-[18px] active:scale-90 shadow-[0_2px_10px_rgba(70,149,244,0.45)]"
              >✓</button>
            </div>
            {/* hint */}
            <div className={`px-5 py-3 text-[12px] ${isDark?'text-[#8E8E93] bg-black':'text-[#8E8E93] bg-[#F2F2F7]'}`}>
              <span className="inline-flex items-center gap-1.5"><span className="w-5 h-5 rounded-full bg-[#2C2C2E] flex items-center justify-center text-[10px]">≡</span> Drag to reorder • First = base • Tap − to remove</span>
            </div>
            {/* List */}
            <div ref={listRef} className="flex-1 overflow-y-auto px-3 pb-4 no-scrollbar" onPointerMove={handlePointerMove} onTouchMove={handlePointerMove as any}>
              <div className={`rounded-[16px] overflow-hidden ${isDark?'bg-[#1C1C1E]':'bg-white shadow-sm'}`}>
                {editDraft.map((code, idx)=>{
                  const c = CURRENCIES.find(x=>x.code===code)!;
                  const isDragging = dragIdx===idx;
                  const isDragOver = dragOverIdx===idx && dragIdx!==idx;
                  const isFirst = idx===0;
                  return (
                    <div
                      key={code}
                      data-row={idx}
                      data-idx={idx}
                      draggable
                      onDragStart={()=>handleDragStart(idx)}
                      onDragOver={(e)=>{ e.preventDefault(); handleDragOver(idx); }}
                      onDrop={()=>handleDrop(idx)}
                      onDragEnd={handleDragEnd}
                      className={`group flex items-center gap-3 px-3 h-[64px] select-none touch-none relative transition-all
                        ${isDragging?'opacity-40 bg-[#0C2500]/70 scale-[0.98] z-10':'opacity-100'}
                        ${isDragOver?'bg-[#0C2500]/30':' '}
                        ${idx!==editDraft.length-1 ? (isDark?'border-b border-white/[0.06]':'border-b border-black/[0.06]') : '' }
                      `}
                    >
                      {/* Drag handle */}
                      <button
                        onPointerDown={(e)=>{ (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); handleDragStart(idx); }}
                        onPointerUp={()=>handleDragEnd()}
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-[18px] cursor-grab active:cursor-grabbing shrink-0 ${isDark?'bg-[#2C2C2E] text-[#8E8E93] active:bg-[#3A3A3C]':'bg-[#F2F2F7] text-[#8E8E93] active:bg-[#E5E5EA]'}`}
                      >≡</button>
                      {/* Flag */}
                      <img src={flagSrc(c.code)} alt={c.code} className="w-10 h-10 rounded-full shrink-0" />
                      {/* Name */}
                      <div className="flex-1 min-w-0 text-left leading-tight">
                        <div className={`text-[15px] font-semibold truncate flex items-center gap-2 ${isDark?'text-white':'text-black'}`}>
                          {c.code}
                          <span className={`text-[12px] font-normal truncate ${isDark?'text-[#8E8E93]':'text-[#8E8E93]'}`}>{c.name[lang]}</span>
                          {isFirst && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#07AD00] text-white font-bold tracking-wide">BASE</span>}
                        </div>
                        <div className="text-[12px] text-[#8E8E93]">{c.symbol} {formatPill(rateOf(c.code), c.code)} • {c.name.en}</div>
                      </div>
                      {/* Delete */}
                      <button
                        onClick={()=>{ setEditDraft(d=> d.filter(x=>x!==code)); }}
                        className="w-8 h-8 rounded-full bg-[#FF3B30]/15 text-[#FF3B30] flex items-center justify-center text-[16px] active:scale-90 transition shrink-0"
                      >−</button>
                      {/* drag over indicator line */}
                      {isDragOver && (
                        <div className="absolute left-3 right-3 top-0 h-[2px] bg-[#07AD00] rounded-full -translate-y-[1px]" />
                      )}
                    </div>
                  );
                })}
                {editDraft.length===0 && (
                  <div className="text-center py-12 text-[#8E8E93] text-[14px]">No currencies — add one</div>
                )}
              </div>
              {/* Add button */}
              <div className="mt-4 px-1">
                <button onClick={()=>setAddOpen(true)} className={`w-full h-[52px] rounded-[14px] flex items-center justify-center gap-2 font-semibold text-[15px] active:scale-[0.98] transition border-2 border-dashed ${isDark?'border-white/15 text-white bg-[#1C1C1E]':'border-black/15 text-black bg-white'}`}>
                  <span className="w-7 h-7 rounded-full bg-[#07AD00] text-white flex items-center justify-center text-[16px]">+</span> {t.addCurrency}
                </button>
                <div className="mt-4 text-[11px] text-[#8E8E93] text-center px-4 leading-relaxed">
                  Tip: Drag ≡ to move freely. First currency in list will be used as base. All currencies are equal here.
                </div>
              </div>
              <div className="h-[24px]" />
            </div>
          </div>
        )}

        {/* Base selector */}
        {baseSelectOpen && (
          <div className="absolute inset-0 z-[110] flex flex-col justify-end">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-[3px]" onClick={()=>setBaseSelectOpen(false)} />
            <div className={`relative rounded-t-[28px] max-h-[70%] flex flex-col ${isDark?'bg-[#1C1C1E]':'bg-white'}`}>
              <div className="px-5 pt-5 pb-2 flex justify-between items-center"><h3 className={`text-[18px] font-bold ${isDark?'text-white':'text-black'}`}>{t.selectBase}</h3><button onClick={()=>setBaseSelectOpen(false)} className={`w-8 h-8 rounded-full ${isDark?'bg-[#2C2C2E] text-white':'bg-[#F2F2F7]'}`}>✕</button></div>
            <div className="overflow-y-auto px-2 pb-8">
              {currList.map(code=>{
                const c=CURRENCIES.find(x=>x.code===code)!;
                  return <button key={code} onClick={()=>{
                    setBase(code);
                    // also move selected to first so first = base (as per new UX)
                    setCurrList(prev=>{
                      if(prev[0]===code) return prev;
                      return [code, ...prev.filter(x=>x!==code)];
                    });
                    setBaseSelectOpen(false);
                  }} className={`w-full flex items-center justify-between px-3 py-3 rounded-xl ${base===code?'bg-[#0C2500]':''}`}><span className="flex items-center gap-3"><img src={flagSrc(c.code)} alt={c.code} className="w-8 h-8 rounded-full shrink-0" /><span className={`${isDark?'text-white':'text-black'} font-medium`}>{c.code} {c.name[lang]}</span></span>{base===code && <span className="text-[#07AD00]">✓</span>}</button>
              })}
            </div>
            </div>
          </div>
        )}

        {/* Calculator Overlay */}
        {calcOpen && (
          <div className="absolute inset-0 z-[90] flex items-end justify-center pb-[calc(env(safe-area-inset-bottom)+14px)]">
            <div className="absolute inset-0 bg-[rgba(0,0,0,0.6)] backdrop-blur-[6px]" onClick={()=>setCalcOpen(false)} />
            <div className={`relative w-[94%] max-w-[380px] rounded-[24px] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.6)] border ${isDark?'bg-[#1C1C1E]/95 border-white/10':'bg-white/95 border-black/10'} animate-[pop_0.25s]`}>
              <div className="flex items-center justify-between mb-1">
                <div className={`text-[15px] px-2.5 py-1 rounded-full ${isDark?'bg-[#2C2C2E] text-[#8E8E93]':'bg-[#F2F2F7] text-[#8E8E93]'}`}><span className="flex items-center gap-2"><img src={flagSrc(editingCode)} alt={editingCode} className="w-5 h-5 rounded-full" />{editingCode}</span></div>
                <div className="text-[13px] text-[#8E8E93]">Calculator</div>
              </div>
              <div className={`text-right text-[44px] font-light tracking-tight py-3 px-2 min-h-[64px] break-all tabular-nums ${isDark?'text-white':'text-black'}`}>{calcDisplay}</div>
              <div className="grid grid-cols-4 gap-[10px]">
                {/* Row1: big AC */}
                <button onClick={clearCalc} className="col-span-3 h-[62px] rounded-full flex items-center justify-center text-[23px] font-bold tracking-wide bg-[#A5A5A5] text-black active:scale-[0.96] transition">AC</button>
                <button onClick={()=>handleOperator('÷')} className="h-[62px] rounded-full flex items-center justify-center text-[28px] font-medium bg-[#FF9F0A] text-white active:scale-[0.96] transition">÷</button>
                {/* Row2 */}
                <button onClick={()=>inputDigit('7')} className={`h-[62px] rounded-full flex items-center justify-center text-[26px] font-medium active:scale-95 ${isDark?'bg-[#333] text-white':'bg-[#E5E5EA] text-black'}`}>7</button>
                <button onClick={()=>inputDigit('8')} className={`h-[62px] rounded-full flex items-center justify-center text-[26px] font-medium active:scale-95 ${isDark?'bg-[#333] text-white':'bg-[#E5E5EA] text-black'}`}>8</button>
                <button onClick={()=>inputDigit('9')} className={`h-[62px] rounded-full flex items-center justify-center text-[26px] font-medium active:scale-95 ${isDark?'bg-[#333] text-white':'bg-[#E5E5EA] text-black'}`}>9</button>
                <button onClick={()=>handleOperator('×')} className="h-[62px] rounded-full flex items-center justify-center text-[26px] font-medium bg-[#FF9F0A] text-white active:scale-95">×</button>
                {/* Row3 */}
                <button onClick={()=>inputDigit('4')} className={`h-[62px] rounded-full flex items-center justify-center text-[26px] font-medium active:scale-95 ${isDark?'bg-[#333] text-white':'bg-[#E5E5EA] text-black'}`}>4</button>
                <button onClick={()=>inputDigit('5')} className={`h-[62px] rounded-full flex items-center justify-center text-[26px] font-medium active:scale-95 ${isDark?'bg-[#333] text-white':'bg-[#E5E5EA] text-black'}`}>5</button>
                <button onClick={()=>inputDigit('6')} className={`h-[62px] rounded-full flex items-center justify-center text-[26px] font-medium active:scale-95 ${isDark?'bg-[#333] text-white':'bg-[#E5E5EA] text-black'}`}>6</button>
                <button onClick={()=>handleOperator('-')} className="h-[62px] rounded-full flex items-center justify-center text-[26px] font-medium bg-[#FF9F0A] text-white active:scale-95">-</button>
                {/* Row4 */}
                <button onClick={()=>inputDigit('1')} className={`h-[62px] rounded-full flex items-center justify-center text-[26px] font-medium active:scale-95 ${isDark?'bg-[#333] text-white':'bg-[#E5E5EA] text-black'}`}>1</button>
                <button onClick={()=>inputDigit('2')} className={`h-[62px] rounded-full flex items-center justify-center text-[26px] font-medium active:scale-95 ${isDark?'bg-[#333] text-white':'bg-[#E5E5EA] text-black'}`}>2</button>
                <button onClick={()=>inputDigit('3')} className={`h-[62px] rounded-full flex items-center justify-center text-[26px] font-medium active:scale-95 ${isDark?'bg-[#333] text-white':'bg-[#E5E5EA] text-black'}`}>3</button>
                <button onClick={()=>handleOperator('+')} className="h-[62px] rounded-full flex items-center justify-center text-[26px] font-medium bg-[#FF9F0A] text-white active:scale-95">+</button>
                {/* Row5 */}
                <button onClick={()=>inputDigit('0')} className={`col-span-2 h-[62px] rounded-full flex items-center justify-start pl-8 text-[26px] font-medium active:scale-[0.98] ${isDark?'bg-[#333] text-white':'bg-[#E5E5EA] text-black'}`}>0</button>
                <button onClick={()=>inputDigit('.')} className={`h-[62px] rounded-full flex items-center justify-center text-[26px] font-medium active:scale-95 ${isDark?'bg-[#333] text-white':'bg-[#E5E5EA] text-black'}`}>.</button>
                <button onClick={handleEquals} className="h-[62px] rounded-full flex items-center justify-center text-[26px] font-medium bg-[#FF9F0A] text-white active:scale-95">=</button>
              </div>
              <button onClick={()=>{
                const sanitized = calcDisplay.replace(/,/g,'').replace(/[^0-9.\-]/g,'');
                const v=parseFloat(sanitized);
                if(!isFinite(v)){ showToast('Invalid number'); return; }
                // if editing non-base, convert back to base amount so list recalculates correctly
                if(editingCode !== base){
                  const targetRate = rateOf(editingCode); // live rate, same as the list uses
                  if(!isFinite(targetRate) || targetRate<=0){ showToast('Rate not available yet'); return; }
                  const newBaseAmount = v * (baseRate / targetRate);
                  setAmount(newBaseAmount);
                } else {
                  setAmount(v);
                }
                setCalcOpen(false);
              }} className="mt-4 w-full h-[56px] rounded-[16px] bg-[#07AD00] text-white font-bold text-[17px] active:scale-[0.98] shadow-[0_4px_12px_rgba(70,149,244,0.38)]">{t.convert}</button>
              <div className="text-center mt-2.5 text-[13px] text-[#8E8E93]">Tap {editingCode} amount • Tap outside to dismiss</div>
            </div>
          </div>
        )}

        {/* Settings - redesigned with icons + edit currencies + language flags */}
        {settingsOpen && (
          <div className={`absolute inset-0 z-[60] flex flex-col ${isDark?'bg-black':'bg-[#F2F2F7]'} animate-[slideIn_0.3s]`}>
            <div className={`h-[52px] flex items-center px-5 gap-3 ${isDark?'bg-black':'bg-white'} shrink-0`}>
              <button onClick={()=>setSettingsOpen(false)} className={`w-8 h-8 rounded-full flex items-center justify-center text-[23px] ${isDark?'bg-[#1C1C1E] text-white':'bg-[#F2F2F7] text-black'}`}>‹</button>
              <h2 className={`text-[23px] font-bold ${isDark?'text-white':'text-black'}`}>{t.settings}</h2>
            </div>
            <div className={`h-[1px] ${isDark?'bg-[#222]':'bg-[#E5E5EA]'} shrink-0`} />
            <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5 no-scrollbar">

              {/* General */}
              <div>
                <h4 className="text-[16px] text-[#8E8E93] uppercase tracking-widest font-semibold mb-2 px-1">{t.general}</h4>
                <div className={`rounded-[16px] overflow-hidden divide-y ${isDark?'bg-[#1C1C1E] divide-white/10':'bg-white divide-black/5 shadow-sm'}`}>
                  {/* Edit Currencies - NEW */}
                  <button onClick={()=>{openEditSheet();}} className="w-full flex items-center justify-between px-4 py-[14px] active:opacity-70">
                    <span className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-[#07AD00]/15 flex items-center justify-center text-[20px]">✏️</span>
                      <span className={`text-[19px] font-medium ${isDark?'text-white':'text-black'}`}>{t.editCurrencies}</span>
                    </span>
                    <span className="flex items-center gap-2 text-[18px] text-[#8E8E93]">{currList.length} <span className="text-[16px]">›</span></span>
                  </button>
                  {/* Theme */}
                  <div className="px-4 py-3">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="w-8 h-8 rounded-full bg-[#FF9500]/15 flex items-center justify-center text-[20px]">🌓</span>
                      <span className={`text-[19px] font-medium ${isDark?'text-white':'text-black'}`}>{t.theme}</span>
                    </div>
                    <div className="flex gap-2 ml-11">
                      {(['auto','light','dark'] as ThemeOpt[]).map(opt=>(
                        <button key={opt} onClick={()=>setThemeOpt(opt)} className={`px-3.5 py-1.5 rounded-full text-[17px] font-medium border ${themeOpt===opt? 'bg-[#07AD00] text-white border-[#07AD00]':'bg-transparent border-white/10 text-[#8E8E93]'}`}>{t[opt]}</button>
                      ))}
                    </div>
                  </div>
                  {/* Language with flags - NEW */}
                  <div className="px-4 py-3">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="w-8 h-8 rounded-full bg-[#5856D6]/15 flex items-center justify-center text-[20px]">🌐</span>
                      <span className={`text-[19px] font-medium ${isDark?'text-white':'text-black'}`}>{t.language}</span>
                    </div>
                    <div className="flex flex-col gap-2 ml-11">
                      {(['en','zh-TW','zh-CN','ja','ko','id','hi','th'] as Lang[]).map(l=>(
                        <button key={l} onClick={()=>setLang(l)} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-full text-[17px] font-medium border text-left transition ${lang===l? (isDark?'bg-white text-black border-white':'bg-black text-white border-black'):'bg-transparent text-[#8E8E93] border-white/10'}`}>
                          <span className="w-7 h-7 rounded-full bg-[#2C2C2E] flex items-center justify-center text-[19px] shrink-0">{LANG_FLAGS[l]}</span>
                          <span className="flex-1">{LANG_LABEL[l]}</span>
                          <span className="text-[15px] opacity-60">{l.toUpperCase()}</span>
                          {lang===l && <span className="text-[16px] font-bold">✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Support */}
              <div>
                <h4 className="text-[16px] text-[#8E8E93] uppercase tracking-widest font-semibold mb-2 px-1">{t.supportAbout}</h4>
                <div className={`rounded-[16px] overflow-hidden divide-y ${isDark?'bg-[#1C1C1E] divide-white/10':'bg-white divide-black/5 shadow-sm'}`}>
                  <button onClick={()=>setShowAboutPage(true)} className="w-full flex items-center justify-between px-4 py-[14px] active:opacity-70">
                    <span className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-[#8E8E93]/15 flex items-center justify-center text-[18px]">ℹ️</span>
                      <span className={`text-[19px] ${isDark?'text-white':'text-black'}`}>{t.about}</span>
                    </span>
                    <span className="text-[#8E8E93] text-[16px]">›</span>
                  </button>
                  <button onClick={()=>setShowPrivacyPage(true)} className="w-full flex items-center justify-between px-4 py-[14px] active:opacity-70">
                    <span className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-[#07AD00]/15 flex items-center justify-center text-[18px]">🔒</span>
                      <span className={`text-[19px] ${isDark?'text-white':'text-black'}`}>{t.privacy}</span>
                    </span>
                    <span className="text-[#8E8E93] text-[16px]">›</span>
                  </button>
                </div>
              </div>

              <div className="text-center text-[15px] text-[#8E8E93] pt-2 pb-6">{t.version.replace('1.0', appVersion)}</div>
            </div>
          </div>
        )}

        {/* Chart Currency Picker Sheet - new */}
        {chartPickerOpen && (
          <div className="absolute inset-0 z-[85] flex flex-col justify-end">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={()=>{setChartPickerOpen(false); setChartSearch('');}} />
            <div className={`relative rounded-t-[28px] max-h-[75%] flex flex-col ${isDark?'bg-[#1C1C1E]':'bg-white'} animate-[slideUp_0.3s]`}>
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <h3 className={`text-[21px] font-bold ${isDark?'text-white':'text-black'}`}>{t.selectCurrency} - {chartPickerSide==='from'?'From':'To'} ({chartPickerSide==='from'? chartFrom : chartTo})</h3>
                <button onClick={()=>{setChartPickerOpen(false); setChartSearch('');}} className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark?'bg-[#2C2C2E] text-white':'bg-[#F2F2F7] text-black'}`}>✕</button>
              </div>
              <div className="px-5 pb-3">
                <div className={`flex items-center gap-2 px-3 h-9 rounded-full ${isDark?'bg-[#2C2C2E]':'bg-[#F2F2F7]'}`}>
                  <span className="text-[#8E8E93]">🔍</span>
                  <input value={chartSearch} type="search" enterKeyHint="search" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} onChange={e=>setChartSearch(e.target.value)} placeholder={t.search} className={`bg-transparent outline-none text-[19px] flex-1 placeholder:text-[#8E8E93] ${isDark?'text-white':'text-black'}`}/>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-2 pb-6 no-scrollbar">
                {filteredChart.map(c=>{
                  const isSelected = (chartPickerSide==='from'? chartFrom===c.code : chartTo===c.code);
                  return (
                    <button key={c.code} onClick={()=>{
                      if(chartPickerSide==='from') setChartFrom(c.code);
                      else setChartTo(c.code);
                      setChartPickerOpen(false);
                      setChartSearch('');
                    }} className={`w-full flex items-center justify-between px-3 py-3 rounded-xl ${isSelected? 'bg-[#0C2500]':''} active:bg-[#2C2C2E]`}>
                      <span className="flex items-center gap-3">
                        <img src={flagSrc(c.code)} alt={c.code} className="w-10 h-10 rounded-full shrink-0" />
                        <span className="text-left leading-tight">
                          <span className={`block text-[19px] font-medium ${isDark?'text-white':'text-black'}`}>{c.code} - {c.name[lang]}</span>
                          <span className="text-[16px] text-[#8E8E93]">{c.symbol} {formatRate(rateOf(c.code))}</span>
                        </span>
                      </span>
                      {isSelected && <span className="text-[#07AD00] font-bold">✓</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* About Detail Page */}
        {showAboutPage && (
          <div className={`absolute inset-0 z-[95] flex flex-col ${isDark?'bg-black':'bg-[#F2F2F7]'} animate-[slideIn_0.28s]`}>
            {/* header */}
            <div className={`h-[52px] flex items-center justify-between px-4 shrink-0 ${isDark?'bg-black border-b border-white/10':'bg-white border-b border-black/10'}`}>
              <button onClick={()=>setShowAboutPage(false)} className={`w-8 h-8 rounded-full flex items-center justify-center text-[18px] ${isDark?'bg-[#1C1C1E] text-white':'bg-[#F2F2F7] text-black'} active:scale-90`}>‹</button>
              <h2 className={`text-[17px] font-bold ${isDark?'text-white':'text-black'}`}>{t.about}</h2>
              <div className="w-8 h-8" />
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar pb-8">
              {/* Hero */}
              <div className={`px-6 pt-8 pb-6 flex flex-col items-center text-center ${isDark?'bg-black':'bg-white'}`}>
                <div className="w-[128px] h-[128px] rounded-[28px] overflow-hidden shadow-[0_10px_30px_rgba(70,149,244,0.35)]">
                  <img src={appIcon} alt="mCurrency Icon" className="w-full h-full object-cover" />
                </div>
                <div className="mt-3 w-[72px] h-[72px] rounded-[16px] overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.12)] bg-white hidden">
                  <img src={icon1024} alt="App Store Icon 1024" className="w-full h-full object-cover" />
                </div>
                <h1 className={`mt-4 text-[24px] font-extrabold tracking-tight ${isDark?'text-white':'text-black'}`}>mCurrency</h1>
                <p className="text-[14px] text-[#8E8E93] mt-0.5">by mStudio</p>
                <div className={`mt-3 inline-flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl ${isDark?'bg-[#1C1C1E]':'bg-[#F2F2F7]'}`}>
                  <span className={`text-[12px] font-semibold ${isDark?'text-white':'text-black'}`}>v{appVersion} • Built for iPhone</span>
                  <span className="text-[11px] text-[#8E8E93]">Developed by mStudio • Sydney</span>
                  <span className="text-[11px] text-[#8E8E93]">Australia</span>
                </div>
              </div>
              <div className="px-4 space-y-5 mt-5">
                {/* Intro */}
                <div className={`rounded-[16px] p-4 ${isDark?'bg-[#1C1C1E]':'bg-white shadow-sm'}`}>
                  <h3 className={`text-[13px] font-bold uppercase tracking-widest mb-2 ${isDark?'text-white':'text-black'}`}>Introduction</h3>
                  <p className={`text-[14px] leading-[20px] ${isDark?'text-[#AEAEB2]':'text-[#3A3A3C]'}`}>
                    mCurrency is a simple, accurate currency converter for travellers and everyday use. It covers 149 currencies with live rates from official sources, shows four decimal places, and has a full calculator on every rate. Large, clear text and round country flags keep it easy to read, and your currencies, base and settings are remembered on your device.
                  </p>
                </div>
                {/* Featured */}
                <div className={`rounded-[16px] p-4 ${isDark?'bg-[#1C1C1E]':'bg-white shadow-sm'}`}>
                  <h3 className={`text-[13px] font-bold uppercase tracking-widest mb-3 ${isDark?'text-white':'text-black'}`}>Featured</h3>
                  <div className="space-y-3">
                    {[
                      {ic:'💱', t:'149 Currencies + Gold & Silver', d:'Currency rates from official sources (central banks). Gold and silver prices for reference. Pick any base currency'},
                      {ic:'📈', t:'Chart', d:'Real rate history: 1W, 1M, 3M, 6M, 1Y, 2Y. Switch any pair from the chart screen'},
                      {ic:'🧮', t:'Calculator', d:'Tap any amount to open a full calculator, then Convert to apply it'},
                      {ic:'🌓', t:'Dark / Light', d:'Auto follows system, or force Light / Dark from Settings'},
                      {ic:'🌐', t:'8 Languages', d:'English, 繁體中文 🇭🇰, 简体中文 🇨🇳, 日本語 🇯🇵, 한국어 🇰🇷, Indonesia 🇮🇩, हिन्दी 🇮🇳, ไทย 🇹🇭 – flags in Settings'},
                      {ic:'🔒', t:'Privacy First', d:'No tracking, no account, no location. Rates and settings stay on your device'},
                      {ic:'👓', t:'Easy to Read', d:'Large text, round flags and big buttons throughout'},
                      {ic:'💚', t:'100% Free', d:'No ads, no in-app purchases, no limits'},
                    ].map((f,i)=>(
                      <div key={i} className="flex gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[16px] ${isDark?'bg-[#2C2C2E]':'bg-[#F2F2F7]'}`}>{f.ic}</div>
                        <div className="flex-1">
                          <div className={`text-[14px] font-semibold ${isDark?'text-white':'text-black'}`}>{f.t}</div>
                          <div className="text-[12px] text-[#8E8E93] leading-[16px] mt-0.5">{f.d}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Terms */}
                <div className={`rounded-[16px] p-4 ${isDark?'bg-[#1C1C1E]':'bg-white shadow-sm'}`}>
                  <h3 className={`text-[13px] font-bold uppercase tracking-widest mb-2 ${isDark?'text-white':'text-black'}`}>Terms & Conditions</h3>
                  <p className="text-[12px] leading-[18px] text-[#8E8E93]">
                    1. Informational Only: All exchange rates shown in mCurrency are for informational purposes only and do not constitute financial advice.<br/><br/>
                    2. Third-Party Data: Rates are sourced from third-party providers and may be delayed or approximate. mStudio does not guarantee accuracy.<br/><br/>
                    3. No Liability: mStudio, datext, and Martin Yeung are not liable for any trading decisions, losses, or damages resulting from use of this app.<br/><br/>
                    4. Use at Your Own Risk: You are solely responsible for verifying rates before making financial transactions.<br/><br/>
                    5. IP: mCurrency, mStudio logo, and design are © 2026 mStudio. All rights reserved.
                  </p>
                </div>
                {/* Contact */}
                <div className={`rounded-[16px] p-4 ${isDark?'bg-[#1C1C1E]':'bg-white shadow-sm'}`}>
                  <h3 className={`text-[13px] font-bold uppercase tracking-widest mb-2 ${isDark?'text-white':'text-black'}`}>Contact</h3>
                  <div className="space-y-1 text-[13px]">
                    <div className="flex justify-between"><span className="text-[#8E8E93]">Support</span><span className={`font-medium ${isDark?'text-white':'text-black'}`}>mstudiosolutions@gmail.com</span></div>
                    <div className="flex justify-between"><span className="text-[#8E8E93]">Privacy</span><span className={`font-medium ${isDark?'text-white':'text-black'}`}>mstudiosolutions@gmail.com</span></div>
                    <div className="flex justify-between"><span className="text-[#8E8E93]">Company</span><span className={`font-medium ${isDark?'text-white':'text-black'}`}>mStudio</span></div>
                    <div className="flex justify-between"><span className="text-[#8E8E93]">Location</span><span className={`font-medium ${isDark?'text-white':'text-black'}`}>Australia</span></div>
                    <div className="flex justify-between"><span className="text-[#8E8E93]">Developer</span><span className={`font-medium ${isDark?'text-white':'text-black'}`}>Martin Yeung / datext</span></div>
                  </div>
                </div>
                <div className="text-center text-[11px] text-[#8E8E93] pb-4 pt-2">© 2026 mStudio • Made with ♥ in Sydney</div>
              </div>
            </div>
          </div>
        )}

        {/* Privacy Policy page - separate from About */}
        {showPrivacyPage && (
          <div className={`absolute inset-0 z-[95] flex flex-col ${isDark?'bg-black':'bg-[#F2F2F7]'} animate-[slideIn_0.28s]`}>
            <div className={`h-[52px] flex items-center justify-between px-4 shrink-0 ${isDark?'bg-black border-b border-white/10':'bg-white border-b border-black/10'}`}>
              <button onClick={()=>setShowPrivacyPage(false)} className={`w-8 h-8 rounded-full flex items-center justify-center text-[18px] ${isDark?'bg-[#1C1C1E] text-white':'bg-[#F2F2F7] text-black'} active:scale-90`}>‹</button>
              <h2 className={`text-[17px] font-bold ${isDark?'text-white':'text-black'}`}>{t.privacy}</h2>
              <div className="w-8 h-8" />
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-5 space-y-4">
              {[
                { h:'Summary', p:'mCurrency does not collect, store or share any personal information. There is no account, no sign-in, no ads and no tracking.' },
                { h:'Information we collect', p:'None. mCurrency does not ask for your name, email, location, contacts, photos or any other personal details.' },
                { h:'Data on your device', p:'Your settings (currency list, language, theme) and the latest rates are saved only on your iPhone so the app works offline. This data never leaves your device and is removed if you delete the app.' },
                { h:'Exchange rate services', p:'To get the latest rates, the app connects to public rate services: Frankfurter, Currency-API (for gold and silver) and ExchangeRate-API as a backup. Like any website, these services can see your IP address when the app asks for rates. No personal information is sent to them.' },
                { h:'Ads and tracking', p:'mCurrency has no ads, no analytics and does not use the advertising identifier (IDFA).' },
                { h:'Children', p:'mCurrency is suitable for all ages and does not knowingly collect any information from anyone, including children.' },
                { h:'Changes to this policy', p:'If this policy changes, the updated version will be shown in the app. Last updated: September 2026.' },
                { h:'Contact', p:'Questions about privacy? Email mstudiosolutions@gmail.com. mStudio, Sydney, Australia.' },
              ].map((sec,i)=>(
                <div key={i} className={`rounded-[16px] p-4 ${isDark?'bg-[#1C1C1E]':'bg-white shadow-sm'}`}>
                  <h3 className={`text-[15px] font-bold mb-1.5 ${isDark?'text-white':'text-black'}`}>{sec.h}</h3>
                  <p className={`text-[15px] leading-[22px] ${isDark?'text-[#AEAEB2]':'text-[#3A3A3C]'}`}>{sec.p}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Forced update screen (iOS app only) - covers everything, no way to close */}
        {updateUrl && (
          <div className={`absolute inset-0 z-[200] flex flex-col items-center justify-center px-8 text-center ${isDark?'bg-black':'bg-[#F2F2F7]'}`}>
            <img src={appIcon} alt="" className="w-[96px] h-[96px] rounded-[22px] mb-6" />
            <h2 className={`text-[26px] font-bold mb-3 ${isDark?'text-white':'text-black'}`}>{t.updateTitle}</h2>
            <p className={`text-[18px] leading-[26px] mb-8 ${isDark?'text-[#AEAEB2]':'text-[#3A3A3C]'}`}>{t.updateMsg}</p>
            <button onClick={()=>{ window.location.href = updateUrl; }} className="w-full max-w-[320px] h-[56px] rounded-[16px] bg-[#07AD00] text-white text-[19px] font-bold active:scale-[0.98]">{t.updateBtn}</button>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className="absolute bottom-[90px] left-1/2 -translate-x-1/2 z-[120] bg-[#2C2C2E] text-white text-[13px] px-4 py-2 rounded-full shadow-lg animate-[pop_0.2s]">{toast}</div>
        )}

        <style>{`
          @keyframes slideUp { from{ transform: translateY(100%); } to{ transform: translateY(0); } }
          @keyframes slideIn { from{ transform: translateX(100%); } to{ transform: translateX(0); } }
          @keyframes pop { from{ transform: scale(0.96); opacity:0; } to{ transform: scale(1); opacity:1; } }
          .no-scrollbar::-webkit-scrollbar{ display:none; }
          .no-scrollbar{ -ms-overflow-style:none; scrollbar-width:none; }
          .tabular-nums { font-variant-numeric: tabular-nums; }
        `}</style>
      </div>
    </div>
  );
}
