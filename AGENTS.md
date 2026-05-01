# AGENTS.md — meteor-define-mutation-methods

## Purpose

This is a **minimal reproduction repository** for a Meteor bug: using `defineMutationMethods: false` in a `Mongo.Collection` constructor together with `aldeed:collection2` causes a startup crash in Meteor 3.4.1. It is **not** a production app — it exists solely to trigger and demonstrate the error.

## Project Type & Stack

- **Meteor 3.4.1** (with Rspack bundler via `@meteorjs/rspack`)
- **React 18.2** on the client
- **MongoDB** via Meteor's `mongo` package
- Key packages: `aldeed:collection2@4.1.5`, `aldeed:simple-schema@1.13.1`

## Essential Commands

| Command | What it does |
|---------|-------------|
| `npm start` | `meteor run` — starts the app in dev mode |
| `npm test` | `meteor test --once --driver-package meteortesting:mocha` — runs tests once |
| `npm run test-app` | `TEST_WATCH=1 meteor test --full-app` — runs full-app tests with watch |
| `npm run visualize` | Starts with bundle visualizer |

The test runner is **Mocha** (via `meteortesting:mocha`). Tests live in `tests/main.js`. Test module is configured in `package.json` at `meteor.testModule`.

## Code Organization

```
imports/
  api/
    links.js             # MongoDB collection definition (THE BUG TRIGGER)
  ui/
    App.jsx              # Root React component
    Counter.jsx          # Simple state counter example
    Header.jsx           # App header with SVG logo
    Info.jsx             # Subscribes to "links" publication, renders list
    styles.css           # All app styles
    meteor-logo.svg      # Imported as React component via @svgr/webpack
client/
  main.jsx               # Client entry: mounts React app
  main.html              # HTML entry: <head> and body with #react-target
  main.css               # (minimal, mostly unused)
server/
  main.js                # Server entry: seeds data, publishes "links", defines methods
tests/
  main.js                # Mocha tests
rspack.config.js         # Rspack config
.swcrc                   # SWC transform config (React automatic JSX runtime)
```

## Bug Reproduction Flow (What This Repo Demonstrates)

1. `imports/api/links.js` creates a collection with `defineMutationMethods: false`
2. It applies a SimpleSchema via `attachSchema()`
3. On startup, `aldeed:collection2` calls `collection.deny()` which internally calls `addValidator` in the `allow-deny` package
4. `addValidator` iterates over mutation method names (insert, update, remove, upsert) — but since `defineMutationMethods: false`, these methods are `undefined`
5. Result: `TypeError: Cannot read properties of undefined (reading 'insert')`

## Key Code Patterns

### Collection Definition (the broken pattern)
```js
import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'meteor/aldeed:simple-schema';
import 'meteor/aldeed:collection2/static';

export const LinksCollection = new Mongo.Collection('links', { defineMutationMethods: false });

const schema = new SimpleSchema({});
LinksCollection.attachSchema(schema);
```

### Async Mongo API (Meteor 3.x pattern)
```js
await LinksCollection.insertAsync({ title, url, createdAt: new Date() });
await LinksCollection.find().countAsync();
```

### React Meteor Reactivity
```js
import { useFind, useSubscribe } from "meteor/react-meteor-data";

const isLoading = useSubscribe("links");
const links = useFind(() => LinksCollection.find());
```

### Server startup / publish / methods
```js
Meteor.startup(async () => { ... });
Meteor.publish("links", function () { ... });
Meteor.methods({ about() { ... } });
```

## Non-obvious Details

- **`meteor/aldeed:collection2/static`** must be imported separately (not just the package) for the `attachSchema` method to be available — this is a `collection2` v4 pattern.
- **No JSX transform config in rspack.config.js**: the automatic JSX runtime is configured via `.swcrc` (`"runtime": "automatic"`), not via rspack's `@rspack/plugin-react-refresh` config. This means you don't need `import React from 'react'`.
- **Entry points** are declared in `package.json` under `meteor.mainModule` (not in `rspack.config.js`).
- SVG imports resolve as React components via `@svgr/webpack` rule in `rspack.config.js`.
- The `private/` and `public/` directories exist but are empty — they're standard Meteor scaffolding.
- The `tests/main.js` uses `Meteor.isClient` / `Meteor.isServer` globals directly (no imports needed — Meteor provides them).
- The expected behavior (once the bug is fixed) is that `defineMutationMethods: false` should prevent `allow-deny` from trying to register mutation hooks.

## Known Unrelated Files

- `client/main.css` has only a `padding: 10px` rule — effectively unused. All real styles are in `imports/ui/styles.css`.
