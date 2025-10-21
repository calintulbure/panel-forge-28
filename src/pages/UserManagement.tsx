import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle, XCircle, Users, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  approved: boolean;
  created_at: string;
  user_email?: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { userRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (userRole !== 'admin') {
      navigate('/');
      return;
    }
    fetchUsers();
  }, [userRole, navigate]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch all user roles with basic info
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*")
        .order("created_at", { ascending: false });

      if (rolesError) throw rolesError;

      // For now, we can't fetch email addresses from client-side
      // The user_id is shown instead
      const usersWithEmails = (userRoles || []).map((role) => ({
        ...role,
        user_email: `User ${role.user_id.substring(0, 8)}...`
      }));

      setUsers(usersWithEmails);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string, roleId: string) => {
    setActionLoading(roleId);
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ 
          approved: true,
          approved_by: (await supabase.auth.getUser()).data.user?.id,
          approved_at: new Date().toISOString()
        })
        .eq("id", roleId);

      if (error) throw error;
      
      toast.success("User approved successfully");
      fetchUsers();
    } catch (error) {
      console.error("Error approving user:", error);
      toast.error("Failed to approve user");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (userId: string, roleId: string) => {
    setActionLoading(roleId);
    try {
      // Delete the user role (which will prevent them from accessing)
      const { error: roleError } = await supabase
        .from("user_roles")
        .delete()
        .eq("id", roleId);

      if (roleError) throw roleError;

      // Optionally delete the auth user as well
      // Note: This requires service_role key which isn't available in client
      // For now, just remove their role
      
      toast.success("User rejected and access removed");
      fetchUsers();
    } catch (error) {
      console.error("Error rejecting user:", error);
      toast.error("Failed to reject user");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pendingUsers = users.filter(u => !u.approved);
  const approvedUsers = users.filter(u => u.approved);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <Users className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">User Management</h1>
          <p className="text-sm text-muted-foreground">Approve or reject user access requests</p>
        </div>
      </div>

      {/* Pending Approvals */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals ({pendingUsers.length})</CardTitle>
          <CardDescription>Users waiting for administrator approval</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No pending approvals at this time
            </p>
          ) : (
            <div className="space-y-3">
              {pendingUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{user.user_email}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {user.role}
                      </Badge>
                      <Badge variant="secondary">Pending</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Requested: {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(user.user_id, user.id)}
                      disabled={actionLoading === user.id}
                      className="flex-1 sm:flex-none"
                    >
                      {actionLoading === user.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReject(user.user_id, user.id)}
                      disabled={actionLoading === user.id}
                      className="flex-1 sm:flex-none"
                    >
                      {actionLoading === user.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approved Users */}
      <Card>
        <CardHeader>
          <CardTitle>Approved Users ({approvedUsers.length})</CardTitle>
          <CardDescription>Users with active access to the system</CardDescription>
        </CardHeader>
        <CardContent>
          {approvedUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No approved users yet
            </p>
          ) : (
            <div className="space-y-2">
              {approvedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 border rounded-lg"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-sm">{user.user_email}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize text-xs">
                        {user.role}
                      </Badge>
                      <Badge variant="default" className="text-xs">Approved</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
