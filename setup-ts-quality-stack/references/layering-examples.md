# Layering examples

Interface rules (how you import) never change. Layering rules (who may depend on whom) are per repo and go in
block 2 of `.dependency-cruiser.cjs`. Name rules after the sentence they enforce.

## Default greenfield layering (apps/{web,api}, packages/{core,ui})

Already in `templates/dependency-cruiser.workspaces.cjs`: `core` is a pure leaf, `ui` depends only on `core`,
`packages/*` never import `apps/*`, and apps never import each other.

## Contract-first backend (domain / contract / server, plus a worker app)

Use when the API contract (Effect `HttpApi`/RPC schemas) is shared by the web UI and the server.

```js
{
  name: "domain-is-pure-leaf",
  severity: "error",
  from: { path: "^packages/domain/" },
  to: { path: "^(apps|packages)/", pathNot: "^packages/domain/" },
},
{
  name: "contract-only-domain",
  comment: "The contract may depend only on domain.",
  severity: "error",
  from: { path: "^packages/contract/" },
  to: { path: "^(apps|packages)/", pathNot: "^packages/(domain|contract)/" },
},
{
  name: "server-never-imports-apps",
  severity: "error",
  from: { path: "^packages/server/" },
  to: { path: "^apps/" },
},
{
  name: "web-server-only-in-api-route",
  comment: "Only apps/web/app/api/** may import packages/server. UI code goes through packages/contract.",
  severity: "error",
  from: { path: "^apps/web/", pathNot: "^apps/web/app/api/" },
  to: { path: "^(packages/server/|apps/worker/)" },
},
```

## Single app (src/packages/<name>/)

No workspaces. Use `templates/dependency-cruiser.src-packages.cjs` and add layering rules in its commented
stub, for example:

```js
{
  name: "ui-may-not-depend-on-billing",
  severity: "error",
  from: { path: "^src/packages/ui/" },
  to: { path: "^src/packages/billing/" },
},
```
