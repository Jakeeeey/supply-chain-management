import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Layers, Keyboard, Scan, Wand2 } from "lucide-react";
import { Product, Category, Unit } from "../types";

interface ProfileStepProps {
    product: Product | null;
    onMethodSelect: (method: string) => void;
}

export function ProfileStep({ product, onMethodSelect }: ProfileStepProps) {
    const categoryName = (() => {
        if (typeof product?.product_category === "object" && product?.product_category)
            return (product.product_category as Category).category_name;
        if (typeof product?.product_category === "string")
            return product.product_category;
        return "Uncategorized";
    })();

    const unitName = (() => {
        if (typeof product?.unit_of_measurement === "object" && product?.unit_of_measurement)
            return (product.unit_of_measurement as Unit).unit_shortcut || (product.unit_of_measurement as Unit).unit_name;
        return "PCS";
    })();

    const isBundle = product?.record_type === "bundle";

    return (
        <div className="space-y-6 py-2">
            {/* Product/Bundle Identity Card */}
            <Card>
                <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isBundle ? "bg-amber-500/10" : "bg-primary/10"}`}>
                            <Package className={`h-5 w-5 ${isBundle ? "text-amber-500" : "text-primary"}`} />
                        </div>
                        <div className="space-y-2 min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground leading-snug">
                                {product?.description || product?.product_name}
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="font-mono text-xs text-muted-foreground">
                                    {isBundle ? "BDL" : "SKU"}: {product?.product_code}
                                </Badge>
                                {isBundle ? (
                                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20 text-xs">
                                        Bundle
                                    </Badge>
                                ) : (
                                    <>
                                        <Badge variant="secondary" className="text-xs">
                                            <Layers className="h-3 w-3 mr-1" />
                                            {categoryName}
                                        </Badge>
                                        <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 text-xs">
                                            {unitName}
                                        </Badge>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Method Selection */}
            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">
                    Select Barcode Assignment Method
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                        { key: "manual", icon: Keyboard, label: "Manual Entry", desc: "Type a barcode value", color: "bg-primary/10 text-primary" },
                        { key: "scan", icon: Scan, label: "Scanning", desc: "Use camera to scan", color: "bg-purple-50 text-purple-600" },
                        { key: "generate", icon: Wand2, label: "Generate Barcode", desc: "Auto-generate a code", color: "bg-amber-50 text-amber-600" },
                    ].map(({ key, icon: Icon, label, desc, color }) => (
                        <Card
                            key={key}
                            className="group cursor-pointer border-2 hover:border-primary/30 hover:shadow-sm transition-all"
                            onClick={() => onMethodSelect(key)}
                        >
                            <CardContent className="p-5 text-center space-y-3">
                                <div className={`h-12 w-12 mx-auto rounded-lg ${color} flex items-center justify-center`}>
                                    <Icon className="h-6 w-6" />
                                </div>
                                <div>
                                    <span className="block font-semibold text-sm">{label}</span>
                                    <span className="block text-xs text-muted-foreground mt-0.5">{desc}</span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
