/**
 * Living Glass Runtime v1 — TransitionController
 *
 * Computes spatial morph deltas from V1 descriptors.
 */

import sharedRegistry from '../registry/SharedRegistry';
import transitionScheduler from './TransitionScheduler';
import motionTokens from '../tokens/motionTokens';
import springTokens from '../tokens/springTokens';

export class TransitionController {
    static async prepareDescriptor(descriptor) {
        const {
            sourceId,
            destinationId,
            durationToken = 'unfold',
            springToken = 'gentle',
            phases = ['compress', 'lift', 'expand', 'diffuse', 'crossFade', 'settle'],
            diffusion = {},
        } = descriptor;

        const transitionId = `${sourceId}_to_${destinationId}_${Date.now()}`;
        if (!transitionScheduler.acquireLock(transitionId)) {
            return null;
        }

        const sourceBounds = await sharedRegistry.measure(sourceId);
        const destBounds = await sharedRegistry.measure(destinationId);

        const duration = motionTokens.duration[durationToken] || motionTokens.duration.unfold;
        const spring = springTokens[springToken] || springTokens.gentle;

        return {
            transitionId,
            version: 'v1',
            sourceId,
            destinationId,
            sourceBounds,
            destBounds,
            duration,
            spring,
            phases,
            diffusion,
        };
    }

    static finish(transitionId) {
        transitionScheduler.releaseLock(transitionId);
    }
}

export default TransitionController;
