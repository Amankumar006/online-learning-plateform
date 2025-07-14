
'use client'

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from 'lucide-react';
import Link from "next/link";

export function CanvasAiMenu() {
    return (
        <div className="absolute top-16 left-3 z-20">
            <Card className="p-1.5 flex items-center gap-1 shadow-xl backdrop-blur-md bg-white/70 dark:bg-black/70">
                <Button variant="ghost" size="sm" asChild><Link href="/dashboard"><ArrowLeft className="mr-2" />Dashboard</Link></Button>
            </Card>
        </div>
    );
}
