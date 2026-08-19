"use client";

import React from "react";
import { useDuplicateReport } from "./hooks/useDuplicateReport";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle, CheckCircle2, ChevronRight, Copy, Loader2, Sparkles } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SKU } from "@/modules/supply-chain-management/product-management/sku/sku-creation/types/sku.schema";

export function DuplicateReportModule() {
  const { data, loading, error, refetch } = useDuplicateReport();

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl space-y-8 animate-in fade-in duration-500 h-full overflow-y-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-primary" />
            Duplicate SKU Report
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-2xl">
            Identifies products with identical names and descriptions that do not belong to the same parent-child hierarchy.
          </p>
        </div>
        <Button 
          onClick={refetch} 
          disabled={loading} 
          className="flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh Report
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!loading && !error && data.length === 0 && (
        <Card className="border-dashed border-2 shadow-sm bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-20 w-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-500" />
            </div>
            <h3 className="text-2xl font-bold tracking-tight text-green-900 dark:text-green-100 mb-2">Clean Database</h3>
            <p className="text-green-700/80 dark:text-green-400/80 max-w-md">
              Great news! Your database does not contain any true duplicate SKUs based on name and description.
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && !error && data.length > 0 && (
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-xl border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-50 to-orange-100/50 dark:from-amber-950/40 dark:to-orange-950/20 p-6 shadow-sm border border-amber-100/50 dark:border-amber-900/30">
            <div className="absolute -top-4 -right-4 p-8 opacity-5 dark:opacity-10 pointer-events-none transform rotate-12">
              <AlertTriangle className="w-40 h-40 text-amber-900 dark:text-amber-500" />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row gap-5 items-start md:items-center">
              <div className="flex-shrink-0 p-3 bg-white/80 dark:bg-amber-900/50 rounded-full shadow-sm ring-1 ring-amber-200/50 dark:ring-amber-700/50 backdrop-blur-sm">
                <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-bold text-amber-900 dark:text-amber-300 tracking-tight">
                  Action Required: {data.length} Duplicate Group{data.length === 1 ? '' : 's'} Detected
                </h3>
                <p className="text-sm md:text-base text-amber-800/80 dark:text-amber-400/80 mt-1 max-w-3xl leading-relaxed">
                  We&apos;ve identified products that share the same name and description but aren&apos;t properly linked via parent IDs. Please review and resolve these duplicates below to maintain data integrity.
                </p>
              </div>
            </div>
          </div>

          <Card className="shadow-xl border-primary/10 overflow-hidden">
            <CardContent className="p-0">
            <Accordion type="single" collapsible className="w-full">
              {data.map((group, idx) => (
                <AccordionItem value={`group-${idx}`} key={idx} className="border-b last:border-0 border-border/50">
                  <AccordionTrigger className="px-6 py-4 hover:bg-muted/30 transition-all [&[data-state=open]]:bg-muted/50 [&[data-state=open]>div>div>h4]:text-primary">
                    <div className="flex items-center gap-4 text-left w-full pr-4">
                      <Badge variant="destructive" className="rounded-full min-w-[28px] h-7 flex items-center justify-center px-2 shadow-sm font-semibold">
                        {group.totalItems}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-base transition-colors truncate">{group.name}</h4>
                        <p className="text-sm text-muted-foreground truncate">{group.description}</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6 pt-0 bg-muted/10">
                    <div className="rounded-lg border shadow-sm bg-card overflow-x-auto mt-4">
                      <Table>
                        <TableHeader className="bg-muted/50">
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="w-[120px] font-semibold">ID</TableHead>
                            <TableHead className="font-semibold">Product Name</TableHead>
                            <TableHead className="font-semibold">Product Code</TableHead>
                            <TableHead className="font-semibold">Inventory Type</TableHead>
                            <TableHead className="font-semibold">Parent ID</TableHead>
                            <TableHead className="font-semibold">Created By</TableHead>
                            <TableHead className="text-right font-semibold">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.items.map((item: SKU) => (
                            <TableRow key={item.product_id || item.id} className="group hover:bg-muted/40 transition-colors">
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <Copy className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:text-primary" />
                                  <span className="font-mono text-sm">{item.product_id || item.id}</span>
                                </div>
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate" title={item.product_name}>
                                {item.product_name || <span className="text-muted-foreground italic">N/A</span>}
                              </TableCell>
                              <TableCell>
                                {item.product_code ? (
                                  <Badge variant="secondary" className="font-mono text-xs">
                                    {item.product_code}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground italic text-sm">N/A</span>
                                )}
                              </TableCell>
                              <TableCell>{item.inventory_type || <span className="text-muted-foreground italic">N/A</span>}</TableCell>
                              <TableCell>
                                {item.parent_id ? (
                                  <Badge variant="outline" className="font-mono bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900 shadow-sm">
                                    {typeof item.parent_id === 'object' ? (item.parent_id as { id: string | number }).id : item.parent_id}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground italic text-sm flex items-center gap-1">
                                    <ChevronRight className="w-3 h-3" /> None (Root)
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <span className="text-sm">
                                  {item.created_by || item.user_created || <span className="text-muted-foreground italic">N/A</span>}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge 
                                  variant={item.status === 'ACTIVE' ? 'default' : 'secondary'}
                                  className={item.status === 'ACTIVE' ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-400 shadow-sm' : ''}
                                >
                                  {item.status || "UNKNOWN"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
        </div>
      )}
    </div>
  );
}
