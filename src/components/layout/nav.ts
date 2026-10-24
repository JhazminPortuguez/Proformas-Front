import {
  BarChart3,
  ClipboardList,
  FileText,
  Inbox,
  LayoutDashboard,
  Package,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { Rol } from "@/lib/api/types";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** false = pantalla placeholder "Próximamente". */
  ready: boolean;
  roles?: Rol[];
}

export interface NavGroup {
  label: string | null;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        ready: true,
      },
    ],
  },
  {
    label: "Operación",
    items: [
      { label: "Órdenes", href: "/ordenes", icon: ClipboardList, ready: false },
      { label: "Solicitudes", href: "/solicitudes", icon: Inbox, ready: false },
    ],
  },
  {
    label: "Comercial",
    items: [
      { label: "Clientes", href: "/clientes", icon: Users, ready: true },
      { label: "Proformas", href: "/proformas", icon: FileText, ready: false },
      { label: "Servicios", href: "/servicios", icon: Wrench, ready: true },
    ],
  },
  {
    label: "Inventario",
    items: [
      { label: "Inventario", href: "/inventario", icon: Package, ready: false },
    ],
  },
  {
    label: "Finanzas",
    items: [
      {
        label: "Cuentas por cobrar",
        href: "/cobros",
        icon: Wallet,
        ready: false,
      },
    ],
  },
  {
    label: "Análisis",
    items: [
      { label: "Reportes", href: "/reportes", icon: BarChart3, ready: false },
    ],
  },
  {
    label: "Administración",
    items: [
      {
        label: "Usuarios",
        href: "/usuarios",
        icon: ShieldCheck,
        ready: true,
        roles: ["admin"],
      },
      {
        label: "Configuración",
        href: "/configuracion",
        icon: Settings,
        ready: false,
        roles: ["admin"],
      },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((group) =>
  group.items.map((item) => ({ ...item, group: group.label })),
);

export function navItemsFor(rol: Rol): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) => !item.roles || item.roles.includes(rol),
    ),
  })).filter((group) => group.items.length > 0);
}

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function findNavItem(
  pathname: string,
): { item: NavItem; group: string | null } | null {
  const match = ALL_ITEMS.filter((item) => isActivePath(pathname, item.href)).sort(
    (a, b) => b.href.length - a.href.length,
  )[0];

  return match ? { item: match, group: match.group } : null;
}
