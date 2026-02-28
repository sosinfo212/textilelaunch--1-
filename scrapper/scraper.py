#!/usr/bin/env python3
"""
Production-ready Playwright scraper for pyjamachamal.com affiliate products.
Uses async Playwright with proper waits, logging, and structured JSON output.
"""

import argparse
import json
import logging
import os
import re
import sys
from pathlib import Path
from typing import Any, List, Optional, Set
from urllib.parse import urlparse

import requests

from playwright.async_api import (
    Page,
    TimeoutError as PlaywrightTimeout,
    async_playwright,
)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

DEFAULT_WEBSITE_URL = "https://pyjamachamal.com"

SELECTORS = {
    "email": "input#email",
    "password": "input#password",
    "submit": "button",
    # Product listing: containers with data-url (fallback to grid children)
    "product_container": "div[data-url]",
    "product_grid": "div.grid.grid-cols-1.sm\\:grid-cols-2.md\\:grid-cols-3.lg\\:grid-cols-4.gap-6",
    # Pagination
    "page_link": "a.page-link",
    # Product detail page
    "product_price": "span.text-xl",
    "product_images": "div.swiper-slide > img",
    "product_description": "p.leading-relaxed.text-gray-600",
    "size_option_label": ".size-option label",
    "color_spans": "#orderForm > div > div > div > div > div > span",
}

DEFAULT_CURRENCY = "MAD"


def get_website_config(website_url: str) -> dict[str, str]:
    """Build login_url, products_url, base_url, website_name from a base website URL."""
    url = website_url.strip().rstrip("/")
    if not url.startswith("http"):
        url = "https://" + url
    parsed = urlparse(url)
    base_url = f"{parsed.scheme or 'https'}://{parsed.netloc}"
    hostname = (parsed.netloc or "").replace("www.", "")
    website_name = hostname.split(".")[0] if hostname else "website"
    return {
        "base_url": base_url,
        "login_url": f"{base_url}/login",
        "products_url": f"{base_url}/affiliate/products",
        "website_name": website_name,
    }

DEFAULT_TIMEOUT_MS = 30_000
NAVIGATION_TIMEOUT_MS = 60_000

# TextileLaunch API (env overrides; defaults below)
TEXTILELAUNCH_API_URL_ENV = "TEXTILELAUNCH_API_URL"
TEXTILELAUNCH_API_KEY_ENV = "TEXTILELAUNCH_API_KEY"
DEFAULT_API_BASE_URL = "https://trendycosmetix.com/api"
DEFAULT_API_KEY = "tl_f817581179238784f44fc0d424c7188da7491ff9187e9f1fd9ef037fae8d6eb9"

# ---------------------------------------------------------------------------
# Transform to TextileLaunch API format & API sync
# ---------------------------------------------------------------------------

def _parse_price(price_str: Any) -> float:
    """Parse price from string like '220.00 DH' or '220.00 €' to float. Returns 0.0 on failure."""
    if price_str is None or price_str == "":
        return 0.0
    if isinstance(price_str, (int, float)):
        return float(price_str)
    s = str(price_str).strip()
    # Remove common currency suffixes (DH, €, EUR, MAD, etc.) and spaces
    s = re.sub(r"\s*(DH|€|EUR|MAD|USD|\$)\s*$", "", s, flags=re.IGNORECASE)
    s = s.strip().replace(" ", "").replace(",", ".")
    cleaned = re.sub(r"[^\d.]", "", s)
    try:
        return float(cleaned) if cleaned else 0.0
    except (ValueError, TypeError):
        return 0.0


def _normalize_images(images: Any) -> List[str]:
    """Convert images to list of URL strings. If string, split by comma; if list, return as is."""
    if images is None:
        return []
    if isinstance(images, list):
        return [str(u).strip() for u in images if u and str(u).strip()]
    s = str(images).strip()
    if not s:
        return []
    return [u.strip() for u in s.split(",") if u.strip()]


def transform_product_to_api(raw: dict[str, Any]) -> dict[str, Any]:
    """Transform a scraped product to TextileLaunch API format."""
    return {
        "name": str((raw.get("name") or "")).strip(),
        "price": _parse_price(raw.get("price")),
        "images": _normalize_images(raw.get("images")),
        "description": str((raw.get("description") or "")).strip(),
        "currency": str((raw.get("currency") or "MAD")).strip(),
        "attributes": raw.get("attributes") or [],
        "supplier": str((raw.get("website") or "")).strip(),
        "sku": str((raw.get("sku") or "")).strip(),
    }


def load_products_from_json(path: str | Path) -> List[dict[str, Any]]:
    """Load product list from a JSON file."""
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {path}")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and "products" in data:
        return data["products"]
    return [data]


def sync_products_to_api(
    products: List[dict[str, Any]],
    api_base_url: str,
    api_key: str,
    use_import_endpoint: bool = True,
    skip_invalid: bool = True,
) -> tuple[int, int, List[str]]:
    """
    Send products to TextileLaunch API.
    Returns (success_count, failure_count, error_messages).
    """
    api_base_url = api_base_url.rstrip("/")
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": api_key,
    }
    transformed = [transform_product_to_api(p) for p in products]
    success, failure, errors = 0, 0, []

    if use_import_endpoint and len(transformed) > 0:
        url = f"{api_base_url}/products/import"
        body = {"products": transformed, "skipInvalid": skip_invalid}
        try:
            r = requests.post(url, json=body, headers=headers, timeout=60)
            if r.ok:
                success = len(transformed)
                logger.info("API import success: %d product(s) sent to %s", success, url)
            else:
                failure = len(transformed)
                msg = f"Import failed: {r.status_code} - {r.text}"
                errors.append(msg)
                logger.error("%s", msg)
        except requests.RequestException as e:
            failure = len(transformed)
            errors.append(str(e))
            logger.exception("API request failed: %s", e)
        return success, failure, errors

    # Single-product POST per item
    for i, payload in enumerate(transformed):
        url = f"{api_base_url}/products"
        try:
            r = requests.post(url, json=payload, headers=headers, timeout=30)
            if r.ok:
                success += 1
                logger.info("Product %d/%d created (name=%s)", i + 1, len(transformed), payload.get("name", "")[:30])
            else:
                failure += 1
                msg = f"Product {i + 1} ({payload.get('sku', '')}): {r.status_code} - {r.text}"
                errors.append(msg)
                logger.warning("%s", msg)
        except requests.RequestException as e:
            failure += 1
            errors.append(f"Product {i + 1}: {e}")
            logger.exception("Product %d request failed: %s", i + 1, e)

    return success, failure, errors


# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

def setup_logging(verbose: bool = False) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        stream=sys.stdout,
    )


logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

async def login(
    page: Page,
    email: str,
    password: str,
    login_url: str,
    timeout_ms: int = DEFAULT_TIMEOUT_MS,
) -> bool:
    """
    Perform login and wait for navigation to complete.
    Returns True on success, False otherwise.
    """
    logger.info("Navigating to login page: %s", login_url)
    try:
        await page.goto(login_url, wait_until="load", timeout=timeout_ms)
    except PlaywrightTimeout as e:
        logger.error("Timeout loading login page: %s", e)
        return False
    except Exception as e:
        logger.exception("Failed to load login page: %s", e)
        return False

    try:
        await page.wait_for_selector(SELECTORS["email"], state="visible", timeout=timeout_ms)
    except PlaywrightTimeout:
        logger.error("Email input not found (selector: %s)", SELECTORS["email"])
        return False

    await page.fill(SELECTORS["email"], email)
    await page.fill(SELECTORS["password"], password)
    # Short delay so any client-side validation/JS can run before submit
    await page.wait_for_timeout(500)

    # Submit: handle both full navigation and SPA-style redirects
    try:
        async with page.expect_navigation(timeout=NAVIGATION_TIMEOUT_MS, wait_until="domcontentloaded"):
            await page.click(SELECTORS["submit"])
    except PlaywrightTimeout:
        # SPA or slow redirect: wait a bit and re-check URL / DOM
        await page.wait_for_timeout(3000)
        if "login" not in page.url.strip("/").split("/")[-1]:
            logger.info("Login completed (SPA/slow redirect)")
            return True
        logger.error("Login submit did not trigger navigation within timeout")
        return False

    # Wait until we're no longer on the login page (redirect completed)
    try:
        await page.wait_for_url(lambda u: "login" not in str(u), timeout=timeout_ms)
    except PlaywrightTimeout:
        pass

    if "login" in page.url.strip("/").split("/")[-1]:
        logger.error("Still on login page after submit; login may have failed")
        return False

    logger.info("Login completed")
    return True


# ---------------------------------------------------------------------------
# Product links from listing page (with pagination)
# ---------------------------------------------------------------------------

def _normalize_product_url(url: str, base_url: str) -> str:
    if url.startswith("/"):
        return f"{base_url.rstrip('/')}{url}"
    return url


async def _collect_product_urls_from_current_page(page: Page, base_url: str) -> list[str]:
    """Collect product URLs from the current page (data-url on product containers)."""
    urls: list[str] = []
    containers = await page.query_selector_all(SELECTORS["product_container"])
    for el in containers:
        try:
            url = await el.get_attribute("data-url")
            if url and url.strip():
                urls.append(_normalize_product_url(url, base_url))
        except Exception as e:
            logger.debug("Skipping container (no data-url or error): %s", e)
    return urls


async def _get_next_page_url(
    page: Page,
    visited_urls: Set[str],
    timeout_ms: int,
    base_url: str,
) -> Optional[str]:
    """
    Find the next pagination link (a.page-link) that we haven't visited.
    Returns the href to navigate to, or None if no next page.
    """
    try:
        await page.wait_for_selector(
            SELECTORS["page_link"],
            state="attached",
            timeout=timeout_ms,
        )
    except PlaywrightTimeout:
        return None

    links = await page.query_selector_all(SELECTORS["page_link"])
    current_path = page.url.split("?")[0].rstrip("/") or base_url + "/affiliate/products"
    if not current_path.startswith("http"):
        current_path = base_url + current_path

    next_href: Optional[str] = None
    next_is_next_label = False

    for el in links:
        try:
            href = await el.get_attribute("href")
            text = (await el.text_content() or "").strip().lower()
            if not href or not href.strip():
                continue
            # Skip disabled or "current" page link (often no href or #)
            if href.strip() == "#" or href.strip() == "":
                continue
            # Build full URL for comparison
            if href.startswith("http"):
                full_url = href
            elif href.startswith("/"):
                full_url = base_url + href
            elif href.startswith("?"):
                full_url = current_path + href
            else:
                full_url = current_path + "?page=" + href
            full_url = full_url.rstrip("/")
            if full_url in visited_urls:
                continue
            # Prefer link with "next" / "»" / "›" if present
            if any(x in text for x in ("next", "»", "›", "suivant")):
                next_href = full_url
                next_is_next_label = True
                break
            next_href = full_url
        except Exception:
            continue

    if next_is_next_label and next_href:
        return next_href
    if next_href and next_href not in visited_urls:
        return next_href
    return None


async def get_product_links(
    page: Page,
    products_url: str,
    base_url: str,
    timeout_ms: int = DEFAULT_TIMEOUT_MS,
) -> list[str]:
    """
    Open the affiliate products page and collect all product URLs from data-url
    attributes, following pagination (a.page-link) until no more pages.
    """
    logger.info("Navigating to products page: %s", products_url)
    try:
        await page.goto(products_url, wait_until="domcontentloaded", timeout=timeout_ms)
    except PlaywrightTimeout as e:
        logger.error("Timeout loading products page: %s", e)
        return []
    except Exception as e:
        logger.exception("Failed to load products page: %s", e)
        return []

    all_urls: list[str] = []
    visited_page_urls: Set[str] = set()
    current_url = page.url.rstrip("/")
    visited_page_urls.add(current_url)

    page_num = 1
    while True:
        try:
            await page.wait_for_selector(
                SELECTORS["product_container"],
                state="attached",
                timeout=timeout_ms,
            )
        except PlaywrightTimeout:
            if page_num == 1:
                logger.warning(
                    "No product containers found with selector: %s",
                    SELECTORS["product_container"],
                )
            break

        page_urls = await _collect_product_urls_from_current_page(page, base_url)
        all_urls.extend(page_urls)
        logger.info("Page %d: collected %d product link(s) (total so far: %d)", page_num, len(page_urls), len(all_urls))

        next_url = await _get_next_page_url(page, visited_page_urls, timeout_ms, base_url)
        if not next_url:
            break

        # Normalize for comparison (avoid duplicate visits)
        next_normalized = next_url.strip("/")
        if next_normalized in visited_page_urls:
            break
        visited_page_urls.add(next_normalized)

        try:
            await page.goto(next_url, wait_until="domcontentloaded", timeout=timeout_ms)
        except PlaywrightTimeout as e:
            logger.warning("Timeout loading next page %s: %s", next_url, e)
            break
        except Exception as e:
            logger.warning("Failed to load next page %s: %s", next_url, e)
            break

        page_num += 1

    all_urls = list(dict.fromkeys(all_urls))
    logger.info("Pagination finished. Total unique product link(s): %d", len(all_urls))
    return all_urls


# ---------------------------------------------------------------------------
# Single product page details + variants
# ---------------------------------------------------------------------------

async def scrape_product_details(
    page: Page,
    product_url: str,
    website_name: str,
    timeout_ms: int = DEFAULT_TIMEOUT_MS,
) -> dict[str, Any]:
    """
    Visit a product page and extract name, price, SKU, and variants.
    Returns a dict matching the required JSON structure.
    """
    result: dict[str, Any] = {
        "name": "",
        "sku": product_url,
        "price": "",
        "images": "",
        "website": website_name,
        "description": "",
        "currency": DEFAULT_CURRENCY,
        "attributes": [],
    }

    try:
        await page.goto(product_url, wait_until="domcontentloaded", timeout=timeout_ms)
    except PlaywrightTimeout:
        logger.warning("Timeout loading product: %s", product_url)
        return result
    except Exception as e:
        logger.warning("Failed to load product %s: %s", product_url, e)
        return result

    # Name: common patterns (h1, product title class, etc.)
    name_selectors = [
        "h1",
        "[class*='product'][class*='title']",
        "[class*='product-name']",
        "h2",
    ]
    for sel in name_selectors:
        try:
            el = await page.query_selector(sel)
            if el:
                name = (await el.text_content() or "").strip()
                if name and len(name) < 500:
                    result["name"] = name
                    break
        except Exception:
            continue

    # Price: span.text-xl
    try:
        el = await page.query_selector(SELECTORS["product_price"])
        if el:
            result["price"] = (await el.text_content() or "").strip()
    except Exception:
        pass

    # Images: div.swiper-slide > img (src attributes, comma-separated)
    try:
        imgs = await page.query_selector_all(SELECTORS["product_images"])
        srcs: list[str] = []
        for el in imgs:
            src = await el.get_attribute("src")
            if src and src.strip():
                srcs.append(src.strip())
        result["images"] = ",".join(srcs) if srcs else ""
    except Exception:
        pass

    # Description: p.leading-relaxed.text-gray-600
    try:
        desc_els = await page.query_selector_all(SELECTORS["product_description"])
        parts = []
        for el in desc_els:
            text = (await el.text_content() or "").strip()
            if text:
                parts.append(text)
        result["description"] = " ".join(parts) if parts else ""
    except Exception:
        pass

    # Attributes: Taille (.size-option label) and Couleur (#orderForm > div > div > div > div > div > span)
    tailles: list[str] = []
    couleurs: list[str] = []
    try:
        size_labels = await page.query_selector_all(SELECTORS["size_option_label"])
        for el in size_labels:
            text = (await el.text_content() or "").strip()
            if text:
                tailles.append(text)
    except Exception:
        pass
    try:
        color_spans = await page.query_selector_all(SELECTORS["color_spans"])
        for el in color_spans:
            text = (await el.text_content() or "").strip()
            if text:
                couleurs.append(text)
    except Exception:
        pass

    # Build options as arrays (split comma-separated values into individual options)
    def to_options(values: list[str]) -> list[str]:
        out: list[str] = []
        for v in values:
            for part in v.split(","):
                p = part.strip()
                if p and p not in out:
                    out.append(p)
        return out

    result["attributes"] = []
    if couleurs:
        result["attributes"].append({"name": "Couleur", "options": to_options(couleurs)})
    if tailles:
        result["attributes"].append({"name": "Taille", "options": to_options(tailles)})

    return result


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

async def main(
    email: str,
    password: str,
    website_url: str = DEFAULT_WEBSITE_URL,
    headless: bool = True,
    output_path: str | None = None,
    timeout_ms: int = DEFAULT_TIMEOUT_MS,
    verbose: bool = False,
    limit: Optional[int] = None,
) -> list[dict[str, Any]]:
    setup_logging(verbose=verbose)
    config = get_website_config(website_url)
    logger.info("Using website: %s", config["base_url"])
    results: list[dict[str, Any]] = []

    # Launch args for server/headless: avoid detection and run in constrained envs
    launch_args = [
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
    ]
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=headless, args=launch_args)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 720},
            ignore_https_errors=True,
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            locale="en-US",
        )
        context.set_default_timeout(timeout_ms)
        context.set_default_navigation_timeout(NAVIGATION_TIMEOUT_MS)
        page = await context.new_page()

        try:
            if not await login(
                page, email=email, password=password, login_url=config["login_url"], timeout_ms=timeout_ms
            ):
                logger.error("Login failed. Aborting.")
                return results

            links = await get_product_links(
                page,
                products_url=config["products_url"],
                base_url=config["base_url"],
                timeout_ms=timeout_ms,
            )
            if not links:
                logger.warning("No product links found.")
                return results

            if limit is not None:
                links = links[:limit]
                logger.info("Limiting to %d product(s) (test mode)", len(links))

            for i, url in enumerate(links, 1):
                logger.info("Scraping product %d/%d: %s", i, len(links), url)
                try:
                    product_data = await scrape_product_details(
                        page, url, website_name=config["website_name"], timeout_ms=timeout_ms
                    )
                    output_item = {
                        "name": product_data.get("name", ""),
                        "sku": product_data.get("sku", url),
                        "price": product_data.get("price", ""),
                        "images": product_data.get("images", ""),
                        "website": product_data.get("website", config["website_name"]),
                        "description": product_data.get("description", ""),
                        "currency": product_data.get("currency", DEFAULT_CURRENCY),
                        "attributes": product_data.get("attributes", []),
                    }
                    results.append(output_item)
                except Exception as e:
                    logger.exception("Error scraping product %s: %s", url, e)
                    results.append({
                        "name": "",
                        "sku": url,
                        "price": "",
                        "images": "",
                        "website": config["website_name"],
                        "description": "",
                        "currency": DEFAULT_CURRENCY,
                        "attributes": [],
                    })

        finally:
            await context.close()
            await browser.close()

    if output_path:
        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        logger.info("Results written to %s", path)

    return results


def cli() -> None:
    parser = argparse.ArgumentParser(description="Scrape affiliate products from a website")
    parser.add_argument(
        "--website",
        default=os.environ.get("SCRAPER_WEBSITE_URL", DEFAULT_WEBSITE_URL),
        metavar="URL",
        help="Base website URL to scrape (e.g. https://pyjamachamal.com).",
    )
    parser.add_argument(
        "--email",
        default=os.environ.get("PYJAMA_EMAIL", "othmane.elmeziani@gmail.com"),
        metavar="EMAIL",
        help="Login email for the website.",
    )
    parser.add_argument(
        "--password",
        default=os.environ.get("PYJAMA_PASSWORD", "sosinfo@212"),
        metavar="PASSWORD",
        help="Login password for the website.",
    )
    parser.add_argument(
        "--api-key",
        default=None,
        metavar="KEY",
        help="TextileLaunch API key (overrides env/default).",
    )
    parser.add_argument(
        "--api-url",
        default=None,
        metavar="URL",
        help="TextileLaunch API base URL (e.g. https://trendycosmetix.com/api).",
    )
    parser.add_argument("--no-headless", action="store_true", help="Run browser with GUI")
    parser.add_argument("-o", "--output", default="products.json", help="Output JSON file path")
    parser.add_argument("--timeout", type=int, default=DEFAULT_TIMEOUT_MS, help="Default timeout in ms")
    parser.add_argument("-v", "--verbose", action="store_true", help="Verbose logging")
    parser.add_argument(
        "--load",
        metavar="FILE",
        default=None,
        help="Load products from JSON file instead of scraping (use with --api-sync to push to API).",
    )
    parser.add_argument(
        "--api-sync",
        action="store_true",
        help="Send products to TextileLaunch API (after scrape or after --load). Requires TEXTILELAUNCH_API_URL and TEXTILELAUNCH_API_KEY.",
    )
    parser.add_argument(
        "--api-single",
        action="store_true",
        help="Use single-product POST per item instead of bulk /products/import.",
    )
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--single", action="store_true", help="Test mode: scrape only one product")
    group.add_argument("--limit", type=int, default=None, metavar="N", help="Scrape at most N products")
    args = parser.parse_args()

    limit = 1 if args.single else args.limit
    setup_logging(verbose=args.verbose)

    # CLI overrides env overrides default
    api_base_url = (
        (args.api_url or "").strip()
        or (os.environ.get(TEXTILELAUNCH_API_URL_ENV) or "").strip()
        or DEFAULT_API_BASE_URL
    )
    api_key = (
        (args.api_key or "").strip()
        or (os.environ.get(TEXTILELAUNCH_API_KEY_ENV) or "").strip()
        or DEFAULT_API_KEY
    ).strip()

    if args.load:
        # Load from file and optionally sync to API
        try:
            products = load_products_from_json(args.load)
            logger.info("Loaded %d product(s) from %s", len(products), args.load)
        except FileNotFoundError as e:
            logger.error("%s", e)
            sys.exit(1)
        except json.JSONDecodeError as e:
            logger.error("Invalid JSON in %s: %s", args.load, e)
            sys.exit(1)
        if args.api_sync:
            if not api_key:
                logger.error("TEXTILELAUNCH_API_KEY is required for --api-sync. Set the environment variable.")
                sys.exit(1)
            success, failure, errors = sync_products_to_api(
                products, api_base_url, api_key, use_import_endpoint=not args.api_single, skip_invalid=True
            )
            for err in errors:
                logger.warning("API error: %s", err)
            logger.info("API sync done: %d success, %d failure", success, failure)
        return

    import asyncio
    results = asyncio.run(
        main(
            email=args.email,
            password=args.password,
            website_url=args.website,
            headless=not args.no_headless,
            output_path=args.output,
            timeout_ms=args.timeout,
            verbose=args.verbose,
            limit=limit,
        )
    )

    if args.api_sync and results:
        if not api_key:
            logger.error("TEXTILELAUNCH_API_KEY is required for --api-sync. Set the environment variable.")
            sys.exit(1)
        success, failure, errors = sync_products_to_api(
            results, api_base_url, api_key, use_import_endpoint=not args.api_single, skip_invalid=True
        )
        for err in errors:
            logger.warning("API error: %s", err)
        logger.info("API sync done: %d success, %d failure", success, failure)


if __name__ == "__main__":
    cli()
