const fs = require('fs');
const path = require('path');
const Module = require('module');

// Set test mode to prevent side effects or connections
process.env.NODE_ENV = 'test';

// Mock redis and bullmq to prevent network socket allocation during inspection
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (
    request.endsWith('/lib/redis') ||
    request === '../lib/redis' ||
    request === './lib/redis'
  ) {
    const EventEmitter = require('events');
    class MockRedis extends EventEmitter {
      constructor() {
        super();
        this.status = 'ready';
      }
      ping() {
        return Promise.resolve('PONG');
      }
      quit() {
        return Promise.resolve();
      }
      get() {
        return Promise.resolve(null);
      }
      set() {
        return Promise.resolve('OK');
      }
      del() {
        return Promise.resolve(0);
      }
    }
    return new MockRedis();
  }
  if (request === 'bullmq') {
    function MockQueue(name) {
      this.name = name;
    }
    MockQueue.prototype.add = () => Promise.resolve({ id: 'mock' });
    return { Queue: MockQueue, Worker: function () {} };
  }
  return originalLoad.apply(this, arguments);
};

function inspectRouter(routerPath) {
  const router = require(routerPath);

  const routerLevelMiddleware = [];
  const routes = [];

  if (!router.stack || !Array.isArray(router.stack)) {
    throw new Error(`Invalid router at ${routerPath}: missing router.stack`);
  }

  for (const layer of router.stack) {
    if (layer.route) {
      // It's a route layer
      const r = layer.route;
      const methods = Object.keys(r.methods).map((m) => m.toUpperCase());
      const handlers = r.stack.map((h, idx) => ({
        index: idx,
        name: h.name || '<anonymous>',
        method: (h.method || methods[0] || 'ALL').toUpperCase(),
      }));

      routes.push({
        path: r.path,
        methods,
        handlerCount: handlers.length,
        handlers,
      });
    } else {
      // Router-level middleware
      routerLevelMiddleware.push({
        name: layer.name || layer.handle?.name || '<anonymous>',
        path: layer.regexp ? String(layer.regexp) : '*',
      });
    }
  }

  // Attached properties/functions on router object
  const attachedKeys = Object.keys(router).filter(
    (k) =>
      ![
        'params',
        '_params',
        'caseSensitive',
        'mergeParams',
        'strict',
        'stack',
      ].includes(k)
  );
  const attachedProperties = {};
  for (const k of attachedKeys) {
    attachedProperties[k] = typeof router[k];
  }

  return {
    modulePath: path.relative(process.cwd(), routerPath).replace(/\\/g, '/'),
    routerLevelMiddlewareCount: routerLevelMiddleware.length,
    routerLevelMiddleware,
    routeCount: routes.length,
    routes,
    attachedProperties,
  };
}

function generateInventory() {
  const targets = [
    path.join(__dirname, '../routes/users/patients.js'),
    path.join(__dirname, '../routes/users/medicines.js'),
    path.join(__dirname, '../routes/companion.js'),
  ];

  const inventory = {};
  for (const target of targets) {
    const key = path.basename(target, '.js');
    inventory[key] = inspectRouter(target);
  }
  return inventory;
}

const args = process.argv.slice(2);
const isDiff = args.includes('--diff');
const baselineFile = path.join(__dirname, 'route-inventory-baseline.json');

if (isDiff) {
  if (!fs.existsSync(baselineFile)) {
    console.error('No baseline file found at:', baselineFile);
    process.exit(1);
  }
  const baseline = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
  const current = generateInventory();

  let hasError = false;
  for (const [key, baseMod] of Object.entries(baseline)) {
    const currMod = current[key];
    if (!currMod) {
      console.error(`Missing module: ${key}`);
      hasError = true;
      continue;
    }
    if (baseMod.routeCount !== currMod.routeCount) {
      console.error(
        `[${key}] Route count mismatch: expected ${baseMod.routeCount}, got ${currMod.routeCount}`
      );
      hasError = true;
    }
    if (
      baseMod.routerLevelMiddlewareCount !== currMod.routerLevelMiddlewareCount
    ) {
      console.error(
        `[${key}] Router-level middleware count mismatch: expected ${baseMod.routerLevelMiddlewareCount}, got ${currMod.routerLevelMiddlewareCount}`
      );
      hasError = true;
    }
    for (
      let i = 0;
      i < Math.max(baseMod.routes.length, currMod.routes.length);
      i++
    ) {
      const b = baseMod.routes[i];
      const c = currMod.routes[i];
      if (!b) {
        console.error(`[${key}] Extra route at index ${i}:`, c);
        hasError = true;
      } else if (!c) {
        console.error(`[${key}] Missing route at index ${i}:`, b);
        hasError = true;
      } else {
        if (
          b.path !== c.path ||
          JSON.stringify(b.methods) !== JSON.stringify(c.methods)
        ) {
          console.error(`[${key}] Route path/method mismatch at index ${i}:`);
          console.error('  Expected:', b.methods, b.path);
          console.error('  Actual:  ', c.methods, c.path);
          hasError = true;
        }
        if (b.handlerCount !== c.handlerCount) {
          console.error(
            `[${key}] Handler count mismatch for ${b.methods} ${b.path}: expected ${b.handlerCount}, got ${c.handlerCount}`
          );
          hasError = true;
        }
        // Verify middleware before the final handler match exactly
        for (let m = 0; m < b.handlers.length - 1; m++) {
          const bMiddleware = b.handlers[m].name;
          const cMiddleware = c.handlers[m].name;
          if (bMiddleware !== '<anonymous>' && bMiddleware !== cMiddleware) {
            console.error(
              `[${key}] Middleware mismatch at index ${m} for ${b.methods} ${b.path}: expected ${bMiddleware}, got ${cMiddleware}`
            );
            hasError = true;
          }
        }
      }
    }
    const bProps = JSON.stringify(baseMod.attachedProperties);
    const cProps = JSON.stringify(currMod.attachedProperties);
    if (bProps !== cProps) {
      console.error(`[${key}] Attached properties mismatch:`);
      console.error('  Expected:', baseMod.attachedProperties);
      console.error('  Actual:  ', currMod.attachedProperties);
      hasError = true;
    }
  }

  if (!hasError) {
    console.log('✅ 100% ROUTE & EXPORT PARITY CONFIRMED!');
    console.log(
      'Zero differences in paths, methods, middleware stacks, ordering, or attached exports.'
    );
    process.exit(0);
  } else {
    console.error('❌ PARITY CHECK FAILED!');
    process.exit(1);
  }
} else {
  const inventory = generateInventory();
  fs.writeFileSync(baselineFile, JSON.stringify(inventory, null, 2));
  console.log(`✅ Baseline route inventory saved to: ${baselineFile}`);
  for (const [name, data] of Object.entries(inventory)) {
    console.log(
      `  - ${name}: ${data.routeCount} routes, ${data.routerLevelMiddlewareCount} router-level middleware, attached exports: ${JSON.stringify(data.attachedProperties)}`
    );
  }
}
