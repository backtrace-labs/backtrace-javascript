import { Events } from '../../common/Events';
import { AttachmentEvents } from '../../events/AttachmentEvents';
import { BacktraceAttachment } from '../../model/attachment';
import { BacktraceAttachmentProvider } from './BacktraceAttachmentProvider';

export class AttachmentManager {
    public readonly attachmentEvents: Events<AttachmentEvents>;

    private readonly _attachmentProviders: BacktraceAttachmentProvider[] = [];

    constructor() {
        this.attachmentEvents = new Events();
    }

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

    public get(type?: 'scoped' | 'dynamic'): BacktraceAttachment[] {
        const result: BacktraceAttachment[] = [];
        for (const provider of this._attachmentProviders) {
            if (type && provider.type !== type) {
                continue;
            }

            result.push(provider.get());
        }
        return result;
    }
}
