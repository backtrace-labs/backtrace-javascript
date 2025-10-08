import crypto from 'crypto';
import { MachineIdentitfierAttributeProvider } from '../../src/attributes/MachineIdentitfierAttributeProvider.js';

describe('Machine id attribute provider test', () => {
    if (MachineIdentitfierAttributeProvider.SUPPORTED_PLATFORMS.includes(process.platform)) {
        it('Should always generate the same identifier', () => {
            const machineIdentifier1 = new MachineIdentitfierAttributeProvider();
            const machineIdentifier2 = new MachineIdentitfierAttributeProvider();

            expect(machineIdentifier1.getMachineId()).toBe(machineIdentifier2.getMachineId());
        });
    }

    it(`Should always set machine id attribute`, () => {
        const machineIdentifier = new MachineIdentitfierAttributeProvider();

        expect(machineIdentifier.get()['guid']).toBeDefined();
    });

    it(`Should return a guid unchanged if it's a valid guid`, () => {
        const machineIdentifier = new MachineIdentitfierAttributeProvider();
        const uuid = crypto.randomUUID();

        jest.spyOn(machineIdentifier, 'getMachineId').mockReturnValue(uuid);

        expect(machineIdentifier.get()['guid']).toEqual(uuid);
    });

    it(`Should convert guid to a guid with dashes`, () => {
        const machineIdentifier = new MachineIdentitfierAttributeProvider();
        const uuid = crypto.randomUUID();

        jest.spyOn(machineIdentifier, 'getMachineId').mockReturnValue(uuid.replace(/-/g, ''));

        expect(machineIdentifier.get()['guid']).toEqual(uuid);
    });

    it(`Should create a hash of guid if it is not a proper guid`, () => {
        const machineIdentifier = new MachineIdentitfierAttributeProvider();
        const guidResult = 'foo';
        const sha = crypto.createHash('sha1').update(guidResult).digest('hex').substring(0, 32);
        const expected = `${sha.substring(0, 8)}-${sha.substring(8, 12)}-${sha.substring(12, 16)}-${sha.substring(16, 20)}-${sha.substring(20, 32)}`;

        // Sanity check for creating a dashed guid
        expect(expected.replace(/-/g, '')).toEqual(sha);

        jest.spyOn(machineIdentifier, 'getMachineId').mockReturnValue(guidResult);

        expect(machineIdentifier.get()['guid']).toEqual(expected);
    });
});
