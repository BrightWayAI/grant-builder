"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { GripVertical, Pencil, Trash2, Plus } from "lucide-react";
import { RFPSection } from "@/lib/ai/rfp-parser";

interface RFPRequirementsProps {
  sections: RFPSection[];
  onSectionsChange: (sections: RFPSection[]) => void;
}

export function RFPRequirements({ sections, onSectionsChange }: RFPRequirementsProps) {
  const [editingSection, setEditingSection] = useState<RFPSection | null>(null);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const handleEdit = (section: RFPSection, index: number) => {
    setEditingSection({ ...section });
    setEditIndex(index);
  };

  const handleSave = () => {
    if (!editingSection || editIndex === null) return;

    const newSections = [...sections];
    if (editIndex === -1) {
      newSections.push(editingSection);
    } else {
      newSections[editIndex] = editingSection;
    }
    onSectionsChange(newSections);
    setEditingSection(null);
    setEditIndex(null);
  };

  const handleDelete = (index: number) => {
    const newSections = sections.filter((_, i) => i !== index);
    onSectionsChange(newSections);
  };

  const handleAddSection = () => {
    setEditingSection({
      name: "",
      description: "",
      isRequired: true,
    });
    setEditIndex(-1);
  };

  const moveSection = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= sections.length) return;
    const newSections = [...sections];
    const [removed] = newSections.splice(fromIndex, 1);
    newSections.splice(toIndex, 0, removed);
    onSectionsChange(newSections);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Proposal Sections</CardTitle>
          <Button variant="outline" size="sm" onClick={handleAddSection}>
            <Plus className="h-4 w-4 mr-1" />
            Add Section
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sections.map((section, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50 group"
              >
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => moveSection(index, index - 1)}
                    className="p-0.5 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={index === 0}
                  >
                    <GripVertical className="h-3 w-3 text-gray-400" />
                  </button>
                  <button
                    onClick={() => moveSection(index, index + 1)}
                    className="p-0.5 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity rotate-180"
                    disabled={index === sections.length - 1}
                  >
                    <GripVertical className="h-3 w-3 text-gray-400" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{section.name}</span>
                    {section.isRequired && (
                      <Badge variant="secondary" className="text-xs">
                        Required
                      </Badge>
                    )}
                    {section.wordLimit && (
                      <Badge variant="outline" className="text-xs">
                        {section.wordLimit} words
                      </Badge>
                    )}
                  </div>
                  {section.description && (
                    <p className="text-sm text-gray-500 truncate">{section.description}</p>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(section, index)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(index)}
                  >
                    <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editingSection} onOpenChange={() => setEditingSection(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editIndex === -1 ? "Add Section" : "Edit Section"}
            </DialogTitle>
          </DialogHeader>
          {editingSection && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sectionName">Section Name *</Label>
                <Input
                  id="sectionName"
                  value={editingSection.name}
                  onChange={(e) =>
                    setEditingSection({ ...editingSection, name: e.target.value })
                  }
                  placeholder="e.g., Executive Summary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sectionDescription">Description</Label>
                <Textarea
                  id="sectionDescription"
                  value={editingSection.description}
                  onChange={(e) =>
                    setEditingSection({ ...editingSection, description: e.target.value })
                  }
                  placeholder="What should this section contain?"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="wordLimit">Word Limit</Label>
                  <Input
                    id="wordLimit"
                    type="number"
                    value={editingSection.wordLimit || ""}
                    onChange={(e) =>
                      setEditingSection({
                        ...editingSection,
                        wordLimit: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="charLimit">Character Limit</Label>
                  <Input
                    id="charLimit"
                    type="number"
                    value={editingSection.charLimit || ""}
                    onChange={(e) =>
                      setEditingSection({
                        ...editingSection,
                        charLimit: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isRequired"
                  checked={editingSection.isRequired}
                  onChange={(e) =>
                    setEditingSection({ ...editingSection, isRequired: e.target.checked })
                  }
                  className="rounded"
                />
                <Label htmlFor="isRequired" className="font-normal">
                  This section is required
                </Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSection(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!editingSection?.name}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
