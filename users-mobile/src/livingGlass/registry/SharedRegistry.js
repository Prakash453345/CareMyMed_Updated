/**
 * Living Glass Runtime v1 — SharedRegistry
 *
 * Holds element refs & measures spatial coordinates (<8ms budget).
 */

class SharedRegistry {
    constructor() {
        this.elements = new Map();
        this.boundsCache = new Map();
    }

    register(id, nodeRef) {
        if (!id || !nodeRef) return;
        this.elements.set(id, nodeRef);
    }

    unregister(id) {
        if (!id) return;
        this.elements.delete(id);
        this.boundsCache.delete(id);
    }

    async measure(id) {
        if (!id || !this.elements.has(id)) return null;
        const nodeRef = this.elements.get(id);

        return new Promise((resolve) => {
            if (!nodeRef || !nodeRef.current || !nodeRef.current.measureInWindow) {
                return resolve(null);
            }
            const startTime = Date.now();
            nodeRef.current.measureInWindow((x, y, width, height) => {
                const duration = Date.now() - startTime;
                if (duration > 16) {
                    console.warn(`[LivingGlassRegistry] Measurement took ${duration}ms (budget <8ms)`);
                }
                const bounds = { x, y, width, height };
                this.boundsCache.set(id, bounds);
                resolve(bounds);
            });
        });
    }

    getCachedBounds(id) {
        return this.boundsCache.get(id) || null;
    }

    clear() {
        this.elements.clear();
        this.boundsCache.clear();
    }
}

export const sharedRegistry = new SharedRegistry();
export default sharedRegistry;
