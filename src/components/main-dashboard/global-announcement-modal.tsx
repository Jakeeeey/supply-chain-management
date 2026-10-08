"use client";

import * as React from "react";
import { AcknowledgedMemosModal } from "./acknowledged-memos-modal";

export function GlobalAnnouncementModal() {
    const [isOpen, setIsOpen] = React.useState(false);

    React.useEffect(() => {
        const handleOpen = () => {
            setIsOpen(true);
        };

        window.addEventListener("open-announcements", handleOpen);
        return () => window.removeEventListener("open-announcements", handleOpen);
    }, []);

    return (
        <AcknowledgedMemosModal
            open={isOpen}
            onOpenChange={setIsOpen}
        />
    );
}
