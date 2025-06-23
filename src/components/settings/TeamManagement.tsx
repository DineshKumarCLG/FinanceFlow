
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Users, Plus, Trash2, Send, AlertCircle, Loader2 } from "lucide-react";

interface TeamMember {
  id: string;
  email: string;
  role: string;
  status?: 'invited' | 'active';
  invitedAt?: string;
}

const teamRoles = [
  { value: "founder", label: "Founder", color: "bg-purple-100 text-purple-800" },
  { value: "admin", label: "Admin", color: "bg-red-100 text-red-800" },
  { value: "accountant", label: "Accountant", color: "bg-blue-100 text-blue-800" },
  { value: "manager", label: "Manager", color: "bg-green-100 text-green-800" },
  { value: "employee", label: "Employee", color: "bg-gray-100 text-gray-800" },
  { value: "viewer", label: "Viewer", color: "bg-yellow-100 text-yellow-800" },
];

export function TeamManagement() {
  const { user, currentCompanyId } = useAuth();
  const { toast } = useToast();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load existing team members from localStorage or API
    if (currentCompanyId) {
      const savedMembers = localStorage.getItem(`teamMembers_${currentCompanyId}`);
      if (savedMembers) {
        setTeamMembers(JSON.parse(savedMembers));
      }
    }
  }, [currentCompanyId]);

  const addTeamMember = () => {
    if (!newMemberEmail || !newMemberRole) {
      setError('Please fill in both email and role');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newMemberEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    if (teamMembers.some(member => member.email === newMemberEmail)) {
      setError('This email is already added');
      return;
    }

    const newMember: TeamMember = {
      id: Date.now().toString(),
      email: newMemberEmail,
      role: newMemberRole,
      status: 'invited',
      invitedAt: new Date().toISOString()
    };

    const updatedMembers = [...teamMembers, newMember];
    setTeamMembers(updatedMembers);
    
    // Save to localStorage
    if (currentCompanyId) {
      localStorage.setItem(`teamMembers_${currentCompanyId}`, JSON.stringify(updatedMembers));
    }

    setNewMemberEmail('');
    setNewMemberRole('');
    setError(null);

    toast({
      title: "Team Member Added",
      description: `${newMemberEmail} has been added to the team. Send invitation to notify them.`,
    });
  };

  const removeTeamMember = (id: string) => {
    const updatedMembers = teamMembers.filter(member => member.id !== id);
    setTeamMembers(updatedMembers);
    
    if (currentCompanyId) {
      localStorage.setItem(`teamMembers_${currentCompanyId}`, JSON.stringify(updatedMembers));
    }

    toast({
      title: "Team Member Removed",
      description: "Team member has been removed from the list.",
    });
  };

  const sendInvitation = async (member: TeamMember) => {
    if (!currentCompanyId || !user) return;

    setIsSending(member.id);
    try {
      const response = await fetch('/api/send-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: member.email,
          role: member.role,
          companyName: currentCompanyId,
          inviterName: user.displayName || 'Team Admin',
          companyId: currentCompanyId
        })
      });

      if (response.ok) {
        toast({
          title: "Invitation Sent",
          description: `Invitation email sent to ${member.email}`,
        });
      } else {
        throw new Error('Failed to send invitation');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to Send Invitation",
        description: "Could not send invitation email. Please try again.",
      });
    } finally {
      setIsSending(null);
    }
  };

  if (!currentCompanyId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No Company Selected</AlertTitle>
            <AlertDescription>
              Please select a company to manage team members.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Management
          </CardTitle>
          <CardDescription>
            Invite team members and manage their roles for {currentCompanyId}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Add team member form */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <h3 className="font-medium flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Team Member
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="member-email" className="text-sm font-medium">Email Address</label>
                <Input
                  id="member-email"
                  type="email"
                  placeholder="teammate@company.com"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <Select value={newMemberRole} onValueChange={setNewMemberRole} disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamRoles.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={addTeamMember} className="w-full" disabled={isLoading}>
              <Plus className="mr-2 h-4 w-4" />
              Add Member
            </Button>
          </div>

          {/* Team members list */}
          {teamMembers.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-medium">Team Members ({teamMembers.length})</h3>
              <div className="space-y-3">
                {teamMembers.map((member) => {
                  const roleInfo = teamRoles.find(r => r.value === member.role);
                  return (
                    <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <Users className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{member.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className={roleInfo?.color}>
                              {roleInfo?.label}
                            </Badge>
                            {member.status === 'invited' && (
                              <Badge variant="outline" className="text-xs">
                                Invited
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {member.status === 'invited' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => sendInvitation(member)}
                            disabled={isSending === member.id}
                          >
                            {isSending === member.id ? (
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            ) : (
                              <Send className="mr-1 h-3 w-3" />
                            )}
                            Send Invite
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTeamMember(member.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {teamMembers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No team members added yet</p>
              <p className="text-sm">Add team members using the form above</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
