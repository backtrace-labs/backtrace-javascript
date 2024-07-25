import { Events } from '../../common/Events';
import { AttachmentEvents } from '../../events/AttachmentEvents';
import { BacktraceAttachment } from '../../model/attachment';

export class AttachmentManager {
    public readonly attachmentEvents: Events<AttachmentEvents>;

    private readonly _attachments: BacktraceAttachment[] = [];

    constructor() {
        this.attachmentEvents = new Events();
    }

    public add(...attachments: BacktraceAttachment[]) {
        this._attachments.push(...attachments);
        this.attachmentEvents.emit('attachments-updated', this.get());
    }

    public get(): BacktraceAttachment[] {
        return [...this._attachments];
    }
}
