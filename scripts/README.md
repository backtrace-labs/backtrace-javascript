# Scripts

This doc covers helper scripts that are available in this repo.

# `syncVersions.ts`

Synchronizes dependency versions. Useful for making sure that e.g. node is using the correct sdk-core version.

## Usage

```
syncVersions.ts [...package.json paths]
```

### Examples

-   Sync versions of all packages

    ```
    syncVersions.ts
    ```

-   Sync versions of specific packages
    ```
    syncVersions.ts ./path/to/package.json ./path/to/different/package.json
    ```

# `gitRelease.ts`

Creates a git release for a package by doing the following:

1. Update `package.json` with the new version,
1. Run `npm install` to generate a valid `package-lock.json` file,
1. Stage `package.json` and `package-lock.json`,
1. Create branch `<package name>/<new version>` and checkout to it,
1. Commit with message `<package name>: version <new version>`,
1. Push to `<package name>/<new version>`.

If something goes wrong on any of the steps, the script will try to rollback the changes.

## Usage

```
gitRelease.ts [opts] <package.json path> <release|version> [identifier]
```

### Options:

-   `release` - can be one of `major`, `premajor`, `minor`, `preminor`, `patch`, `prepatch`, `prerelease`
-   `version` - semantic version
-   `identifier` - identifier for preleases, e.g. `alpha` or `beta`

-   `--dry-run` - does not do anything, just prints the output
-   `--no-add` - exits before staging any files
-   `--no-checkout` - exits before creating and checkouting to the branch
-   `--no-commit` - exits before creating a commit
-   `--no-push` - exits before pushing

### Examples:

-   Make a minor release

    ```
    gitRelease.ts ./path/to/package.json minor
    ```

-   Make a beta prerelase without pushing

    ```
    gitRelease.ts ./path/to/package.json prerelase beta --no-push
    ```

-   Check what happens with making a release with version 1.2.3
    ```
    gitRelease.ts ./path/to/package.json 1.2.3 --dry-run
    ```

# `release.ts`

Creates a tagged release and publishes it to npm:

1. Create tag `<package name>/<version>`,
2. Push tag to remote,
3. Run `npm publish`.

The version is read from the `package.json` file. If something goes wrong on any of the steps, the script will try to
rollback the changes.

## Usage

```
release.ts [opts] <package.json path> [commit hash]
```

### Options

-   `commit hash` - if specified, tag will be added on this hash instead of `HEAD`. **Warning: checkout is not performed
    currently**

-   `--dry-run` - does not do anything, just prints the output
-   `--no-tag` - does not add and push a tag
-   `--no-push-tag` - does not push the tag
-   `--no-publish` - does not publish to npm

### Examples

-   Make a release of package

    ```
    release.ts ./path/to/package.json
    ```

-   Make a release of package without publishing to npm and add tag on hash `b19f45885a21ba7235c32aae62c4c73199f40ca6`

    ```
    release.ts ./path/to/package.json b19f45885a21ba7235c32aae62c4c73199f40ca6 --no-publish
    ```
