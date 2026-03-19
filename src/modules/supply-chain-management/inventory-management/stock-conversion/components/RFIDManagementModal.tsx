"use client";

import { useState, useEffect } from "react";
import { StockConversionProduct, RFIDTag } from "../types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScanLine, X, AlertCircle } from "lucide-react";
// Native replacement for uuid to avoid dependency issues
const uuidv4 = () => crypto.randomUUID();

interface RFIDManagementModalProps {
  product: StockConversionProduct | null;
  conversionDetails: { qtyToConvert: number; targetUnitId: number; convertedQuantity: number; } | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (tags: RFIDTag[]) => void;
  isSubmitting: boolean;
}

export function RFIDManagementModal({
  product,
  conversionDetails,
  isOpen,
  onClose,
  onSubmit,
  isSubmitting
}: RFIDManagementModalProps) {
  const [rfidInput, setRfidInput] = useState("");
  const [assignedTags, setAssignedTags] = useState<RFIDTag[]>([]);

  useEffect(() => {
    if (isOpen) {
      setRfidInput("");
      setAssignedTags([]);
    }
  }, [isOpen]);

  if (!product || !conversionDetails) return null;

  const handleAddTag = () => {
    if (!rfidInput.trim()) return;

    // Check for duplicates
    if (assignedTags.some(t => t.rfid_tag === rfidInput.trim())) {
      setRfidInput("");
      return;
    }

    const newTag: RFIDTag = {
      id: uuidv4(),
      rfid_tag: rfidInput.trim(),
      status: "active",
      assignedDate: new Date().toISOString().split("T")[0],
    };

    setAssignedTags(prev => [...prev, newTag]);
    setRfidInput("");
  };

  const handleGenerate = () => {
    const randomTag = Math.floor(10000000 + Math.random() * 90000000).toString();
    setRfidInput(randomTag);
  };

  const handleRemoveTag = (id: string) => {
    setAssignedTags(prev => prev.filter(t => t.id !== id));
  };

  const handleSubmit = () => {
    onSubmit(assignedTags);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-blue-900">
            <div className="p-1.5 bg-purple-100 rounded-md">
              <ScanLine className="w-5 h-5 text-purple-600" />
            </div>
            RFID Tag Management
          </DialogTitle>
          <DialogDescription className="text-slate-500 text-sm ml-9 mt-[-4px]">
            {product.productDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100 my-2">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Brand</div>
            <div className="text-sm font-semibold text-slate-800">{product.brand}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Category</div>
            <div className="text-sm font-semibold text-slate-800">{product.category}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Current Stock</div>
            <div className="text-sm font-semibold text-slate-800">{product.quantity} Box(S)</div>
          </div>
        </div>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Scan or Enter RFID Tag</label>
            <div className="flex gap-2">
              <Input
                value={rfidInput}
                onChange={e => setRfidInput(e.target.value)}
                placeholder="Enter RFID tag number"
                className="flex-1"
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <Button
                onClick={handleAddTag}
                className="bg-purple-600 hover:bg-purple-700 text-white font-medium gap-1 px-4"
              >
                <ScanLine className="w-4 h-4" />
                Add Tag
              </Button>
              <Button
                variant="outline"
                onClick={handleGenerate}
                className="text-purple-600 border-purple-200 hover:bg-purple-50"
              >
                Generate
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm font-medium text-slate-700">
              <span>Assigned RFID Tags ({assignedTags.length})</span>
              {assignedTags.length > 0 && (
                <span className="text-xs text-slate-400">Target Qty: {conversionDetails.convertedQuantity}</span>
              )}
            </div>

            <div className="border border-slate-200 rounded-lg min-h-[140px] max-h-[220px] overflow-y-auto bg-slate-50/50 p-2 space-y-2">
              {assignedTags.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-8">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                    <AlertCircle className="w-5 h-5 text-slate-300" />
                  </div>
                  <p className="font-medium text-slate-500">No RFID tags assigned</p>
                  <p className="text-xs">Scan or generate tags to get started</p>
                </div>
              ) : (
                assignedTags.map((tag, index) => (
                  <div key={tag.id} className="flex items-center justify-between bg-white p-3 rounded-md border border-slate-100 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-xs">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-slate-800">{tag.rfid_tag}</div>
                        <div className="text-[10px] text-slate-400">Assigned: {tag.assignedDate}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded uppercase tracking-wider">
                        Active
                      </span>
                      <Button variant="outline" size="sm" className="h-7 text-xs px-2 text-slate-600">
                        Deactivate
                      </Button>
                      <button onClick={() => handleRemoveTag(tag.id as string)} className="text-red-400 hover:text-red-600 p-1 rounded-full hover:bg-red-50 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm flex gap-3 items-start text-blue-800">
            <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold text-blue-900">RFID Tag Information</div>
              <ul className="list-disc pl-4 text-blue-700/80 space-y-1">
                <li>Each product can have multiple RFID tags for tracking</li>
                <li>Tags can be activated or deactivated as needed</li>
                <li>Use the scanner or manually enter tag numbers</li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4 flex sm:justify-between items-center w-full">
          <div className="text-sm text-slate-500 font-medium">Confirm conversion after RFID setup</div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="rounded-md px-6">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-medium px-6 gap-2"
            >
              {isSubmitting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Confirm Conversion
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
