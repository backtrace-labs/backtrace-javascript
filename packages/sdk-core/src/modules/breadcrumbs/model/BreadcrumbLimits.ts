export interface BreadcrumbLimits {
    /**
     * Specifies maximum object depth that are included in breadcrumb attributes.
     */
    maximumAttributesDepth?: number;

    /**
     * Specifies maximum breadcrumb message length.
     * If the size is exceeded, message will be truncated.
     */
    maximumBreadcrumbMessageLength?: number;

    /**
     * Specifies maximum single breadcrumb size in bytes.
     * If the size is exceeded, attributes will be removed.
     */
    maximumBreadcrumbSize?: number;

    /**
     * Specifies maximum breadcrumbs size in bytes.
     * If the size is exceeded, oldest breadcrumbs will be skipped.
     */
    maximumBreadcrumbsSize?: number;
}
