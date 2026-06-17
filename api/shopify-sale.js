// On désactive le body-parser de Vercel et on lit le corps nous-mêmes.
export const config = { api: { bodyParser: false } };

// Lit le flux de la requête en un Buffer brut.
async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

// ── AIGUILLAGE ──────────────────────────────────────────────────────────────
// Chaque token secret (passé dans l'URL ?token=...) mène à un salon Discord.
// On n'ajoute une route QUE si ses 2 variables d'env existent, pour qu'un token
// vide ne puisse jamais matcher par accident.
function getRoutes() {
  const routes = {};
  if (process.env.WEBHOOK_TOKEN && process.env.DISCORD_WEBHOOK_URL) {
    routes[process.env.WEBHOOK_TOKEN] = {
      discordUrl: process.env.DISCORD_WEBHOOK_URL,
      botName: "bot vente Clément",
    };
  }
  if (process.env.WEBHOOK_TOKEN_SUCCESS && process.env.DISCORD_WEBHOOK_SUCCESS) {
    routes[process.env.WEBHOOK_TOKEN_SUCCESS] = {
      discordUrl: process.env.DISCORD_WEBHOOK_SUCCESS,
      botName: "bot vente success",
    };
  }
  return routes;
}

// Récupère le token de l'URL et renvoie la route correspondante (ou null).
function resolveRoute(req) {
  const token = new URL(req.url, "https://placeholder.local").searchParams.get("token");
  if (!token) return null;
  return getRoutes()[token] || null;
}

// "nyrofit.myshopify.com" -> "nyrofit" ; null si domaine absent.
function shopLabel(domain) {
  if (!domain) return null;
  return domain.replace(/^https?:\/\//, "").replace(/\.myshopify\.com$/, "");
}

// Transforme la grosse commande Shopify en un petit objet propre, prêt à afficher.
function extractSale(order, shopDomain) {
  return {
    orderName: order.name || `#${order.order_number ?? ""}`, // ex: "#1042"
    items: (order.line_items || []).map((li) => ({ title: li.title, qty: li.quantity })),
    total: order.total_price,                                  // ex: "49.90"
    currency: order.currency || "EUR",
    firstName: order.customer?.first_name || "Client",
    city:
      order.shipping_address?.city ||
      order.billing_address?.city ||
      order.customer?.default_address?.city ||
      null,
    createdAt: order.created_at,                               // ISO 8601
    shopName: shopLabel(shopDomain),                           // ex: "nyrofit"
  };
}

// Construit le message Discord (un "embed" = la carte colorée).
function buildEmbed(sale, botName) {
  const products = sale.items.length
    ? sale.items.map((i) => `• ${i.qty}× ${i.title}`).join("\n")
    : "_(aucun article)_";

  const client = sale.city ? `${sale.firstName} — ${sale.city}` : sale.firstName;

  const fields = [
    { name: "💰 Montant", value: `**${sale.total} ${sale.currency}**`, inline: true },
    { name: "🙋 Client", value: client, inline: true },
  ];
  // Affiché seulement quand on connaît la boutique (utile dans un salon partagé).
  if (sale.shopName) {
    fields.push({ name: "🏪 Boutique", value: sale.shopName, inline: true });
  }

  return {
    title: `💸 Nouvelle vente ! ${sale.orderName}`,
    description: products,
    color: 10741301, // lime NyroFit #A3E635
    fields,
    footer: { text: sale.shopName ? `${sale.shopName} • ${botName}` : botName },
    timestamp: sale.createdAt,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const route = resolveRoute(req);
  if (!route) return res.status(401).send("Unauthorized");

  const raw = await readRawBody(req);

  let order;
  try {
    order = JSON.parse(raw.toString("utf8"));
  } catch {
    return res.status(400).send("Bad JSON");
  }

  const sale = extractSale(order, req.headers["x-shopify-shop-domain"]);
  const embed = buildEmbed(sale, route.botName);

  const r = await fetch(route.discordUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: route.botName, embeds: [embed] }),
  });

  if (!r.ok) {
    console.error("Discord a refusé le message:", r.status, await r.text());
    // On répond 200 quand même : sinon Shopify retentera 19 fois et spammera Discord.
  }

  return res.status(200).send("OK");
}
