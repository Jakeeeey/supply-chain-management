const steps = [
    "CREATE",
    "APPROVAL",
    "RECEIVING",
    "POSTING",
]

export const PurchaseOrderSteps = () => {
    return (
        <div className="flex gap-4 text-sm">
            {steps.map(step => (
                <div
                    key={step}
                    className="px-3 py-1 rounded bg-muted"
                >
                    {step}
                </div>
            ))}
        </div>
    )
}
