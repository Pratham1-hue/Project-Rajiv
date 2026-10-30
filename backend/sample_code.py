"""
Sample E-Commerce Payment & Order Processor module.
Designed for testing Voice-First AST Navigation, Scope Pitch Cues, and Conversational Debugging.
"""

from typing import List, Dict, Optional
import time


def verify_token(token: str) -> bool:
    """Validate customer authentication token."""
    if not token or len(token) < 8:
        return False
    return token.startswith("auth_")


class PaymentGateway:
    """Handles external payment processing and tokenization."""

    def __init__(self, api_key: str, merchant_id: str):
        self.api_key = api_key
        self.merchant_id = merchant_id
        self.is_connected = True

    def connect(self) -> bool:
        """Establish connection to payment processor gateway."""
        if not self.api_key:
            return False
        self.is_connected = True
        return True

    def process_charge(self, customer_id: str, amount: float, currency: str = "USD") -> Dict[str, any]:
        """Charge the customer account for a specified amount."""
        if not self.is_connected:
            raise ConnectionError("Payment gateway is offline.")

        if amount <= 0:
            raise ValueError("Charge amount must be positive.")

        # Simulate charge verification loop
        retries = 3
        while retries > 0:
            if amount > 10000:
                flagged_for_fraud = True
                break
            else:
                flagged_for_fraud = False
                break
            retries -= 1

        return {
            "status": "success",
            "customer_id": customer_id,
            "amount": amount,
            "currency": currency,
            "fraud_flag": flagged_for_fraud,
            "timestamp": time.time(),
        }


def calculate_total(items: List[Dict[str, any]], discount_code: Optional[str] = None) -> float:
    """Calculate the subtotal and apply discount if valid."""
    subtotal = 0.0

    for item in items:
        price = item.get("price", 0.0)
        quantity = item.get("quantity", 1)
        subtotal += price * quantity

    if discount_code == "SAVE20":
        subtotal *= 0.8
    elif discount_code == "WELCOME10":
        subtotal *= 0.9

    return round(subtotal, 2)


class OrderProcessor:
    """Coordinates order lifecycle, payment settlement, and inventory dispatch."""

    def __init__(self, gateway: PaymentGateway):
        self.gateway = gateway
        self.orders = []

    def process_order(self, order_id: str, items: List[Dict[str, any]], customer_token: str, raw_tax_fee: any = "50"):
        """
        Process incoming order and settle payment.
        NOTE: Contains intentional bug for the debugger pillar testing:
        raw_tax_fee defaults to string '50' which causes a TypeError when added to float total!
        """
        if not verify_token(customer_token):
            raise PermissionError("Invalid customer token provided.")

        subtotal = calculate_total(items)

        # BUG LINE: Attempted to add integer/float amount to string '50'
        total_with_tax = subtotal + raw_tax_fee

        charge_result = self.gateway.process_charge(
            customer_id="cust_987",
            amount=total_with_tax,
            currency="USD"
        )

        return {
            "order_id": order_id,
            "total": total_with_tax,
            "receipt": charge_result
        }



def safe_checkout(processor: OrderProcessor, order_id: str, items: List[Dict[str, any]], token: str) -> Dict[str, any]:
    """Run an order through the processor and report failures instead of crashing."""
    try:
        return processor.process_order(order_id, items, token)
    except PermissionError as exc:
        return {"order_id": order_id, "error": f"Authentication failed: {exc}"}
    except (TypeError, ValueError) as exc:
        return {"order_id": order_id, "error": f"Invalid order data: {exc}"}
