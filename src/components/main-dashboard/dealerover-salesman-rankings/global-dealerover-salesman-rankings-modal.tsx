"use client";

import * as React from "react";
import { DealeroverSalesmanRankingsModal } from "./dealerover-salesman-rankings-modal";

export function GlobalDealeroverSalesmanRankingsModal() {
    const [isOpen, setIsOpen] = React.useState(false);

    React.useEffect(() => {
        const handleOpen = () => {
            setIsOpen(true);
        };

        window.addEventListener("open-dealerover-salesman-rankings", handleOpen);
        return () => window.removeEventListener("open-dealerover-salesman-rankings", handleOpen);
    }, []);

    return (
        <DealeroverSalesmanRankingsModal
            open={isOpen}
            onOpenChange={setIsOpen}
        />
    );
}
