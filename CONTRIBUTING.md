# Contributing to Backtrace Javascript SDK

First off, thanks for taking the time to contribute! ❤️

All types of contributions are encouraged and valued. See the [Table of Contents](#table-of-contents) for different ways to help and details about how this project handles them. Please make sure to read the relevant section before making your contribution. It will make it a lot easier for us maintainers and smooth out the experience for all involved. The community looks forward to your contributions. 🎉

> And if you like the project, but just don't have time to contribute, that's fine. There are other easy ways to support the project and show your appreciation, which we would also be very happy about:
>
> -   Star the project
> -   Refer this project in your project's readme
> -   Mention the project at local meetups and tell your friends/colleagues

## Table of Contents

-   [Code of Conduct](#code-of-conduct)
-   [I Have a Question](#i-have-a-question)
-   [I Want To Contribute](#i-want-to-contribute)
    -   [Your First Code Contribution](#your-first-code-contribution)
-   [Styleguides](#styleguides)
    -   [Commit Messages](#commit-messages)

## Code of Conduct

This project and everyone participating in it is governed by the
[Sauce Labs Code of Conduct](https://docs.saucelabs.com/contributing/code-of-conduct/).
By participating, you are expected to uphold this code. Please report unacceptable behavior
to opensource@saucelabs.com.

## I Have a Question

If you have a question about setting up the SDK or using the tooling, or you believe that you found a bug,
please contact us at support@backtrace.io!

## I Want To Contribute

> ### Legal Notice
>
> When contributing to this project, you must agree that you have authored 100% of the content, that you have the necessary rights to the content and that the content you contribute may be provided under the project license.

### Your First Code Contribution

-   Make sure to use `npm` version that support workspaces
-   Add unit tests/smoketests for your change
-   Run an example with your code change and check the basic functionality
-   If this is a public API change:
    -   try to not introduce breaking changes if possible
    -   update the documentation
-   Please follow our [styleguides](#styleguides)

## Styleguides

### Commit Messages

Commit message should be short and descriptive of the change. They must also include a valid prefix containing the name of the changed package(s), e.g. `sdk-core` or `node`, separated by commas. If the change is specific to a file, you may use its name in the message.

It is best to keep separate package changes in separate commits, if possible.

Valid examples of commits:

-   `sdk-core: fix invalid ID in breadcrumb generation`
-   `node: add CPU type to MachineAttributeProvider.ts`
-   `sdk-core, node: add FileSystem.doesExist`

Commit messages to avoid:

-   `sdk-core: fix error` (ambiguous message - what was the error?)
-   `change error message in Node on invalid breadcrumb` (missing package prefix)
