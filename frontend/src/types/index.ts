export interface User {
  id: string;
  email: string;
  phone?: string;
  first_name: string;
  last_name: string;
  role: "customer" | "admin" | "super_admin";
  gender?: string;
  avatar_url?: string;
  is_verified: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, string>;
  is_read: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  banner_url?: string;
  display_order: number;
  subcategories: Subcategory[];
}

export interface Subcategory {
  id: string;
  name: string;
  slug: string;
  image_url?: string;
  display_order: number;
}

export interface ProductImage {
  id: string;
  url: string;
  thumbnail_url?: string;
  alt_text?: string;
  display_order: number;
  is_primary: boolean;
}

export interface ProductVariant {
  id: string;
  sku: string;
  size: string;
  color_name: string;
  color_hex: string;
  price_adjustment: number;
  stock_quantity: number;
  is_active: boolean;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  short_description?: string;
  price: number;
  compare_at_price?: number;
  sale_percentage?: number;
  is_on_sale: boolean;
  is_new_arrival: boolean;
  is_featured?: boolean;
  average_rating: number;
  review_count: number;
  total_stock: number;
  primary_image?: ProductImage;
  images?: ProductImage[];
  variants?: ProductVariant[];
  category_slug?: string;
  subcategory_slug?: string;
  brand?: string;
  material?: string;
  care_instructions?: string;
  tags?: string[];
  seo_title?: string;
  seo_description?: string;
  created_at?: string;
  view_count?: number;
  purchase_count?: number;
  // Nested category/subcategory
  category?: { id: string; name: string; slug: string };
  subcategory?: { id: string; name: string; slug: string };
  // Reviews
  reviews?: import('./index').Review[];
}

export interface ProductListResponse {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ProductFilters {
  category?: string;
  subcategory?: string;
  min_price?: number;
  max_price?: number;
  in_stock?: boolean;
  on_sale?: boolean;
  search?: string;
  sort?: SortOption;
  page?: number;
  limit?: number;
}

export type SortOption = "latest" | "popularity" | "rating" | "price_asc" | "price_desc" | "name_asc";

export interface CartItem {
  id: string;
  product_id: string;
  variant_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  // Nested variant with product (returned by API)
  variant: {
    id: string;
    sku: string;
    size: string;
    color_name: string;
    color_hex: string;
    stock_quantity: number;
    product?: {
      id: string;
      name: string;
      slug: string;
      primary_image?: string;
    };
  };
  // Flat fields (legacy/alternative shape)
  product_name?: string;
  product_slug?: string;
  variant_sku?: string;
  size?: string;
  color_name?: string;
  image_url?: string;
}

export interface Cart {
  id: string;
  items: CartItem[];
  subtotal: number;
  coupon_code?: string;
  coupon_discount: number;
  item_count: number;
}

export interface Address {
  id: string;
  label: string;
  full_name: string;
  phone: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  county: string;
  postal_code?: string;
  country: string;
  is_default: boolean;
}

export interface OrderItem {
  id: string;
  variant_id?: string;
  product_name: string;
  sku: string;
  variant_sku?: string;
  size: string;
  color_name: string;
  image_url?: string;
  product_image?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Order {
  id: string;
  order_number: string;
  status: string;
  subtotal: number;
  discount_amount: number;
  coupon_code?: string;
  shipping_cost: number;
  tax_amount: number;
  total: number;
  // Shipping address snapshot fields
  shipping_full_name: string;
  shipping_phone?: string;
  shipping_address_line_1?: string;
  shipping_address_line_2?: string;
  shipping_city: string;
  shipping_county: string;
  shipping_method?: string;
  tracking_number?: string;
  carrier?: string;
  payment_method: string;
  payment_status: string;
  items?: OrderItem[];
  customer_notes?: string;
  created_at: string;
  guest_token?: string;    // returned on checkout for guest orders
  user_id?: string | null; // null for guest orders
  // Optional nested
  status_history?: { id: string; new_status: string; old_status?: string; note?: string; created_at: string }[];
  payment?: { status: string; gateway: string };
  user?: { id: string; first_name: string; last_name: string; email: string; phone?: string };
}

export interface Review {
  id: string;
  rating: number;
  title?: string;
  body?: string;
  is_verified_purchase: boolean;
  helpful_count: number;
  created_at: string;
  user_name: string;
}

export interface AdminStats {
  total_revenue: number;
  total_orders: number;
  new_customers: number;
  avg_order_value: number;
  low_stock_count: number;
  orders_to_dispatch: number;
  period: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: Pick<User, "id" | "email" | "first_name" | "last_name" | "role" | "avatar_url">;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  gender?: string;
}
