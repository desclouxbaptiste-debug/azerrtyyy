"""Stripe subscriptions: Checkout to subscribe, the customer portal to change or cancel, webhooks to sync,
and the 14-day withdrawal (droit de rétractation) with its prorated refund."""

from __future__ import annotations

import logging
import math
import threading
import time

from . import accounts, config, legal, notify

log = logging.getLogger("clipzo.billing")

PAID_PLANS = ("creator", "pro")
INTERVALS = ("month", "year")
# Stripe statuses that keep the paid plan. past_due: Stripe is retrying the card, keep access meanwhile.
ACTIVE_STATUSES = ("active", "trialing", "past_due")
DAY = 86400
CONSENT_REQUIRED = ("Coche la case pour accepter les conditions générales et demander que ton abonnement "
                    "commence tout de suite.")


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


def checkout(user: accounts.User, plan: str, interval: str, base_url: str, consent: bool = False) -> dict:
    """URL of a Stripe Checkout page for this plan, or of the portal if the user is already subscribed.

    `consent`: the customer ticked the box accepting the CGV and asking for the subscription to start right
    away, during the withdrawal period (art. L221-25). Recorded as proof; no new subscription without it."""
    _require_configured()
    if plan not in PAID_PLANS or interval not in INTERVALS:
        raise BillingError(400, "Forfait inconnu.")
    if user.stripe_subscription_id and user.billing_status in ACTIVE_STATUSES:
        # One subscription per account: plan changes and cancellation happen in the portal.
        # (An "unpaid" one can't be revived there: Stripe stopped charging it, so a new Checkout replaces it.)
        return {"url": portal(user, base_url)["url"], "portal": True}
    if not consent:
        raise BillingError(400, CONSENT_REQUIRED)

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
    meta = {"user_id": str(user.id), "plan": plan, "terms_version": config.TERMS_VERSION}
    params = {
        "mode": "subscription",
        "line_items": [line_item],
        "success_url": f"{base_url}/?billing=success",
        "cancel_url": f"{base_url}/?billing=cancel",
        "client_reference_id": str(user.id),
        "metadata": meta,
        "subscription_data": {"metadata": meta},
        "allow_promotion_codes": True,
        # shown above the pay button: what the ticked box means
        "custom_text": {"submit": {"message": (
            f"Ton abonnement démarre dès le paiement, comme tu l'as demandé. Tu peux te rétracter pendant "
            f"{config.WITHDRAWAL_DAYS} jours : on te rembourse tout, sauf les jours commencés. "
            f"Conditions générales : {base_url}/cgv")}},
    }
    if user.stripe_customer_id:
        params["customer"] = user.stripe_customer_id
    else:
        params["customer_email"] = user.email
    session = _stripe_call(_client().v1.checkout.sessions.create, params)
    accounts.record_consent(user, "subscribe", {
        "plan": plan, "interval": interval, "start_now": True, "checkout_session": getattr(session, "id", None),
    })
    return {"url": session.url}


def cancel_now(user: accounts.User) -> None:
    """Stop the subscription at once, without refund (the account is being deleted)."""
    if not user.stripe_subscription_id or user.billing_status in ("canceled", "incomplete_expired"):
        return
    if not configured():
        raise BillingError(503, "Le paiement n'est pas configuré : ton abonnement ne peut pas être arrêté.")
    _stripe_call(_client().v1.subscriptions.cancel, user.stripe_subscription_id)


# ------------------------------------------------------------------------------ withdrawal

def withdrawal_until(user: accounts.User, now: float | None = None) -> float | None:
    """When the running subscription's withdrawal period ends, or None (over, no subscription, no Stripe)."""
    if not (configured() and user.stripe_subscription_id and user.billing_status in ACTIVE_STATUSES
            and user.subscription_started_at):
        return None
    until = legal.withdrawal_deadline(user.subscription_started_at)
    return until if (time.time() if now is None else now) < until else None


def withdraw(user: accounts.User, now: float | None = None) -> dict:
    """Droit de rétractation: stop the subscription now and refund what wasn't used.

    The customer asked for an immediate start, so they owe the service provided until now, in
    proportion to the period paid for (art. L221-25): every day begun counts as used. The refund goes
    back to the card they paid with (art. L221-24), invoice by invoice, newest first."""
    _require_configured()
    with _withdrawing:  # a double click must not refund twice
        fresh = accounts.get_user(user.id)
        return _withdraw(fresh or user, time.time() if now is None else now)


_withdrawing = threading.Lock()


def _withdraw(user: accounts.User, now: float) -> dict:
    sub_id = user.stripe_subscription_id
    if not sub_id or user.billing_status not in ACTIVE_STATUSES:
        raise BillingError(400, "Tu n'as pas d'abonnement en cours.")
    client = _client()
    sub = _stripe_call(client.v1.subscriptions.retrieve, sub_id)
    started = float(_get(sub, "start_date") or user.subscription_started_at or 0)
    if not started or now >= legal.withdrawal_deadline(started):
        raise BillingError(400, f"Le délai de rétractation de {config.WITHDRAWAL_DAYS} jours est passé. Tu peux "
                                "résilier ton abonnement : il s'arrêtera à la fin de la période payée.")

    invoices = _get(_stripe_call(client.v1.invoices.list, {"subscription": sub_id, "status": "paid", "limit": 100}),
                    "data", []) or []
    invoices = sorted((i for i in invoices if (_get(i, "amount_paid", 0) or 0) > 0),
                      key=lambda i: _get(i, "created", 0), reverse=True)
    paid = sum(int(_get(i, "amount_paid", 0)) for i in invoices)
    period_end = _period_end(sub)
    days = max(1, round((period_end - started) / DAY)) if period_end and period_end > started else 30
    days_used = min(days, max(1, math.ceil((now - started) / DAY)))
    kept = round(paid * days_used / days)
    owed = paid - kept

    # Stop it first: nothing more is charged and the account is back on the free plan right away.
    # (Its "deleted" webhook then changes nothing.)
    _stripe_call(client.v1.subscriptions.cancel, sub_id)
    accounts.update_billing(user.id, plan="free", status="canceled", customer_id=None, subscription_id=None,
                            period_end=None, cancel_at_period_end=False, event_time=now)
    refunded, error = 0, None
    try:
        for inv in invoices:
            amount = min(owed - refunded, int(_get(inv, "amount_paid", 0)))
            if amount <= 0:
                break
            params = {**_payment_of(client, inv), "amount": amount, "reason": "requested_by_customer",
                      "metadata": {"user_id": str(user.id), "subscription": sub_id, "clipzo": "retractation"}}
            _stripe_call(client.v1.refunds.create, params,
                         {"idempotency_key": f"clipzo-withdrawal-{sub_id}-{_get(inv, 'id')}"})
            refunded += amount
    except BillingError as exc:
        error = str(exc)
        log.error("withdrawal of %s: refund of %s cents failed, to do by hand in Stripe: %s",
                  sub_id, owed - refunded, exc)
    plan = config.PLANS.get(user.plan, config.PLANS["free"])
    accounts.record_consent(user, "withdrawal", {
        "subscription": sub_id, "plan": user.plan, "started_at": started, "paid_cents": paid, "days_used": days_used,
        "period_days": days, "kept_cents": kept, "refunded_cents": refunded, "refund_error": error,
    }, at=now)
    if notify.smtp_configured():
        notify.send_async(notify.withdrawal_confirmed, user.email, plan.label, now, paid, kept, refunded, days_used)
    result = {"paid_cents": paid, "kept_cents": kept, "refunded_cents": refunded, "days_used": days_used,
              "refund_pending_cents": owed - refunded}
    if error:
        raise BillingError(502, "Ton abonnement est arrêté, mais le remboursement n'a pas pu partir "
                                f"automatiquement. Écris-nous à {legal.value('email') or 'notre adresse de contact'} :"
                                " on le fait à la main sous 14 jours.")
    return result


def _period_end(sub) -> float | None:
    end = _get(sub, "current_period_end")
    items = _get(_get(sub, "items", {}), "data", []) or []
    if end is None and items:
        end = _get(items[0], "current_period_end")  # newer API versions keep it on the item
    return float(end) if end else None


def _payment_of(client, invoice) -> dict:
    """What a refund of this invoice targets: its PaymentIntent (or charge), whatever the Stripe API version."""
    for key in ("payment_intent", "charge"):  # API versions before 2025-03-31
        value = _get(invoice, key)
        if value:
            return {key: value if isinstance(value, str) else _get(value, "id")}
    payments = _stripe_call(client.v1.invoice_payments.list, {"invoice": _get(invoice, "id"), "status": "paid"})
    for p in _get(payments, "data", []) or []:
        payment = _get(p, "payment", {}) or {}
        for key in ("payment_intent", "charge"):
            value = _get(payment, key)
            if value:
                return {key: value if isinstance(value, str) else _get(value, "id")}
    raise BillingError(502, "Paiement introuvable chez Stripe.")


def portal(user: accounts.User, base_url: str, cancel: bool = False) -> dict:
    """The Stripe customer portal. `cancel`: straight to its cancellation page, for the "Résilier mon
    abonnement" button (art. L215-1-1: cancelling must take a few clicks, from where you subscribed)."""
    _require_configured()
    if not user.stripe_customer_id:
        raise BillingError(400, "Tu n'as pas encore d'abonnement.")
    params = {"customer": user.stripe_customer_id, "return_url": f"{base_url}/#compte"}
    if cancel and user.stripe_subscription_id and user.billing_status in ACTIVE_STATUSES:
        params["flow_data"] = {
            "type": "subscription_cancel",
            "subscription_cancel": {"subscription": user.stripe_subscription_id},
            "after_completion": {"type": "redirect", "redirect": {"return_url": f"{base_url}/?billing=cancelled"}},
        }
    session = _stripe_call(_client().v1.billing_portal.sessions.create, params)
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
    plan = _plan_from_items(sub)  # a STRIPE_PRICE_* price: follows a plan switched in the portal
    if plan not in PAID_PLANS:
        plan = _get(meta, "plan")  # the plan bought at checkout
    if plan not in PAID_PLANS:
        plan = _plan_from_items(sub, by_amount=True)  # no metadata at all: guess from the amount
    keep_paid = (not deleted) and status in ACTIVE_STATUSES and plan in PAID_PLANS
    sub_id = _get(sub, "id")
    if (user.stripe_subscription_id and sub_id != user.stripe_subscription_id
            and user.billing_status in ACTIVE_STATUSES and not keep_paid):
        # Another (older or duplicate) subscription ended or lapsed: the recorded paid one stays
        log.info("ignoring %s of %s: account %s is on %s", status, sub_id, user.id, user.stripe_subscription_id)
        return
    # A new paid subscription replacing an unpaid one: that one is cancelled below, so paying its old
    # invoice later can't bring it back as a second subscription billed alongside
    replaced = (user.stripe_subscription_id if keep_paid and user.billing_status == "unpaid"
                and user.stripe_subscription_id != sub_id else None)
    period_end = _period_end(sub)
    started = _get(sub, "start_date")
    cancelling = bool(_get(sub, "cancel_at_period_end", False))
    applied = accounts.update_billing(
        user.id,
        plan=plan if keep_paid else "free",
        status=status,
        customer_id=customer,
        subscription_id=None if deleted else sub_id,
        period_end=period_end,
        cancel_at_period_end=cancelling,
        event_time=created,
        started_at=float(started) if started else None,
    )
    if applied and replaced and configured():
        try:
            _client().v1.subscriptions.cancel(replaced)
        except Exception as exc:  # noqa: BLE001 - best effort: its events are ignored anyway (guard above)
            log.warning("could not cancel the unpaid subscription %s: %s", replaced, exc)
    if applied and keep_paid:
        _confirm_by_email(user, sub, plan, period_end, cancelling)


def _confirm_by_email(before: accounts.User, sub, plan: str, period_end: float | None, cancelling: bool) -> None:
    """The e-mail confirmations the law asks for, once each: a new subscription, a cancellation."""
    if not notify.smtp_configured():
        return
    label = config.PLANS[plan].label
    new = before.stripe_subscription_id != _get(sub, "id") or before.billing_status not in ACTIVE_STATUSES
    if new:
        started = float(_get(sub, "start_date") or time.time())
        notify.send_async(notify.subscription_confirmed, before.email, label, _price_label(sub),
                          started, legal.withdrawal_deadline(started))
    elif cancelling and not before.cancel_at_period_end:
        notify.send_async(notify.subscription_cancelled, before.email, label, period_end)


def _price_label(sub) -> str:
    items = _get(_get(sub, "items", {}), "data", []) or []
    price = _get(items[0], "price", {}) if items else {}
    amount, interval = _get(price, "unit_amount"), _get(_get(price, "recurring", {}), "interval", "month")
    if amount is None:
        return "abonnement " + ("annuel" if interval == "year" else "mensuel")
    return f"{legal.euros(int(amount))} par {'an' if interval == 'year' else 'mois'}"


def _plan_from_items(sub, by_amount: bool = False) -> str | None:
    """Plan of the subscription's current price: a STRIPE_PRICE_* id, or (by_amount) a PRICES_CENTS amount.
    The amount is a last resort: after a price change, an old price can match another plan's new one."""
    items = _get(_get(sub, "items", {}), "data", []) or []
    if not items:
        return None
    price = _get(items[0], "price", {}) or {}
    price_id = _get(price, "id")
    for (plan, _interval), pid in config.STRIPE_PRICE_IDS.items():
        if pid and pid == price_id:
            return plan
    if not by_amount:
        return None
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
