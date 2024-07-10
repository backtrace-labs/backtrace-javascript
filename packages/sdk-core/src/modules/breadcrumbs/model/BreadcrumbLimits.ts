export interface BreadcrumbLimits {
    /**
     * Specifies maximum number of breadcrumbs stored by the library.
     *
     * @default 100
     */
    readonly maximumBreadcrumbs?: number;

    /**
     * Specifies maximum object depth that are included in breadcrumb attributes.
     *
     * @default 2
     */
    readonly maximumAttributesDepth?: number;

    /**
     * Specifies maximum breadcrumb message length.
     * If the size is exceeded, message will be truncated.
     *
     * @default 255
     */
    readonly maximumBreadcrumbMessageLength?: number;

    /**
     * Specifies maximum single breadcrumb size in bytes.
     * If the size is exceeded, the breadcrumb will be skipped.
     *
     * @default 65536 // 64kB
     */
    readonly maximumBreadcrumbSize?: number;

    /**
     * Specifies maximum breadcrumbs size in bytes.
     * If the size is exceeded, oldest breadcrumbs will be skipped.
     *
     * @default 1048576 // 1MB
     */
    readonly maximumTotalBreadcrumbsSize?: number;
}
