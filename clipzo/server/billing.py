"""Stripe subscriptions: Checkout to subscribe, the customer portal to change or cancel, webhooks to sync."""

from __future__ import annotations

import logging

from . import accounts, config

log = logging.getLogger("clipzo.billing")

PAID_PLANS = ("creator", "pro")
INTERVALS = ("month", "year")
# Stripe statuses that keep the paid plan. past_due: Stripe is retrying the card, keep access meanwhile.
ACTIVE_STATUSES = ("active", "trialing", "past_due")


class BillingError(RuntimeError):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status


def configured() -> bool:
    return bool(config.STRIPE_SECRET_KEY)


def _client():
    import stripe

    return stripe.StripeClient(config.STRIPE_SECRET_KEY, max_network_retries=2)


def _require_configured() -> None:
    if not configured():
        raise BillingError(503, "Le paiement n'est pas encore activé sur ce serveur.")


def _stripe_call(fn, *args):
    import stripe

    try:
        return fn(*args)
    except stripe.StripeError as exc:
        log.warning("Stripe error: %s", exc)
        raise BillingError(502, "Le service de paiement ne répond pas : réessaie dans un instant.") from exc


def checkout(user: accounts.User, plan: str, interval: str, base_url: str) -> dict:
    """URL of a Stripe Checkout page for this plan, or of the portal if the user is already subscribed."""
    _require_configured()
    if plan not in PAID_PLANS or interval not in INTERVALS:
        raise BillingError(400, "Forfait inconnu.")
    if user.stripe_subscription_id and user.billing_status in ACTIVE_STATUSES + ("unpaid",):
        # One subscription per account: plan changes, cancellation and unpaid invoices go through the portal.
        return {"url": portal(user, base_url)["url"], "portal": True}

    price_id = config.STRIPE_PRICE_IDS.get((plan, interval))
    if price_id:
        line_item = {"price": price_id, "quantity": 1}
    else:
        label = config.PLANS[plan].label
        line_item = {
            "price_data": {
                "currency": "eur",
                "unit_amount": config.PRICES_CENTS[(plan, interval)],
                "recurring": {"interval": interval},
                "product_data": {"name": f"Clipzo {label}"},
            },
            "quantity": 1,
        }
    meta = {"user_id": str(user.id), "plan": plan}
    params = {
        "mode": "subscription",
        "line_items": [line_item],
        "success_url": f"{base_url}/?billing=success",
        "cancel_url": f"{base_url}/?billing=cancel",
        "client_reference_id": str(user.id),
        "metadata": meta,
        "subscription_data": {"metadata": meta},
        "allow_promotion_codes": True,
    }
    if user.stripe_customer_id:
        params["customer"] = user.stripe_customer_id
    else:
        params["customer_email"] = user.email
    session = _stripe_call(_client().v1.checkout.sessions.create, params)
    return {"url": session.url}


def portal(user: accounts.User, base_url: str) -> dict:
    _require_configured()
    if not user.stripe_customer_id:
        raise BillingError(400, "Tu n'as pas encore d'abonnement.")
    session = _stripe_call(_client().v1.billing_portal.sessions.create,
                           {"customer": user.stripe_customer_id, "return_url": f"{base_url}/"})
    return {"url": session.url}


# ----------------------------------------------------------------------------- webhooks

def handle_webhook(payload: bytes, signature: str | None) -> str:
    """Verify and apply a Stripe event. Returns a short status for the logs."""
    import stripe

    if not config.STRIPE_WEBHOOK_SECRET:
        raise BillingError(503, "Webhook Stripe non configuré.")
    try:
        event = stripe.Webhook.construct_event(payload, signature, config.STRIPE_WEBHOOK_SECRET)
    except (ValueError, stripe.SignatureVerificationError) as exc:
        raise BillingError(400, "Signature invalide.") from exc

    event_id = event["id"]
    if accounts.one("SELECT 1 FROM stripe_events WHERE id = ?", (event_id,)):
        return "duplicate"
    kind = event["type"]
    obj = event["data"]["object"]
    created = float(event["created"])

    if kind == "checkout.session.completed":
        _on_checkout_completed(obj, created)
    elif kind in ("customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"):
        deleted = kind.endswith(".deleted")
        if not deleted and configured() and _get(obj, "id"):
            # Events of the same second can arrive in any order: apply what the subscription is now,
            # not the snapshot (a late "incomplete" would undo the "active" that followed it)
            obj = _stripe_call(_client().v1.subscriptions.retrieve, _get(obj, "id"))
        _apply_subscription(obj, created, deleted=deleted)
    else:
        accounts.mark_event(event_id)
        return "ignored"
    accounts.mark_event(event_id)  # only once applied: a failure makes Stripe retry
    return "applied"


def _get(obj, key, default=None):
    try:
        value = obj[key]
    except (KeyError, TypeError, IndexError):
        return default
    return default if value is None else value


def _on_checkout_completed(session, created: float) -> None:
    meta = _get(session, "metadata", {}) or {}
    user_id = _int(_get(session, "client_reference_id")) or _int(_get(meta, "user_id"))
    if not user_id or accounts.get_user(user_id) is None:
        log.warning("checkout.session.completed for unknown user %r", user_id)
        return
    customer = _get(session, "customer")
    if customer:
        accounts.link_customer(user_id, customer)
    sub_id = _get(session, "subscription")
    if sub_id and configured():
        sub = _stripe_call(_client().v1.subscriptions.retrieve, sub_id)
        _apply_subscription(sub, created, user_hint=user_id)
    elif _get(session, "payment_status") == "paid":
        plan = _get(meta, "plan")
        accounts.update_billing(user_id, plan=plan if plan in PAID_PLANS else "free", status="active",
                                customer_id=customer, subscription_id=sub_id, period_end=None,
                                cancel_at_period_end=False, event_time=created)


def _apply_subscription(sub, created: float, deleted: bool = False, user_hint: int | None = None) -> None:
    meta = _get(sub, "metadata", {}) or {}
    customer = _get(sub, "customer")
    user = None
    if _int(_get(meta, "user_id")):
        user = accounts.get_user(_int(_get(meta, "user_id")))
    if user is None and customer:
        user = accounts.get_user_by_customer(customer)
    if user is None and user_hint:
        user = accounts.get_user(user_hint)
    if user is None:
        log.warning("subscription event for unknown customer %r", customer)
        return

    status = "canceled" if deleted else _get(sub, "status")
    plan = _plan_from_items(sub)  # the current price: a plan switched in the portal keeps the old metadata
    if plan not in PAID_PLANS:
        plan = _get(meta, "plan")
    keep_paid = (not deleted) and status in ACTIVE_STATUSES and plan in PAID_PLANS
    sub_id = _get(sub, "id")
    if (user.stripe_subscription_id and sub_id != user.stripe_subscription_id
            and user.billing_status in ACTIVE_STATUSES and not keep_paid):
        # Another (older or duplicate) subscription ended or lapsed: the recorded paid one stays
        log.info("ignoring %s of %s: account %s is on %s", status, sub_id, user.id, user.stripe_subscription_id)
        return
    period_end = _get(sub, "current_period_end")
    items = _get(_get(sub, "items", {}), "data", []) or []
    if period_end is None and items:
        period_end = _get(items[0], "current_period_end")  # newer API versions keep it on the item
    accounts.update_billing(
        user.id,
        plan=plan if keep_paid else "free",
        status=status,
        customer_id=customer,
        subscription_id=None if deleted else sub_id,
        period_end=float(period_end) if period_end else None,
        cancel_at_period_end=bool(_get(sub, "cancel_at_period_end", False)),
        event_time=created,
    )


def _plan_from_items(sub) -> str | None:
    """Plan of the subscription's current price (dashboard price id, or the amount of an on-the-fly price)."""
    items = _get(_get(sub, "items", {}), "data", []) or []
    if not items:
        return None
    price = _get(items[0], "price", {}) or {}
    price_id = _get(price, "id")
    for (plan, _interval), pid in config.STRIPE_PRICE_IDS.items():
        if pid and pid == price_id:
            return plan
    amount = _get(price, "unit_amount")
    for (plan, _interval), cents in config.PRICES_CENTS.items():
        if cents == amount:
            return plan
    return None


def _int(value) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None
