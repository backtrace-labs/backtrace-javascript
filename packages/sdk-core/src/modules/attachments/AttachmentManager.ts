import { Events } from '../../common/Events.js';
import { AttachmentEvents } from '../../events/AttachmentEvents.js';
import { BacktraceAttachment } from '../../model/attachment/index.js';
import { BacktraceAttachmentProvider } from './BacktraceAttachmentProvider.js';

export class AttachmentManager {
    public readonly attachmentEvents: Events<AttachmentEvents>;

    private readonly _attachmentProviders: BacktraceAttachmentProvider[] = [];

    constructor() {
        this.attachmentEvents = new Events();
    }

    /**
     * Adds attachment to manager cache.
     * @param attachments attachments or attachment returning functions
     */
    public add(...attachments: Array<BacktraceAttachment | (() => BacktraceAttachment)>) {
        this.addProviders(
            ...attachments.map<BacktraceAttachmentProvider>((a) =>
                typeof a === 'function'
                    ? {
                          type: 'dynamic',
                          get: a,
                      }
                    : {
                          type: 'scoped',
                          get: () => a,
                      },
            ),
        );
    }

    /**
     * Adds `BacktraceAttachmentProvider` to manager cache.
     * @param attachmentProviders attachment providers
     */
    public addProviders(...attachmentProviders: BacktraceAttachmentProvider[]) {
        let anyScoped = false;
        for (const provider of attachmentProviders) {
            if (provider.type === 'dynamic') {
                this._attachmentProviders.push(provider);
            } else {
                const attachment = provider.get();
                this._attachmentProviders.push({
                    type: 'scoped',
                    get: () => attachment,
                });
                anyScoped = true;
            }
        }

        if (anyScoped) {
            this.attachmentEvents.emit('scoped-attachments-updated', this.get('scoped'));
        }
    }

    /**
     * Returns scoped, dynamic, or all attachments.
     * @param type optional type to filter attachments
     * @returns array of `BacktraceAttachment`
     */
    public get(type?: 'scoped' | 'dynamic'): BacktraceAttachment[] {
        const result: BacktraceAttachment[] = [];
        for (const provider of this._attachmentProviders) {
            if (type && provider.type !== type) {
                continue;
            }

            const attachment = provider.get();
            if (!attachment) {
                continue;
            }

            if (Array.isArray(attachment)) {
                result.push(...attachment);
            } else {
                result.push(attachment);
            }
        }
        return result;
    }
}
