import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, LogOut } from "lucide-react";

export default function PendingApproval() {
  const { signOut, user } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-orange-500/10">
            <Clock className="h-6 w-6 text-orange-500" />
          </div>
          <CardTitle className="text-2xl">Approval Pending</CardTitle>
          <CardDescription>
            Your account is awaiting administrator approval
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4 text-sm">
            <p className="mb-2">
              <strong>Email:</strong> {user?.email}
            </p>
            <p className="text-muted-foreground">
              Your account has been created successfully, but you need administrator approval to access the system.
              An administrator will review your request shortly.
            </p>
          </div>
          
          <div className="space-y-2 pt-4">
            <p className="text-sm text-muted-foreground text-center">
              You'll be able to access the system once your account is approved.
              You can check back later or contact your administrator.
            </p>
          </div>

          <Button 
            variant="outline" 
            className="w-full" 
            onClick={signOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
