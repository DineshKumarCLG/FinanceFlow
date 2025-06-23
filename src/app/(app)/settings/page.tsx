import { PageTitle } from "@/components/shared/PageTitle";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { ExportSettings } from "@/components/settings/ExportSettings";
import { AiPreferences } from "@/components/settings/AiPreferences";
import { TeamManagement } from "@/components/settings/TeamManagement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Download, Wand2, Users } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageTitle
        title="Settings"
        description="Manage your account, export data, and customize AI preferences."
      />

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-4 mb-6">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" /> Profile
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Team
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-2">
            <Download className="h-4 w-4" /> Data Export
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Wand2 className="h-4 w-4" /> AI Preferences
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileForm />
        </TabsContent>
        <TabsContent value="team">
          <TeamManagement />
        </TabsContent>
        <TabsContent value="export">
          <ExportSettings />
        </TabsContent>
        <TabsContent value="ai">
          <AiPreferences />
        </TabsContent>
      </Tabs>
    </div>
  );
}
