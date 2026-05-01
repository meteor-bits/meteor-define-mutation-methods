# Bug Report: `defineMutationMethods: false` causes startup crash with `aldeed:collection2`

**Meteor version:** 3.4.1  
**Package versions:** `allow-deny@2.1.0`, `mongo@2.3.0`  
**Repro:** https://github.com/meteor-bits/meteor-define-mutation-methods

---

## Symptoms

Creating a `Mongo.Collection` with `{ defineMutationMethods: false }` and then calling `attachSchema()` (via `aldeed:collection2`) crashes on startup:

```
TypeError: Cannot read properties of undefined (reading 'insert')
    at addValidator (packages/allow-deny/allow-deny.js:590:29)
    at CollectionPrototype.deny (packages/allow-deny/allow-deny.js:72:3)
    at defineDeny (packages/aldeed:collection2/main.js:765:9)
```

The error does **not** occur without `defineMutationMethods: false`, nor in Meteor **3.4.1-beta**.

---

## Root Cause

The chain of events:

1. **`setupMutationMethods` short-circuits too early**  
   `mongo/collection/collection_utils.js:47-49`:
   ```js
   export function setupMutationMethods(collection, name, options) {
     if (options.defineMutationMethods === false) return;
     // ...
     collection._defineMutationMethods({...});
   }
   ```

2. **`_defineMutationMethods` never runs**  
   `allow-deny/allow-deny.js:75-99` — this function initializes data structures that downstream code depends on:
   ```js
   CollectionPrototype._defineMutationMethods = function(options) {
     const self = this;
     self._restricted = false;
     self._insecure = undefined;
     self._validators = {
       insert: {allow: [], deny: []},
       update: {allow: [], deny: []},
       remove: {allow: [], deny: []},
       // ...
     };
     // ... then registers DDP methods (insertAsync, updateAsync, etc.)
   };
   ```

3. **`aldeed:collection2` calls `collection.deny()`** → `addValidator(this, 'deny', options)`  
   `allow-deny/allow-deny.js:590`:
   ```js
   collection._validators[validatorSyncName][allowOrDeny].push(options[name]);
   //          ^^^^^^^^^^^^^^^^ undefined → TypeError
   ```

   Since `_validators` was never initialized (step 2 was skipped), this line throws.

---

## Why 3.4.1-beta Worked

In the beta, `_defineMutationMethods` was likely called unconditionally during collection construction, and the `defineMutationMethods` option only controlled whether DDP methods were registered (the `self._connection.methods(m)` block). In the 3.4.1 release, this was refactored into `setupMutationMethods`, and the early return now skips the entire initialization.

---

## Fix Options

### Option A: Split initialization from DDP registration

In `_defineMutationMethods`, separate the validators initialization (lines 81-99) into its own method or block. Call the initialization part unconditionally from the constructor; only skip the DDP method registration part.

### Option B: Initialize `_validators` in the constructor

Set up `_validators`, `_restricted`, and `_insecure` inside `Mongo.Collection`'s constructor, before calling `setupMutationMethods`. This decouples validators setup from mutation method registration entirely.

### Option C: Fix `setupMutationMethods` to still initialize

```js
export function setupMutationMethods(collection, name, options) {
  if (options.defineMutationMethods === false) {
    collection._validators = { /* ... */ };
    collection._restricted = false;
    collection._insecure = undefined;
    return;
  }
  collection._defineMutationMethods({...});
}
```

This is the minimal fix but duplicates logic.

---

## Affected Files

| File | Role |
|------|------|
| `packages/mongo/collection/collection_utils.js:47` | `setupMutationMethods` — early return skips all init |
| `packages/allow-deny/allow-deny.js:75` | `_defineMutationMethods` — initializes `_validators` but never called |
| `packages/allow-deny/allow-deny.js:546` | `addValidator` — crashes on undefined `_validators` |
| `packages/aldeed:collection2/main.js:765` | Calls `collection.deny()` as part of `attachSchema` |

---

## Regression Window

Introduced between `3.4.1-beta` and `3.4.1` stable. The refactoring that moved DDP method setup into `setupMutationMethods` (likely part of the Rspack bundler migration or related Meteor internals restructuring) inadvertently broke the `defineMutationMethods` option by making it skip all initialization instead of just DDP method registration.
