import { signOut } from "@/app/actions/auth";
import { Alert, Button } from "@/components/ui";

export function InactiveNotice() {
  return (
    <div className="space-y-4">
      <Alert>Your account is not active. Please contact your admin.</Alert>
      <form action={signOut}>
        <Button type="submit" variant="secondary" className="w-full">
          Sign out
        </Button>
      </form>
    </div>
  );
}
