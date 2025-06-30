import { getUserProgress } from "@/lib/data";
import ProgressChart from "@/components/progress/progress-chart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default async function ProgressPage() {
  // In a real app, you'd get the user ID from the session.
  const MOCK_USER_ID = "user123";
  const userProgress = await getUserProgress(MOCK_USER_ID);

  return (
    <div className="flex flex-col gap-8">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Subject Mastery</CardTitle>
          <CardDescription>
            Here is a breakdown of your mastery level in each subject.
            {userProgress.subjectsMastery.length === 0 && (
              <span className="block mt-2 text-xs">(Hint: No progress data found in Firestore for user '{MOCK_USER_ID}')</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProgressChart chartData={userProgress.subjectsMastery} />
        </CardContent>
      </Card>
    </div>
  );
}
