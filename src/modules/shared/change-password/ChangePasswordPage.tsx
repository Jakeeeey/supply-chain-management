import React from "react";
import { ChangePasswordForm } from "./components/ChangePasswordForm";

export default function ChangePasswordPage() {
    return (
        <div className="flex flex-col gap-4 p-4 md:p-8">
            <ChangePasswordForm />
        </div>
    );
}
