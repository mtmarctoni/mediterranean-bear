/**
 * Printful API v2 client.
 *
 * Docs: https://developers.printful.com/
 * Base URL: https://api.printful.com/v2
 *
 * Auth: Bearer token via `PRINTFUL_API_KEY` env var (server-side only).
 *
 * This client wraps the store-products, catalog-variants, orders, shipping and
 * webhook endpoints used by Mediterranean Bear. It is safe to import in server
 * components and route handlers -- never expose the API key to the client.
 *
 * Response shape assumptions are documented as TypeScript interfaces below.
 * See plans/002-product-catalog.md for the sync flow that uses this client.
 */

const PRINTFUL_BASE_URL = "https://api.printful.com/v2";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

/** Printful API error envelope. */
export interface PrintfulApiError {
  code: number;
  result: {
    error?: string;
    /** Extra error details, when present. */
    [key: string]: unknown;
  };
}

/** A single mockup / image attached to a store product. */
export interface StoreProductImage {
  id: number;
  /** e.g. "mockup", "preview", "layout" */
  type: string;
  url: string;
}

/** A store product as returned by `GET /v2/store-products/{id}`. */
export interface StoreProduct {
  id: number;
  name: string;
  /** e.g. "T-SHIRT", "MUG", "PHONE_CASE" */
  type: string;
  model?: string;
  brand?: string;
  /** Default product image (catalog image). */
  image?: string;
  variant_count?: number;
  currency?: string;
  images?: StoreProductImage[];
  description?: string;
  is_discontinued?: boolean;
  /** Catalog variant IDs associated with this store product. */
  variants?: number[];
  /** Optional print files / placements. Present on detail responses. */
  printfiles?: PrintFilePlacement[];
}

/** A print file placement on a store product (front, back, sleeve...). */
export interface PrintFilePlacement {
  /** e.g. "default", "front", "back" */
  placement: string;
  technique?: string;
  /** Printful file library ID. */
  printfile_id?: number;
  /** URL of the configured print file, if available. */
  url?: string;
}

/** A store product variant as returned by `GET /v2/store-products/{id}/variants`. */
export interface StoreProductVariant {
  /** Store product variant ID (our `printful_variant_id`). */
  id: number;
  /** Underlying catalog variant ID. */
  variant_id: number;
  external_id?: string;
  name: string;
  size: string;
  color: string;
  color_hex: string;
  /** Price in major currency units as a string (e.g. "15.95"). */
  price: string;
  /** Suggested retail price, as a string. */
  retail_price?: string;
  currency?: string;
  is_discontinued?: boolean;
  out_of_stock?: boolean;
  stock?: number;
  /** e.g. "active", "discontinued", "out_of_stock". */
  availability_status?: string;
  image_url?: string;
}

/** Catalog product reference inside a catalog variant. */
export interface CatalogProduct {
  id: number;
  name: string;
  type: string;
  brand: string;
  model: string;
  image: string;
  dimensions?: Record<string, number>;
}

/** A catalog variant as returned by `GET /v2/catalog-variants/{id}`. */
export interface CatalogVariant {
  id: number;
  name: string;
  size: string;
  color: string;
  color_hex: string;
  product: CatalogProduct;
}

/** A single item in a Printful order submission (POST /v2/orders). */
export interface CreateOrderItemInput {
  /** Printful catalog/store variant ID (our `printful_variant_id`). */
  variant_id: number;
  quantity: number;
  /**
   * Print file placements for this item. Each placement declares the
   * technique (dtg, embroidery, ...) and the layer file URL.
   */
  placements?: {
    placement: string;
    technique: string;
    layers: { type: "file"; url: string }[];
  }[];
}

/** Input for `POST /v2/orders`. */
export interface CreateOrderInput {
  /** Our internal order id (stored as Printful external_id for reconciliation). */
  external_id?: string;
  /** Shipping method name, e.g. "STANDARD". */
  shipping: string;
  recipient: {
    name: string;
    address1: string;
    address2?: string;
    city: string;
    state_code?: string;
    zip: string;
    /** ISO 3166-1 alpha-2 country code. */
    country: string;
    phone?: string;
    email?: string;
  };
  items: CreateOrderItemInput[];
  currency?: string;
  /** Retail costs shown on the packing slip; mirrors what the customer paid. */
  retail_costs?: {
    currency: string;
    subtotal: number;
    shipping: number;
    tax?: number;
  };
}

/** Order as returned by Printful. */
export interface PrintfulOrder {
  id: number;
  external_id?: string;
  status: string;
  shipping: string;
  currency: string;
  recipient: Record<string, unknown>;
  items: unknown[];
}

/** Input for `POST /v2/shipping/rates`. */
export interface ShippingRateInput {
  recipient: {
    address1: string;
    city: string;
    country: string;
    state_code?: string;
    zip: string;
  };
  items: { variant_id: number; quantity: number }[];
  currency?: string;
}

/** Shipping rate quote returned by Printful. */
export interface ShippingRate {
  id: string;
  name: string;
  /** Printful's cost to us, as a string (e.g. "5.95"). */
  rate: string;
  /** Suggested retail rate, as a string. */
  retail_rate?: string;
  currency: string;
  min_business_days?: number;
  max_business_days?: number;
}

/* -------------------------------------------------------------------------- */
/* Client                                                                     */
/* -------------------------------------------------------------------------- */

class PrintfulClient {
  private readonly apiKey: string | undefined;

  constructor(apiKey: string | undefined = process.env.PRINTFUL_API_KEY) {
    this.apiKey = apiKey;
  }

  /**
   * True when a Printful API key is configured. Used by callers (e.g. the
   * product sync route) to fail fast with a clear message instead of making
   * authenticated requests that would 401.
   */
  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    if (!this.apiKey) {
      throw new Error(
        "PRINTFUL_API_KEY is not set. Configure it to use the Printful API.",
      );
    }

    const url = path.startsWith("http") ? path : `${PRINTFUL_BASE_URL}${path}`;

    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });

    const body = (await res.json().catch(() => null)) as
      | { code: number; result: T }
      | PrintfulApiError
      | null;

    if (!res.ok || !body || "error" in (body as PrintfulApiError).result) {
      const err = body as PrintfulApiError | null;
      const message =
        err?.result?.error ??
        `Printful API request failed: ${res.status} ${res.statusText}`;
      throw new PrintfulRequestError(message, err?.code ?? res.status);
    }

    return (body as { code: number; result: T }).result;
  }

  /* -- Store products ----------------------------------------------------- */

  /** `GET /v2/store-products` -- list all store products. */
  async listStoreProducts(): Promise<StoreProduct[]> {
    return this.request<StoreProduct[]>("/store-products");
  }

  /** `GET /v2/store-products/{id}` -- get a specific store product. */
  async getStoreProduct(productId: number): Promise<StoreProduct> {
    return this.request<StoreProduct>(`/store-products/${productId}`);
  }

  /** `GET /v2/store-products/{id}/variants` -- variants for a store product. */
  async getStoreProductVariants(
    productId: number,
  ): Promise<StoreProductVariant[]> {
    return this.request<StoreProductVariant[]>(
      `/store-products/${productId}/variants`,
    );
  }

  /* -- Catalog ------------------------------------------------------------ */

  /** `GET /v2/catalog-variants/{id}` -- catalog variant reference. */
  async getCatalogVariant(variantId: number): Promise<CatalogVariant> {
    return this.request<CatalogVariant>(`/catalog-variants/${variantId}`);
  }

  /* -- Orders ------------------------------------------------------------- */

  /** `POST /v2/orders` -- create a fulfillment order. */
  async createOrder(order: CreateOrderInput): Promise<PrintfulOrder> {
    return this.request<PrintfulOrder>("/orders", {
      method: "POST",
      body: JSON.stringify(order),
    });
  }

  /** `GET /v2/orders/{id}` -- get a Printful order by id. */
  async getOrder(orderId: number): Promise<PrintfulOrder> {
    return this.request<PrintfulOrder>(`/orders/${orderId}`);
  }

  /* -- Shipping rates ----------------------------------------------------- */

  /** `POST /v2/shipping/rates` -- quote shipping for a set of items. */
  async getShippingRates(
    input: ShippingRateInput,
  ): Promise<ShippingRate[]> {
    return this.request<ShippingRate[]>("/shipping/rates", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  /* -- Webhooks ----------------------------------------------------------- */

  /**
   * Configure a Printful webhook.
   * Printful's webhook registration endpoint is store-scoped.
   */
  async configureWebhook(url: string, events: string[]): Promise<void> {
    await this.request<void>("/webhooks", {
      method: "POST",
      body: JSON.stringify({ url, events }),
    });
  }
}

/** Error thrown when a Printful API request fails. */
export class PrintfulRequestError extends Error {
  readonly code: number;
  constructor(message: string, code: number) {
    super(message);
    this.name = "PrintfulRequestError";
    this.code = code;
  }
}

/* -------------------------------------------------------------------------- */
/* Singleton                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Singleton Printful client. Import this anywhere server-side that needs
 * Printful data. If `PRINTFUL_API_KEY` is unset, methods will throw with a
 * clear message when called; `isConfigured()` lets callers guard up front.
 */
export const printful = new PrintfulClient();

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Known Printful store product IDs to sync (see plans/002-product-catalog.md).
 * Used by the product sync route when iterating over our existing catalog.
 */
export const KNOWN_STORE_PRODUCT_IDS: number[] = [
  393040828, // Tramuntana grande - T-shirt
  381908498, // Funda MB - Phone case
  381918235, // Funda MB Grande - Phone case (large)
  379589623, // Taza MB Clasica - Mug
  375651059, // GeoBear - T-shirt
  375648828, // GeoBear - T-shirt
  375648827, // GeoHead - T-shirt
  375648571, // GeoHead - T-shirt
  363652013, // Mediterranean Bear Espalda - T-shirt (back design)
];

/**
 * Map a Printful store product `type` (uppercase, e.g. "T-SHIRT") to one of
 * our category slugs. Unknown types default to "accessories".
 */
export function printfulTypeToCategorySlug(type: string): string {
  const normalized = type.toUpperCase();
  if (
    normalized === "T-SHIRT" ||
    normalized === "T-SHIRT WITH PRINT" ||
    normalized === "TSHIRT" ||
    normalized.startsWith("T-SHIRT")
  ) {
    return "t-shirts";
  }
  // Mugs, phone cases, totes, etc. all land in accessories for MVP.
  return "accessories";
}

/**
 * Convert a product name into a URL-friendly slug.
 * e.g. "Tramuntana grande" -> "tramuntana-grande"
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Parse a Printful price string ("15.95") into integer cents (1595).
 * Returns 0 for falsy / unparseable input.
 */
export function parsePriceToCents(price: string | undefined | null): number {
  if (!price) return 0;
  const n = Number.parseFloat(price);
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}
