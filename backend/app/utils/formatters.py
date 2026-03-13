from decimal import Decimal


def format_ksh(amount: Decimal | float | int) -> str:
    """Format an amount as KSh currency string."""
    num = float(amount)
    return f"KSh {num:,.0f}"
