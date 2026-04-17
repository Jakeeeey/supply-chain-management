/**
 * SKU Service — Barrel re-exporter.
 *
 * Composes the four focused sub-services into a single `skuService` object,
 * preserving the exact same API that all consumers depend on. No import paths
 * in SKUCreationPage, SKUApprovalPage, or API routes need to change.
 *
 * Sub-service responsibilities:
 *   skuQueryService     — reads (fetchApproved, fetchDrafts, fetchMasterData, checkDuplicateName)
 *   skuLifecycleService — draft writes (createDraft, updateDraft, submitForApproval, rejectDraft, deleteDraft)
 *   skuApprovalService  — approval workflow (approveDraft + internal helpers)
 *   skuStatusService    — product status toggle (updateProductStatus, bulkUpdateProductStatus)
 */
import { skuApprovalService } from "./sku-approval";
import { generateSKUCode } from "./sku-generator";
import { skuLifecycleService } from "./sku-lifecycle";
import { skuQueryService } from "./sku-query";
import { skuStatusService } from "./sku-status";

export const skuService = {
  // ─── Queries ──────────────────────────────────────────────────────────────
  fetchApproved: skuQueryService.fetchApproved.bind(skuQueryService),
  fetchDrafts: skuQueryService.fetchDrafts.bind(skuQueryService),
  fetchMasterData: skuQueryService.fetchMasterData.bind(skuQueryService),
  checkDuplicateName: skuQueryService.checkDuplicateName.bind(skuQueryService),

  // ─── Draft Lifecycle ───────────────────────────────────────────────────────
  createDraft: skuLifecycleService.createDraft.bind(skuLifecycleService),
  updateDraft: skuLifecycleService.updateDraft.bind(skuLifecycleService),
  submitForApproval:
    skuLifecycleService.submitForApproval.bind(skuLifecycleService),
  rejectDraft: skuLifecycleService.rejectDraft.bind(skuLifecycleService),
  deleteDraft: skuLifecycleService.deleteDraft.bind(skuLifecycleService),
  uploadImage: skuLifecycleService.uploadImage.bind(skuLifecycleService),

  // ─── Approval Workflow ─────────────────────────────────────────────────────
  approveDraft: skuApprovalService.approveDraft.bind(skuApprovalService),
  resolveParentMasterId: skuApprovalService.resolveParentMasterId,
  upsertMasterProduct: skuApprovalService.upsertMasterProduct,
  syncSupplierLink: skuApprovalService.syncSupplierLink,
  handleOrphanAdoption: skuApprovalService.handleOrphanAdoption,
  cleanupDraft: skuApprovalService.cleanupDraft,

  // ─── Status Toggle ─────────────────────────────────────────────────────────
  updateProductStatus:
    skuStatusService.updateProductStatus.bind(skuStatusService),
  bulkUpdateProductStatus:
    skuStatusService.bulkUpdateProductStatus.bind(skuStatusService),

  // ─── Code Generation (pass-through) ───────────────────────────────────────
  generateSKUCode,
};
