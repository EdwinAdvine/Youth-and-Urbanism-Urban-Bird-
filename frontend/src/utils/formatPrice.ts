export function formatKSh(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return `KSh ${num.toLocaleString("en-KE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
