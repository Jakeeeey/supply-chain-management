export function documentStatusLabel(isCommitted: boolean, isCancelled:
boolean): string {
    if (isCancelled) return "Cancelled";
    if (isCommitted) return "Committed";
    return "Draft";
}
