export interface BreadcrumbLimits {
    /**
     * Specifies maximum number of breadcrumbs stored by the library. By default, only 100 breadcrumbs
     * will be stored.
     */
    readonly maximumBreadcrumbs?: number;

    /**
     * Specifies maximum object depth that are included in breadcrumb attributes.
     */
    readonly maximumAttributesDepth?: number;

    /**
     * Specifies maximum breadcrumb message length.
     * If the size is exceeded, message will be truncated.
     */
    readonly maximumBreadcrumbMessageLength?: number;

    /**
     * Specifies maximum single breadcrumb size in bytes.
     * If the size is exceeded, attributes will be removed.
     */
    readonly maximumBreadcrumbSize?: number;

    /**
     * Specifies maximum breadcrumbs size in bytes.
     * If the size is exceeded, oldest breadcrumbs will be skipped.
     */
    readonly maximumBreadcrumbsSize?: number;
}
