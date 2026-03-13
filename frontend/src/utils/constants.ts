export const KENYAN_COUNTIES = [
  "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo-Marakwet", "Embu", "Garissa",
  "Homa Bay", "Isiolo", "Kajiado", "Kakamega", "Kericho", "Kiambu", "Kilifi",
  "Kirinyaga", "Kisii", "Kisumu", "Kitui", "Kwale", "Laikipia", "Lamu", "Machakos",
  "Makueni", "Mandera", "Marsabit", "Meru", "Migori", "Mombasa", "Murang'a",
  "Nairobi", "Nakuru", "Nandi", "Narok", "Nyamira", "Nyandarua", "Nyeri",
  "Samburu", "Siaya", "Taita-Taveta", "Tana River", "Tharaka-Nithi", "Trans Nzoia",
  "Turkana", "Uasin Gishu", "Vihiga", "Wajir", "West Pokot",
];

export const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL"];

export const ORDER_STATUSES = {
  pending_payment: { label: "Pending Payment", color: "yellow" },
  confirmed: { label: "Confirmed", color: "blue" },
  processing: { label: "Processing", color: "indigo" },
  shipped: { label: "Shipped", color: "purple" },
  out_for_delivery: { label: "Out for Delivery", color: "orange" },
  delivered: { label: "Delivered", color: "green" },
  cancelled: { label: "Cancelled", color: "red" },
  refunded: { label: "Refunded", color: "gray" },
  returned: { label: "Returned", color: "gray" },
};

export const PAYMENT_METHODS = {
  mpesa: "M-Pesa",
  card: "Debit/Credit Card",
  cod: "Cash on Delivery",
};
