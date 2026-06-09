# bot vente Clément — relais Shopify → Discord

Poste un message dans Discord à chaque commande créée sur NyroFit.

## Comment ça marche

```
Shopify (orders/create)  ──►  /api/shopify-sale?token=… (Vercel)  ──►  webhook Discord  ──►  ton salon
                              vérifie le token
                              met en forme la vente
```

## Variables d'environnement (sur Vercel)

| Variable              | Rôle                                                                  |
| --------------------- | --------------------------------------------------------------------- |
| `DISCORD_WEBHOOK_URL` | Discord → Param. du salon → Intégrations → Webhooks → Copier l'URL     |
| `WEBHOOK_TOKEN`       | Token secret aléatoire ; doit être identique dans l'URL du webhook Shopify (`?token=…`) |

## Étapes de mise en route

1. Créer le webhook Discord (nom : `bot vente Clément`) et copier son URL.
2. Déployer ce dossier sur Vercel.
3. Renseigner les 2 variables d'env, puis redéployer.
4. Enregistrer le webhook Shopify `orders/create` pointant vers
   `https://<projet>.vercel.app/api/shopify-sale`.
5. Faire une commande test → vérifier le message dans Discord.
