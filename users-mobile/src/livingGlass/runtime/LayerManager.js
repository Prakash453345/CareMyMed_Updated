/**
 * Living Glass Runtime v1 — LayerManager
 *
 * Enforces explicit 4-layer Z-index hierarchy:
 *   Overlay Layer:     z-index 9999 (modals, dialogs)
 *   Transition Layer:  z-index 999  (morphing shared elements)
 *   Content Layer:     z-index 100  (screen content)
 *   Navigation Layer:  z-index 10   (bottom tabs / app header)
 */

export const LAYERS = {
    NAVIGATION: 10,
    CONTENT: 100,
    TRANSITION: 999,
    OVERLAY: 9999,
};

export class LayerManager {
    static getZIndex(layerName) {
        return LAYERS[layerName] || LAYERS.CONTENT;
    }
}

export default LayerManager;
