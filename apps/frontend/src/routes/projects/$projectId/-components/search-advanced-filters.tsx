import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@wiki/frontend/components/ui/form";
import { Input } from "@wiki/frontend/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@wiki/frontend/components/ui/select";
import { formatOption, type SearchFiltersFormValues } from "@wiki/frontend/modules/search/search-filters";
import { entityTypeValues } from "@wiki/shared";
import type { UseFormReturn } from "react-hook-form";

interface SearchAdvancedFiltersProps {
  form: UseFormReturn<SearchFiltersFormValues>;
}

export function SearchAdvancedFilters({ form }: SearchAdvancedFiltersProps) {
  return (
    <div className="grid gap-3.5 lg:grid-cols-5">
      <FormField
        control={form.control}
        name="tags"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Tags</FormLabel>
            <FormControl>
              <Input placeholder="research, planning" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="entityNames"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Entities</FormLabel>
            <FormControl>
              <Input placeholder="Gemini, roadmap" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="entityType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Entity type</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="any">Any type</SelectItem>
                {entityTypeValues.map((entityType) => (
                  <SelectItem key={entityType} value={entityType}>
                    {formatOption(entityType)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="sourceDateFrom"
        render={({ field }) => (
          <FormItem>
            <FormLabel>From</FormLabel>
            <FormControl>
              <Input type="date" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="sourceDateTo"
        render={({ field }) => (
          <FormItem>
            <FormLabel>To</FormLabel>
            <FormControl>
              <Input type="date" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
