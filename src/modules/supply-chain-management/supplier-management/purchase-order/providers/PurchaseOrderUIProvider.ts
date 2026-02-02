"use client"

import { createContext, useContext, useState } from "react"

const POUIContext = createContext<any>(null)

export const PurchaseOrderUIProvider = ({ children }: any) => {
    const [step, setStep] = useState("CREATE")

    return (
        <POUIContext.Provider value={{ step, setStep }}>
    {children}
    </POUIContext.Provider>
)
}

export const usePurchaseOrderUI = () =>
    useContext(POUIContext)
