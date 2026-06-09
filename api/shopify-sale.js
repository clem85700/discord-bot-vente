// On désactive le body-parser de Vercel et on lit le corps nous-mêmes.
export const config = { api: { bodyParser: false } };

// Lit le flux de la requête en un Buffer brut.
async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

// Authentifie la requête via un token secret passé dans l'URL (?token=...).
// Seuls Shopify (qui envoie sur cette URL) et nous connaissons ce token.
function hasValidToken(req, expected) {
  if (!expected) return false;
  const url = new URL(req.url, "https://placeholder.local");
  return url.searchParams.get("token") === expected;
}

// Transforme la grosse commande Shopify en un petit objet propre, prêt à afficher.
function extractSale(order) {
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
  };
}

// Construit le message Discord (un "embed" = la carte colorée).
function buildEmbed(sale) {
  const products = sale.items.length
    ? sale.items.map((i) => `• ${i.qty}× ${i.title}`).join("\n")
    : "_(aucun article)_";

  const client = sale.city ? `${sale.firstName} — ${sale.city}` : sale.firstName;

  return {
    title: `💸 Nouvelle vente ! ${sale.orderName}`,
    description: products,
    color: 10741301, // lime NyroFit #A3E635
    fields: [
      { name: "💰 Montant", value: `**${sale.total} ${sale.currency}**`, inline: true },
      { name: "🙋 Client", value: client, inline: true },
    ],
    footer: { text: "NyroFit • bot vente Clément" },
    timestamp: sale.createdAt,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  if (!hasValidToken(req, process.env.WEBHOOK_TOKEN)) {
    return res.status(401).send("Unauthorized");
  }

  const raw = await readRawBody(req);

  let order;
  try {
    order = JSON.parse(raw.toString("utf8"));
  } catch {
    return res.status(400).send("Bad JSON");
  }

  const sale = extractSale(order);
  const embed = buildEmbed(sale);

  const r = await fetch(process.env.DISCORD_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "bot vente Clément", embeds: [embed] }),
  });

  if (!r.ok) {
    console.error("Discord a refusé le message:", r.status, await r.text());
    // On répond 200 quand même : sinon Shopify retentera 19 fois et spammera Discord.
  }

  return res.status(200).send("OK");
}
