export type CompensationRecord = {
  collection: string;
  id: number | string;
};

type CompensationAction = {
  label: string;
  rollback: () => Promise<void>;
  record?: CompensationRecord;
};

type StockRollbackGroup = {
  restore: CompensationAction;
  dependents: CompensationAction[];
};

export class CompensationFailure extends Error {
  readonly originalError: unknown;
  readonly rollbackErrors: Array<{ label: string; error: string }>;
  readonly preservedActions: string[];
  readonly preservedRecords: CompensationRecord[];

  constructor(
    originalError: unknown,
    rollbackErrors: Array<{ label: string; error: string }>,
    preservedActions: string[],
    preservedRecords: CompensationRecord[],
  ) {
    super(originalError instanceof Error ? originalError.message : "Inventory write failed");
    this.name = "CompensationFailure";
    this.originalError = originalError;
    this.rollbackErrors = rollbackErrors;
    this.preservedActions = preservedActions;
    this.preservedRecords = preservedRecords;
  }
}

export class CompensationStack {
  private readonly globalActions: CompensationAction[] = [];
  private readonly stockGroups: StockRollbackGroup[] = [];
  private readonly createdStockRecords: CompensationRecord[] = [];
  private activeStockGroup: StockRollbackGroup | null = null;

  add(label: string, rollback: () => Promise<void>, record?: CompensationRecord) {
    const action = { label, rollback, record };
    if (this.activeStockGroup) {
      this.activeStockGroup.dependents.push(action);
      return;
    }
    this.globalActions.push(action);
  }

  beginStockRollback(label: string, rollback: () => Promise<void>, record: CompensationRecord) {
    const group: StockRollbackGroup = {
      restore: { label, rollback, record },
      dependents: [],
    };
    this.stockGroups.push(group);
    this.activeStockGroup = group;
  }

  recordCreatedStock(record: CompensationRecord) {
    this.createdStockRecords.push(record);
  }

  async compensate(error: unknown): Promise<never> {
    const rollbackErrors: Array<{ label: string; error: string }> = [];
    const preservedActions: string[] = [];
    const preservedRecords: CompensationRecord[] = [];
    let groupCleanupFailed = false;

    for (const group of [...this.stockGroups].reverse()) {
      try {
        await group.restore.rollback();
      } catch (rollbackError) {
        groupCleanupFailed = true;
        rollbackErrors.push(toRollbackError(group.restore.label, rollbackError));
        preserve(group.restore, preservedActions, preservedRecords);
        for (const dependent of group.dependents) {
          preserve(dependent, preservedActions, preservedRecords);
        }
        continue;
      }

      for (const dependent of [...group.dependents].reverse()) {
        try {
          await dependent.rollback();
        } catch (rollbackError) {
          groupCleanupFailed = true;
          rollbackErrors.push(toRollbackError(dependent.label, rollbackError));
          preserve(dependent, preservedActions, preservedRecords);
        }
      }
    }

    const retainedStockBlocksGlobalCleanup = this.createdStockRecords.length > 0 && this.globalActions.length > 0;
    if (groupCleanupFailed || retainedStockBlocksGlobalCleanup) {
      for (const action of this.globalActions) {
        preserve(action, preservedActions, preservedRecords);
      }
      preservedRecords.push(...this.createdStockRecords);
    } else {
      for (const action of [...this.globalActions].reverse()) {
        try {
          await action.rollback();
        } catch (rollbackError) {
          rollbackErrors.push(toRollbackError(action.label, rollbackError));
          preserve(action, preservedActions, preservedRecords);
        }
      }
    }

    if (!rollbackErrors.length && !retainedStockBlocksGlobalCleanup) throw error;

    throw new CompensationFailure(
      error,
      rollbackErrors,
      [...new Set(preservedActions)],
      uniqueRecords(preservedRecords),
    );
  }
}

function preserve(
  action: CompensationAction,
  actions: string[],
  records: CompensationRecord[],
) {
  actions.push(action.label);
  if (action.record) records.push(action.record);
}

function toRollbackError(label: string, error: unknown) {
  return {
    label,
    error: error instanceof Error ? error.message : String(error),
  };
}

function uniqueRecords(records: CompensationRecord[]) {
  const seen = new Set<string>();
  return records.filter((record) => {
    const key = `${record.collection}:${record.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
