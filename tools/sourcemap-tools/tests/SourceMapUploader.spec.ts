import { fail } from 'assert';
import crypto from 'crypto';
import fs from 'fs';
import nock from 'nock';
import path from 'path';
import { SOURCEMAP_DEBUG_ID_KEY } from '../src/DebugIdGenerator';
import { DEBUG_ID_QUERY, SourceMapUploader } from '../src/SourceMapUploader';

describe('SourceMapUploader', () => {
    function getSourcemap(debugId?: string | null) {
        const sourcemap: Record<string, unknown> = {
            version: 3,
        };

        if (debugId !== null) {
            sourcemap[SOURCEMAP_DEBUG_ID_KEY] = debugId ?? crypto.randomUUID();
        }

        return sourcemap;
    }

    it('should POST to https URL', async () => {
        const sourcemap = getSourcemap();
        const uploadUrl = new URL(`https://upload-test/`);

        const scope = nock(uploadUrl.origin).post('/').query(true).reply(200, { response: 'ok', _rxid: 'rxid' });

        const uploader = new SourceMapUploader(uploadUrl);
        await uploader.uploadContent(sourcemap);

        scope.done();
    });

    it('should POST to http URL', async () => {
        const sourcemap = getSourcemap();
        const uploadUrl = new URL(`http://upload-test/`);

        const scope = nock(uploadUrl.origin).post('/').query(true).reply(200, { response: 'ok', _rxid: 'rxid' });

        const uploader = new SourceMapUploader(uploadUrl);
        await uploader.uploadContent(sourcemap);

        scope.done();
    });

    it('should upload object sourcemap as POST body', async () => {
        const sourcemap = getSourcemap();
        const uploadUrl = new URL(`http://upload-test/`);

        const scope = nock(uploadUrl.origin)
            .post('/', JSON.stringify(sourcemap))
            .query(true)
            .reply(200, { response: 'ok', _rxid: 'rxid' });

        const uploader = new SourceMapUploader(uploadUrl);
        await uploader.uploadContent(sourcemap);

        scope.done();
    });

    it('should upload string sourcemap as POST body', async () => {
        const sourcemap = JSON.stringify(getSourcemap());
        const uploadUrl = new URL(`http://upload-test/`);

        const scope = nock(uploadUrl.origin)
            .post('/', sourcemap)
            .query(true)
            .reply(200, { response: 'ok', _rxid: 'rxid' });

        const uploader = new SourceMapUploader(uploadUrl);
        await uploader.uploadContent(sourcemap);

        scope.done();
    });

    it('should upload file sourcemap as POST body', async () => {
        const sourcemapPath = path.join(__dirname, './testFiles/sourcemap.js.map');
        const sourcemap = await fs.promises.readFile(sourcemapPath, 'utf-8');
        const uploadUrl = new URL(`http://upload-test/`);

        const scope = nock(uploadUrl.origin)
            .post('/', sourcemap)
            .query(true)
            .reply(200, { response: 'ok', _rxid: 'rxid' });

        const uploader = new SourceMapUploader(uploadUrl);
        await uploader.upload(sourcemapPath);

        scope.done();
    });

    it('should upload stream sourcemap as POST body', async () => {
        const sourcemapPath = path.join(__dirname, './testFiles/sourcemap.js.map');
        const sourcemap = await fs.promises.readFile(sourcemapPath, 'utf-8');
        const stream = fs.createReadStream(sourcemapPath);
        const uploadUrl = new URL(`http://upload-test/`);

        const scope = nock(uploadUrl.origin)
            .post('/', sourcemap)
            .query(true)
            .reply(200, { response: 'ok', _rxid: 'rxid' });

        const uploader = new SourceMapUploader(uploadUrl);
        await uploader.upload(stream);

        scope.done();
    });

    it('should return rxid in response', async () => {
        const sourcemap = getSourcemap();
        const uploadUrl = new URL(`http://upload-test/`);
        const expected = crypto.randomUUID();

        const scope = nock(uploadUrl.origin).post('/').query(true).reply(200, { response: 'ok', _rxid: expected });

        const uploader = new SourceMapUploader(uploadUrl);
        const response = await uploader.uploadContent(sourcemap);

        scope.done();

        expect(response.rxid).toEqual(expected);
    });

    it('should return debugId in response', async () => {
        const expected = crypto.randomUUID();
        const sourcemap = getSourcemap(expected);
        const uploadUrl = new URL(`http://upload-test/`);

        const scope = nock(uploadUrl.origin).post('/').query(true).reply(200, { response: 'ok', _rxid: 'rxid' });

        const uploader = new SourceMapUploader(uploadUrl);
        const response = await uploader.uploadContent(sourcemap);

        scope.done();

        expect(response.debugId).toEqual(expected);
    });

    it('should use passed debugId in query', async () => {
        const expected = crypto.randomUUID();
        const sourcemap = getSourcemap();
        const uploadUrl = new URL(`http://upload-test/?${DEBUG_ID_QUERY}=${expected}`);

        const scope = nock(uploadUrl.origin)
            .post('/')
            .query({ [DEBUG_ID_QUERY]: expected })
            .reply(200, { response: 'ok', _rxid: 'rxid' });

        const uploader = new SourceMapUploader(uploadUrl);
        await uploader.uploadContent(sourcemap);

        scope.done();
    });

    it('should use debugId from sourcemap in query', async () => {
        const expected = crypto.randomUUID();
        const sourcemap = getSourcemap(expected);
        const uploadUrl = new URL(`http://upload-test/`);

        const scope = nock(uploadUrl.origin)
            .post('/')
            .query({ [DEBUG_ID_QUERY]: expected })
            .reply(200, { response: 'ok', _rxid: 'rxid' });

        const uploader = new SourceMapUploader(uploadUrl);
        await uploader.uploadContent(sourcemap);

        scope.done();
    });

    it('should generate debugId randomly when it is not passed anywhere', async () => {
        const sourcemap = getSourcemap();
        const uploadUrl = new URL(`http://upload-test/`);

        const scope = nock(uploadUrl.origin)
            .post('/')
            .query({ [DEBUG_ID_QUERY]: /[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/ })
            .reply(200, { response: 'ok', _rxid: 'rxid' });

        const uploader = new SourceMapUploader(uploadUrl);
        await uploader.uploadContent(sourcemap);

        scope.done();
    });

    it('should throw on non 2xx HTTP response', async () => {
        const sourcemap = getSourcemap();
        const uploadUrl = new URL(`https://upload-test/`);

        const scope = nock(uploadUrl.origin).post('/').query(true).reply(400);

        const uploader = new SourceMapUploader(uploadUrl);
        await expect(() => uploader.uploadContent(sourcemap)).rejects.toThrow();

        scope.done();
    });

    it('should throw on non 2xx HTTP response with response data', async () => {
        const expected = 'RESPONSE FROM SERVER';
        const sourcemap = getSourcemap();
        const uploadUrl = new URL(`https://upload-test/`);

        const scope = nock(uploadUrl.origin).post('/').query(true).reply(400, expected);

        const uploader = new SourceMapUploader(uploadUrl);
        try {
            await uploader.uploadContent(sourcemap);
            fail();
        } catch (err) {
            expect((err as Error).message).toContain(expected);
        }

        scope.done();
    });

    it('should throw on response with response not equal to "ok"', async () => {
        const sourcemap = getSourcemap();
        const uploadUrl = new URL(`https://upload-test/`);

        const scope = nock(uploadUrl.origin).post('/').query(true).reply(200, { response: 'not-ok', _rxid: 'rxid' });
        const uploader = new SourceMapUploader(uploadUrl);
        await expect(() => uploader.uploadContent(sourcemap)).rejects.toThrow();

        scope.done();
    });

    it('should throw on response with response not equal to "ok" with response data', async () => {
        const expected = JSON.stringify({ response: 'not-ok', _rxid: 'rxid' });
        const sourcemap = getSourcemap();
        const uploadUrl = new URL(`https://upload-test/`);

        const scope = nock(uploadUrl.origin).post('/').query(true).reply(200, expected);
        const uploader = new SourceMapUploader(uploadUrl);
        try {
            await uploader.uploadContent(sourcemap);
            fail();
        } catch (err) {
            expect((err as Error).message).toContain(expected);
        }

        scope.done();
    });

    it('should throw on sourcemap without version', async () => {
        const sourcemap = getSourcemap();
        delete sourcemap['version'];

        const uploader = new SourceMapUploader(new URL(`https://upload-test/`));
        await expect(() => uploader.uploadContent(sourcemap)).rejects.toThrow();
    });

    it('should throw if passed sourcemap is not an object', async () => {
        const sourcemap = getSourcemap();
        delete sourcemap['version'];

        const uploader = new SourceMapUploader(new URL(`https://upload-test/`));
        await expect(() => uploader.uploadContent('123')).rejects.toThrow();
    });

    it('should throw if passed sourcemap is null', async () => {
        const sourcemap = getSourcemap();
        delete sourcemap['version'];

        const uploader = new SourceMapUploader(new URL(`https://upload-test/`));
        await expect(() => uploader.uploadContent('null')).rejects.toThrow();
    });
});
