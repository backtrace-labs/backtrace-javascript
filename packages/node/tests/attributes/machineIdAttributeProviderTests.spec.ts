import { MachineIdentitfierAttributeProvider } from '../../src/attributes/MachineIdentitfierAttributeProvider.js';

describe('Machine id attribute provider test', () => {
    if (MachineIdentitfierAttributeProvider.SUPPORTED_PLATFORMS.includes(process.platform)) {
        it('Should always generate the same identifier', () => {
            const machineIdentifier1 = new MachineIdentitfierAttributeProvider();
            const machineIdentifier2 = new MachineIdentitfierAttributeProvider();

            expect(machineIdentifier1.generateGuid()).toBe(machineIdentifier2.generateGuid());
        });
    }

    it(`Should always set machine id attribute`, () => {
        const machineIdentifier = new MachineIdentitfierAttributeProvider();

        expect(machineIdentifier.get()['guid']).toBeDefined();
    });
});
