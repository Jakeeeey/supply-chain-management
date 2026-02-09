"use client";

import { useState, useEffect } from "react";
import { Plus, RefreshCcw, Database, FileClock, ShieldCheck } from "lucide-react";
import { useSKUs } from "@/modules/supply-chain-management/product-management/sku-creation/hooks/useSKUs";
import { SKUTable } from "@/modules/supply-chain-management/product-management/sku-creation/components/data-table/SKUTable";
import { SKUModal } from "@/modules/supply-chain-management/product-management/sku-creation/components/modals/SKUModal";
import { Button } from "@/components/ui/button";
import { SKU } from "@/modules/supply-chain-management/product-management/sku-creation/types/sku.schema";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SKUCreationModule() {
  const { 
    approvedData,
    approvedTotal,
    approvedPage,
    setApprovedPage,
    approvedLimit,
    setApprovedLimit,
    
    draftData,
    draftsTotal,
    draftsPage,
    setDraftsPage,
    draftsLimit,
    setDraftsLimit,
    
    masterData,
    isLoading, 
    error, 
    refresh, 
    createDraft, 
    updateDraft, 
    submitForApproval,
    approveSKU,
    deleteDraft,
    checkDuplicate,
  } = useSKUs();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSKU, setSelectedSKU] = useState<SKU | undefined>();
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleAdd = () => {
    setSelectedSKU(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (sku: SKU) => {
    setSelectedSKU(sku);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this record? This cannot be undone.")) {
      try {
        await deleteDraft(id);
        toast.success("Record deleted successfully");
      } catch (err: any) {
        toast.error("Deletion failed: " + err.message);
      }
    }
  };

  const handleSubmitForm = async (sku: SKU) => {
    setSaving(true);
    try {
      const id = (selectedSKU as any)?.id || (selectedSKU as any)?.product_id;
      
      // Duplicate Check (Business Logic 3.2)
      if (!id) { // Only check for new creations
         const isDuplicate = await checkDuplicate(sku.product_name);
         if (isDuplicate) {
           const proceed = confirm("A similar product name already exists in the system. Are you sure you want to create this SKU?");
           if (!proceed) {
             setSaving(false);
             return;
           }
         }
      }

      if (id) {
        await updateDraft(id, sku);
        toast.success("Record updated successfully");
      } else {
        await createDraft(sku);
        toast.success("Draft created successfully");
      }
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error("Operation failed: " + err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitToManager = async (id: number) => {
    try {
      await submitForApproval(id);
      toast.success("Submitted for manager review");
    } catch (err: any) {
      toast.error("Submission failed: " + err.message);
    }
  };

  const handleApproveAndActivate = async (id: number) => {
    try {
      await approveSKU(id);
      toast.success("SKU Activated and Master Record Created");
    } catch (err: any) {
      toast.error("Activation failed: " + err.message);
    }
  };

  if (!mounted) {
    return (
      <div className="w-full max-w-[1400px] mx-auto space-y-8 py-4 px-2 sm:px-0">
        <div className="h-[200px] w-full bg-muted/20 animate-pulse rounded-2xl" />
        <div className="h-[400px] w-full bg-muted/10 animate-pulse rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 bg-card border rounded-2xl shadow-xl p-12 text-center max-w-2xl mx-auto mt-20">
        <div className="bg-destructive/10 p-5 rounded-full ring-8 ring-destructive/5">
          <RefreshCcw className="h-10 w-10 text-destructive animate-spin-once" />
        </div>
        <div>
          <h3 className="text-2xl font-black text-foreground tracking-tight">System Connection Error</h3>
          <p className="text-muted-foreground mt-3 leading-relaxed">
            We encountered a problem synchronized with the product database. This might be due to a network interruption or server maintenance.
          </p>
          <div className="bg-muted px-4 py-2 rounded-lg mt-4 text-xs font-mono text-destructive break-all">
            {error}
          </div>
        </div>
        <Button onClick={refresh} variant="default" size="lg" className="rounded-full px-10 font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
          <RefreshCcw className="h-5 w-5 mr-2" />
          Attempt Reconnection
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-8 py-4 px-2 sm:px-0">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-gradient-to-br from-background to-muted/30 p-8 border rounded-2xl shadow-sm border-white/50">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Master Data Governance</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Product SKU Library</h1>
          <p className="text-muted-foreground text-sm max-w-xl font-medium leading-relaxed">
            Standardized product registration workflow. Define architecture, validate consistency, and activate SKUs for global system visibility.
          </p>
        </div>
        <div className="flex items-center gap-4">
           <Button 
            variant="outline" 
            onClick={refresh}
            className="h-12 w-12 rounded-xl p-0 hover:bg-white"
          >
            <RefreshCcw className={`h-5 w-5 text-muted-foreground ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button 
            onClick={handleAdd} 
            size="lg"
            className="h-14 px-8 rounded-xl gap-3 shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all font-bold text-base bg-primary hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="h-6 w-6 stroke-[3]" />
            Register New SKU
          </Button>
        </div>
      </div>

      <Tabs defaultValue="approved" className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <TabsList className="bg-muted/50 p-1 h-14 rounded-2xl gap-1">
            <TabsTrigger 
              value="approved" 
              className="px-6 h-12 rounded-xl flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold transition-all"
            >
              <Database className="h-4 w-4" />
              Active Repository
            </TabsTrigger>
            <TabsTrigger 
              value="drafts" 
              className="px-6 h-12 rounded-xl flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold transition-all"
            >
              <FileClock className="h-4 w-4" />
              Governance Workspace
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="approved" className="m-0 focus-visible:outline-none">
          <SKUTable 
            title="Active Product Master Records"
            data={approvedData} 
            totalCount={approvedTotal}
            pageIndex={approvedPage}
            pageSize={approvedLimit}
            onPaginationChange={({ pageIndex, pageSize }) => {
                setApprovedPage(pageIndex);
                setApprovedLimit(pageSize);
            }}
            masterData={masterData}
            isLoading={isLoading} 
            onEdit={handleEdit} 
            onDelete={handleDelete as any} 
            onSubmitForApproval={handleSubmitToManager as any}
            onApprove={handleApproveAndActivate as any}
          />
        </TabsContent>

        <TabsContent value="drafts" className="m-0 focus-visible:outline-none">
          <SKUTable 
            title="Pending Approval & Draft Records"
            data={draftData} 
            totalCount={draftsTotal}
            pageIndex={draftsPage}
            pageSize={draftsLimit}
            onPaginationChange={({ pageIndex, pageSize }) => {
                setDraftsPage(pageIndex);
                setDraftsLimit(pageSize);
            }}
            masterData={masterData}
            isLoading={isLoading} 
            onEdit={handleEdit} 
            onDelete={handleDelete as any} 
            onSubmitForApproval={handleSubmitToManager as any}
            onApprove={handleApproveAndActivate as any}
          />
        </TabsContent>
      </Tabs>

      <SKUModal 
        open={isModalOpen} 
        setOpen={setIsModalOpen} 
        initialData={selectedSKU} 
        masterData={masterData}
        onSubmit={handleSubmitForm} 
        loading={saving}
      />
    </div>
  );
}
