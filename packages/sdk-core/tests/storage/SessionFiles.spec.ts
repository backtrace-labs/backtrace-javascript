import assert from 'assert';
import { SessionFiles, SessionId } from '../../src/modules/storage/SessionFiles.js';
import { mockFileSystem } from '../_mocks/fileSystem.js';

describe('SessionFiles', () => {
    function sessionId(id: string, timestamp?: number): SessionId {
        return {
            id,
            timestamp: timestamp ?? Date.now(),
        };
    }

    it('should create empty session marker on initialize', () => {
        const fileSystem = mockFileSystem();
        const session = new SessionFiles(fileSystem, '.', sessionId('sessionId'));
        session.initialize();

        expect(fileSystem.readFileSync(session.marker)).toEqual('');
    });

    describe('getPreviousSession', () => {
        it('should return undefined if no previous session marker exists', () => {
            const fileSystem = mockFileSystem();
            const session = new SessionFiles(fileSystem, '.', sessionId('sessionId'));
            session.initialize();

            const previous = session.getPreviousSession();
            expect(previous).toBeUndefined();
        });

        it('should return previous session if previous session marker exists', () => {
            const fileSystem = mockFileSystem();
            const previousSession = new SessionFiles(fileSystem, '.', sessionId('previousSessionId', 10));
            previousSession.initialize();

            const session = new SessionFiles(fileSystem, '.', sessionId('sessionId', 20));
            session.initialize();

            const previous = session.getPreviousSession();
            expect(previous?.sessionId).toEqual(previousSession.sessionId);
        });

        it('should return previous session if previous session contains underscores', () => {
            const fileSystem = mockFileSystem();
            const previousSession = new SessionFiles(fileSystem, '.', sessionId('previous_session_id', 10));
            previousSession.initialize();

            const session = new SessionFiles(fileSystem, '.', sessionId('sessionId', 20));
            session.initialize();

            const previous = session.getPreviousSession();
            expect(previous?.sessionId).toEqual(previousSession.sessionId);
        });

        it('should return session older than current if multiple previous session markers exist', () => {
            const fileSystem = mockFileSystem();
            const oldPreviousSession = new SessionFiles(fileSystem, '.', sessionId('oldPreviousSessionId', 5));
            const previousSession = new SessionFiles(fileSystem, '.', sessionId('previousSessionId', 10));
            const nextSession = new SessionFiles(fileSystem, '.', sessionId('nextSessionId', 25));
            oldPreviousSession.initialize();
            previousSession.initialize();
            nextSession.initialize();

            const session = new SessionFiles(fileSystem, '.', sessionId('sessionId', 20));
            session.initialize();

            const previous = session.getPreviousSession();
            expect(previous?.sessionId).toEqual(previousSession.sessionId);
        });

        it('should return previous session of each session', () => {
            const fileSystem = mockFileSystem();
            const session1 = new SessionFiles(fileSystem, '.', sessionId('session1', 5));
            const session2 = new SessionFiles(fileSystem, '.', sessionId('session2', 10));
            const session3 = new SessionFiles(fileSystem, '.', sessionId('session3', 15));
            session1.initialize();
            session2.initialize();
            session3.initialize();

            const session = new SessionFiles(fileSystem, '.', sessionId('sessionId', 20));
            session.initialize();

            const actualSession3 = session.getPreviousSession();
            const actualSession2 = actualSession3?.getPreviousSession();
            const actualSession1 = actualSession2?.getPreviousSession();
            const notExistingSession = actualSession1?.getPreviousSession();

            expect(actualSession3?.sessionId).toEqual(session3.sessionId);
            expect(actualSession2?.sessionId).toEqual(session2.sessionId);
            expect(actualSession1?.sessionId).toEqual(session1.sessionId);
            expect(notExistingSession).toBeUndefined();
        });

        it('should return non-lockable session when maxPreviousLockedSessions is 0', () => {
            const fileSystem = mockFileSystem();
            const session1 = new SessionFiles(fileSystem, '.', sessionId('session1', 5));
            const session2 = new SessionFiles(fileSystem, '.', sessionId('session2', 10));
            const session3 = new SessionFiles(fileSystem, '.', sessionId('session3', 15));
            session1.initialize();
            session2.initialize();
            session3.initialize();

            const session = new SessionFiles(fileSystem, '.', sessionId('sessionId', 20), 0);
            session.initialize();

            const previousSession = session.getPreviousSession();
            assert(previousSession);

            expect(previousSession.lock()).toBeUndefined();
        });

        it('should return lockable session when maxPreviousLockedSessions is larger than 0', () => {
            const fileSystem = mockFileSystem();
            const session1 = new SessionFiles(fileSystem, '.', sessionId('session1', 5));
            const session2 = new SessionFiles(fileSystem, '.', sessionId('session2', 10));
            const session3 = new SessionFiles(fileSystem, '.', sessionId('session3', 15));
            session1.initialize();
            session2.initialize();
            session3.initialize();

            const session = new SessionFiles(fileSystem, '.', sessionId('sessionId', 20), 1);
            session.initialize();

            const previousSession = session.getPreviousSession();
            assert(previousSession);

            expect(previousSession.lock()).not.toBeUndefined();
        });

        it('should return non-lockable session from previous session when maxPreviousLockedSessions is 1', () => {
            const fileSystem = mockFileSystem();
            const session1 = new SessionFiles(fileSystem, '.', sessionId('session1', 5));
            const session2 = new SessionFiles(fileSystem, '.', sessionId('session2', 10));
            const session3 = new SessionFiles(fileSystem, '.', sessionId('session3', 15));
            session1.initialize();
            session2.initialize();
            session3.initialize();

            const session = new SessionFiles(fileSystem, '.', sessionId('sessionId', 20), 0);
            session.initialize();

            const previousSession = session.getPreviousSession()?.getPreviousSession();
            assert(previousSession);

            expect(previousSession.lock()).toBeUndefined();
        });
    });

    describe('getPreviousSessions', () => {
        it('should return all previous sessions', () => {
            const fileSystem = mockFileSystem();
            const session1 = new SessionFiles(fileSystem, '.', sessionId('session1', 5));
            const session2 = new SessionFiles(fileSystem, '.', sessionId('session2', 10));
            const session3 = new SessionFiles(fileSystem, '.', sessionId('session3', 15));
            session1.initialize();
            session2.initialize();
            session3.initialize();

            const session = new SessionFiles(fileSystem, '.', sessionId('sessionId', 20));
            session.initialize();

            const previousSessions = session.getPreviousSessions();

            expect(previousSessions.map((s) => s.sessionId)).toEqual([
                session3.sessionId,
                session2.sessionId,
                session1.sessionId,
            ]);
        });

        it('should return previous sessions limited by count', () => {
            const fileSystem = mockFileSystem();
            const session1 = new SessionFiles(fileSystem, '.', sessionId('session1', 5));
            const session2 = new SessionFiles(fileSystem, '.', sessionId('session2', 10));
            const session3 = new SessionFiles(fileSystem, '.', sessionId('session3', 15));
            session1.initialize();
            session2.initialize();
            session3.initialize();

            const session = new SessionFiles(fileSystem, '.', sessionId('sessionId', 20));
            session.initialize();

            const previousSessions = session.getPreviousSessions(2);

            expect(previousSessions.map((s) => s.sessionId)).toEqual([session3.sessionId, session2.sessionId]);
        });
    });

    describe('getFileName', () => {
        it('should return file name with escaped session ID', () => {
            const fileSystem = mockFileSystem();
            const session = new SessionFiles(fileSystem, '.', sessionId('sessionId'));

            const filename = session.getFileName('file_name');
            expect(filename).toContain('file__name');
        });

        it('should return file name with escaped file name', () => {
            const fileSystem = mockFileSystem();
            const session = new SessionFiles(fileSystem, '.', sessionId('session_id'));

            const filename = session.getFileName('file_name');
            expect(filename).toContain('session__id');
        });

        it('should return file name with session timestamp', () => {
            const fileSystem = mockFileSystem();
            const timestamp = 123812412;
            const session = new SessionFiles(fileSystem, '.', sessionId('session_id', timestamp));

            const filename = session.getFileName('file_name');
            expect(filename).toContain(timestamp.toString());
        });

        it('should throw after clearing', () => {
            const fileSystem = mockFileSystem();
            const session = new SessionFiles(fileSystem, '.', sessionId('session_id'));
            session.initialize();

            session.clearSession();

            expect(() => session.getFileName('filename')).toThrowError('This session files are cleared.');
        });
    });

    describe('getSessionFiles', () => {
        it('should return files matching session', () => {
            const fileSystem = mockFileSystem();

            const session = new SessionFiles(fileSystem, '.', sessionId('sessionId'));
            session.initialize();

            const files = [session.getFileName('file1'), session.getFileName('file2'), session.getFileName('file3')];
            for (const file of files) {
                fileSystem.writeFileSync(file, '');
            }

            const actual = session.getSessionFiles();
            expect(actual).toEqual(expect.arrayContaining(files));
        });

        it('should not return files not matching session', () => {
            const fileSystem = mockFileSystem();

            const session = new SessionFiles(fileSystem, '.', sessionId('sessionId'));
            session.initialize();

            const session1 = new SessionFiles(fileSystem, '.', sessionId('session1'));
            const session2 = new SessionFiles(fileSystem, '.', sessionId('session2'));
            const session3 = new SessionFiles(fileSystem, '.', sessionId('session3'));

            const files = [session1.getFileName('file1'), session2.getFileName('file2'), session3.getFileName('file3')];
            for (const file of files) {
                fileSystem.writeFileSync(file, '');
            }

            const actual = session.getSessionFiles();
            expect(actual.length).not.toEqual(expect.arrayContaining(files));
        });

        it('should throw after clearing', () => {
            const fileSystem = mockFileSystem();
            const session = new SessionFiles(fileSystem, '.', sessionId('session_id'));
            session.initialize();

            session.clearSession();

            expect(() => session.getSessionFiles()).toThrowError('This session files are cleared.');
        });
    });

    describe('clearSession', () => {
        it('should remove all files matching session', () => {
            const fileSystem = mockFileSystem();
            const session = new SessionFiles(fileSystem, '.', sessionId('sessionId'));
            session.initialize();

            const files = [session.getFileName('file1'), session.getFileName('file2'), session.getFileName('file3')];
            for (const file of files) {
                fileSystem.writeFileSync(file, 'abc');
            }

            session.clearSession();

            for (const file of files) {
                expect(fileSystem.files[file]).toBeUndefined();
            }
        });

        it('should not remove files not matching session', () => {
            const fileSystem = mockFileSystem();
            const session = new SessionFiles(fileSystem, '.', sessionId('sessionId'));
            session.initialize();

            const session1 = new SessionFiles(fileSystem, '.', sessionId('session1'));
            const session2 = new SessionFiles(fileSystem, '.', sessionId('session2'));
            const session3 = new SessionFiles(fileSystem, '.', sessionId('session3'));

            const files = [session1.getFileName('file1'), session2.getFileName('file2'), session3.getFileName('file3')];
            for (const file of files) {
                fileSystem.writeFileSync(file, 'abc');
            }

            session.clearSession();

            for (const file of files) {
                expect(fileSystem.readFileSync(file)).toEqual('abc');
            }
        });

        it('should remove session marker', () => {
            const fileSystem = mockFileSystem();
            const session = new SessionFiles(fileSystem, '.', sessionId('sessionId'));
            session.initialize();

            session.clearSession();

            expect(fileSystem.readFileSync(session.marker)).toBeUndefined();
        });
    });

    describe('locking and unlocking', () => {
        describe('lock', () => {
            it('should return non-empty lock id when lock id is not provided', () => {
                const fileSystem = mockFileSystem();
                const session = new SessionFiles(fileSystem, '.', sessionId('sessionId'));

                session.initialize();
                const lockId = session.lock();

                expect(lockId).toMatch(/.+/);
            });

            it('should return provided lock id when lock id is provided', () => {
                const fileSystem = mockFileSystem();
                const session = new SessionFiles(fileSystem, '.', sessionId('sessionId'));

                session.initialize();
                const lockId = session.lock('lockId');

                expect(lockId).toEqual('lockId');
            });

            it('should return undefined after cleared', () => {
                const fileSystem = mockFileSystem();
                const session = new SessionFiles(fileSystem, '.', sessionId('sessionId'));

                session.initialize();
                session.clearSession();
                const lockId = session.lock();

                expect(lockId).toBeUndefined();
            });

            it('should return undefined when not lockable', () => {
                const fileSystem = mockFileSystem();
                const session = new SessionFiles(fileSystem, '.', sessionId('sessionId'), undefined, false);

                session.initialize();
                session.clearSession();
                const lockId = session.lock();

                expect(lockId).toBeUndefined();
            });
        });

        describe('clearSession', () => {
            it('should not clear files when session is locked', () => {
                const fileSystem = mockFileSystem();
                const session = new SessionFiles(fileSystem, '.', sessionId('sessionId'));
                session.initialize();

                const expected = { ...fileSystem.files };

                session.lock();

                session.clearSession();

                expect(fileSystem.files).toEqual(expected);
            });

            it('should clear files after unlocking when clearSession is called before', () => {
                const fileSystem = mockFileSystem();
                const session = new SessionFiles(fileSystem, '.', sessionId('sessionId'));
                session.initialize();

                const expected = { ...fileSystem.files };

                const lockId = session.lock();
                assert(lockId);

                session.clearSession();
                session.unlock(lockId);

                expect(fileSystem.files).not.toEqual(expected);
            });

            it('should not clear files after unlocking when clearSession is not called before', () => {
                const fileSystem = mockFileSystem();
                const session = new SessionFiles(fileSystem, '.', sessionId('sessionId'));
                session.initialize();

                const expected = { ...fileSystem.files };

                const lockId = session.lock();
                assert(lockId);
                session.unlock(lockId);

                expect(fileSystem.files).toEqual(expected);
            });

            it('should not clear files after unlocking when locked with other locks', () => {
                const fileSystem = mockFileSystem();
                const session = new SessionFiles(fileSystem, '.', sessionId('sessionId'));
                session.initialize();

                const expected = { ...fileSystem.files };

                session.lock();
                const lockId = session.lock();
                assert(lockId);

                session.clearSession();
                session.unlock(lockId);

                expect(fileSystem.files).toEqual(expected);
            });
        });
    });
});
