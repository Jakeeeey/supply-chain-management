'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { BiaSummaryCard } from '../types';
import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react';

interface SummaryCardProps extends BiaSummaryCard {
    className?: string;
    gradient: string;
}

export function SummaryCard({ title, value, description, trend, className, gradient }: SummaryCardProps) {
    const isPositive = trend && trend > 0;

    return (
        <Card className={cn("overflow-hidden border-none text-white", gradient, className)}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium opacity-90">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs opacity-70 mt-1">{description}</p>
                {trend !== undefined && (
                    <div className={cn(
                        "mt-2 flex items-center text-xs font-medium",
                        isPositive ? "text-emerald-200" : "text-rose-200"
                    )}>
                        {isPositive ? <ArrowUpIcon className="mr-1 h-3 w-3" /> : <ArrowDownIcon className="mr-1 h-3 w-3" />}
                        <span>{Math.abs(trend)}% from last month</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
