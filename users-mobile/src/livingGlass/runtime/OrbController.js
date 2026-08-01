/**
 * Living Glass Runtime v1 — OrbController
 *
 * State machine managing Orb lifecycles across components:
 *   idle ──> pressed ──> awakening ──> active ──> dismissing ──> idle
 */

import { DeviceEventEmitter } from 'react-native';

export const ORB_STATES = {
    IDLE: 'idle',
    PRESSED: 'pressed',
    AWAKENING: 'awakening',
    ACTIVE: 'active',
    DISMISSING: 'dismissing',
};

class OrbController {
    constructor() {
        this.currentState = ORB_STATES.IDLE;
        this.subscribers = new Set();
    }

    getState() {
        return this.currentState;
    }

    setState(newState) {
        if (!Object.values(ORB_STATES).includes(newState)) return;
        this.currentState = newState;
        DeviceEventEmitter.emit('LIVING_GLASS_ORB_STATE_CHANGE', newState);
        this.subscribers.forEach(cb => cb(newState));
    }

    subscribe(callback) {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    }
}

export const orbController = new OrbController();
export default orbController;
