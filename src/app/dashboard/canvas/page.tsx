
'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Pen } from "lucide-react";

export default function CanvasPage() {
	return (
		<div className="w-full h-full flex items-center justify-center p-4">
			<Card className="w-full max-w-lg text-center">
                <CardHeader>
                    <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
                        <Pen className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="mt-4">Canvas Mode</CardTitle>
                    <CardDescription>This feature is currently under development.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        An interactive workspace for visual learning and collaboration with AI is coming soon. Stay tuned!
                    </p>
                </CardContent>
            </Card>
		</div>
	)
}
