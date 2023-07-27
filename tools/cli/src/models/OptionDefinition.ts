import { OptionDefinition } from 'command-line-usage';

export interface ExtendedOptionDefinition<N extends string = string> extends OptionDefinition {
    readonly name: N;
    readonly global?: boolean;
}
