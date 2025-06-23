"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AppLogo } from '@/components/layout/AppLogo';
import { Loader2, AlertCircle, Upload, Users, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { createCompany, addTeamMembers } from '@/lib/data-service';

type OnboardingStep = 'company' | 'team' | 'complete';

const businessTypes = [
  { value: 'startup', label: 'Startup' },
  { value: 'smb', label: 'Small & Medium Business' },
  { value: 'freelancer', label: 'Freelancer' },
  { value: 'agency', label: 'Agency' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'other', label: 'Other' }
];

const countries = [
  { value: 'IN', label: 'India', states: ['Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Hyderabad', 'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Lucknow'] },
  { value: 'US', label: 'United States', states: ['California', 'New York', 'Texas', 'Florida', 'Illinois', 'Pennsylvania', 'Ohio', 'Georgia', 'North Carolina', 'Michigan'] },
  { value: 'UK', label: 'United Kingdom', states: ['England', 'Scotland', 'Wales', 'Northern Ireland'] },
  { value: 'CA', label: 'Canada', states: ['Ontario', 'Quebec', 'British Columbia', 'Alberta', 'Manitoba', 'Saskatchewan'] }
];

const teamRoles = [
  { value: 'founder', label: 'Founder', color: 'bg-purple-100 text-purple-800' },
  { value: 'manager', label: 'Manager', color: 'bg-blue-100 text-blue-800' },
  { value: 'accountant', label: 'Accountant', color: 'bg-green-100 text-green-800' },
  { value: 'finance', label: 'Finance', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'admin', label: 'Admin', color: 'bg-gray-100 text-gray-800' },
  { value: 'employee', label: 'Employee', color: 'bg-pink-100 text-pink-800' }
];

interface TeamMember {
  email: string;
  role: string;
  id: string;
}

export default function OnboardingPage() {
  const { user, isAuthenticated, isLoading: authIsLoading, setCurrentCompanyId } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState<OnboardingStep>('company');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Company setup state
  const [companyLogo, setCompanyLogo] = useState<File | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [gstin, setGstin] = useState('');
  const [country, setCountry] = useState('');
  const [state, setState] = useState('');

  // Team setup state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('');

  useEffect(() => {
    if (!authIsLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, authIsLoading, router]);

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Logo file size must be less than 5MB');
        return;
      }
      setCompanyLogo(file);
      setError(null);
    }
  };

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
      role: newMemberRole
    };

    setTeamMembers([...teamMembers, newMember]);
    setNewMemberEmail('');
    setNewMemberRole('');
    setError(null);
  };

  const removeTeamMember = (id: string) => {
    setTeamMembers(teamMembers.filter(member => member.id !== id));
  };

  const handleCompanySetup = async () => {
    if (!companyName || !businessType || !country) {
      setError('Please fill in all required fields');
      return;
    }

    if (!user?.uid) {
      setError('User authentication required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create company data
      const companyData = {
        name: companyName.trim(),
        businessType,
        gstin: gstin.trim(),
        country,
        state: state || '',
        logoUrl: companyLogo ? URL.createObjectURL(companyLogo) : undefined,
        createdBy: user.uid,
      };

      // Save company to Firebase
      const newCompanyId = await createCompany(companyData);

      // Set company ID in auth context
      setCurrentCompanyId(newCompanyId);

      toast({
        title: "Company Setup Complete",
        description: `Company "${companyName}" has been created with ID: ${newCompanyId}`,
      });

      setCurrentStep('team');
    } catch (error: any) {
      console.error('Error setting up company:', error);
      setError(error.message || 'Failed to set up company');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTeamSetup = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const currentCompanyIdValue = localStorage.getItem('financeFlowCurrentCompanyId');
      
      if (!currentCompanyIdValue) {
        throw new Error('Company ID not found. Please complete company setup first.');
      }

      if (!user?.uid) {
        throw new Error('User authentication required');
        return;
      }

      // Save team members to Firebase if there are any
      if (teamMembers.length > 0) {
        const teamMemberData = teamMembers.map(member => ({
          email: member.email,
          role: member.role,
          companyId: currentCompanyIdValue,
          invitedBy: user.uid,
          status: 'pending' as const,
        }));

        await addTeamMembers(teamMemberData);

        // Send invitations via email
        for (const member of teamMembers) {
          console.log(`Sending invitation to ${member.email} as ${member.role}`);
          try {
            const response = await fetch('/api/send-invitation', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email: member.email,
                role: member.role,
                companyName: companyName,
                inviterName: user?.displayName || 'Team Admin',
                companyId: currentCompanyIdValue
              })
            });

            if (!response.ok) {
              console.error(`Failed to send invitation to ${member.email}`);
            }
          } catch (error) {
            console.error(`Error sending invitation to ${member.email}:`, error);
          }
        }

        toast({
          title: "Team Setup Complete",
          description: `Invitations sent to ${teamMembers.length} team members`,
        });
      } else {
        toast({
          title: "Team Setup Skipped",
          description: "You can add team members later in settings",
        });
      }

      setCurrentStep('complete');
    } catch (error: any) {
      console.error('Error setting up team:', error);
      setError(error.message || 'Failed to set up team');
    } finally {
      setIsLoading(false);
    }
  };

  const completeOnboarding = () => {
    router.push('/dashboard');
  };

  if (authIsLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const selectedCountry = countries.find(c => c.value === country);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
      <div className="w-full max-w-2xl">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center space-x-2 ${currentStep === 'company' ? 'text-primary' : currentStep === 'team' || currentStep === 'complete' ? 'text-green-600' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'company' ? 'bg-primary text-primary-foreground' : currentStep === 'team' || currentStep === 'complete' ? 'bg-green-600 text-white' : 'bg-muted'}`}>
                {currentStep === 'team' || currentStep === 'complete' ? <CheckCircle className="w-4 h-4" /> : '1'}
              </div>
              <span className="text-sm font-medium">Company Setup</span>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <div className={`flex items-center space-x-2 ${currentStep === 'team' ? 'text-primary' : currentStep === 'complete' ? 'text-green-600' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'team' ? 'bg-primary text-primary-foreground' : currentStep === 'complete' ? 'bg-green-600 text-white' : 'bg-muted'}`}>
                {currentStep === 'complete' ? <CheckCircle className="w-4 h-4" /> : '2'}
              </div>
              <span className="text-sm font-medium">Team Setup</span>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <div className={`flex items-center space-x-2 ${currentStep === 'complete' ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'complete' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                3
              </div>
              <span className="text-sm font-medium">Complete</span>
            </div>
          </div>
        </div>

        {/* Company Setup Step */}
        {currentStep === 'company' && (
          <Card className="shadow-xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">
                <AppLogo variant="icon" iconClassName="h-10 w-10 text-primary" />
              </div>
              <CardTitle className="text-2xl">Set Up Your Company</CardTitle>
              <CardDescription>
                Let's get your business information set up
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

              {/* Logo Upload */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Company Logo (Optional)</label>
                <div className="flex items-center space-x-4">
                  <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                    {companyLogo ? (
                      <img 
                        src={URL.createObjectURL(companyLogo)} 
                        alt="Logo preview" 
                        className="w-16 h-16 object-contain rounded"
                      />
                    ) : (
                      <Upload className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logo-upload"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => document.getElementById('logo-upload')?.click()}
                    >
                      {companyLogo ? 'Change Logo' : 'Upload Logo'}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">Max 5MB, JPG/PNG</p>
                  </div>
                </div>
              </div>

              {/* Company Name */}
              <div className="space-y-2">
                <label htmlFor="company-name" className="text-sm font-medium">Company Name *</label>
                <Input
                  id="company-name"
                  type="text"
                  placeholder="Your company name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Business Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Business Type *</label>
                <Select value={businessType} onValueChange={setBusinessType} disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select business type" />
                  </SelectTrigger>
                  <SelectContent>
                    {businessTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* GSTIN */}
              <div className="space-y-2">
                <label htmlFor="gstin" className="text-sm font-medium">GSTIN (Optional)</label>
                <Input
                  id="gstin"
                  type="text"
                  placeholder="22AAAAA0000A1Z5"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">You can add this later in settings</p>
              </div>

              {/* Country */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Country *</label>
                <Select value={country} onValueChange={(value) => { setCountry(value); setState(''); }} disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country.value} value={country.value}>
                        {country.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* State */}
              {selectedCountry && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">State / Province</label>
                  <Select value={state} onValueChange={setState} disabled={isLoading}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedCountry.states.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button onClick={handleCompanySetup} className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Team Setup Step */}
        {currentStep === 'team' && (
          <Card className="shadow-xl">
            <CardHeader className="text-center">
              <Users className="mx-auto h-10 w-10 text-primary mb-4" />
              <CardTitle className="text-2xl">Invite Your Team</CardTitle>
              <CardDescription>
                Add teammates and set their roles and permissions
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
                <h3 className="font-medium">Add Team Member</h3>
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
                <Button onClick={addTeamMember} variant="outline" className="w-full">
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
                              <Badge variant="secondary" className={roleInfo?.color}>
                                {roleInfo?.label}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTeamMember(member.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Remove
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex space-x-4">
                <Button variant="outline" onClick={() => setCurrentStep('company')} className="flex-1">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button onClick={handleTeamSetup} className="flex-1" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {teamMembers.length > 0 ? 'Invite Team' : 'Skip for Now'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Complete Step */}
        {currentStep === 'complete' && (
          <Card className="shadow-xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl">🎉 Welcome to FinanceFlow AI!</CardTitle>
              <CardDescription>
                Your account is ready. Let's start managing your finances with AI.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted/50 p-6 rounded-lg space-y-4">
                <h3 className="font-semibold">What's Next?</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <span>Start adding your financial entries through our AI assistant</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <span>Upload documents for automatic data extraction</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <span>Set up your chart of accounts and customize settings</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <span>Explore AI-powered financial insights and reports</span>
                  </li>
                </ul>
              </div>

              <Button onClick={completeOnboarding} className="w-full" size="lg">
                Start Using FinanceFlow AI
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}