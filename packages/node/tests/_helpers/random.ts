import randomSeed from 'random-seed';

const seed = process.env.TEST_SEED;
export function createRng() {
    return randomSeed.create(seed);
}
