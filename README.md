# bot vente Clément — relais Shopify → Discord

Poste un message dans Discord à chaque commande créée sur NyroFit.

## Comment ça marche

```
Shopify (orders/create)  ──►  /api/shopify-sale?token=… (Vercel)  ──►  webhook Discord  ──►  ton salon
                              vérifie le token
                              met en forme la vente
```

## Routage multi-boutiques

Chaque token (`?token=…`) mène à un salon Discord précis. La boutique d'origine
est détectée automatiquement via l'en-tête `X-Shopify-Shop-Domain`.

| Token                   | Salon Discord            | Boutiques                          |
| ----------------------- | ------------------------ | ---------------------------------- |
| `WEBHOOK_TOKEN`         | `DISCORD_WEBHOOK_URL`    | NyroFit (Clément)                  |
| `WEBHOOK_TOKEN_SUCCESS` | `DISCORD_WEBHOOK_SUCCESS`| Les 2 boutiques de Killian → #success |

## Variables d'environnement (sur Vercel)

| Variable                   | Rôle                                                              |
| -------------------------- | ----------------------------------------------------------------- |
| `DISCORD_WEBHOOK_URL`      | URL du webhook Discord — salon de Clément                          |
| `WEBHOOK_TOKEN`            | Token secret de la route Clément (identique au `?token=` Shopify)  |
| `DISCORD_WEBHOOK_SUCCESS`  | URL du webhook Discord — salon #success                            |
| `WEBHOOK_TOKEN_SUCCESS`    | Token secret de la route Killian/#success                          |

## Étapes de mise en route

1. Créer le webhook Discord (nom : `bot vente Clément`) et copier son URL.
2. Déployer ce dossier sur Vercel.
3. Renseigner les 2 variables d'env, puis redéployer.
4. Enregistrer le webhook Shopify `orders/create` pointant vers
   `https://<projet>.vercel.app/api/shopify-sale`.
5. Faire une commande test → vérifier le message dans Discord.
