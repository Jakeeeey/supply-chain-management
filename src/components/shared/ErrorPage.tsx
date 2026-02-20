"use client";

import React from "react";
import Link from "next/link";
import { MoveLeft, Home, RefreshCcw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";

interface ErrorPageProps {
  code?: string | number;
  title?: string;
  message?: string;
  reset?: () => void;
}

export default function ErrorPage({
  code = "500",
  title = "Internal Server Error",
  message = "Something went wrong on our end. We're working to fix it as soon as possible.",
  reset
}: ErrorPageProps) {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 bg-background transition-colors duration-500">
      <Card className="max-w-md w-full border-2 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader className="space-y-4 pb-4">
          <div className="mx-auto bg-destructive/10 w-16 h-16 rounded-full flex items-center justify-center mb-2">
            <AlertTriangle className="h-8 w-8 text-destructive animate-pulse" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-bold text-destructive uppercase tracking-widest opacity-70">
              Error {code}
            </p>
            <CardTitle className="text-2xl font-bold tracking-tight">
              {title}
            </CardTitle>
            <CardDescription className="text-balance leading-relaxed pt-2">
              {message}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pb-6">
          {reset ? (
            <Button 
              onClick={() => reset()}
              size="lg"
              className="w-full font-semibold shadow-sm hover:scale-[1.02] transition-transform"
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          ) : (
            <Button 
              asChild
              variant="default"
              size="lg"
              className="w-full font-semibold"
            >
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Return to Dashboard
              </Link>
            </Button>
          )}
        </CardContent>

        <CardFooter className="pt-0 justify-center">
          <p className="text-[10px] text-muted-foreground/40 font-mono uppercase tracking-[0.2em]">
            System Error Reference: {Math.random().toString(36).substring(7).toUpperCase()}
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
