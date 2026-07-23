export interface PortalItem {
  id: string;
  name: string;
  href?: string;
  enabled: boolean;
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
    enabled: false,
  },
  {
    id: "3028-narkefrakt",
    name: "3028 Närkefrakt",
    enabled: false,
  },
  {
    id: "2215-krickos",
    name: "2215 Krickos",
    enabled: false,
  },
];
