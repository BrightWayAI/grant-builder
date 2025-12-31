"use client";

/**
 * Voice Profile Settings Component (AC-3.4)
 * 
 * Allows users to view and edit their organization's voice profile:
 * - View preferred terms extracted from documents
 * - Add/remove preferred terms
 * - View and edit banned terms
 * - Trigger profile rebuild
 * - See profile status
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  RefreshCw,
  Plus,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Mic,
  FileText,
  Ban,
  Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceProfile {
  exists: boolean;
  status: string;
  profile?: {
    preferredTerms: string[];
    bannedTerms: string[];
    toneDescriptors: string[];
    samplePhrases: Array<{ phrase: string; source: string }>;
  };
  documentsUsed?: number;
  lastBuiltAt?: string;
  error?: string;
}

export function VoiceProfileSettings() {
  const [profile, setProfile] = useState<VoiceProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [building, setBuilding] = useState(false);
  const [newPreferred, setNewPreferred] = useState("");
  const [newBanned, setNewBanned] = useState("");
  const { toast } = useToast();

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/voice-profile");
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      }
    } catch (error) {
      console.error("Failed to fetch voice profile:", error);
      toast({
        title: "Error",
        description: "Failed to load voice profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleAddPreferred = async () => {
    if (!newPreferred.trim() || !profile?.profile) return;
    
    const updated = [...profile.profile.preferredTerms, newPreferred.trim().toLowerCase()];
    await saveProfile({ preferredTerms: updated });
    setNewPreferred("");
  };

  const handleRemovePreferred = async (term: string) => {
    if (!profile?.profile) return;
    
    const updated = profile.profile.preferredTerms.filter(t => t !== term);
    await saveProfile({ preferredTerms: updated });
  };

  const handleAddBanned = async () => {
    if (!newBanned.trim() || !profile?.profile) return;
    
    const updated = [...profile.profile.bannedTerms, newBanned.trim().toLowerCase()];
    await saveProfile({ bannedTerms: updated });
    setNewBanned("");
  };

  const handleRemoveBanned = async (term: string) => {
    if (!profile?.profile) return;
    
    const updated = profile.profile.bannedTerms.filter(t => t !== term);
    await saveProfile({ bannedTerms: updated });
  };

  const saveProfile = async (updates: { preferredTerms?: string[]; bannedTerms?: string[] }) => {
    try {
      setSaving(true);
      const response = await fetch("/api/voice-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        toast({
          title: "Saved",
          description: "Voice profile updated successfully",
        });
      } else {
        throw new Error("Failed to save");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save voice profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRebuild = async () => {
    try {
      setBuilding(true);
      const response = await fetch("/api/voice-profile", {
        method: "POST",
      });
      
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        toast({
          title: "Profile Rebuilt",
          description: "Voice profile has been regenerated from your documents",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Build Failed",
          description: error.error || "Failed to rebuild voice profile",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to rebuild voice profile",
        variant: "destructive",
      });
    } finally {
      setBuilding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Mic className="h-5 w-5 text-muted-foreground" />
          <div>
            <h3 className="font-medium">Voice Profile Status</h3>
            <p className="text-sm text-muted-foreground">
              {profile?.exists ? (
                profile.status === "READY" ? (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-3 w-3" />
                    Active - Built from {profile.documentsUsed} documents
                  </span>
                ) : profile.status === "BUILDING" ? (
                  <span className="flex items-center gap-1 text-yellow-600">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Building profile...
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    {profile.error || "Build failed"}
                  </span>
                )
              ) : (
                <span className="text-muted-foreground">
                  Not built - Upload at least 3 documents to enable
                </span>
              )}
            </p>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleRebuild}
          disabled={building}
        >
          {building ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Rebuild Profile
        </Button>
      </div>

      {profile?.profile && (
        <>
          {/* Tone Descriptors */}
          {profile.profile.toneDescriptors.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Detected Tone
              </h4>
              <div className="flex flex-wrap gap-2">
                {profile.profile.toneDescriptors.map((tone, idx) => (
                  <Badge key={idx} variant="secondary">
                    {tone}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Preferred Terms */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Heart className="h-4 w-4 text-green-600" />
              Preferred Terms
              <span className="text-xs text-muted-foreground font-normal">
                (Used in generation)
              </span>
            </h4>
            <div className="flex flex-wrap gap-2">
              {profile.profile.preferredTerms.map((term, idx) => (
                <Badge 
                  key={idx} 
                  variant="outline"
                  className="bg-green-50 border-green-200 text-green-800 gap-1 pr-1"
                >
                  {term}
                  <button
                    onClick={() => handleRemovePreferred(term)}
                    className="ml-1 hover:bg-green-200 rounded p-0.5"
                    disabled={saving}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add preferred term..."
                value={newPreferred}
                onChange={(e) => setNewPreferred(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddPreferred()}
                className="max-w-xs"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddPreferred}
                disabled={!newPreferred.trim() || saving}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Banned Terms */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Ban className="h-4 w-4 text-red-600" />
              Banned Terms
              <span className="text-xs text-muted-foreground font-normal">
                (Flagged in voice scoring)
              </span>
            </h4>
            <div className="flex flex-wrap gap-2">
              {profile.profile.bannedTerms.map((term, idx) => (
                <Badge 
                  key={idx} 
                  variant="outline"
                  className="bg-red-50 border-red-200 text-red-800 gap-1 pr-1"
                >
                  {term}
                  <button
                    onClick={() => handleRemoveBanned(term)}
                    className="ml-1 hover:bg-red-200 rounded p-0.5"
                    disabled={saving}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add banned term..."
                value={newBanned}
                onChange={(e) => setNewBanned(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddBanned()}
                className="max-w-xs"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddBanned}
                disabled={!newBanned.trim() || saving}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Sample Phrases */}
          {profile.profile.samplePhrases.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Sample Phrases from Your Documents</h4>
              <div className="space-y-1">
                {profile.profile.samplePhrases.slice(0, 5).map((p, idx) => (
                  <p key={idx} className="text-sm text-muted-foreground italic">
                    "{p.phrase}"
                  </p>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Help Text */}
      <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-1">How Voice Profiles Work</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Preferred terms are suggested to the AI when generating content</li>
          <li>Banned terms are flagged in voice scoring and should be avoided</li>
          <li>The profile is automatically built from your uploaded documents</li>
          <li>Click "Rebuild Profile" after uploading new documents to update</li>
        </ul>
      </div>
    </div>
  );
}
