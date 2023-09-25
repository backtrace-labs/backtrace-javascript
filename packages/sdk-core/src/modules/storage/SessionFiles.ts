import { Events } from '../../common/Events';
import { IdGenerator } from '../../common/IdGenerator';
import { BacktraceModule } from '../BacktraceModule';
import { FileSystem } from './FileSystem';

interface FileSession {
    readonly file: string;
    readonly sessionId: string;
    readonly escapedSessionId: string;
    readonly timestamp: number;
}

type SessionEvents = {
    unlocked(): void;
};

const SESSION_MARKER_PREFIX = 'bt-session';

const isDefined = <T>(t: T | undefined): t is T => !!t;

export class SessionFiles implements BacktraceModule {
    private readonly _timestamp: number;
    private readonly _events = new Events<SessionEvents>();
    private readonly _escapedSessionId: string;
    private readonly _locks: string[] = [];
    private _previousSession?: SessionFiles;
    private _cleared = false;

    constructor(
        private readonly _fileSystem: FileSystem,
        private readonly _directory: string,
        private readonly _sessionId: string,
        timestamp?: number,
    ) {
        this._timestamp = timestamp ?? Date.now();
        this._escapedSessionId = SessionFiles.escapeFileName(_sessionId);
    }

    public initialize(): void {
        this.createSessionMarker();
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
            .map((f) => SessionFiles.getFileSession(f))
            .filter(isDefined);

        const currentSessionMarker = sessionMarkers.find((s) => s.sessionId === this._sessionId);

        const lastSessionMarker = directoryFiles
            .filter((f) => f.startsWith(SESSION_MARKER_PREFIX))
            .map((file) => SessionFiles.getFileSession(file))
            .filter(isDefined)
            .sort((a, b) => b.timestamp - a.timestamp)
            .filter(({ timestamp }) => !currentSessionMarker || currentSessionMarker.timestamp > timestamp)[0];

        if (!lastSessionMarker) {
            return undefined;
        }

        return (this._previousSession = new SessionFiles(
            this._fileSystem,
            this._directory,
            lastSessionMarker.sessionId,
            lastSessionMarker.timestamp,
        ));
    }

    public getSessionWithId(sessionId: string) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let session: SessionFiles | undefined = this;
        while (session && session._sessionId !== sessionId) {
            session = session.getPreviousSession();
        }

        return session;
    }

    public *getPreviousSessions() {
        let current = this.getPreviousSession();
        while (current) {
            yield current;
            current = current.getPreviousSession();
        }
    }

    public lockPreviousSessions(lockId?: string) {
        lockId = lockId ?? IdGenerator.uuid();
        for (const session of this.getPreviousSessions()) {
            session.lock(lockId);
        }
        return lockId;
    }

    public unlockPreviousSessions(lockId: string) {
        for (const session of this.getPreviousSessions()) {
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

        return (
            this._directory +
            '/' +
            `${SessionFiles.escapeFileName(prefix)}_${this._escapedSessionId}_${this._timestamp}`
        );
    }

    public getSessionFiles() {
        this.throwIfCleared();

        const files = this.readDirectoryFiles();
        return files
            .map((file) => SessionFiles.getFileSession(file))
            .filter(isDefined)
            .filter(({ sessionId }) => sessionId === this._sessionId)
            .map(({ file }) => this._directory + '/' + file);
    }

    public clearSession(deleteMarker = true) {
        if (this._locks.length > 0) {
            this._events.once('unlocked', () => this.clearSession(deleteMarker));
            return;
        }

        if (this._cleared) {
            return;
        }

        try {
            const sessionFiles = this.getSessionFiles();
            for (const file of sessionFiles) {
                if (!deleteMarker && file.startsWith(SESSION_MARKER_PREFIX)) {
                    continue;
                }

                this._fileSystem.unlinkSync(file);
            }
        } catch {
            // Don't propagate errors
        } finally {
            this._cleared = true;
        }
    }

    public lock(lockId?: string) {
        if (this._cleared) {
            return;
        }

        lockId = lockId ?? IdGenerator.uuid();
        this._locks.push(lockId);
        return lockId;
    }

    public unlock(lockId: string) {
        const index = this._locks.indexOf(lockId);
        if (index === -1) {
            return;
        }

        this._locks.splice(index, 1);
        if (this._locks.length === 0) {
            this._events.emit('unlocked');
        }
    }

    private static getFileSession(file: string): FileSession | undefined {
        const [escapedSessionId, rawTimestamp] = this.splitByOneChar(file, '_').slice(-2);
        const timestamp = parseInt(rawTimestamp);
        if (isNaN(timestamp)) {
            return undefined;
        }

        return { file, escapedSessionId, timestamp, sessionId: this.unescapeFileName(escapedSessionId) };
    }

    private readDirectoryFiles() {
        try {
            return this._fileSystem.readDirSync(this._directory);
        } catch {
            return [];
        }
    }

    private createSessionMarker() {
        const fileName = this.getFileName(SESSION_MARKER_PREFIX);
        this._fileSystem.writeFileSync(fileName, '');
    }

    private static escapeFileName(name: string) {
        return name.replace(/_/g, '__');
    }

    private static unescapeFileName(name: string) {
        return name.replace(/__/g, '_');
    }

    private static splitByOneChar(str: string, char: string) {
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
}
