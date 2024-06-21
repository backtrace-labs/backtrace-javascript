import { MouseInteractions, eventWithTime } from '@rrweb/types';
import { recordOptions } from 'rrweb';
import { MaskInputFn, MaskInputOptions, MaskTextFn } from 'rrweb-snapshot';

export interface BacktraceSessionRecorderSamplingOptions {
    /**
     * Controls whether mouse movement is recorded.
     * @default true
     */
    readonly mousemove?: boolean | number;

    /**
     * Controls specific mouse interactions.
     *
     * Can be one of:
     * * `true` - all mouse interactions will be recorded
     * * `false` - no mouse interactions will be recorded
     * * `{[string]: boolean}` - control specific mouse interactions:
     *     * `MouseUp`
     *     * `MouseDown`
     *     * `Click`
     *     * `ContextMenu`
     *     * `DblClick`
     *     * `Focus`
     *     * `Blur`
     *     * `TouchStart`
     *     * `TouchMove_Departed`
     *     * `TouchEnd`
     *     * `TouchCancel`
     * @default true
     * @example
     * // Record only MouseUp and ContextMenu interactions:
     * mouseInteraction = {
     *   DblClick: false,
     *   Blur: false,
     *   Click: false,
     *   ContextMenu: true,
     *   Focus: false,
     *   MouseDown: false,
     *   MouseUp: true,
     *   TouchCancel: false,
     *   TouchEnd: false,
     *   TouchMove_Departed: false,
     *   TouchStart: false,
     * };
     */
    readonly mouseInteraction?:
        | boolean
        | Partial<Record<keyof typeof MouseInteractions, boolean>>
        | Partial<Record<string, boolean>>;

    /**
     * Interval of scrolling events in milliseconds (i.e. will not capture more than one event every set time).
     * @default undefined
     */
    readonly scroll?: number;

    /**
     * Interval of media events in milliseconds (i.e. will not capture more than one event every set time).
     * @default undefined
     */
    readonly media?: number;

    /**
     * Capture either `all` or `last` input events.
     *
     * When set to `last`, only final input will be captured.
     * @default "all"
     */
    readonly input?: 'all' | 'last';
}

export interface BacktraceSessionReplayPrivacyOptions {
    /**
     * Use a `string` or `RegExp` to configure which elements should be blocked.
     * @default "rr-block"
     */
    readonly blockClass?: string | RegExp;

    /**
     * Use a `string` to configure which selector should be blocked.
     * @default undefined
     */
    readonly blockSelector?: string;

    /**
     * Use a `string` or `RegExp` to configure which elements should be ignored.
     * @default "rr-ignore"
     */
    readonly ignoreClass?: string;

    /**
     * Use a `string` to configure which selector should be ignored.
     * @default undefined
     */
    readonly ignoreSelector?: string;

    /**
     * Array of CSS attributes that should be ignored.
     */
    readonly ignoreCSSAttributes?: string;

    /**
     * Use a `string` or `RegExp` to configure which elements should be masked.
     * @default "rr-mask"
     */
    readonly maskTextClass?: string;

    /**
     * Use a `string` to configure which selector should be masked.
     * @default undefined
     */
    readonly maskTextSelector?: string;

    /**
     * If `true`, will mask all inputs.
     * @default false
     */
    readonly maskAllInputs?: boolean;

    /**
     * Mask specific kinds of input.
     *
     * Can be an object with the following keys:
     * * `color`
     * * `date`
     * * `'datetime-local'`
     * * `email`
     * * `month`
     * * `number`
     * * `range`
     * * `search`
     * * `tel`
     * * `text`
     * * `time`
     * * `url`
     * * `week`
     * * `textarea`
     * * `select`
     * * `password`
     * @default { password: true }
     */
    readonly maskInputOptions?: MaskInputOptions;

    /**
     * Callback to customize input masking.
     * @param text input text to mask
     * @param element input HTML element
     * @returns masked text
     * @default undefined
     * @example
     * // replace text with letter A repeated for the text length if element has class "mask-a"
     * maskInputFn = (text, element) =>
     *   element.classList.contains('mask-a')
     *     ? 'A'.repeat(text.length)
     *     : text;
     */
    readonly maskInputFn?: MaskInputFn;

    /**
     * Callback to customize text masking.
     * @param text text to mask
     * @returns masked text
     * @default undefined
     * @example
     * // replace text with letter A repeated for the text length
     * maskTextFn = (text) => 'A'.repeat(text.length);
     */
    readonly maskTextFn?: MaskTextFn;

    /**
     * Callback to inspect the added event. You must return an event for it to be included.
     *
     * Return `undefined` to skip this event.
     * @param event Event to be added to the report.
     * @returns modified event or `undefined`
     */
    readonly inspect?: (event: eventWithTime) => eventWithTime | undefined;
}

export interface BacktraceSessionRecorderOptions {
    /**
     * Maximum recorded event count to be sent with the report.
     *
     * Set `disableMaxEventCount` to `true` to disable the limit.
     * @default 100
     */
    readonly maxEventCount?: number;

    /**
     * Disables `maxEventCount` limit.
     *
     * @default false
     */
    readonly disableMaxEventCount?: boolean;

    /**
     * Sampling options. Use those to reduce event count or size.
     */
    readonly sampling?: BacktraceSessionRecorderSamplingOptions;

    /**
     * Privacy options. Use those to remove confidendial data.
     */
    readonly privacy?: BacktraceSessionReplayPrivacyOptions;

    /**
     * Options passed to `rrweb.record` function. Refer to `rrweb` documentation for more information.
     */
    readonly advancedOptions?: recordOptions<Event>;
}
