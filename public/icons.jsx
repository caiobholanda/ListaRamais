function Svg(props) {
  return (
    <svg
      viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={props.sw || 1.4} strokeLinecap="round" strokeLinejoin="round"
      width={props.size || 20} height={props.size || 20}
      aria-hidden="true" className={props.className}
    >
      {props.children}
    </svg>
  );
}

const IconSun = (p) => <Svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></Svg>;
const IconMoon = (p) => <Svg {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></Svg>;
const IconSearch = (p) => <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></Svg>;
const IconClose = (p) => <Svg {...p}><path d="M18 6 6 18M6 6l12 12" /></Svg>;
const IconPhone = (p) => <Svg {...p}><path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.24 11.4 11.4 0 0 0 3.6.58 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.4 11.4 0 0 0 .58 3.6 1 1 0 0 1-.24 1z" /></Svg>;
const IconStar = (p) => <Svg sw="1.2" size="13" {...p}><path d="M12 3.5l2.4 5 5.5.8-4 3.9.95 5.5L12 16.9l-4.9 2.6.95-5.5-4-3.9 5.5-.8z" fill="currentColor" stroke="none" /></Svg>;

const IconBriefcase = (p) => <Svg {...p}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" /></Svg>;
const IconUsers = (p) => <Svg {...p}><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0M16 5.2a3 3 0 0 1 0 5.6M21 20a6 6 0 0 0-4-5.6" /></Svg>;
const IconShield = (p) => <Svg {...p}><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" /><path d="m9.5 12 1.8 1.8L15 10" /></Svg>;
const IconWrench = (p) => <Svg {...p}><path d="M15 6a4 4 0 0 0-5.2 5.2L4 17v3h3l5.8-5.8A4 4 0 0 0 18 9l-2.5 2.5L13 9z" /></Svg>;
const IconBed = (p) => <Svg {...p}><path d="M3 18V6M3 12h18a0 0 0 0 1 0 0v6M21 18v-3M3 12V9a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v3" /></Svg>;
const IconUtensils = (p) => <Svg {...p}><path d="M5 3v7a2 2 0 0 0 4 0V3M7 11v10M16 3c-1.5 0-3 1.8-3 5s1.5 4 3 4m0-9v18" /></Svg>;
const IconCart = (p) => <Svg {...p}><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2 3h2.2l2.3 12.4a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 2-1.6L21 7H5.2" /></Svg>;
const IconGlass = (p) => <Svg {...p}><path d="M5 3h14l-6 8v7M13 18h-3m6 0h-3M5 3l1 2.5h12L19 3" /></Svg>;
const IconCalendar = (p) => <Svg {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></Svg>;
const IconChef = (p) => <Svg {...p}><path d="M7 14a4 4 0 0 1-1-7.9 4 4 0 0 1 7.8-1.2A4 4 0 1 1 17 14M7 14v5a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-5M7 17h10" /></Svg>;
const IconDots = (p) => <Svg {...p}><circle cx="5" cy="12" r="1.3" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.3" fill="currentColor" stroke="none" /></Svg>;
const IconCopy = (p) => <Svg {...p}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h8" /></Svg>;
const IconCheck = (p) => <Svg {...p}><path d="m5 12.5 4.5 4.5L19 7" /></Svg>;

const SECTOR_ICONS = {
  "Gerência Geral / Marketing": IconBriefcase,
  "Recursos Humanos": IconUsers,
  "Controladoria / TI / Segurança": IconShield,
  "Manutenção": IconWrench,
  "Hospedagem": IconBed,
  "Administração A&B": IconUtensils,
  "Compras / Almoxarifado": IconCart,
  "Bares / Restaurantes / Cozinha": IconChef,
  "Vendas / Grupos & Eventos / Reservas": IconCalendar,
  "Banquetes": IconGlass,
  "Diversos / Outros": IconDots,
};
function SectorIcon({ sector, ...rest }) {
  const C = SECTOR_ICONS[sector] || IconDots;
  return <C {...rest} />;
}

const IconGear = (p) => <Svg {...p}><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></Svg>;
const IconEdit = (p) => <Svg {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></Svg>;
const IconPlus = (p) => <Svg {...p}><path d="M12 5v14M5 12h14"/></Svg>;

Object.assign(window, {
  IconSun, IconMoon, IconSearch, IconClose, IconPhone, IconStar,
  IconBriefcase, IconUsers, IconShield, IconWrench, IconBed, IconUtensils,
  IconCart, IconGlass, IconCalendar, IconChef, IconDots, IconCopy, IconCheck,
  IconGear, IconEdit, IconPlus,
  SectorIcon,
});
