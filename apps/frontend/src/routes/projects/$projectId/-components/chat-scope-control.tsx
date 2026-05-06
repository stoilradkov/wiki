import { Label } from "@wiki/frontend/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@wiki/frontend/components/ui/select";
import { searchScopeSchema, type ChatScope } from "@wiki/shared";

interface ChatScopeControlProps {
  onScopeChange: (scope: ChatScope) => void;
  scope: ChatScope;
}

export function ChatScopeControl({ onScopeChange, scope }: ChatScopeControlProps) {
  function handleScopeChange(value: string) {
    onScopeChange({
      scope: searchScopeSchema.parse(value),
      selectedProjectIds: scope.selectedProjectIds
    });
  }

  return (
    <div className="grid gap-2 sm:max-w-56">
      <Label htmlFor="chat-scope">Scope</Label>
      <Select onValueChange={handleScopeChange} value={scope.scope}>
        <SelectTrigger id="chat-scope">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="current_project">Current project</SelectItem>
          <SelectItem value="all_projects">All projects</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
