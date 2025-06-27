import { Events } from '../../common/Events.js';
import { IdGenerator } from '../../common/IdGenerator.js';
import { BacktraceModule } from '../BacktraceModule.js';
import { BacktraceIterableSyncStorage, BacktraceSyncStorage } from './BacktraceStorage.js';

interface FileSession {
    readonly file: string;
    readonly sessionId: SessionId;
    readonly escapedSessionId: string;
}

type SessionEvents = {
    unlocked: [];
};

export interface SessionId {
    readonly id: string;
    readonly timestamp: number;
}

const SESSION_MARKER_PREFIX = 'bt-session';

const isDefined = <T>(t: T | undefined): t is T => !!t;

export class SessionFiles implements BacktraceModule {
    public readonly marker: string;

    private readonly _events = new Events<SessionEvents>();
    private readonly _escapedSessionId: string;
    private readonly _locks = new Set<string>();
    private _previousSession?: SessionFiles;
    private _cleared = false;

    constructor(
        private readonly _storage: BacktraceSyncStorage & BacktraceIterableSyncStorage,
        public readonly sessionId: SessionId,
        private readonly _maxPreviousLockedSessions = 1,
        private readonly _lockable = true,
    ) {
        this._escapedSessionId = this.escapeFileName(sessionId.id);
        this.marker = this.getFileName(SESSION_MARKER_PREFIX);
    }

    public initialize(): void {
        return this.createSessionMarker();
    }

    public getPreviousSession() {
        if (this._previousSession) {
            return this._previousSession;
        }

        const directoryFiles = this.readDirectoryFiles();
        if (!directoryFiles.length) {
            return undefined;
        }

        const sessionMarkers = directoryFiles
            .filter((f) => f.startsWith(SESSION_MARKER_PREFIX))
            .map((f) => this.getFileSession(f))
            .filter(isDefined)
            .sort((a, b) => b.sessionId.timestamp - a.sessionId.timestamp);

        const currentSessionMarker = sessionMarkers.find((s) => this.sessionIdEquals(s.sessionId, this.sessionId));

        const lastSessionMarker = currentSessionMarker
            ? sessionMarkers.filter(
                  ({ sessionId }) => currentSessionMarker.sessionId.timestamp > sessionId.timestamp,
              )[0]
            : sessionMarkers[0];

        if (!lastSessionMarker) {
            return undefined;
        }

        return (this._previousSession = new SessionFiles(
            this._storage,
            lastSessionMarker.sessionId,
            this._maxPreviousLockedSessions - 1,
            this._maxPreviousLockedSessions > 0,
        ));
    }

    public getSessionWithId(sessionId: SessionId) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let session: SessionFiles | undefined = this;
        while (session && this.sessionIdEquals(session.sessionId, sessionId)) {
            session = session.getPreviousSession();
        }

        return session;
    }

    public getPreviousSessions(count = Infinity) {
        const result: SessionFiles[] = [];
        let current = this.getPreviousSession();
        while (current && count > 0) {
            result.push(current);
            count--;
            current = current.getPreviousSession();
        }

        return result;
    }

    public lockPreviousSessions(lockId?: string) {
        lockId = lockId ?? IdGenerator.uuid();
        for (const session of this.getPreviousSessions(this._maxPreviousLockedSessions)) {
            session.lock(lockId);
        }
        return lockId;
    }

    public unlockPreviousSessions(lockId: string) {
        for (const session of this.getPreviousSessions(this._maxPreviousLockedSessions)) {
            session.unlock(lockId);
        }
    }

    public clearPreviousSessions() {
        for (const session of this.getPreviousSessions()) {
            session.clearSession();
        }
    }

    public getFileName(prefix: string) {
        this.throwIfCleared();

        return `${this.escapeFileName(prefix)}_${this._escapedSessionId}_${this.sessionId.timestamp}`;
    }

    public getSessionFiles() {
        this.throwIfCleared();

        const files = this.readDirectoryFiles();
        return files
            .map((file) => this.getFileSession(file))
            .filter(isDefined)
            .filter(({ sessionId }) => this.sessionIdEquals(sessionId, this.sessionId))
            .map(({ file }) => file);
    }

    public clearSession() {
        if (this._locks.size > 0) {
            this._events.once('unlocked', () => this.clearSession());
            return;
        }

        if (this._cleared) {
            return;
        }

        try {
            const sessionFiles = this.getSessionFiles();
            for (const file of sessionFiles) {
                this._storage.removeSync(file);
            }
        } catch {
            // Don't propagate errors
        } finally {
            this._cleared = true;
        }
    }

    public lock(lockId?: string) {
        if (this._cleared || !this._lockable) {
            return;
        }

        lockId = lockId ?? IdGenerator.uuid();
        this._locks.add(lockId);
        return lockId;
    }

    public unlock(lockId: string) {
        this._locks.delete(lockId);
        if (this._locks.size === 0) {
            this._events.emit('unlocked');
        }
    }

    private getFileSession(file: string): FileSession | undefined {
        const [escapedSessionId, rawTimestamp] = this.splitByOneChar(file, '_').slice(-2);
        const timestamp = parseInt(rawTimestamp);
        if (isNaN(timestamp)) {
            return undefined;
        }

        return {
            file,
            escapedSessionId,
            sessionId: {
                timestamp,
                id: this.unescapeFileName(escapedSessionId),
            },
        };
    }

    private readDirectoryFiles() {
        try {
            return [...this._storage.keysSync()];
        } catch {
            return [];
        }
    }

    private createSessionMarker() {
        this._storage.setSync(this.marker, '');
    }

    private escapeFileName(name: string) {
        return name.replace(/_/g, '__');
    }

    private unescapeFileName(name: string) {
        return name.replace(/__/g, '_');
    }

    private splitByOneChar(str: string, char: string) {
        const result: string[] = [];
        let start = 0;
        let index = str.indexOf(char);

        while (index !== -1) {
            if (str[index + 1] === char) {
                index = str.indexOf(char, index + 2);
            } else {
                result.push(str.substring(start, index));
                start = index + 1;
                index = str.indexOf(char, start);
            }
        }

        result.push(str.substring(start));

        return result;
    }

    private throwIfCleared() {
        if (this._cleared) {
            throw new Error('This session files are cleared.');
        }
    }

    private sessionIdEquals(a: SessionId, b: SessionId) {
        return a.id === b.id && a.timestamp === b.timestamp;
    }
}
