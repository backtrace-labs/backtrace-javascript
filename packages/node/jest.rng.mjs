import crypto from 'crypto';

function getRandomSeed() {
    return crypto.randomBytes(16).toString('hex');
}

export default function () {
    process.env.TEST_SEED ??= getRandomSeed();
    console.log(`\n=== Using random seed ${process.env.TEST_SEED} ===`);
}
