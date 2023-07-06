import assert from 'assert';
import crypto from 'crypto';
import fs from 'fs';
import nock from 'nock';
import path from 'path';
import { Readable } from 'stream';
import { SymbolUploader } from '../src/SymbolUploader';

describe('SymbolUploader', () => {
    function getReadable() {
        return Readable.from(crypto.randomBytes(16));
    }

    it('should POST to https URL', async () => {
        const uploadData = getReadable();
        const uploadUrl = new URL(`https://upload-test/`);

        const scope = nock(uploadUrl.origin).post('/').query(true).reply(200, { response: 'ok', _rxid: 'rxid' });

        const uploader = new SymbolUploader(uploadUrl);
        await uploader.uploadSymbol(uploadData);

        scope.done();
    });

    it('should POST to http URL', async () => {
        const uploadData = getReadable();
        const uploadUrl = new URL(`http://upload-test/`);

        const scope = nock(uploadUrl.origin).post('/').query(true).reply(200, { response: 'ok', _rxid: 'rxid' });

        const uploader = new SymbolUploader(uploadUrl);
        await uploader.uploadSymbol(uploadData);

        scope.done();
    });

    it('should upload file as POST body', async () => {
        const buffer = crypto.randomBytes(16);
        const uploadData = Readable.from(buffer);

        const uploadUrl = new URL(`http://upload-test/`);

        const scope = nock(uploadUrl.origin)
            .post('/', buffer)
            .query(true)
            .reply(200, { response: 'ok', _rxid: 'rxid' });

        const uploader = new SymbolUploader(uploadUrl);
        await uploader.uploadSymbol(uploadData);

        scope.done();
    });

    it('should upload stream as POST body', async () => {
        const sourcemapPath = path.join(__dirname, './testFiles/source.js.map');
        const uploadData = await fs.promises.readFile(sourcemapPath, 'utf-8');
        const stream = fs.createReadStream(sourcemapPath);
        const uploadUrl = new URL(`http://upload-test/`);

        const scope = nock(uploadUrl.origin)
            .post('/', uploadData)
            .query(true)
            .reply(200, { response: 'ok', _rxid: 'rxid' });

        const uploader = new SymbolUploader(uploadUrl);
        await uploader.uploadSymbol(stream);

        scope.done();
    });

    it('should return rxid in response', async () => {
        const uploadData = getReadable();
        const uploadUrl = new URL(`http://upload-test/`);
        const expected = crypto.randomUUID();

        const scope = nock(uploadUrl.origin).post('/').query(true).reply(200, { response: 'ok', _rxid: expected });

        const uploader = new SymbolUploader(uploadUrl);
        const result = await uploader.uploadSymbol(uploadData);
        assert(result.isOk());

        scope.done();

        expect(result.data.rxid).toEqual(expected);
    });

    it('should return Err on non 2xx HTTP response', async () => {
        const uploadData = getReadable();
        const uploadUrl = new URL(`https://upload-test/`);

        const scope = nock(uploadUrl.origin).post('/').query(true).reply(400);

        const uploader = new SymbolUploader(uploadUrl);
        const result = await uploader.uploadSymbol(uploadData);
        expect(result.isErr()).toEqual(true);

        scope.done();
    });

    it('should return Err on non 2xx HTTP response with response data', async () => {
        const expected = 'RESPONSE FROM SERVER';
        const uploadData = getReadable();
        const uploadUrl = new URL(`https://upload-test/`);

        const scope = nock(uploadUrl.origin).post('/').query(true).reply(400, expected);

        const uploader = new SymbolUploader(uploadUrl);
        const result = await uploader.uploadSymbol(uploadData);

        assert(result.isErr());
        expect(result.data).toContain(expected);

        scope.done();
    });

    it('should return Err on response with response not equal to "ok"', async () => {
        const uploadData = getReadable();
        const uploadUrl = new URL(`https://upload-test/`);

        const scope = nock(uploadUrl.origin).post('/').query(true).reply(200, { response: 'not-ok', _rxid: 'rxid' });
        const uploader = new SymbolUploader(uploadUrl);
        const result = await uploader.uploadSymbol(uploadData);

        expect(result.isErr()).toEqual(true);

        scope.done();
    });

    it('should return Err on response with response not equal to "ok" with response data', async () => {
        const expected = JSON.stringify({ response: 'not-ok', _rxid: 'rxid' });
        const uploadData = getReadable();
        const uploadUrl = new URL(`https://upload-test/`);

        const scope = nock(uploadUrl.origin).post('/').query(true).reply(200, expected);
        const uploader = new SymbolUploader(uploadUrl);

        const result = await uploader.uploadSymbol(uploadData);

        assert(result.isErr());
        expect(result.data).toContain(expected);

        scope.done();
    });
});
