function testString(regex: RegExp) {
    return function test(str: string) {
        return regex.test(str);
    };
}

export const matchSourceExtension = testString(/\.(c|m)?jsx?$/);
export const matchSourceMapExtension = testString(/\.(c|m)?jsx?\.map$/);
