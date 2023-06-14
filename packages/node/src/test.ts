import { BacktraceClient } from './index';

const client = BacktraceClient.builder({
    url: 'https://submit.backtrace.io/yolo/d5ea4541c2babfcdf6da55d48ee3dbe98af2567899feba1155be551878423e57/json',
}).build();

(async () => {
    function baz() {
        throw new Error('foo bar baz');
    }
    function bar() {
        baz();
    }

    function foo() {
        bar();
    }

    try {
        foo();
    } catch (err) {
        await client.send(err as Error);
    }
})();
