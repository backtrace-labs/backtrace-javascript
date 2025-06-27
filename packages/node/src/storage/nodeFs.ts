import nodeFs from 'fs';

/**
 * All used methods of the Node file system.
 */
export type NodeFs = Pick<
    typeof nodeFs,
    | 'mkdirSync'
    | 'existsSync'
    | 'writeFileSync'
    | 'unlinkSync'
    | 'readFileSync'
    | 'statSync'
    | 'readdirSync'
    | 'createReadStream'
    | 'createWriteStream'
> & {
    readonly promises: Pick<(typeof nodeFs)['promises'], 'readdir' | 'stat' | 'writeFile' | 'unlink' | 'readFile'>;
};
