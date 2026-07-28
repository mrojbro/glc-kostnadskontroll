export interface PortalItem {
  id: string;
  name: string;
  href?: string;
  enabled: boolean;
  /** Non-route fun tile on the landing page. */
  kind?: "easter-egg";
}

export const PORTALS: PortalItem[] = [
  {
    id: "hlp-distribution",
    name: "HLP Distribution",
    href: "/hlp-distribution/",
    enabled: true,
  },
  {
    id: "coop-distribution",
    name: "Coop Distribution",
    href: "/coop-distribution/",
    enabled: true,
  },
  {
    id: "coop-frukt",
    name: "Coop Frukt",
    href: "/coop-frukt/",
    enabled: true,
  },
  {
    id: "3054-davies",
    name: "3054 Davies",
    href: "/3054-davies/",
    enabled: true,
  },
  {
    id: "3058-boxmover",
    name: "3058 Boxmover",
    href: "/3058-boxmover/",
    enabled: true,
  },
  {
    id: "3028-narkefrakt",
    name: "3028 Närkefrakt",
    href: "/3028-narkefrakt/",
    enabled: true,
  },
  {
    id: "2215-krickos",
    name: "2215 Krickos",
    href: "/2215-krickos/",
    enabled: true,
  },
  {
    id: "br-hanssons",
    name: "Br Hanssons",
    href: "/br-hanssons/",
    enabled: true,
  },
  {
    id: "mystery",
    name: "",
    enabled: false,
    kind: "easter-egg",
  },
];
