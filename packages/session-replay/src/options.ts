import { MouseInteractions, eventWithTime } from '@rrweb/types';
import { recordOptions } from 'rrweb';
import { MaskInputFn, MaskInputOptions, MaskTextFn } from 'rrweb-snapshot';

export interface BacktraceSessionRecorderSamplingOptions {
    /**
     * Controls whether mouse movement is recorded,
     * or the interval of mouse movement events in milliseconds
     * (i.e. will not capture more than one event every set time).
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
     * Interval of scrolling events in milliseconds
     * (i.e. will not capture more than one event every set time).
     * @default undefined
     */
    readonly scroll?: number;

    /**
     * Interval of media events in milliseconds
     * (i.e. will not capture more than one event every set time).
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
     * Blocks elements with this class.
     * @default "bt-block"
     */
    readonly blockClass?: string | RegExp;

    /**
     * Blocks elements matching this selector.
     * @default undefined
     */
    readonly blockSelector?: string;

    /**
     * Ignores elements with this class.
     * @default "bt-ignore"
     */
    readonly ignoreClass?: string;

    /**
     * Ignores elements matching this selector.
     * @default undefined
     */
    readonly ignoreSelector?: string;

    /**
     * Set of CSS attributes that should be ignored.
     */
    readonly ignoreCSSAttributes?: Set<string> | string[];

    /**
     * Masks elements with this class.
     * @default "bt-mask"
     */
    readonly maskTextClass?: string | RegExp;

    /**
     * Unmasks elements with this class.
     * @default "bt-unmask"
     */
    readonly unmaskTextClass?: string | RegExp;

    /**
     * Masks elements matching this selector.
     * @default undefined
     */
    readonly maskTextSelector?: string;

    /**
     * Unmasks elements matching this selector.
     * @default undefined
     */
    readonly unmaskTextSelector?: string;

    /**
     * If `true`, will mask all inputs.
     * @default true
     */
    readonly maskAllInputs?: boolean;

    /**
     * If `true`, will mask all text.
     * @default true
     */
    readonly maskAllText?: boolean;

    /**
     * Mask specific kinds of inputs.
     *
     * Can be an object with the following keys:
     * * `color`
     * * `date`
     * * `datetime-local`
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
     * // replace text with letter A repeated for the text length
     * // if element has class "mask-a"
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
     * Callback to inspect the added event.
     * You must return an event for it to be included.
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
     * Options passed to `rrweb.record` function.
     * Refer to `rrweb` documentation for more information.
     */
    readonly advancedOptions?: recordOptions<Event>;
}
