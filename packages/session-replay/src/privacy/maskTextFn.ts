import { MaskTextFn } from 'rrweb-snapshot';

export interface MaskTextFnOptions {
    readonly maskAllText: boolean;
    readonly maskTextSelector?: string;
    readonly unmaskTextSelector?: string;
    readonly maskTextClass?: string | RegExp;
    readonly unmaskTextClass?: string | RegExp;
    readonly maskTextFn?: MaskTextFn;
}

function maskCharacters(text: string) {
    return text.replace(/[\S]/g, '*');
}

function testSelector(element: HTMLElement, selector?: string) {
    if (!selector) {
        return false;
    }

    return element.matches(selector);
}

function testClass(element: HTMLElement, expr?: string | RegExp) {
    if (!expr) {
        return false;
    }

    const test = typeof expr === 'string' ? (v: string) => v === expr : (v: string) => expr.test(v);
    for (const c of element.classList) {
        if (test(c)) {
            return true;
        }
    }
    return false;
}

/**
 * Tests if element should be masked or not.
 *
 * Prefers masking elements, i.e. to be unmasked, the element cannot be matched by mask
 * and has to be matched by unmask.
 */
function testElementPreferMask(element: HTMLElement, options: MaskTextFnOptions) {
    if (testSelector(element, options.maskTextSelector) || testClass(element, options.maskTextClass)) {
        return true;
    }

    if (testSelector(element, options.unmaskTextSelector) || testClass(element, options.unmaskTextClass)) {
        return false;
    }

    return true;
}

/**
 * Tests if element should be masked or not.
 *
 * Prefers unmasking elements, i.e. to be masked, the element cannot be matched by unmask
 * and has to be matched by mask.
 */
function testElementPreferUnmask(element: HTMLElement, options: MaskTextFnOptions) {
    if (testSelector(element, options.unmaskTextSelector) || testClass(element, options.unmaskTextClass)) {
        return false;
    }

    if (testSelector(element, options.maskTextSelector) || testClass(element, options.maskTextClass)) {
        return true;
    }

    return false;
}

export function maskTextFn(options: MaskTextFnOptions): MaskTextFn {
    const maskText = options.maskTextFn ? options.maskTextFn : maskCharacters;

    return function maskTextFn(text, element) {
        if (!element) {
            return options.maskAllText ? maskText(text, element) : text;
        }

        const shouldBeMasked = options.maskAllText
            ? testElementPreferMask(element, options)
            : testElementPreferUnmask(element, options);

        return shouldBeMasked ? maskText(text, element) : text;
    };
}
