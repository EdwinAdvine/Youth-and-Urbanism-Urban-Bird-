export interface NavItem {
  label: string;
  href: string;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export interface NavCategory {
  label: string;
  slug: string;
  href: string;
  bannerUrl: string;
  groups: NavGroup[];
}

export const NAV_CATEGORIES: NavCategory[] = [
  {
    label: "MEN",
    slug: "men",
    href: "/category/men",
    bannerUrl: "/category-men.jpg",
    groups: [
      {
        title: "TOPS",
        items: [
          { label: "T-Shirts", href: "/category/men?sub=t-shirts" },
          { label: "Long Sleeved T-Shirts", href: "/category/men?sub=long-sleeved-t-shirts" },
        ],
      },
      {
        title: "LAYERS & JACKETS",
        items: [
          { label: "Hoodies", href: "/category/men?sub=hoodies" },
          { label: "Sweatshirts", href: "/category/men?sub=sweatshirts" },
          { label: "College Jackets", href: "/category/men?sub=college-jackets" },
          { label: "Zuma & Luna Jackets", href: "/category/men?sub=zuma-luna-jackets" },
        ],
      },
      {
        title: "BOTTOMS",
        items: [
          { label: "Sweatpants", href: "/category/men?sub=sweatpants" },
          { label: "Cozy Pants", href: "/category/men?sub=cozy-pants" },
          { label: "Fleece Shorts", href: "/category/men?sub=fleece-shorts" },
        ],
      },
      {
        title: "ACCESSORIES",
        items: [
          { label: "Beanies", href: "/category/men?sub=beanies" },
          { label: "Caps", href: "/category/men?sub=caps" },
          { label: "Socks", href: "/category/men?sub=socks" },
          { label: "Gift Card", href: "/category/men?sub=gift-card" },
        ],
      },
    ],
  },
  {
    label: "WOMEN",
    slug: "women",
    href: "/category/women",
    bannerUrl: "/category-women.jpg",
    groups: [
      {
        title: "TOPS",
        items: [
          { label: "Aria Tops", href: "/category/women?sub=aria-tops" },
          { label: "Vest Tops", href: "/category/women?sub=vest-tops" },
          { label: "Bodysuits & Playsuits", href: "/category/women?sub=bodysuits-playsuits" },
        ],
      },
      {
        title: "LAYERS & JACKETS",
        items: [
          { label: "Hoodies", href: "/category/women?sub=hoodies" },
          { label: "Sweatshirts", href: "/category/women?sub=sweatshirts" },
          { label: "Cropped Hoodies", href: "/category/women?sub=cropped-hoodies" },
          { label: "College Jackets", href: "/category/women?sub=college-jackets" },
          { label: "Zuma & Luna Jackets", href: "/category/women?sub=zuma-luna-jackets" },
        ],
      },
      {
        title: "BOTTOMS & DRESSES",
        items: [
          { label: "Leggings", href: "/category/women?sub=leggings" },
          { label: "Bike Shorts", href: "/category/women?sub=bike-shorts" },
          { label: "Sweatpants", href: "/category/women?sub=sweatpants" },
          { label: "Cozy Pants", href: "/category/women?sub=cozy-pants" },
          { label: "Fleece Shorts", href: "/category/women?sub=fleece-shorts" },
          { label: "Hoodie Dresses", href: "/category/women?sub=hoodie-dresses" },
          { label: "T-Shirt Dresses", href: "/category/women?sub=t-shirt-dresses" },
        ],
      },
      {
        title: "ACCESSORIES",
        items: [
          { label: "Beanies", href: "/category/women?sub=beanies" },
          { label: "Caps", href: "/category/women?sub=caps" },
          { label: "Socks", href: "/category/women?sub=socks" },
          { label: "Gift Card", href: "/category/women?sub=gift-card" },
        ],
      },
    ],
  },
  {
    label: "KIDS",
    slug: "kids",
    href: "/category/kids",
    bannerUrl: "/category-kids.jpg",
    groups: [
      {
        title: "LAYERS & JACKETS",
        items: [
          { label: "Hoodies", href: "/category/kids?sub=hoodies" },
          { label: "Sweatshirts", href: "/category/kids?sub=sweatshirts" },
          { label: "College Jackets", href: "/category/kids?sub=college-jackets" },
        ],
      },
      {
        title: "TOPS",
        items: [
          { label: "T-Shirts", href: "/category/kids?sub=t-shirts" },
          { label: "Girls Vest Tops", href: "/category/kids?sub=girls-vest-tops" },
        ],
      },
      {
        title: "BOTTOMS",
        items: [
          { label: "Sweatpants", href: "/category/kids?sub=sweatpants" },
        ],
      },
      {
        title: "ACCESSORIES",
        items: [
          { label: "Beanies", href: "/category/kids?sub=beanies" },
          { label: "Gift Card", href: "/category/kids?sub=gift-card" },
        ],
      },
    ],
  },
];

export const NAV_EXTRAS = [
  { label: "SALE", href: "/shop?on_sale=true", isAccent: true },
  { label: "NEW ARRIVALS", href: "/shop?sort=latest", isAccent: false },
];
