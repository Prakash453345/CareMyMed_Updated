/**
 * Living Glass Runtime v1 — TransitionScheduler
 *
 * Ensures single active transition lock and handles interruption/cancellation.
 */

class TransitionScheduler {
    constructor() {
        this.activeTransition = null;
        this.queue = [];
        this.isLocked = false;
    }

    acquireLock(transitionId) {
        if (this.isLocked) {
            console.warn(`[TransitionScheduler] Lock active by ${this.activeTransition}, cancelling current & processing next: ${transitionId}`);
            this.cancelActive();
        }
        this.isLocked = true;
        this.activeTransition = transitionId;
        return true;
    }

    releaseLock(transitionId) {
        if (this.activeTransition === transitionId) {
            this.isLocked = false;
            this.activeTransition = null;
        }
    }

    cancelActive() {
        if (this.activeTransition) {
            console.warn(`[TransitionScheduler] Interrupted transition: ${this.activeTransition}`);
            this.isLocked = false;
            this.activeTransition = null;
        }
    }

    isBusy() {
        return this.isLocked;
    }
}

export const transitionScheduler = new TransitionScheduler();
export default transitionScheduler;
