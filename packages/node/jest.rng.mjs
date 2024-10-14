import crypto from 'crypto';

function getRandomSeed() {
    return crypto.randomBytes(16).toString('hex');
}

export default function () {
    if (!process.env.TEST_SEED) {
        process.env.TEST_SEED = getRandomSeed();
    }

    console.log(`\n=== Using random seed ${process.env.TEST_SEED} ===`);
}
