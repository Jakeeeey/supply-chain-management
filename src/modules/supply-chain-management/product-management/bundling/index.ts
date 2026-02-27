/**
 * Bundling Module — Public API
 *
 * This module handles the full lifecycle of product bundles:
 * Draft → For Approval → Approved (Masterlist).
 *
 * Cross-module dependency: Reads from the `products` collection
 * (Product Management / SKU module) for available products.
 */
export { default as BundleCreationPage } from "./bundle-creation/BundleCreationPage";
export { default as BundleApprovalPage } from "./bundle-approval/BundleApprovalPage";
export { default as BundleMasterlistPage } from "./bundle-masterlist/BundleMasterlistPage";
