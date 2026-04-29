import * as React from "react";

export type SubsystemStatus = "active" | "comingSoon";

export interface NavItem {
    title: string;
    url: string;
    slug?: string;
    status?: string | SubsystemStatus;
    icon?: React.ComponentType<{ className?: string }>;
    iconName?: string | null;
    items?: NavItem[];
}
